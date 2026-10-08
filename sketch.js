let wordsGone = false;

let osc = null;
let holding = false;
let holdPointerId = null;
let lastNoteIndex = -1;

// A major pentatonic across the plan's range: A3 B3 C#4 E4 F#4 A4 (220-440 Hz)
const PENTATONIC = [220, 246.94, 277.18, 329.63, 369.99, 440];

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
  if (dist(mouseX, mouseY, width / 2, height / 2) > circleDiameter() / 2) return false;

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

function startNote() {
  if (!osc) {
    osc = new p5.Oscillator('sine');
    osc.amp(0, 0);   // start silent, no ramp
    osc.start();
  }
  osc.freq(pickNote());   // base note, instant
  osc.amp(0.3, 0.03);     // ~30 ms fade-in, no click
}

function stopNote() {
  if (osc) osc.amp(0, 0.03); // quick fade-out, no click
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
