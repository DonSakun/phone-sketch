let wordsGone = false;

let osc = null;
let holding = false;
let holdPointerId = null;
let holdBase = 0;
let currentStep = 0;
let lastNoteIndex = -1;

// A major pentatonic across the plan's range: A3 B3 C#4 E4 F#4 A4 (220-440 Hz)
const PENTATONIC = [220, 246.94, 277.18, 329.63, 369.99, 440];

// The 11 steps of the ladder, in semitones from this hold's base note:
// -5 = circle's left edge (one octave down), 0 = center (base note),
// +5 = right edge (one octave up). Every rung is a pentatonic step.
const PENTATONIC_STEPS = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableSoundTap('Tap to enable sound');
}

function draw() {
  background(0);

  noStroke();
  fill(255);
  // 78% of the width on a portrait phone; capped by height only so the
  // hint text below never lands inside the circle on wide (laptop) windows.
  circle(width / 2, height / 2, circleDiameter());

  if (!wordsGone) {
    textSize(constrain(width * 0.045, 14, 22));
    textAlign(CENTER, CENTER);
    text('tap inside the circle and hold', width / 2, height * 0.9);
  }
}

// Tap inside the circle: remove the words, start the note if no other
// finger is already holding. Taps outside aren't detected at all, and the
// sound-enable box tap doesn't count (its target is the overlay, not the
// canvas). Only the first finger counts; extra fingers are ignored.
// Return false so p5-phone keeps handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  // Laptop: only a left click counts as a tap. A right/middle press
  // (trackpad two-finger tap, right-click) must not start a note.
  if (e && e.button !== undefined && e.button !== 0) return false;
  if (dist(mouseX, mouseY, width / 2, height / 2) > circleDiameter() / 2) return false;

  wordsGone = true;
  if (!holding) {
    holding = true;
    holdPointerId = e && e.pointerId !== undefined ? e.pointerId : null;
    startNote();
  }
  return false;
}

// While holding, horizontal position picks the pentatonic step; the note
// slides ~100 ms to the new step and holds there until the finger moves
// to another step. Vertical position is ignored. Other fingers ignored.
function mouseDragged(e) {
  if (!holding) return false;
  if (e && e.pointerId !== undefined && holdPointerId !== null && e.pointerId !== holdPointerId) return false;

  // Slid outside the circle: the touch is undetected -> the note stops
  // right away. Re-entering does not start it again; only a new tap
  // inside the circle and hold does (mousePressed, !holding).
  if (dist(mouseX, mouseY, width / 2, height / 2) > circleDiameter() / 2) {
    holding = false;
    stopNote();
    return false;
  }

  const step = stepAt(mouseX);
  if (step !== currentStep) {
    currentStep = step;
    osc.freq(stepFreq(step), 0.1); // ~100 ms slide between steps
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

function startNote() {
  if (!osc) {
    osc = new p5.Oscillator('sine');
    osc.amp(0, 0);   // start silent, no ramp
    osc.start();
  }
  holdBase = pickNote();
  currentStep = stepAt(mouseX);
  osc.freq(stepFreq(currentStep)); // instant, at the pressed position
  osc.amp(0.3, 0.03);              // ~30 ms fade-in, no click
}

function stopNote() {
  if (osc) osc.amp(0, 0.03); // quick fade-out, no click
}

// Horizontal position -> one of the 11 steps across the circle.
function stepAt(x) {
  const r = circleDiameter() / 2;
  return constrain(round(map(x, width / 2 - r, width / 2 + r, -5, 5)), -5, 5);
}

function stepFreq(step) {
  return holdBase * pow(2, PENTATONIC_STEPS[step + 5] / 12);
}

// Random base note, never the same twice in a row.
function pickNote() {
  let i = floor(random(PENTATONIC.length));
  if (i === lastNoteIndex) {
    i = (i + 1 + floor(random(PENTATONIC.length - 1))) % PENTATONIC.length;
  }
  lastNoteIndex = i;
  return PENTATONIC[i];
}

function circleDiameter() {
  return min(width * 0.78, height * 0.72);
}

// Laptop window resized (or the phone's URL bar hides) -> keep the canvas
// full-screen, so the black still reaches every edge.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
