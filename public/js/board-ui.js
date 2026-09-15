// Story Line — shared board rendering + click-to-move UI. Used by the
// hot-seat, vs. computer, and online screens alike so there's one place
// that knows how to draw a board and turn clicks into move attempts.

import { getLegalMovesForSquare } from '../rules.js';

const UNICODE = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PROMO_CHOICES = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
];

// options:
//   getState()            -> current game state (rules.js shape)
//   orientation            'w' (White at bottom, default) or 'b'
//   interactive()          -> bool, whether clicks should do anything right now
//   onAttemptMove(from,to,promotionChoice) -> called when the player completes a move
export function createBoardView(root, options) {
  const { orientation = 'w', interactive = () => true, onAttemptMove, getState } = options;

  let selected = null;
  let legalTargets = [];

  const boardEl = document.createElement('div');
  boardEl.className = 'board';
  root.appendChild(boardEl);

  const promoEl = document.createElement('div');
  promoEl.className = 'promo-picker hidden';
  root.appendChild(promoEl);

  function boardCoordsFromDisplay(row, col) {
    return orientation === 'w' ? { r: 7 - row, c: col } : { r: row, c: 7 - col };
  }

  function clearSelection() {
    selected = null;
    legalTargets = [];
  }

  function render() {
    const state = getState();
    boardEl.innerHTML = '';
    const lastMove = state.moveLog[state.moveLog.length - 1];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const { r, c } = boardCoordsFromDisplay(row, col);
        const sq = document.createElement('div');
        const dark = (r + c) % 2 === 0;
        sq.className = `sq ${dark ? 'dark' : 'light'}`;

        if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
          sq.classList.add('last-move');
        }
        if (selected && selected.r === r && selected.c === c) {
          sq.classList.add('selected');
        }
        const target = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (target) sq.classList.add(target.isCapture ? 'legal-capture' : 'legal-move');

        const piece = state.board[r][c];
        if (piece) {
          const span = document.createElement('span');
          span.className = `piece piece-${piece.color}${piece.buffed ? ' buffed' : ''}`;
          span.textContent = UNICODE[piece.color][piece.type];
          span.title = piece.buffed ? 'Buffed by a capture' : '';
          sq.appendChild(span);
        }

        sq.addEventListener('click', () => handleClick(r, c));
        boardEl.appendChild(sq);
      }
    }
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
