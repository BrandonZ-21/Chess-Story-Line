// Story Line — shared 3D board rendering + click-to-move UI. Used by the
// hot-seat, vs. computer, and online screens alike.
//
// The board is built with CSS 3D transforms (perspective + rotateX/rotateY),
// not a graphics library — it's still "plain HTML, CSS and JavaScript."
// Dragging the mouse orbits the whole scene (rotateX for tilt, rotateY for
// spinning around the board); pieces stand up off the board on a small
// vertical "lift" and counter-rotate every frame so their glyphs always
// face the camera (a standard CSS-3D "billboard" trick), no matter which
// way the board is currently turned.

import { getLegalMovesForSquare } from '../rules.js';
import { pieceMarkup } from './piece-art.js';

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
  let pointerDown = false; // true from pointerdown to pointerup, regardless of movement
  let dragging = false; // true only once movement has crossed DRAG_THRESHOLD_PX
  let lastPointer = null;
  let downPointer = null;
  let suppressNextClick = false;

  const DRAG_THRESHOLD_PX = 6; // a click that wobbles less than this still counts as a click

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
  hint.textContent = 'Drag the board to look around while you play.';
  root.appendChild(hint);

  const promoEl = document.createElement('div');
  promoEl.className = 'promo-picker hidden';
  root.appendChild(promoEl);

  function boardCoordsFromDisplay(row, col) {
    return orientation === 'w' ? { r: 7 - row, c: col } : { r: row, c: 7 - col };
  }

  function applyRig() {
    rig.style.transform = `rotateX(${rigX}deg) rotateY(${rigY}deg)`;
    // Exact inverse of the rig's rotation, so glyphs stay flat-on to the
    // camera no matter how the board has been spun/tilted.
    const billboard = `rotateY(${-rigY}deg) rotateX(${-rigX}deg)`;
    piecesLayer.querySelectorAll('.piece-glyph').forEach((el) => {
      el.style.transform = billboard;
    });
  }

  scene.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    dragging = false;
    downPointer = { x: e.clientX, y: e.clientY };
    lastPointer = { x: e.clientX, y: e.clientY };
    scene.setPointerCapture(e.pointerId);
  });
  scene.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    if (!dragging) {
      // Don't start rotating until the pointer has actually moved — a
      // click that wobbles a couple pixels should still select the square,
      // not spin the board out from under it.
      const totalDx = e.clientX - downPointer.x;
      const totalDy = e.clientY - downPointer.y;
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      scene.classList.add('grabbing');
    }
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    rigY += dx * 0.4;
    rigX = Math.max(20, Math.min(85, rigX - dy * 0.3));
    applyRig();
  });
  const stopDrag = () => {
    pointerDown = false;
    if (dragging) {
      // A real drag just happened — swallow the click that's about to
      // fire on whatever square the pointer happens to be over now, so
      // letting go of a drag never also selects/moves a piece.
      suppressNextClick = true;
    }
    dragging = false;
    scene.classList.remove('grabbing');
  };
  scene.addEventListener('pointerup', stopDrag);
  scene.addEventListener('pointerleave', stopDrag);
  scene.addEventListener('pointercancel', stopDrag);
  scene.addEventListener(
    'click',
    (e) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true
  );
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
