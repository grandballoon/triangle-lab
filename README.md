# Triangle Lab

Interactive geometry lessons you learn with your hands.

Each lesson is a single screen holding one idea, and every idea is something you do rather than something you read.
You pinch a vertex in mid-air and drag it until the angle snaps to right.
You swing a point around a circle and watch a product of two lengths refuse to change.
You step through a proof one construction at a time, and each new line fades in over the figure you were just holding.

The lessons draw over a live webcam feed, mirrored, so the geometry sits over your own image and your own hands.
On a phone you can switch to the camera on the back and lay the figures over the room around you, or turn the camera off and see only the figures.
If the camera is unavailable or denied, a lesson falls back to a dark background and works exactly the same with a mouse or a finger.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
```

```sh
npm test         # unit tests and a headless run of every lesson
npm run build    # type-check, then bundle every page into dist/
npm run preview  # build, then serve the site as deployed, with the recall deck, on localhost:8787
npm run deploy   # build, then publish to Cloudflare
```

Node 22.12 or newer is required.
The dev server binds to `localhost` on purpose: `getUserMedia` needs a secure context, and localhost qualifies, so the webcam works without any certificate setup.
Chrome or Edge are the most reliable for camera permissions.

### Leaving UI feedback

Under `npm run dev`, every page can take comments on its own elements.
Hold Alt (⌥) to outline the element under the cursor, Alt-click it, type a comment and press Enter.
The comment is appended to `ui-feedback.md` at the project root, together with the page, a selector for the element, where you clicked and the window size.
That file is gitignored; each entry starts open (`[ ]`) and is marked `[x]` once dealt with.
The overlay exists only on the dev server and is never part of a build.

## Using your hands

Hold a hand up to the camera and a ring cursor follows it.

| To… | Do this |
| --- | --- |
| Move the cursor | Move your hand; the cursor sits between thumb and index fingertip. |
| Grab and drag a point | Pinch thumb and index together on it, move, then open your fingers. |
| Press a button | Pinch and release on it. |
| Turn a 3D solid | Pinch empty space and drag. |
| Go to the next proof step | Hold a thumbs-up until the ring around the cursor completes. |
| Go back a step | Hold up two fingers the same way. |

Both hands work at once in the lab lessons, so you can hold two vertices at the same time.

Everything above is configurable from the status pill labelled "Hands" (top right on pages with a formula band, bottom left elsewhere):

- turn tracking on or off, or restrict it to one hand;
- grab with a pinch or with a closed fist;
- how far apart the fingers may be for a pinch to count, and how heavily the cursor is steadied;
- which held pose (thumbs-up, two fingers, open palm, point, fist) triggers next step, previous step, reset, and showing or hiding the formula band, and how long it must be held;
- whether to draw the tracked hand skeleton.

Settings are saved in the browser and shared by every lesson.
The hand-tracking model and its runtime are downloaded from public CDNs the first time tracking starts, so that first start needs a network connection.

The keyboard also works in lab lessons: `←` and `→` step through a proof and roll over into the neighbouring lesson, `R` resets, `F` shows or hides the formulas.

## Recalling what you learned

While you work through a lesson, you can note a question you want to be able to answer later from memory.
Press the question pill in the top bar, or `Q`, write the question and press Enter (on a phone, Enter starts a new line and the Save button saves).
It is saved with the lesson and the step you were on.

The recall page (linked from the menu, `recall.html`) asks your questions back once they are due.
Answer each from memory first, writing it down or not, then check: your earlier answers are shown, and "Check in the lesson" opens the lesson at the step the question came from.
Grade yourself missed, shaky or recalled; a recalled question comes back after longer and longer gaps (a day, then 3, 7, 16 and 35 days), and a missed one is asked again straight away.

On a device with the sync key, a written answer is also read by Claude while you check it.
Claude says in a sentence or two what was right and what was missing, and marks the grade it would give; the grade is still yours to pick.
An answer given in your head is not sent.

When you grade an answer missed or shaky, what Claude said is kept with it.
The next time the question comes up, it is shown under your last answer, so you can work from it.
Each question on the recall page has a History button listing every answer you gave, newest first, with Claude's feedback where it was kept.
It syncs and is saved to a file with the rest of your questions.

Questions are kept in the browser, like the gesture settings.
They can also be kept the same on every device you use, through the site's Worker, which holds them on the web (`worker/`).
Enter the sync key once on each device's recall page, and from then on every page syncs by itself: when it opens, shortly after each change, when you come back to the tab, and every few minutes.
Changes made offline are kept in the browser and sent with the next sync that works, and a question removed on one device stays removed on the others.
The recall page can still save them to a file and load them back, to keep a copy.

### Setting up sync

The sync key is the only thing guarding your questions, so make it long and random:

```sh
npx wrangler secret put RECALL_KEY   # paste the output of `openssl rand -base64 24`
```

The key is never committed: it lives in the Worker's secrets and in each browser you enter it in.
The Worker serves no one until its key is at least 32 characters.
It also limits each caller's address to 60 requests a minute, so a key cannot be guessed at speed, and refuses changes dated more than an hour ahead of its clock, which would otherwise win every merge.

Locally, the key comes from `.dev.vars`, which is gitignored; create it with `echo "RECALL_KEY=$(openssl rand -base64 24)" > .dev.vars`.
`npm run dev` sends the deck's requests on to the Worker on `localhost:8787`, so to sync while developing, run `npm run preview` in a second terminal.

### Setting up answer checking

The Worker calls Claude with a Claude API key of its own, kept in its secrets like the sync key; browsers never see it:

```sh
npx wrangler secret put ANTHROPIC_API_KEY   # paste a key from platform.claude.com
```

It checks only for a caller with the sync key, and at most 10 answers a minute from one address, since each check is a paid call to Claude.
Without the key, checking is off and the recall page says why.
Locally, add `ANTHROPIC_API_KEY=…` to `.dev.vars`.

## Deploying

The site is one Cloudflare Worker (`wrangler.jsonc`): the built pages are its static assets, served without running any code, and the recall deck is at `/deck` on the same origin, with answer checking at `/check`.
Giving the site an origin of its own keeps its browser storage, and the sync key in it, away from any other site.

A push to `main` tests, builds and deploys it (`.github/workflows/deploy.yml`).
That needs two repository secrets: `CLOUDFLARE_API_TOKEN`, a token made from the "Edit Cloudflare Workers" template, and `CLOUDFLARE_ACCOUNT_ID`.
To deploy by hand instead, run `npx wrangler login`, then `npm run deploy`.
A deploy fails until both of the Worker's secrets, `RECALL_KEY` and `ANTHROPIC_API_KEY`, are set.
The first deploy prints the site's address, `triangle-lab.<your subdomain>.workers.dev`; a custom domain can be added to the Worker later.

## Lessons

116 lessons in twelve chapters, read in order.
The sixteen original triangle lessons are standalone pages; the rest are lab lessons with a scrolling column of proof steps and a live formula band.
Both kinds share the step column, and the standalone pages with live numbers (perimeter, the triangle inequality, the Pythagorean theorem, congruent and similar triangles, and the four trigonometry pages) show them in the same formula band.
In a lab lesson, pointing at a symbol in a formula highlights what it stands for in the figure.

| Chapter | Lessons |
| --- | --- |
| Circles (4) | Parts of a Circle · Rolling Out Pi · Area of a Circle · Tangent Circles |
| Angles (12) | Kinds of Angle · Your Hand, a Protractor · Vertical Angles · Parallels and a Transversal · Angles of a Triangle · The Exterior Angle · Arcs, Sectors, Segments · The Inscribed Angle · The Angle in a Semicircle · Where Two Chords Cross · Two Secants From Outside · Tangent Meets Chord |
| Triangles (33) | Angles · Equilateral · Isosceles · Scalene · Perimeter & Semiperimeter · Medians · Angle Bisectors · The Incircle · The Circumcircle · Altitudes · The Triangle Inequality · The Pythagorean Theorem · Four Triangles in a Square · Too Big, Too Small · Pythagorean Triples · Congruent Triangles · AAS, HL, LL and SA · Base Angles · Chords and the Centre · Similar Triangles · Three Tests for Similarity · Altitude to the Hypotenuse · The Angle Bisector Theorem · Naming the Ratios · Folding the Square · Folding the Equilateral · The Whole Table · Identities from One Triangle · Half Base Times Height · Two Sides and an Angle · Inradius Times Semiperimeter · Spotting a Right Triangle · The Parallel Line Trick |
| Quadrilaterals (9) | Angles of a Quadrilateral · The Median of a Trapezoid · The Isosceles Trapezoid · Inside a Parallelogram · Area of a Parallelogram · Four Equal Sides · Rectangles and Squares · Diagonals Decide · The Midpoint Parallelogram |
| Polygons (5) | Counting Diagonals · Interior Angle Sum · Exterior Angle Sum · Apothem and Circumradius · The Regular Hexagon |
| Angle Chasing (3) | A Chain of Equal Links · Square Meets Triangle · Trisected Corners |
| Areas (9) | Scale Factor Squared · The Midpoint Triangle · Same Base, Same Altitude · Six Equal Pieces · Areas Between Diagonals · Octagon From a Square · The Crescent and the Triangle · Four Leaves in a Square · Leaves Between Circles |
| Coordinates (9) | Two Addresses for a Point · Rise over Run · The Equation of a Line · Parallel and Perpendicular Slopes · The Distance Formula · Midpoints and Fractions of the Way · The Equation of a Circle · Where a Line Meets a Circle · The Centroid by Coordinates |
| Power of a Point (6) | Crossing Chords · Tangent and Secant · Two Equal Tangents · The Power of a Point · Tangents to the Incircle · Four Sides Round a Circle |
| Three Dimensions (11) | Lines and Planes · Slicing a Sphere · Inside a Cube · The Diagonal of a Box · The Painted Cube · Unrolling a Can · Pyramids · Unrolling a Cone · Volume of a Tetrahedron · Volume of an Octahedron · The Five Regular Solids |
| Transformations (8) | Slide by an Arrow · Turn About a Point · Flip Over a Mirror · Through a Point · Stretch and Squeeze · Grow From a Centre · What Survives? · Symmetries of a Polygon |
| Potpourri (7) | The Shortest Detour · A Belt on Two Wheels · Incentre Meets Arc Midpoint · The Area of a Lens · Folding a Corner · Viviani's Theorem · Crossed Ladders |

## Layout

```
index.html            Lesson menu
lab.html              Hosts every lab lesson, chosen by ?lesson=<slug>
recall.html           Asks back the questions noted in the lessons
<slug>.html           One page per standalone lesson (the original triangle set)
src/lessons.ts        The reading order — the single source of truth
src/chapters/         The lesson entries, one file per chapter
src/hands/            Hand tracking as a pointer device, plus its settings panel
src/lab/              The lab: lesson contract, drawing, geometry, page shell
src/lab/lessons/      One module per lab lesson
src/recall/           Noting questions in a lesson and reviewing them later
worker/               The Cloudflare Worker: serves the site, syncs recall questions between devices, and has Claude check answers
src/<slug>.ts         A standalone lesson's entry point
src/geometry.ts       Pure triangle math — no DOM, no canvas
src/dev/feedback/     Dev-only overlay for commenting on page elements
tools/                Vite plugins used by the dev server
specs/                Design notes for the original triangle lessons
architecture.md       How the pieces fit and where the boundaries are
```

`src/lessons.ts` is the spine.
The menu (`src/index.ts`) and the pager (`src/pager.ts`) both render from that one list, so the order a reader clicks through is by construction the order the menu shows.

### Adding a lab lesson

1. Create `src/lab/lessons/<slug>.ts`, default-exporting `lesson((s) => ({ steps, draw, readout }))`.
2. Add an entry with `lab: true` to the chapter's file in `src/chapters/`.

That is all: the menu card, the pager links and the page appear on their own, and `npm test` exercises the new lesson automatically.
`src/lab/lessons/triangle-angle-sum.ts` is a good model for a stepped proof, and `src/lab/lessons/box-diagonal.ts` for a 3D figure with sliders.

A lesson can also return `uses`, its real-world applications, shown after the steps.
Names, angles, variables and numbers in the step text and formulas lead to the figure on their own: pointing at `AB` draws a line to segment AB, as long as the figure labels its points A and B.
Where that is not enough, a lesson can mark a symbol in its formulas with `term(id, tex)` and pass the same `term: id` to the figure marks it stands for, so pointing at it also highlights those marks.
And it can set pictures on the figure with `g.sprite(src, at)`.
`src/lab/lessons/exterior-angle.ts` has uses and terms.

### Adding a standalone lesson

1. Add an entry (without `lab`) to a chapter file in `src/chapters/`.
2. Create `<slug>.html` next to `index.html`, loading `src/<slug>.ts` and then `src/page.ts`, with a `#stage` rule that fills the box `page.ts` publishes as `--stage-left`, `--stage-top`, `--stage-width` and `--stage-height` (copy one of the existing pages).
3. Write its numbered directions in `src/directions.ts`.
4. Register the slug in `vite.config.ts`.

A standalone lesson with live numbers calls `formulaBand()` from `src/chrome.ts` once at start-up and passes it fresh rows each frame; its rows are best built in `src/readouts.ts`, where they can be tested.
A lesson that changes with the steps reads `currentStep()` from the same module, as `src/pythagoras.ts` does.

## A note on sources

These lessons are an independent implementation.
The textbook that prompted the project is copyrighted third-party material and is not part of this repository — transcriptions, scans, and PDFs of it are gitignored and stay on local disk.
The lesson text and the design notes in `specs/` are original writing.
