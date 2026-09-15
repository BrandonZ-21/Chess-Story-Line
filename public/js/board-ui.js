// Story Line — shared 3D board rendering + click-to-move UI. Used by the
// hot-seat, vs. computer, and online screens alike.
//
// The board is built with CSS 3D transforms (perspective + rotateX/rotateY),
// not a graphics library — it's still "plain HTML, CSS and JavaScript."
// The arrow keys orbit the whole scene (left/right spin, up/down tilt);
// the mouse is reserved entirely for clicking pieces and squares, so
// there's no ambiguity between "trying to click" and "trying to look
// around" the way there was with mouse-drag orbiting. Pieces stand up off
// the board on a small vertical "lift" and counter-rotate every frame so
// their glyphs always face the camera (a standard CSS-3D "billboard"
// trick), no matter which way the board is currently turned.

import { getLegalMovesForSquare } from '../rules.js';
import { pieceMarkup } from './piece-art.js';
import { captureEffectMarkup, CAPTURE_FX_DURATION_MS } from './capture-fx.js';

const PROMO_CHOICES = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
];

const PIECE_LIFT_PX = 26; // how tall pieces stand above the board

// options:
//   getState()            -> current game state (rules.js shape)
//   orientation             'w' (White at bottom, default) or 'b'
//   interactive()          -> bool, whether clicks should do anything right now
//   onAttemptMove(from,to,promotionChoice) -> called when the player completes a move
export function createBoardView(root, options) {
  const { orientation = 'w', interactive = () => true, onAttemptMove, getState } = options;

  let selected = null;
  let legalTargets = [];
  let rigX = 55; // tilt, degrees — 0 = looking edge-on, 90 = straight down
  let rigY = 0; // spin, degrees — free-running, orbits all the way around
  let lastAnimatedMove = null; // reference to the last moveLog entry we've already played a capture effect for

  const ROTATE_STEP_DEG = 6;

  root.classList.add('board-root');

  const scene = document.createElement('div');
  scene.className = 'scene';
  const rig = document.createElement('div');
  rig.className = 'rig';
  const boardEl = document.createElement('div');
  boardEl.className = 'board3d';
  const piecesLayer = document.createElement('div');
  piecesLayer.className = 'pieces-layer';
  rig.appendChild(boardEl);
  rig.appendChild(piecesLayer);
  scene.appendChild(rig);
  root.appendChild(scene);

  const hint = document.createElement('p');
  hint.className = 'drag-hint';
  hint.textContent = 'Use the arrow keys (or these buttons) to look around the board — click to move.';
  root.appendChild(hint);

  const controls = document.createElement('div');
  controls.className = 'camera-controls';
  controls.setAttribute('aria-label', 'Rotate the board view');
  const buttonSpecs = [
    { label: '←', title: 'Look left', dy: 0, dx: -1 },
    { label: '↑', title: 'Look up', dy: -1, dx: 0 },
    { label: '↓', title: 'Look down', dy: 1, dx: 0 },
    { label: '→', title: 'Look right', dy: 0, dx: 1 },
  ];
  for (const spec of buttonSpecs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'camera-btn';
    btn.textContent = spec.label;
    btn.title = spec.title;
    btn.addEventListener('click', () => rotateCamera(spec.dx, spec.dy));
    controls.appendChild(btn);
  }
  root.appendChild(controls);

  const promoEl = document.createElement('div');
  promoEl.className = 'promo-picker hidden';
  root.appendChild(promoEl);

  function boardCoordsFromDisplay(row, col) {
    return orientation === 'w' ? { r: 7 - row, c: col } : { r: row, c: 7 - col };
  }

  function applyRig() {
    rig.style.transform = `rotateX(${rigX}deg) rotateY(${rigY}deg)`;
    // Exact inverse of the rig's rotation, so glyphs (and capture effects)
    // stay flat-on to the camera no matter how the board has been
    // spun/tilted.
    const billboard = `rotateY(${-rigY}deg) rotateX(${-rigX}deg)`;
    piecesLayer.querySelectorAll('.piece-glyph').forEach((el) => {
      el.style.transform = billboard;
    });
    piecesLayer.querySelectorAll('.capture-fx').forEach((el) => {
      el.style.transform = `translateZ(4px) ${billboard}`;
    });
  }

  function spawnCaptureEffect(capturedSquare, byType, cellSize) {
    if (!capturedSquare) return;
    // boardCoordsFromDisplay is its own inverse (swapping row/col for c/r
    // is the same formula either direction), so it also converts a board
    // square back to display coordinates.
    const { r: dispRow, c: dispCol } = boardCoordsFromDisplay(capturedSquare.r, capturedSquare.c);
    const fx = document.createElement('div');
    fx.className = `capture-fx fx-${byType}`;
    fx.style.left = `${dispCol * cellSize + cellSize / 2}px`;
    fx.style.top = `${dispRow * cellSize + cellSize / 2}px`;
    fx.innerHTML = captureEffectMarkup(byType);
    piecesLayer.appendChild(fx);
    setTimeout(() => fx.remove(), CAPTURE_FX_DURATION_MS);
  }

  // dx/dy are directions, not degrees: -1/0/1. Shared by the arrow keys and
  // the on-screen buttons (for touch devices, which have no arrow keys).
  function rotateCamera(dx, dy) {
    rigY += dx * ROTATE_STEP_DEG;
    rigX = Math.max(20, Math.min(85, rigX + dy * ROTATE_STEP_DEG));
    applyRig();
  }

  // Arrow keys orbit the camera; the mouse is left alone entirely for
  // clicking. Skip handling when the player is typing somewhere else on
  // the page (e.g. the online room-code field) so arrow keys still work
  // normally there.
  function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowLeft': rotateCamera(-1, 0); break;
      case 'ArrowRight': rotateCamera(1, 0); break;
      case 'ArrowUp': rotateCamera(0, -1); break;
      case 'ArrowDown': rotateCamera(0, 1); break;
      default: return;
    }
    e.preventDefault();
  });

  window.addEventListener('resize', () => render());

  function clearSelection() {
    selected = null;
    legalTargets = [];
  }

  function render() {
    const state = getState();
    boardEl.innerHTML = '';
    piecesLayer.innerHTML = '';
    const lastMove = state.moveLog[state.moveLog.length - 1];
    const cellSize = boardEl.clientWidth / 8 || 60;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const { r, c } = boardCoordsFromDisplay(row, col);

        const sq = document.createElement('div');
        const dark = (r + c) % 2 === 0;
        sq.className = `sq ${dark ? 'dark' : 'light'}`;
        sq.style.left = `${col * cellSize}px`;
        sq.style.top = `${row * cellSize}px`;
        sq.style.width = `${cellSize}px`;
        sq.style.height = `${cellSize}px`;

        if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
          sq.classList.add('last-move');
        }
        if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
        const target = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (target) sq.classList.add(target.isCapture ? 'legal-capture' : 'legal-move');

        sq.addEventListener('click', () => handleClick(r, c));
        boardEl.appendChild(sq);

        const piece = state.board[r][c];
        if (piece) {
          const anchor = document.createElement('div');
          anchor.className = 'piece-anchor';
          anchor.style.left = `${col * cellSize + cellSize / 2}px`;
          anchor.style.top = `${row * cellSize + cellSize / 2}px`;

          const shadow = document.createElement('div');
          shadow.className = 'piece-shadow';
          anchor.appendChild(shadow);

          const lift = document.createElement('div');
          lift.className = 'piece-lift';
          lift.style.transform = `translateZ(${PIECE_LIFT_PX}px)`;

          const figureSize = cellSize * 0.86;
          const glyph = document.createElement('div');
          glyph.className = `piece-glyph piece-${piece.color}${piece.buffed ? ' buffed' : ''}`;
          glyph.style.width = `${figureSize}px`;
          glyph.style.height = `${figureSize}px`;
          glyph.style.marginLeft = `${-figureSize / 2}px`;
          glyph.style.marginTop = `${-figureSize * 0.72}px`;
          glyph.innerHTML = pieceMarkup(piece.type);
          glyph.title = piece.buffed ? 'Buffed by a capture' : '';

          lift.appendChild(glyph);
          anchor.appendChild(lift);
          piecesLayer.appendChild(anchor);
        }
      }
    }

    if (lastMove && lastMove.capture && lastMove !== lastAnimatedMove) {
      lastAnimatedMove = lastMove;
      spawnCaptureEffect(lastMove.capturedSquare, lastMove.piece.type, cellSize);
    }

    applyRig();
  }

  function handleClick(r, c) {
    if (!interactive()) return;
    const state = getState();

    if (selected) {
      const move = legalTargets.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        attemptMove(move);
        return;
      }
    }

    const piece = state.board[r][c];
    if (piece && piece.color === state.turn) {
      selected = { r, c };
      legalTargets = getLegalMovesForSquare(state, r, c);
    } else {
      clearSelection();
    }
    render();
  }

  function attemptMove(move) {
    if (move.isPromotion) {
      askPromotion().then((choice) => {
        clearSelection();
        onAttemptMove(move.from, move.to, choice);
        render();
      });
      return;
    }
    clearSelection();
    onAttemptMove(move.from, move.to, null);
    render();
  }

  function askPromotion() {
    promoEl.innerHTML = '';
    promoEl.classList.remove('hidden');
    return new Promise((resolve) => {
      for (const choice of PROMO_CHOICES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
          promoEl.classList.add('hidden');
          resolve(choice.type);
        });
        promoEl.appendChild(btn);
      }
    });
  }

  render();

  return {
    render,
    clearSelection: () => { clearSelection(); render(); },
  };
}
