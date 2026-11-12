# Plan: Making a drink

## The experience

Before it starts, the screen is dark, with white glass shape in the middle. 
Touch detect anywhere on the screen.
With the small words "tap anywhere to pour a drink"
near the top. The words go away on the first tap.

When one person tap on the screen, play a note at random.
If the touch moves in any direction, play a slightly different pitch from the previous one.
The pitch does not change if the touch doesn't move.
At the same time, create small circle at random color, with every pitch change change the hue slightly.
The small circle filled up the grey area on the screen. 

The note and small circle stop once the touch is undetected.
The note and small circle stop once the small circle filled up the grey area.

## Input, transformation, output, fallback
- Input: where does the phone detect touch on the screen.
- Transformation: plays a random note instantly. create  small circles that filling up a glass.
- Output: The person hears a note and see the small circles.
- Fallback: on a laptop, click and hold count as tap and hold, moving the mouse counts as moves touch, so I can
  test without a phone.

## References
| File | Use it as | Take |
|---|---|---|---|
| references/drink-layout | layout: match this | where the glass sits (middle), its size, the small text at the top, nothing else on screen
| references/mood | inspiration: the feel | color visuals | [the rest] |

## Limits
- Change only sketch.js, plus the one p5.sound line in index.html (agreed with the user).
- Portrait phone, full-screen canvas.
- Not now: other people's phones.

## How I will check it
- On my laptop: click and hold plays a note, moving a mouse change its pitch slightly.
- On my phone: tap inside the circle and hold plays a note, moving a touch change its pitch slightly.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

