# Project Overview

Triangle Lab is a set of interactive geometry lessons drawn over the learner's webcam.
The learner moves points with a mouse, a finger, or a hand held up to the camera, and steps through visual proofs.
It is a static site: Vite builds a handful of HTML pages, and everything runs in the browser.

# Architecture Overview

There are three layers, and each knows as little as possible about the others.

```
            ┌──────────────────────────── page ────────────────────────────┐
 camera ──▶ │ <video>      hands (src/hands)          lesson               │
            │                 │                          ▲                 │
            │                 └── synthetic PointerEvents┘                 │
            └───────────────────────────────────────────────────────────────┘
```

## Hands are a pointer (`src/hands`)

Hand tracking is an input device, not a feature of any lesson.
`startHands()` reads the page's `<video>`, finds hands with MediaPipe, and turns each one into a synthetic pointer: moving the hand sends `pointermove`, closing the grab gesture sends `pointerdown`, opening it sends `pointerup`, and a grab that starts and ends on the same button clicks it.
A lesson therefore contains no gesture code; anything that works with a mouse works with a hand.

Inside the module the pipeline is a chain of small pieces, pure wherever possible:

| File | Role | Pure |
| --- | --- | --- |
| `tracker.ts` | MediaPipe wrapper: video frame → landmarks in screen pixels | no |
| `pose.ts` | Landmarks → pinch distance, cursor points, static pose (fist, thumbs-up, …) | yes |
| `interpreter.ts` | Per-hand state machine: readings + settings → cursor, grab, held-pose actions | yes |
| `settings.ts` | What is configurable, its defaults, validation, persistence | yes (storage injected) |
| `pointerBridge.ts` | Hand state → DOM pointer events and clicks | no |
| `overlay.ts` | Cursor rings, hold progress, optional skeleton on a click-through canvas | no |
| `panel.ts` | The settings sheet, built only from buttons so a pinch can work it | no |
| `index.ts` | Wires the above and runs the per-frame loop; the only public entry | no |

Besides grabbing, a hand can hold a pose to trigger an action (next step, previous step, reset, show or hide formulas).
The page decides what an action means, through the `onAction` callback; the standalone pages have no steps and ignore them.

Because synthetic pointers cannot be captured, lessons call `capturePointer` / `releasePointer` from `src/pointer.ts` instead of the DOM methods.
The bridge dispatches a grab's events straight at the element it started on, which gives the same effect.

## Two kinds of lesson

**Standalone lessons** (`<slug>.html` + `src/<slug>.ts`) are the original sixteen triangle lessons.
Each is its own Vite entry point with bespoke geometry, drawing and interaction, sharing `geometry.ts`, `render.ts` and `webcam.ts`.
They gain the pager and hand input by loading `src/nav.ts` and `src/hands/page.ts` as extra module scripts.

**Lab lessons** (`src/lab/lessons/<slug>.ts`) are hosted by one page, `lab.html`, and loaded on demand.
A lab lesson is a function from a `Scene` to a `LessonView`: it asks the scene for draggable points, sliders and toggles, and returns its proof steps, a `draw` function and the live formulas to show.
It never touches the DOM.

| File | Role |
| --- | --- |
| `lab/scene.ts` | The lesson contract and the model of what a learner can touch. DOM-free. |
| `lab/geo.ts` | Plane geometry and handle constraints. Pure. |
| `lab/draw.ts` | Drawing vocabulary in stage coordinates (y up), sized in screen pixels. |
| `lab/solid.ts` | Orbit camera and helpers for 3D figures. |
| `lab/math.ts` | KaTeX typesetting for step text and formulas. |
| `lab/shell.ts` | The page around a lesson: canvas, panels, pointer input, frame loop. |
| `lab/main.ts` | Entry point: picks the lesson from the URL, swaps lessons in place. |
| `lab/kit/` | Helpers shared by several lessons of one chapter. |

Lessons compose inside a fixed stage (x from −8 to 8, y from −5 to 5); the shell fits that stage into whatever screen space the panels leave free, so a lesson never handles resizing.

## The reading order (`src/lessons.ts`)

One list defines every lesson and its order.
The menu (`src/index.ts`) and the pager (`src/pager.ts`) both render from it, so they cannot drift apart.
The entries live in per-chapter files under `src/chapters/`.

# Data Types

- `Lesson`, `Chapter` (`src/chapters/types.ts`): a lesson's menu entry and where it sits.
- `GestureSettings` (`src/hands/settings.ts`): everything the gesture panel can change.
- `HandFrame` (`src/hands/pose.ts`): one hand in one video frame, in screen and metric coordinates.
- `HandState` (`src/hands/interpreter.ts`): the interpreted hand: cursor, grab edges, held pose, fired action.
- `LessonView`, `Step`, `Readout`, `Frame` (`src/lab/scene.ts`): what a lab lesson returns and what it is given each frame.
- `Handle`, `Slider`, `Toggle`, `Choice`, `Button` (`src/lab/scene.ts`): the things a learner can touch.
- `View` (`src/lab/draw.ts`): the mapping from stage coordinates to the canvas.

# Testing

`npm test` runs everything without a browser or a camera.

- `src/hands/hands.test.ts`: pose classification on synthetic hands, the grab and hold state machine, settings rules.
- `src/lab/geo.test.ts`: the geometry kernel.
- `src/lab/lessons.test.ts`: every lab lesson is built, drawn at every step onto a canvas stand-in that rejects non-finite numbers, has every handle dragged to the stage corners and every control used, and has all its text typeset strictly.
- `src/lab/shell.test.ts`: the shell, pager, settings panel and hand-to-pointer bridge against a DOM stand-in.

None of this checks how a lesson looks, and no test sees a real hand: gesture thresholds are tuned by eye and exposed in the settings panel for that reason.

# Further Reading

- `README.md`: running the project and adding a lesson.
- `specs/`: design notes for the original triangle lessons.
