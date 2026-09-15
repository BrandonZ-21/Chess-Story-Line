// Story Line — WebSocket client for online rooms. Talks to the ChessRoom
// Durable Object at /ws/<ROOM-CODE>. The room, not this client, decides
// whether a proposed move is legal.

export function connectRoom(roomCode, handlers = {}) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws/${encodeURIComponent(roomCode)}`);

  ws.addEventListener('open', () => handlers.onOpen && handlers.onOpen());
  ws.addEventListener('close', () => handlers.onClose && handlers.onClose());
  ws.addEventListener('error', (e) => handlers.onError && handlers.onError(e));
  ws.addEventListener('message', (evt) => {
    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch (e) {
      return;
    }
    handlers.onMessage && handlers.onMessage(msg);
  });

  return {
    sendMove(from, to, promotionChoice) {
      ws.send(JSON.stringify({ type: 'move', payload: { from, to, promotionChoice } }));
    },
    newGame() {
      ws.send(JSON.stringify({ type: 'newGame', payload: {} }));
    },
    close() {
      ws.close();
    },
  };
}
