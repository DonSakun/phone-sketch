# Progress — Making a drink (V1)

## Where things are
- All 16 steps of `planV1.md` are implemented in `sketch.js`, including this round's **swirl-replay redesign of Step 9** (a full-circle swirl replaces tap-when-full; Steps 3, 13, 14, 16 synced to match).
- `index.html` untouched — still just the one agreed p5.sound line. `planV1.md`'s Steps updated; the closing assumptions comment is yours and still describes the old tap-to-replay rule.
- Everything committed — working tree clean, `main` at `12c5047`. Your commits on top of the step work: background image (`references/drink-background.png`, loaded in `preload()`), experience edits, and the replay line reworded to **"make one swirl then hold still, to hear the melody replay :D"** (plan Step 14 still quotes the older wording — one line to sync whenever you want).

## What works and how I checked it
All checks ran in the desktop browser with faked phone dimensions (390×844 @2×), synthetic `PointerEvent`s, `getImageData` pixel probes, and the console watched — **zero errors** in every phase.
- **Screen / unlock / reload (1, 2, 10):** layout matches `references/drink-layout.png`; tap box first; reload returns to empty glass + hint (`tapCount:0, poured:0`).
- **Words (3):** top-strip pixel probe — 3929 white px after taps 1, 0 px and `wordsGone:true` after tap 2.
- **Note, pitch, drops (4–7):** hold = sine with ~30 ms fade-in; finger x → 11-rung pentatonic 110–440 Hz, ~100 ms slide; one drop per new pitch step, hue from the 0–360° wheel; inside-grey counts, outside fades.
- **Full gate (8, 13):** `FULL_COUNT 50`; pour stops at full; `checkFull` ends the hold but leaves the sound to a running sweep.
- **Swirl replay (9 — this round):** full circle fires, a 200° C-arc does not; a tap never starts it (when full a tap does nothing); a second swirl mid-sweep restarts from `replayIndex:0`; lift stops at once; a half-full swirl held through the whole ~12 s sweep ended naturally (`replaying:false`) and **handed the oscillator back to the live note** (`holding:true`), then lift silenced it; reaching full mid-sweep doesn't kill the sweep; the queue is a snapshot (spilled notes cut, notes made mid-sweep join the next one). One real bug found and fixed: a hairpin reversal in the finger path made the radius test measure the wrong stretch and reject valid circles — candidate runs are now checked as they end, in both directions.
- **Replay line (14):** latches at first full (`replayWords:true`), takes the hint's spot (3264 px vs the hint's 3929), survives a spill below full.
- **Tilt, spill, laptop (11, 15, 16):** lean is a deviation from neutral captured at the unlock tap and drifts the whole drink; a hard tip (γ40 fake) spills — `poured` steps back, the drop is doomed and cut from future replays; laptop path is the same code with sensors reading 0.

## What is next
1. **Your phone pass** of the swirl round: hint on tap 1, gone on tap 2 → fill to full (note stops, replay line appears) → tap at full does nothing → swirl half-full → arpeggio; lift stops it; swirl again → restarts from the top; keep holding → runs to the end; spill below full, then swirl → plays only what's left; reload → clean.
2. Real-tilt feel: the lean/spill checks used faked `deviceorientation` events — only a real tip tells you the timing and the drift speed.
3. Optional: re-run the failed GitHub Pages job (`gh run rerun 45650618415 --failed`) — stuck on a GitHub-side 500, offered but never re-run.
4. Sync plan Step 14's quoted replay line with your new wording (your call on the final text).
