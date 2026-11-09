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
The overlay exists only on the dev server and on staging (see "Staging"), and is never part of a production build.

### Editing step text

Under `npm run dev`, every lesson page has an "Edit steps" button in its bottom-left corner.
With it on, click a step's title or text to edit it as its source writes it, `$…$` LaTeX and all, with the step text typeset below as you type.
Press Enter or Save, and the change is written into the lesson's source file (`src/directions.ts` for a standalone page, `src/lab/lessons/<slug>.ts` for a lab lesson); the page then reloads at the same step.
Escape cancels.
Edit mode stays on across the reload, and the button exists only on the dev server and on staging (see "Staging").
A changed step makes that lesson's syllabus entry stale, so run `/syllabus` before committing.

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

## Placing a figure in the room

A lab lesson can also be opened in AR, from the "View in AR" pill in its top bar; for now only Tangent Meets Chord, in Angles, has one.
The AR page puts the lesson's figure on a flat sheet over the camera view and lets you stand that sheet up in the room in perspective, so you can lay a circle over a plate or a tangent along a table edge and see the theorem on real things.
Nothing in the room is detected: you line the sheet up by eye, and it stays where you put it while you step through the lesson's stages.
On a phone, switch to the camera on the back.

| To… | Do this |
| --- | --- |
| Drag a point of the figure | Drag it, wherever the sheet now lies. |
| Slide the sheet | Drag empty space (with "Drag to: Move"). |
| Lean the sheet back or turn it | Drag empty space with "Drag to: Lean", or with Shift held, or with the right mouse button. |
| Size and spin it | Pinch and twist with two fingers or two hands; or scroll to size and Shift-scroll to spin. |
| Set it exactly | Use the Tilt, Turn, Spin and Size sliders in "Place the sheet". |
| Match the camera's perspective | The Lens slider is the camera's field of view: lower for a zoomed-in camera, higher for a wide one. |
| Lay the figure alone over the room | The Sheet slider fades the tinted, ruled backing, down to nothing at 0%; the figure stays as it is. |
| Go to a stage | Press its number on the card, or `←` / `→`, or the hand poses. |
| Clear the card off the figure | Press the caret in its corner; it folds to the caret, and the caret opens it again. |

"Face me" stands the sheet square to the screen again, and "Reset" (or `0`) puts it back where it started.
`R` resets the figure.

## Recalling what you learned

While you work through a lesson, you can note a question you want to be able to answer later from memory.
Press the question pill in the top bar, or `Q`, write the question and press Enter (on a phone, Enter starts a new line and the Save button saves).
It is saved with the lesson and the step you were on.

The recall page (linked from the menu, `recall.html`) asks your questions back once they are due.
Answer each from memory first, writing it down or not, then check: your last answer is there to unfold, and "Check in the lesson" opens the lesson at the step the question came from.
Your question, your answer and Claude's reading go with you, in a sheet beside the lesson where you can keep correcting the answer and noting new questions; "Back to review" picks the review up where you left it.
Your answer stays in the same box, open to correct, until you have it right.
Then say how it went: got it right first time, fixed it once corrected, or still struggling.
Got right, a question comes back after longer and longer gaps (a day, then 3, 7, 16 and 35 days); fixed, a little sooner than last time, and never before tomorrow; still struggling, in your next review.

Signed in, a written answer is also read by Claude as you check it.
Claude comments on it as a reviewer does on a document: the words it has something to say about are highlighted in your answer, with each comment beside them on a wide screen, or under the answer on a narrow one, and it says in a sentence or two what was right and what was missing.
Correct the answer in place, and a comment whose words you have changed is marked as dealt with; press Check again (or Enter) to have Claude read it as it now stands.
Once Claude reads it as right, it marks the outcome that fits, got it right or fixed it, but the choice is still yours.
An answer given in your head is not sent unless you write it down.

When an answer was not right first time, what Claude said of it is kept with it.
The next time the question comes up, it is there with your last answer, so you can work from it.
Each question on the recall page has a History button listing every answer you gave, newest first, with Claude's comments where they were kept.
It syncs and is saved to a file with the rest of your questions.

Questions are kept in the browser, like the gesture settings.
Signed in, they are also kept the same on every device you use, through the site's Worker, which holds them on the web (`worker/`).
Sign in once on each device, from the link under your questions on the recall page, and from then on every page syncs by itself: when it opens, shortly after each change, when you come back to the tab, and every few minutes.
Changes made offline or signed out are kept in the browser and sent with the next sync that works, and a question removed on one device stays removed on the others.
The recall page can still save them to a file and load them back, to keep a copy.

### Signing in

The site has its own sign-in, by email link, and it is invite only.
On the sign-in page (`signin.html`), enter your email address; if it is invited, the Worker emails you a link that signs you in on the device you open it on.
The link works once, for 15 minutes, and the sign-in lasts 30 days.
The page answers the same whether or not an address is invited, so it never shows who is.

Who is invited is two of the Worker's secrets: `OWNER_EMAIL`, your own address, and `INVITES`, everyone else's, separated by commas.
Both are read on every request, so taking an address off `INVITES` signs that learner out everywhere at once.
Your deck is the one the site has always held; everyone else gets an empty deck of their own, by their address.

### Setting up signing in

Once:

1. Onboard a domain you own to Cloudflare Email Sending, so the Worker can send from it: `npx wrangler email sending enable <your domain>`, or Email Service in the dashboard.
   Wait for its DNS records to verify.
2. Put the address sign-in links come from, on that domain, in `SENDER` under the top-level `vars` in `wrangler.jsonc`, for example `signin@<your domain>`, and the same under `env.staging.vars`.
   Commit both.
   Until it is set, a deploy stops before it starts (`tools/deploy-guard.ts`), since no one could sign in.
3. Give the Worker its invite list and your address: `npx wrangler secret put OWNER_EMAIL`, then `npx wrangler secret put INVITES` (enter `-` to invite no one yet).
   They are secrets only to keep the addresses out of this public repository.

### Giving someone a demo account

1. Add their email address to `INVITES`: `npx wrangler secret put INVITES`, with the whole list.
2. Send them the site's sign-in page, `https://<the site>/signin.html`.
   They enter their address, open the link the site emails them, and start with an empty deck.

To take the account away, remove the address from `INVITES`.
Their deck stays in its Durable Object, `learner:<email>`, and is theirs again if they are invited back.
Claude's checks of their work come out of their beta credit (see "Paying for Claude"), under the same rate limits as everyone else.

### Setting up answer checking

The Worker calls Claude with a Claude API key of its own, kept in its secrets; browsers never see it:

```sh
npx wrangler secret put ANTHROPIC_API_KEY   # paste a key from platform.claude.com
```

It checks only for a signed-in learner, and at most 10 answers a minute from one address, since each check is a paid call to Claude.
Signed out, checking is off and the page links to signing in.

### Paying for Claude

Your own calls to Claude go on the site's key, unmetered.
Everyone else's come out of their beta credit, in dollars, counted from the tokens each call used, until they save a Claude API key of their own on their account page (`signin.html`, once signed in).
From then on their calls are billed to their key, and nothing is metered.
When their credit runs out, Claude's checks stop and the page links them to their account page to add a key.

- `BETA_CREDIT_USD` (a var in `wrangler.jsonc`) is the credit each invited learner starts with.
- `CREDITS` (a secret) gives particular learners another amount, as `learner@example.com=10, other@example.com=2.50`, or `-` for none.
  To give someone more, run `npx wrangler secret put CREDITS` with the whole list.
- `MONTHLY_CAP_USD` (a var) caps what all beta credit together may spend on the site's key in a calendar month, so a slip in the metering can never run up an open-ended bill.
- `VAULT_KEY` (a secret) is what learners' own keys are encrypted with.
  Replacing it makes every saved key unreadable, and those learners fall back to their credit until they save theirs again.

Once, give the Worker the two secrets:

```sh
openssl rand -base64 32 | npx wrangler secret put VAULT_KEY
```

```sh
npx wrangler secret put CREDITS   # enter - to give no one other than BETA_CREDIT_USD
```

### Trying it locally

Once, give the local Worker its secrets in `.dev.vars`, which is gitignored and so never committed:

```sh
cat >> .dev.vars <<'VARS'
ANTHROPIC_API_KEY=sk-ant-…
OWNER_EMAIL=you@example.com
INVITES=-
CREDITS=-
SENDER=signin@example.com
VARS
echo "VAULT_KEY=$(openssl rand -base64 32)" >> .dev.vars
```

Then run these in two terminals:

```sh
npm run preview  # the Worker on localhost:8787
```

```sh
npm run dev
```

Open <http://localhost:5173/signin.html> (or the port Vite prints) and ask for a link for your `OWNER_EMAIL`.
Locally no email is sent: the Worker's log in the first terminal shows the message, link and all, and the file it saved it to, under `.wrangler/tmp/email`.
Open the link, finish signing in, and the recall page syncs and has Claude read a written answer while you check it.
A change to `.dev.vars` reaches the Worker when `npm run preview` is started again.
Each check is a paid call on that Claude key.

## Deploying

The site is one Cloudflare Worker (`wrangler.jsonc`): the built pages are its static assets, served without running any code, and the recall deck is at `/deck` on the same origin, with the calls to Claude at `/check`, `/associate` and `/explain`, signing in at `/auth/link` and `/auth/session`, and the learner's account at `/account`.
Giving the site an origin of its own keeps its session cookie, and its browser storage, away from any other site.

A push to `main` tests, builds and deploys it (`.github/workflows/deploy.yml`).
That needs two repository secrets: `CLOUDFLARE_API_TOKEN`, a token made from the "Edit Cloudflare Workers" template, and `CLOUDFLARE_ACCOUNT_ID`.
To deploy by hand instead, run `npx wrangler login`, then `npm run deploy`.
A deploy fails until the Worker's secrets, `ANTHROPIC_API_KEY`, `OWNER_EMAIL`, `INVITES`, `CREDITS` and `VAULT_KEY`, are set, and stops before it starts while `SENDER` is empty (see "Setting up signing in").
The first deploy prints the site's address, `triangle-lab.<your subdomain>.workers.dev`; a custom domain can be added to the Worker later.

### Moving production off Cloudflare Access

Production used to sit behind Cloudflare Access; the site's own sign-in replaces it.
Once signing in is set up and deployed, open the `triangle-lab` Worker's Settings, Domains & Routes in the Cloudflare dashboard, turn Cloudflare Access off for its `workers.dev` address, and delete its Access application.
Until then, Access's sign-in page comes before the site's own.

## Staging

Staging is the site with its dev tools in: Alt-click feedback and step editing work there as under `npm run dev`, with no local server.
It is its own Worker, `triangle-lab-staging` (`env.staging` in `wrangler.jsonc`), with its own deck and sign-ins, behind Cloudflare Access, which guards its dev tools.
It runs the `staging` branch: `main`, plus the step edits made on staging.

- A step edit saved on staging is committed to the `staging` branch, and the push redeploys staging in a minute or two; the page shows the new text at once.
- A comment left on staging is kept there; `npm run staging:pull` appends it to your local `ui-feedback.md`, as the dev server would have.
- A push to `main` is merged into `staging` and redeploys it (`.github/workflows/staging.yml`), so staging never falls behind.

To bring staging's step edits to `main`, merge the branch, then run `/syllabus`, since an edited step leaves its lesson's syllabus entry stale and the tests (and so the deploy from `main`) fail until it is described again:

```bash
git fetch origin && git merge origin/staging
```

### Setting up staging

Once:

1. Make the branch: `git push origin main:staging`.
2. Make a fine-grained GitHub token for this repository only, with read and write access to Contents, and give staging its secrets: `npx wrangler secret put GITHUB_TOKEN --env staging`, and the same for `ANTHROPIC_API_KEY`, `OWNER_EMAIL`, `INVITES`, `CREDITS` and `VAULT_KEY`.
3. Deploy once by hand to make the Worker: `npm run deploy:staging`. It prints staging's address, `triangle-lab-staging.<your subdomain>.workers.dev`.
4. Put Cloudflare Access in front of it. In the Cloudflare dashboard, open the Worker's Settings, Domains & Routes, and turn on Cloudflare Access for its `workers.dev` address (or, on a custom domain, add a self-hosted Access application for it). Give the application a policy that allows your email address.
5. Copy the application's audience (AUD) tag and your team's domain into `ACCESS_AUD` and `ACCESS_ISSUER` (`https://<team>.cloudflareaccess.com`) under `env.staging.vars` in `wrangler.jsonc`, and commit them. Until both are set, the dev tools on staging answer 503.
6. For `npm run staging:pull`, make an Access service token (Zero Trust, Access, Service credentials), add a policy to the application with the action Service Auth that includes it, and put it in `.dev.vars` with staging's address:

```
STAGING_URL=https://triangle-lab-staging.<your subdomain>.workers.dev
STAGING_ACCESS_CLIENT_ID=<client id>
STAGING_ACCESS_CLIENT_SECRET=<client secret>
```

The staging workflow uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets as the deploy from `main`.

## Lessons

132 lessons in fourteen chapters, read in order.
Thirteen of the original triangle lessons are standalone pages; the rest are lab lessons with a scrolling column of proof steps and a live formula band.
Both kinds share the step column, and the standalone pages with live numbers (the triangle inequality, the Pythagorean theorem, congruent and similar triangles, and the four trigonometry pages) show them in the same formula band.
In a lab lesson, pointing at a symbol in a formula highlights what it stands for in the figure.

| Chapter | Lessons |
| --- | --- |
| Circles (4) | Parts of a Circle · Rolling Out Pi · Area of a Circle · Tangent Circles |
| Angles (12) | Kinds of Angle · Your Hand, a Protractor · Vertical Angles · Parallels and a Transversal · Angles of a Triangle · The Exterior Angle · Arcs, Sectors, Segments · The Inscribed Angle · The Angle in a Semicircle · Where Two Chords Cross · Two Secants From Outside · Tangent Meets Chord |
| Triangles (35) | Angles · Equilateral · Isosceles · Scalene · Perimeter · Semiperimeter · Medians · Centroid · Angle Bisectors · The Incircle · The Circumcircle · Altitudes · The Triangle Inequality · The Pythagorean Theorem · Four Triangles in a Square · Too Big, Too Small · Pythagorean Triples · Congruent Triangles · AAS, HL, LL and SA · Base Angles · Chords and the Centre · Similar Triangles · Three Tests for Similarity · Altitude to the Hypotenuse · The Angle Bisector Theorem · Naming the Ratios · Folding the Square · Folding the Equilateral · The Whole Table · Identities from One Triangle · Half Base Times Height · Two Sides and an Angle · Inradius Times Semiperimeter · Spotting a Right Triangle · The Parallel Line Trick |
| Quadrilaterals (9) | Angles of a Quadrilateral · The Median of a Trapezoid · The Isosceles Trapezoid · Inside a Parallelogram · Area of a Parallelogram · Four Equal Sides · Rectangles and Squares · Diagonals Decide · The Midpoint Parallelogram |
| Polygons (5) | Counting Diagonals · Interior Angle Sum · Exterior Angle Sum · Apothem and Circumradius · The Regular Hexagon |
| Angle Chasing (3) | A Chain of Equal Links · Square Meets Triangle · Trisected Corners |
| Areas (9) | Scale Factor Squared · The Midpoint Triangle · Same Base, Same Altitude · Six Equal Pieces · Areas Between Diagonals · Octagon From a Square · The Crescent and the Triangle · Four Leaves in a Square · Leaves Between Circles |
| Coordinates (9) | Two Addresses for a Point · Rise over Run · The Equation of a Line · Parallel and Perpendicular Slopes · The Distance Formula · Midpoints and Fractions of the Way · The Equation of a Circle · Where a Line Meets a Circle · The Centroid by Coordinates |
| Linear Equations (7) | Keep It Balanced · What Makes It Linear · Substitution · Elimination · Rate Times Time · The Average Speed Trap · Working Together |
| Quadratic Equations (7) | Why Squares Appear · Roots From Factors · Completing the Square · The Quadratic Formula · Squaring Adds Answers · Hidden Quadratics · Beyond Quadratics |
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
src/dev/steps/        Dev-only editor that writes step text back to its source
tools/                Vite plugins used by the dev server, and pulling comments from staging
specs/                Design notes for the original triangle lessons, and the open
                      question of how to draw an equation (equations-display.md)
architecture.md       How the pieces fit and where the boundaries are
```

`src/lessons.ts` is the spine.
The menu (`src/index.ts`) and the pager (`src/pager.ts`) both render from that one list, so the order a reader clicks through is by construction the order the menu shows.

### Adding a lab lesson

1. Create `src/lab/lessons/<slug>.ts`, default-exporting `lesson((s) => ({ steps, likes, uses, draw, readout }))`.
2. Add an entry with `lab: true` to the chapter's file in `src/chapters/`.

That is all: the menu card, the pager links and the page appear on their own, and `npm test` exercises the new lesson automatically.
`src/lab/lessons/triangle-angle-sum.ts` is a good model for a stepped proof, and `src/lab/lessons/box-diagonal.ts` for a 3D figure with sliders.

Every lesson says, after its steps, what its idea is like (`likes`: an everyday activity whose structure matches it, saying which part is which) and what it is for (`uses`: concrete real-world applications, with small worked numbers where they help).
Names, angles, variables and numbers in the step text and formulas lead to the figure on their own: pointing at `AB` draws a line to segment AB, as long as the figure labels its points A and B.
Where that is not enough, a lesson can mark a symbol in its formulas with `term(id, tex)` and pass the same `term: id` to the figure marks it stands for, so pointing at it also highlights those marks.
And it can set pictures on the figure with `g.sprite(src, at)`.
`src/lab/lessons/exterior-angle.ts` has likes, uses and terms.

### Adding a standalone lesson

1. Add an entry (without `lab`) to a chapter file in `src/chapters/`.
2. Create `<slug>.html` next to `index.html`, loading `src/<slug>.ts` and then `src/page.ts`, with a `#stage` rule that fills the box `page.ts` publishes as `--stage-left`, `--stage-top`, `--stage-width` and `--stage-height` (copy one of the existing pages).
3. Write its numbered directions in `src/directions.ts`.
   Say what its idea is like and what it is for in its entry in `src/asides.ts`.
4. Register the slug in `vite.config.ts`.

A standalone lesson with live numbers calls `formulaBand()` from `src/chrome.ts` once at start-up and passes it fresh rows each frame; its rows are best built in `src/readouts.ts`, where they can be tested.
A lesson that changes with the steps reads `currentStep()` from the same module, as `src/pythagoras.ts` does.

## A note on sources

These lessons are an independent implementation.
The textbook that prompted the project is copyrighted third-party material and is not part of this repository — transcriptions, scans, and PDFs of it are gitignored and stay on local disk.
The lesson text and the design notes in `specs/` are original writing.
