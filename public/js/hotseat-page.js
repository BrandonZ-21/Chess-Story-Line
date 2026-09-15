import { createInitialState, applyMove, getGameStatus } from '../rules.js';
import { createBoardView } from './board-ui.js';
import { createBuffPanel } from './buff-panel.js';

let state = createInitialState(true);

const statusEl = document.getElementById('status');
const root = document.getElementById('board-root');
const panelRoot = document.getElementById('buff-panel');

const panel = createBuffPanel(panelRoot, { getState: () => state });

const view = createBoardView(root, {
  getState: () => state,
  interactive: () => {
    const s = getGameStatus(state);
    return !s.checkmate && !s.stalemate;
  },
  onAttemptMove: (from, to, promotionChoice) => {
    const next = applyMove(state, from, to, promotionChoice);
    if (next) {
      state = next;
      updateStatus();
      panel.render();
    }
  },
});

function updateStatus() {
  const status = getGameStatus(state);
  const turnName = state.turn === 'w' ? 'White' : 'Black';
  if (status.checkmate) {
    statusEl.textContent = `Checkmate — ${status.winner === 'w' ? 'White' : 'Black'} wins.`;
  } else if (status.stalemate) {
    statusEl.textContent = 'Stalemate — draw.';
  } else if (status.inCheck) {
    statusEl.textContent = `${turnName} to move — in check.`;
  } else {
    statusEl.textContent = `${turnName} to move.`;
  }
}

document.getElementById('new-game').addEventListener('click', () => {
  state = createInitialState(true);
  view.clearSelection();
  updateStatus();
  panel.render();
});

updateStatus();
