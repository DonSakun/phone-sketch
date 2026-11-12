// Making a drink — V1
// Steps so far: the screen (1), sound unlock (2), words disappearing (3),
// note on hold (4), move changes the pitch (5), drops appear and stay (6),
// inside-grey counts / outside fades (7), the drink is done (8),
// replay on the full glass (9), reload resets (10).
// Layout approximates references/drink-layout.png.

let wordsGone = false;

// Every note leaves a drop: {x, y, col, step, inside, fadeStart}. The
// color is baked in at creation (hue follows the note's pitch) and step
// remembers the pitch for Step 9's replay. A drop whose center is inside
// the grey liquid stays forever; one on the black fades away over 0.5 s
// and is then removed.
let drops = [];

// How many counted drops (inside the grey) fill the glass. Fixed, so a
// reload always takes the same amount of pouring. Tuned by eye against
// the half-size dots: on a phone the grey triangle fits ~220 of them
// edge to edge, so 200 reads as full.
const FULL_COUNT = 200;

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
  enableSoundTap('Tap to enable sound');
}

function draw() {
  background(0);
  drawGlass();
  drawDrops();
  if (!wordsGone) drawHint();
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
  text('tap anywhere to pour a drink', width / 2, height * 0.1);
}

// Tap anywhere and hold: remove the words (first tap only, for good) and
// start one note at the touched position. The sound-enable box tap doesn't
// count (its target is the overlay, not the canvas), so the words survive
// until the first real touch — a bug that testing caught in Glass Harp.
// Laptop: only a left click counts as a tap; right/middle must not start
// a note. Only the first finger counts; extra fingers are ignored.
// When the glass is full, a tap replays all the counted notes instead
// of pouring (Step 9).
// Return false so p5-phone keeps handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  if (e && e.button !== undefined && e.button !== 0) return false;
  if (poured >= FULL_COUNT) {
    startReplay(); // the drink is done: tap = replay
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
  return false;
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
function addDrop() {
  const h = map(currentStep, -5, 5, 0, 360);
  colorMode(HSB, 360, 100, 100);
  const col = color(h, 75, 100);
  colorMode(RGB, 255);
  const x = mouseX;
  const y = mouseY;
  // Center rule: inside the grey = it stays (and will count toward
  // filling in Step 8); on the black = it fades away in 0.5 s. The note
  // plays either way — sound never depends on where the drop lands.
  const liquid = liquidTriangle();
  const inside = pointInTriangle(x, y, liquid[0], liquid[1], liquid[2]);
  drops.push({ x: x, y: y, col: col, step: currentStep, inside: inside, fadeStart: inside ? 0 : millis() });
  if (inside) {
    poured++;
    if (poured >= FULL_COUNT) {
      // The glass is full: the current note stops at once ("the note and
      // small circle stop once filled") and the hold is over — from here
      // no notes and no drops, until a reload.
      holding = false;
      stopNote();
    }
  }
}

// Drop size as a share of the screen width — halved once by eye; with
// FULL_COUNT counted drops at this size, the grey reads as a full glass.
function dropRadius() {
  return width * 0.0185;
}

function drawDrops() {
  noStroke();
  const r = dropRadius();
  const now = millis();
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.inside) {
      fill(d.col);
    } else {
      const t = (now - d.fadeStart) / 500; // 0.5 s fade
      if (t >= 1) {
        drops.splice(i, 1); // fully faded — gone for good
        continue;
      }
      fill(red(d.col), green(d.col), blue(d.col), (1 - t) * 255);
    }
    circle(d.x, d.y, r * 2);
  }
}

// A tap on the full glass replays every counted note, in the order it was
// poured: one fast sweep through your own drink. The screen does not
// change — no drops are added or removed. Tapping again (even mid-sweep)
// starts it again from the top.
function startReplay() {
  replayQueue = drops.filter(d => d.inside).map(d => d.step);
  if (replayQueue.length === 0) return;
  replayIndex = 0;
  replaying = true;
  replayNextAt = millis();
  ensureOsc();
  osc.amp(0.3, 0.03); // fade in at the start of the sweep
}

// Called every frame: fire each note when its time comes. The spacing
// keeps the whole sweep about 12 s long whatever the count (about 60 ms
// per note at 200). If frames are slow (backgrounded tab), it catches up
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
