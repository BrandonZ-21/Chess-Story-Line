// Story Line — shared chess rules engine.
//
// This is the ONE module every mode (hot-seat UI, computer opponent, online
// Durable Object) calls to find out whether a move is legal. No external
// chess library is used anywhere in this project.
//
// House rule on top of standard chess: capturing an enemy piece permanently
// "buffs" the capturing piece with one extra kind of move (see BUFF RULES
// below and ProductSpec.md). Pass `buffsEnabled: false` to createInitialState
// to get pure standard chess — that mode is what the perft test in
// test/rules.perft.test.js checks against the class's required move counts
// (20 / 400 / 8,902 at depth 1 / 2 / 3), so there is always a known-correct
// baseline to fall back on if the buff layer ever misbehaves.

export const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

export function createInitialState(buffsEnabled = true) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'w', buffed: false };
    board[1][c] = { type: 'p', color: 'w', buffed: false };
    board[6][c] = { type: 'p', color: 'b', buffed: false };
    board[7][c] = { type: backRank[c], color: 'b', buffed: false };
  }
  return {
    board,
    turn: 'w',
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    kingBigMoveUsed: { w: false, b: false },
    buffsEnabled,
    moveLog: [],
  };
}

export function cloneState(state) {
  return {
    board: state.board.map((row) => row.map((sq) => (sq ? { ...sq } : null))),
    turn: state.turn,
    castlingRights: { ...state.castlingRights },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    kingBigMoveUsed: { ...state.kingBigMoveUsed },
    buffsEnabled: state.buffsEnabled,
    moveLog: state.moveLog.slice(),
  };
}

// ---------------------------------------------------------------------------
// Attack patterns (used for both move generation and check detection).
// Castling and the once-per-game king "big move" are handled separately
// below, since they depend on game state (rights used, path clear) rather
// than pure geometry.
// ---------------------------------------------------------------------------

function slideAttacks(board, r, c, directions, attacks, allowJump) {
  for (const [dr, dc] of directions) {
    let nr = r + dr;
    let nc = c + dc;
    let jumped = false;
    while (inBounds(nr, nc)) {
      const occupant = board[nr][nc];
      if (!occupant) {
        attacks.push({ r: nr, c: nc });
      } else {
        attacks.push({ r: nr, c: nc });
        if (allowJump && !jumped) {
          // Buffed queen: may jump over exactly one occupied square per
          // direction and keep sliding past it (the jumped piece is
          // unaffected either way).
          jumped = true;
          nr += dr;
          nc += dc;
          continue;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function pieceAttacks(board, r, c, piece, buffsEnabled) {
  const attacks = [];
  const buffed = piece.buffed && buffsEnabled;

  switch (piece.type) {
    case 'p': {
      const dir = piece.color === 'w' ? 1 : -1;
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (inBounds(nr, nc)) attacks.push({ r: nr, c: nc });
      }
      break;
    }
    case 'n': {
      const deltas = [
        [1, 2], [2, 1], [-1, 2], [-2, 1],
        [1, -2], [2, -1], [-1, -2], [-2, -1],
      ];
      if (buffed) deltas.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) attacks.push({ r: nr, c: nc });
      }
      break;
    }
    case 'b': {
      slideAttacks(board, r, c, [[1, 1], [1, -1], [-1, 1], [-1, -1]], attacks, false);
      if (buffed) {
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc)) attacks.push({ r: nr, c: nc });
        }
      }
      break;
    }
    case 'r': {
      slideAttacks(board, r, c, [[1, 0], [-1, 0], [0, 1], [0, -1]], attacks, false);
      if (buffed) {
        for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc)) attacks.push({ r: nr, c: nc });
        }
      }
      break;
    }
    case 'q': {
      slideAttacks(
        board, r, c,
        [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
        attacks,
        buffed
      );
      break;
    }
    case 'k': {
      // Basic one-square king attacks are always active (this is also what
      // keeps two kings from ever standing next to each other). The buffed
      // "move 2 squares, once per game" option is handled in
      // pseudoMovesForSquare, not here, because it also needs the
      // once-per-game and path-clear checks.
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) attacks.push({ r: nr, c: nc });
      }
      break;
    }
  }
  return attacks;
}

export function isSquareAttacked(board, r, c, byColor, buffsEnabled) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p || p.color !== byColor) continue;
      const attacks = pieceAttacks(board, rr, cc, p, buffsEnabled);
      if (attacks.some((a) => a.r === r && a.c === c)) return true;
    }
  }
  return false;
}

export function isInCheck(board, color, buffsEnabled) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return isSquareAttacked(board, r, c, opposite(color), buffsEnabled);
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Pseudo-legal move generation (doesn't yet check "does this leave my own
// king in check" — that filter happens in getLegalMovesForSquare).
// ---------------------------------------------------------------------------

function pawnMoves(state, r, c, piece) {
  const moves = [];
  const board = state.board;
  const dir = piece.color === 'w' ? 1 : -1;
  const startRow = piece.color === 'w' ? 1 : 6;
  const promoRow = piece.color === 'w' ? 7 : 0;
  const buffed = piece.buffed && state.buffsEnabled;

  const oneR = r + dir;
  if (inBounds(oneR, c) && !board[oneR][c]) {
    moves.push({ to: { r: oneR, c }, isPromotion: oneR === promoRow });
    const twoR = r + 2 * dir;
    const canDouble = r === startRow || buffed; // buff: double-step any time
    if (canDouble && inBounds(twoR, c) && !board[twoR][c]) {
      moves.push({ to: { r: twoR, c }, isDoubleStep: true, isPromotion: twoR === promoRow });
    }
  }

  for (const dc of [-1, 1]) {
    const nr = r + dir;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (target && target.color !== piece.color) {
      moves.push({ to: { r: nr, c: nc }, isCapture: true, isPromotion: nr === promoRow });
    } else if (!target && state.enPassant && state.enPassant.r === nr && state.enPassant.c === nc) {
      moves.push({ to: { r: nr, c: nc }, isCapture: true, isEnPassant: true });
    }
  }
  return moves;
}

function pseudoMovesForSquare(state, r, c) {
  const board = state.board;
  const piece = board[r][c];
  if (!piece) return [];

  if (piece.type === 'p') return pawnMoves(state, r, c, piece);

  const moves = [];
  const attacks = pieceAttacks(board, r, c, piece, state.buffsEnabled);
  for (const a of attacks) {
    const target = board[a.r][a.c];
    if (target && target.color === piece.color) continue;
    moves.push({ to: a, isCapture: !!target });
  }

  if (piece.type === 'k') {
    const color = piece.color;
    const row = color === 'w' ? 0 : 7;
    const enemy = opposite(color);

    if (r === row && c === 4) {
      const rights = state.castlingRights;
      const canK = color === 'w' ? rights.wK : rights.bK;
      const canQ = color === 'w' ? rights.wQ : rights.bQ;
      const rook = (rc) => board[row][rc] && board[row][rc].type === 'r' && board[row][rc].color === color;

      if (
        canK && !board[row][5] && !board[row][6] && rook(7) &&
        !isSquareAttacked(board, row, 4, enemy, state.buffsEnabled) &&
        !isSquareAttacked(board, row, 5, enemy, state.buffsEnabled) &&
        !isSquareAttacked(board, row, 6, enemy, state.buffsEnabled)
      ) {
        moves.push({ to: { r: row, c: 6 }, isCastle: 'K' });
      }
      if (
        canQ && !board[row][1] && !board[row][2] && !board[row][3] && rook(0) &&
        !isSquareAttacked(board, row, 4, enemy, state.buffsEnabled) &&
        !isSquareAttacked(board, row, 3, enemy, state.buffsEnabled) &&
        !isSquareAttacked(board, row, 2, enemy, state.buffsEnabled)
      ) {
        moves.push({ to: { r: row, c: 2 }, isCastle: 'Q' });
      }
    }

    const buffed = piece.buffed && state.buffsEnabled;
    if (buffed && !state.kingBigMoveUsed[color]) {
      const bigDeltas = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [2, -2], [-2, 2], [-2, -2]];
      for (const [dr, dc] of bigDeltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const midR = r + dr / 2;
        const midC = c + dc / 2;
        if (board[midR][midC]) continue; // path must be clear
        const target = board[nr][nc];
        if (target && target.color === piece.color) continue;
        moves.push({ to: { r: nr, c: nc }, isCapture: !!target, isKingBig: true });
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------------------------
// Applying a move (mutates a clone, does not validate legality — callers
// must only pass moves that came from getLegalMovesForSquare / getAllLegalMoves).
// ---------------------------------------------------------------------------

export function applyMoveUnchecked(state, move) {
  const next = cloneState(state);
  const { from, to } = move;
  const piece = next.board[from.r][from.c];
  const color = piece.color;
  let captured = next.board[to.r][to.c] || null;

  if (move.isEnPassant) {
    const capR = color === 'w' ? to.r - 1 : to.r + 1;
    captured = next.board[capR][to.c];
    next.board[capR][to.c] = null;
  }

  next.board[from.r][from.c] = null;
  next.board[to.r][to.c] = piece;

  if (move.isCastle === 'K') {
    const row = from.r;
    next.board[row][5] = next.board[row][7];
    next.board[row][7] = null;
  } else if (move.isCastle === 'Q') {
    const row = from.r;
    next.board[row][3] = next.board[row][0];
    next.board[row][0] = null;
  }

  if (move.isPromotion) {
    piece.type = move.promotionChoice || 'q';
  }

  if (captured && next.buffsEnabled) {
    piece.buffed = true;
  }

  if (move.isKingBig) {
    next.kingBigMoveUsed[color] = true;
  }

  if (piece.type === 'k') {
    if (color === 'w') { next.castlingRights.wK = false; next.castlingRights.wQ = false; }
    else { next.castlingRights.bK = false; next.castlingRights.bQ = false; }
  }
  if (from.r === 0 && from.c === 0) next.castlingRights.wQ = false;
  if (from.r === 0 && from.c === 7) next.castlingRights.wK = false;
  if (from.r === 7 && from.c === 0) next.castlingRights.bQ = false;
  if (from.r === 7 && from.c === 7) next.castlingRights.bK = false;
  if (to.r === 0 && to.c === 0) next.castlingRights.wQ = false;
  if (to.r === 0 && to.c === 7) next.castlingRights.wK = false;
  if (to.r === 7 && to.c === 0) next.castlingRights.bQ = false;
  if (to.r === 7 && to.c === 7) next.castlingRights.bK = false;

  next.enPassant = move.isDoubleStep ? { r: (from.r + to.r) / 2, c: from.c } : null;

  next.turn = opposite(color);
  next.moveLog.push({ from, to, piece: { type: piece.type, color }, capture: !!captured });

  return next;
}

export function getLegalMovesForSquare(state, r, c) {
  const piece = state.board[r][c];
  if (!piece || piece.color !== state.turn) return [];
  const pseudo = pseudoMovesForSquare(state, r, c);
  const legal = [];
  for (const m of pseudo) {
    const move = { from: { r, c }, to: m.to, ...m };
    const testMove = move.isPromotion ? { ...move, promotionChoice: 'q' } : move;
    const next = applyMoveUnchecked(state, testMove);
    if (!isInCheck(next.board, piece.color, state.buffsEnabled)) {
      legal.push(move);
    }
  }
  return legal;
}

export function getAllLegalMoves(state) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === state.turn) {
        moves.push(...getLegalMovesForSquare(state, r, c));
      }
    }
  }
  return moves;
}

export function applyMove(state, from, to, promotionChoice) {
  const legalMoves = getLegalMovesForSquare(state, from.r, from.c);
  const match = legalMoves.find((m) => m.to.r === to.r && m.to.c === to.c);
  if (!match) return null;
  const move = match.isPromotion ? { ...match, promotionChoice: promotionChoice || 'q' } : match;
  return applyMoveUnchecked(state, move);
}

export function getGameStatus(state) {
  const inCheck = isInCheck(state.board, state.turn, state.buffsEnabled);
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    return { inCheck, checkmate: inCheck, stalemate: !inCheck, turn: state.turn, winner: inCheck ? opposite(state.turn) : null };
  }
  return { inCheck, checkmate: false, stalemate: false, turn: state.turn, winner: null };
}

// Counts leaf positions at a given depth from `state`. Used by
// test/rules.perft.test.js to verify the standard-chess baseline
// (buffsEnabled: false) against the class's required move counts.
export function perft(state, depth) {
  if (depth === 0) return 1;
  const moves = getAllLegalMoves(state);
  if (depth === 1) return moves.length;
  let count = 0;
  for (const m of moves) {
    const move = m.isPromotion ? { ...m, promotionChoice: 'q' } : m;
    const next = applyMoveUnchecked(state, move);
    count += perft(next, depth - 1);
  }
  return count;
}
