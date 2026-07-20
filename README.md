# Triangle Lab

Interactive geometry lessons you learn with your hands.

Each lesson is a single page holding one idea, and every idea is something you do rather than something you read.
You drag a vertex until the angle snaps to right.
You swing a side around its circle until the triangle collapses flat and the inequality turns into an equality.
You scrub four sliding triangles until the Pythagorean theorem stops being a formula and becomes an area that obviously has nowhere else to go.

The demos draw over a live webcam feed where one is available, so the geometry sits over your own image and your own hands.
If the camera is unavailable or denied, the lesson falls back to a dark background and works exactly the same.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
```

```sh
npm run build    # type-check, then bundle every lesson page into dist/
npm run preview  # serve the built output
```

The dev server binds to `localhost` on purpose: `getUserMedia` needs a secure context, and localhost qualifies, so the webcam background works without any certificate setup.

## Lessons

Lessons are grouped into five sections, read in order:

| Section | Lessons |
| --- | --- |
| Classifying | Angles · Equilateral · Isosceles · Scalene |
| Parts | Perimeter & Semiperimeter · Medians · Angle Bisectors · Altitudes |
| Constraints | The Triangle Inequality · The Pythagorean Theorem |
| Matching | Congruent Triangles · Similar Triangles |
| Trigonometry | Naming the Ratios · Folding the Square · Folding the Equilateral · The Whole Table |

## Layout

```
index.html          Lesson menu
<slug>.html         One page per lesson, each its own Vite entry point
src/lessons.ts      The reading order — the single source of truth
src/<slug>.ts       That lesson's entry point: its geometry and interaction
src/nav.ts          The prev/next pager every lesson page carries
src/geometry.ts     Pure triangle math — no DOM, no canvas
src/render.ts       All Canvas 2D drawing
src/webcam.ts       Webcam background, with a graceful fallback
specs/              Design notes: what each lesson should feel like
```

`src/lessons.ts` is the spine.
The menu (`src/index.ts`) and the pager (`src/nav.ts`) both render from that one list, so the order a reader clicks through is by construction the order the menu shows — they cannot drift apart.

### Adding a lesson

1. Add an entry to `src/lessons.ts`.
2. Create `<slug>.html` next to `index.html`.
3. Register the slug in `vite.config.ts`.

The menu card and the pager links on the neighbouring lessons then appear on their own.

## A note on sources

These demos are an independent implementation.
The textbook that prompted the project is copyrighted third-party material and is not part of this repository — transcriptions, scans, and PDFs of it are gitignored and stay on local disk.
The design notes in `specs/` are original writing and describe only what the demos should do.
