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
After a fixed number of counted drops (~100 of the dots, sized by eye so they read as a full glass), everything stops: holding plays no note and leaves no drop anymore.
*Check on your phone:* pour until it stops; after a reload, it takes about the same amount of pouring every time, and the glass reads as full.

**Step 9 — Replay on the full glass**
Tap anywhere when full → all the counted notes replay in order in one fast sequence (one sweep of about 12 s total — roughly 240 ms per note at 50, self-adjusting if the count changes — the same sine tone). No new drops; the glass stays exactly as it was. One replay per tap; tapping again, even mid-sweep, starts it again from the top.
*Check on your phone:* tap → a short arpeggio of your own notes; screen unchanged; tap again → same replay.

**Step 10 — Reload resets**
Reload the page → no drops, words back, sound unlock asks again.
*Check on your phone:* reload → empty grey glass and the hint text are back.

**Step 11 — Laptop fallback**
Same code path: left click-and-hold anywhere = the tap, moving the mouse = moving the touch, release = silence; a right/middle press (trackpad two-finger tap) does nothing; `windowResized()` keeps the canvas full-screen when the window resizes.
*Check on your laptop:* hold = tone, move = pitch steps + drops, release = silence; right-click = nothing; drag a window edge → still black edge to edge with the glass centered.

**Step 12 — Drops fall into the glass**
A drop no longer just appears at your finger: it spawns there (same moment, same hue, the note unchanged) and **falls** — straight down, accelerating, with a slight side-to-side sway like a liquid droplet (~0.5–0.7 s from the top of the screen to the liquid). If its fall path crosses the grey, it lands on the surface — a brief squash on the drop itself, no splash particles — and it **counts the moment it enters the liquid**. A touch made over the grey spawns already inside the liquid: it counts immediately and (until Step 13) stays where you touched. A touch on the black whose fall path never crosses the glass (beside or below the bowl) falls while fading away over 0.5 s and never counts. This replaces Step 7's center-inside rule: entering the liquid is what counts; the note plays either way.
*Check on your phone:* tap on the black above the bowl's opening → dot falls, squashes, rests on the liquid surface; tap on the black beside the glass → dot falls and vanishes mid-fall, the glass does not fill; tap in the grey → dot appears and counts as before; notes and hues unchanged; the glass still fills to its old count (Step 13 changes that).

**Step 13 — Drops sink and pile up**
Everything in the liquid now sinks: a slow, viscous descent with a lazy sway down to the pool (much slower than the air-fall). Drops settle at the bottom of the bowl's V and **pile up** on the heap and the glass walls — **only slight overlap** (~5–10 % squish): soft particles, not ghosts. On contact a drop slides a little toward the lower side so the heap levels out like liquid (plain vertical stacking is the fallback if the slide gets fiddly); once settled, a drop freezes. The heap grows from the tip up and, packed solid with no gaps, reads completely full at **`FULL_COUNT` 100 → ~50** — this replaces Step 8's count: 50 big dots are exactly the glass's room with slight overlap, where 100 would mound out of the rim (tuned by eye). The replay follows automatically — same ~12 s sweep, now ~240 ms per note — and the full-glass gate and reload reset work as before.
*Check on your phone:* tap in the grey → dot sinks slowly and joins the heap with a tiny squish; tap above the glass → fast fall, squash on the surface, then sink into the heap; keep pouring → the heap climbs from the tip with dots packed, only slight overlaps, and the pour stops with the glass reading full (~50 counted drops); tap → the same ~12 s replay, notes farther apart; reload → clean glass.

<!-- The agreed assumptions are baked into the steps: glass drawn with p5 shapes approximating drink-layout.png and grey = a triangle under the bowl (Step 1); count rule = a drop counts the moment it enters the liquid (lands on the surface or spawns in it); a drop whose fall path misses the glass falls while fading and never counts (Step 12, replacing Step 7); drop motion = gravity fall with sway in air, squash on landing with no splash particles, viscous sink in the liquid, slight slide to level the heap, settled drops freeze (Steps 12-13); one drop per note = first tap + each pitch-step change, holding still adds none (Step 6); ~50 counted drops = full as a packed heap allowing only slight overlap, dot size and count tuned by eye (Steps 8, 13); pitch = pentatonic steps across screen width, left low / right high, ~100 ms glide, vertical ignored (Step 5); hue = full 360° wheel across the pitch range, each drop keeps its color (Step 6); replay = recorded notes in one ~12 s sweep (~240 ms each at 50), same sine, screen untouched, repeatable, tap restarts from the top (Step 9); full = no new notes, tap only replays (Steps 8-9); first tap anywhere removes the words (Step 3); reused from Glass Harp: lockGestures, sine + ~30 ms fade-in, one finger, left-click-only guard, windowResized, blockSelection, enableSoundTap first (Steps 2-4, 11); reload resets = browser default (Step 10); visuals = drops only (Steps 1, 6). -->

