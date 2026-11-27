# GuestWorld

A cosmic puzzle collection built with React, TypeScript, Zustand, and React Three Fiber.

- **Orbit Word:** five-letter words, five guesses, Classic and Timer modes.
- **Sudoku:** 9×9 boards in Novice, Beginner, and Expert; notes, undo, erase, optional hints, and elapsed time. No mistake limit; local auto-save and resume.
- **Crossword:** Mini (5×5), Classic (7×7), and Grand (9×9) grids with 4–7 letter words, instant EN / ไทย clue toggle, Check / Erase / Hint / Reveal Word tools, and local auto-save.
- **Offline PWA (v0.7.0):** installable via `Install App` (or Safari's Share → Add to Home Screen on iPhone/iPad). After the first visit all three games, including the 3D Orbit Word scene, play offline.

## Development

Use Node.js 22.18+ (or Node.js 24).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The production build goes to `dist/`. Relative asset URLs support the GitHub Pages repository subpath. CI tests, builds, and deploys pushes to `main`.

## Validation

`npm test` runs the Sudoku/Word (`tests/sudoku.test.ts`), Crossword/storage (`tests/crossword.test.ts`), PWA (`tests/pwa.test.ts`), and 3D camera framing (`tests/camera.test.ts`) checks using Node's test runner through tsx (33 tests).

For the Orbit Word and Sudoku browser walkthrough, install Python Playwright and Chromium, start Vite on port 5173, then run:

```sh
python3 tests/browser_smoke.py
```

The smoke script exercises Orbit Word and Sudoku and captures desktop/mobile screenshots in `/tmp/guestworld-qa`. It uses the loaded dev module only to inspect state and construct a near-complete test fixture; no Sudoku debug control is shipped.

## Puzzle content

Sixty Sudoku puzzles are bundled locally: 20 per difficulty. To reproduce the bank:

```sh
npm run puzzles:generate
npm test
```

The Sudoku generator is deterministic. A bounded backtracking solver verifies uniqueness; a separate logical grader verifies difficulty without looking at the solution. Tests also check every recorded deduction against each puzzle's unique solution.

Crossword puzzles are generated live in the browser across 56 distinct validated grid patterns (16 Mini 5×5, 20 Classic 7×7, 20 Grand 9×9) using a curated offline lexicon of 2,348 familiar 4–7 letter words with both English (`EN`) and Thai (`ไทย`) clues.

## Project map

- `src/app/`: game selection, navigation state, shared versioned `localStorage` persistence (`storage.ts`), and PWA install/online state (`pwa.ts`).
- `src/game/`: existing Orbit Word rules, state, words, and shared theme.
- `src/games/sudoku/`: Sudoku content, rules, state, and UI.
- `src/games/crossword/`: Crossword bilingual lexicon, 56 grid patterns, CSP generator, rules, persistent store, and UI.
- `src/components/`: shared presentation and the 3D Word scene.
- `src/assets/`: web-ready covers and fonts.
- `docs/plans/0001-game-selection-sudoku.md`: decisions and implementation record.
- `docs/releases/v0.7.1.md`: v0.7.1 release notes.
- `docs/releases/v0.7.0.md`: v0.7.0 release notes.
- `docs/releases/v0.6.0.md`: v0.6.0 release notes.
- `docs/releases/v0.5.0.md`: v0.5.0 release notes.
- `docs/design/handoff.md`: UI handoff.
- `CONTEXT.md`: product language and behavior.

The supplied cover originals remain in `output/imagegen/`; the app imports optimized cover copies (`src/assets/games/`). Orbitron, Space Grotesk, and Noto Sans Thai come from Fontsource packages. Roboto's Latin WOFF is vendored from Fontsource Roboto 5.3.0. Font licenses ship under `public/licenses/`. PWA and app icons (`public/icons/`, `public/apple-touch-icon.png`, `public/favicon.ico`) are served from `public/`.
