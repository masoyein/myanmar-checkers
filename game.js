/*
==========================================================
MYANMAR CHECKERS
Version 1.0
==========================================================
*/

"use strict";

const BOARD_SIZE = 8;
const WHITE = "white";
const BLACK = "black";
const MAN = "man";
const KING = "king";

let board = [];
let currentPlayer = WHITE;
let selectedSquare = null;
let legalMoves = [];
let history = [];
let gameOver = false;

const DIAGONALS = [
    [-1, -1],
    [-1,  1],
    [ 1, -1],
    [ 1,  1]
];

function createInitialBoard() {
    const newBoard = Array.from(
        { length: BOARD_SIZE },
        () => Array(BOARD_SIZE).fill(null)
    );

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (isDarkSquare(row, col)) {
                newBoard[row][col] = { color: BLACK, type: MAN };
            }
        }
    }

    for (let row = BOARD_SIZE - 3; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (isDarkSquare(row, col)) {
                newBoard[row][col] = { color: WHITE, type: MAN };
            }
        }
    }

    return newBoard;
}

function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE &&
           col >= 0 && col < BOARD_SIZE;
}

function isDarkSquare(row, col) {
    return (row + col) % 2 === 0;
}

function cloneBoard(source) {
    return source.map(row =>
        row.map(piece => piece ? { ...piece } : null)
    );
}

function forwardDirections(color) {
    return color === WHITE
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];
}

function getCaptureSequences(boardState, row, col, piece) {
    const results = [];

    findCapturesRecursive(
        cloneBoard(boardState),
        row,
        col,
        piece,
        [],
        [],
        results
    );

    return results;
}

function findCapturesRecursive(
    state, row, col, piece, path, captures, results
) {
    let foundCapture = false;

    if (piece.type === MAN) {
        for (const [dr, dc] of forwardDirections(piece.color)) {
            const enemyRow = row + dr;
            const enemyCol = col + dc;
            const landingRow = row + dr * 2;
            const landingCol = col + dc * 2;

            if (!isInside(enemyRow, enemyCol) ||
                !isInside(landingRow, landingCol)) {
                continue;
            }

            const enemy = state[enemyRow][enemyCol];
            const landing = state[landingRow][landingCol];

            if (enemy &&
                enemy.color !== piece.color &&
                landing === null) {

                foundCapture = true;

                const nextState = cloneBoard(state);
                nextState[row][col] = null;
                nextState[enemyRow][enemyCol] = null;
                nextState[landingRow][landingCol] = { ...piece };

                findCapturesRecursive(
                    nextState,
                    landingRow,
                    landingCol,
                    piece,
                    [...path, { row: landingRow, col: landingCol }],
                    [...captures, { row: enemyRow, col: enemyCol }],
                    results
                );
            }
        }
    } else {
        for (const [dr, dc] of DIAGONALS) {
            let r = row + dr;
            let c = col + dc;
            let enemyFound = null;

            while (isInside(r, c)) {
                const target = state[r][c];

                if (target === null) {
                    if (!enemyFound) {
                        r += dr;
                        c += dc;
                        continue;
                    }

                    foundCapture = true;

                    const nextState = cloneBoard(state);
                    nextState[row][col] = null;
                    nextState[enemyFound.row][enemyFound.col] = null;
                    nextState[r][c] = { ...piece };

                    findCapturesRecursive(
                        nextState,
                        r,
                        c,
                        piece,
                        [...path, { row: r, col: c }],
                        [...captures, {
                            row: enemyFound.row,
                            col: enemyFound.col
                        }],
                        results
                    );

                    r += dr;
                    c += dc;
                    continue;
                }

                if (target.color === piece.color) break;
                if (enemyFound) break;

                enemyFound = { row: r, col: c };
                r += dr;
                c += dc;
            }
        }
    }

    if (!foundCapture && captures.length > 0) {
        results.push({ path, captures });
    }
}

function getAllCaptureSequences(boardState, color) {
    const sequences = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = boardState[row][col];

            if (piece && piece.color === color) {
                const captures = getCaptureSequences(
                    boardState, row, col, piece
                );

                for (const sequence of captures) {
                    sequences.push({
                        from: { row, col },
                        piece,
                        path: sequence.path,
                        captures: sequence.captures
                    });
                }
            }
        }
    }

    return sequences;
}

function getMaximumCaptures(boardState, color) {
    const allCaptures = getAllCaptureSequences(boardState, color);

    if (allCaptures.length === 0) return [];

    const maximum = Math.max(
        ...allCaptures.map(move => move.captures.length)
    );

    return allCaptures.filter(
        move => move.captures.length === maximum
    );
}

function getNormalMoves(boardState, row, col, piece) {
    const moves = [];

    if (piece.type === MAN) {
        for (const [dr, dc] of forwardDirections(piece.color)) {
            const r = row + dr;
            const c = col + dc;

            if (isInside(r, c) && boardState[r][c] === null) {
                moves.push({
                    from: { row, col },
                    to: { row: r, col: c },
                    captures: []
                });
            }
        }
    } else {
        for (const [dr, dc] of DIAGONALS) {
            let r = row + dr;
            let c = col + dc;

            while (isInside(r, c) && boardState[r][c] === null) {
                moves.push({
                    from: { row, col },
                    to: { row: r, col: c },
                    captures: []
                });

                r += dr;
                c += dc;
            }
        }
    }

    return moves;
}

function getLegalMoves(boardState, color) {
    const captures = getMaximumCaptures(boardState, color);

    if (captures.length > 0) return captures;

    const moves = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = boardState[row][col];

            if (piece && piece.color === color) {
                moves.push(
                    ...getNormalMoves(
                        boardState, row, col, piece
                    )
                );
            }
        }
    }

    return moves;
}

function shouldPromote(piece, row) {
    if (piece.type !== MAN) return false;
    return piece.color === WHITE
        ? row === 0
        : row === BOARD_SIZE - 1;
}

function executeMove(move) {
    const from = move.from;
    const piece = board[from.row][from.col];

    if (!piece) return;

    history.push({
        board: cloneBoard(board),
        player: currentPlayer
    });

    if (move.captures.length === 0) {
        board[from.row][from.col] = null;

        const to = move.to;
        board[to.row][to.col] = { ...piece };

        if (shouldPromote(board[to.row][to.col], to.row)) {
            board[to.row][to.col].type = KING;
        }

        finishTurn();
        return;
    }

    performCaptureSequence(move);
}

function performCaptureSequence(move) {
    const from = move.from;
    let piece = board[from.row][from.col];

    board[from.row][from.col] = null;

    let currentRow = from.row;
    let currentCol = from.col;

    for (let i = 0; i < move.captures.length; i++) {
        const capture = move.captures[i];

        board[capture.row][capture.col] = null;

        const landing = move.path[i];

        currentRow = landing.row;
        currentCol = landing.col;

        if (piece.type === MAN &&
            shouldPromote(piece, currentRow)) {

            piece = { ...piece, type: KING };

            board[currentRow][currentCol] = piece;

            finishTurn();
            return;
        }
    }

    board[currentRow][currentCol] = piece;
    finishTurn();
}

function finishTurn() {
    selectedSquare = null;
    legalMoves = [];

    currentPlayer =
        currentPlayer === WHITE ? BLACK : WHITE;

    checkGameState();
    render();
}

function checkGameState() {
    const moves = getLegalMoves(board, currentPlayer);

    if (moves.length === 0) {
        gameOver = true;

        const winner =
            currentPlayer === WHITE ? BLACK : WHITE;

        showMessage(
            winner === WHITE
                ? "အဖြူအနိုင်ရပါသည်။"
                : "အနက်အနိုင်ရပါသည်။"
        );

        return;
    }

    gameOver = false;
}

function undoMove() {
    if (history.length === 0) return;

    const previous = history.pop();

    board = cloneBoard(previous.board);
    currentPlayer = previous.player;
    gameOver = false;
    selectedSquare = null;
    legalMoves = [];

    showMessage("");
    render();
}

function countPieces(color) {
    let count = 0;

    for (const row of board) {
        for (const piece of row) {
            if (piece && piece.color === color) count++;
        }
    }

    return count;
}

function getSquareNumber(row, col) {
    // Number playable squares from the bottom-left side, 1 → 32.
    let number = 0;

    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (isDarkSquare(r, c)) {
                number++;

                if (r === row && c === col) {
                    return number;
                }
            }
        }
    }

    return "";
}

function render() {
    const boardElement = document.getElementById("board");
    boardElement.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const square = document.createElement("div");

            square.className =
                "square " +
                (isDarkSquare(row, col)
                    ? "dark-square"
                    : "light-square");

            square.dataset.row = row;
            square.dataset.col = col;

            // Myanmar Checkers board numbering: 1–32 on playable dark squares.
            if (isDarkSquare(row, col)) {
                const squareNumber = document.createElement("span");
                squareNumber.className = "square-number";
                squareNumber.textContent = getSquareNumber(row, col);
                square.appendChild(squareNumber);
            }

            if (selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col) {
                square.classList.add("selected");
            }

            const destination = legalMoves.find(move => {
                if (!selectedSquare ||
                    move.from.row !== selectedSquare.row ||
                    move.from.col !== selectedSquare.col) {
                    return false;
                }

                const last =
                    move.path.length > 0
                        ? move.path[move.path.length - 1]
                        : move.to;

                return last.row === row && last.col === col;
            });

            if (destination) {
                square.classList.add(
                    destination.captures.length > 0
                        ? "capture-move"
                        : "legal-move"
                );
            }

            const piece = board[row][col];

            if (piece) {
                const pieceElement = document.createElement("div");
                pieceElement.className = "piece " + piece.color;

                if (piece.type === KING) {
                    pieceElement.classList.add("king");
                }

                square.appendChild(pieceElement);
            }

            square.addEventListener(
                "click",
                () => handleSquareClick(row, col)
            );

            boardElement.appendChild(square);
        }
    }

    updateInterface();
}

function handleSquareClick(row, col) {
    if (gameOver) return;

    const piece = board[row][col];

    if (selectedSquare) {
        const move = legalMoves.find(candidate => {
            if (candidate.from.row !== selectedSquare.row ||
                candidate.from.col !== selectedSquare.col) {
                return false;
            }

            const destination =
                candidate.path.length > 0
                    ? candidate.path[candidate.path.length - 1]
                    : candidate.to;

            return destination.row === row &&
                   destination.col === col;
        });

        if (move) {
            executeMove(move);
            return;
        }
    }

    if (piece && piece.color === currentPlayer) {
        const allMoves = getLegalMoves(board, currentPlayer);

        const pieceMoves = allMoves.filter(
            move =>
                move.from.row === row &&
                move.from.col === col
        );

        if (pieceMoves.length > 0) {
            selectedSquare = { row, col };
            legalMoves = pieceMoves;
            showMessage("");
            render();
            return;
        }
    }

    selectedSquare = null;
    legalMoves = [];
    render();
}

function updateInterface() {
    document.getElementById("white-count").textContent =
        countPieces(WHITE);

    document.getElementById("black-count").textContent =
        countPieces(BLACK);

    document.getElementById("turn-indicator").textContent =
        currentPlayer === WHITE
            ? "အဖြူအလှည့်"
            : "အနက်အလှည့်";
}

function showMessage(message) {
    document.getElementById("message").textContent = message;
}

function newGame() {
    board = createInitialBoard();
    currentPlayer = WHITE;
    selectedSquare = null;
    legalMoves = [];
    history = [];
    gameOver = false;

    showMessage("");
    render();
}

document.getElementById("new-game").addEventListener(
    "click",
    newGame
);

document.getElementById("undo").addEventListener(
    "click",
    undoMove
);

newGame();
