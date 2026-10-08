# Plan: Glass Harp

## Project
Phone as glass harp, to plays, for many phones in one space.

## The question
1. Does the notes play when tap inside the circle and hold?
2. When fingers swirl, does it play a melody?
 
## The experience

Before it starts, the screen is dark, with white circle in the middle. 
Touch only detect within the circle.
With the small words "tap inside the circle and hold"
near the bottom. The words go away on the first tap.

When one person tap inside the circle and hold, play a note at random.
If the touch moves in any direction, play a slightly different pitch from the previous one.
The pitch does not change if the touch doesn't move.

The note stop once the touch is undetected.

## Input, transformation, output, fallback
- Input: where does the phone detect touch on the screen.
- Transformation: plays a random note instantly.
- Output: The person hears a note. 
- Fallback: on a laptop, click and hold count as tap inside the circle and hold, moving the mouse counts as moves touch, so I can
  test without a phone.

## References
| File | Use it as | Take | Leave |
|---|---|---|---|
| references/glass-harp-layout | layout: match this | where the circle sits (middle), its size, the small "tap to hold" at the bottom, nothing else on screen | the paper colour
| references/mood | inspiration: the feel | black and white visuals | [the rest] |

## Limits
- Change only sketch.js, plus the one p5.sound line in index.html (agreed with the user).
- Portrait phone, full-screen canvas.
- Not now: other people's phones.

## How I will check it
- On my laptop: click and hold plays a note, moving a mouse change its pitch slightly.
- On my phone: tap inside the circle and hold plays a note, moving a touch change its pitch slightly.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

**Step 1 — The screen**
Replace the starter sketch with the layout: full-screen portrait canvas (`createCanvas(windowWidth, windowHeight)`), black background, one white circle centered — about 78% of the screen width across — and small white words "tap inside the circle and hold" near the bottom. Call `lockGestures()` in `setup()`. This static black-and-white look is the whole design: nothing else ever appears on screen, no colour, no feedback while playing.
*Check on your phone:* it looks like `references/glass-harp-layout.jpg` — black edge to edge, white circle in the middle, small words at the bottom, nothing else; no pull-to-refresh, no scrolling, no zoom.

**Step 2 — Sound unlock**
Add one line to `index.html` — p5.sound (0.3.0) after p5, before p5-phone — and start the sketch behind `enableSoundTap('Tap to enable sound')`.
*Check on your phone:* p5-phone's tap box appears first; after tapping it your dark circle screen appears; no black screen, no errors in the console. (This step also proves p5.sound loaded cleanly.)

**Step 3 — Words disappear**
The first tap inside the circle removes the words for good. Taps outside the circle aren't detected at all, so they don't count.
*Check on your phone:* words are gone after the first tap inside the circle; lift and tap again — still gone.

**Step 4 — Note on hold**
Tap inside the circle and hold → one note sounds instantly and sustains: a sine wave with a ~30 ms fade-in (no click), on a base note chosen at random from the pentatonic scale, roughly 220–440 Hz (range tunable). Lift → silence. Tap outside the circle → nothing. Only the first finger counts; extra fingers are ignored.
*Check on your phone:* hold = tone, lift = silence, outside tap = silent, second finger = nothing extra; each new hold starts on a different note.

**Step 5 — Position bends the pitch**
While holding, the horizontal position picks the note: center of the circle = this hold's base note, left edge = one octave lower, right edge = one octave higher — always snapped to pentatonic steps (11 steps from left to right), with a ~100 ms slide between steps. Vertical position is ignored, and while the finger doesn't move the pitch doesn't change.
*Check on your phone:* finger held still → one steady pitch; slide left to right → pitch climbs in clean steps with a small glide; the screen never changes while you play.

**Step 6 — Note stops when touch leaves**
If the held finger slides outside the circle, the touch is undetected → the note stops right away, and re-entering the circle does not start it again — only a new tap inside the circle and hold does. Lifting the finger also stops it.
*Check on your phone:* slide out → silence; slide back in → still silent; lift, then tap inside and hold → the note returns.

**Step 7 — Laptop fallback**
On the laptop the same code runs: click inside the circle and hold = tap inside the circle and hold, moving the mouse = moving the touch, release = stop. No extra code.
*Check on your laptop:* hold = tone, move = pitch steps, release = silence.

<!-- The nine agreed assumptions are baked into the steps: p5.sound line in index.html (Steps 1-2), pentatonic scale (Steps 4-5), sine with ~30 ms fade-in (Step 4), horizontal mapping with center = base and ±1 octave (Step 5), hint text "tap inside the circle and hold" (Steps 1, 3), first tap = first tap inside the circle (Step 3), leaving the circle stops the note (Step 6), one finger only (Step 4), no visual feedback (Steps 1, 5), ~100 ms glide (Step 5). -->

## Changes
<!-- Yours. One line each time you change this plan, and why. -->
