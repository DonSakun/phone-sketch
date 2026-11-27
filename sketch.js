// Making a drink — V1
// Steps so far: the screen (1), sound unlock (2), words disappearing (3),
// note on hold (4), move changes the pitch (5), drops appear and stay (6),
// inside-grey counts / outside fades (7), the drink is done (8),
// swirl to hear the replay (9), reload resets (10), laptop fallback (11),
// drops fall into the glass (12), drops sink and pile up (13), the words (14),
// the glass leans (15), the drink pours out (16), the background image (17),
// the random drop palette (18).
// Layout approximates references/drink-layout.png; the artwork behind it is
// references/drink-background.png.

let wordsGone = false;

// Step 14: the first time the drink reads full, "swirl to hear the
// melody replay." appears near the top — a latch, so it stays until a
// reload even if (Step 16) drops later spill back out of the glass.
let replayWords = false;

// Step 15 — the lean. Tilt is measured as a deviation from neutral:
// the first real sensor reading after the unlock tap is "where you were
// holding the phone", so a phone held at a casual angle doesn't drift on
// its own. Level back to neutral and everything settles and re-freezes.
let neutralX = null;
let neutralY = null;

// Screen Wake Lock (the skill's pattern; not a p5-phone feature): only
// touches reset the phone's auto-lock timer, and tilting is hands-free,
// so ask from mouseReleased or the screen dims mid-lean.
let wakeLock = null;
let wantAwake = false;

// Every note leaves a drop: {x, y, col, step, inside, fadeStart, doomed,
// spawnT, squashAt, squashAmp, squashDur, vx, vy, settled, restMs}. The
// color is baked in at creation (it follows the note's pitch along this
// load's palette — Step 18) and step remembers the pitch for the replay.
// Steps 12-13: a drop that reaches
// the liquid sinks viscously into the heap and freezes there. Step 16:
// a drop is counted the moment it crosses the surface line inside the
// opening (watched live, no spawn-time prediction); a counted drop that
// rises half a radius above the line while the mouth is open pours out
// (doomed — un-counted, cut from every future replay, given the 0.5 s
// miss-fade); one that never enters starts fading the moment it falls
// below the bowl.
let drops = [];

// How many counted drops (inside the grey) fill the glass. Fixed, so a
// reload always takes the same amount of pouring. Tuned by eye (Step 13):
// the dots are big, so ~50 of them — packed with only a slight squish —
// read as a full glass; 100 would mound out of the rim.
const FULL_COUNT = 150;

// A drop that has lain almost still this long is at rest: it freezes
// into the heap (with one tiny squish). Also how a sinking drop's lazy
// sway fades out as it comes to rest.
const REST_MS = 700;

// Counted drops so far — inside the grey only; fading ones don't count.
let poured = 0;

// Replay state (Step 9): the queue of counted notes in pour order, where
// in it we are, and when the next one is due. See startReplay/advanceReplay.
let replayQueue = [];
let replayIndex = 0;
let replaying = false;
let replayNextAt = 0;

let osc = null;
let holding = false; // a live note is sounding (the tracked finger is pouring)
let currentStep = 0;

// Step 9 (revised) — the swirl. One finger is tracked from press to lift;
// while it is down its path is watched for a full circle, which starts
// the replay (a tap never does). Lifting that finger stops a running
// sweep — hold to listen.
let fingerDown = false;
let fingerId = null;  // its pointerId; null = unknown (older mouse events)
let swirlPath = [];   // recent path points {x, y, t}, windowed and step-filtered
let tapCount = 0;     // real taps on the canvas — the hint goes on the second

// Swirl thresholds, tuned by eye on the phone.
const SWIRL_WINDOW_MS = 3000;   // finish the whole circle within ~3 s
const SWIRL_STEP_PX = 5;        // ignore moves smaller than this (tremor)
const SWIRL_RADIUS_FRAC = 0.07; // mean radius as a fraction of width
const SWIRL_TURN_FRAC = 0.9;    // fire at 90 % of a full turn — a hair under
                                // 360°, so closing the loop reliably counts

// The 11 pentatonic steps of the ladder, in semitones from the base note:
// -5 = screen's left edge (one octave down), 0 = center (base note),
// +5 = right edge (one octave up). Every rung is a pentatonic step.
const PENTATONIC_STEPS = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12];

// Fixed base note A3 — the pitch comes only from finger position:
// 110-440 Hz across the screen's 11 pentatonic steps.
const BASE_FREQ = 220;

// Step 18 — the drop palettes: the five gradient strips of
// references/drops-color-randomize.png, each sampled at 11 evenly
// spaced points across the strip (11 = the 11 pitch steps). setup()
// picks one row at random per page load, and a drop's color is its
// step's stop — step -5 (lowest, screen left) = the strip's left end,
// step +5 (highest, screen right) = its right end. The colors are
// exactly as in the image, opaque (drawDrops passes its own alpha).
const PALETTES = [
  ['#4C6080', '#4C6080', '#4C6A8C', '#4D83AB', '#6A86AE', '#CD839D', '#EC938A', '#F6BA79', '#F8D67E', '#FFDF9B', '#FFE1A9'],
  ['#84404D', '#84404D', '#8C4352', '#A84D64', '#BB5973', '#D67991', '#D9C28C', '#A5E1AB', '#7EE7D6', '#A8EADC', '#BBEADC'],
  ['#3B5080', '#3B5080', '#415F93', '#5F96E1', '#79B0FF', '#B3ABF5', '#FFABD4', '#FFB6CF', '#FFC5CD', '#FFCFCA', '#FFD2CA'],
  ['#3179B7', '#3179B7', '#338ABC', '#3CC0C9', '#60C1C9', '#CFAFC0', '#FFAFB6', '#FFCFB4', '#FFE8B0', '#FFEAB8', '#FFEABF'],
  ['#5F5181', '#5F5181', '#685491', '#936BDD', '#AE74E9', '#EB84E1', '#FD94BE', '#FFAE8A', '#FFB89C', '#FFC4C2', '#FFC7CD'],
];

// Which strip this load uses — picked in setup(), so every reload
// gets a fresh palette (the drops reset with it — Step 10).
let paletteIndex = 0;

// Step 17 — the background artwork, loaded once in setup() and drawn
// full-height behind everything (see draw()).
let bgImage;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0); // black shows while the image loads
  lockGestures();
  blockSelection();
  // Step 18: one of the five strips at random — a fresh palette each load.
  paletteIndex = floor(random(PALETTES.length));
  // Step 15: one box unlocks sound AND motion — iOS shows its motion
  // permission dialog right after this tap (Android shows nothing).
  enablePermissionsTap(['sensors', 'sound'], 'Tap to enable sound + motion');
  // The browser drops the wake lock while the page is hidden; the skill's
  // pattern asks again when it comes back (iOS only needs the first tap).
  document.addEventListener('visibilitychange', () => {
    if (wantAwake && document.visibilityState === 'visible') requestWakeLock();
  });
  // Step 17: p5 2.x loads assets here, not in preload() — await it last,
  // so the draw loop starts only once the image is ready (frame 1 has it).
  bgImage = await loadImage('references/drink-background.png');
}

function draw() {
  background(0);
  // Step 17: the artwork, full height at its own aspect ratio — the width
  // follows the height, so on a portrait phone the sides crop away evenly
  // and nothing stretches. Recomputed each frame, so windowResized() needs
  // nothing extra; drawn as-is (no tint, no filter) so the hue is untouched.
  if (bgImage) {
    const w = bgImage.width * height / bgImage.height;
    image(bgImage, (width - w) / 2, 0, w, height);
  }
  drawGlass();
  drawDrops();
  if (replayWords) drawReplayWords(); // Step 14: from first full, for good
  else if (!wordsGone) drawHint();     // the two share the one spot at the top
  advanceReplay(); // the sweep, once a swirl has started it
}

// The glass: white body (bowl + stem + foot), with the grey liquid drawn on
// top of the bowl so a white rim stays visible. All geometry is in screen
// fractions, so it matches the reference drawing at any portrait size.
function drawGlass() {
  const w = width;
  const h = height;

  noStroke();

  // White bowl. The grey liquid triangle is drawn on top of it, which
  // leaves the white edge showing as the glass rim.
  fill(255);
  triangle(0.06 * w, 0.245 * h, 0.94 * w, 0.245 * h, 0.5 * w, 0.575 * h);

  // Grey liquid — a triangle under the bowl's top edge.
  fill(155);
  const liquid = liquidTriangle();
  triangle(liquid[0].x, liquid[0].y, liquid[1].x, liquid[1].y, liquid[2].x, liquid[2].y);

  // Stem, slightly flared toward the foot.
  fill(255);
  quad(
    0.485 * w, 0.56 * h,
    0.515 * w, 0.56 * h,
    0.528 * w, 0.858 * h,
    0.472 * w, 0.858 * h
  );

  // Foot.
  ellipse(0.5 * w, 0.872 * h, 0.65 * w, 0.038 * h);
}

// The grey liquid's three corners in pixels — the single source of truth:
// drawn here, and used again in Step 7 to decide whether a drop counts
// toward filling (drop center inside this triangle = counts).
function liquidTriangle() {
  return [
    { x: 0.115 * width, y: 0.262 * height },
    { x: 0.885 * width, y: 0.262 * height },
    { x: 0.5 * width, y: 0.545 * height },
  ]; 
}

// The white bowl's lowest point (drawGlass's bottom tip). Step 16: a
// drop that was never counted starts fading the moment it falls below
// the bowl — watched live every frame, no spawn-time prediction.
function bowlBottomY() {
  return 0.575 * height;
}

// Is (px, py) inside the grey liquid triangle? The classic sign test:
// the point must be on the same side of all three edges. A point exactly
// on an edge counts as inside.
function pointInTriangle(px, py, a, b, c) {
  const d1 = edgeSign(px, py, a, b);
  const d2 = edgeSign(px, py, b, c);
  const d3 = edgeSign(px, py, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function edgeSign(px, py, a, b) {
  return (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y);
}

function drawHint() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(max(14, 0.04 * width));
  text('tap and hold anywhere to pour a drink', width / 2, height * 0.1);
}

// Step 14 — the words that appear when the glass first reads full and
// never leave (until a reload), in the hint's spot near the top. The two
// lines share that one spot, so from first full the hint never draws
// again — even if the second tap (Step 3) hasn't happened yet.
function drawReplayWords() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(max(14, 0.04 * width));
  text('make one swirl then hold still,\n to hear the melody replay :D', width / 2, height * 0.1);
}

// Tap anywhere and hold: start one note at the touched position. The
// hint words survive the first tap and go on the second (Step 3 as
// revised). The sound-enable box tap doesn't count (its target is the
// overlay, not the canvas), so the words survive until the first real
// touch — a bug that testing caught in Glass Harp.
// Laptop: only a left click counts as a tap; right/middle must not start
// a note. Only the first finger counts; extra fingers are ignored.
// A tap never starts the replay (Step 9 revised): when the glass is full
// the press only tracks the finger, so a swirl can still fire, and while
// a sweep runs the sweep owns the sound. Return false so p5-phone keeps
// handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  if (e && e.button !== undefined && e.button !== 0) return false;
  if (fingerDown) return false; // only the first finger counts
  fingerDown = true;
  fingerId = e && e.pointerId !== undefined ? e.pointerId : null;
  tapCount++;
  if (tapCount >= 2) wordsGone = true; // the hint goes on the second tap
  swirlPath = [{ x: mouseX, y: mouseY, t: millis() }]; // watch for a circle
  if (replaying) return false; // the sweep owns the sound right now
  if (poured >= FULL_COUNT) return false; // full: a tap does nothing
  holding = true;
  startNote();
  return false;
}

// Lift (or a system cancel of the tracked finger) -> silence, and — hold
// to listen (Step 9 as revised) — a running sweep stops at once. A
// second finger lifting changes nothing.
function mouseReleased(e) {
  const id = e && e.pointerId !== undefined ? e.pointerId : null;
  if (fingerDown && (id === null || fingerId === null || id === fingerId)) {
    fingerDown = false;
    fingerId = null;
    swirlPath = [];
    if (holding) {
      holding = false;
      stopNote();
    }
    stopReplay();
  }
  // Step 15: keep the screen on while the hands are busy tilting. iOS
  // only counts a tap once the finger lifts, so ask here, not on press.
  const awake = wakeLock !== null && !wakeLock.released;
  if ('wakeLock' in navigator && !awake) {
    wantAwake = true;
    requestWakeLock();
  }
  return false;
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    // Refused (power saving, low battery, blocked iframe) — fine, skip.
  }
}

// While the tracked finger moves: its path always feeds the swirl
// detector (Step 9), and if a live note is on, horizontal position picks
// the pentatonic step — the note slides ~100 ms to the new step and one
// more drop is left there. While a sweep runs the sweep owns the
// oscillator, so the step and the drops still update (they join the next
// replay) but no frequency is written. Vertical position is ignored, a
// still finger never changes the step, and other fingers are ignored
// (only the tracked one counts).
function mouseDragged(e) {
  if (!fingerDown) return false;
  if (e && e.pointerId !== undefined && fingerId !== null && e.pointerId !== fingerId) return false;
  trackSwirl(mouseX, mouseY);
  if (!holding) return false;
  const step = stepAt(mouseX);
  if (step !== currentStep) {
    currentStep = step;
    if (!replaying) osc.freq(stepFreq(step), 0.1); // ~100 ms slide between steps
    addDrop();                                      // one more drop per pitch-step change
  }
  return false;
}

// Step 9 (revised) — watching the tracked finger for a swirl. Points are
// kept only a real step apart (a trembling finger adds nothing) and only
// for a few seconds (a slow wander never adds up); the strongest run of
// turning anywhere in that path is how much of a circle the finger has
// just drawn, and a full circle — 360° either way, wide enough to read
// as a circle rather than a scribble — starts the replay. Taking the
// strongest run (rather than the path's total) means an awkward approach
// stroke earlier in the path can't cancel the circle out. Firing clears
// the path, so one circle fires once: to restart a running sweep you
// make a new circle.
function trackSwirl(x, y) {
  const now = millis();
  const path = swirlPath;
  const last = path[path.length - 1];
  if (last && dist(last.x, last.y, x, y) < SWIRL_STEP_PX) return; // too small to steer
  path.push({ x: x, y: y, t: now });
  while (path.length > 1 && now - path[0].t > SWIRL_WINDOW_MS) path.shift();
  if (path.length < 6) return; // a circle needs a few corners

  // Signed turning at each vertex, as a running total (prefix sums): the
  // turning over any stretch of the path is then the difference of two
  // prefixes. Walk the prefixes once, keeping the earliest extreme in
  // each direction, and fire on the first run that both clears the
  // circle bar and swings wide enough. Checking candidates as they end
  // (rather than pairing the global max and min afterwards) matters: a
  // sharp reversal elsewhere in the path — the finger doubling back —
  // makes a huge dip in the prefixes, and pairing across that dip would
  // measure the wrong stretch of path for the width test.
  const turnAt = [0];
  let acc = 0;
  for (let i = 1; i + 1 < path.length; i++) {
    const a = atan2(path[i].y - path[i - 1].y, path[i].x - path[i - 1].x);
    const b = atan2(path[i + 1].y - path[i].y, path[i + 1].x - path[i].x);
    let d = b - a;
    while (d > PI) d -= TWO_PI;
    while (d < -PI) d += TWO_PI;
    acc += d;
    turnAt.push(acc);
  }

  // Does the stretch path[lo..hi+1] swing wide enough to read as a
  // circle? — its mean radius from its own centre, so a scribble in
  // place never counts.
  const wideEnough = (lo, hi) => {
    const sub = path.slice(lo, hi + 2);
    let cx = 0;
    let cy = 0;
    for (const p of sub) { cx += p.x; cy += p.y; }
    cx /= sub.length;
    cy /= sub.length;
    let r = 0;
    for (const p of sub) r += sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
    return r / sub.length >= SWIRL_RADIUS_FRAC * width;
  };

  const bar = SWIRL_TURN_FRAC * TWO_PI;
  let runMin = turnAt[0];
  let iRunMin = 0;
  let runMax = turnAt[0];
  let iRunMax = 0;
  for (let k = 1; k < turnAt.length; k++) {
    // a run climbing (one way round) or dipping (the other way)
    if (turnAt[k] - runMin >= bar && wideEnough(iRunMin, k)) {
      swirlPath = []; // a fresh circle is needed to fire again
      startReplay();
      return;
    }
    if (runMax - turnAt[k] >= bar && wideEnough(iRunMax, k)) {
      swirlPath = [];
      startReplay();
      return;
    }
    if (turnAt[k] < runMin) { runMin = turnAt[k]; iRunMin = k; }
    if (turnAt[k] > runMax) { runMax = turnAt[k]; iRunMax = k; }
  }
}

// One sine, reused for every note — created on first use, which is
// always after the sound-enable tap has unlocked audio.
function ensureOsc() {
  if (!osc) {
    osc = new p5.Oscillator('sine');
    osc.amp(0, 0);   // start silent, no ramp
    osc.start();
  }
}

// The note: a sine at the pressed position, fading in over ~30 ms so it
// starts without a click.
function startNote() {
  ensureOsc();
  currentStep = stepAt(mouseX);
  osc.freq(stepFreq(currentStep)); // instant, at the pressed position
  osc.amp(0.3, 0.03);              // ~30 ms fade-in, no click
  addDrop();                       // every new note leaves one drop at the finger
}

function stopNote() {
  if (osc) osc.amp(0, 0.03); // quick fade-out, no click
}

// Horizontal position -> one of the 11 pentatonic steps across the whole
// screen: far left = lowest note, far right = highest. Vertical position
// is ignored. Used at press (startNote) and while sliding (mouseDragged).
function stepAt(x) {
  return constrain(round(map(x, 0, width, -5, 5)), -5, 5);
}

function stepFreq(step) {
  return BASE_FREQ * pow(2, PENTATONIC_STEPS[step + 5] / 12);
}

// One drop at the finger, colored by the note's pitch: this load's
// random palette strip (Step 18) spans the playable range — lowest
// note = the strip's left end, highest note = the right end. The color
// is baked into the drop now, so every drop keeps its own color forever.
// Where it spawns decides its first fate (Steps 12-13, 16):
//  - inside the grey liquid: counted at once, then sinks into the heap;
//  - anywhere else: it falls — counted the moment it crosses the surface
//    line inside the opening, fading from the moment it falls below the
//    bowl without ever entering (Step 16's continuous rule replaced Step
//    12's spawn-time prediction). The note plays either way — sound
//    never depends on where the drop lands.
function addDrop() {
  const col = color(PALETTES[paletteIndex][currentStep + 5]);

  const x = mouseX;
  const y = mouseY;
  const liquid = liquidTriangle();
  const inside = pointInTriangle(x, y, liquid[0], liquid[1], liquid[2]);
  drops.push({
    x: x, y: y, col: col, step: currentStep,
    inside: inside,      // in the liquid and counted — true from the start only for inside spawns
    fadeStart: null,     // set by a spill (doomed) or a fall below the bowl
    doomed: false,       // Step 16: poured out — un-counted, never re-counts
    spawnT: millis(),
    squashAt: null,      // when the drop last squished — big on landing,
    squashAmp: 0,        // tiny joining the heap (see drawDrops)
    squashDur: 0,
    vx: 0, vy: 0,        // speed in px/s (air fall uses vy alone)
    settled: false,      // frozen into the heap
    restMs: 0            // how long it has lain almost still
  });
  if (inside) {
    poured++;
    checkFull();
  }
}

// Called after every counted drop: when the glass fills, the current
// note stops at once ("the note and small circle stop once filled") and
// the hold is over — from here no notes and no drops, until a reload
// (or until a spill drops the count back down and reopens the gate —
// Step 16; the words themselves are latched and stay put).
// A drop that lands on the surface runs this too: an in-flight drop can
// be the one that finishes the drink while a finger is still held down.
function checkFull() {
  if (poured >= FULL_COUNT) {
    holding = false;
    if (!replaying) stopNote(); // mid-sweep the sweep owns the sound
    replayWords = true; // Step 14: first full → the line appears for good
  }
}

// Step 15 — how hard the screen leans right now, in px/s². Deviation
// from neutral (the first real reading after the unlock tap), radians
// as-is — no angleMode change, the sway formula is radians. A small
// dead-band swallows hand jitter, then it scales with how far you lean;
// capped at ~46° so a spin can't fling the drink. Axes follow p5's own
// tilt idiom: rotationY -> screen x, rotationX -> screen y.
function tiltAccel() {
  if (!window.sensorsEnabled) return { x: 0, y: 0 };
  const rx = rotationX;
  const ry = rotationY;
  if (!Number.isFinite(rx) || !Number.isFinite(ry)) return { x: 0, y: 0 };
  if (neutralX === null) {
    // First real reading = where you were holding the phone. Exactly
    // (0, 0) is the pre-sensor initial value, not a posture — keep waiting.
    if (rx !== 0 || ry !== 0) {
      neutralX = rx;
      neutralY = ry;
    }
    return { x: 0, y: 0 };
  }
  const k = height * 1.2; // px/s² per radian of lean — slow and heavy
  return {
    x: k * deadband(constrain(ry - neutralY, -0.8, 0.8)),
    y: k * deadband(constrain(rx - neutralX, -0.8, 0.8))
  };
}

// Ignore leans under ~4.6° (a steady hand does nothing), then grow
// continuously from zero so crossing the line never snaps.
function deadband(v) {
  const a = abs(v);
  if (a <= 0.08) return 0;
  return (v < 0 ? -1 : 1) * (a - 0.08);
}

// Fall physics: from rest at the very top of the screen a drop reaches
// the liquid in ~0.6 s (the plan's 0.5-0.7 s), speeding up the whole
// way down.
function fallGravity() {
  const surfaceY = liquidTriangle()[0].y;
  return (2 * surfaceY) / (0.6 * 0.6);
}

// Step 13 — once a drop is in the liquid it sinks: a slow, viscous
// descent (drag holds it to a lazy terminal speed, much slower than the
// air-fall), squeezing into the pile with only a slight squish (centres
// rest 8 % closer than two radii), sliding toward the low side so the
// heap levels out, and freezing for good once it has lain still for
// REST_MS — with one tiny squish as it joins the heap. The bowl's
// sloped walls keep every whole drop inside the grey; settled drops are
// immovable, so the pile keeps its shape while later drops build on it.
// Step 15 — the lean (tilt, px/s²): it slides the whole liquid around
// and wakes the frozen heap, which re-freezes once you level the phone.
// Step 16 — while leaning the mouth-line hold releases (the walls still
// hold), and a counted drop whose centre rises more than half a radius
// above the line pours out: un-counted, cut from the replay, doomed to
// the 0.5 s miss-fade. Levelled, the mouth shuts again and nothing can
// leave except over the rim.
function updateLiquid(r, dt, now, tilt) {
  const liq = liquidTriangle();
  const A = liq[0];
  const B = liq[1];
  const C = liq[2];
  const surfaceY = A.y;
  const inX = (A.x + B.x + C.x) / 3; // any point inside the bowl — used
  const inY = (A.y + B.y + C.y) / 3; // to orient the wall normals
  const rest = 2 * r * 0.92;         // centres this close = 8 % squish
  const sinkG = height * 0.4;        // px/s² — a slow, heavy sink
  const drag = 3.5;                  // 1/s → terminal ≈ 0.11 × height/s
  const settleSpeed = 15;            // px/s: slower than this = at rest

  // 0) Step 15: a real lean wakes the frozen heap — it slides like the
  //    drink it is — and once you level out it settles and re-freezes
  //    through the normal REST_MS path below.
  if (tilt.x !== 0 || tilt.y !== 0) {
    for (const d of drops) {
      if (d.inside && d.settled) {
        d.settled = false;
        d.restMs = 0;
      }
    }
  }

  // 1) Remember where each sinking drop started this frame, then sink it.
  for (const d of drops) {
    if (!d.inside || d.settled) continue;
    d.fx = d.x;
    d.fy = d.y;
    d.vy += sinkG * dt;
    d.vx += tilt.x * dt; // Step 15: the lean slides the liquid sideways
    d.vy += tilt.y * dt; // ...and adds to (or fights) the slow sink
    d.vx -= d.vx * min(1, drag * dt);
    d.vy -= d.vy * min(1, drag * dt); // drag → terminal velocity, no plunge
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }

  // 2) Squeeze overlapping drops apart to `rest` — soft particles, and
  //    contacts are inelastic (gooey), so nothing ever bounces. Two
  //    passes a frame settle deep piles faster.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!d.inside) continue;
      for (let j = i + 1; j < drops.length; j++) {
        const o = drops[j];
        if (!o.inside) continue;
        if (d.settled && o.settled) continue;
        let dx = o.x - d.x;
        let dy = o.y - d.y;
        let dist = sqrt(dx * dx + dy * dy);
        if (dist < 0.0001) {
          // Exactly coincident: nudge apart sideways instead of dividing by zero.
          dx = (i % 2 === 0 ? 1 : -1) * 0.5;
          dy = -1;
          dist = sqrt(dx * dx + dy * dy);
        }
        if (dist >= rest) continue;
        const overlap = rest - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const shareD = d.settled ? 0 : (o.settled ? 1 : 0.5);
        const shareO = o.settled ? 0 : (d.settled ? 1 : 0.5);
        if (shareD > 0) {
          d.x -= nx * overlap * shareD;
          d.y -= ny * overlap * shareD;
          const vn = d.vx * nx + d.vy * ny;
          if (vn > 0) { d.vx -= nx * vn; d.vy -= ny * vn; }
        }
        if (shareO > 0) {
          o.x += nx * overlap * shareO;
          o.y += ny * overlap * shareO;
          const vn = o.vx * nx + o.vy * ny;
          if (vn < 0) { o.vx -= nx * vn; o.vy -= ny * vn; }
        }
        // Level and squeezed: let them roll past each other instead of
        // wedging side by side where the bowl pinches — otherwise the
        // pair stalls mid-V and the heap never reaches the bottom.
        if (shareD > 0 && shareO > 0 && abs(dy) < rest * 0.5) {
          const shear = min(overlap * 0.4, 0.6);
          const dir = i % 2 === 0 ? 1 : -1;
          d.y += shear * dir;
          o.y -= shear * dir;
        }
      }
    }
  }

  // 3) Back inside the bowl. The walls always hold; the mouth line holds
  //    only while level — Step 16: leaning opens the rim so the drink
  //    can pour out over it (tiltAccel's dead-band means 0,0 = level).
  //    While the mouth is shut the two constraints fight at the rim —
  //    near a corner the wall's push points up, past the line — so
  //    alternate them a few rounds: each round slides the drop sideways
  //    out of the conflict, and the line clamp runs last, so nothing
  //    ever ends a frame outside the drink. (Settled drops were clamped
  //    every frame until they froze, and nothing moves them after that —
  //    which is why ending a frame outside would trap a drop there.)
  const mouthHeld = tilt.x === 0 && tilt.y === 0;
  for (const d of drops) {
    if (!d.inside || d.settled) continue;
    if (!mouthHeld) {
      // Leaning: only the walls hold — the drink can climb out.
      clampWall(d, r, A, C, inX, inY);
      clampWall(d, r, B, C, inX, inY);
      continue;
    }
    for (let round = 0; round < 8; round++) {
      clampWall(d, r, A, C, inX, inY);
      clampWall(d, r, B, C, inX, inY);
      if (d.y >= surfaceY) break;
      d.y = surfaceY;
      if (d.vy < 0) d.vy = 0;
    }
  }

  // 4) Step 16 — pour it out: a counted drop whose centre has risen more
  //    than half a radius above the line (only possible with the mouth
  //    open; the margin keeps brim-full compression from faking a spill)
  //    has fallen out — un-count it so the gate reopens, cut it from
  //    every future replay (it leaves the liquid, so startReplay skips
  //    it), and give it the miss treatment: a 0.5 s fade while it falls.
  //    Once doomed it stays doomed — fadeStart keeps it out of the
  //    landing rule, so drifting back in can never re-count it.
  for (const d of drops) {
    if (!d.inside || d.doomed) continue;
    if (d.y < surfaceY - r * 0.5) {
      d.doomed = true;
      d.inside = false;
      d.settled = false;
      d.restMs = 0;
      d.fadeStart = now;
      poured--;
    }
  }

  // 5) Freeze: almost still for REST_MS and the drop belongs to the
  //    heap — one tiny squish to show it settling in. A drop resting
  //    above the mouth line (possible only while the mouth is open)
  //    waits instead: it stays awake until the level clamp brings it
  //    back down, so nothing ever freezes outside the drink.
  for (const d of drops) {
    if (!d.inside || d.settled) continue;
    const moved = sqrt((d.x - d.fx) * (d.x - d.fx) + (d.y - d.fy) * (d.y - d.fy));
    if (moved / dt < settleSpeed) {
      d.restMs += dt * 1000;
      if (d.restMs >= REST_MS && d.y >= surfaceY) {
        d.settled = true;
        d.vx = 0;
        d.vy = 0;
        d.squashAt = now;
        d.squashAmp = 0.18;
        d.squashDur = 140;
      }
    } else {
      d.restMs = 0;
    }
  }
}

// Keep one whole drop inside a sloped wall of the bowl: the circle's
// centre must stay at least r from the wall line, on the side where
// (inX, inY) sits. Velocity into the wall is dropped on contact — the
// glass does not bounce, it can only slide down it.
function clampWall(d, r, P0, P1, inX, inY) {
  const ex = P1.x - P0.x;
  const ey = P1.y - P0.y;
  const len = sqrt(ex * ex + ey * ey);
  let nx = ey / len;
  let ny = -ex / len;
  if (nx * (inX - P0.x) + ny * (inY - P0.y) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const s = (d.x - P0.x) * nx + (d.y - P0.y) * ny;
  if (s < r) {
    d.x += nx * (r - s);
    d.y += ny * (r - s);
    const vn = d.vx * nx + d.vy * ny;
    if (vn < 0) {
      d.vx -= nx * vn;
      d.vy -= ny * vn;
    }
  }
}

// Drop size as a share of the screen width — back to twice the earlier
// size, by eye; with FULL_COUNT counted drops at this size, the grey
// reads as a full glass.
function dropRadius() {
  return width * 0.018;
}

function drawDrops() {
  noStroke();
  const r = dropRadius();
  const now = millis();
  const dt = max(min(deltaTime, 50) / 1000, 0.001); // seconds, capped so a
                                                    // stalled frame can't teleport a drop
  const g = fallGravity();
  const tilt = tiltAccel(); // Step 15: the lean, px/s² (0 when level)
  const liq = liquidTriangle();
  const surfaceY = liq[0].y; // the liquid's top edge

  updateLiquid(r, dt, now, tilt); // Step 13: in the liquid, everything sinks

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];

    if (!d.inside) {
      // In the air: accelerate down — the lean bends the fall sideways
      // and adds to (or fights) the gravity a little, all with a light
      // drag so the drift steadies instead of racing away.
      const prevY = d.y;
      d.vy += (g + tilt.y) * dt;
      d.vx += tilt.x * dt;
      d.vx -= d.vx * min(1, dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.fadeStart == null) {
        if (prevY <= surfaceY && d.y >= surfaceY &&
            d.x > liq[0].x && d.x < liq[1].x) {
          // Crosses the surface line inside the opening: counted right
          // now, big squash — and the liquid takes over from here
          // (updateLiquid sinks it onward). Step 16 watches the crossing
          // live instead of predicting it at spawn; a doomed or already
          // fading drop never lands, so a spill can't re-count.
          d.y = surfaceY;
          d.vy = 0;
          d.vx = 0;
          d.inside = true;
          d.squashAt = now;
          d.squashAmp = 0.35;
          d.squashDur = 180;
          poured++;
          checkFull();
        } else if (d.y > bowlBottomY()) {
          // Never entered: the moment it falls below the bowl it takes
          // the miss treatment (Step 16 — replaces Step 12's prediction).
          d.fadeStart = now;
        }
      }
    }

    // Where to draw it this frame (all sway is visual only): a quick
    // wobble in the air, a lazy one while it sinks — fading out as it
    // comes to rest — and none once it is frozen into the heap.
    let sway = 0;
    if (!d.inside) {
      sway = sin((now - d.spawnT) * TWO_PI / 300) * r * 0.6;
    } else if (!d.settled) {
      const fade = 1 - min(1, d.restMs / REST_MS);
      sway = sin((now - d.spawnT) * TWO_PI / 900) * r * 0.45 * fade;
    }
    const px = d.x + sway;
    const py = d.y;

    // Misses and spills both fade away over 0.5 s (Step 16: a doomed
    // pour gets exactly the miss treatment).
    let alpha = 255;
    if (d.fadeStart != null) {
      const t = (now - d.fadeStart) / 500;
      if (t >= 1) {
        drops.splice(i, 1); // fully faded — gone for good
        continue;
      }
      alpha = (1 - t) * 255;
    }
    fill(red(d.col), green(d.col), blue(d.col), alpha);

    // The squash: big when a falling drop hits the surface, tiny when a
    // sinking one joins the heap — the drop itself deforming, no splash
    // particles (visuals stay "drops only").
    let sx = 1;
    let sy = 1;
    if (d.squashAt != null && now - d.squashAt < d.squashDur) {
      const k = 1 - (now - d.squashAt) / d.squashDur;
      sx = 1 + d.squashAmp * k;
      sy = 1 - d.squashAmp * 0.86 * k;
    }
    ellipse(px, py, r * 2 * sx, r * 2 * sy);
  }
}

// A swirl on the notes (Step 9 as revised) replays every counted note,
// in the order it was poured: one fast sweep through your own drink. The
// screen does not change — no drops are added or removed. A new swirl,
// even mid-sweep, starts it again from the top; a tap never gets here.
function startReplay() {
  // A snapshot of the notes as they stand right now: a spill (Step 16)
  // cuts its drop from every future sweep, while a sweep already running
  // keeps the notes it started with. Notes made during a sweep join the
  // next one, never the running one.
  const queue = drops.filter(d => d.inside && !d.doomed).map(d => d.step);
  if (queue.length === 0) return; // nothing in the grey — leave it be
  replayQueue = queue;
  replayIndex = 0;
  replaying = true;
  replayNextAt = millis();
  ensureOsc();
  osc.amp(0.3, 0.03); // fade in at the start of the sweep
}

// The tracked finger lifted: silence at once (hold to listen, Step 9).
// Called from mouseReleased only — the sweep still ends on its own at
// ~12 s in advanceReplay.
function stopReplay() {
  if (!replaying) return;
  replaying = false;
  if (osc) osc.amp(0, 0.05);
}

// Called every frame: fire each note when its time comes. The spacing
// keeps the whole sweep about 12 s long whatever the count (about 240 ms
// per note at 50). If frames are slow (backgrounded tab), it catches up
// to wall-clock time instead of dragging out.
function advanceReplay() {
  if (!replaying) return;
  const perNote = max(15, round(12000 / replayQueue.length));
  while (replayIndex < replayQueue.length && millis() >= replayNextAt) {
    osc.freq(stepFreq(replayQueue[replayIndex]), 0.01); // ~10 ms glide
    replayIndex++;
    replayNextAt += perNote;
  }
  if (replayIndex >= replayQueue.length) {
    replaying = false;
    if (holding) {
      // The finger never lifted: hand the oscillator back to the live note.
      osc.freq(stepFreq(currentStep), 0.05);
      osc.amp(0.3, 0.05);
    } else {
      osc.amp(0, 0.05); // silence when the sweep ends
    }
  }
}

// Keep the canvas full-screen when the window changes size, so the
// black still reaches every edge (reused verbatim from Glass Harp).
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// iPhone: holding a finger shows the magnifier and starts selecting the
// page. lockGestures() blocks long-press menus, but iOS text selection is
// a separate mechanism, so turn it off for the whole page. Nothing on this
// screen is text to select. The CSS is injected from here so index.html
// keeps only its agreed p5.sound line.
function blockSelection() {
  const style = document.createElement('style');
  style.textContent =
    '*, *::before, *::after {' +
    ' -webkit-user-select: none; user-select: none;' +
    ' -webkit-touch-callout: none;' +
    ' -webkit-tap-highlight-color: transparent;' +
    '}';
  document.head.appendChild(style);
  document.addEventListener('selectstart', (e) => e.preventDefault());
}
