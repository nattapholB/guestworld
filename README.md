# GuestWorld

A cosmic puzzle collection built with React, TypeScript, Zustand, and React Three Fiber.

- **Orbit Word:** five-letter words, five guesses, Classic and Timer modes.
- **Sudoku:** 9×9 boards in Novice, Beginner, and Expert; notes, undo, erase, optional hints, and elapsed time. No mistake limit or saved progress.

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

`npm test` runs the rule, content, lifecycle, timer, and Word regression checks using Node's test runner through tsx.

For the full browser walkthrough, install Python Playwright and Chromium, start Vite on port 5173, then run:

```sh
python3 tests/browser_smoke.py
```

The test exercises both games and captures desktop/mobile screenshots in `/tmp/guestworld-qa`. It uses the loaded dev module only to inspect state and construct a near-complete test fixture; no Sudoku debug control is shipped.

## Puzzle content

Sixty puzzles are bundled locally: 20 per difficulty. To reproduce the bank:

```sh
npm run puzzles:generate
npm test
```

The generator is deterministic. A bounded backtracking solver verifies uniqueness; a separate logical grader verifies difficulty without looking at the solution. Tests also check every recorded deduction against each puzzle's unique solution.

## Project map

- `src/app/`: game selection and navigation state.
- `src/game/`: existing Orbit Word rules, state, words, and shared theme.
- `src/games/sudoku/`: Sudoku content, rules, state, and UI.
- `src/components/`: shared presentation and the 3D Word scene.
- `src/assets/`: web-ready covers and the local Word-board font.
- `docs/plans/0001-game-selection-sudoku.md`: decisions and implementation record.
- `docs/design/handoff.md`: UI handoff.
- `CONTEXT.md`: product language and behavior.

The supplied cover originals remain in `output/imagegen/`; the app imports optimized WebP copies. Orbitron and Space Grotesk come from Fontsource packages. Roboto's Latin WOFF is vendored from Fontsource Roboto 5.3.0. Font licenses ship under `public/licenses/`.
