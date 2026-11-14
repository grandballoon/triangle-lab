# Project Overview

Triangle Lab is a set of interactive geometry lessons drawn over the learner's webcam.
The learner moves points with a mouse, a finger, or a hand held up to the camera, and steps through visual proofs.
It is a static site: Vite builds a handful of HTML pages, and everything runs in the browser.
The exceptions are the recall deck, which a Cloudflare Worker keeps on the web so it is the same on every device, and answer checking, free association and checking explanations, which ask Claude through that Worker; the Worker also serves the pages.

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

A photo can stand in for the camera's picture (`src/backdrop/`): dropped onto the page, pasted, or picked with a pill in the top bar.
The photo is laid over the video and under the veil, so it leaves the camera itself alone: hand tracking still reads the video, and the camera is still turned on and off from the hands sheet.
Once a photo shows, the pill arranges it, to line it up with the figure (`arrange.ts`).
A layer over the whole page then takes every pointer, so a drag moves the photo rather than the figure; two pointers, the wheel or a trackpad pinch resize it, and a bar of buttons and the keys do both by hand.
Where the photo sits is a `Placement`: its size relative to just covering the window, and its centre's offset in widths of the photo at that size, so it stays roughly lined up as the window changes shape.
Every move is a pure function from one placement to the next (`core.ts`).
The photo and its placement are remembered in IndexedDB (`store.ts`), as the camera's choice is in localStorage, so the next lesson page opens over it too.

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

**Standalone lessons** (`<slug>.html` + `src/<slug>.ts`) are thirteen of the original triangle lessons; four of them now open the Trigonometry chapter.
Perimeter, medians and angle bisectors started as standalone pages too, and were rebuilt as lab lessons; `public/_redirects` sends their old addresses on to the lab.
Each is its own Vite entry point with bespoke geometry, drawing and interaction, sharing `geometry.ts`, `render.ts` and `webcam.ts`.
They gain the lab page's chrome by loading `src/page.ts` as an extra module script, after their own: the top bar with the pager and the lesson's name, hand input, the step column, filled with the lesson's numbered directions from `src/directions.ts` and then its asides from `src/asides.ts`, and, for a lesson with live numbers, the formula band.
The column and the band reuse the lab's `StepList` and `FormulaBand` and their stylesheets, so both kinds of lesson read alike, but the directions mostly only describe the figure; they do not draw it in step by step.
Where they go comes from the same layout the lab uses (see "Fitting the window" below); `page.ts` publishes the box left for the canvas as `--stage-left`, `--stage-top`, `--stage-width` and `--stage-height`, which each page's `#stage` rule reads, and fires `resize`.

The lesson and `page.ts` are separate scripts and meet only in `src/chrome.ts`, a module both import.
`page.ts` sets the current step there, which a lesson may read to hold part of its figure back (`pythagoras.ts` brings in its proof at the step that scrubs it).
A lesson with live numbers asks for the formula band there while its module is first evaluated, which is why its script must come first, and hands it fresh rows each frame.
Those rows are built by pure functions in `src/readouts.ts`, and pages showing several triangles at once arrange them with the pure `grid` in `src/grid.ts`.
The band is used by the triangle inequality, Pythagoras, congruent and similar triangles, and the four trigonometry pages.
Each standalone figure sizes itself for anything from a phone to a desktop.
`src/fit.ts` holds the pure helpers they share for that: grab radii widened for a finger or a hand, the nearest knob, captions that shrink and then wrap, and where a captioned figure sits; `grid` keeps a room in pixels round each figure for labels drawn at a fixed size.
On a canvas taller than wide, `pythagoras.ts` shows its proof below the triangle rather than beside it.

**Lab lessons** (`src/lab/lessons/<slug>.ts`) are hosted by one page, `lab.html`, and loaded on demand.
A lab lesson is a function from a `Scene` to a `LessonView`: it asks the scene for draggable points, sliders and toggles, and returns its proof steps, a `draw` function, the live formulas to show, and its asides: what its idea is like, in everyday terms (`likes`), and its real-world uses (`uses`).
It never touches the DOM.

A lesson that defines terms, one at a time, asks the scene for a row of them with `s.terms`: a `Choice` whose option n is step n.
Picking a term goes to its step, and moving to a step picks its term (`followStep`), so the pills at the top and the step column always agree, and the lesson draws only the term picked.
`circle-parts` defines its parts this way, and the triangle-parts lessons (perimeter, semiperimeter, medians, centroid, bisectors) define one term each, with edge cases such as the isosceles apex as further pills.
Those five share one triangle and its knobs from `lab/kit/triangle-stage.ts`, over the pure walking and locking in `lab/kit/triangle-parts.ts`.

| File | Role |
| --- | --- |
| `lab/scene.ts` | The lesson contract and the model of what a learner can touch. DOM-free. |
| `lab/geo.ts` | Plane geometry and handle constraints. Pure. |
| `lab/draw.ts` | Drawing vocabulary in stage coordinates (y up), sized in screen pixels. |
| `lab/solid.ts` | Orbit camera and helpers for 3D figures. |
| `lab/math.ts` | KaTeX typesetting for step text and formulas. |
| `lab/shell.ts` | The page around a lesson: canvas, panels, pointer input, frame loop. |
| `lab/steps.ts` | The step column: every step as a section of one scrolling list, then the lesson's asides; and a pane beside the steps under a tab of its own. |
| `lab/formulas.ts` | The formula band: the live readouts, re-typeset only as they change. |
| `lab/layout.ts` | Where the step column, formula band and controls go for a window size, and the room left for the figure. Pure. |
| `lab/arrange.ts` | Writes a layout onto the page. |
| `lab/link.ts` | Finds the names, angles, variables and numbers in a formula or step text and marks them as terms. Pure. |
| `lab/figure.ts` | What a frame's figure showed, and the lookup from a found term to the marks that show it. Pure. |
| `lab/terms.ts` | Finds the term under the pointer and draws leader lines from it to the figure. |
| `lab/hold.ts` | Holds the formula band's numbers still, greyed, while the figure is dragged. Pure. |
| `lab/sprites.ts` | Loads and caches the images lessons draw with `g.sprite`. |
| `lab/grip.ts` | How handles and sliders are drawn, and how near a press must land to grab one; shared with the AR page. |
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
The menu's margin names each chapter's main results; a chapter's name there links to its section of the menu, whose id comes from its title (`anchorOf`).

The curriculum rail lists every chapter, lesson and axiom down the left of a lesson page, with the open lesson marked; the pager mounts it, so every lesson page has it.
On a wide screen it docks: it publishes the width it takes as `--rail-inset` on `<html>` and fires `resize`.
Standalone pages honour that through their `#stage` rule and size their figure from the canvas box; the lab shell takes it as `leftInset` and fits the stage beside it.
The entries live in per-chapter files under `src/chapters/`.

## AR (`ar.html`, `src/ar`)

The AR page shows one lab lesson's figure on a flat sheet that the learner places in the camera view in perspective, to lay it over things in the room.
Nothing is tracked in the scene; the learner matches the sheet to the room by eye.
The lesson is the lab's own module, built from a `Scene` and drawn by `Draw` as on the lab page, so the AR page needs nothing from it; which lessons the page takes is a list (`lessons.ts`), and the lab page's top bar links to it for those (`link.ts`).

The sheet is a canvas the size of the lab's stage at 60 pixels a unit, so strokes and labels keep their proportion to the figure at any size on screen.
Its pose (slide, size, tilt, turn, spin, and the camera's field of view) becomes one CSS `matrix3d` with the perspective folded in, so the browser draws the canvas in perspective; the canvas is redrawn at a resolution that follows its size on screen, so it stays sharp.
The same matrix, read as a homography of the sheet's plane, maps a pointer back onto the sheet: a press is matched to the figure's handles by where they show on screen, and a dragged handle is moved to the stage point under the pointer.
A press elsewhere moves the sheet: one pointer slides or leans it, two pinch it, which two hands do too, since hands arrive as pointers.
Grips are drawn and caught as the lab shell does it (`lab/grip.ts`).

| File | Role | Pure |
| --- | --- | --- |
| `pose.ts` | The sheet's pose, its matrix, projecting and unprojecting through it, what each gesture does to it, keeping it in front of the eye, picking a handle on screen, the canvas resolution | yes |
| `dials.ts` | The pose panel's sliders: what each reads from and writes to a pose | yes |
| `lessons.ts` | Which lessons the AR page takes, and the link to it | yes |
| `card.ts` | The step card: the stage on the sheet, a button for each stage, the live formulas; folds to a caret | no |
| `panel.ts` | The pose panel: the sliders, what dragging does, how strongly the sheet's backing shows, facing it square on and resetting it | no |
| `link.ts` | The lab page's "View in AR" pill | no |
| `main.ts` | Entry point: holds the pose and the lesson, routes pointers, draws each frame | no |

## Recall (`src/recall`)

While working through a lesson, the learner can note a question they want to be able to answer from memory later; `recall.html` asks the questions back.
It is separate from the lessons: no lesson knows it exists, and each kind of page only says where the learner is.

A pill in the top bar, or the Q key, opens a sheet for the question (`capture.ts`).
`page.ts` and the lab's `main.ts` mount it with a function returning the current lesson's slug and step, and the question is saved with both and the step's title.
Keys typed into the sheet stop there, so they never reach a lesson's shortcuts.
The sheet stays open while the lesson is used, so the learner can watch and work the figure as they write; it closes on its close button, Escape, the pill, or a save.
It is moved by dragging its header, folded down to the header, and sized from its bottom-right corner.
`float.ts` does the moving, folding and sizing, for this sheet and the review beside a lesson alike.
Where it is put is a box the pure `frame.ts` keeps inside the window (`fitBox`, `moveBox`, `resizeBox`), and the box is remembered in local storage; until the learner sets one, the sheet opens under its pill.
Both pages tell the sheet when the step changes (`refresh`), so the step it names stays the one on show.

The recall page lists every question by lesson and runs review sittings.
A sitting asks each due question in turn: the learner answers from memory, in writing or not, then checks against their last answer and the lesson itself, correcting the answer in the same box until they have it right, and says how it went.
There are three ways out of a card, which are the deck's three grades: right first time (recalled), right once corrected (shaky), or still struggling (missed), which leaves the card for the next sitting rather than asking it again in this one.
The answer graded is the answer as corrected, so a card has one attempt for each sitting, not one for each try.
Any question on show in a sitting, asked or checked, can be marked to revisit, as one the learner blanks out on (`markRevisit` in `deck.ts`).
The mark is kept on the card as the time it was made, apart from the schedule, so it syncs like any other change to a card and stays until the learner takes it off.
The overview lists the marked questions together at its head (`revisitCards`), each linking to its lesson step, to practise on their own; under them comes every question, by lesson, to reword, mark or delete.
"Check in the lesson" opens the lesson at the step the question came from: any lesson link may end in `#step-N` (`hrefOf`, `stepOfHash` in `lessons.ts`), which both kinds of page go to on load and then drop from the address.
It opens in the same tab, and the sitting goes along, so nothing the learner is working on leaves their sight.

### The review beside the lesson (`beside.ts`)

While the answer is checked in the lesson, the lesson page shows the card being checked in a sheet floating over it: where it was asked, the question, the answer in its box with Claude's remarks on its words and its feedback, rewording the question, writing new ones, and the last answer given.
All of it works there as on the recall page; only the ways out of the card (the three outcomes, Skip and End review) stay on the recall page, which its "Back to review" link returns to.
The sheet is moved by its header, folded down to it, and sized from its corner, like the question sheet, through `float.ts` over the same pure `frame.ts`, and its box is remembered apart from the question sheet's; until the learner moves it, it opens at the top left, clear of the top bar and the docked rail.
Its remarks are always under the answer, since the sheet is narrow.
Keys typed into it stop there, so they never reach the lesson's shortcuts or open the question sheet.

The sitting travels in the tab's `sessionStorage`, where it is kept at every change anyway (see below): the link marks it as taken to the lesson (`inLesson` on the kept `Sitting`), and both kinds of lesson page mount `beside.ts`, which shows the sheet while the kept sitting is taken there and checking a card that still exists (`cardInLesson`).
The lab page swaps lessons in place, so the sheet stays as the learner follows the pager or the rail; a standalone page shows it again on load.
The recall page takes the sitting back on load, as from "Back to review" or the browser's Back button, and carries on where the learner left it, with the answer as corrected, Claude's latest reading, an editor still open, and the questions written.
A page the browser brings back from its cache takes the sitting up as it now stands (`pageshow`), since the other page may have changed it.
A reading still under way when one page went is asked for again by the next, as after a reload.

Both pages hold the sitting through one `HeldSitting` (`sitting.ts`): the state, its keeping, and the calls to Claude, over the pure rules of `session.ts`.
Both draw the card through `card.ts`, and the learner's writing marked up by Claude through `sheet.ts`, which the free association uses too; `sheet.css` styles them for both pages, and each page's own stylesheet sizes them for itself.
A modified click on the link, asking for a new tab, opens the lesson there without the sitting, which stays on the recall page.

While the learner checks a written answer, Claude reads it too, while the learner is signed in, and again each time they press Check again as they correct it.
The page sends the question, where it was asked and the answer to the Worker's `/check`.
What comes back is a `Verdict`: a grade, a few sentences of feedback, and remarks, each a note on words it quotes from the answer.
The page shows the remarks as comments on a document (`remarks.ts`): the quoted words are highlighted in the answer, from a layer behind the text box that lays the same text out the same way, and the remarks are in a margin beside the answer, each by its words (`stack`), or under it on a narrower screen.
As the learner corrects the answer the remarks are placed afresh against it (`placeRemarks`), so one whose words have been changed is shown as dealt with; a quote's spaces match any run of them, since Claude may not copy them exactly.
The caret in a remark's words, or a press on the remark, picks it out in both places.

Claude's reading (a `Review`: checking, done or failed) is part of the sitting, tied to the card being checked and to the answer as it was sent (`read`): editing the answer keeps it (`editAnswer`), and a reply is taken only if it is to the answer as last sent and the question as it now stands (`settleReview`).
Grading or deleting the card drops it, and it is kept across a reload, except one still under way, which is asked for again.
The outcome its readings point to (`suggestedGrade`) is marked once Claude reads the answer as it stands as right: right first time if its first reading (`first`) was right too, fixed if not; while the answer is wrong nothing is marked, since only the learner knows when they are struggling, and the learner still picks.
Claude's `Verdict` is kept on the `Attempt` in the deck (`answerCard`) when the answer was not right first time and the reading is of the answer as graded, so it syncs and exports with the rest.
The next time the card is checked, the last attempt is there to unfold, with its words marked, and the overview's History button lists a card's attempts, newest first, with their verdicts.

While checking, the learner can reword the question (in the deck), and Claude reads the answer afresh against it: the reading of the old wording is dropped (`dropReview`), and a reply still on its way for it is ignored.
They can also write new questions from the one being checked, so what Claude said can become questions of their own; each is saved at the same lesson step and waits for the next sitting rather than joining this one.
What is being written (`Editor`), and the questions written from the card on show, are kept with the sitting across a reload, and an editor just opened takes the focus.
Number keys typed into the answer or an editor are writing, not grades; Escape leaves the answer, so they grade.

Apart from the questions, the overview's Free associate button opens a page for writing down everything the learner remembers of the course, in as much detail as they can (`associate.ts`).
While the learner is signed in, Claude reads it at the Worker's `/associate`, sent with the lessons the learner has noted questions in (`notedLessons`), a sign of what they have taken.
What comes back is a `Reading`: a few sentences of feedback, remarks on what is wrong, and up to three lessons that are the shortest next step from what the writing shows they know, each with why.
The remarks are shown and placed afresh as the writing is corrected exactly as on an answer, through the same sheet (`writingSheet` in `page.ts`), and each may name the lesson that teaches its point, which it links to.
The next steps are listed under the writing, each opening its lesson in a new tab so the writing stays.
As in a sitting, a reading is of the writing as it was sent (`sent`): editing keeps it, Read again asks afresh, and a reply is taken only if it is to the writing as last sent (`settleReading`).
The writing runs to many lines, so Enter is always a new line there, and Command- or Control-Enter has it read (`submitsOnModEnter`).
The writing and Claude's last reading of it are kept in the deck (`Writing` in `deck.ts`), so they sync to every device and wait between visits until the learner starts afresh.
A merge keeps whichever copy changed last; starting afresh is kept as empty writing with its own time, so an older copy elsewhere cannot bring the writing back, and a deck without one (as from a page that predates it) undoes nothing.
Whether a reading is under way, or failed, belongs to the page that asked and is not kept: while it is, the last reading kept stays (`toWriting`).
The page keeps the deck's copy as it writes, and takes in another device's or tab's newer copy when it arrives (`fromWriting`), replacing what is shown; edits on two devices before either syncs keep only the later.
Writing kept by the first version of the page, in `localStorage` alone, is moved into the deck on load (`readLocalAssociation`).
Whether the tab is on the free association is kept for it, so a reload comes back to it, and a reading under way when the page went is asked for again.

### Explaining on the lesson page

Beside the steps, the step column has a second tab, Explain (`explain-panel.ts`), where the learner explains the lesson's idea in their own words and has Claude check what it shows they understand.
The column takes it as a pane (`StepList.addPane`): a row of tabs heads the column, and the pane, when chosen, takes the place of the steps and their pager row, which stay as they were behind it; stacked on a phone, the column then takes as much height as the layout gives it.
Both kinds of page mount it as they mount the recall pill, saying where the learner is.
While the learner is signed in, the page sends the lesson, the step on show and the explanation to the Worker's `/explain`, and what comes back is a check's `Verdict`, shown as understood, partly there or not yet.
Its remarks are highlighted on the words they quote, from a layer behind the text box, and listed under it, placed afresh as the explanation is corrected, as on a review answer (`remarks.ts`).
As in a sitting, a check is of the explanation as it was sent (`sent`): editing keeps it, Check again asks afresh, and a reply is taken only if it is to the explanation as last sent (`settleCheck`).
Each lesson's explanation and Claude's last check of it are kept in the deck, by lesson, so they sync to every device and are there to come back to; a check under way is not kept.
Explanations kept by an earlier version in this browser alone are moved into the deck on load.

| File | Role | Pure |
| --- | --- | --- |
| `deck.ts` | Cards and their answers, with Claude's verdicts where kept, marks to revisit, the free association and Claude's reading of it, the Leitner schedule, merging two decks, the stored form and reading it back | yes |
| `session.ts` | A review sitting: ask, check, correct, grade, Claude's readings of the answer and the outcome they point to; reading one back after a reload | yes |
| `check.ts` | Having Claude check an answer: the request and verdict as page and Worker read them, what a reply means | yes |
| `explain.ts` | Having Claude check an explanation on a lesson page: the request as page and Worker read it, the explanation as it is written, checked and corrected, and as it is kept | yes |
| `explain-panel.ts` | The Explain tab of a lesson's step column | no |
| `associate.ts` | Having Claude read a free association: the request as page and Worker read it, what a reply means, the writing as it is read and corrected, and as it is kept in the deck | yes |
| `syllabus.ts`, `syllabus.json` | What each lesson teaches and builds on, written by the `/syllabus` skill or the deploy's API refresh; reading it, what is wrong with it or stale, which lessons are within reach of those known, and the course as Claude is told it | yes (the JSON generated) |
| `remarks.ts` | Claude's remarks placed on the words they quote, the answer cut into runs to highlight, the remark under the caret, the margin's stacking | yes |
| `keys.ts` | What Enter does in the text boxes: saves with a keyboard, a new line on a touch screen, and in the free association, where only Command- or Control-Enter has it read | yes |
| `labels.ts` | Where a card was asked, when it is due, its question typeset | yes |
| `frame.ts` | Where a floating sheet goes once moved or sized, kept inside the window | yes |
| `sync.ts` | What the Worker's replies mean, a wrong key told from a sign-in run out, whether there is anything to send, how syncing stands | yes |
| `store.ts` | The deck in `localStorage`, shared between tabs through the `storage` event | no (storage injected) |
| `remote.ts` | Syncing with the Worker: when, the requests, the state; `openRecall` for every page; sending an answer to check, a free association to read, and an explanation to check, all with the session cookie | no (browser injected) |
| `signin.ts` | The link to the sign-in page, opened in a new tab wherever a page finds the learner signed out | no |
| `id.ts` | New card ids | no |
| `capture.ts` | The pill and sheet on a lesson page | no |
| `float.ts` | A sheet over a lesson that moves, folds and sizes, its box remembered | no |
| `sitting.ts` | The sitting under way in the tab, held for the page showing it: its state, kept for the tab, and Claude's readings | no (storage injected) |
| `card.ts` | The card a sitting is on: the question, the answer, Claude's reading, rewording and new questions | no |
| `sheet.ts` | The learner's writing marked up by Claude, and an answer as given | no |
| `dom.ts` | Markup helpers, and redrawing without losing the learner's place in a text box | no |
| `beside.ts` | The review beside a lesson, while the sitting is taken there | no |
| `page.ts` | The recall page: overview, sittings, the free association, signing in and syncing, saving to and loading from a file | no |

Scheduling is a Leitner system.
A card starts in box 0, due at once; recalling it moves it up a box, a shaky answer moves it down one (never below 1), and a miss sends it back to 0.
Boxes 1 to 5 come back after 1, 3, 7, 16 and 35 days, each a few hours early, so a card answered in the evening is ready the next morning.

Removing a card leaves a `Removal` behind, the card's id and when, so that merging with a copy made before the removal does not bring the card back.
Two decks merge question by question: each takes whichever state came last, a copy of the card or its removal, with ties settled the same way whichever deck each came from.
So the merge's result does not depend on the order decks meet in, and merging again changes nothing; devices that swap decks in any order end up holding the same one.

The deck lives in the browser, and also on the web at `/deck`, through the site's Worker (`worker/`), so it is the same on every device.
Every page that holds the deck (the menu, the lessons, the recall page) opens it through `openRecall`, which starts syncing at once.
A sync sends the whole deck and merges the Worker's reply into the store: when the page opens, shortly after a change, when the tab is shown or hidden, when the browser comes back online, and every few minutes while on show.
A change to the free association alone, which comes with every key pressed, is sent once the writing pauses for ten seconds rather than a second and a half after each key, and never puts off a change to the questions (`sendWhen` in `sync.ts`).
Taking a reply in is not itself a change to send, since `hasNews` compares the deck with the Worker's copy as last heard.
While syncing cannot happen, nothing is lost: the deck is still in `localStorage`, and goes with the next sync that works.

Every request to the Worker carries the learner's session cookie (see "Signing in"), which a page's script never sees; signed out, or once the sign-in has run out after 30 days, the Worker answers 401.
On staging, Cloudflare Access may answer first, before the Worker sees the request: with a 401, since every request says it is one (`X-Requested-With`), or else a redirect to its sign-in page, which the page does not follow.
Any of these stands syncing as signed out (`signedOut` in `sync.ts`): the deck is kept here as when offline, and syncing goes on trying at every cause it has, so it picks up once the learner signs in.
Until the first reply, syncing stands as under way, and checks and readings may be asked for; once signed out, the pages hide them (`canCheck`), and one asked for meanwhile fails saying so (`mend: "sign-in"`).
Where a page says either, it offers to sign in (`signin.ts`): a link opening `signin.html` in a new tab.
A call to Claude the Worker refuses with 402, for want of beta credit or of a working key of the learner's own, fails with `mend: "account"`, and the page links to the learner's account on the same page instead (`failedReply` in `check.ts`).
The tab they came from keeps everything they wrote, syncs when it gets the focus back, and can ask Claude again.
The recall page can also save the deck to a JSON file and load one back, merged the same way.
A sitting under way is kept in the tab's `sessionStorage`, with the answer being written, because a phone often reloads a tab left in the background, and because that is how the sitting goes to the lesson and back (see "The review beside the lesson").

Every change to the store is read-modify-write against storage, so two tabs cannot undo each other's questions; if storage refuses a write, the page keeps its deck for as long as it is open and says so.

## The Worker (`worker/`, `wrangler.jsonc`)

The whole site is one Cloudflare Worker.
The built pages (`dist/`) are its static assets, served without running any code; only `/deck`, `/check`, `/associate`, `/explain`, `/account` and `/auth/*` run the Worker (`run_worker_first`).
Pages and deck sharing one origin is a security boundary, not just tidiness: the session cookie belongs to no other site, and the pages call the deck without any CORS, so no page elsewhere can read its answers.
Asset requests go through Cloudflare's default HTML handling, so `recall.html` redirects to `/recall`, and query strings such as `?lesson=` survive the redirect; `slugOfLocation` reads either form.
The static redirects in `public/_redirects`, copied into the build, send the addresses of lessons that moved into the lab on to them.
In development, Vite sends `/deck`, `/check`, `/associate`, `/explain`, `/account` and `/auth/*` on to the Worker that `npm run preview` runs on port 8787; a cookie belongs to a host, not a port, so a sign-in made through either serves both.

The Worker serves one resource, `/deck`: `GET` answers with the deck held, and `POST` merges the deck sent into it with `mergeDecks` and answers with the result.
Every request must come from the site's own pages, which send `X-Requested-With`, or it is refused with 403: no other site's page can send that header without the Worker's leave, which it never gives, so none can make a signed-in learner's browser call it.
It must name a signed-in learner by the session cookie (see "Signing in"), or it is refused with 401.
A rate limit per caller address (`LIMITER`, 60 a minute) is checked first.
A deck declared larger than 5 MB is refused before it is read.
A merge takes the latest change, so a change dated far ahead would win every merge until that time came; the Worker refuses any dated more than an hour ahead of its clock, which leaves room only for a device's clock being a little off.

Each learner has a deck of their own, in a Durable Object (`RecallDeck`) named by the email they signed in with (`deckFor` in `rules.ts`), so a demo account starts empty and never sees anyone else's.
The owner, named by the `OWNER_EMAIL` secret, keeps the object the site used while it had one learner (`LEGACY_DECK`), so nothing held there moved; everyone else's is `learner:<email>`, the email compared without case.
With `OWNER_EMAIL` unset the deck answers 503, so no one can be handed the owner's.

### Signing in (`auth.ts`, `accounts.ts`, `src/auth`)

The site has its own sign-in, by email link, for invited addresses only; production has no Cloudflare Access in front.
The learner enters their email on `signin.html` (`src/auth`), which posts it to `/auth/link`.
If the address is the owner's or on the `INVITES` secret, the Worker makes a random token, keeps its SHA-256 hash for 15 minutes, and emails a link to `signin.html?token=…` through Cloudflare Email Sending (the `EMAIL` binding, from the `SENDER` var).
The answer is the same 202 whether or not the address is invited, so the page never shows who is; a tighter rate limit per address (`LINK_LIMITER`, 3 a minute) keeps it from being used to flood someone's inbox.
The link opens the page, which takes the token out of the address and offers to finish signing in; only that button's post to `/auth/session` spends the token, so a mail scanner opening links ahead of the learner cannot.
The Worker trades the token, once, for a session: another random token, kept as its hash for 30 days, set in an `HttpOnly`, `SameSite=Lax` cookie (and `Secure` over HTTPS), so no script, and no other site's request that changes anything, carries it.
`GET /auth/session` says who is signed in, and `DELETE` signs out, forgetting the session.
Who is invited is read from the secrets on every request, so taking an address off `INVITES` ends that learner's sessions at once.

What to do with each request, the invite list, the cookie and the email are pure (`auth.ts`); the links and sessions are kept in one Durable Object (`Accounts`), each as its token's hash, so nothing it holds could sign anyone in, and expired ones are pruned as it goes.
With `SENDER` unset, asking for a link answers 503, and a deploy refuses to start (`tools/deploy-guard.ts`).
Locally, the email binding sends nothing, but logs the message and writes it under `.wrangler/tmp/email`, which is how the Worker test reads its links.

A deck's object holds a row per question in its SQLite storage: a card, or the time it was removed; the free association in a table of its own, of at most one row; and each lesson's explanation in another.
It reads the deck, merges, and writes the rows that changed in one synchronous transaction, and requests reach it one at a time, so two devices syncing at once cannot undo each other.
The merge rule is the pages' own (`src/recall/deck.ts`, which has no DOM), so the Worker and the pages cannot disagree on it.

`POST /check` takes a `CheckRequest` and answers with Claude's `Verdict`, a grade and feedback (`src/recall/check.ts` and `deck.ts`, shared with the page like the rest of the deck).
It is guarded by the same sign-in and rate limit, and also by a tighter one of its own (`CHECK_LIMITER`, 10 a minute), since each check is a paid call to Claude.
The Worker calls the Claude API with the official SDK and its own `ANTHROPIC_API_KEY` secret, so the Claude key never reaches a browser; without that secret, checking answers 503 and the deck works as before.
The call (`check.ts`) uses Claude Opus 5.5 at medium effort, with structured output to a schema of the verdict, and server-side fallbacks, so a request a safety classifier declines is run again on the model Anthropic recommends.
The learner's text is put in tags the system prompt says are material to judge, not instructions.
Whatever comes back is read with the same `readVerdict` the page uses, and a refusal, a cut-short reply or a failed call becomes a 502 saying why.
`ANTHROPIC_BASE_URL` (a var in `wrangler.jsonc`) says where the Claude API is, so the Worker test can stand one in.

`POST /associate` takes an `AssociateRequest` and answers with Claude's `Reading` (`src/recall/associate.ts`, shared with the page).
It is guarded as `/check` is, counted against the same `CHECK_LIMITER`, with a size limit of its own; the paths that call Claude are listed once, in `CLAUDE_PATHS` (`rules.ts`).
The call (`associate.ts`) gives Claude the course as its system prompt (`course`): every chapter with the results it teaches, and every lesson by slug, name, place and what the learner does in it, built from `src/lessons.ts`, so it never falls out of step with the course.
Where the syllabus describes a lesson, the prompt also says what it teaches and which lessons it builds on, and the request names the lessons within reach of those noted (`withinReach`).
That prompt is the same in every request, so it is cached, since a learner reads, corrects and asks again within minutes.
Every call to Claude logs one JSON line of what it used (`usageLine`): the route, model, effort, and tokens uncached, written to and read from the cache, and out; filtering the Worker's logs on `claude_usage` shows what checks and readings cost, and whether the cache is being read.
It uses Claude Opus 5.5 at medium effort, since what each lesson teaches and builds on is worked out ahead in the syllabus, with structured output whose lessons are an enum of the course's slugs, and the same fallbacks; the reply is read with the page's own `readReading`, which drops any lesson not in the course.

`POST /explain` takes an `ExplainRequest` and answers with Claude's `Verdict` (`src/recall/explain.ts`, shared with the page).
It is guarded as `/check` is, counted against the same `CHECK_LIMITER`, with a size limit of its own.
The call (`explain.ts`) tells Claude the lesson: its chapter, name and what the learner does in it, and what it teaches where the syllabus says, so the explanation is judged against the lesson.
It asks for the verdict to the same schema as a check, on the same model at the same effort, and reads the reply with the same `verdictOf`.

### Paying for Claude (`billing.ts`, `vault.ts`, `src/auth/account.ts`)

Every call to Claude is paid for in one of three ways, decided afresh on each call (`fund`): with the learner's own Claude API key once they have saved one, unmetered; with the site's key for the owner, unmetered; or with the site's key for anyone else, out of their beta credit.
Beta credit is the `BETA_CREDIT_USD` var, or the learner's own amount in the `CREDITS` secret, and is counted in micros, millionths of a dollar, so sums never drift.
What a call cost is worked out from the tokens its reply says it used (`costOf`), at the list price of each model that served it: a reply a fallback served lists each model's run in `usage.iterations`.
All beta spending together stops at `MONTHLY_CAP_USD` a calendar month (UTC), so a slip in the metering can never run up an open-ended bill.
With no credit left, or the month's cap reached, the call is refused with 402 before Claude is asked; a learner's own key that Claude turns down is refused with 402 too.
A call is let through while any credit is left and charged after, so the last call may take a learner a little below nothing; `CHECK_LIMITER` bounds how far.

`GET /account` says how the signed-in learner's calls are paid for (a `ClaudeAccount`), `PUT` saves a key of their own, and `DELETE` forgets it; the sign-in page shows it, once signed in, as the learner's account.
A key is saved only once Claude takes it (a `GET` of the model it will be asked for), and is kept encrypted with the `VAULT_KEY` secret (AES-GCM, `vault.ts`), bound to the learner's email so it cannot be moved to another's row.
It is never sent back: the page sees only its last four characters.
A key that will not decrypt, as after `VAULT_KEY` is replaced, counts as none, and the learner's calls fall back to their credit.
The `Accounts` object keeps, beside sign-ins, each learner's sealed key and what they have spent, and what beta credit has spent each month; a charge adds to both in one transaction.
The `claude_usage` log line of every call also says who paid (`paid_by`) and what it cost (`micros`).

| File | Role | Pure |
| --- | --- | --- |
| `rules.ts` | Which request it is, whether it is the site's own and signed in, the learner's deck, the rate limit, size and clock checks | yes |
| `auth.ts` | Signing in: what to do with a request to `/auth/*`, the invite list, the session cookie, and the sign-in email | yes |
| `accounts.ts` | The `Accounts` object, holding sign-in links and sessions by their tokens' hashes, learners' sealed keys, and what beta credit has spent | no |
| `billing.ts` | Who pays for a call to Claude, what it cost, the credit each learner has, and the key a learner pastes | yes |
| `vault.ts` | Learners' own Claude API keys, encrypted with `VAULT_KEY` and opened again | no (WebCrypto) |
| `access.ts` | Cloudflare Access tokens taken apart and their claims checked, for staging's dev tools | yes |
| `access-keys.ts` | A token's signature checked against the Access team's published keys | no |
| `check.ts` | The request to Claude to check an answer, the verdict or failure read from its reply, and what a call used (`usageLine`) | yes |
| `explain.ts` | The lesson as Claude is told it, and the request to Claude to check an explanation | yes |
| `associate.ts` | The course as Claude is told it, with the syllabus, the request to Claude to read a free association, and the reading or failure read from its reply | yes |
| `index.ts` | The fetch handler, the calls to Claude with their token usage logged, and the `RecallDeck` object | no |
| `worker-configuration.d.ts` | The Worker's types, generated by `npm run worker:types` | generated |

## The syllabus (`src/recall/syllabus.json`, `/syllabus`)

To pick next steps well, Claude needs to know what each lesson teaches and what it needs first, which lesson names alone do not say.
The syllabus says it: for each lesson, a few statements of what it establishes and the lessons it builds on directly, written from the lesson's source by one guide (`tools/syllabus-guide.md`).
The file is generated: it is changed only through `tools/syllabus.ts`, never by hand.

Each entry is stamped with a hash of its lesson's teaching text: its name, place and description, and the `title` and `text` strings of its steps, likes and uses (`teachingText`), with a standalone page's own directions and asides.
A change to how a lesson draws or moves leaves its entry as it was; a change to what it says makes it stale.
Keeping it current needs no one to remember anything, in two layers:

- A test fails while any lesson is undescribed or stale (`tools/syllabus.test.ts`), naming them.
  Lessons are written in Claude Code, which fixes failing tests, and the project's `/syllabus` skill (`.claude/skills/syllabus/SKILL.md`) is how: Claude Code reads the lessons' source and writes their entries, at no Claude API cost.
- `npm run deploy` first runs `node tools/syllabus.ts refresh`, which describes whatever is still stale through the Claude API (`tools/syllabus-claude.ts`), with the key from the environment or `.dev.vars`, so nothing stale is deployed.
  Every request in a run shares one cached system prompt, the guide and the course, so a lesson costs a few cents.
  Without a key, the deploy stops and says to run `/syllabus`.
  The refreshed file is then committed with the rest.

`tools/syllabus.ts` also lists what is stale (`status`), stamps entries Claude Code wrote (`stamp`), and checks the file (`check`): no unknown lessons, none building on itself, no circles.
The Worker reads the file when it is built, so a change reaches Claude with the next deploy.

## Dev-only UI feedback (`src/dev/feedback`, `tools/feedback-plugin.ts`)

A review aid for the dev server and staging, separate from the lessons: Alt-click any element to leave a comment on it.
The Vite plugin injects `overlay.ts` into every page under `vite dev` and in the staging build only (`devTools`, `tools/staging-mode.ts`); on the dev server it appends each comment it receives to `ui-feedback.md`, and on staging the staging Worker keeps it until pulled (see "Staging").
No page imports the overlay, so it can never reach a production build, and no lesson knows it exists.
The overlay takes Alt-clicks in the capture phase before a lesson sees them, and keys typed into its comment box stop at the box.

| File | Role |
| --- | --- |
| `dev/feedback/entry.ts` | The comment's wire format, its validation and its Markdown form. Shared by page, dev server and staging Worker; no DOM or Node APIs. |
| `dev/feedback/capture.ts` | Clicked element → selector, description and click position. |
| `dev/feedback/overlay.ts` | The outline, the comment box and the post to the server. |
| `tools/feedback-plugin.ts` | Injects the overlay and records comments. Runs in Node. |

## Dev-only copy editor (`src/dev/copy`, `tools/copy-editor-plugin.ts`, `worker/copy-check.ts`)

An authoring aid for the dev server and staging: a lesson's copy can be edited on its page, fact-checked by Claude, and saved into the source, since the repository is where the text lives.
The copy is three sections of entries, each a title and a text: the steps, what the idea is like ("likes"), and what it is used for ("uses").
A standalone page's steps are its entry in `directions` (`src/directions.ts`) and its likes and uses its entry in `asides` (`src/asides.ts`); a lab lesson's are the `steps`, `likes` and `uses` arrays of its module.
Like the feedback overlay, the plugin injects `pane.ts` into every page under `vite dev` and in the staging build only, so no page imports it and it can never reach a production build.

The editor is a Copy tab in the step column, added with `StepList.addPane` beside the steps (and the Explain tab, where there is one); being injected rather than imported, it finds the column with `whenStepColumn`, and follows the lab's lesson swaps through `onShow`.
It asks the server for the page's copy as the source writes it (`CopyListing`), and shows every field as raw source text, with step text typeset below as the column will show it and what the lesson tests would refuse in it.
A field built in code rather than written as a string literal is shown as such, and cannot be edited here.
Drafts are kept in `localStorage` per page, each with the source text it was written over, so a draft kept across a reload is dropped rather than saved over copy that has changed under it.

A save posts every changed entry at once (`CopyEdit`), each with the entry as it was listed; the server finds each entry in the source again, rewrites only its literals' spans, keeping their quotes, and writes the files only if every edit applies.
Vite sees the change and reloads the page, which comes back to the Copy tab.
On staging the same request reaches the staging Worker, which commits all of it to the staging branch in one commit and answers with the commit (`SaveReply`); the page goes on running its build until staging redeploys, so the editor reopens on the copy as committed.

Every save also keeps what it replaced: the lesson's history file, `copy-history/<slug>.json`, gains the save's time and, for each field it changed, the text before and after (`history.ts`).
It is written with the source it records, in the same write on the dev server and the same commit on staging, so a field's original wording stays in the repository beside it: the `was` of the field's first change.
A history file that cannot be read refuses the save rather than being written over.

A fact-check posts the copy as drafted (`CheckRequest`); the server asks Claude to check it (`worker/copy-check.ts`), told the lesson as an explanation's check tells it and given the copy field by field.
Claude may search the web for the copy's real-world claims, and answers in a fixed JSON form (`CopyCheck`): a summary, and remarks that each name a field, quote its words, say what is wrong and give the words to put there instead where it can.
The remarks are placed on the words they quote as the Explain tab's are (`recall/remarks.ts`), afresh as the author edits, so a remark on words since changed shows as dealt with, and a fix is applied by putting it in place of those words.
The dev server calls Claude with the key in `.dev.vars`; the staging Worker with its own, under the check rate limit.

The editor's decisions are a pure core, `edit.ts`: the copy, its drafts and the check as values in, new values and the requests to send out.
The finding and rewriting are another, `source.ts`: source text in, source text out, used alike by the dev server and the staging Worker.
It parses the source with Babel's parser rather than matching patterns, so comments, other strings and formatting never confuse it; the parser is small enough for a Worker, where the TypeScript compiler is not.
A field is editable only where the source writes it as a plain string literal; one built in code, an entry that has changed since it was listed, or an entry it cannot tell from another is refused, and the source is left alone.
Every lesson's copy is found this way today, and a test keeps it so.
Edited copy changes its lesson's teaching text, so its syllabus entry goes stale and the syllabus test fails until `/syllabus` describes it again (see "The syllabus").

| File | Role |
| --- | --- |
| `dev/copy/wire.ts` | The listing, edit and save wire formats and their validation. Shared by page, dev server and staging Worker; no DOM or Node APIs. |
| `dev/copy/check.ts` | The fact-check's request and reply, and reading each. Shared likewise. |
| `dev/copy/draft.ts` | A field as typed → the text a save writes, its preview, and what the lesson tests would refuse in it. Pure. |
| `dev/copy/history.ts` | A save → what it adds to its lesson's history file of the text it replaced. Shared likewise. |
| `dev/copy/edit.ts` | The editor's state: drafts over the listing, what a save and a check send, and the check's remarks placed on the copy as it stands. Pure. |
| `dev/copy/pane.ts` | The Copy tab, and the calls to the server. |
| `dev/copy/source.ts` | A page → where each section of its copy is written; the entries in a source; a source with entries rewritten. Pure. |
| `worker/copy-check.ts` | The request to Claude to fact-check copy, and what its reply comes to. Pure but for the call it is handed. |
| `tools/copy-editor-plugin.ts` | Injects the editor, lists a page's copy, writes saves one at a time, and asks Claude for checks. Runs in Node. |

## Dev-only draft tab (`src/dev/drafts`, `tools/drafts-plugin.ts`)

An authoring aid for the dev server and staging, for the text that is to replace the step-based lessons: each lesson's new text written by hand, from what the author has come to understand of it in the Explain tab.
The plugin injects `pane.ts` into every page under `vite dev` and in the staging build only, as the copy editor's does, so it can never reach a production build.

The tab is a Draft tab in the step column, beside the steps, the Explain tab and the Copy tab, found and kept in step with the lab's lesson swaps as the Copy tab is.
It shows what the author has written in the lesson's Explain tab, read from the recall deck (`openRecall`) and kept current as the deck changes, above a box for the draft, typed as Markdown with `$…$` LaTeX, and the draft as it reads below it: headings, paragraphs, and the mathematics typeset.
The draft is kept in `localStorage` per lesson until it is saved, with the saved draft it was written over, so a reload loses none, and text kept over a draft saved since is flagged as such.

A lesson's draft is kept in `lesson-drafts/<slug>.md`.
A save (`DraftSave`), offered only once the draft has changed and is not blank (`canSave`), carries the draft, the draft as it was listed when the author began, and every explanation in the author's deck with something written.
The server writes the draft, unless it is blank, and each explanation to `lesson-drafts/<slug>.explanation.md`, where they differ from what is there (`draftWrites`, `wire.ts`), so the Explain tab's text, otherwise only in the deck, is kept in the repository beside the drafts written from it.
A save begun on a draft that has been saved since is refused rather than written over it.
The dev server writes the files; the staging Worker commits them to the staging branch in one commit, as it commits copy edits (see "Staging").
Nothing in the page changes with a saved draft, so neither reloads it.

| File | Role |
| --- | --- |
| `dev/lesson.ts` | A page → the lesson it shows. Shared by the copy editor and the draft tab; no DOM or Node APIs. |
| `dev/drafts/wire.ts` | The listing, save and reply wire formats, the files a save keeps, and what it writes. Shared by page, dev server and staging Worker; no DOM or Node APIs. |
| `dev/drafts/edit.ts` | The tab's state: the draft over the listing, what to keep in the browser, what a save sends, and the draft as preview blocks. Pure. |
| `dev/drafts/pane.ts` | The Draft tab, and the calls to the server. |
| `dev/ui.ts` | What the dev-only tabs share in the page: elements, storage, calls and the toast. |
| `tools/drafts-plugin.ts` | Injects the tab, reads a lesson's draft, and writes saves one at a time. Runs in Node. |
| `tools/http.ts` | What the dev-only tabs' plugins share: reading a JSON body and answering in JSON. Runs in Node. |

## Staging (`worker/staging.ts`, `env.staging`, `.github/workflows/staging.yml`)

Staging is the site with the dev tools in, on the web, so the feedback overlay, the copy editor and the draft tab work without a local server.
It is a Worker of its own, `triangle-lab-staging`: its own decks, sign-ins and rate limits, so testing never touches the real ones.
Production cannot grow the dev tools by accident: they are only in the staging build (`npm run build:staging`, `vite build --mode staging`, into `dist-staging/`), and their endpoints only in the staging Worker's entry point, which wraps the production one (`index.ts`) and passes every other request to it.

Cloudflare Access guards the whole staging host, so a page or asset is only served to someone signed in.
Its deck and calls to Claude need a sign-in of the site's own, as production's do; the dev tools' endpoints also check the token Access forwards (`Cf-Access-Jwt-Assertion`): signed with one of the team's published keys, issued by the team (`ACCESS_ISSUER`), for the application (`ACCESS_AUD`), and in date.
With either var unset they answer 503, so a misconfigured staging fails closed.

The tools keep their endpoints and wire formats; only where things land differs.

- **Copy edits** are committed to the `staging` branch through GitHub's Git Data API, with a token scoped to the repository (`GITHUB_TOKEN`).
  The Worker reads the files at the branch's head, rewrites them with the same core the dev server uses, and makes one commit of them on that head; if the branch moved meanwhile GitHub will not move it to the commit, and the edits are made again on the newer files, which still hold the entries only if nobody changed them.
  Listing the copy reads the branch too, so copy edited twice before staging redeploys is found as it now reads.
- **Drafts** are committed to the `staging` branch the same way, the draft and the explanations a save keeps in one commit, made again on the newer files if the branch moved, and refused if the draft itself was saved since the author began.
  A save may be larger than the other tools' requests, as it carries every explanation in the deck (`MAX_DRAFT_BODY`).
- **Fact-checks** call Claude with staging's `ANTHROPIC_API_KEY`, under the same rate limit as the learners' checks.
- **UI comments** are kept in a Durable Object (`StagingInbox`) until `npm run staging:pull` (`tools/staging.ts`) appends them to the local `ui-feedback.md`, formatted as the dev server formats them, and tells staging to forget them.
  The pull gets past Access with a service token from `.dev.vars`.

A push to `staging` redeploys it, unless it holds only drafts, which change nothing the site serves; a push to `main` is merged into `staging` first, so staging is always `main` plus the edits made there.
The workflow builds but does not test: edited copy leaves its lesson's syllabus entry stale, which the syllabus test refuses until `/syllabus` runs on the way to `main`.

| File | Role |
| --- | --- |
| `worker/staging-rules.ts` | Which dev tool and action a request is, whether its Access token holds up (`access.ts`), and the GitHub requests. Pure. |
| `worker/staging.ts` | The staging entry point: checks the token's signature, reads and commits through GitHub, and holds the comments (`StagingInbox`). |
| `tools/staging-mode.ts` | Which builds carry the dev tools (`devTools`). |
| `tools/staging.ts` | `npm run staging:pull`. Runs in Node. |
| `.github/workflows/staging.yml` | Merges `main` into `staging` and deploys it. |

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
- `Card`, `Deck`, `Place`, `Attempt`, `Removal` (`src/recall/deck.ts`): a noted question, where it was asked, its answers, when it is next due, and a removed one.
- `Verdict` (`src/recall/deck.ts`): Claude's grade and feedback on an answer, kept on an `Attempt` graded missed or shaky.
- `SavedDeck` (`src/recall/deck.ts`): the deck as stored, exported, and sent to and from the Worker.
- `SyncState`, `Reply` (`src/recall/sync.ts`): how syncing stands, and what came back from the Worker.
- `Session`, `Sitting` (`src/recall/session.ts`): a review sitting in progress, and as kept for the tab, with what is being written and whether it has been taken to the lesson.
- `CheckRequest`, `Review` (`src/recall/check.ts`): an answer sent to be checked, and where a sitting stands on getting Claude's verdict.
- `Writing`, `Reading`, `Note`, `NextStep` (`src/recall/deck.ts`): the free association as kept in the deck, and Claude's reading of it: feedback, remarks each with the lesson that teaches its point, and the shortest next steps.
- `AssociateRequest`, `Association`, `ReadingState` (`src/recall/associate.ts`): a free association sent to be read, the one on show as written, and where it stands on getting Claude's reading.
- `ExplainRequest`, `Explanation` (`src/recall/explain.ts`): an explanation sent to be checked, and the one on show as written, with where it stands on getting Claude's check.
- `Syllabus`, `Entry` (`src/recall/syllabus.ts`): what each lesson teaches and builds on, stamped with a hash of the source it was written from.

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
- `src/ar/pose.test.ts`: the AR sheet's matrix, unprojecting a pointer onto it under any pose, each gesture, the limits that keep it in front of the eye, picking handles on screen, and the canvas resolution.
- `src/ar/chrome.test.ts`: the AR step card and pose panel against a DOM stand-in, the sliders read back, and the lab page's way into AR.
- `src/recall/deck.test.ts`, `session.test.ts`, `labels.test.ts`, `keys.test.ts`: the recall schedule, the free association merged and kept, review sittings and Claude's reading in them, a sitting kept for the tab and taken to the lesson, links to a step, labels and the Enter key.
- `src/recall/check.test.ts`: reading a check request, a verdict with its remarks, and a reply from `/check`.
- `src/recall/associate.test.ts`: the lessons noted in, reading a free association request, a reading with its remarks and next steps, a reply from `/associate`, the writing read, corrected and read again, and kept in the deck.
- `src/recall/syllabus.test.ts`: reading and saving the syllabus, what is wrong with one, what is stale, and the lessons within reach.
- `tools/syllabus.test.ts`: every lesson's source found and its teaching text hashed, and the syllabus as committed sound and describing every lesson as it now stands.
- `tools/syllabus-claude.test.ts`: the request to the Claude API to describe a lesson, and reading its reply.
- `src/recall/remarks.test.ts`: remarks placed on their words and afresh as the answer changes, the runs to highlight, the remark under the caret, and the margin's stacking.
- `src/recall/store.test.ts`: the deck saved, shared between tabs, and kept when storage refuses.
- `src/recall/capture.test.ts`: noting a question from a lesson page, against a DOM stand-in, and moving, folding and sizing the sheet.
- `src/recall/frame.test.ts`: where the moved or sized sheet goes, kept inside the window.
- `src/recall/page.test.ts`: the recall page driven as a learner would, from the overview through a whole sitting, across a reload and on a touch screen, syncing signed in and signed out, and Claude checking answers against a stand-in Worker: remarks highlighted on their words and dealt with as the answer is corrected, reading it again, the outcome suggested, the reading kept with the answer and shown next time and in the history, nothing sent without a written answer or while signed out, trying again, and reloads; checking in the lesson: the question, the answer and Claude's reading taken to a lesson page and corrected, read again, reworded and added to there, kept across its reload and brought back to the recall page, the browser's Back button and cache, a reading under way asked for again, keys kept from the lesson, and folding; and free associating: opened from the overview, read by Claude with its remarks on the words and lessons linked, corrected and read again from the keyboard, kept across reloads, asked again after one, failures, signed out, and starting afresh.
Each reload takes off what the last load of the page listened to on the window and the document, as closing the tab would, so a sitting from an earlier test cannot hear this one's keys.
- `src/recall/sync.test.ts`, `remote.test.ts`: syncing's rules, and syncing from a page against a stand-in Worker: when it sends, the free association once it pauses, two pages kept the same, offline, the session cookie sent, and signed out, from the Worker or staging's Access, and recovered from.
- `worker/rules.test.ts`: routing to the deck, to checking, to free association and to explanations, the site's own pages only, signed in only, each learner's deck, rate limit, size and clock checks, and calls to Claude off without a Claude key.
- `worker/auth.test.ts`: who is invited, what to do with each request to `/auth/*` without telling who is invited, a link redeemed, the session cookie, and the sign-in email.
- `worker/access.test.ts`: Access tokens taken apart and their claims checked.
- `worker/explain.test.ts`: the lesson as Claude is told it, and the request to check an explanation.
- `tools/deploy-guard.test.ts`: the deploy guard, which vars `wrangler.jsonc` leaves empty that the Worker cannot run without.
- `worker/check.test.ts`: the request to Claude, reading its verdict, a refusal or a failed call, and the usage line logged for each call.
- `worker/associate.test.ts`: the course as Claude is told it, with what the syllabus says and the lessons within reach, the request to read a free association, and reading its reply or a refusal.
- `worker/worker.test.ts`: the real Worker in the local Workers runtime (wrangler's test harness), from `wrangler.jsonc` with stand-in assets: pages served beside the deck, the deck's HTTP contract and refusals, the rate limit, the deck kept across eviction, two devices syncing questions and the free association through it, answers checked through a stand-in Claude API: the Worker's key and request, refusals, and the check rate limit, free associations read and explanations checked through it, and signing in: the link emailed only to an invited address, spent once, the session it makes, who, signing out, a demo account's deck of its own, and nothing served without a session or from another site; and paying for Claude: calls metered out of beta credit and refused once it is spent, a learner's own key tried, kept, used unmetered, turned down and removed, and the owner unmetered.
- `worker/billing.test.ts`: what a call cost at each model's rates, cache writes and fallbacks included, the credit each learner has, who pays for a call or why no one can, the account page's account, and reading a pasted key.
- `worker/vault.test.ts`: a learner's key sealed and opened again, and not opened for another learner, with another `VAULT_KEY`, or once altered.
- `src/dev/feedback/feedback.test.ts`: element selectors and descriptions, and the feedback entry format.
- `tools/feedback-plugin.test.ts`: the feedback plugin on a real dev server — overlay injection and comments written to file.
- `src/dev/copy/copy.test.ts`: reading a save and a fact-check's request and reply, the editor's drafts and their previews, and the editor's state: drafts kept and dropped, what a save and a check send, and remarks placed and fixed.
- `src/dev/copy/source.test.ts`: where each section of a page's copy is written, finding entries and rewriting them in small sources, literals that read back as written in every quote, and every real lesson's copy found in its source as the page shows it.
- `src/dev/copy/history.test.ts`: the changes a save records, a lesson's history started and added to, nothing written for a save that changes nothing, and an unreadable history refused rather than written over.
- `worker/copy-check.test.ts`: the request to Claude to fact-check copy, a paused search taken up again, and reading the check, a refusal or a cut-short reply.
- `tools/copy-editor-plugin.test.ts`: the copy editor plugin on a real dev server — editor injection, copy listed from source, a save written to every file it touches or to none, with its history, stale edits refused, and a fact-check through a stand-in Claude.
- `src/dev/drafts/drafts.test.ts`: reading a draft's save, the files it keeps and what it writes, a blank draft never written, a save over a draft saved since refused, the tab's state as the author writes, keeps and saves, and the draft as preview blocks.
- `tools/drafts-plugin.test.ts`: the drafts plugin on a real dev server — tab injection, a draft written with the explanations it keeps and read back, and a save over a draft saved since written nowhere.
- `worker/staging-rules.test.ts`: routing to the dev tools on staging behind Access, and the GitHub requests.
- `worker/staging.test.ts`: the real staging Worker in the local Workers runtime, from `env.staging`, against stand-ins for GitHub and the Access team's keys: production's deck beside the dev tools, served to a learner signed in by email link, nothing let into the dev tools without a signed token for the application, copy listed from the branch, a save committed in one commit with its history on the head it was made on and made again when the branch moved, a fact-check through a stand-in Claude API, a draft committed with the explanations it keeps, made again when the branch moved and refused over one saved since, and comments kept until pulled.
- `tools/staging.test.ts`: which builds carry the dev tools, finding staging in `.dev.vars`, and pulled comments written as the dev server writes them.
- `tools/dev-vars.test.ts`: reading a value from `.dev.vars`.
- `src/auth/signin.test.ts`: the sign-in page's views, from the address it opens at and each answer from `/auth/*`.
- `src/auth/account.test.ts`: the account page's section on paying for Claude, from each answer from `/account`, and what it says of credit and keys.

None of this checks how a lesson looks, and no test sees a real hand: gesture thresholds are tuned by eye and exposed in the settings panel for that reason.

# Further Reading

- `README.md`: running the project and adding a lesson.
- `specs/`: design notes for the original triangle lessons.
