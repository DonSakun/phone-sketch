# Plan: Making a drink

## The experience

Before it starts, the screen is dark, with white glass shape in the middle. 
Touch detect anywhere on the screen.
With the small words "tap anywhere to pour a drink"
near the top. The words go away on the first tap.

When one person tap on the screen, play a note at finger position sets pitch.
If the touch moves in any direction, play a slightly different pitch from the previous one.
The pitch does not change if the touch doesn't move.
At the same time, create a small circle whose color follows the pitch — higher pitch = further around the wheel.
The small circle filled up the grey area on the screen. 

The note and small circle stop once the touch is undetected.
The note and small circle stop once the small circle filled up the grey area.
When the glass is full it stays full. Tap again to hear the notes replay.
Reload the page resets everything.

## Input, transformation, output, fallback
- Input: where does the phone detect touch on the screen.
- Transformation: plays a note at finger position instantly. create  small circles that filling up a glass.
- Output: The person hears a note and see the small circles.
- Fallback: on a laptop, click and hold anywhere count as tap anywhere to pour a drink, moving the mouse counts as moves touch, so I can
  test without a phone.

## References
| File | Use it as | Take | Leave |
|---|---|---|---|
| references/drink-layout | layout: match this | where the glass sits (middle), its size, the small text at the top, nothing else on screen | --- |
| references/mood | inspiration: the feel | color visuals | [the rest] |

## Limits
- Change only sketch.js, plus the one p5.sound line in index.html (agreed with the user).
- Portrait phone, full-screen canvas.
- Not now: other people's phones.

## How I will check it
- On my laptop: click and hold plays a note and create a drops, moving a mouse change its pitch slightly and change the drops hue slightly.
- On my phone: tap anywhere and hold plays a note and create a drops, moving a touch change its pitch slightly and change the drops hue slightly.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

**Step 1 — The screen**
Replace the Glass Harp sketch with V1: full-screen portrait canvas (`createCanvas(windowWidth, windowHeight)`), black background, a white martini glass centered approximating `references/drink-layout.png` (wide triangle bowl up top, thin stem, foot at the bottom), grey liquid filling the bowl — the grey is a simple triangle under the bowl's top edge, the same shape used both for drawing and for the fill test in Step 7, and small white words "tap anywhere to pour a drink" near the top. Call `lockGestures()` in `setup()`. Nothing else ever appears but drops (later steps).
*Check on your phone:* matches `drink-layout.png` — hint at top, glass in the middle, grey inside the bowl, black edge to edge; no pull-to-refresh, no scrolling, no zoom.

**Step 2 — Sound unlock**
`index.html` already has the agreed p5.sound line from Glass Harp — leave it alone. Start the sketch behind `enableSoundTap('Tap to enable sound')`.
*Check on your phone:* p5-phone's tap box appears first; after tapping it your glass screen appears; no black screen, no console errors.

**Step 3 — Words disappear**
The first tap **anywhere** on the screen removes the words for good.
*Check on your phone:* words gone after the first tap; lift and tap again — still gone.

**Step 4 — Note on hold**
Tap anywhere and hold → one note sounds instantly and sustains: sine, ~30 ms fade-in, pitch taken from where you touched (see Step 5's mapping — so the note "looks random" but is really position-driven). Lift → silence. Only the first finger counts. Reuse `blockSelection()` from Glass Harp so a held finger never starts the iOS magnifier or text selection.
*Check on your phone:* hold = tone, lift = silence, second finger = nothing extra; keep holding and sliding → no magnifier, no highlighted text anywhere.

**Step 5 — Move changes the pitch**
While holding, horizontal position picks the note: pentatonic steps across the screen width, left = low, right = high, ~100 ms slide between steps. Vertical position ignored. Finger still → pitch doesn't change.
*Check on your phone:* finger still → one steady pitch; slide left to right → pitch climbs in clean steps with a small glide.

**Step 6 — Drops appear and stay**
Every new note leaves a small drop at your finger: one on the first tap, one more on each pitch-step change while moving (holding still adds none). Drops stay on screen forever, each keeping its color — hue follows the pitch: the full color wheel (0–360°) mapped across the playable pitch range, lowest note = one end, highest note = the other.
*Check on your phone:* a tap leaves exactly one dot; sliding across steps leaves a trail of dots in shifting colors; lifting keeps every dot on screen.
 
**Step 7 — Inside the grey counts, outside fades**
A drop whose center lands inside the grey liquid **counts toward filling and stays**; a drop on the black (outside the grey) **fades away in 0.5 s** — the note plays either way.
*Check on your phone:* touch over the grey → dot stays; touch on the black background → dot appears, then vanishes within half a second.

**Step 8 — The drink is done**
After a fixed number of counted drops (~200 of the half-size dots, sized by eye so they read as a full glass), everything stops: holding plays no note and leaves no drop anymore.
*Check on your phone:* pour until it stops; after a reload, it takes about the same amount of pouring every time, and the glass reads as full.

**Step 9 — Replay on the full glass**
Tap anywhere when full → all the counted notes replay in order in one fast sequence (~150 ms per note, the same sine tone). No new drops; the glass stays exactly as it was. One replay per tap.
*Check on your phone:* tap → a short arpeggio of your own notes; screen unchanged; tap again → same replay.

**Step 10 — Reload resets**
Reload the page → no drops, words back, sound unlock asks again.
*Check on your phone:* reload → empty grey glass and the hint text are back.

**Step 11 — Laptop fallback**
Same code path: left click-and-hold anywhere = the tap, moving the mouse = moving the touch, release = silence; a right/middle press (trackpad two-finger tap) does nothing; `windowResized()` keeps the canvas full-screen when the window resizes.
*Check on your laptop:* hold = tone, move = pitch steps + drops, release = silence; right-click = nothing; drag a window edge → still black edge to edge with the glass centered.

<!-- The agreed assumptions are baked into the steps: glass drawn with p5 shapes approximating drink-layout.png and grey = a triangle under the bowl (Step 1); count rule = drop center inside the grey (Step 7); one drop per note = first tap + each pitch-step change, holding still adds none (Step 6); ~200 counted half-size drops = full, count tuned by eye (Step 8); pitch = pentatonic steps across screen width, left low / right high, ~100 ms glide, vertical ignored (Step 5); hue = full 360° wheel across the pitch range, each drop keeps its color (Step 6); replay = recorded notes at ~150 ms each, same sine, screen untouched, repeatable (Step 9); full = no new notes, tap only replays (Steps 8-9); first tap anywhere removes the words (Step 3); reused from Glass Harp: lockGestures, sine + ~30 ms fade-in, one finger, left-click-only guard, windowResized, blockSelection, enableSoundTap first (Steps 2-4, 11); reload resets = browser default (Step 10); visuals = drops only (Steps 1, 6). -->

