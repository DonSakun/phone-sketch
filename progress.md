# Progress — Glass Harp

## Where things are
- All 7 plan steps are implemented in `sketch.js`, plus a new **Step 8** (iOS selection fix) added to plan.md's Steps.
- `sketch.js`: full Steps 1–8 logic. `index.html`: only the agreed p5.sound 0.3.0 line. `plan.md`: Steps updated (Step 7's two overrides documented, Step 8 added). Uncommitted: `M sketch.js`, `M plan.md`.

## What works and how I checked it
- **Screen (1):** black edge to edge, white circle `min(0.78w, 0.72h)`, hint at `0.9h` — checked by canvas pixel sampling against `references/glass-harp-layout.jpg`.
- **Sound unlock (2):** p5.sound loads clean, zero console errors.
- **Words (3):** first inside tap removes them for good; the sound-box tap doesn't count (canvas-target guard — caught in testing).
- **Note on hold (4):** sine, random pentatonic base (never twice in a row), 30 ms fade-in, silence on lift, second finger ignored — verified via instrumented `p5.Oscillator` (0.3 → −10.46 dB on, −140 dB off).
- **Pitch (5):** 11 pentatonic steps across the circle, ~100 ms glide, vertical ignored, still finger = steady pitch.
- **Slide-out (6):** leaving the circle stops the note instantly; re-entry stays silent; new tap restarts.
- **Laptop (7):** needed two overrides — left-button-only guard (right-click no longer plays) and `windowResized()` (verified with a real 800→556 px window resize; `resizeCanvas` intercepted receiving the fresh size).
- **iPhone selection (8):** page-wide `user-select: none` + `-webkit-touch-callout: none` + `selectstart` cancel, injected from `sketch.js` — computed styles and the event guard verified in browser; full interaction regression passed, zero console errors.

## What is next
1. Commit `sketch.js` + `plan.md`.
2. Confirm on the real iPhone: hold plays without any magnifier/selection (Step 8's `-webkit-touch-callout` is iOS-only, unverifiable on desktop), plus the phone checks for Steps 6–7.
3. Not started, per plan's Limits: other people's phones.
