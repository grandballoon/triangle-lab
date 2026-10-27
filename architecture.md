# Project Overview

Triangle Lab is a set of interactive geometry lessons drawn over the learner's webcam.
The learner moves points with a mouse, a finger, or a hand held up to the camera, and steps through visual proofs.
It is a static site: Vite builds a handful of HTML pages, and everything runs in the browser.
The exceptions are the recall deck, which a Cloudflare Worker keeps on the web so it is the same on every device, and answer checking, which asks Claude through that Worker; the Worker also serves the pages.

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
On a canvas taller than wide, `pythagoras.ts` shows its proof below the triangle rather than beside it.

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
A sitting asks each due question in turn: the learner answers from memory, in writing or not, then checks against their last answer and the lesson itself, correcting the answer in the same box until they have it right, and says how it went.
There are three ways out of a card, which are the deck's three grades: right first time (recalled), right once corrected (shaky), or still struggling (missed), which leaves the card for the next sitting rather than asking it again in this one.
The answer graded is the answer as corrected, so a card has one attempt for each sitting, not one for each try.
"Check in the lesson" opens the lesson in a new tab at the step the question came from: any lesson link may end in `#step-N` (`hrefOf`, `stepOfHash` in `lessons.ts`), which both kinds of page go to on load and then drop from the address.

While the learner checks a written answer, Claude reads it too, once the browser has the sync key, and again each time they press Check again as they correct it.
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
What is being written (`Editor`) is kept with the sitting across a reload, and an editor just opened takes the focus.
Number keys typed into the answer or an editor are writing, not grades; Escape leaves the answer, so they grade.

| File | Role | Pure |
| --- | --- | --- |
| `deck.ts` | Cards and their answers, with Claude's verdicts where kept, the Leitner schedule, merging two decks, the stored form and reading it back | yes |
| `session.ts` | A review sitting: ask, check, correct, grade, Claude's readings of the answer and the outcome they point to; reading one back after a reload | yes |
| `check.ts` | Having Claude check an answer: the request and verdict as page and Worker read them, what a reply means | yes |
| `remarks.ts` | Claude's remarks placed on the words they quote, the answer cut into runs to highlight, the remark under the caret, the margin's stacking | yes |
| `keys.ts` | What Enter does in the text boxes: saves with a keyboard, a new line on a touch screen | yes |
| `labels.ts` | Where a card was asked, when it is due, its question typeset | yes |
| `sync.ts` | What the Worker's replies mean, whether there is anything to send, how syncing stands | yes |
| `store.ts` | The deck in `localStorage`, shared between tabs through the `storage` event | no (storage injected) |
| `remote.ts` | Syncing with the Worker: when, the requests, the state; `openRecall` for every page; sending an answer to check, with the same key | no (browser injected) |
| `id.ts` | New card ids | no |
| `capture.ts` | The pill and sheet on a lesson page | no |
| `page.ts` | The recall page: overview, sittings, the sync key, saving to and loading from a file | no |

Scheduling is a Leitner system.
A card starts in box 0, due at once; recalling it moves it up a box, a shaky answer moves it down one (never below 1), and a miss sends it back to 0.
Boxes 1 to 5 come back after 1, 3, 7, 16 and 35 days, each a few hours early, so a card answered in the evening is ready the next morning.

Removing a card leaves a `Removal` behind, the card's id and when, so that merging with a copy made before the removal does not bring the card back.
Two decks merge question by question: each takes whichever state came last, a copy of the card or its removal, with ties settled the same way whichever deck each came from.
So the merge's result does not depend on the order decks meet in, and merging again changes nothing; devices that swap decks in any order end up holding the same one.

The deck lives in the browser, and also on the web at `/deck`, through the site's Worker (`worker/`), so it is the same on every device.
Every page that holds the deck (the menu, the lessons, the recall page) opens it through `openRecall`, which starts syncing once the browser has been given the key.
A sync sends the whole deck and merges the Worker's reply into the store: when the page opens, shortly after a change, when the tab is shown or hidden, when the browser comes back online, and every few minutes while on show.
Taking a reply in is not itself a change to send, since `hasNews` compares the deck with the Worker's copy as last heard.
While syncing cannot happen, nothing is lost: the deck is still in `localStorage`, and goes with the next sync that works.
A key the Worker turns down is not tried again until a key is given again.
The recall page can also save the deck to a JSON file and load one back, merged the same way.
A sitting under way is kept in the tab's `sessionStorage`, with the answer being written, because a phone often reloads a tab left in the background while the learner checks an answer in the lesson's tab.

Every change to the store is read-modify-write against storage, so two tabs cannot undo each other's questions; if storage refuses a write, the page keeps its deck for as long as it is open and says so.

## The Worker (`worker/`, `wrangler.jsonc`)

The whole site is one Cloudflare Worker.
The built pages (`dist/`) are its static assets, served without running any code; only `/deck` and `/check` run the Worker (`run_worker_first`).
Pages and deck sharing one origin is a security boundary, not just tidiness: the site's browser storage, which holds the sync key, belongs to no other site, and the pages call the deck without any CORS, so no page elsewhere can read its answers.
Asset requests go through Cloudflare's default HTML handling, so `recall.html` redirects to `/recall`, and query strings such as `?lesson=` survive the redirect; `slugOfLocation` reads either form.
In development, Vite sends `/deck` and `/check` on to the Worker that `npm run preview` runs on port 8787, and gives every page that Worker's sync key from `.dev.vars` (`tools/sync-key-plugin.ts`), so syncing and checking work as soon as a page opens.

The Worker serves one resource, `/deck`: `GET` answers with the deck held, and `POST` merges the deck sent into it with `mergeDecks` and answers with the result.
Every request must carry the `RECALL_KEY` secret as a bearer token.
The key is all that guards the deck, so the Worker refuses to serve with one under 32 characters, and a rate limit per caller address (`LIMITER`, 60 a minute) is checked before the key so it cannot be guessed at speed.
A deck declared larger than 5 MB is refused before it is read.
A merge takes the latest change, so a change dated far ahead would win every merge until that time came; the Worker refuses any dated more than an hour ahead of its clock, which leaves room only for a device's clock being a little off.

One Durable Object (`RecallDeck`) holds the deck, a row per question in its SQLite storage: a card, or the time it was removed.
It reads the deck, merges, and writes the rows that changed in one synchronous transaction, and requests reach it one at a time, so two devices syncing at once cannot undo each other.
The merge rule is the pages' own (`src/recall/deck.ts`, which has no DOM), so the Worker and the pages cannot disagree on it.

`POST /check` takes a `CheckRequest` and answers with Claude's `Verdict`, a grade and feedback (`src/recall/check.ts` and `deck.ts`, shared with the page like the rest of the deck).
It is guarded by the same key and rate limit, and also by a tighter one of its own (`CHECK_LIMITER`, 10 a minute), since each check is a paid call to Claude.
The Worker calls the Claude API with the official SDK and its own `ANTHROPIC_API_KEY` secret, so the Claude key never reaches a browser; without that secret, checking answers 503 and the deck works as before.
The call (`check.ts`) uses Claude Opus 5.5 at medium effort, with structured output to a schema of the verdict, and server-side fallbacks, so a request a safety classifier declines is run again on the model Anthropic recommends.
The learner's text is put in tags the system prompt says are material to judge, not instructions.
Whatever comes back is read with the same `readVerdict` the page uses, and a refusal, a cut-short reply or a failed call becomes a 502 saying why.
`ANTHROPIC_BASE_URL` (a var in `wrangler.jsonc`) says where the Claude API is, so the Worker test can stand one in.

| File | Role | Pure |
| --- | --- | --- |
| `rules.ts` | Which request it is, whether the caller holds the key, the rate limit, size and clock checks | yes |
| `check.ts` | The request to Claude to check an answer, and the verdict or failure read from its reply | yes |
| `index.ts` | The fetch handler, the call to Claude, and the `RecallDeck` object | no |
| `worker-configuration.d.ts` | The Worker's types, generated by `npm run worker:types` | generated |

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
- `Card`, `Deck`, `Place`, `Attempt`, `Removal` (`src/recall/deck.ts`): a noted question, where it was asked, its answers, when it is next due, and a removed one.
- `Verdict` (`src/recall/deck.ts`): Claude's grade and feedback on an answer, kept on an `Attempt` graded missed or shaky.
- `SavedDeck` (`src/recall/deck.ts`): the deck as stored, exported, and sent to and from the Worker.
- `SyncState`, `Reply` (`src/recall/sync.ts`): how syncing stands, and what came back from the Worker.
- `Session` (`src/recall/session.ts`): a review sitting in progress.
- `CheckRequest`, `Review` (`src/recall/check.ts`): an answer sent to be checked, and where a sitting stands on getting Claude's verdict.

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
- `src/recall/deck.test.ts`, `session.test.ts`, `labels.test.ts`, `keys.test.ts`: the recall schedule, review sittings and Claude's reading in them, links to a step, labels and the Enter key.
- `src/recall/check.test.ts`: reading a check request, a verdict with its remarks, and a reply from `/check`.
- `src/recall/remarks.test.ts`: remarks placed on their words and afresh as the answer changes, the runs to highlight, the remark under the caret, and the margin's stacking.
- `src/recall/store.test.ts`: the deck saved, shared between tabs, and kept when storage refuses.
- `src/recall/capture.test.ts`: noting a question from a lesson page, against a DOM stand-in.
- `src/recall/page.test.ts`: the recall page driven as a learner would, from the overview through a whole sitting, across a reload and on a touch screen, giving it the sync key, and Claude checking answers against a stand-in Worker: remarks highlighted on their words and dealt with as the answer is corrected, reading it again, the outcome suggested, the reading kept with the answer and shown next time and in the history, nothing sent without a written answer or the key, trying again, and reloads.
Each reload takes off what the last load of the page listened to on the window and the document, as closing the tab would, so a sitting from an earlier test cannot hear this one's keys.
- `src/recall/sync.test.ts`, `remote.test.ts`: syncing's rules, and syncing from a page against a stand-in Worker: when it sends, two pages kept the same, offline and a refused key.
- `worker/rules.test.ts`: routing to the deck and to checking, key check, rate limit, size and clock checks, and checking off without a Claude key.
- `worker/check.test.ts`: the request to Claude, and reading its verdict, a refusal or a failed call.
- `worker/worker.test.ts`: the real Worker in the local Workers runtime (wrangler's test harness), from `wrangler.jsonc` with stand-in assets: pages served beside the deck, the deck's HTTP contract and refusals, the rate limit, the deck kept across eviction, two devices syncing through it, and answers checked through a stand-in Claude API: the Worker's key and request, refusals, and the check rate limit.
- `src/dev/feedback/feedback.test.ts`: element selectors and descriptions, and the feedback entry format.
- `tools/feedback-plugin.test.ts`: the feedback plugin on a real dev server — overlay injection and comments written to file.
- `tools/sync-key-plugin.test.ts`: reading the sync key from `.dev.vars`, the script that keeps it in the browser, and every page on a real dev server given it before its own scripts.

None of this checks how a lesson looks, and no test sees a real hand: gesture thresholds are tuned by eye and exposed in the settings panel for that reason.

# Further Reading

- `README.md`: running the project and adding a lesson.
- `specs/`: design notes for the original triangle lessons.
