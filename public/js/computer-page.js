import { createInitialState, applyMove, getGameStatus } from '../rules.js';
import { createBoardView } from './board-ui.js';
import { createBuffPanel } from './buff-panel.js';
import { pickComputerMove } from './ai.js';

let state = null;
let humanColor = 'w';
let view = null;
let panel = null;

const setupEl = document.getElementById('setup');
const gameEl = document.getElementById('game');
const statusEl = document.getElementById('status');
const root = document.getElementById('board-root');
const panelRoot = document.getElementById('buff-panel');

document.querySelectorAll('[data-side]').forEach((btn) => {
  btn.addEventListener('click', () => {
    humanColor = btn.dataset.side;
    startGame();
  });
});

document.getElementById('new-game').addEventListener('click', () => {
  setupEl.classList.remove('hidden');
  gameEl.classList.add('hidden');
});

function isGameOver() {
  const s = getGameStatus(state);
  return s.checkmate || s.stalemate;
}

function startGame() {
  state = createInitialState(true);
  setupEl.classList.add('hidden');
  gameEl.classList.remove('hidden');

  root.innerHTML = '';
  view = createBoardView(root, {
    getState: () => state,
    orientation: humanColor,
    interactive: () => state.turn === humanColor && !isGameOver(),
    onAttemptMove: (from, to, promotionChoice) => {
      const next = applyMove(state, from, to, promotionChoice);
      if (next) {
        state = next;
        updateStatus();
        panel.render();
        maybeComputerMove();
      }
    },
  });
  if (!panel) panel = createBuffPanel(panelRoot, { getState: () => state });
  else panel.render();

  updateStatus();
  maybeComputerMove();
}

function maybeComputerMove() {
  if (isGameOver() || state.turn === humanColor) return;
  statusEl.textContent = 'The computer is thinking...';
  setTimeout(() => {
    const move = pickComputerMove(state, 2);
    if (move) {
      const next = applyMove(state, move.from, move.to, move.isPromotion ? 'q' : undefined);
      if (next) state = next;
    }
    view.render();
    updateStatus();
    panel.render();
  }, 50);
}

function updateStatus() {
  const status = getGameStatus(state);
  const turnName = state.turn === 'w' ? 'White' : 'Black';
  if (status.checkmate) {
    statusEl.textContent = `Checkmate — ${status.winner === humanColor ? 'You win!' : 'The computer wins.'}`;
  } else if (status.stalemate) {
    statusEl.textContent = 'Stalemate — draw.';
  } else if (state.turn !== humanColor) {
    statusEl.textContent = 'The computer is thinking...';
  } else if (status.inCheck) {
    statusEl.textContent = `${turnName} to move — you are in check.`;
  } else {
    statusEl.textContent = `${turnName} to move.`;
  }
}
