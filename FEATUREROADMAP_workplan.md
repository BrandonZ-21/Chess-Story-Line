# Story Line — Feature Roadmap / Workplan

Every task is a checkbox. Pick one, tell the agent to run it, read what changed, check the box, pick the next one. This file is the driver's seat — edit it freely (reorder, add notes, add tasks) as you learn.

**Order is fixed by the assignment:** hot-seat chess deployed and live on the internet first, then the computer opponent, then online rooms. Anything after Phase 2 (online) is optional polish — if time runs out, whatever's checked off above that line is still a submittable game.

Status legend: `☐` queued · `▶` in progress · `✓` done · `⛔` blocked by another task's number

---

## Phase 0 — Look & setup

- [ ] **00 · Write the style spec and pull Figma screens**
  Dependencies: none. Files: none yet (Figma only).
  Definition of done: a landing screen, a room-join screen, and a chessboard screen exist in Figma, in the medieval-battleground style described in the project brief (medieval character pieces, battleground board texture, buffed-piece indicator). Screens are referenced by name/link in a note on this task once done.

- [x] **01 · Create the GitHub repo and push the initial commit**
  Dependencies: none. Files: this repo's root (`README.md`, `ProductSpec.md`, `FEATUREROADMAP_workplan.md`).
  Definition of done: repo `BrandonZ-21/Chess-Story-Line` exists on GitHub and contains these three documents on `main`.
  Notes: done as part of the Architect phase, before any game code.

## Phase 1 — Hot-seat (ships first, live on the internet)

- [ ] **02 · Rules engine — standard chess baseline, proven by move count**
  Dependencies: 00 (so piece/board terms match the design). Files: `rules.js`, `test/rules.perft.test.js`.
  Definition of done: `rules.js` implements full standard legal chess (all six pieces, turns, check, checkmate, stalemate, castling, en passant, promotion) with **no buffs yet**. A perft test from the start position returns exactly 20 legal moves at depth 1, 400 at depth 2, and 8,902 at depth 3. This exact baseline is committed before any buff logic is added, so there's a known-correct version to diff against later.

- [ ] **03 · Buff system layered onto the rules engine**
  Dependencies: 02. Files: `rules.js`, `test/rules.perft.test.js` (updated/duplicated to test buff behavior separately from the baseline).
  Definition of done: capturing a piece grants its type's buff exactly as specified in [ProductSpec.md § Buff System](ProductSpec.md#buff-system); a buffed piece's extra move is legal, doesn't allow leaving your own king in check, and a piece can't be buffed twice. The depth-1/2/3 baseline test from task 02 is kept in the test suite (still passing on a fresh board, since no captures have happened yet) alongside new tests for buff-specific legal moves.

- [ ] **04 · Board UI — click to move, hot-seat**
  Dependencies: 02 (needs at least the standard rules; 03 if buffs should be visible from the start). Files: `public/hotseat.html`, `public/js/board-ui.js`, `public/css/`.
  Definition of done: an 8×8 board renders with the Figma-designed medieval pieces; clicking a piece highlights its legal moves (including buffed ones once 03 is done); clicking a highlighted square makes the move; turn indicator updates; an illegal move is impossible to make from the UI. Check, checkmate, and stalemate are shown on screen when they occur.

- [ ] **05 · Deploy hot-seat to Cloudflare — first live URL**
  Dependencies: 04. Files: `wrangler.jsonc`, `src/worker.js`, `public/index.html` (landing screen linking to hot-seat).
  Definition of done: `npx wrangler deploy` succeeds; the printed `*.workers.dev` URL loads the landing screen and a working hot-seat game in a browser, on a phone or another computer (not just localhost). `wrangler.jsonc` serves `public/` as static assets, `not_found_handling` is `"single-page-application"`, `compatibility_date` is set to the deploy date, and `{"observability": {"enabled": true}}` is set.
  **This is the checkpoint: if nothing else gets built, this is what gets submitted.**

## Phase 2 — Vs. Computer

- [ ] **06 · Minimax + alpha-beta opponent**
  Dependencies: 03 (needs the final rules engine, buffs included, to evaluate positions correctly). Files: `public/js/ai.js`.
  Definition of done: given a board position and a side to move, returns a legal move using minimax search with alpha-beta pruning at depth 2, scored by piece value (buffed pieces score slightly higher). Runs entirely in the browser — no server call, no external engine/API. Tested to always return within 2 seconds from the start position and from a mid-game position with several buffed pieces on the board.

- [ ] **07 · Vs. Computer screen + deploy**
  Dependencies: 05, 06. Files: `public/computer.html`, `src/worker.js` (routing if needed), `public/index.html` (landing screen's second button).
  Definition of done: player picks White or Black before the game starts; the computer always replies with a legal move within 2 seconds; game ends correctly on checkmate/stalemate either side. Redeployed and reachable from the landing screen's live URL.

## Phase 3 — Online rooms

- [ ] **08 · Durable Object — authoritative room state**
  Dependencies: 03. Files: `src/room.js`, `wrangler.jsonc` (Durable Object binding + `new_sqlite_classes` migration).
  Definition of done: `env.ROOM.getByName(roomCode)` reaches a SQLite-backed Durable Object that holds one game's state; it validates every proposed move against `rules.js` before accepting it; state is saved after every move (no timers/Alarms anywhere in this class).

- [ ] **09 · WebSocket wiring — room join, live moves, refresh-safe**
  Dependencies: 08. Files: `src/room.js`, `public/js/online-client.js`, `public/online.html`.
  Definition of done: sockets are accepted with `ctx.acceptWebSocket()` (not `server.accept()`); messages are JSON with `type` + `payload`; player identity (color) is stored with `ws.serializeAttachment()` and restored with `deserializeAttachment()`. First player to join a room code is White, second is Black, anyone after that is a read-only spectator. A page refresh rejoins the same game as the same player (not a new spectator) because state was saved after the last move. "New game" resets the room for both players. No Socket.IO, Express, or `ws` anywhere.

- [ ] **10 · Online screen + deploy**
  Dependencies: 09. Files: `public/online.html`, `public/index.html` (landing screen's third button).
  Definition of done: two separate devices (or two browser windows, two different sessions) type the same room code and see each other's moves live, on the deployed `*.workers.dev` URL — not just localhost. Both boards always agree (the room decides, not the browser).

## Phase 4 — Optional extras (built last, only if time remains)

- [ ] **11 · Pick and build one extra**
  Dependencies: 05, 07, 10 (all three modes live). Files: TBD by which extra is picked.
  Options to choose from when this is reached — not yet decided:
  - Undo in hot-seat (one move back, hot-seat only)
  - Captured-pieces tray + material count (all modes)
  - Sound on move
  - Resign button (online mode)
  Definition of done: written once an option is picked.

---

## How to use this file

1. Pick the next unchecked `☐` task whose dependencies are all `✓`.
2. Tell the agent to run it — name the task number.
3. Read the diff/PR. If it's not right, say so in plain English; rejecting is normal.
4. Check the box, add a one-line note if anything's worth remembering for later.
5. Repeat.

If a task turns out to need something not listed here (a new file, a changed dependency), edit this file to say so before moving on — it should always reflect the real state of the project.
