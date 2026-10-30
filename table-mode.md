# Triangle Lab on the table

A spec for projecting Triangle Lab down onto an ordinary table and working it with your hands on the projected figure.
It is the smallest build that makes this real: a projector and a camera on an arm above the table, and a "table mode" in the web app.
No custom table, no new lessons, and no change to how a lesson draws or takes input.

## What we want

- **The figure on the table.**
  A lesson's figure, step column and buttons are projected onto the table in front of you, on a plain black field, so only the geometry is lit.
- **Hands on the figure.**
  Pinching over a projected vertex grabs that vertex, and dragging moves it under your fingers, as a mouse drag does on screen.
  Pinching over a projected button presses it.
- **A setup that takes a minute.**
  Turning table mode on and calibrating takes one button and a few seconds of watching spots flash, and survives a reload.

### Not in scope

- Building or modifying a table, rear projection, or anything that needs tools beyond a clamp.
- Touch detection (knowing that a fingertip is on the table rather than above it).
  Grabbing stays a pinch in the air.
- True-to-scale figures (a 3 cm side measuring 3 cm on the table); see "Further down the line".
- Correcting a projector that is not square to the table in software; the hardware is set up so it is.
- Multi-user use, or more than the two hands the tracker already follows.

## The one idea the design rests on

Hands are already a pointer (`src/hands`, and "Hands are a pointer" in [architecture.md](architecture.md)).
The tracker turns each MediaPipe landmark, which comes in normalised camera coordinates, into CSS pixels of the viewport, and everything downstream (pose, interpreter, pointer bridge, overlay, every lesson) works in those pixels.
The only place the selfie layout is assumed is that one conversion, `videoToScreen` in `src/hands/pose.ts`: an `object-fit: cover` fit of the video to the viewport, mirrored or not.

On a table the camera and the screen are related by a different map, a homography: the projective transform that takes the table plane as the camera sees it onto the table plane as the projector lights it.
Table mode is therefore one new way to build that conversion, plus a way to measure it, plus a page that hides the video it no longer needs to show.
Nothing downstream of the tracker changes.

## Hardware

The minimum rig, with what each part has to do.

| Part | Requirement | Suggested |
| --- | --- | --- |
| Projector | Native 1080p (not "4K supported" over a 480p panel), 300–500 ANSI lumens, 1/4" tripod thread, safe to run pointing straight down (vents not blocked, fan not orientation-sensitive). | A mini LED projector, $150–300. |
| Mount | Holds the projector and camera about 1 m above the table, pointing straight down, without sagging. | A light stand with a boom arm and a sandbag, or a desk-clamp overhead camera arm rated for 1 kg, $40–80. |
| Camera | Sees the whole projected area, at 720p or better and 30 fps. | An iPhone through Continuity Camera (Chrome lists it as a camera), or a USB webcam such as a C920. |
| Surface | Matte, light and plain, so the projection is bright and the tracker sees hands against a clean background. | Matte white or light-grey poster board, about A1. |
| Display link | The projector as a second display of the laptop. | HDMI, or USB-C to HDMI. |

### Two placement rules

1. **The camera sits right beside the projector lens and looks the same way.**
   A pinch happens in the air, 5–10 cm above the table, but calibration measures the table plane.
   If the camera and the projector see from (nearly) the same point, a point in the air and the point on the table under it along the projector's ray land on the same camera pixel, so the table-plane calibration is also right for a hand above the table.
   Every centimetre the camera sits off the lens becomes an offset between where you pinch and what you grab, and the offset grows with the height of your hand.
2. **The projector points straight down.**
   Then the projected image is a true rectangle, and a right angle in a lesson is a right angle on the table.
   The projector's keystone correction should be at zero or near it; it costs resolution, and a geometry app cannot afford a skewed image.

Dim the room.
Chrome runs full screen on the projector display.

## Changes to the web app

### 1. The camera map becomes a value

`tracker.ts` today computes `videoToScreen(l, videoSize, view, mirrored)` from the video element and the window.
It instead takes a camera map from its caller on each `detect` call:

```ts
/** How the camera relates to the screen: where a normalised camera point lands, and whether the map is mirrored. */
export interface CameraMap {
  toScreen(norm: XY): XY;
  mirrored: boolean;
}
```

There are two pure constructors in `pose.ts` (or a new `src/hands/cameraMap.ts` if `pose.ts` grows too far):

- `coverMap(video, view, mirrored)`: today's `videoToScreen`, unchanged in behaviour, with today's tests moved onto it.
- `tableMap(calibration, view)`: applies the calibration's homography (below) and scales its result to the viewport.

`mirrored` keeps its one job in the tracker, reading handedness.
For the table map it is derived, not stored: the map is mirrored when it reverses orientation, the sign of the determinant of its Jacobian at the centre of the camera frame.

`startHands` builds the map each frame from the page's state: the cover map in the ordinary layout, the table map in table mode.

### 2. Calibration as a pure core

The homography is measured by projecting spots and finding them in the camera image.
This needs no hands, no clicks and no judgement from the user, gives sub-pixel accuracy, and takes a few seconds.

**The pattern.**
Nine spots on a 3×3 grid at 10 %, 50 % and 90 % of the viewport's width and height.
Nine rather than the minimum four, so the fit is least squares and one bad spot shows up as a large residual instead of a silently wrong map.

**Finding one spot.**
For each spot the page shows an all-black field and captures a frame, then shows a white disc on black and captures another.
The spot is the luminance-weighted centroid of the pixels that brightened by more than a threshold between the two frames, in normalised camera coordinates.
A fresh dark frame per spot keeps the camera's auto-exposure drifting between spots from mattering.
Frames are read by drawing the video into a small offscreen canvas (about 320 px wide) and reading its pixels; capture waits for a few new camera frames after the page changes what it shows, so the camera's latency never captures the previous state.

**Fitting.**
The direct linear transform over the nine pairs, with each point set normalised first (centroid at the origin, mean distance √2) so the system is well conditioned, solved as least squares with the last entry fixed to 1.
That is an 8×8 normal-equation solve, small enough to write by hand without a linear algebra library.
The fit is rejected, with a reason the page shows, when fewer than six spots were found, when the points are degenerate (three collinear among the corners), or when the largest residual is more than 1 % of the viewport's diagonal.

**The core, as functions over values.**

| Function | In | Out |
| --- | --- | --- |
| `findSpot(dark, lit, width, height)` | Two luminance arrays and their size | A normalised camera point, or null |
| `fitHomography(pairs)` | Camera points and their viewport fractions | A 3×3 matrix and its residuals, or the reason it failed |
| `applyHomography(h, p)` | A matrix and a point | The mapped point |
| `isMirrored(h)` | A matrix | Whether it reverses orientation |
| `calibrationStep(state, event)` | The calibration's state and what just happened | The new state and its effects |

`calibrationStep` is the whole procedure as a state machine.
Events are `start`, `frameCaptured(luminance)` and `cancel`; effects are data the shell carries out: `show({ spot } | "black")`, `captureAfterFrames(n)`, `save(calibration)`, `fail(reason)`.
The shell is a thin loop in `src/hands/calibrate.ts` that draws the spots on a full-screen canvas, reads frames, feeds events and acts on effects.

**What is stored.**
The calibration maps camera coordinates to viewport fractions, not pixels, so it survives a change of window size on the same display.
It also records the viewport's aspect ratio, the camera's device id and its frame size; when any of those no longer match, the page treats the calibration as stale and asks for a new one rather than using a wrong map.
It lives in `localStorage` under `triangle-lab:table`, with table mode's on/off, wrapped in try/catch like the other stored settings.

### 3. Table mode on the page

Table mode is a setting of the device, like the camera choice, so it lives in the hands settings sheet (`panel.ts`), built from buttons like the rest of the sheet:

- **Table: On / Off.**
- **Calibrate**, shown while table mode is on, which runs the calibration over the whole viewport.

Turning table mode on with no valid calibration starts calibrating at once.

While table mode is on, the root element carries a `table` class, and the shared stylesheets:

- hide the camera video and the veil with `visibility: hidden`, never `display: none`, so the video keeps decoding frames for the tracker;
- set the background to true black (`#000`), so nothing but the figure and the chrome is projected.

The tracker still needs the camera when its picture is hidden.
Table mode therefore keeps the camera on, and the settings sheet's camera Off turns table mode off with it.
The camera switch in the top bar stays, since picking the overhead camera is part of setting up.

Both places that start hands, `src/page.ts` and `src/lab/main.ts`, get table mode through `startHands` with nothing of their own; the class and the map are set inside the hands module.

### 4. Gestures seen from above

Seen from above, the camera sees the back of the hand, and the held poses (thumbs-up, victory) were tuned on a hand facing a selfie camera.
Table mode does not change any gesture or its bindings.
Before relying on them, check on the rig whether pinch engages and releases cleanly, and whether the held poses fire, misfire or never fire.
If the held poses misfire, the fix is a table default with no poses bound, so steps are taken by pinching the on-screen step buttons, which already works.

Handedness from MediaPipe on a hand seen from above is also untested.
It only decides which interpreter a hand drives, and the default setting accepts both hands, so it matters only to someone who limits hands to one side.

## Testing

Unit tests, by plain equality on outputs:

- `coverMap` reproduces every existing `videoToScreen` case.
- `fitHomography` recovers a known homography from its nine exact pairs, recovers it within tolerance from pairs with noise added, rejects collinear corners, and reports a planted outlier as the largest residual.
- `applyHomography` of the fitted matrix sends each camera point onto its viewport fraction.
- `isMirrored` is true for a reflection, false for a rotation, and false for the identity.
- `findSpot` finds a synthetic disc on a synthetic background to within a tenth of a pixel, ignores a uniform brightening of the whole frame below the threshold, and returns null on two identical frames.
- `calibrationStep` walks a full run from `start` to `save`, fails with its reason when spots are missing, and returns to idle on `cancel`.
- The stored calibration reads back what was written, and a changed aspect ratio, camera or frame size reads as stale.

The headless run of every lesson is unaffected, since table mode is off by default.

On the rig, by hand:

- After calibrating, a fingertip held on each projected grid spot puts the hand cursor ring on it, at table height and 10 cm above it.
- Dragging a vertex across the whole projected area keeps it under the pinch.
- The projection shows no camera picture and a black field.

## Phases

1. **The rig.**
   Mount the projector and the camera, run any lesson on the projector with the camera off, and check the image is square, sharp and bright enough.
2. **The camera map.**
   Refactor the tracker to take a `CameraMap`, with `coverMap` only, and no change in behaviour.
3. **The calibration core.**
   `findSpot`, `fitHomography`, `applyHomography`, `isMirrored`, `calibrationStep` and storage, with their tests.
4. **Table mode.**
   The settings, the calibration shell, the page class and stylesheet rules, and `tableMap` in `startHands`.
5. **On the rig.**
   The hand checks under "Testing", the gesture check under "Gestures seen from above", and the README and architecture.md sections that describe table mode.

## Open questions

- Do the projector's own light and the camera's auto-exposure interfere with hand tracking?
  The hand is lit by the projection, so a bright white figure on a hand might wash out its landmarks.
  If so, the camera's exposure may need locking after calibration, through `applyConstraints` where the browser allows it.
- Is the step column readable on the table at the projected size, or does table mode want larger type?
- Does the Continuity Camera iPhone stay connected for a whole session, or does it drop when the phone locks?

## Further down the line

- **True scale.**
  Measure one known length on the table (a ruler under two spots), and draw the stage so a unit is a centimetre.
- **Software keystone.**
  Pre-warp the page with a CSS `matrix3d` so a projector that cannot point straight down still draws a true rectangle.
- **The step column on the laptop.**
  Show the directions on the laptop's own screen, leaving the table for the figure alone.
- **Touching the table.**
  Use the fingertip's shadow, or the hand's depth from MediaPipe's world landmarks, to tell a fingertip on the table from one above it, so a tap on the table can grab without a pinch.
- **Height compensation.**
  For a camera that cannot sit beside the lens, a second calibration at a known height above the table lets the map account for how high the hand is.
