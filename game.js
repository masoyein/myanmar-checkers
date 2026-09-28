import {
  BOARD_SIZE, WHITE, BLACK, KING, createGameState, createInitialBoard,
  getLegalMoves, applyMove, getGameStatus, countPieces, isDarkSquare
} from "./rules.mjs";

let game = createGameState();
let selectedSquare = null;
let selectedMoves = [];
let history = [];

function movesForSelection() { return getLegalMoves(game.board, game.turn); }

function endMessage(status) {
  if (status.result === "win") return status.winner === WHITE ? "အဖြူအနိုင်ရပါသည်။" : "အနက်အနိုင်ရပါသည်။";
  if (status.reason === "threefold-repetition") return "Draw by threefold repetition.";
  if (status.reason === "forty-moves-without-progress") return "Draw after 40 moves per side without progress.";
  return "";
}

function render() {
  const boardElement = document.getElementById("board");
  boardElement.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const square = document.createElement("div");
    square.className = `square ${isDarkSquare(row, col) ? "dark-square" : "light-square"}`;
    square.dataset.row = row; square.dataset.col = col;
    if (isDarkSquare(row, col)) {
      const number = document.createElement("span"); number.className = "square-number";
      number.textContent = String((7 - row) * 4 + Math.floor(col / 2) + 1);
      square.appendChild(number);
    }
    if (selectedSquare?.row === row && selectedSquare?.col === col) square.classList.add("selected");
    const destination = selectedMoves.find(move => {
      const end = move.path.length ? move.path.at(-1) : move.to;
      return end?.row === row && end?.col === col;
    });
    if (destination) square.classList.add(destination.captures.length ? "capture-move" : "legal-move");
    const piece = game.board[row][col];
    if (piece) {
      const token = document.createElement("div"); token.className = `piece ${piece.color}`;
      if (piece.type === KING) token.classList.add("king");
      square.appendChild(token);
    }
    square.addEventListener("click", () => handleSquareClick(row, col));
    boardElement.appendChild(square);
  }
  document.getElementById("white-count").textContent = countPieces(game.board, WHITE);
  document.getElementById("black-count").textContent = countPieces(game.board, BLACK);
  document.getElementById("turn-indicator").textContent = game.turn === WHITE ? "အဖြူအလှည့်" : "အနက်အလှည့်";
  document.getElementById("message").textContent = endMessage(getGameStatus(game));
}

function handleSquareClick(row, col) {
  if (getGameStatus(game).result !== "playing") return;
  const chosen = selectedMoves.find(move => {
    const end = move.path.length ? move.path.at(-1) : move.to;
    return end?.row === row && end?.col === col;
  });
  if (chosen) {
    history.push(game);
    game = applyMove(game, chosen);
    selectedSquare = null; selectedMoves = []; render(); return;
  }
  const piece = game.board[row][col];
  if (piece?.color === game.turn) {
    const moves = movesForSelection().filter(move => move.from.row === row && move.from.col === col);
    if (moves.length) { selectedSquare = { row, col }; selectedMoves = moves; render(); return; }
  }
  selectedSquare = null; selectedMoves = []; render();
}

function newGame() {
  game = createGameState(createInitialBoard()); history = [];
  selectedSquare = null; selectedMoves = []; render();
}

document.getElementById("new-game").addEventListener("click", newGame);
document.getElementById("undo").addEventListener("click", () => {
  if (history.length) game = history.pop();
  selectedSquare = null; selectedMoves = []; render();
});
newGame();
