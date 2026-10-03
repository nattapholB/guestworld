# GuestWorld game selection and Sudoku implementation plan

Status: implemented for v0.4.0. This document records the agreed design and delivery plan based on v0.3.1. Figma prototype creation was skipped; the existing app and supplied cover illustrations are the visual references.

## Outcome and scope

GuestWorld becomes the landing page for two games. Orbit Word keeps Classic and Timer. Sudoku offers Novice, Beginner, and Expert on a standard 9×9 board with 3×3 boxes.

Confirmed Sudoku behavior:

- Unlimited corrections; highlight duplicates in the same row, column, or box. No mistake limit or game-over state.
- Notes, Undo, Erase, and Hint at every difficulty. Hint reveals the selected editable cell and counts toward the round's hints used.
- Elapsed-time clock without a countdown or score. Start after the introduction; pause during help and leave confirmation.
- Completion summary: difficulty, elapsed time, hints used.
- No saved puzzle, resume action, accounts, or historical stats. Reload discards the round.
- In-game exit confirmation: “Leave puzzle? Your progress will be lost.” Actions: Keep playing / Leave puzzle.
- Steady, flat board inside the existing cosmic presentation.
- Puzzles have one solution and can be solved by logical deduction; difficulty is not determined solely by clue count.

## Screen flow

1. **GuestWorld:** title, short subtitle, two clickable cover-image cards for Orbit Word and Sudoku, current version label.
2. **Orbit Word setup:** existing Classic / Timer cards, plus Back to games.
3. **Sudoku setup:** Novice / Beginner / Expert cards, plus Back to games. Selecting a difficulty starts a new round and its introduction.
4. **Sudoku introduction:** existing modal treatment with Sudoku rules and Start. Board remains inactive and clock remains at zero.
5. **Sudoku play:** difficulty, elapsed time, How to play, Games; 9×9 board; Notes / Undo / Erase / Hint; number pad 1–9.
6. **Help:** pauses Sudoku and blocks board input; Back to game resumes the same round.
7. **Leave confirmation:** pauses Sudoku and blocks board input. Keep playing resumes; Leave puzzle clears the round and returns to GuestWorld.
8. **Completed:** solved board plus result card. Play Again starts a new puzzle at the same difficulty; Change difficulty opens Sudoku setup; Games returns to GuestWorld.

Replay behavior follows the existing app: skip the pre-game introduction on Play Again. Completion occurs automatically when all 81 cells satisfy the rules; there is no Submit button.

Difficulty card copy:

| Difficulty | Description |
|---|---|
| Novice | An easy start with straightforward placements. |
| Beginner | Build confidence with a little more deduction. |
| Expert | A deeper challenge requiring several steps of reasoning. |

## Game-selection cover artwork

Use the two user-supplied illustrations as the primary selection targets:

| Game | Source asset | Card action |
|---|---|---|
| Orbit Word | `output/imagegen/orbit-word-cover.png` | Open Classic / Timer setup. |
| Sudoku | `output/imagegen/sudoku-cover.png` | Open Novice / Beginner / Expert setup. |

Both source images are 1254×1254 PNGs, approximately 2.3 MB and 2.2 MB respectively. Preserve the originals. During implementation, place optimized web copies under `src/assets/games/` and import them through Vite so URLs work under the GitHub Pages base path. Keep titles, pixel-art details, and the full composition intact; visually check any compression at the rendered card size.

- Present two equal-size cards side by side on desktop, approximately 300–340px wide, stacking on narrow screens.
- Give each cover a square aspect ratio and show the full artwork without cropping, stretching, extra image overlays, or added text over the illustration.
- Below the image, use a short HTML label and description: **Orbit Word — Guess the hidden word in five tries.** / **Sudoku — Fill the grid, one deduction at a time.**
- Make the entire card one native button, including its cover and caption. Enter, Space, pointer, and touch activate the same navigation action. Do not nest a second button inside it.
- Use the HTML game label as the accessible name and an empty image alt attribute to avoid repeating the title embedded in the artwork. Associate the short description separately.
- Reuse the existing rounded corners, translucent caption surface, accent border, and hover treatment. Add an equally visible keyboard-focus treatment and respect reduced-motion preferences for hover movement.
- Reserve image dimensions to prevent layout shifts. Keep text navigation usable if an image fails to load, and allow vertical scrolling when stacked cards exceed viewport height.
- The numbers printed in the Sudoku illustration are decorative cover art, not a playable puzzle or puzzle-bank source.

Mode and difficulty screens continue using the existing text-card treatment; cover illustrations belong to game selection.

## Reuse map

| Existing source | Planned reuse |
|---|---|
| `src/components/Menu/MenuOverlay.tsx` | Preserve Orbit Word setup; extract shared selection-card styling with an image variant for game selection and a text variant for mode/difficulty selection. |
| `src/styles.css` | Reuse title gradient, Orbitron / Space Grotesk typography, selection cards, buttons, HUD, modal scrim, and result-card styling. Add scoped Sudoku layout rules. |
| `src/game/theme.ts` | Reuse space, text, accent, danger, and surface colors. Expose shared CSS values where necessary to avoid a second palette. |
| `src/components/Background/Starfield.tsx` | Shared cosmic background. |
| `src/components/UI/HUDOverlay.tsx` | Reuse layout and styles; keep Word-specific guess/time behavior in its own component. |
| `src/components/UI/HowToPlay.tsx` | Extract a small modal shell; retain game-specific rules and clock behavior. |
| `src/components/UI/EndOverlay.tsx` | Reuse presentation, buttons, and stat layout, with separate Sudoku content. |
| `src/components/Game/Keyboard3D.tsx` | Reuse visual treatment for HTML digit buttons; its QWERTY layout and Word callbacks stay Word-specific. |
| `src/audio/sfx.ts` | Reuse key and win cues; sound failure must not prevent a state update. |

Reuse presentation first. Avoid a universal game store or a large generic game framework for two games.

## Architecture

### App navigation and rendering

Add a small `src/app/store.ts` for top-level screens: `games`, `word-setup`, `word`, `sudoku-setup`, `sudoku`. Round phases belong to their respective game stores.

`App.tsx` selects the active screen and mounts the relevant game UI and keyboard handler. The existing `src/game/store.ts` remains the Orbit Word store; add an explicit reset/discard operation for navigation cleanup.

Change `Scene.tsx` to accept presentation inputs from the app instead of deriving all visibility from the Word phase. It currently treats every non-menu phase as Word gameplay. Render `GameScene` and the Word celebration camera only while Orbit Word is active. Sudoku has the shared background with a steady HTML board above it; Word wins cannot affect the Sudoku camera or HUD.

Mount each game's keyboard handler only when that game is active. Ignore input while dialogs are open and respect focused controls; Enter on a HUD button must not also submit a Word guess. Game switching clears abandoned state and timers.

### Sudoku engine and content

Create `src/games/sudoku/` with `types.ts`, `logic.ts`, `puzzles.ts`, and `store.ts`. Keep rule functions pure and independent of React, audio, storage, or the renderer.

Use flat arrays of 81 cells, digits 1–9, and zero for empty values. Keep immutable givens and the verified solution separate from player entries. Derive peers, conflicts, and completion from the current board. A full board containing a duplicate remains editable and cannot win.

Recommended v1 content strategy: bundle a finite, prevalidated puzzle bank for each difficulty. Select randomly and avoid an immediate repeat when alternatives exist. This fits the existing offline, random-round model and avoids puzzle generation blocking the browser.

Prepare the bank with a deterministic offline script in `scripts/`. Use a solution counter that stops at two solutions to reject ambiguous puzzles, and a separate logical solver that records the techniques needed. Generate the seeds locally so there is no dependency on an unreviewed external puzzle dataset.

Proposed initial grading contract, to be proved against actual fixtures during implementation:

- Novice: solvable using naked singles.
- Beginner: solvable using singles and locked candidates, with at least one step beyond the Novice set.
- Expert: requires at least one step beyond the Beginner set and is solvable using an explicitly supported set including pairs and X-Wing.

Only include puzzles solved completely by the grading solver; never label a stalled puzzle Expert merely because it has few clues. A backtracking uniqueness check is not evidence of logical difficulty. Record puzzle ID, givens, solution, difficulty, and grading evidence. Start with a proposed minimum of 20 distinct seed puzzles per tier; this is a delivery default, not a user-approved quantity.

### Round state and clock

Sudoku state includes phase (`intro`, `playing`, `completed`), difficulty, puzzle ID, givens, solution, entries, notes, selected cell, notes mode, undo history, hint count, and one active dialog (`none`, `help`, `leave`).

All mutations pass through store actions that enforce editable-cell and active-play guards. UI disabling is not the only protection.

Track accumulated active milliseconds plus a monotonic start timestamp. Opening a pausing dialog accumulates elapsed time once; closing it starts a new active segment. Completion freezes the final elapsed value. Keep display ticks local to the HUD; do not rewrite all game state every tick. Use an injectable clock in tests.

No Sudoku round state is persisted. Proposed v1 default: pause only for the specified in-app dialogs, with no extra Pause button or hidden-tab pause behavior. Use the existing help-toggle presentation with a session-only Sudoku preference; preserve the existing Word preference independently.

### Editing details — implementation defaults

These resolve small interaction edges for implementation and are distinct from the confirmed product decisions above:

- Original givens cannot be edited, erased, or hinted. Selecting a given still permits inspecting its row, column, and box.
- Select a cell, then enter a digit by keyboard or number pad. Arrow keys move within the board; Delete / Backspace erase; N toggles Notes. Scope these shortcuts to game interaction and preserve native control behavior.
- Notes mode toggles candidate digits in an empty editable cell; candidate digits appear in consistent 3×3 positions. Notes do not create conflicts or count as filled cells.
- Entering a value clears that cell's notes. For v1, do not automatically alter peer notes; avoid hidden changes to a player's reasoning.
- Erase clears the selected editable cell's value and notes. Undo restores the preceding board/notes edit, including a hint placement; an undone hint still counts as assistance used.
- Hint is enabled only for a selected non-given cell whose value differs from its solution. A successful hint replaces its entry, clears its notes, and increments hints used exactly once. Selecting a correct cell and requesting Hint is a no-op.
- Keep the given, entered, and selected states visually distinct. Mark conflicts with an outline and an accessible explanation as well as color. Do not expose solution correctness through ordinary entry coloring.
- Completion freezes editing. Play Again resets entries, notes, history, time, and hints; Change difficulty returns to setup.

## Delivery sequence and acceptance gates

### 1. Introduce the GuestWorld hub

Add top-level navigation, image-based game selection using the supplied covers, the shared selection card, and separate setup screens. Optimize and import the cover assets. Adapt the Word menu and scene gates.

Acceptance: both cover cards navigate to the correct setup by pointer and keyboard; artwork is complete and undistorted; production asset URLs resolve under the Pages subpath; both setup screens are reachable; Back to games works; Orbit Word still supports Classic, Timer, help, win/loss, and replay. Switching screens cannot leave a Word keyboard listener active elsewhere.

### 2. Implement and validate Sudoku rules and puzzle content

Add types, peer indexing, duplicate detection, completion checks, offline bank preparation, logical grading, and puzzle selection. Add a focused test runner as a dev dependency during implementation.

Acceptance: every bundled puzzle has valid givens, exactly one solution, consistent metadata, and a complete logical solving trace within its tier. Test row/column/box duplicates, empty boards, and filled invalid boards independently of the generator.

### 3. Implement the Sudoku round lifecycle

Add the store, editing guards, notes, undo, hints, and pause-aware elapsed time before building all UI states.

Acceptance: givens cannot change; notes and edits undo correctly; hints count once per successful use and cannot be refunded with Undo; pausing twice cannot double-count elapsed time; inputs after completion or during dialogs are ignored.

### 4. Build the Sudoku UI using existing styles

Add `SudokuGame`, `SudokuBoard`, `SudokuCell`, `SudokuNumberPad`, `SudokuToolbar`, `SudokuHUD`, help, leave confirmation, and completion UI under the Sudoku feature. Extract only the small shared modal/card primitives actually needed.

Use a centered board around 450–500px wide on desktop, with a compact number pad and tools below it. Reuse the existing pill HUD and translucent cards. Use a CSS grid and visible 3×3 borders. Stack setup cards on narrow widths; allow vertical scrolling where necessary instead of clipping behind the current global `overflow: hidden` rule.

Acceptance: the 1280×800 desktop layout fits, notes remain legible, cells and controls are keyboard reachable, selection has a visible focus indicator, and dialogs trap and restore focus. Verify a narrow viewport has no inaccessible board columns or toolbar actions.

### 5. Validate integrated behavior

Add focused browser/component coverage for GuestWorld → Sudoku setup → intro → play, note entry, conflict correction, undo, hint, help pause/resume, exit cancellation/confirmation, completion, and replay. Use a fixed near-complete fixture to verify completion without exposing a production cheat control.

Regression-check Orbit Word duplicate-letter feedback, five-guess limit, rejected guesses, its original timer semantics, and replay. Confirm reload discards Sudoku and no saved-progress control appears. Run the production build and inspect the actual desktop and narrow layouts.

### 6. Prepare v0.4.0

Once implemented and verified, update the context and handoff to describe shipped behavior, bump `package.json` and lockfile to v0.4.0, commit, tag, and prepare release notes covering the hub and Sudoku. Follow the project's normal push/release workflow and verify the Pages deployment when shipping is requested.

Planning itself does not bump the app version or publish a release.

## Main risks to resolve during implementation

- **Difficulty quality:** prove the proposed grading tiers with validated fixtures; the labels must describe an actual reasoning difference.
- **Input isolation:** the current global Word key handler must not process Sudoku or dialog input.
- **Clock semantics:** Word Timer runs during help; Sudoku pauses. Keep this difference explicit in stores and tests.
- **Layout:** the app currently hides document overflow. Sudoku must remain usable when the viewport is shorter or narrower than the desktop reference.
- **No persistence:** leave confirmation covers in-app navigation. Browser reload still discards the puzzle; do not imply it can be resumed.

## Completion checklist

- [x] GuestWorld game selection uses both supplied cover images and opens the correct setup screens
- [x] Existing Orbit Word flows preserved
- [x] Three validated Sudoku difficulty tiers
- [x] 9×9 board with immutable givens, notes, conflicts, undo, erase, hints
- [x] Correct active-time clock and paused dialogs
- [x] Completion and replay flow
- [x] No saved-progress behavior
- [x] Keyboard and pointer interaction, readable responsive layout
- [x] Focused rules, lifecycle, and integrated regression checks pass
- [x] Documentation and v0.4.0 release preparation


## Implementation record

- Game selection uses optimized WebP copies of both supplied covers at their original 1254×1254 dimensions (approximately 781 KB combined, down from 4.7 MB).
- App navigation and Sudoku state are separate from Orbit Word state. Sudoku uses a steady HTML board, with controls beside it on desktop and below it on narrow screens.
- The deterministic generation script produced 20 puzzles for each tier. All 60 pass unique-solution and complete logical-deduction checks; each higher-tier fixture stalls when restricted to the lower tier's techniques.
- A shared native dialog supplies background modality, explicit Tab wrapping, Escape dismissal, and focus restoration. Word's keyboard handler is mounted only for Word gameplay and respects focused controls.
- Orbitron and Space Grotesk are bundled through Fontsource; the Word board uses a local Roboto font. Font licenses are included in the build. Rendering no longer requires external font requests.
- Thirteen automated tests cover puzzle content, rule invariants, round transitions, notes, undo, hint accounting, timing, and Word feedback/scoring. CI runs these before building.
- The browser walkthrough covers both Word outcomes, all Sudoku tools, dialogs, completion/replay, exit, reload reset, and 390px/320px layouts.
- `package.json` and lockfile are versioned at v0.4.0. Release notes are maintained in `docs/releases/v0.4.0.md`; the release uses tag `v0.4.0` and the standard GitHub Pages deployment workflow.
