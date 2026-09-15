# Story Line

A browser chess game with three ways to play — hot-seat, vs. computer, and online by room code — themed as medieval battleground chess. Built for BUS 131 (Brandeis University), Week 3 Mastery Assignment.

**Author:** Brandon Zhao (brandonzhao@brandeis.edu)

## What this is

Story Line is full, legal chess (all six pieces, check, checkmate, stalemate, castling, en passant, promotion) with one house rule layered on top: **capturing an enemy piece grants your capturing piece a permanent buff** (see [ProductSpec.md](ProductSpec.md#buff-system) for exactly what each piece's buff does). The board and pieces are styled as a medieval battleground.

Three modes, all sharing one rules engine:

| Mode | What happens |
|---|---|
| **Hot-seat** | Two people, one screen, one browser, taking turns. |
| **Vs. Computer** | You pick White or Black; the browser plays the other side (minimax + alpha-beta, depth 2, replies within 2 seconds). |
| **Online** | Two players open the same room code on two devices and see each other's moves live. First one in plays White, second plays Black, anyone after that just watches. |

## Not in scope

No accounts or logins, no clocks or ratings, no draw-by-repetition or fifty-move rule, no opening books, no move export. Plain HTML, CSS and JavaScript — no React, no chess.js, no external chess engine.

## How it's built

- **Rules engine:** one shared module, [`rules.js`](rules.js) — every mode (hot-seat, computer, online server) asks it the same question before a move counts: *is this move legal?*
- **Hosting:** Cloudflare Workers (Free plan), static assets served via `wrangler.jsonc`.
- **Online play:** one SQLite-backed Durable Object per game room. The Durable Object is the only authority on whether a move counts — a browser only proposes a move, the room confirms it and tells both players.
- **Computer opponent:** runs entirely in your browser, no server round-trip, no external API.

See [ProductSpec.md](ProductSpec.md) for how the app is organized and [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) for the build plan and current status.

## Running it locally

```bash
npm install
npx wrangler dev
```

Opens a local Cloudflare Workers dev server (serves the static game + runs the Durable Object locally). Open the printed `localhost` URL in two browser windows to test online mode.

## Deploying

```bash
npx wrangler deploy
```

Publishes to your `*.workers.dev` address on the Cloudflare Workers Free plan. No environment variables or secrets are required — there are no accounts, no database beyond the per-room Durable Object, and no external services.

## Project glossary

- **Rules engine** — the one file (`rules.js`) that knows how every piece moves and what check means.
- **Minimax / alpha-beta** — how the computer picks a move: it tries legal moves, imagines your best reply, and scores the result; alpha-beta is a shortcut that skips branches that can't change the outcome.
- **Durable Object** — a small, single-instance server object Cloudflare keeps alive per room; it's the one place that decides whether a move is legal in online mode, so neither browser can cheat by editing its own screen.
