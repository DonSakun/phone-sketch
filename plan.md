# Plan: Glass Harp

## Project
Phone as glass harp, to plays, for many phones in one space.

## The question
1. Does the notes play when tap and hold?
2. When fingers swirl, does it play a melody?

## The experience

Before it starts, the screen is dark, with white circle in the middle. 
Touch only detect within the circle.
With the small words "tap and hold"
near the bottom. The words go away on the first tap.

When one person tap and hold within the circle, play a note at random.
If the touch moves in any direction, play a slightly different pitch from the previous one.
The pitch does not change if the touch doesn't move.

The note stop once the touch is undetected.

## Input, transformation, output, fallback
- Input: where does the phone detect touch on the screen.
- Transformation: plays a random note instantly.
- Output: The person hears a note. 
- Fallback: on a laptop, click and hold count as tap and hold, moving the mouse counts as moves touch, so I can
  test without a phone.

## References
| File | Use it as | Take | Leave |
|---|---|---|---|
| references/glass-harp-layout | layout: match this | where the circle sits (middle), its size, the small "tap to hold" at the bottom, nothing else on screen | the paper colour
| references/mood | inspiration: the feel | black and white visuals | [the rest] |

## Limits
- Change only sketch.js.
- Portrait phone, full-screen canvas.
- Not now: other people's phones.

## How I will check it
- On my laptop: click and hold plays a note, moving a mouse change its pitch slightly.
- On my phone: tap and hold plays a note, moving a touch change its pitch slightly.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

## Changes
<!-- Yours. One line each time you change this plan, and why. -->
