let wordsGone = false;

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

// First tap inside the circle removes the words for good; taps outside
// don't count. The sound-enable box tap bubbles up to here too (its target
// is the overlay div, not the canvas), so it must not count either.
// Return false so p5-phone keeps handling the gesture.
function mousePressed(e) {
  if (e && e.target && e.target !== document.querySelector('canvas')) return false;
  if (dist(mouseX, mouseY, width / 2, height / 2) <= circleDiameter() / 2) {
    wordsGone = true;
  }
  return false;
}

function circleDiameter() {
  return min(width * 0.78, height * 0.72);
}
