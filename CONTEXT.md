# GuestWorld — Context

## Overview
A browser-based puzzle project with a cosmic visual theme. GuestWorld contains Orbit Word, Sudoku, and Crossword behind an illustrated game-selection landing page. Version v0.4.0 added the game hub and Sudoku; version v0.5.0 added Crossword, offline bilingual (`EN / ไทย`) clues, and shared `localStorage` persistence; version v0.6.0 adds local auto-save and resume for Sudoku using the shared persistence helper. Figma prototype creation was skipped in favor of reusing the existing UI.

## Glossary
- **Feedback**: Per-letter result shown after each guess — Green (right letter, right position), Yellow (right letter, wrong position), Gray (letter not in the word). Applied per letter, not per word.
- **Classic mode**: Play with no timer — 5 guesses to find the word, at your own pace.
- **Timer mode**: Same 5-guess rules as Classic, but a clock runs in the background and faster solves earn a higher score. The timer never ends the game early or costs guesses — it's a scoring modifier only.

## Decisions
These decisions describe the Orbit Word experience. The game-selection and Sudoku section below defines the new hub and second game; game-specific rules such as five-letter words and Timer mode apply only to Orbit Word.

- **Platform**: Web app (browser-based), not a native/desktop/mobile app. Rationale: word games are share-friendly via URL; a 3D scene is achievable with a web 3D library without game-engine/app-store overhead.
- **Stack**: React + React Three Fiber (R3F) for the 3D scene, with drei/postprocessing for visual effects. Rationale: most mature ecosystem for combining declarative game state with 3D rendering and polish (glow, particles, tile-flip animations).
- **Word selection**: A new random word is chosen from the dictionary every time a game starts (not a shared daily word). Unlimited replay.
- **Game modes**: Two modes — Classic (no timer) and Timer (score bonus for speed, doesn't end the game or cost guesses).
- **Guess validation**: Guesses must be real words, checked against a ~12,600-word dictionary of 5-letter English words (bundled from the MIT-licensed `an-array-of-english-words` package). Secrets are picked from a separate curated list of ~400 common words. A rejected guess (too short, or not a word) shakes the row and doesn't consume a guess.
- **Gray letters stay usable**: Letters already marked Gray (not in the word) can be typed again in later guesses. There is no "hard mode" that forces players to reuse revealed hints.
- **Word list source**: Bundled static word lists (curated answers + the dictionary text file), picked client-side with `Math.random()`. No backend, no API, no network dependency for gameplay.
- **Input method**: On-screen 3D keyboard, rendered as part of the 3D scene, with letter-state coloring (gray/yellow/green) and 3D key-press animation. Physical keyboard input also supported as passthrough.
- **Tile representation**: Each letter is a 3D cube that flips on submit (rotation on X-axis) to reveal the result color on a new face, with real lighting/shadow/material shine (not a flat CSS flip). Preserves Wordle's iconic flip motion while delivering the 3D upgrade.
- **Visual theme**: Cosmic/Space — starfield/nebula background, cubes floating in darkness with soft ambient lighting. Calm-but-epic mood rather than aggressive neon.
- **Camera**: Fixed camera facing the grid, with subtle parallax (responds to mouse/device tilt) for a sense of depth. No free orbit during active play, so letters stay readable. During the win/lose sequence the camera sways along a front-facing arc (about ±30°) instead of orbiting freely: a full orbit was tried and showed the backs of the cubes, where no letters are drawn.
- **Win/lose sequence**: Win = particle burst/fireworks around the solved cubes + slow camera sway + celebration sound. Lose = the correct answer's letters rise and arrange themselves in the scene, lighting shifts to a somber tone. Both end with a stats overlay (guess count, and elapsed time in Timer mode) that also shows the answer's **Word meaning**: part of speech plus a one-line definition, bundled offline for every word in the answers list.
- **Persistence**: No stats, accounts, or backend. Stats overlay only reflects the game just played and resets on next round/reload. The one exception is the "Show before each game" How-to-play toggle, saved per browser in localStorage (falls back to session-only if storage is unavailable).
- **Device support**: Desktop-first. Layout is responsive enough to be playable on mobile, but visual/performance polish (postprocessing, particle density, 3D keyboard sizing) targets desktop; mobile optimization is a later concern, not a launch requirement.
- **Audio**: Short SFX only (key press, cube flip, invalid-guess error, win/lose celebration). No looping background music, so no autoplay-policy/mute-UI complexity.
- **Timer mode scoring**: Combines accuracy and speed — a base score per guess slot saved (fewer guesses used = higher base) plus a speed bonus that decays with elapsed time. Rewards both solving in fewer guesses and solving fast, not just raw speed.
- **Screen flow**: Separate landing/menu screen (game title + Classic/Timer mode selection) shown in the 3D scene before entering the play grid. Mode is chosen up front, not toggled mid-game.
- **How to play**: Not on the landing page. Shown as a modal after a mode is picked, over the waiting board, with a "Show before each game" toggle (on by default). Play Again skips it. Reopenable mid-game from the HUD. In Timer mode the clock starts only when the pre-game modal is closed, so reading never costs score.
- **Versioning**: Semantic versioning, with `package.json` `version` as the single source of truth. The build injects it and the landing page shows it (e.g. `v0.2.0`). Every shipped change bumps it (PATCH for fixes, MINOR for features), gets a `vX.Y.Z` git tag, and a GitHub Release with notes.
- **Deployment**: GitHub Pages at https://nattapholb.github.io/guestworld/ (public repo `nattapholB/guestworld`). A GitHub Actions workflow builds and deploys on every push to `main`.
- **Accessibility**: Color-only feedback (green/yellow/gray) for v1, no colorblind mode/pattern fallback. Deferred as a future enhancement, not a launch requirement — this is a personal/demo project, not a compliance-driven product.
- **Replay flow**: "Play Again" after win/lose immediately starts a new round in the same mode with a freshly randomized word — no forced return to the menu. A secondary link/button lets the player go back to the menu to switch modes if they want.
- **Language scope**: English only, 5-letter words. No Thai or multi-language support in this version.


## Game selection and Sudoku

### Language

**GuestWorld**: The puzzle collection containing Orbit Word, Sudoku, and Crossword.

**Game selection**: The GuestWorld landing screen where a player chooses Orbit Word, Sudoku, or Crossword.

**Orbit Word**: The existing five-letter word-guessing game, with Classic and Timer modes.

**Sudoku**: A number-placement puzzle on a 9×9 board, divided into nine 3×3 boxes, where every row, column, and box contains the digits 1–9 once.

**Crossword**: A word-grid puzzle in Mini (5×5), Classic (7×7), and Grand (9×9) sizes with 4–7 letter English answers and toggleable EN / ไทย clues.

**Conflict**: A repeated digit within a Sudoku row, column, or 3×3 box.

**Notes**: Player-entered candidate digits within an editable Sudoku cell.

**Hint**: Optional assistance that reveals the solution digit for the selected editable Sudoku cell and increments the round’s hint count.

**Difficulty**: The reasoning challenge of a Sudoku puzzle, labeled Novice, Beginner, or Expert, with the same rules and optional tools at every level.
_Avoid_: Mode, which currently describes Orbit Word's Classic and Timer choices.

### Relationships

- **Game selection** offers three **Games**: Orbit Word, Sudoku, and Crossword.
- **Orbit Word** has two **Modes**: Classic and Timer.
- **Sudoku** has three **Difficulties**: Novice, Beginner, and Expert.
- **Crossword** has three **Sizes**: Mini (5×5), Classic (7×7), and Grand (9×9).

### Agreed design direction

- Replace the landing page's direct mode selection with game selection, titled GuestWorld.
- Use the supplied Orbit Word and Sudoku cover illustrations as the two clickable game-selection cards; retain each full square image and a readable game label.
- Navigation: GuestWorld → Orbit Word → Classic / Timer → play.
- Navigation: GuestWorld → Sudoku → Novice / Beginner / Expert → play.
- Each game has a separate setup screen, reusing the existing selection-card design.
- Reuse the existing visual language and elements wherever suitable.
- Figma prototype creation was skipped. The implementation uses the existing UI elements and the supplied cover illustrations.
- All three Sudoku difficulties use the same standard 9×9 board with 3×3 boxes.
- Sudoku allows unlimited corrections and has no mistake-limit loss condition.
- Highlight conflicting duplicate digits in the same row, column, or box; do not automatically mark every entry that differs from the hidden solution.
- Offer Notes, Undo, Erase, and Hint at every Sudoku difficulty; assistance is optional and does not define the difficulty.
- Difficulty descriptions: Novice — “An easy start with straightforward placements.” Beginner — “Build confidence with a little more deduction.” Expert — “A deeper challenge requiring several steps of reasoning.”
- Sudoku puzzles must have exactly one solution and be solvable through logical deduction without guessing; clue count alone does not define difficulty.
- Show the number of hints used in the Sudoku completion summary.
- Sudoku has an elapsed-time clock, with no countdown, score, or separate timer mode.
- Start the Sudoku clock when the pre-game introduction closes; pause it while help is open.
- The Sudoku completion summary shows difficulty, elapsed time, and hints used.
- As of v0.6.0, unfinished Sudoku rounds auto-save in browser `localStorage` (`guestworld:sudoku:round:v1` via `src/app/storage.ts`) and surface a Resume banner (`Resume puzzle` / `Discard`) on Sudoku setup; selecting a difficulty while a saved puzzle exists opens an overwrite confirmation modal before replacing it. (Previously session-only in v0.4.0–v0.5.0.)
- Leaving an unfinished Sudoku via `Games` or hiding/closing the tab (`pagehide` / `visibilitychange`) saves the round automatically and returns to the hub; the v0.4.0 “Leave puzzle? Your progress will be lost.” confirmation dialog is retired in v0.6.0.
- Sudoku uses a flat, front-facing, steady 9×9 board with clear 3×3 box borders, readable candidate notes, and selected-cell highlights.
- Reuse the cosmic background, typography, colors, HUD, buttons, and key styling across both games; Sudoku cells do not use Orbit Word’s floating-cube presentation.

### Example dialogue

> **Player:** “I chose Sudoku from GuestWorld. Does Expert remove hints?”
> **Designer:** “No. Difficulty changes the reasoning required by the puzzle. Notes, Undo, Erase, and Hint are available at every difficulty.”

### Implementation

See [Game selection and Sudoku](docs/plans/0001-game-selection-sudoku.md) for the delivery plan and validation record, and [the handoff](docs/design/handoff.md) for the implemented screens.

- Each Sudoku difficulty has 20 bundled, uniquely solvable puzzles. Difficulty is verified by a logical grader: naked singles for Novice, hidden singles and locked candidates for Beginner, and naked pairs or X-Wing when required for Expert.
- Sudoku completes automatically when the board is full and valid. Play Again starts the same difficulty without another introduction; Change difficulty returns to setup; Games returns to the hub.
- Notes are manual candidate digits. Entering a value clears that cell’s notes; peer notes remain unchanged. Undo restores edits and notes, but does not refund hints used.
- As of v0.6.0, Sudoku persists the latest unfinished round (`guestworld:sudoku:round:v1`: puzzle ID, difficulty, board entries, candidate notes, selected cell, hints used, and elapsed time) and the `Show before each puzzle` help preference (`guestworld:sudoku:prefs:v1`) via `src/app/storage.ts`, falling back to session-only if storage is unavailable or corrupted. Undo history and active Notes mode are not persisted and reset (`history: []`, `notesMode: false`) on resume; completing or discarding a puzzle clears the saved round.
- The Sudoku clock pauses while the pre-game introduction or help dialog is open; exiting via `Games` or hiding/closing the tab (`pagehide` / `visibilitychange`) flushes the saved board state and elapsed time.

## Crossword

- **Crossword** is the third game on the GuestWorld hub, offering three board sizes (**Mini** 5×5, **Classic** 7×7, **Grand** 9×9) with 4–7 letter everyday English answers across 56 distinct validated grid patterns solved randomly on each new puzzle.
- Clues default to English (`EN`) and can be toggled to Thai (`ไทย`) offline at any time via the active clue header; Thai glyphs use bundled Fontsource Noto Sans Thai.
- Uses the shared cosmic theme, steady board presentation, elapsed-time clock (paused during help), Check / Erase / Hint / Reveal Word tools, and automatic completion without a mistake limit.
- **Persistence**: Unfinished Crossword rounds and clue-language / help preferences save automatically via the reusable versioned helper in `src/app/storage.ts`, powering the Resume banner on Crossword setup (shared with Sudoku as of v0.6.0).

### Flagged ambiguities

- Difficulty, mode, and size are separate concepts: Orbit Word uses mode (`Classic` / `Timer`), Sudoku uses difficulty (`Novice` / `Beginner` / `Expert`), and Crossword uses board size (`Mini` / `Classic` / `Grand`).
- Sudoku uses a standard 9×9 board at every difficulty; its confirmed behavior is described above.
- Timer behavior differs by game: Orbit Word’s Timer mode keeps running during help; Sudoku’s and Crossword’s elapsed-time clocks pause during help.
- Persistence across games as of v0.6.0: both Crossword and Sudoku auto-save the latest unfinished round and preferences via `src/app/storage.ts` (Sudoku persists `guestworld:sudoku:round:v1` and `guestworld:sudoku:prefs:v1`, resetting Undo history and Notes mode on resume), while Orbit Word persists only its “Show before each game” preference.
