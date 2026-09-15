import { createBoardView } from './board-ui.js';
<<<<<<< HEAD
import { createBuffPanel } from './buff-panel.js';
=======
>>>>>>> 724744982809178fde9a8bfd9122703b132874db
import { connectRoom } from './online-client.js';

let state = null;
let gameStatus = null;
let myRole = null;
let view = null;
<<<<<<< HEAD
let panel = null;
=======
>>>>>>> 724744982809178fde9a8bfd9122703b132874db
let room = null;

const joinEl = document.getElementById('join');
const gameEl = document.getElementById('game');
const statusEl = document.getElementById('status');
const presenceEl = document.getElementById('presence');
const roleEl = document.getElementById('role');
const root = document.getElementById('board-root');
<<<<<<< HEAD
const panelRoot = document.getElementById('buff-panel');
=======
>>>>>>> 724744982809178fde9a8bfd9122703b132874db
const codeInput = document.getElementById('room-code');

document.getElementById('join-btn').addEventListener('click', () => {
  const code = (codeInput.value || '').trim().toUpperCase();
  if (!code) return;
  join(code);
});

document.getElementById('new-game').addEventListener('click', () => {
  if (room) room.newGame();
});

function join(code) {
  room = connectRoom(code, {
    onClose: () => { statusEl.textContent = 'Disconnected. Refresh this page to rejoin.'; },
    onError: () => { statusEl.textContent = 'Connection error.'; },
    onMessage: handleMessage,
  });
  joinEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  document.getElementById('room-label').textContent = code;
}

function handleMessage(msg) {
  if (msg.type === 'joined') {
    myRole = msg.payload.role;
    roleEl.textContent = myRole === 'spectator' ? 'Spectating' : `Playing ${myRole === 'w' ? 'White' : 'Black'}`;
    applyState(msg.payload.state);
    ensureView();
  } else if (msg.type === 'state') {
    applyState(msg.payload);
    if (view) view.render();
<<<<<<< HEAD
    if (panel) panel.render();
=======
>>>>>>> 724744982809178fde9a8bfd9122703b132874db
  } else if (msg.type === 'presence') {
    presenceEl.textContent = `White: ${msg.payload.white ? 'connected' : 'waiting'} · Black: ${msg.payload.black ? 'connected' : 'waiting'} · Watching: ${msg.payload.spectators}`;
  } else if (msg.type === 'error') {
    statusEl.textContent = msg.payload.message;
  }
}

function applyState(s) {
  state = s;
  gameStatus = s.gameStatus || null;
  updateStatus();
}

function ensureView() {
<<<<<<< HEAD
  if (!panel) panel = createBuffPanel(panelRoot, { getState: () => state });
  else panel.render();
=======
>>>>>>> 724744982809178fde9a8bfd9122703b132874db
  if (view) { view.render(); return; }
  view = createBoardView(root, {
    getState: () => state,
    orientation: myRole === 'b' ? 'b' : 'w',
    interactive: () => myRole === state.turn && !(gameStatus && (gameStatus.checkmate || gameStatus.stalemate)),
    onAttemptMove: (from, to, promotionChoice) => {
      room.sendMove(from, to, promotionChoice);
    },
  });
}

function updateStatus() {
  if (!state) return;
  const turnName = state.turn === 'w' ? 'White' : 'Black';
  if (gameStatus && gameStatus.checkmate) {
    statusEl.textContent = `Checkmate — ${gameStatus.winner === 'w' ? 'White' : 'Black'} wins.`;
  } else if (gameStatus && gameStatus.stalemate) {
    statusEl.textContent = 'Stalemate — draw.';
  } else if (gameStatus && gameStatus.inCheck) {
    statusEl.textContent = `${turnName} to move — in check.`;
  } else {
    statusEl.textContent = `${turnName} to move.`;
  }
}
