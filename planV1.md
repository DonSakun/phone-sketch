# Plan: Making a drink

## The experience

Before it starts, the screen is dark, with white glass shape in the middle. 
Touch detect anywhere on the screen.
With the small words "tap and hold anywhere to pour a drink"
near the top. The words go away on the second tap.

When one person tap on the screen, play a note at finger position sets pitch.
If the touch moves in any direction, play a slightly different pitch from the previous one.
The pitch does not change if the touch doesn't move.
At the same time, create a small circle whose color follows the pitch — higher pitch = further around the wheel.
The small circle filled up the grey area on the screen. 


If the phone is tilted in any direction, the small circle slowly falls in a direction based on the tilt.
Small circle that has fallen out of the glass are cut off from the replay and not counted in the limit, and gradually fade away just like ones outside grey area.


The note and small circle stop once the touch is undetected.
The note and small circle stop once the small circle filled up the grey area.
When the glass is full it stays full. 


Detect a swirl direction touch to hear the notes replay.
The replay only play the note existing in the grey area. Any notes changes during the replay does not affect the current replay, only the next and so on replays. The replay can also be stopped when the user lift up the finger from the swirl.
After the first full limit reached, small words "swirl to hear the melody replay." near the top appear and does not go away.

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
- On my phone: tap anywhere and hold plays a note and create a drops, moving a touch change its pitch slightly and change the drops hue slightly.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

**Step 1 — The screen**
Replace the Glass Harp sketch with V1: full-screen portrait canvas (`createCanvas(windowWidth, windowHeight)`), black background, a white martini glass centered approximating `references/drink-layout.png` (wide triangle bowl up top, thin stem, foot at the bottom), grey liquid filling the bowl — the grey is a simple triangle under the bowl's top edge, the same shape used both for drawing and for the fill test in Step 7, and small white words "tap and hold anywhere to pour a drink" near the top. Call `lockGestures()` in `setup()`. Nothing else ever appears but drops (later steps).
*Check on your phone:* matches `drink-layout.png` — hint at top, glass in the middle, grey inside the bowl, black edge to edge; no pull-to-refresh, no scrolling, no zoom.

**Step 2 — Sound unlock**
`index.html` already has the agreed p5.sound line from Glass Harp — leave it alone. Start the sketch behind `enableSoundTap('Tap to enable sound')` (Step 15 swaps this one call for `enablePermissionsTap(['sensors', 'sound'], …)` — same single box, it also unlocks motion).
*Check on your phone:* p5-phone's tap box appears first; after tapping it your glass screen appears; no black screen, no console errors.

**Step 3 — Words disappear**
The first tap **anywhere** on the screen leaves the words up; the **second** tap removes them for good.
*Check on your phone:* words still there after the first tap; gone after the second; lift and tap again — still gone.

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

**Step 9 — Swirl to hear the replay**
Any time the grey has notes — half-full, full, or after a spill — a finger that, while down, traces a **full circle** (about 360° in either direction, finished within a few seconds, wide enough to read as a circle rather than a scribble — all three tuned by eye) starts the replay: all the counted notes replay in order in one fast sequence (one sweep of about 12 s total — roughly 240 ms per note at 50, self-adjusting if the count changes — the same sine tone). No new drops; the glass stays exactly as it was. A **tap never starts the replay** — when full a tap just does nothing. A **new swirl**, even mid-sweep, starts it again from the top. **Lifting the finger stops the sweep at once** (hold to listen); left alone it still ends on its own at ~12 s. The queue is a snapshot of the notes in the grey when the swirl fires, so notes made during the sweep only join the next one.
*Check on your phone:* half-full → circle your finger (down the whole time) → a short arpeggio of your own notes; lift → silence at once; circle again → same replay from the top; keep holding → it runs to the end; screen unchanged.

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
*Check on your phone:* tap in the grey → dot sinks slowly and joins the heap with a tiny squish; tap above the glass → fast fall, squash on the surface, then sink into the heap; keep pouring → the heap climbs from the tip with dots packed, only slight overlaps, and the pour stops with the glass reading full (~50 counted drops); swirl → the same ~12 s replay, notes farther apart; reload → clean glass.

**Step 14 — The words**
Two wording changes. The hint reads **"tap and hold anywhere to pour a drink"** — it always needed a hold, so say so (the quote in Step 1 above is synced). And when the drink first becomes full, **"swirl to hear the melody replay."** appears near the top and stays for good: it latches — once shown it survives everything until a reload. It takes the hint's spot for good too (the two share the one line at the top, so from first full the hint never draws again — even if the second tap hasn't happened yet). Full here is Step 13's `FULL_COUNT` gate; this step only watches for it (Step 16 keeps the latch alive once the count can drop again).
*Check on your phone:* hint reads "tap and hold anywhere to pour a drink"; pour to full → the replay line appears near the top and never leaves; reload → both gone, hint back, line returns only on the next full.

**Step 15 — The glass leans**
The unlock box now also asks for motion: swap `enableSoundTap` for `enablePermissionsTap(['sensors', 'sound'], …)` — still one box; iOS shows its motion permission dialog right after the tap (allow it; Android shows nothing but still needs the tap). The phone's lean becomes a slow extra gravity on **all** drops: air falls bend, sinking drops drift, the frozen heap wakes and slides toward the low side — slowly, viscously, like the drink it is; drift scales with how far you lean. Tilt is measured as a **deviation from neutral, neutral captured at the unlock tap** (where you were holding the phone), so a phone held casually at an angle doesn't drift on its own; level back to neutral and everything settles and re-freezes. Read `rotationX/Y/Z` in radians as-is — no `angleMode(DEGREES)` (it would silently stretch the sway's period from 300 ms to ~17 s). Take p5-phone's wake-lock pattern from `mouseReleased()` so the screen doesn't dim mid-tilt. On a laptop the sensors read 0 → no lean, everything else unchanged. Nothing can leave the glass yet: the wall clamps and the mouth-line hold both stay on.
*Check on your phone:* after the unlock tap (and allowing motion on iOS), tip the phone any way from where you held it → the whole drink leans and slides the way you tip it, slowly; hold steady → it stops and heaps again; pour, notes, hues, the full-glass stop and the replay all behave exactly as before; nothing ever falls out.

**Step 16 — Pour it out**
Let the lean tip it over the rim. While the tilt is beyond a small dead-zone (leaning), the mouth-line hold releases; a **counted** drop whose centre rises more than **half a radius above the liquid line** has fallen out of the glass — the margin keeps brim-full compression from faking a spill. Falling out = the miss treatment: `poured` steps back down (so below full again the gate reopens and you can pour more), the drop is cut from every future replay, and it fades over 0.5 s exactly like an outside-grey drop — and once doomed it stays doomed, it can never re-count by drifting back in. Drops that were never counted (spawned beside or below the bowl, or blown past the rim) start fading the moment they fall below the bowl — this replaces Step 12's spawn-time miss prediction with the same continuous rule. Walls still hold — the drink can only leave over the rim, the way a real one pours. A swirl during a running replay still restarts it from the top even if the count has dropped (Step 9's rule wins); an already-running sweep keeps the notes it started with; the replay words stay put (the latch from Step 14 — after a spill below full, a tap *pours* until you're full again, then a swirl replays). Laptop: sensors 0 → never leans, never spills.
*Check on your phone:* fill the glass, then tip the phone → drops stream over the low rim, fade out, and the heap visibly drains; pour again → it fills and reads full again; when full, a tap does nothing, a swirl → the same replay, a new swirl mid-sweep restarts it, a lift stops it; the replay line never leaves; reload → clean.

**Step 17 — The background image**
Swap the plain black behind the glass for `references/drink-background.png` — the bokeh-circles artwork, delivering `references/mood`'s promised "color visuals". Load it the p5 2.x way: `setup()` becomes `async`, and `bgImage = await loadImage('references/drink-background.png')` (forward slashes) runs last, after the `enablePermissionsTap` call — the draw loop waits for that promise, so frame 1 already has the image; the uncommitted `preload()` experiment with its broken backslash path goes away. Each frame draws it **full height, aspect ratio preserved, centred horizontally**: scaled width `w = bgImage.width * height / bgImage.height` at `x = (width - w) / 2`, so on a portrait phone the sides crop away evenly (the middle ~26 % of the artwork shows) and nothing stretches — and because it is recomputed every frame, `windowResized()` needs nothing extra. `background(0)` stays underneath as the base: it paints black while the image loads and wherever a window wider than the artwork leaves it short. The image is drawn **exactly as authored** — no `tint()`, no `filter()`, no colour math, the hue untouched. Glass, drops and words keep drawing on top, unchanged. This supersedes Step 1's "nothing else ever appears but drops": the artwork now sits behind everything.
*Check on your phone:* reload → the bokeh fills the screen top-to-bottom behind the glass, sides cropped rather than squashed, colours identical to the PNG; tap box, hint, glass, drops and the replay line all draw on top exactly as before; rotate or resize → still filling and undistorted (a window wider than the artwork shows black at the sides, never a stretch); no console errors.

<!-- The agreed assumptions are baked into the steps: glass drawn with p5 shapes approximating drink-layout.png and grey = a triangle under the bowl (Step 1); count rule = a drop counts the moment it enters the liquid (lands on the surface or spawns in it); a drop whose fall path misses the glass falls while fading and never counts (Step 12, replacing Step 7); drop motion = gravity fall with sway in air, squash on landing with no splash particles, viscous sink in the liquid, slight slide to level the heap, settled drops freeze (Steps 12-13); one drop per note = first tap + each pitch-step change, holding still adds none (Step 6); ~50 counted drops = full as a packed heap allowing only slight overlap, dot size and count tuned by eye (Steps 8, 13); pitch = pentatonic steps across screen width, left low / right high, ~100 ms glide, vertical ignored (Step 5); hue = full 360° wheel across the pitch range, each drop keeps its color (Step 6); replay = recorded notes in one ~12 s sweep (~240 ms each at 50), same sine, screen untouched, repeatable, tap restarts from the top (Step 9); full = no new notes, tap only replays (Steps 8-9); first tap anywhere removes the words (Step 3); reused from Glass Harp: lockGestures, sine + ~30 ms fade-in, one finger, left-click-only guard, windowResized, blockSelection, enableSoundTap first (Steps 2-4, 11; Step 15 supersedes that call with enablePermissionsTap(['sensors','sound']) — same one box, plus motion); reload resets = browser default (Step 10); (Steps 1, 6); hint text = "tap and hold anywhere to pour a drink" (Steps 1, 14); replay words = appear at first full, latch until reload, survive later un-counting (Steps 14, 16); tilt = deviation from neutral captured at the unlock tap, slow viscous drift on all drops scaled by lean, rotationX/Y/Z read in radians (no angleMode change — it would break the sway), wake lock from mouseReleased so the screen doesn't dim, laptop sensors read 0 = no-op (Step 15); walls always hold, only the mouth-line hold releases while leaning, fall-out = centre more than half a radius above the liquid line so brim-full compression can't fake a spill (Step 16); fall-out = un-count (gate reopens below full), cut from future replays, 0.5 s fade, doom is one-way (Step 16); never-entered drops fade from the moment they fall below the bowl, replacing Step 12's spawn-time miss prediction (Step 16); tap during a running replay restarts from the top regardless of count, a running sweep keeps its snapshot (Steps 9, 16); after a spill below full a tap pours until full again (Step 16). -->

