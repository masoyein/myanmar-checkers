import test from "node:test";
import assert from "node:assert/strict";
import { BLACK, KING, MAN, WHITE, applyMove, countPieces, createGameState, createInitialBoard, getGameStatus, getLegalMoves, positionKey } from "../rules.mjs";

const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(null));
const put = (board, row, col, color, type = MAN) => { board[row][col] = { color, type }; };
const from = (move, row, col) => move.from.row === row && move.from.col === col;

test("initial position has twelve men each and mirrored near-left light corners", () => {
  const board = createInitialBoard();
  assert.equal(countPieces(board, WHITE), 12);
  assert.equal(countPieces(board, BLACK), 12);
  assert.equal(board[7][0], null);
  assert.equal(board[7][1].color, WHITE);
});

test("men move and capture forward only", () => {
  const board = emptyBoard(); put(board, 4, 2, WHITE); put(board, 5, 1, BLACK);
  const moves = getLegalMoves(board, WHITE);
  assert.ok(moves.some(m => m.to?.row === 3 && m.to?.col === 1));
  assert.ok(!moves.some(m => m.captures.length));
  board[5][1] = null; put(board, 3, 3, BLACK);
  assert.ok(getLegalMoves(board, WHITE).some(m => m.captures.length === 1));
});

test("capture is compulsory and only globally maximum capture lines are legal", () => {
  const board = emptyBoard(); put(board, 5, 0, WHITE); put(board, 4, 1, BLACK); put(board, 2, 3, BLACK);
  put(board, 7, 6, WHITE); put(board, 6, 5, BLACK);
  const moves = getLegalMoves(board, WHITE);
  assert.ok(moves.length > 0);
  assert.ok(moves.every(m => m.captures.length === 2));
  assert.ok(moves.every(m => from(m, 5, 0)));
});

test("equal capture counts are legal regardless of captured piece type", () => {
  const board = emptyBoard(); put(board, 7, 0, WHITE, KING); put(board, 5, 2, BLACK, KING);
  put(board, 7, 7, WHITE, KING); put(board, 5, 5, BLACK, MAN);
  const moves = getLegalMoves(board, WHITE);
  assert.ok(moves.some(m => from(m, 7, 0)));
  assert.ok(moves.some(m => from(m, 7, 7)));
  assert.ok(moves.every(m => m.captures.length === 1));
});

test("flying kings can capture from a distance and choose landing squares beyond", () => {
  const board = emptyBoard(); put(board, 7, 0, WHITE, KING); put(board, 4, 3, BLACK);
  const moves = getLegalMoves(board, WHITE);
  assert.ok(moves.some(m => m.path.at(-1).row === 3 && m.path.at(-1).col === 4));
  assert.ok(moves.some(m => m.path.at(-1).row === 0 && m.path.at(-1).col === 7));
});

test("promotion during a capture ends the sequence and crowns the man", () => {
  const board = emptyBoard(); put(board, 2, 0, WHITE); put(board, 1, 1, BLACK); put(board, 1, 3, BLACK);
  const move = getLegalMoves(board, WHITE)[0];
  assert.equal(move.captures.length, 1);
  assert.deepEqual(move.path, [{ row: 0, col: 2 }]);
  const next = applyMove(createGameState(board), move);
  assert.deepEqual(next.board[0][2], { color: WHITE, type: KING });
  assert.ok(next.board[1][3]);
});

function play(state, fr, fc, tr, tc) {
  const move = getLegalMoves(state.board, state.turn).find(m => from(m, fr, fc) && m.to?.row === tr && m.to?.col === tc);
  assert.ok(move, `expected move ${fr},${fc} to ${tr},${tc}`);
  return applyMove(state, move);
}

test("three occurrences of the same board and player to move draw", () => {
  let state = createGameState(emptyBoard());
  state.board[7][0] = { color: WHITE, type: KING };
  state.board[0][6] = { color: BLACK, type: KING };
  state = createGameState(state.board);
  for (let i = 0; i < 2; i++) {
    state = play(state, 7, 0, 6, 1); state = play(state, 0, 6, 1, 5);
    state = play(state, 6, 1, 7, 0); state = play(state, 1, 5, 0, 6);
  }
  assert.equal(getGameStatus(state).reason, "threefold-repetition");
});

test("forty moves per side without progress draws after eighty quiet king plies", () => {
  const board = emptyBoard(); put(board, 7, 0, WHITE, KING); put(board, 0, 6, BLACK, KING);
  const base = createGameState(board);
  const state = { ...base, quietKingPlies: 79 };
  const next = play(state, 7, 0, 6, 1);
  assert.equal(next.quietKingPlies, 80);
  assert.equal(getGameStatus(next).reason, "forty-moves-without-progress");
});

test("a man move or capture resets the no-progress counter", () => {
  const board = emptyBoard(); put(board, 5, 0, WHITE); put(board, 0, 6, BLACK, KING);
  const base = createGameState(board);
  const next = play({ ...base, quietKingPlies: 45 }, 5, 0, 4, 1);
  assert.equal(next.quietKingPlies, 0);
  assert.equal(next.repetitions[positionKey(next.board, next.turn)], 1);
});
