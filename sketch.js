// Making a drink — V1
// Steps so far: the screen (1), sound unlock (2), words disappearing (3).
// Layout approximates references/drink-layout.png.

let wordsGone = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableSoundTap('Tap to enable sound');
}

function draw() {
  background(0);
  drawGlass();
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

// The first tap anywhere on the canvas removes the words for good. The
// sound-enable box tap doesn't count (its target is the overlay, not the
// canvas), so the words survive until the first real touch — a bug that
// testing caught in Glass Harp. Return false so p5-phone keeps handling
// the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  wordsGone = true;
  return false;
}
