# Handoff Spec: Orbit Word (v0.3.1)

Figma: [Orbit word](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word). The **Screens** page has five 1280×800 frames. The **Components** page has the component library. Every color, spacing and radius value below exists as a Figma variable (collection **Orbit Word**, mode **Dark**), and every type style exists as a Figma text style with the same name.

The Figma file was built *from* the shipped code, so the code is the source of truth. Where Figma can't show something (3D depth, lighting, motion), this document describes it. The v0.3.1 feedback colors below supersede the original Figma tokens; the Figma file still needs those color updates.

| Frame | Link |
|---|---|
| 01 Menu | [node 8-2](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word?node-id=8-2) |
| 02 How to play (Timer intro) | [node 8-186](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word?node-id=8-186) |
| 03 Playing (Timer, guess 3) | [node 8-576](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word?node-id=8-576) |
| 04 Win (Timer) | [node 8-895](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word?node-id=8-895) |
| 05 Loss (Classic) | [node 8-1318](https://www.figma.com/design/LbapGU4R0LtWZdl6OZpr53/Orbit-word?node-id=8-1318) |

---

## Overview

Orbit Word is a Wordle-style game. The player finds a hidden 5-letter English word in 5 guesses, and every guess must be a real word. Each submitted guess flips its tiles to show per-letter feedback: green means right letter in the right spot, yellow means the letter is in the word but in a different spot, gray means the letter is not in the word.

The board and keyboard are a live **WebGL scene** (React Three Fiber) on a starfield. Everything else (menu, top bar, modal, end card) is an **HTML overlay** on top of that canvas.

There are two modes:
- **Classic** has no clock.
- **Timer** runs a clock that only affects the score. It never ends the game.

The flow is: Menu → (How to play) → Playing → Win or Loss → Play Again (same mode, new word) or back to the Menu.

## Layout

There's no grid system. Layers stack inside a full-viewport `.app`:

1. `<canvas>` fills the viewport (`z-index: 0`).
2. `.overlay` layers fill the viewport (`z-index: 1`). They use a centered flex column and `pointer-events: none` on the container, so clicks fall through to the 3D keyboard. Only direct children receive pointer events.

**3D scene scale.** The camera has a 55° vertical field of view and sits at z = 10.5. On an 800px-tall viewport, 1 world unit at z = 0 is about **73.2px**. All 3D sizes in this spec use that scale and match the Figma frames.

| Region | Position at 1280×800 | Source |
|---|---|---|
| HUD bar | centered, `top: 18px` | `.hud` |
| Board | centered, 338×338, top ≈ 160px (group centered at world y = 1.15) | `TileGrid.tsx` |
| Keyboard | centered, 455×147, top ≈ 522px (group at world y = −1.75) | `Keyboard3D.tsx` |
| How to play card | centered both axes, 460 wide | `.howto-overlay` |
| End card | centered, `bottom: 24px` (covers the keyboard by design) | `.end-overlay` |
| Version label | `right: 16px; bottom: 12px`, menu only | `.app-version` |

## Design Tokens Used

### Color

| Token | Value | Usage |
|---|---|---|
| `color/bg/space` | `#05061a` | Page and 3D scene background |
| `color/text/primary` | `#f4f6ff` | Primary text, tile and key letters |
| `color/text/dim` | `#9aa3c7` | Secondary text, links, labels |
| `color/accent` | `#7cd3ff` | Toggle on, hover border, part of speech, focus ring, win particles |
| `color/danger` | `#ff5d7a` | Loss title, answer reveal |
| `color/success` | `#2bd576` | Win title |
| `color/tile/empty` | `#1e2650` | Empty board tile |
| `color/tile/filled` | `#34408a` | Typed tile, not yet submitted |
| `color/tile/correct` | `#1a8047` (emissive `#0b4424`) | Right letter, right spot (darkened in v0.3.1 for letter contrast) |
| `color/tile/present` | `#886d22` (emissive `#2e2406`) | Right letter, wrong spot (deliberately muted, no glow) |
| `color/tile/absent` | `#3a3f52` | Letter not in the word |
| `color/key/default` | `#232a4d` | Key not used yet |
| `color/surface/card` | `rgba(10,13,30,.72)` | End card |
| `color/surface/modal` | `rgba(10,13,30,.88)` | How to play card |
| `color/surface/hud` | `rgba(10,13,30,.55)` | HUD bar |
| `color/surface/mode-card` | `rgba(20,26,51,.7)` | Mode cards |
| `color/surface/scrim` | `rgba(5,6,26,.45)` | Backdrop behind How to play |
| `color/surface/meaning` | `rgba(124,211,255,.07)` | Word meaning box |
| `color/border/accent` | `rgba(124,211,255,.25)` | Card, modal and mode card borders |
| `color/border/hud` | `rgba(124,211,255,.18)` | HUD border |
| `color/border/button` / `-secondary` | `rgba(124,211,255,.4)` / `rgba(154,163,199,.35)` | Button borders |
| `color/border/divider` | `rgba(154,163,199,.18)` | How to play footer rule |
| `color/fill/button` / `-hover` / `-secondary` | `rgba(124,211,255,.1)` / `.22` / `rgba(154,163,199,.08)` | Button fills |
| `color/fill/toggle-off` | `rgba(154,163,199,.25)` | Toggle track when off |

Title gradient (not a token): `linear-gradient(135deg, #7cd3ff, #b98bff 50%, #ff9de2)` plus a `0 0 40px rgba(124,211,255,.35)` glow.

### Spacing and radius

| Token | Value | Usage |
|---|---|---|
| `space/2`–`space/28` | 2–28px, in steps of 2 | Padding and gaps. For example, the card uses `space/14`/`space/28` padding, the button `space/10`/`space/22`, the HUD `space/10`/`space/24` |
| `radius/tile-sm` | 5px | 2D tiles in How to play |
| `radius/button` | 10px | Buttons, word meaning box |
| `radius/mode-card` | 16px | Mode cards |
| `radius/card` | 18px | End card, How to play card |
| `radius/pill` | 999px | HUD bar, toggle track |

### Typography

The fonts load from Google Fonts. Orbitron (weights 500/700/900) is used for display text, and Space Grotesk (400/500/600) for body text, falling back to `system-ui`. Letters in the 3D scene use Roboto, the default font of troika-three-text.

| Text style | Spec | Usage |
|---|---|---|
| `Display/Title` | Orbitron 900, `clamp(2.5rem, 6vw, 4.5rem)`, tracking 8% | Menu title |
| `Heading/End card` | Orbitron 700, 25.6px, tracking 4% | SOLVED / OUT OF GUESSES |
| `Heading/Modal` | Orbitron 700, 19.2px, tracking 8% | HOW TO PLAY |
| `Heading/Mode card` | Orbitron 700, 18.4px, tracking 5% | CLASSIC / TIMER |
| `Label/Button` | Orbitron 400, 13.6px, tracking 4% | Buttons |
| `Label/HUD value` / `Label/Stat value` | Orbitron 700, 13.6 / 14.4px | HUD and stat numbers, headword |
| `Label/Tile` / `Label/Tile small` | Orbitron 700, 17.6 / 13.6px | 2D tiles in How to play |
| `Body/Subtitle` | Space Grotesk 400, 16.8px, tracking 2% | Menu subtitle |
| `Body/Default` / `Body/Emphasis` | Space Grotesk 400 / 700, 14.4px, line height 1.45 | Modal copy, stats |
| `Body/Card` | Space Grotesk 400, 14.08px, line height 1.4 | Mode card copy, definition |
| `Body/Small` | Space Grotesk 400, 13.6px | Toggle label |
| `Caption/HUD label` | Space Grotesk 400, 11.2px, uppercase, tracking 5% | GUESS / TIME |
| `Caption/Link` | Space Grotesk 400, 12.8px, underlined | HUD links |
| `Caption/Version` | Space Grotesk 400, 12px, tracking 6%, opacity .7 | Version label |

Figma has no italic for Space Grotesk. In the browser, the part of speech is rendered italic using a synthesized oblique; Figma shows it upright.

## Components

| Component | Variant / props | Code | Notes |
|---|---|---|---|
| Tile | State: Empty, Filled, Correct, Present, Absent · Size: Board (62), Example (40), Small (30) · Letter | `Cube.tsx`, `.howto-tile` | A Board tile is a 3D box 0.85×0.85×0.22 units, roughness .35, metalness .2, emissive intensity .6. Board tiles have no Empty/Filled versions at the Example or Small sizes. |
| Key | State: Default, Correct, Present, Absent · Width: Letter (0.56u ≈ 41px), Wide (0.95u ≈ 70px) · Label | `Keyboard3D.tsx` | The state is the best one seen for that letter so far (Correct beats Present beats Absent). |
| Board | 5×5 Tile instances, 7px gap | `TileGrid.tsx` | Rebuilt for each game (`key={gameId}`). |
| Keyboard | 3 rows of QWERTY keys (ENTER first, ⌫ last), 5px key gap, 12px row gap | `Keyboard3D.tsx` | |
| Button | Variant: Primary, Secondary · State: Default, Hover · Label | `.btn` | |
| Mode card | State: Default, Hover · Title, Description | `.mode-card` | Fixed at 260×116 so both cards always match. |
| Toggle | Checked: On, Off | `.toggle` | A visually hidden `<input type=checkbox>` underneath. |
| HUD bar | Guess, Time · Show time · Show how to play | `HUDOverlay.tsx` | |
| Word meaning | Word, Part of speech, Definition | `.end-meaning` | Max width 340px. |
| End card | Result: Win, Loss · Timer stats | `EndOverlay.tsx` | |
| How to play card | Mode rules · Primary action (nested Button, exposed) | `HowToPlay.tsx` | |
| Background / Starfield | — | `Starfield.tsx` | A flat stand-in for drei `<Stars>` (4000 stars). |

## States and Interactions

| Element | State | Behavior |
|---|---|---|
| Mode card | Hover | `translateY(-4px)`, border becomes `color/accent`, shadow `0 8px 32px rgba(124,211,255,.25)`, 180ms ease |
| Mode card | Click | Starts a game in that mode. Goes to How to play if the toggle is on, otherwise straight to Playing |
| Button | Hover | Fill becomes `color/fill/button-hover`, `translateY(-2px)`, 180ms ease |
| 3D key | Hover / Press | Scales to 1.06 on hover and 0.85 on press, lerping 35% per frame |
| 3D key / physical key | Letter | Adds the letter (up to 5) and plays a key click. The tile turns `Filled` |
| ⌫ / Backspace | — | Removes the last letter |
| ENTER / Enter | Fewer than 5 letters, or not in the 12,653-word dictionary | The row shakes (see Motion) with an error sound. **No guess is used** |
| ENTER / Enter | Valid word | The row flips, keyboard colors update, and the flip sound plays |
| Any input | Phase is not Playing, or help is open | Ignored |
| Gray letters | — | Can always be typed again. There's no hard mode |
| HUD "How to play" | Click | Opens the modal mid-game. The button reads "Back to game" and the Timer clock **keeps running** |
| HUD "Menu" | Click | Returns to the menu and abandons the round |
| How to play | Enter / Esc / button | Closes. As the pre-game intro, it also **starts the Timer clock**. The key is captured so it never submits a guess |
| Toggle | Change | Saved to `localStorage["orbit-word:show-howto"]`. Falls back to this session only if storage is blocked |
| Play Again | Click | Same mode, new word. **Skips** How to play |

## Responsive Behavior

The game is desktop-first by design (see `CONTEXT.md`). Mobile is playable but not optimized.

| Breakpoint | Changes |
|---|---|
| Desktop (>1024px) | Default layout, as in the Figma frames |
| 601–1024px | Same layout. The 3D scene scales with height, so on narrow but tall windows the keyboard rows get close to the edges |
| ≤600px | Mode cards stack in a single 260px column. The 3D keyboard can clip horizontally in portrait (known limitation) |
| Any height | The title shrinks via `clamp()`. The How to play card scrolls inside itself past `100vh − 32px` |

## Edge Cases

- **Duplicate letters:** scoring uses two passes. Exact matches claim letters first, then the remaining letters become Present or Absent based on how many are left. For example, SPEED vs ABIDE gives `· · Y · Y`.
- **Missing definition:** the Word meaning box is hidden. All 411 answers currently have one, each at most 90 characters.
- **Long text:** definitions are capped at 90 characters, and the box width at 340px, wrapping to 2–3 lines. The card grows with its content (minimum width 280px).
- **Loading:** there's no loading screen. The canvas uses `<Suspense fallback={null}>`, so it shows the background color until three.js and the fonts are ready. The bundle is about 1.24 MB (367 KB gzipped). On slow connections, text first appears in `system-ui` until Orbitron and Space Grotesk arrive.
- **Errors:** the only player-facing error is an invalid guess (the shake). There's no network use during play, since words and definitions are bundled.
- **Storage unavailable** (private browsing): the toggle still works for the session. No error is shown.
- **WebGL unavailable:** not handled. The page would show only the overlays. Worth a fallback message in the future.

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Board tile | Guess submitted | Rotates 180° on X. Color and letter swap at 50% | 420ms each, staggered 150ms per column | ease-in-out quad |
| Board row | Invalid guess | Shakes on x by `sin(6πt) × 0.06u × (1−t)` | 320ms | linear decay |
| 3D key | Hover / press | Scales toward 1.06 / 0.85 | about 4 frames | 35% lerp per frame |
| Camera | Pointer move (Menu, Playing) | Parallax drift of ±0.6u on x and ±0.36u on y, always looking at (0, 0.2, 0) | continuous | 4% lerp per frame |
| Camera | Win or Loss | Sways along a front arc, angle = `sin(0.45t) × 0.55 rad`, so letters stay readable | continuous | 5% lerp per frame |
| Win burst | Win | 220 accent points burst outward, with gravity of −1.4 u/s² | fade over 2.2s | linear opacity |
| Answer reveal | Loss | The word rises from y −1.5 to 1.15 at z 1.2, letters bob ±0.05u | 1.2s rise | ease-out cubic |
| Mode card / Button / Toggle | Hover / change | Transform, border, fill | 180ms | ease |
| Bloom | Always | `intensity .9, luminanceThreshold .25, smoothing .4, mipmapBlur`. Feedback materials use the darker v0.3.1 colors; rendered brightness also depends on lighting and emissive values | — | — |

Sound effects are synthesized with Web Audio (`src/audio/sfx.ts`): key press, flip, error, win and lose. There's no music.

## Accessibility Notes

What's in place:
- The mode cards, buttons and HUD links are real `<button>` elements, so they're focusable and in DOM order.
- The How to play card has `role="dialog"`, `aria-modal="true"` and `aria-labelledby="howto-title"`. Its primary button gets focus when it opens, and Enter/Esc close it.
- The toggle is a real labeled checkbox with a `:focus-visible` accent ring.
- The physical keyboard fully replaces the 3D keyboard.

Known gaps (recommended next steps):
1. **Color is the only feedback signal.** Green, yellow and gray carry no shape or pattern. This was deferred on purpose for v1 (`CONTEXT.md`). A colorblind mode would add icons or patterns to the Correct and Present tiles.
2. **Results aren't announced to screen readers.** The board is WebGL. Add an `aria-live="polite"` region that announces each guess, e.g. "S absent, T absent, O present, N correct, E correct", plus win and loss messages.
3. **The 3D keyboard can't be reached with Tab.** That's acceptable while physical keys work, but the canvas should have `aria-hidden="true"` and a visually hidden instruction.
4. **The modal has no focus trap.** Tab can move focus behind the How to play card.
5. **Contrast** (ratios use `#f4f6ff` letters against each flat tile color; other text uses the space background):
   - Letters on `color/tile/correct` (`#1a8047`): 4.61:1 after the v0.3.1 fix.
   - Letters on `color/tile/present` (`#886d22`): 4.57:1 after the v0.3.1 fix. Both flat-color combinations meet the 4.5:1 AA threshold for normal text. WebGL lighting, emissive materials and bloom affect the actual rendered contrast and require visual verification.
   - White on `color/tile/absent`: 9.67:1 (passes).
   - `color/text/dim` on the background: 8.06:1 (passes). The version label at 0.7 opacity drops to 4.36:1, just under the 4.5:1 AA minimum for 12px text, so drop the opacity or raise the size.
6. **No reduced-motion support.** Respect `prefers-reduced-motion` by skipping the tile flip stagger, the shake, the parallax and the camera sway.
