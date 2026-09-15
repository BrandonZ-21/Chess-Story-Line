// Story Line — the Durable Object that is the sole authority on one online
// game room. One instance per room code (env.ROOM.getByName(roomCode)),
// SQLite-backed so the position survives the Durable Object going idle and
// waking back up. No timers/Alarms anywhere here — chess has no clock in
// this build, so the position is simply saved after every move.

import { createInitialState, applyMove, getGameStatus } from '../public/rules.js';

export class ChessRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.state = null;
    this.ready = this.hydrate();
  }

  async hydrate() {
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS game (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL)`
    );
    const rows = [...this.sql.exec(`SELECT state FROM game WHERE id = 1`)];
    if (rows.length > 0) {
      this.state = JSON.parse(rows[0].state);
    } else {
      this.state = createInitialState(true);
      this.persist();
    }
  }

  persist() {
    this.sql.exec(
      `INSERT INTO game (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state`,
      JSON.stringify(this.state)
    );
  }

  publicState() {
    return { ...this.state, gameStatus: getGameStatus(this.state) };
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      // socket may already be closing; nothing to do
    }
  }

  broadcast(msg) {
    for (const ws of this.ctx.getWebSockets()) this.send(ws, msg);
  }

  roleCounts() {
    const roles = this.ctx.getWebSockets().map((ws) => {
      const att = ws.deserializeAttachment();
      return att && att.role;
    });
    return {
      white: roles.includes('w'),
      black: roles.includes('b'),
      spectators: roles.filter((r) => r === 'spectator').length,
    };
  }

  assignRole() {
    const { white, black } = this.roleCounts();
    if (!white) return 'w';
    if (!black) return 'b';
    return 'spectator';
  }

  async fetch(request) {
    await this.ready;
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Native WebSocket hibernation API — never server.accept().
    this.ctx.acceptWebSocket(server);

    const role = this.assignRole();
    server.serializeAttachment({ role });

    this.send(server, { type: 'joined', payload: { role, state: this.publicState() } });
    this.broadcast({ type: 'presence', payload: this.roleCounts() });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    await this.ready;
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      return;
    }

    const attachment = ws.deserializeAttachment() || {};
    const role = attachment.role;

    if (msg.type === 'move') {
      if (role !== this.state.turn) {
        this.send(ws, { type: 'error', payload: { message: 'Not your turn' } });
        return;
      }
      const { from, to, promotionChoice } = msg.payload || {};
      const next = from && to ? applyMove(this.state, from, to, promotionChoice) : null;
      if (!next) {
        this.send(ws, { type: 'error', payload: { message: 'Illegal move' } });
        return;
      }
      this.state = next;
      this.persist();
      this.broadcast({ type: 'state', payload: this.publicState() });
      return;
    }

    if (msg.type === 'newGame') {
      this.state = createInitialState(true);
      this.persist();
      this.broadcast({ type: 'state', payload: this.publicState() });
      return;
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    this.broadcast({ type: 'presence', payload: this.roleCounts() });
  }

  async webSocketError(ws, error) {
    this.broadcast({ type: 'presence', payload: this.roleCounts() });
  }
}
