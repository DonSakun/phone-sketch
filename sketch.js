// Making a drink — V1
// Steps so far: the screen (1), sound unlock (2), words disappearing (3),
// note on hold (4), move changes the pitch (5), drops appear and stay (6).
// Layout approximates references/drink-layout.png.

let wordsGone = false;

// Every note leaves a drop: {x, y, col}. The color is baked in at
// creation (hue follows the note's pitch) and drops are never removed —
// Step 7 will add the fade for the ones that land outside the grey.
let drops = [];

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
// Return false so p5-phone keeps handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  if (e && e.button !== undefined && e.button !== 0) return false;
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

// The note: a sine at the pressed position, fading in over ~30 ms so it
// starts without a click. The same oscillator is reused for every note.
function startNote() {
  if (!osc) {
    osc = new p5.Oscillator('sine');
    osc.amp(0, 0);   // start silent, no ramp
    osc.start();
  }
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
  drops.push({ x: mouseX, y: mouseY, col: col });
}

// Drop size as a share of the screen width — halved once by eye, and
// Step 8 still tunes this number so ~40 counted drops read as a full glass.
function dropRadius() {
  return width * 0.0185;
}

function drawDrops() {
  noStroke();
  const r = dropRadius();
  for (const d of drops) {
    fill(d.col);
    circle(d.x, d.y, r * 2);
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
