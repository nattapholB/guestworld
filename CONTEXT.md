# GuestWorld — Context

## Overview
A Wordle-style word-guessing game, rendered as a 3D scene with fancy visual design, delivered as a web app.

## Glossary
- **Feedback**: Per-letter result shown after each guess — Green (right letter, right position), Yellow (right letter, wrong position), Gray (letter not in the word). Applied per letter, not per word.
- **Classic mode**: Play with no timer — 5 guesses to find the word, at your own pace.
- **Timer mode**: Same 5-guess rules as Classic, but a clock runs in the background and faster solves earn a higher score. The timer never ends the game early or costs guesses — it's a scoring modifier only.

## Decisions
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
- **Win/lose sequence**: Win = particle burst/fireworks around the solved cubes + slow camera sway + celebration sound. Lose = the correct answer's letters rise and arrange themselves in the scene, lighting shifts to a somber tone. Both end with a stats overlay (guess count, and elapsed time in Timer mode).
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
