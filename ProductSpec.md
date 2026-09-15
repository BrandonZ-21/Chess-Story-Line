# Story Line — Product Spec

What the app does, how it's organized, and the decisions behind it. Read this before starting any task in [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) — it's the map; the roadmap is the checklist.

## 1. What the app does

Story Line is a browser chess game, playable three ways, all against the same rules:

1. **Hot-seat** — two people share one screen and one keyboard/mouse, taking turns as White and Black.
2. **Vs. Computer** — the player picks a side (White or Black); the browser calculates and plays the other side.
3. **Online** — two people open the game on two separate devices, type the same room code, and play against each other in real time. Anyone else who types that code just watches.

All three modes play **the same house-ruled chess**: standard legal chess (every piece, check, checkmate, stalemate, castling, en passant, promotion) plus one addition — see [Buff System](#buff-system) below.

## 2. Scope decision: 4D chess vs. the buff system

The initial idea for this project ("Story Line") was four-dimensional chess — multiple boards, one per era, connected across time. **That idea was dropped for the actual game rules.** Reasons:

- The assignment is graded on a fixed, binary bar: a working three-mode game built around **one shared `rules.js` module** that every mode calls, verified against the standard opening-position legal-move counts (20 at depth 1, 400 at depth 2, 8,902 at depth 3). Those numbers only hold for one normal 8×8 board — a multi-board 4D variant has no such fixed answer key to build against, and there is no external engine library allowed to lean on for it.
- Time was budgeted (this is a ~2-3 hour build across four phases), and 4D board logic is a multi-week project on its own.

**What survives from the idea:** the "different storylines / different eras" concept became the **visual theme**, not the rules — the board is a single medieval battleground, pieces are medieval characters (knights, foot soldiers, etc. standing in for the standard chess roles), and each *mode* (hot-seat / vs. computer / online) can carry its own era-flavored color story if the Figma designs support it, without changing how any piece is allowed to move.

**What replaced it as the house rule:** capturing a piece grants a buff (below). This was a deliberate choice to accept: it changes `rules.js` itself, which means Story Line's real legal-move counts will differ from 20/400/8,902 once buffs are implemented. To keep the build honest, the roadmap still verifies a *pure standard-chess baseline* against those numbers before the buff layer is added — see [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) task 02. That baseline is the safety net: if the buff layer ever behaves strangely, there is a known-correct version of `rules.js` to diff against.

## 3. Buff system

House rule, layered on top of standard chess rules in `rules.js`:

> **Whenever a piece captures an enemy piece, the capturing piece is permanently empowered with its type's buff.** A piece can hold only one buff (capturing again while already buffed has no further effect — keeps the rules and the AI's scoring tractable). A buff is lost only if the piece itself is captured.

| Piece | Buff (added move) |
|---|---|
| Pawn | May move 2 squares forward on any turn, not just its first move (still cannot capture moving straight). |
| Knight | May also move exactly 1 square in any straight direction (orthogonal), in addition to its normal L-move. |
| Bishop | May also move exactly 1 square orthogonally (a single non-diagonal step). |
| Rook | May also move exactly 1 square diagonally. |
| Queen | May move through (jump over) exactly one occupied square along its path, once per move — the piece jumped over is unaffected. |
| King | May move 2 squares in any direction once per game (separate from, and in addition to, castling); still cannot move into check. |

Buffed pieces are marked visually (see Figma design for the exact treatment — e.g., a glow or medieval "banner" icon on the piece). The buff never changes whether the *king* is left in check — a move that captures but leaves your own king in check is still illegal, buff or not.

This table is the source of truth for `rules.js`. If it turns out to be unbalanced or hard to implement cleanly for a given piece, that's a conversation to have before building it, not a silent change while building it (see the assignment's own rule: if something isn't buildable, say so rather than changing it quietly).

## 4. Modes in detail

### Hot-seat
- One browser tab, one board. No network calls.
- Turn indicator shows whose move it is. Clicking/tapping a piece highlights its legal moves (including any buff-granted ones); clicking a highlighted square makes the move.
- This mode is built and deployed **first** — it's where the whole rules engine (including buffs) gets built and tested, and it's the fallback submission if time runs out.

### Vs. Computer
- Player chooses White or Black before the game starts.
- The computer's move is chosen entirely client-side (in the browser) by minimax search with alpha-beta pruning, depth 2 (two half-moves), scored by piece value (with buffed pieces scored slightly higher, since they have more mobility).
- Must always return *some* legal move within 2 seconds — if depth-2 search is too slow in practice, the fallback is a shallower/faster evaluation, never "no move."

### Online
- Player 1 to open a room code becomes White, player 2 becomes Black, anyone after that is a spectator (read-only board).
- One Durable Object per room, addressed by `env.ROOM.getByName(roomCode)`, SQLite-backed (`new_sqlite_classes` migration).
- The Durable Object holds the authoritative game state and runs the exact same `rules.js` the other two modes use. A browser sends a *proposed* move; the Durable Object validates it, applies it if legal, and broadcasts the new state to every connected socket (players and spectators).
- Communication is native WebSockets accepted via `ctx.acceptWebSocket()` (never `server.accept()`), messages are JSON with `type` and `payload`, and player identity (which color you are) is stored via `ws.serializeAttachment()` / `deserializeAttachment()` so a page refresh can rejoin as the same player rather than a new spectator.
- No timers, intervals, or Alarms anywhere in the Durable Object — chess has no clock in this build. The board position is saved after every single move, so a refresh (or the Durable Object going idle and waking back up) always resumes exactly where the game left off.
- "New game" resets state for both players in that room.

## 5. File organization

```
/
├── wrangler.jsonc          Cloudflare Workers config: static assets + Durable Object binding
├── rules.js                THE shared rules engine — every mode imports this, nothing else implements chess logic
├── src/
│   ├── worker.js            Worker entry point: serves static assets, routes the WebSocket path to the Durable Object
│   └── room.js               The Durable Object class (SQLite-backed): validates moves via rules.js, holds room state, broadcasts to sockets
├── public/                  Static site (served as assets)
│   ├── index.html            Landing screen: three mode buttons
│   ├── hotseat.html           Hot-seat board screen
│   ├── computer.html          Vs. Computer screen (side picker + board)
│   ├── online.html            Room-code join screen + board
│   ├── css/                  Medieval battleground styling (from Figma)
│   ├── js/
│   │   ├── board-ui.js         Shared rendering/click-to-move logic used by all three board screens
│   │   ├── ai.js                Minimax + alpha-beta computer opponent (browser-side only)
│   │   └── online-client.js     WebSocket client for online mode
│   └── assets/               Piece art, board art, icons (medieval theme, from Figma)
├── test/
│   └── rules.perft.test.js  Move-count test: standard-chess baseline against 20 / 400 / 8,902
└── FEATUREROADMAP_workplan.md, ProductSpec.md, README.md
```

`rules.js` has no dependency on Cloudflare, the DOM, or any framework — it's pure JavaScript so the exact same file runs in the browser (hot-seat, computer opponent, online client's optimistic UI) and inside the Durable Object (server-side authority).

## 6. Design source

Look and feel (board texture, piece art, color palette, landing screen copy, buff-indicator treatment) comes from Figma, pulled in via the Figma connector once the style spec is written — see [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) task 00. This document describes *behavior*; Figma describes *look*. If the two ever disagree on something behavioral (e.g., a design implies a rule that isn't in section 3), this document wins and the design gets flagged for a fix.

## 7. Explicitly not in scope

No accounts, logins, passwords, or user database (players are identified only by display name + room code for the lifetime of a room). No clocks or time controls. No ratings. No draw by threefold repetition or the fifty-move rule. No opening books. No move export/PGN. No React — plain HTML, CSS, and JavaScript throughout.
