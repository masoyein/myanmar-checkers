/** Pure Myanmar/Moroccan checkers rules and game-state transitions. */
export const BOARD_SIZE = 8;
export const WHITE = "white";
export const BLACK = "black";
export const MAN = "man";
export const KING = "king";

const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const keyOf = ({ row, col }) => `${row},${col}`;
const inside = (row, col) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
const forward = color => color === WHITE ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
const cloneBoard = board => board.map(row => row.map(piece => piece ? { ...piece } : null));

export function isDarkSquare(row, col) { return (row + col) % 2 === 0; }

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    if (!isDarkSquare(row, col)) continue;
    if (row < 3) board[row][col] = { color: BLACK, type: MAN };
    if (row > 4) board[row][col] = { color: WHITE, type: MAN };
  }
  return board;
}

export function positionKey(board, turn) {
  const pieces = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const p = board[row][col];
    if (p) pieces.push(`${row}${col}${p.color === WHITE ? "w" : "b"}${p.type === KING ? "k" : "m"}`);
  }
  return `${turn}|${pieces.join(";")}`;
}

export function createGameState(board = createInitialBoard(), turn = WHITE) {
  const key = positionKey(board, turn);
  return { board: cloneBoard(board), turn, quietKingPlies: 0, repetitions: { [key]: 1 }, lastMove: null };
}

function shouldPromote(piece, row) {
  return piece.type === MAN && (piece.color === WHITE ? row === 0 : row === BOARD_SIZE - 1);
}

function captureSequences(board, from, piece) {
  const results = [];
  function visit(state, row, col, path, captures, captured) {
    let found = false;
    const dirs = piece.type === MAN ? forward(piece.color) : DIAGONALS;
    for (const [dr, dc] of dirs) {
      if (piece.type === MAN) {
        const er = row + dr, ec = col + dc, lr = row + 2 * dr, lc = col + 2 * dc;
        if (!inside(er, ec) || !inside(lr, lc) || state[lr][lc] || captured.has(`${er},${ec}`)) continue;
        const enemy = state[er][ec];
        if (!enemy || enemy.color === piece.color) continue;
        found = true;
        const next = cloneBoard(state); next[row][col] = null; next[lr][lc] = { ...piece };
        const nextPath = [...path, { row: lr, col: lc }], nextCaptures = [...captures, { row: er, col: ec }];
        if (shouldPromote(piece, lr)) results.push({ from, path: nextPath, captures: nextCaptures });
        else visit(next, lr, lc, nextPath, nextCaptures, new Set([...captured, `${er},${ec}`]));
      } else {
        let r = row + dr, c = col + dc, enemy = null;
        while (inside(r, c)) {
          const target = state[r][c];
          if (!target) { r += dr; c += dc; continue; }
          if (target.color === piece.color || captured.has(`${r},${c}`) || enemy) break;
          enemy = { row: r, col: c }; r += dr; c += dc;
          while (inside(r, c) && !state[r][c]) {
            found = true;
            const next = cloneBoard(state); next[row][col] = null; next[r][c] = { ...piece };
            visit(next, r, c, [...path, { row: r, col: c }], [...captures, enemy], new Set([...captured, keyOf(enemy)]));
            r += dr; c += dc;
          }
          break;
        }
      }
    }
    if (!found && captures.length) results.push({ from, path, captures });
  }
  visit(cloneBoard(board), from.row, from.col, [], [], new Set());
  return results;
}

function allCaptures(board, color) {
  const sequences = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const piece = board[row][col];
    if (piece?.color === color) sequences.push(...captureSequences(board, { row, col }, piece));
  }
  if (!sequences.length) return [];
  const maximum = Math.max(...sequences.map(move => move.captures.length));
  return sequences.filter(move => move.captures.length === maximum);
}

export function getLegalMoves(board, color) {
  const captures = allCaptures(board, color);
  if (captures.length) return captures;
  const moves = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const piece = board[row][col]; if (piece?.color !== color) continue;
    if (piece.type === MAN) {
      for (const [dr, dc] of forward(color)) if (inside(row + dr, col + dc) && !board[row + dr][col + dc])
        moves.push({ from: { row, col }, to: { row: row + dr, col: col + dc }, path: [], captures: [] });
    } else for (const [dr, dc] of DIAGONALS) {
      let r = row + dr, c = col + dc;
      while (inside(r, c) && !board[r][c]) { moves.push({ from: { row, col }, to: { row: r, col: c }, path: [], captures: [] }); r += dr; c += dc; }
    }
  }
  return moves;
}

function sameMove(a, b) {
  return a.from.row === b.from.row && a.from.col === b.from.col &&
    JSON.stringify(a.path) === JSON.stringify(b.path) && JSON.stringify(a.to ?? null) === JSON.stringify(b.to ?? null);
}

export function applyMove(state, requestedMove) {
  const move = getLegalMoves(state.board, state.turn).find(candidate => sameMove(candidate, requestedMove));
  if (!move) throw new Error("Illegal move");
  const board = cloneBoard(state.board), piece = board[move.from.row][move.from.col];
  board[move.from.row][move.from.col] = null;
  const destination = move.path.length ? move.path.at(-1) : move.to;
  for (const captured of move.captures) board[captured.row][captured.col] = null;
  const promoted = shouldPromote(piece, destination.row);
  board[destination.row][destination.col] = { ...piece, ...(promoted ? { type: KING } : {}) };
  const progress = move.captures.length > 0 || piece.type === MAN || promoted;
  const turn = state.turn === WHITE ? BLACK : WHITE;
  const key = positionKey(board, turn);
  const repetitions = { ...state.repetitions, [key]: (state.repetitions[key] ?? 0) + 1 };
  return { board, turn, quietKingPlies: progress ? 0 : state.quietKingPlies + 1, repetitions, lastMove: move };
}

export function getGameStatus(state) {
  if (!getLegalMoves(state.board, state.turn).length) return { result: "win", winner: state.turn === WHITE ? BLACK : WHITE, reason: "no-legal-moves" };
  const count = state.repetitions[positionKey(state.board, state.turn)] ?? 0;
  if (count >= 3) return { result: "draw", reason: "threefold-repetition" };
  if (state.quietKingPlies >= 80) return { result: "draw", reason: "forty-moves-without-progress" };
  return { result: "playing" };
}

export function countPieces(board, color) {
  return board.flat().filter(piece => piece?.color === color).length;
}
