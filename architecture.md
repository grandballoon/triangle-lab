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

## The camera (`src/webcam.ts`)

Every lesson page draws over a full-screen `<video>` of the camera, which `startWebcam` opens.
A device with a second camera gets a switch in the top bar (`cameraSwitch.ts`): on a phone it flips between the selfie camera and the one on the back, so the figure can be laid over the room; otherwise it steps through the attached cameras.
Which camera to try next is decided by the pure `nextCameras`, and the choice is remembered, so the next lesson page opens the same camera.
The camera can also be turned off from the hands settings sheet, which leaves the figures on a plain background; `webcam.ts` hands the sheet that switch through `startHands`'s `camera` option, since the camera belongs to the page rather than to hand input.
Off is remembered too, and a page opened with the camera off never asks for it.
A camera facing the user is shown mirrored and one facing away is not; the video carries which as `data-mirror`, and hand tracking maps landmarks to the screen, and reads handedness, to match.

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
| `settings.ts` | What is configurable, its defaults (hands start off on a touch-first device), validation, persistence | yes (storage injected) |
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
They gain the lab page's chrome by loading `src/page.ts` as an extra module script, after their own: the top bar with the pager and the lesson's name, hand input, the step column, filled with the lesson's numbered directions from `src/directions.ts`, and, for a lesson with live numbers, the formula band.
The column and the band reuse the lab's `StepList` and `FormulaBand` and their stylesheets, so both kinds of lesson read alike, but the directions mostly only describe the figure; they do not draw it in step by step.
Where they go comes from the same layout the lab uses (see "Fitting the window" below); `page.ts` publishes the box left for the canvas as `--stage-left`, `--stage-top`, `--stage-width` and `--stage-height`, which each page's `#stage` rule reads, and fires `resize`.

The lesson and `page.ts` are separate scripts and meet only in `src/chrome.ts`, a module both import.
`page.ts` sets the current step there, which a lesson may read to hold part of its figure back (`pythagoras.ts` brings in its proof at the step that scrubs it).
A lesson with live numbers asks for the formula band there while its module is first evaluated, which is why its script must come first, and hands it fresh rows each frame.
Those rows are built by pure functions in `src/readouts.ts`, and pages showing several triangles at once arrange them with the pure `grid` in `src/grid.ts`.
The band is used by perimeter, the triangle inequality, Pythagoras, congruent and similar triangles, and the four trigonometry pages.
Each standalone figure sizes itself for anything from a phone to a desktop.
`src/fit.ts` holds the pure helpers they share for that: grab radii widened for a finger or a hand, the nearest knob, captions that shrink and then wrap, and where a captioned figure sits; `grid` keeps a room in pixels round each figure for labels drawn at a fixed size.
On a canvas taller than wide, `pythagoras.ts` shows its proof in place of the triangle rather than beside it.

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
| `lab/layout.ts` | Where the step column, formula band and controls go for a window size, and the room left for the figure. Pure. |
| `lab/arrange.ts` | Writes a layout onto the page. |
| `lab/link.ts` | Finds the names, angles, variables and numbers in a formula or step text and marks them as terms. Pure. |
| `lab/figure.ts` | What a frame's figure showed, and the lookup from a found term to the marks that show it. Pure. |
| `lab/terms.ts` | Finds the term under the pointer and draws leader lines from it to the figure. |
| `lab/hold.ts` | Holds the formula band's numbers still, greyed, while the figure is dragged. Pure. |
| `lab/sprites.ts` | Loads and caches the images lessons draw with `g.sprite`. |
| `lab/main.ts` | Entry point: picks the lesson from the URL, swaps lessons in place. |
| `lab/kit/` | Helpers shared by several lessons of one chapter. |

The page puts the steps in a column on the right and the formulas in a band along the bottom, or, on a phone, both under the figure.
All steps are visible at once (on a phone, one at a time; see "Fitting the window"); the one scrolled to the top of the column is current, and scrolling, pressing a step, the arrow keys and the hand gestures all change it through the shell, which owns the current step and the fade-in of each step's construction.

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

## Fitting the window (`src/lab/layout.ts`)

Both kinds of lesson page lay out their chrome with one pure function, `layoutChrome`: the window's size, the docked rail's width, and whether the formula band and a controls row are showing go in; boxes for the step column, the band and the controls row, and the room left for the figure, come out.
The lab shell calls it every frame and fits its stage into `figure`; `page.ts` calls it on `resize` and publishes `canvas` for the standalone page's `#stage` rule.
`arrange.ts` writes the result onto the page, and only when it changed.

There are two arrangements.
In a wide window the steps run down the right and the band along the bottom.
Below 700px across (a phone held upright) the page stacks: the top bar takes two rows, and the band and the steps sit under the figure at full width.
The steps then show one at a time, paged with a row of buttons above them (`StepList.setPaged`).
All steps share one grid cell with only the current one visible, so the list's height is its tallest step's (`pagedHeight`, at most a third of the window, scrolling past that), the figure keeps its size from step to step, and it gets all the rest.
A short window (a phone on its side) keeps the wide arrangement but goes compact: thinner margins and a band without its heading.

The arrangement is marked on `<html>` as `data-layout` (and `data-compact`), and the stylesheets key their phone rules off it: the two-row top bar (`nav.css`), the single swipeable row of lab controls (`lab.css`), and the hands pill showing an icon for its status text (`hands.css`).
Those rules draw the heights `layout.ts` assumes, so the two are changed together.
The standalone lessons keep the top 64px of their canvas clear for the top bar; when the bar is taller, the canvas starts lower by the difference.

## The reading order (`src/lessons.ts`)

One list defines every lesson and its order.
The menu (`src/index.ts`), the pager (`src/pager.ts`) and the curriculum rail (`src/curriculum.ts`) all render from it, so they cannot drift apart.

The curriculum rail lists every chapter, lesson and axiom down the left of a lesson page, with the open lesson marked; the pager mounts it, so every lesson page has it.
On a wide screen it docks: it publishes the width it takes as `--rail-inset` on `<html>` and fires `resize`.
Standalone pages honour that through their `#stage` rule and size their figure from the canvas box; the lab shell takes it as `leftInset` and fits the stage beside it.
The entries live in per-chapter files under `src/chapters/`.

## Recall (`src/recall`)

While working through a lesson, the learner can note a question they want to be able to answer from memory later; `recall.html` asks the questions back.
It is separate from the lessons: no lesson knows it exists, and each kind of page only says where the learner is.

A pill in the top bar, or the Q key, opens a sheet for the question (`capture.ts`).
`page.ts` and the lab's `main.ts` mount it with a function returning the current lesson's slug and step, and the question is saved with both and the step's title.
Keys typed into the sheet stop there, so they never reach a lesson's shortcuts.

The recall page lists every question by lesson and runs review sittings.
A sitting asks each due question in turn: the learner answers from memory, in writing or not, then checks against their earlier answers and the lesson itself, and grades themselves missed, shaky or recalled.
"Check in the lesson" opens the lesson in a new tab at the step the question came from: any lesson link may end in `#step-N` (`hrefOf`, `stepOfHash` in `lessons.ts`), which both kinds of page go to on load and then drop from the address.

| File | Role | Pure |
| --- | --- | --- |
| `deck.ts` | Cards, the Leitner schedule, merging two decks, the stored form and reading it back | yes |
| `session.ts` | A review sitting: ask, check, grade, one more try after a first miss; reading one back after a reload | yes |
| `keys.ts` | What Enter does in the text boxes: saves with a keyboard, a new line on a touch screen | yes |
| `labels.ts` | Where a card was asked, when it is due, its question typeset | yes |
| `store.ts` | The deck in `localStorage`, shared between tabs through the `storage` event | no (storage injected) |
| `capture.ts` | The pill and sheet on a lesson page | no |
| `page.ts` | The recall page: overview, sittings, saving to and loading from a file | no |

Scheduling is a Leitner system.
A card starts in box 0, due at once; recalling it moves it up a box, a shaky answer moves it down one (never below 1), and a miss sends it back to 0.
Boxes 1 to 5 come back after 1, 3, 7, 16 and 35 days, each a few hours early, so a card answered in the evening is ready the next morning.

The deck lives in the browser only, so the recall page can save it to a JSON file and load one back, merged card by card with the copy changed last winning.
A sitting under way is kept in the tab's `sessionStorage`, with the answer being written, because a phone often reloads a tab left in the background while the learner checks an answer in the lesson's tab.

Every change to the store is read-modify-write against storage, so two tabs cannot undo each other's questions; if storage refuses a write, the page keeps its deck for as long as it is open and says so.

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
- `Card`, `Deck`, `Place`, `Attempt` (`src/recall/deck.ts`): a noted question, where it was asked, its answers and when it is next due.
- `Session` (`src/recall/session.ts`): a review sitting in progress.

# Testing

`npm test` runs everything without a browser or a camera.

- `src/hands/hands.test.ts`: pose classification on synthetic hands, the grab and hold state machine, settings rules.
- `src/lab/geo.test.ts`: the geometry kernel.
- `src/lab/layout.test.ts`: the chrome's boxes in wide and phone windows, and that the chrome never covers the figure at any common screen size.
- `src/lab/draw.test.ts`: focused terms, the anchors leader lines run to, and sprites.
- `src/lab/link.test.ts`: which pieces of LaTeX become found terms, and which are left alone.
- `src/lab/figure.test.ts`: tracing found terms to the marks of real drawn figures, and reading labels.
- `src/lab/hold.test.ts`: the formula band held still through a drag and settling after it.
- `src/lab/lessons.test.ts`: every lab lesson is built, drawn at every step onto a canvas stand-in that rejects non-finite numbers, has every handle dragged to the stage corners and every control used, has all its text typeset strictly with found terms marked, and has a figure mark for every lesson term.
- `src/lab/shell.test.ts`: the shell, step column (whole and paged), formula-term leaders, pager, settings panel and hand-to-pointer bridge against a DOM stand-in.
- `src/pages.test.ts`: every standalone page's stage rule, script order and directions, and that every page is a build entry.
- `src/readouts.test.ts`: the standalone lessons' live formulas, typeset strictly.
- `src/grid.test.ts`: laying several figures out at the largest size that fits, with room for their labels.
- `src/fit.test.ts`: grab radii per pointer type, nearest knob, caption scaling, placing a captioned figure, fitting text.
- `src/webcam.test.ts`: which camera a switch tries next, and which are shown mirrored.
- `src/recall/deck.test.ts`, `session.test.ts`, `labels.test.ts`, `keys.test.ts`: the recall schedule, review sittings, links to a step, labels and the Enter key.
- `src/recall/store.test.ts`: the deck saved, shared between tabs, and kept when storage refuses.
- `src/recall/capture.test.ts`: noting a question from a lesson page, against a DOM stand-in.
- `src/recall/page.test.ts`: the recall page driven as a learner would, from the overview through a whole sitting, across a reload and on a touch screen.
- `src/dev/feedback/feedback.test.ts`: element selectors and descriptions, and the feedback entry format.
- `tools/feedback-plugin.test.ts`: the feedback plugin on a real dev server — overlay injection and comments written to file.

None of this checks how a lesson looks, and no test sees a real hand: gesture thresholds are tuned by eye and exposed in the settings panel for that reason.

# Further Reading

- `README.md`: running the project and adding a lesson.
- `specs/`: design notes for the original triangle lessons.
