// Story Line — computer opponent. Runs entirely in the browser: minimax
// search with alpha-beta pruning, depth 2 (two half-moves), scored by piece
// value. No external engine or API.

import { getAllLegalMoves, applyMoveUnchecked, PIECE_VALUES } from '../rules.js';

function evaluate(state) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      let value = PIECE_VALUES[p.type];
      if (p.buffed) value += 30; // a buffed piece has more options, worth a little more
      score += p.color === 'w' ? value : -value;
    }
  }
  return score; // positive favors White, negative favors Black
}

function orderedMoves(state) {
  // Captures first: a cheap ordering trick that lets alpha-beta prune more.
  const moves = getAllLegalMoves(state);
  return moves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));
}

function withPromotion(move) {
  return move.isPromotion ? { ...move, promotionChoice: 'q' } : move;
}

function minimax(state, depth, alpha, beta, maximizing) {
  const moves = orderedMoves(state);
  if (depth === 0 || moves.length === 0) {
    return evaluate(state);
  }
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyMoveUnchecked(state, withPromotion(m));
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const next = applyMoveUnchecked(state, withPromotion(m));
    best = Math.min(best, minimax(next, depth - 1, alpha, beta, true));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

// Returns a legal move object ({from, to, ...}) for the side to move, or
// null if there are no legal moves (checkmate/stalemate). Always finishes
// well within the 2-second budget at depth 2.
export function pickComputerMove(state, depth = 2) {
  const maximizing = state.turn === 'w';
  const moves = orderedMoves(state);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestVal = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const m of moves) {
    const next = applyMoveUnchecked(state, withPromotion(m));
    const val = minimax(next, depth - 1, alpha, beta, !maximizing);
    if (maximizing ? val > bestVal : val < bestVal) {
      bestVal = val;
      bestMove = m;
    }
    if (maximizing) alpha = Math.max(alpha, bestVal);
    else beta = Math.min(beta, bestVal);
  }
  return bestMove;
}
