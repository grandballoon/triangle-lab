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
The page decides what an action means, through the `onAction` callback; the standalone pages use next and previous to walk their directions and ignore the rest.

Because synthetic pointers cannot be captured, lessons call `capturePointer` / `releasePointer` from `src/pointer.ts` instead of the DOM methods.
The bridge dispatches a grab's events straight at the element it started on, which gives the same effect.

## Two kinds of lesson

**Standalone lessons** (`<slug>.html` + `src/<slug>.ts`) are the original sixteen triangle lessons.
Each is its own Vite entry point with bespoke geometry, drawing and interaction, sharing `geometry.ts`, `render.ts` and `webcam.ts`.
They gain the lab page's chrome by loading `src/page.ts` as an extra module script, after their own: the top bar with the pager and the lesson's name, hand input, the step column on the right, filled with the lesson's numbered directions from `src/directions.ts`, and, for a lesson with live numbers, the formula band along the bottom.
The column and the band reuse the lab's `StepList` and `FormulaBand` and their stylesheets, so both kinds of lesson read alike, but the directions mostly only describe the figure; they do not draw it in step by step.
Like the curriculum rail, the column and the band publish the room they take, as `--steps-inset` and `--formulas-inset`, and fire `resize`; each page's `#stage` rule leaves that room free.

The lesson and `page.ts` are separate scripts and meet only in `src/chrome.ts`, a module both import.
`page.ts` sets the current step there, which a lesson may read to hold part of its figure back (`pythagoras.ts` brings in its proof at the step that scrubs it).
A lesson with live numbers asks for the formula band there while its module is first evaluated, which is why its script must come first, and hands it fresh rows each frame.
Those rows are built by pure functions in `src/readouts.ts`, and pages showing several triangles at once arrange them with the pure `grid` in `src/grid.ts`.

**Lab lessons** (`src/lab/lessons/<slug>.ts`) are hosted by one page, `lab.html`, and loaded on demand.
A lab lesson is a function from a `Scene` to a `LessonView`: it asks the scene for draggable points, sliders and toggles, and returns its proof steps, a `draw` function, the live formulas to show and, optionally, the real-world uses of its idea.
It never touches the DOM.

| File | Role |
| --- | --- |
| `lab/scene.ts` | The lesson contract and the model of what a learner can touch. DOM-free. |
| `lab/geo.ts` | Plane geometry and handle constraints. Pure. |
| `lab/draw.ts` | Drawing vocabulary in stage coordinates (y up), sized in screen pixels. |
| `lab/solid.ts` | Orbit camera and helpers for 3D figures. |
| `lab/math.ts` | KaTeX typesetting for step text and formulas. |
| `lab/shell.ts` | The page around a lesson: canvas, panels, pointer input, frame loop. |
| `lab/steps.ts` | The step column: every step as a section of one scrolling list, then the lesson's uses. |
| `lab/formulas.ts` | The formula band: the live readouts, re-typeset only as they change. |
| `lab/link.ts` | Finds the names, angles, variables and numbers in a formula or step text and marks them as terms. Pure. |
| `lab/figure.ts` | What a frame's figure showed, and the lookup from a found term to the marks that show it. Pure. |
| `lab/terms.ts` | Finds the term under the pointer and draws leader lines from it to the figure. |
| `lab/hold.ts` | Holds the formula band's numbers still, greyed, while the figure is dragged. Pure. |
| `lab/sprites.ts` | Loads and caches the images lessons draw with `g.sprite`. |
| `lab/main.ts` | Entry point: picks the lesson from the URL, swaps lessons in place. |
| `lab/kit/` | Helpers shared by several lessons of one chapter. |

The page puts the steps in a column on the right and the formulas in a band along the bottom.
All steps are visible at once; the one scrolled to the top of the column is current, and scrolling, pressing a step, the arrow keys and the hand gestures all change it through the shell, which owns the current step and the fade-in of each step's construction.

### Terms and the figure

Pointing at a piece of mathematics, in the step column or the formula band, draws a thin line from it to each place the figure shows it, on a click-through SVG layer above the panels (`terms.ts`).
There are two ways a piece becomes such a term.

**Found terms** need nothing from the lesson.
Before typesetting, `link.ts` marks every point name (`A`, `A'`, `O_1`), segment (`AB`), angle (`\angle PED`), triangle or polygon (`\triangle ABC`), variable (`a`, `\alpha`) and value (`5.2`, `37^\circ`) with an id saying what it is, such as `seg:A.B` or `num:37`.
As `Draw` draws, it notes every visible line, arc, angle mark, filled shape and label in a figure index, in screen pixels (`figure.ts`).
A found term is looked up in that index after the frame is drawn: points by their name labels, segments by a drawn line or arc through both named points, angles by a mark at the named vertex whose sides pass the other two points, shapes by their corners, and variables and values by the labels that print them.
The grid and axes are left out of the index, and a number printed to fewer places still matches (37.4 and 37°), except small whole numbers, which are as often counts as measures.

**Lesson terms** are for what the index cannot see.
A formula marks a symbol with `term(id, tex)` (`scene.ts`), and a figure mark names the term it shows with the `term` drawing option (`draw.ts`).
When the reader points at one, the shell hands its id to `Draw` as the focus, so matching marks are drawn heavier and glowing.
A lesson term over a single symbol also stands for that symbol wherever it is written: `term("alpha", "\\alpha")` in a formula makes an `\alpha` in the step text lead to the same marks.
The lesson tests check that every lesson term has a visible mark in the figure at that step.

Only terms the figure shows at the moment are underlined and light up; the rest read as plain mathematics, and that changes as steps draw their constructions in.

### Holding the formulas still

While any pointer drags the figure, the formula band does not follow it number by number.
`hold.ts` keeps each formula as it was when the drag began, greys out the numbers the drag has changed, and when the drag ends shows the new values fading back to full strength.
A formula whose shape changes mid-drag (a new term, a different verdict) is held and greyed whole.

### Sprites

`g.sprite(src, at, { width, rotate })` draws an image centred on a stage point, sized in stage units, so a picture of a real object can sit on a figure.
`src` is a URL, normally an asset the lesson imports; the shell's `SpriteCache` loads it on first use and the sprite appears once it has decoded.
`Draw` sees images only through the `Pictures` interface, so lessons and their tests stay DOM-free.

Lessons compose inside a fixed stage (x from −8 to 8, y from −5 to 5); the shell fits that stage into whatever screen space the panels leave free, so a lesson never handles resizing.

## The reading order (`src/lessons.ts`)

One list defines every lesson and its order.
The menu (`src/index.ts`), the pager (`src/pager.ts`) and the curriculum rail (`src/curriculum.ts`) all render from it, so they cannot drift apart.

The curriculum rail lists every chapter, lesson and axiom down the left of a lesson page, with the open lesson marked; the pager mounts it, so every lesson page has it.
On a wide screen it docks: it publishes the width it takes as `--rail-inset` on `<html>` and fires `resize`.
Standalone pages honour that through their `#stage` rule and size their figure from the canvas box; the lab shell takes it as `leftInset` and fits the stage beside it.
The entries live in per-chapter files under `src/chapters/`.

## Dev-only UI feedback (`src/dev/feedback`, `tools/feedback-plugin.ts`)

A review aid for the dev server, separate from the lessons: Alt-click any element to leave a comment on it.
The Vite plugin applies to `vite dev` only; it injects `overlay.ts` into every page and appends each comment it receives to `ui-feedback.md`.
No page imports the overlay, so it can never reach a build, and no lesson knows it exists.
The overlay takes Alt-clicks in the capture phase before a lesson sees them, and keys typed into its comment box stop at the box.

| File | Role |
| --- | --- |
| `dev/feedback/entry.ts` | The comment's wire format, its validation and its Markdown form. Shared by page and server; no DOM or Node APIs. |
| `dev/feedback/capture.ts` | Clicked element → selector, description and click position. |
| `dev/feedback/overlay.ts` | The outline, the comment box and the post to the server. |
| `tools/feedback-plugin.ts` | Injects the overlay and records comments. Runs in Node. |

# Data Types

- `Lesson`, `Chapter` (`src/chapters/types.ts`): a lesson's menu entry and where it sits.
- `GestureSettings` (`src/hands/settings.ts`): everything the gesture panel can change.
- `HandFrame` (`src/hands/pose.ts`): one hand in one video frame, in screen and metric coordinates.
- `HandState` (`src/hands/interpreter.ts`): the interpreted hand: cursor, grab edges, held pose, fired action.
- `LessonView`, `Step`, `Use`, `Readout`, `Frame` (`src/lab/scene.ts`): what a lab lesson returns and what it is given each frame.
- `Handle`, `Slider`, `Toggle`, `Choice`, `Button` (`src/lab/scene.ts`): the things a learner can touch.
- `View` (`src/lab/draw.ts`): the mapping from stage coordinates to the canvas.
- `TermRef` (`src/lab/link.ts`): what a found term refers to — a point, segment, angle, polygon, symbol or number.
- `FigureIndex` (`src/lab/figure.ts`): the lines, arcs, angle marks, shapes and labels one frame drew, in screen pixels.
- `Hold` (`src/lab/hold.ts`): whether the formula band is live, held through a drag, or settling after one.

# Testing

`npm test` runs everything without a browser or a camera.

- `src/hands/hands.test.ts`: pose classification on synthetic hands, the grab and hold state machine, settings rules.
- `src/lab/geo.test.ts`: the geometry kernel.
- `src/lab/draw.test.ts`: focused terms, the anchors leader lines run to, and sprites.
- `src/lab/link.test.ts`: which pieces of LaTeX become found terms, and which are left alone.
- `src/lab/figure.test.ts`: tracing found terms to the marks of real drawn figures, and reading labels.
- `src/lab/hold.test.ts`: the formula band held still through a drag and settling after it.
- `src/lab/lessons.test.ts`: every lab lesson is built, drawn at every step onto a canvas stand-in that rejects non-finite numbers, has every handle dragged to the stage corners and every control used, has all its text typeset strictly with found terms marked, and has a figure mark for every lesson term.
- `src/lab/shell.test.ts`: the shell, step column, formula-term leaders, pager, settings panel and hand-to-pointer bridge against a DOM stand-in.
- `src/pages.test.ts`: every standalone page's stage rule, script order and directions.
- `src/readouts.test.ts`: the standalone lessons' live formulas, typeset strictly.
- `src/grid.test.ts`: laying several figures out at the largest size that fits.
- `src/dev/feedback/feedback.test.ts`: element selectors and descriptions, and the feedback entry format.
- `tools/feedback-plugin.test.ts`: the feedback plugin on a real dev server — overlay injection and comments written to file.

None of this checks how a lesson looks, and no test sees a real hand: gesture thresholds are tuned by eye and exposed in the settings panel for that reason.

# Further Reading

- `README.md`: running the project and adding a lesson.
- `specs/`: design notes for the original triangle lessons.
