// Making a drink — V1
// Steps so far: the screen (1), sound unlock (2), words disappearing (3),
// note on hold (4), move changes the pitch (5), drops appear and stay (6),
// inside-grey counts / outside fades (7), the drink is done (8),
// replay on the full glass (9), reload resets (10), laptop fallback (11),
// drops fall into the glass (12), drops sink and pile up (13), the words (14),
// the glass leans (15), the drink pours out (16).
// Layout approximates references/drink-layout.png.

let wordsGone = false;

// Step 14: the first time the drink reads full, "Tap again to hear the
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
// color is baked in at creation (hue follows the note's pitch) and step
// remembers the pitch for the replay. Steps 12-13: a drop that reaches
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
const FULL_COUNT = 50;

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
let holding = false;
let holdPointerId = null;
let currentStep = 0;

// The 11 pentatonic steps of the ladder, in semitones from the base note:
// -5 = screen's left edge (one octave down), 0 = center (base note),
// +5 = right edge (one octave up). Every rung is a pentatonic step.
const PENTATONIC_STEPS = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12];

// Fixed base note A3 — the pitch comes only from finger position (it
// "looks random" but is really position-driven), which is also what
// Step 6's hue wheel maps across: 110-440 Hz in total.
const BASE_FREQ = 220;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  blockSelection();
  // Step 15: one box unlocks sound AND motion — iOS shows its motion
  // permission dialog right after this tap (Android shows nothing).
  enablePermissionsTap(['sensors', 'sound'], 'Tap to enable sound + motion');
  // The browser drops the wake lock while the page is hidden; the skill's
  // pattern asks again when it comes back (iOS only needs the first tap).
  document.addEventListener('visibilitychange', () => {
    if (wantAwake && document.visibilityState === 'visible') requestWakeLock();
  });
}

function draw() {
  background(0);
  drawGlass();
  drawDrops();
  if (!wordsGone) drawHint();
  if (replayWords) drawReplayWords(); // Step 14: from first full, for good
  advanceReplay(); // while the glass is full, a tap sweeps through its notes
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
// never leave (until a reload), in the hint's spot near the top. Only
// one of the two lines is ever up: by full, the first tap has already
// removed the hint.
function drawReplayWords() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(max(14, 0.04 * width));
  text('Tap again to hear the melody replay.', width / 2, height * 0.1);
}

// Tap anywhere and hold: remove the words (first tap only, for good) and
// start one note at the touched position. The sound-enable box tap doesn't
// count (its target is the overlay, not the canvas), so the words survive
// until the first real touch — a bug that testing caught in Glass Harp.
// Laptop: only a left click counts as a tap; right/middle must not start
// a note. Only the first finger counts; extra fingers are ignored.
// When the glass is full — or a sweep is already running — a tap replays
// the counted notes instead of pouring (Steps 9, 16: mid-sweep the
// restart wins even if a spill has taken the count back down).
// Return false so p5-phone keeps handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  if (e && e.button !== undefined && e.button !== 0) return false;
  if (replaying || poured >= FULL_COUNT) {
    startReplay(); // full (or mid-sweep): tap = replay from the top
    return false;
  }
  wordsGone = true;
  if (!holding) {
    holding = true;
    holdPointerId = e && e.pointerId !== undefined ? e.pointerId : null;
    startNote();
  }
  return false;
}

// Lift (or a system cancel of the held finger) -> silence. A second
// finger lifting changes nothing.
function mouseReleased(e) {
  const id = e && e.pointerId !== undefined ? e.pointerId : null;
  if (holding && (id === null || holdPointerId === null || id === holdPointerId)) {
    holding = false;
    stopNote();
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

// While holding, horizontal position picks the pentatonic step; the note
// slides ~100 ms to the new step and holds there until the finger moves
// to another step. Vertical position is ignored, and a still finger
// never changes the step, so the pitch holds steady. Other fingers are
// ignored (only the one that started the note counts).
function mouseDragged(e) {
  if (!holding) return false;
  if (e && e.pointerId !== undefined && holdPointerId !== null && e.pointerId !== holdPointerId) return false;
  const step = stepAt(mouseX);
  if (step !== currentStep) {
    currentStep = step;
    osc.freq(stepFreq(step), 0.1); // ~100 ms slide between steps
    addDrop();                     // one more drop per pitch-step change
  }
  return false;
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

// One drop at the finger, colored by the note's pitch: the full hue
// wheel (0-360°) spans the playable range — lowest note = one end,
// highest note = the other. The color is baked into the drop now, so
// every drop keeps its own hue forever.
// Where it spawns decides its first fate (Steps 12-13, 16):
//  - inside the grey liquid: counted at once, then sinks into the heap;
//  - anywhere else: it falls — counted the moment it crosses the surface
//    line inside the opening, fading from the moment it falls below the
//    bowl without ever entering (Step 16's continuous rule replaced Step
//    12's spawn-time prediction). The note plays either way — sound
//    never depends on where the drop lands.
function addDrop() {
  const h = map(currentStep, -5, 5, 0, 360);
  colorMode(HSB, 360, 100, 100);
  const col = color(h, 75, 100);
  colorMode(RGB, 255);
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
    stopNote();
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
  return width * 0.037;
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

// A tap on the full glass replays every counted note, in the order it was
// poured: one fast sweep through your own drink. The screen does not
// change — no drops are added or removed. Tapping again (even mid-sweep)
// starts it again from the top.
function startReplay() {
  // A snapshot of the notes as they stand right now: a spill (Step 16)
  // cuts its drop from every future sweep, while a sweep already running
  // keeps the notes it started with.
  replayQueue = drops.filter(d => d.inside && !d.doomed).map(d => d.step);
  if (replayQueue.length === 0) return;
  replayIndex = 0;
  replaying = true;
  replayNextAt = millis();
  ensureOsc();
  osc.amp(0.3, 0.03); // fade in at the start of the sweep
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
    osc.amp(0, 0.05); // silence when the sweep ends
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

//rerun