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
  circle(width / 2, height / 2, min(width * 0.78, height * 0.72));

  textSize(constrain(width * 0.045, 14, 22));
  textAlign(CENTER, CENTER);
  text('tap inside the circle and hold', width / 2, height * 0.9);
}
