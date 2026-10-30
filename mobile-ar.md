# Triangle Lab on a phone, in the room

A spec for porting Triangle Lab to a mobile app whose reason to exist is augmented reality.
The app lays a lesson's figure onto the surfaces around the learner, lets them squish and morph it onto those surfaces, and lets them mark up photos with the same geometry.
It reuses the lessons as they are: the 114 lab lessons and the standalone pages keep their code, and the room becomes a new place to draw them and a new way to move their points.

## What we want

- **Geometry in the room.**
  A lesson's figure sits on a table, a wall or the floor, stays put as the learner walks round it, and can be dragged by touching the screen where it lies.
- **Squish and morph.**
  The figure can be stretched onto a quadrilateral the learner picks (a door, a book, a floor tile), pinned so its points sit on real points, or projected over furniture like a slide projector, and it animates between these.
  The morph is itself a transformation, and the app can say which properties it keeps.
- **Markup on photos.**
  A photo, taken in the app or picked from the library, can carry the same figures laid onto the planes in it.
- **The environment sensing of Apple's Measure app**: a reticle that finds surfaces, snapping to edges and corners, rectangles found on their own, occlusion behind real objects.
  We do not need millimetre precision.
  The target is that a figure looks fastened to its surface, without drifting more than a few pixels as the phone moves, and that its scale is right to within a few percent, on as many phones as possible and at its best on the ones with LiDAR.

### Not in scope

- Millimetre measurement, or anything sold as a measuring tool.
- Shared or multi-user AR sessions.
- The selfie-camera lab with hand tracking, which stays as it is today (flat, mirrored), inside the app as on the web.
- Combining with the primitives API ([primitives-api.md](primitives-api.md)); see "Further down the line" for what this design keeps open for it.

## The one idea the design rests on

Every lesson already draws in stage coordinates: a fixed stage, x from −8 to 8 and y from −5 to 5, which the shell fits onto the screen through a `View` (`src/lab/draw.ts`).
A lesson's figure is therefore independent of where the camera is.

So the port splits at stage space:

- **The figure** is a function of the lesson's state (its handles, sliders, step and time), computed in stage coordinates by the existing TypeScript, and recomputed only when that state changes.
- **The placement** maps stage coordinates onto the world: onto a plane, a quadrilateral, a mesh.
  It is native, because the world data it reads (anchors, meshes, depth) lives in the AR framework and is refined continuously, and the mapping must follow it without asking the lesson.
- **The camera** projects the world onto the screen every display frame, on the GPU, with no JavaScript involved.

Walking round a figure therefore costs no lesson code at all, and the only latency the learner can feel is while dragging, where a frame or two is acceptable.
Fidelity, the figure looking fastened to the table, is entirely in native hands, where it has to be.

```
            ┌───────── WebView (the existing site, bundled) ─────────┐
 touch ───▶ │ lesson ── Draw ──▶ display list (stage coordinates)    │
 (stage)    │   ▲                        │                           │
            │   └── pointer in stage ◀─┐ │   steps, formula band,    │
            └──────────────────────────┼─┼── recall, menu (as today) ┘
                                       │ ▼
            ┌───────────── native AR shell ──────────────────────────┐
 camera ──▶ │ ARKit/ARCore ─▶ surfaces ─▶ placement: stage → world    │
            │                                   │                    │
            │ raycast: screen → world → stage ◀─┘   Metal: world →   │
            │                                       screen, per frame│
            └────────────────────────────────────────────────────────┘
```

## Platform

**Recommendation: a Capacitor app that bundles the built site in a WebView, over a native AR view written per platform, iOS first.**

The WebView runs every lesson, the step column, the formula band with KaTeX, the curriculum rail and the recall deck unchanged.
A native plugin owns the camera, the AR session, the placement and the rendering of the figure, in a view behind a transparent WebView.
Capacitor already supports this arrangement (plugins such as camera previews draw behind the WebView), and it packages the Vite build as the app's assets, so the app works offline.

Alternatives, and why not:

- **WebXR in the browser.**
  Safari on iPhone does not offer immersive AR sessions, and iPhone is the primary target, so this fails on the phone that matters most.
  (Worth rechecking at decision time; if it changes, the display list and placement design below carries over to a WebXR shell.)
- **Unity with AR Foundation.**
  One AR codebase for both platforms, but the lessons would have to be rewritten in C#, or run in an embedded JavaScript engine that Unity does not want to host, and KaTeX has no equivalent there.
  It trades 114 working lessons for a nicer AR abstraction.
- **Fully native, lessons rewritten in Swift and Kotlin.**
  Best possible feel, three copies of the curriculum, which is the opposite of maintainable.
- **Everything in the WebView, with the camera pose sent to JavaScript every frame.**
  The figure would trail the camera by the bridge's latency and visibly swim on the surface; it fails the fidelity goal.

Android follows iOS with the same WebView side and a second native shell over ARCore.
The bridge protocol and the placement semantics are written down once (below) so the two shells are two implementations of one spec, tested against the same fixtures.

## Changes to the web app

These land on the web first, change nothing a learner sees there, and are what the native shell consumes.

### 1. A display list underneath `Draw`

Today `Draw` writes straight to a `CanvasRenderingContext2D`, through the `View`, and notes what it drew in the `FigureIndex` alongside.
It should instead emit a display list: a plain array of primitives in stage coordinates, with their styling, which a renderer then interprets.

```ts
type Prim =
  | { kind: "path"; points: Vec[]; closed: boolean; stroke?: StrokeStyle; fill?: FillStyle; term?: string }
  | { kind: "arc"; center: Vec; r: number; from: number; to: number; stroke?: StrokeStyle; fill?: FillStyle; term?: string }
  | { kind: "label"; at: Vec; text: string; offsetPx: Vec; sizePx: number; color: string; term?: string }
  | { kind: "sprite"; src: string; at: Vec; width: number; rotate: number };

interface StrokeStyle { color: string; widthPx: number; dash?: number[]; glow?: boolean }
```

- Positions are in stage units; line widths, dash lengths, label sizes and label offsets are in screen pixels, as they are today.
  That is what lets the native renderer draw a two-pixel line two pixels wide however far away the table is.
- Arcs stay arcs, not polylines, so each renderer can flatten them to the tolerance its mapping needs.
- The web renderer is a small interpreter from `Prim[]` to the canvas, through the `View`.
- The figure index (`figure.ts`) is computed from the display list and a projection, rather than collected while drawing.
  The web passes the `View`; the native shell will pass its own projection (see "Terms and leader lines").
- Lessons do not change: they still call `g.segment`, `g.angle`, `g.label`.

This is the functional core and imperative shell split the project asks for, applied to drawing: a frame's figure becomes a value, which tests compare by equality, and the canvas and the AR view are two shells interpreting it.

One caveat to settle while doing it: `g.px(n)`, which lessons use to size things in stage units from screen pixels, has no single answer on a surface seen in perspective.
Under a placement it will answer at a nominal scale (the scale at the placement's centre as first placed).
A survey of lessons that use `px` for geometry rather than for decoration will say whether that is enough.

### 2. Three dimensions as a display list too

Eleven lessons draw solids by projecting 3D points through an `Orbit` themselves (`src/lab/solid.ts`).
In the room the orbit camera is the phone, so a solid should sit on the table as a solid, and the learner walks round it.
That needs those lessons to emit 3D primitives (`path3`, `face3`, `label3` in a solid's own units) that a renderer projects.
On the web the renderer projects through the `Orbit` as now; in AR a solid's placement is rigid, with a uniform scale.
The helpers in `solid.ts` become the place this happens, so the change in the lessons themselves should be mostly mechanical.

### 3. An immersive layout

`layoutChrome` (`src/lab/layout.ts`) gains a third arrangement for AR: the figure takes the whole screen, the current step shows in a translucent sheet along the bottom that can be pulled up to the full step list, and the formula band shrinks to a pill that expands on a tap.
It stays a pure function with the same tests: the chrome never covers the figure's box, at every common phone size, upright and on its side.

### 4. Lessons that cannot go into the room

A lesson that reads tracked hands from the selfie camera (`hand-protractor`) is flat only.
The lesson entry in `src/chapters/` gets an optional flag saying so, and the menu does not offer to place it.

## The native AR shell

### Responsibilities

- Run the AR session (ARKit's world tracking; ARCore's on Android) with plane detection, horizontal and vertical, and scene reconstruction and depth where the device has them.
- Find surfaces under the reticle, snap, and offer placements.
- Hold the current placement, and keep it fastened as the session refines anchors.
- Map the latest display list through the placement to world-space geometry, and render it over the camera every frame.
- Turn touches on the figure into pointer events in stage coordinates for the lesson.
- Capture scene photos, and host the photo editor.

It knows nothing about lessons, steps or formulas.
Like the lab shell, it is a functional core with a thin imperative edge: placements, their mappings and inverses, tessellation, snapping decisions and the morph between placements are pure Swift (and later Kotlin) over values, tested by equality; the session, the renderer and the bridge are the edge.

### Placement: how the stage meets the world

A placement is a value mapping stage coordinates to world points, with an inverse for input.

| Kind | Mapping | Keeps | What it is for |
| --- | --- | --- | --- |
| `screen` | the flat lab, as today | everything | the default, and the start of every morph |
| `plane` | rigid, with a uniform scale, onto a detected plane | lengths in ratio, angles, so similarity | a figure lying on a table or hanging on a wall |
| `quad` | the stage's corners onto four world points: projective within one plane, bilinear when the four are not coplanar | collinearity and cross-ratio (projective); nothing so neat (bilinear) | stretching the figure onto a door, a book, a tile |
| `pins` | fitted so chosen lesson points land on chosen world points: affine from three pins, projective from four, a smooth warp past that | depends on the fit, and the app says which | "make this triangle's corners the corners of the table" |
| `drape` | projected from a viewpoint, like a slide projector, onto whatever the rays hit | only which pieces touch which | seeing a figure fall over a sofa and a cushion |

The `Keeps` column is not decoration.
The Transformations chapter already teaches what survives an isometry, a stretch and a dilation ("What Survives?").
The room makes the next step visible: a quad placement is a projective map, under which the triangle's angles visibly lie but its straight lines stay straight, and a drape keeps almost nothing.
The formula band always reads the lesson's own mathematics, in stage space, so the lesson stays true while the picture of it bends.
A small badge on the figure names the placement's kind and what it keeps, and pressing it explains.

Scale: by default one stage unit is 5 cm, so the whole stage is 80 × 50 cm, a poster on a table.
A pinch on the figure while placing scales it, a two-finger twist turns it, and both snap to round values (1 cm, 5 cm, 10 cm per unit; quarter turns to the plane's edges).

### Squish and morph, as the learner sees it

1. The lesson opens flat over the back camera, as it does today on a phone.
2. A Place button shows a reticle that lies on whatever surface is under the centre of the screen, outlined, and named where the framework classifies it (floor, wall, table).
   Tapping it drops the figure onto the surface: the flat figure tips over and settles onto the plane, like a sheet of paper laid down.
3. In placement mode, the stage's four corners show as grips.
   Dragging one squishes the figure, turning the placement from `plane` into `quad`.
   A grip snaps to the corners of the plane's boundary, to the corners of rectangles the camera has found, and to edges, as the Measure app's reticle does.
4. "Fit to rectangle" stretches the figure onto a found rectangle in one tap.
5. Long-pressing a lesson point and then a place in the room pins it there; pinning three or four points refits the placement through them.
   A pinned point stops being draggable on the screen, because the room now owns it.
6. Drape projects the figure from where the phone is now onto every surface in view, and freezes it there; walk round to see it distorted, and tap Drape again to project afresh.

Every change of placement animates: each tessellated vertex moves from where the old placement put it to where the new one does, over about 400 ms, eased.
Because the two placements are just two maps from stage to world, the morph is a pointwise interpolation of them, and any placement morphs into any other.

### Touching the figure

A touch on the figure is a ray from the camera; the shell intersects it with the placement's surface and runs the placement's inverse to get a stage point.
For `plane` and `quad` that is a closed form, for `pins` a solve, and for `drape` it is the projector itself: the hit point, seen from the projector, is the stage point.
The shell sends that to the WebView as pointer events in stage coordinates, which the lab shell treats exactly like a mouse or a finger today.
Handles, their constraints (`Constraint` in `geo.ts`), and grab radii widened for a finger all work unchanged.

The shell owns gestures on the figure that are about the placement (pinch to scale, twist to turn, the corner grips); the lesson owns everything else.
Outside the figure's box, the WebView takes touches as it always has.

### Rendering

A Metal renderer of our own over the ARKit session, rather than RealityKit or SceneKit.
The content is thin vector diagrams on surfaces, and what makes them look right is all things a 3D engine is not built for:

- lines a constant number of screen pixels wide, anti-aliased, with dashes measured in pixels, drawn as ribbons expanded in the vertex shader;
- labels rasterised once into an atlas and drawn as small cards that face the camera from their anchor point, so a name stays readable from any angle;
- the focus glow on a term the reader is pointing at;
- occlusion: where the device has scene depth, a figure behind a real object is drawn faint and dashed rather than hidden, so it reads as "behind" and never just vanishes.

Tessellation is adaptive and done when the figure or the placement changes, not every frame.
Arcs are flattened finely enough that the mapped curve is smooth on screen; straight segments are subdivided too under any placement that bends lines (bilinear, smooth warps, drape), so that a line draped over a cushion follows it.
The result is world-space geometry cached on the GPU, which the camera then only reprojects.

KaTeX typesetting stays in the WebView, where the steps and formulas are.
Labels inside the figure are plain text today (`fillText` in `draw.ts`), so the atlas needs only a font.

### Terms and leader lines

Pointing at a term in a formula draws a line from it to the marks in the figure that show it (`terms.ts`).
In the app the WebView knows the term and where it is on the screen; the native shell knows where the figure's marks are on the screen this frame.
So the WebView sends the term's id and its screen rectangle, and the shell draws the leader lines over the camera view, finding the marks by the `term` the display list carries, and by running the same pure lookup from `figure.ts` against the display list projected through the current camera.
That lookup is TypeScript; the shell asks the WebView for the matched anchors in stage space once when the focus changes, then projects them itself every frame.

## Environment sensing, and what each phone gets

The design degrades by capability, never by refusing.
The shell detects what the device can do and reports it to the WebView as a value, which decides what the placement menu offers.

| Tier | Devices | Surfaces | Snapping | Drape | Occlusion |
| --- | --- | --- | --- | --- | --- |
| A: LiDAR | iPhone Pro since 12 Pro, iPad Pro | planes found almost at once, scene mesh with classes | plane boundaries, mesh edges and corners, rectangles | onto the scene mesh | full scene depth |
| B: world tracking | other iPhones that run the app; ARCore phones | planes after a moment of moving the phone; depth from motion on many Android phones | plane boundaries, rectangles, edges found in the image and laid on planes | onto an estimated depth map | people, and estimated depth |
| C: no AR | anything else | none | none | none | none |

Tier C phones still get the flat lab and photo markup by hand (below).

What fills the gaps on tier B:

- **Rectangles** come from Apple's Vision framework (rectangle detection on the camera image), laid onto planes by raycasting their corners.
  This finds doors, books, screens and sheets of paper, which are the obvious things to stretch a figure onto.
- **Edges and corners** for snapping come from line and contour detection on the camera image, kept when they lie on a known plane.
- **Depth** for a drape comes from a small monocular depth model running on the device (a Core ML build of a model such as Depth Anything V2 Small), which gives depth up to an unknown scale and offset.
  The shell fits that scale and offset each frame, by least squares, to the feature points and planes the world tracking already has in metres, which turns it into usable metric depth for a visual reference.
- **Raycasts** use the frameworks' tracked raycasts, which refine their result as the session learns more, the way the Measure app's dots settle.

Anchors are refined as tracking improves; because the placement is defined against anchors and not against fixed world coordinates, the figure moves with its surface when the surface's estimate moves, and stays fastened.
A placement could later be saved with the session's world map, so a figure left on the wall is there on the next visit; this is noted, not planned.

## Markup on photos

A photo is a frozen camera: once a photo's camera and planes are known, it is the same problem as live AR with a fixed viewpoint, and the same placements, renderer and lessons apply.
What differs is how much we know about the photo.

### Scene photos, taken in the app

The capture button in AR mode saves a scene photo: the full-resolution image with the camera's intrinsics and pose, the planes and found rectangles, the depth map where the device has one, and the current placement and lesson state.
Opened later, it is editable with everything the live session knew: the figure can be re-placed, squished, pinned and draped, and the lesson's points dragged, all on the still image.
This is the high-fidelity path, and what the app should encourage.

A scene photo is a folder: the image as HEIC, the depth map, and a JSON file of everything else, versioned.
They are kept on the device; syncing them is out of scope (they are megabytes each, and the Worker's deck is not the place).
Exporting flattens one to an ordinary image with the figure drawn in.

### Photos from the library

These have no pose and usually no depth, so the app recovers a plane, in order of preference:

1. **Depth stored with the photo.**
   Portrait-mode photos carry a depth map; planes are fitted to it.
2. **A rectangle the learner confirms.**
   Rectangle detection proposes quadrilaterals; the learner picks one or drags four corners onto something they know is a rectangle in the scene.
   That gives the plane's homography, which is a `quad` placement on the image, and is the classic single-view method.
3. **Vanishing lines.**
   Line detection proposes the two vanishing points of a floor or a wall, from which the plane's tilt follows; the learner confirms by dragging a grid until it lies flat.
4. **Estimated depth.**
   The same monocular model as live AR, without a metric scale, which is enough to drape.

The figure can always be placed by hand as a `quad` with no help at all, which is why tier C phones have photo markup too.

Scale on a library photo is unknown and does not matter: the lessons are about shape, and the formula band reads the stage.

## The bridge

The WebView and the shell talk only in messages, which are values: JSON, with the display list in a compact form (typed arrays of coordinates) so a dense figure crosses in well under a frame.

| Direction | Message | When |
| --- | --- | --- |
| Web → shell | `figure`: the display list, with a version | the lesson's state changed |
| Web → shell | `chrome`: the figure's box and the panels' boxes | the layout changed |
| Web → shell | `focus`: a term's id, its screen rectangle and its anchors in stage space | the reader points at a term, or stops |
| Web → shell | `mode`: flat, place, placed, photo | a button |
| Shell → web | `capabilities`: tier, and which placements and snaps exist | at start |
| Shell → web | `pointer`: id, phase, stage point, pointer type | a touch on the figure |
| Shell → web | `placement`: its kind, what it keeps, its scale | a placement changed |
| Shell → web | `hands`: tracked hands, as the hands module's own frames | each camera frame, if hands are on |

The protocol's types are written once, in TypeScript, and a test generates JSON fixtures from them that both the TypeScript side and the Swift side must read and write identically.

The figure is not sent when only the camera moves, which is the whole point.
While a handle is dragged, the round trip is touch, raycast, pointer message, lesson, display list, message, tessellate, draw; the budget for it is two display frames, and the existing formula hold (`hold.ts`) already keeps the band calm while it runs.

## Hands

In the room the phone is in one hand and the other is free, in front of the back camera.
Touch is the primary input, and hands are a later, optional one.

The hand module's core is already pure: landmarks in, pose and grab out (`pose.ts`, `interpreter.ts`).
Only `tracker.ts` reads a camera, through MediaPipe in the page, and the AR session owns the camera in the app.
So the shell runs Apple's Vision hand-pose detection on the AR session's frames and sends the landmarks over the bridge, and the existing interpreter does the rest unchanged.
With scene depth, a pinch also has a place in the room, so a learner could reach out and pinch a vertex lying on the table; that is a stretch goal.

## The app around it

- **Assets.**
  The Vite build is bundled, so every lesson works offline.
  The hand-tracking model is no longer fetched from a CDN in AR, since Vision is on the device.
- **Recall.**
  The bundled pages run on the app's own origin, not the Worker's, so the deck, `/check` and `/associate` become cross-origin calls.
  The Worker needs to allow exactly the app's origins (CORS for `capacitor://localhost` on iOS and `https://localhost` on Android), and nothing else.
  The sync key moves from `localStorage`, which iOS may clear from a WebView, to the Keychain, through a small plugin.
- **Permissions.**
  Camera always; photo library only when importing.
  No camera frame leaves the device.
- **Store review.**
  An app whose core is AR on bundled lessons is clearly more than a wrapped website, which is what Apple's review guidelines ask.

## Testing

Unit tests stay plain equality on values, on both sides of the bridge.

- **Display list (TypeScript).**
  `lessons.test.ts` already draws every lesson at every step onto a canvas stand-in that rejects non-finite numbers; it gains the same check on the display list, and a test that the web renderer draws a display list to the same canvas calls as `Draw` does today, so the refactor is proven to change nothing.
- **Figure index from the display list.**
  `figure.test.ts` keeps its cases, now built from display lists and a `View`.
- **Immersive layout.**
  `layout.test.ts` covers the third arrangement at every common phone size.
- **Placements (Swift, later Kotlin).**
  Each kind maps and inverts round to the same stage point; the morph's ends equal its two placements; `pins` lands every pin; tessellation keeps mapped curves within tolerance on screen; snapping chooses as the rules say.
- **Bridge.**
  Shared fixtures, read and written identically by both sides.
- **End to end, the way a learner sees it.**
  Xcode can record a real AR session (camera, motion, the framework's data) and replay it into the app in the simulator or on a device, and ARCore has the same recording and playback.
  A handful of recordings (a table, a wall with a door, a sofa, a dim room, a phone without LiDAR) drive UI tests that place, squish, pin, drape and drag, deterministically, in CI.
- **Fidelity.**
  The same recordings measure drift: a figure's corner, projected each frame, should stay within a few pixels of where it was placed while the recorded camera walks round it.

As now, nothing tests how a figure looks; that is checked by eye on devices.

## Phases

Each phase ships something whole.

1. **Display list on the web.**
   `Draw` emits primitives, a web renderer draws them, the figure index reads them; solids emit 3D primitives.
   Nothing visible changes.
2. **The app, flat.**
   Capacitor app on iOS with the bundled site, the flat lab with the back camera, recall syncing through the Worker with the key in the Keychain.
3. **Placed on a plane.**
   The AR shell with the Metal renderer, the reticle, `plane` placements with scale and turn, touch dragging through the raycast, the immersive layout, leader lines.
   This is the first release worth putting on phones.
4. **Squish, pin, morph.**
   `quad` and `pins` placements, the corner grips, snapping to boundaries, rectangles and edges, the morph animation, and the badge saying what a placement keeps.
5. **Photos.**
   Scene photos captured and edited later; library photos with depth, a confirmed rectangle, vanishing lines or by hand; exporting a flattened image.
6. **Drape and occlusion.**
   Draping onto the LiDAR mesh, and onto fitted monocular depth elsewhere; occluded parts drawn faint and dashed.
7. **Solids in the room.**
   The eleven 3D lessons as solids on the table, walked round.
8. **Hands.**
   Vision hand pose into the existing interpreter.
9. **Android.**
   The same WebView side, an ARCore shell meeting the same bridge and placement spec.

## Open questions

- **Labels flat or facing the camera.**
  Billboarded labels are always readable; labels lying on the surface look like they belong to the figure but read badly at a slant.
  Recommendation: billboard, revisit after seeing it on devices.
- **Real lengths.**
  In AR the app could show a segment's length in the room ("AB ≈ 46 cm") beside the lesson's own numbers.
  It is a natural pull from the Measure app, but it competes with the stage readouts for the learner's attention and invites precision we disclaim; leave it until a lesson wants it.
- **`g.px` under perspective.**
  Settled during phase 1 by the survey of lessons that use it.
- **Android timing.**
  After iOS phase 6, or earlier if a learner needs it.
- **Which lessons gain most from the room.**
  Power of a point with a real circular table, similar triangles with shadows, the Pythagorean theorem on floor tiles: a short list, written as the AR placements land, would steer which lessons get AR-specific uses in their "What will we use this for?" section.

## Further down the line: the primitives API in the room

[primitives-api.md](primitives-api.md) imagines figures that know their relations, theorems as values, and classification as refinement.
The room is a natural source of figures for it: a table's corner is a `Point`, a door found by rectangle detection is a `Quadrilateral` that `asRectangle()` refines, a plate seen at a slant is an ellipse that a plane turns back into a `Circle`.
A theorem's `enforce` could then bend a figure until its hypothesis holds over real furniture, and its `witness` could draw the proof onto the wall.

Three decisions in this spec keep that open:

- the display list is the drawing target for any figure, not only the lab's, so a program written against the primitives API draws into the room the same way a lesson does;
- a pinned point is already a free point whose position comes from the world, which is exactly what the API's `free()` would need to accept as a source;
- placements name what they keep, which is the API's transformation table, so "is this still a right angle on the wall?" has an answer in the same vocabulary.
