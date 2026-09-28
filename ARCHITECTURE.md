# Myanmar Checkers: findings and next steps

## Current implementation

The original repository was a static browser page with `index.html`, `style.css`, and one `game.js`. The page drew the board and handled selection, undo, moves, promotion, and win detection. It had no build system, rules tests, draw handling, AI, persistence, or position editor.

The original rules code already used an 8×8 board, 12 men per side, a mirrored dark-square setup, forward-only men, flying kings, mandatory captures, and a global maximum-capture filter. It did not break equal capture counts by king value. Two capture details were incorrect: jumped pieces were removed during recursion, making their squares available too early, and capture generation continued past promotion although move execution stopped at the crown. It also had no threefold repetition or 40-moves-per-side no-progress draw.

## Implemented foundation

- `rules.mjs` is a DOM-free rules and state-transition module. The browser UI imports its legal-move, state, and status functions.
- `game.js` now handles rendering and input only. New game and undo remain available in the existing page.
- `tests/rules.test.js` covers initial setup, man movement and capture direction, mandatory maximum capture, equal-count captures without a king tiebreak, flying kings, promotion ending a capture sequence, threefold repetition, and the no-progress draw.
- `package.json` provides `npm test` using Node's built-in test runner; no runtime dependency or bundler is needed.

The 40-move rule is counted as 80 half-moves by kings without a capture or man move. A man move, capture, or promotion resets the counter. This treats progress as a capture or advancement of a man and is encoded in tests.

## Recommended architecture for the requested features

Keep the web UI and a separately testable rules API. TypeScript with Vite is a practical next step once the UI grows beyond this small static page. Keep the rules API independent of the rendering framework so it can serve the browser, puzzles, saved games, and AI consistently.

For difficult analysis, move search into a Web Worker so it cannot freeze the board. The current rules module can define the interface. A Rust search engine compiled to WebAssembly is a good later choice if profiling shows JavaScript search is too slow; it should consume and return plain position/move data through a small adapter. Keep a JavaScript fallback for browsers where the WASM artifact is unavailable.

Generate puzzles from positions reached by legal self-play or search, not arbitrary piece layouts. Score each candidate with search depth, solution length, and number of acceptable moves, then verify every stored puzzle with the same rules engine. An AI language model can write hints or explanations around validated engine output; it should not decide legal moves.

For personalization, record a user's played positions and outcomes locally first, with an explicit option before syncing. Summarize recurring motifs and missed tactics, then choose validated puzzles that target those patterns and raise difficulty as the player improves. Store a compact position key, move, outcome, puzzle motif, and timestamps rather than sending complete game histories by default.

Add a position editor as a separate UI mode backed by `createGameState(board, sideToMove)`. It can permit arbitrary placement, kings, and side to move, while showing warnings for nonstandard or already-finished positions. Practice play should still use the shared legal-move engine.

## Suggested implementation order

1. Add rule edge-case coverage and keep the rules API stable.
2. Add position-editor controls and import/export for board positions.
3. Add a worker-based search opponent and puzzle verifier.
4. Add local player history and adaptive puzzle selection, with optional account sync later.
5. Profile search; introduce Rust/WASM only if the measured browser search needs it.
