// Story Line — Worker entry point. Static assets (the game itself) are
// served by the Workers "assets" binding; this fetch handler only runs for
// paths listed in `run_worker_first` in wrangler.jsonc (the WebSocket path),
// per the technical constraint that Workers cannot run a long-lived Node
// server (no Socket.IO / Express / ws here — native WebSockets only).

import { ChessRoom } from './room.js';

export { ChessRoom };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/ws/')) {
      const roomCode = decodeURIComponent(url.pathname.slice('/ws/'.length)).trim().toUpperCase();
      if (!roomCode) {
        return new Response('Missing room code', { status: 400 });
      }
      const stub = env.ROOM.getByName(roomCode);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
