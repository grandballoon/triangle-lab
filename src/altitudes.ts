// Parts · Four — Altitudes (first, drag-driven implementation).
//
// Thirty static triangles — from the three basic classifications through the
// classic right triangles (45-45-90, 3-4-5, 30-60-90), a knife-edge 89°/91°
// pair, assorted acute and scalene variations, and an obtuse gallery: a
// 100°-to-140° progression over one base, the golden gnomon, label and
// orientation variants, and the classic extend-BC-to-D figure — living in
// a world taller than the screen: scroll the wheel (or drag empty space) to
// pan vertically. The webcam stays fixed behind everything and the triangles
// keep the same size; only the geometry pans.
//
// On each triangle, every vertex sprouts a short outward stub carrying a knob.
// Grab a knob and pull it toward the foot of the perpendicular on the line
// containing the opposite side — the segment follows your hand in any
// direction, capped at 130% of the finished altitude. Where a foot falls
// outside its side (the obtuse triangles), the side shows a dashed extension
// so the perpendicular has somewhere to land. Reach the foot and the altitude
// pulses once, locks along the true perpendicular, gets a right-angle marker
// at its foot, and is labelled h with its vertex subscript. Lock all three and
// the orthocenter H lights up with three brief pulses: inside the acute,
// equilateral, and isosceles triangles (coinciding with the centroid on the
// equilateral, riding the symmetry axis on the isosceles), exactly on the
// right-angle vertex of the right one, and outside the obtuse ones — the
// flatter the triangle, the farther H flies.
//
// The page also carries an HTML "Notes & solutions" drawer (see altitudes.html)
// with the concept write-up and the Example 11-1 / Exercise 11-1..3 proofs.
//
// Self-contained on purpose, matching medians.ts / bisectors.ts / etc. — only
// the webcam device and this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Band {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Pulse {
  center: Vec;
  age: number; // seconds since it fired
}

interface Altitude {
  vertex: number; // index (0,1,2) of the vertex this altitude drops from
  locked: boolean; // true once its free end has reached the perpendicular foot
  drag: Vec | null; // live free-end while being pulled; null when idle (parked on the stub)
}

interface Lesson {
  name: string; // shown under the triangle until H appears
  shape: [Vec, Vec, Vec]; // normalized vertices, y down, roughly within ±1.5
  doneCaption: string; // shown once H appears, says where it landed
  verts: [Vec, Vec, Vec];
  band: Band;
  altitudes: [Altitude, Altitude, Altitude];
  pulses: Pulse[];
  // Orthocenter celebration: -1 = not yet triggered; otherwise seconds elapsed
  // since all three altitudes locked, used to stagger three brief pulses.
  celebrateAge: number;
  celebrateFired: number; // how many of the three celebration pulses have spawned
}

const ACCENT = "#fb7185"; // header + an altitude currently being pulled
const DONE = "#38d9a9"; // a locked altitude, the orthocenter, and their pulses
const STUB = "rgba(251,113,133,0.55)"; // the idle outward stub — visibly grabbable, still discreet
const BASE_LINE = "rgba(233,240,247,0.28)"; // triangle sides + foot targets, kept discreet
const H_TEXT = "rgba(233,240,247,0.85)";
const CAPTION = "rgba(233,240,247,0.5)";

const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64; // room for the header above the three bands

const STUB_LEN = 26; // length of the outward starting stub, in screen px
const LENGTH_CAP = 1.3; // free end can reach at most 130% of the finished altitude
const SNAP_RADIUS = 22; // free end this close to the foot counts as "arrived"
const PULSE_LIFE = 0.6;
const CELEBRATE_GAP = 0.22; // seconds between the three orthocenter pulses
const EXTENSION_OVERHANG = 16; // dashed side extension runs this far past the foot
const MARKER = 11; // side length of the right-angle marker at a locked foot
const SHAPE_SCALE = 0.26; // normalized units → fraction of min(band.w, band.h)

// Vertex 0 is A, 1 is B, 2 is C on every triangle.
const VERTEX_NAMES = ["A", "B", "C"] as const;
const H_SUBSCRIPTS = ["a", "b", "c"] as const;

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
// Which altitude is being dragged, as [lessonIndex, altitudeIndex].
let grabbed: [number, number] | null = null;
// Vertical pan through the world of triangle rows; the camera (webcam,
// header, hints) never moves — only this does.
let scrollY = 0;
let maxScroll = 0;
// Live pan drag on empty space, as the pointer's last clientY.
let panFrom: number | null = null;

// Each shape is centered so its whole figure — vertices, feet, and H — sits
// around the band center. The right triangle is built from two exactly
// perpendicular legs meeting at C, so its orthocenter IS vertex C; the first
// obtuse one is kept mildly obtuse (~112° at C) so H lands just outside, while
// the very flat one (~130° at C) sends H a full triangle-height away.
function makeLesson(name: string, shape: [Vec, Vec, Vec], doneCaption: string): Lesson {
  return {
    name,
    shape,
    doneCaption,
    verts: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    band: { cx: 0, cy: 0, w: 0, h: 0 },
    altitudes: [0, 1, 2].map((vertex) => ({ vertex, locked: false, drag: null })) as [
      Altitude,
      Altitude,
      Altitude,
    ],
    pulses: [],
    celebrateAge: -1,
    celebrateFired: 0,
  };
}

const lessons: Lesson[] = [
  // Row 1 — the three basic classifications.
  makeLesson(
    "acute triangle",
    [
      { x: -1.05, y: 0.85 },
      { x: 1.1, y: 0.6 },
      { x: 0.05, y: -1.0 },
    ],
    "acute — H lands inside",
  ),
  makeLesson(
    "right triangle",
    [
      { x: 1.1025, y: 0.3169 },
      { x: -1.1025, y: -0.6649 },
      { x: -0.8676, y: 0.6649 },
    ],
    "right — H sits on the right-angle vertex C",
  ),
  makeLesson(
    "obtuse triangle",
    [
      { x: -1.25, y: 0.95 },
      { x: 1.25, y: 0.7 },
      { x: 0.5, y: 0.05 },
    ],
    "obtuse — H falls outside the triangle",
  ),
  // Row 2 — symmetry, and how far H can stray.
  makeLesson(
    "equilateral triangle",
    [
      { x: -0.87, y: 0.75 },
      { x: 0.87, y: 0.75 },
      { x: 0, y: -0.757 },
    ],
    "equilateral — H doubles as the centroid G",
  ),
  makeLesson(
    "isosceles triangle",
    [
      { x: -0.8, y: 0.75 },
      { x: 0.8, y: 0.75 },
      { x: 0, y: -0.85 },
    ],
    "isosceles — H rides the axis of symmetry",
  ),
  makeLesson(
    "very obtuse triangle",
    [
      { x: -1.25, y: 1.415 },
      { x: 1.3, y: 1.215 },
      { x: 0.15, y: 0.715 },
    ],
    "very obtuse — the flatter it gets, the farther H flies",
  ),
  // Row 3 — the classic right triangles: legs double as altitudes.
  makeLesson(
    "right isosceles (45-45-90)",
    [
      { x: -1.0607, y: -0.5303 },
      { x: 1.0607, y: -0.5303 },
      { x: 0, y: 0.5303 },
    ],
    "45-45-90 — H on C, whose altitude bisects the hypotenuse",
  ),
  makeLesson(
    "the 3-4-5 right triangle",
    [
      { x: 1, y: 0.75 },
      { x: -1, y: -0.75 },
      { x: -1, y: 0.75 },
    ],
    "3-4-5 — right, so H sits on the corner C",
  ),
  makeLesson(
    "the 30-60-90 right triangle",
    [
      { x: -0.9, y: 0.5196 },
      { x: 0.9, y: -0.5196 },
      { x: 0.9, y: 0.5196 },
    ],
    "30-60-90 — the legs are altitudes, so H is at C",
  ),
  // Row 4 — a right triangle resting on its hypotenuse, then the knife-edge
  // pair around 90°: watch H cross straight through the vertex.
  makeLesson(
    "right triangle, hypotenuse down",
    [
      { x: -1.2, y: 0.5739 },
      { x: 1.2, y: 0.5739 },
      { x: 0.35, y: -0.5739 },
    ],
    "hypotenuse down — H on C, its altitude falling to the hypotenuse",
  ),
  makeLesson(
    "almost right — 89° at C",
    [
      { x: -1.1, y: 0.5389 },
      { x: 1.1, y: 0.5389 },
      { x: 0.3, y: -0.5389 },
    ],
    "89° — just acute, so H squeaks inside near C",
  ),
  makeLesson(
    "barely obtuse — 91° at C",
    [
      { x: -1.1, y: 0.5388 },
      { x: 1.1, y: 0.5388 },
      { x: 0.3, y: -0.5005 },
    ],
    "91° — just obtuse, so H slips outside past C",
  ),
  // Row 5 — proportions steer H around the inside.
  makeLesson(
    "tall acute triangle",
    [
      { x: -0.55, y: 1.2 },
      { x: 0.55, y: 1.2 },
      { x: 0.1, y: -1.2 },
    ],
    "tall — H sinks toward the base",
  ),
  makeLesson(
    "wide acute triangle",
    [
      { x: -1.4, y: 0.75 },
      { x: 1.4, y: 0.75 },
      { x: 0.1, y: -0.75 },
    ],
    "wide — H crowds the apex",
  ),
  makeLesson(
    "tilted scalene triangle",
    [
      { x: -1.025, y: 1 },
      { x: 1.025, y: 0.3 },
      { x: -0.425, y: -1 },
    ],
    "tilted scalene — no symmetry, same meeting at H",
  ),
  // Row 6 — obtuse variations: which sides get extended, and where H exits.
  makeLesson(
    "obtuse isosceles triangle",
    [
      { x: -1.3, y: 1.1267 },
      { x: 1.3, y: 1.1267 },
      { x: 0, y: 0.3767 },
    ],
    "obtuse isosceles — H outside, still on the axis",
  ),
  makeLesson(
    "triangle obtuse at A",
    [
      { x: -0.4653, y: -0.334 },
      { x: 1.5347, y: 0.016 },
      { x: -1.0153, y: -1.484 },
    ],
    "obtuse at A — now the other sides get extended",
  ),
  makeLesson(
    "obtuse triangle, flipped",
    [
      { x: -1.25, y: -0.9517 },
      { x: 1.25, y: -0.7017 },
      { x: 0.5, y: -0.0517 },
    ],
    "flipped — H flies out the other side",
  ),
  // Rows 7-8 — an obtuse progression over the same base: as C flattens from
  // 100° to 140°, watch the feet run up the extensions and H march away.
  makeLesson(
    "obtuse: 100° at C",
    [
      { x: -1, y: 0.5859 },
      { x: 1, y: 0.5859 },
      { x: 0.2, y: -0.2333 },
    ],
    "100° — H steps just outside",
  ),
  makeLesson(
    "obtuse: 110° at C",
    [
      { x: -1, y: 0.7046 },
      { x: 1, y: 0.7046 },
      { x: 0.2, y: 0.0233 },
    ],
    "110° — H drifts farther out",
  ),
  makeLesson(
    "obtuse: 120° at C",
    [
      { x: -1, y: 0.8573 },
      { x: 1, y: 0.8573 },
      { x: 0.2, y: 0.2974 },
    ],
    "120° — farther still",
  ),
  makeLesson(
    "obtuse: 130° at C",
    [
      { x: -1, y: 1.0645 },
      { x: 1, y: 1.0645 },
      { x: 0.2, y: 0.6137 },
    ],
    "130° — the feet run far up the extensions",
  ),
  makeLesson(
    "obtuse: 140° at C",
    [
      { x: -1, y: 1.3673 },
      { x: 1, y: 1.3673 },
      { x: 0.2, y: 1.0162 },
    ],
    "140° — H lands almost seven heights away",
  ),
  makeLesson(
    "golden gnomon (36-36-108)",
    [
      { x: -1.1326, y: 0.7795 },
      { x: 1.1326, y: 0.7795 },
      { x: 0, y: -0.0434 },
    ],
    "the golden gnomon — the pentagon's obtuse isosceles",
  ),
  // Row 9 — same idea, different labels and orientations.
  makeLesson(
    "obtuse at B",
    [
      { x: -1.25, y: 1.1302 },
      { x: 0.45, y: 0.3302 },
      { x: 1.25, y: 0.8802 },
    ],
    "obtuse at B — only B's own altitude stays inside",
  ),
  makeLesson(
    "obtuse, pointing left",
    [
      { x: 0.6355, y: -1.1 },
      { x: 0.6355, y: 1.1 },
      { x: -0.3145, y: 0.05 },
    ],
    "pointing left — H exits through the wide angle",
  ),
  makeLesson(
    "obtuse, pointing right",
    [
      { x: -0.6355, y: -1.1 },
      { x: -0.6355, y: 1.1 },
      { x: 0.3145, y: 0.05 },
    ],
    "its mirror — H exits right",
  ),
  // Row 10 — the classic figure, a perpendicular special case, and a closer.
  makeLesson(
    "the classic figure",
    [
      { x: 1.125, y: -1.2922 },
      { x: -1.125, y: 0.3078 },
      { x: 0.425, y: 0.3078 },
    ],
    "extend BC to D, and altitude AD can land",
  ),
  makeLesson(
    "obtuse with a vertical side",
    [
      { x: -0.6444, y: -1.15 },
      { x: -0.6444, y: 0.75 },
      { x: 1.1556, y: 1.15 },
    ],
    "a vertical side makes C's altitude horizontal",
  ),
  makeLesson(
    "one last scalene, obtuse",
    [
      { x: -1, y: -0.0204 },
      { x: 1, y: 0.7296 },
      { x: 0.45, y: -0.4704 },
    ],
    "no tricks left — just three lines meeting at H",
  ),
];

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: Vec, q: Vec): Vec => ({ x: p.x + q.x, y: p.y + q.y });
const scale = (p: Vec, s: number): Vec => ({ x: p.x * s, y: p.y * s });
const dot = (p: Vec, q: Vec): number => p.x * q.x + p.y * q.y;
const mid = (p: Vec, q: Vec): Vec => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

function unit(p: Vec): Vec {
  const l = Math.hypot(p.x, p.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

function centroid(v: [Vec, Vec, Vec]): Vec {
  return { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 };
}

/** The side opposite vertex `k`, as its two endpoints. */
function oppositeSide(v: [Vec, Vec, Vec], k: number): [Vec, Vec] {
  return [v[(k + 1) % 3], v[(k + 2) % 3]];
}

/** Foot of the perpendicular from `p` onto the LINE through `a` and `b`.
 *  `t` is the position along the side: outside [0, 1] means the foot missed
 *  the segment and landed on the side's extension. */
function perpendicularFoot(p: Vec, a: Vec, b: Vec): { point: Vec; t: number } {
  const ab = sub(b, a);
  const t = dot(sub(p, a), ab) / dot(ab, ab);
  return { point: add(a, scale(ab, t)), t };
}

/** The foot of the altitude from vertex `k` — the target its knob aims for. */
function altitudeFoot(v: [Vec, Vec, Vec], k: number): { point: Vec; t: number } {
  const [a, b] = oppositeSide(v, k);
  return perpendicularFoot(v[k], a, b);
}

/** Orthocenter: where the (infinite) altitude lines cross. Intersects the
 *  altitude lines from vertices 0 and 1. */
function orthocenter(v: [Vec, Vec, Vec]): Vec {
  const d0 = sub(altitudeFoot(v, 0).point, v[0]);
  const d1 = sub(altitudeFoot(v, 1).point, v[1]);
  const denom = d0.x * d1.y - d0.y * d1.x;
  const dp = sub(v[1], v[0]);
  const t = (dp.x * d1.y - dp.y * d1.x) / denom;
  return add(v[0], scale(d0, t));
}

/** Outward direction at vertex `k` — away from the altitude's foot, i.e. the
 *  reverse of the altitude. The idle stub points this way. */
function outward(v: [Vec, Vec, Vec], k: number): Vec {
  return unit(sub(v[k], altitudeFoot(v, k).point));
}

/** Where an altitude's free end (its knob) currently sits: parked on the
 *  outward stub when idle, on the perpendicular foot once locked, or wherever
 *  the drag has pulled it in between. */
function knobPos(lesson: Lesson, alt: Altitude): Vec {
  const v = lesson.verts;
  if (alt.locked) return altitudeFoot(v, alt.vertex).point;
  if (alt.drag) return alt.drag;
  return add(v[alt.vertex], scale(outward(v, alt.vertex), STUB_LEN));
}

// --- layout ----------------------------------------------------------------

// Bands keep the exact dimensions of the original three-triangle layout —
// landscape rows of three full-height bands, portrait a single column of
// third-height bands — so the triangles keep their size. With six lessons the
// world is two screens tall either way, and scrollY pans through it.
function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const usableH = H - TOP_MARGIN;
  const columns = W >= H; // landscape-ish: rows of three; else one long stack

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const band: Band = columns
      ? {
          cx: (W / 3) * ((i % 3) + 0.5),
          cy: TOP_MARGIN + usableH * (Math.floor(i / 3) + 0.5),
          w: W / 3,
          h: usableH,
        }
      : {
          cx: W / 2,
          cy: TOP_MARGIN + (usableH / 3) * (i + 0.5),
          w: W,
          h: usableH / 3,
        };

    const s = Math.min(band.w, band.h) * SHAPE_SCALE;
    lesson.band = band;
    lesson.verts = lesson.shape.map((o) => ({
      x: band.cx + o.x * s,
      y: band.cy + o.y * s,
    })) as [Vec, Vec, Vec];
  }

  const rows = columns ? Math.ceil(lessons.length / 3) : lessons.length / 3;
  const worldH = TOP_MARGIN + usableH * rows;
  maxScroll = Math.max(0, worldH - H);
  scrollY = clamp(scrollY, 0, maxScroll);
}

// --- interaction -------------------------------------------------------------

/** Pointer position in WORLD coordinates — screen position plus the pan. */
function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top + scrollY };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  let best: [number, number] | null = null;
  let bestD = GRAB_RADIUS;
  for (let i = 0; i < lessons.length; i++) {
    for (let k = 0; k < 3; k++) {
      const alt = lessons[i].altitudes[k];
      if (alt.locked) continue;
      const d = dist(p, knobPos(lessons[i], alt));
      if (d <= bestD) {
        bestD = d;
        best = [i, k];
      }
    }
  }
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  if (best) {
    grabbed = best;
    drive(best, p);
  } else {
    // Nothing under the hand: drag the world instead.
    panFrom = e.clientY;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (grabbed) {
    drive(grabbed, pointer(e));
  } else if (panFrom !== null) {
    scrollY = clamp(scrollY - (e.clientY - panFrom), 0, maxScroll);
    panFrom = e.clientY;
  }
});

function endDrag(e: PointerEvent): void {
  if (grabbed) {
    // Let go before reaching the foot and the segment springs back to its
    // outward stub — an altitude is only ever idle, mid-pull, or locked.
    const alt = lessons[grabbed[0]].altitudes[grabbed[1]];
    if (!alt.locked) alt.drag = null;
    grabbed = null;
  }
  panFrom = null;
  canvas.classList.remove("grabbing");
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    scrollY = clamp(scrollY + e.deltaY, 0, maxScroll);
  },
  { passive: false },
);

/** Follow the pointer with the free end, capped at 130% of the finished
 *  altitude, and lock onto the perpendicular foot the instant the end
 *  reaches it. */
function drive([i, k]: [number, number], p: Vec): void {
  const lesson = lessons[i];
  const alt = lesson.altitudes[k];
  if (alt.locked) return;

  const v = lesson.verts[alt.vertex];
  const target = altitudeFoot(lesson.verts, alt.vertex).point;
  const maxLen = dist(v, target) * LENGTH_CAP;

  const reach = sub(p, v);
  const len = Math.hypot(reach.x, reach.y);
  const end = len > maxLen ? add(v, scale(unit(reach), maxLen)) : { x: p.x, y: p.y };

  if (dist(end, target) <= SNAP_RADIUS) {
    lockAltitude(lesson, alt);
  } else {
    alt.drag = end;
  }
}

function lockAltitude(lesson: Lesson, alt: Altitude): void {
  alt.locked = true;
  alt.drag = null;
  lesson.pulses.push({ center: altitudeFoot(lesson.verts, alt.vertex).point, age: 0 });
  // The moment the third altitude locks, arm the orthocenter celebration.
  if (lesson.celebrateAge < 0 && lesson.altitudes.every((x) => x.locked)) {
    lesson.celebrateAge = 0;
  }
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  // World pass: everything geometric pans with the scroll…
  ctx.save();
  ctx.translate(0, -scrollY);
  for (const lesson of lessons) {
    // Skip bands entirely outside the current view.
    const top = lesson.band.cy - lesson.band.h / 2;
    if (top > scrollY + H || top + lesson.band.h < scrollY) continue;
    renderLesson(lesson);
  }
  ctx.restore();
  // …chrome pass: the header, scroll hint, and scrollbar stay put.
  drawHeader();
  drawScrollbar();
  drawScrollHint();
}

function renderLesson(lesson: Lesson): void {
  const v = lesson.verts;
  const complete = lesson.altitudes.every((a) => a.locked);

  drawBody(v);
  for (let s = 0; s < 3; s++) {
    drawSide(v[s], v[(s + 1) % 3]);
  }
  // Dashed side extensions wherever a foot misses its side — part of the
  // figure from the start, exactly like the classic extension of BC to D.
  for (const alt of lesson.altitudes) drawExtension(v, alt.vertex);

  // Target rings first, so the altitude lines draw over them.
  for (const alt of lesson.altitudes) {
    if (!alt.locked) drawTarget(altitudeFoot(v, alt.vertex).point);
  }
  if (complete) drawOrthocenterLines(lesson);
  for (const alt of lesson.altitudes) drawAltitude(lesson, alt);
  drawVertexLabels(lesson);
  for (const p of lesson.pulses) drawPulse(p);
  if (complete) drawOrthocenter(v);
  drawCaption(lesson, complete && lesson.celebrateFired > 0);
}

function drawBody(v: [Vec, Vec, Vec]): void {
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  ctx.lineTo(v[1].x, v[1].y);
  ctx.lineTo(v[2].x, v[2].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();

  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.001)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawSide(a: Vec, b: Vec): void {
  strokeSegment(a, b, BASE_LINE, 3);
}

/** Dashed extension of the side opposite vertex `k`, drawn only when the
 *  altitude's foot lands outside the segment (the obtuse triangle's case). */
function drawExtension(v: [Vec, Vec, Vec], k: number): void {
  const [a, b] = oppositeSide(v, k);
  const { point, t } = altitudeFoot(v, k);
  // The epsilon keeps float noise from sprouting a phantom extension when a
  // foot sits exactly on a side endpoint (the right triangle's legs).
  if (t >= -0.01 && t <= 1.01) return;
  const from = t < 0 ? a : b;
  const dir = unit(sub(point, from));
  const to = add(point, scale(dir, EXTENSION_OVERHANG));
  strokeDashed(from, to, BASE_LINE, 2);
}

/** A faint hollow ring marking the perpendicular foot an altitude aims for. */
function drawTarget(m: Vec): void {
  ctx.beginPath();
  ctx.arc(m.x, m.y, SNAP_RADIUS, 0, TWO_PI);
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = BASE_LINE;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(m.x, m.y, 2.5, 0, TWO_PI);
  ctx.fillStyle = BASE_LINE;
  ctx.fill();
}

/** One altitude: a dim outward stub when idle, the accent line while pulled,
 *  the done color once locked — plus the knob at its free end, and the
 *  right-angle marker and h-label once it locks. */
function drawAltitude(lesson: Lesson, alt: Altitude): void {
  const start = lesson.verts[alt.vertex];
  const end = knobPos(lesson, alt);
  const dragging =
    grabbed !== null && grabbed[0] === lessons.indexOf(lesson) && grabbed[1] === alt.vertex;

  if (alt.locked) {
    strokeSegment(start, end, DONE, 4);
    drawRightAngleMarker(lesson.verts, alt.vertex);
    drawAltitudeLabel(lesson, alt.vertex);
  } else if (alt.drag) {
    strokeSegment(start, end, ACCENT, 5);
  } else {
    strokeSegment(start, end, STUB, 3);
  }

  drawKnob(end, alt.locked, dragging);
}

/** The little square at a locked foot, tucked between the side and the
 *  altitude — the visual certificate that the segment really is perpendicular. */
function drawRightAngleMarker(v: [Vec, Vec, Vec], k: number): void {
  const [a, b] = oppositeSide(v, k);
  const foot = altitudeFoot(v, k).point;
  const up = unit(sub(v[k], foot)); // along the altitude, toward the vertex
  const sideMid = mid(a, b);
  const along =
    dist(foot, sideMid) < 1e-6 ? unit(sub(b, a)) : unit(sub(sideMid, foot)); // back toward the side

  const p1 = add(foot, scale(up, MARKER));
  const corner = add(p1, scale(along, MARKER));
  const p2 = add(foot, scale(along, MARKER));
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(corner.x, corner.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(DONE, 0.8);
  ctx.stroke();
}

/** "h" with its vertex subscript, beside the midpoint of a locked altitude,
 *  offset perpendicular to it on the side away from the triangle's middle. */
function drawAltitudeLabel(lesson: Lesson, k: number): void {
  const v = lesson.verts;
  const foot = altitudeFoot(v, k).point;
  const m = mid(v[k], foot);
  const along = unit(sub(foot, v[k]));
  let n = { x: -along.y, y: along.x };
  if (dot(n, sub(m, centroid(v))) < 0) n = scale(n, -1);
  const at = add(m, scale(n, 14));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 600 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = rgba(DONE, 0.9);
  ctx.fillText("h", at.x - 3, at.y);
  ctx.font = "italic 600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(H_SUBSCRIPTS[k], at.x + 5, at.y + 4);
}

/** A, B, C beside their vertices, nudged off the stub so the two never collide. */
function drawVertexLabels(lesson: Lesson): void {
  const v = lesson.verts;
  const g = centroid(v);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.65)";
  for (let k = 0; k < 3; k++) {
    let d = unit(sub(v[k], g));
    const s = outward(v, k);
    // If the label direction hugs the stub, swing it 55° to the clearer side.
    if (dot(d, s) > Math.cos((45 * Math.PI) / 180)) {
      const sign = s.x * d.y - s.y * d.x >= 0 ? 1 : -1;
      const ang = (55 * Math.PI) / 180 * sign;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      d = { x: s.x * cos - s.y * sin, y: s.x * sin + s.y * cos };
    }
    const at = add(v[k], scale(d, 20));
    ctx.fillText(VERTEX_NAMES[k], at.x, at.y);
  }
}

function drawKnob(v: Vec, locked: boolean, active: boolean): void {
  const r = locked ? 6 : active ? 15 : 11;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, 0, TWO_PI);
  ctx.fillStyle = locked ? rgba(DONE, 0.95) : "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = locked ? rgba(DONE, 0.5) : "rgba(10,15,22,0.85)";
  ctx.stroke();
}

/** Dashed continuations of the altitude LINES to H, for any altitude whose
 *  segment doesn't already pass through it — how the obtuse triangle shows
 *  that only the lines, not the segments, are concurrent. */
function drawOrthocenterLines(lesson: Lesson): void {
  const v = lesson.verts;
  const h = orthocenter(v);
  for (const alt of lesson.altitudes) {
    const vert = v[alt.vertex];
    const foot = altitudeFoot(v, alt.vertex).point;
    const along = sub(foot, vert);
    const tH = dot(sub(h, vert), along) / dot(along, along);
    if (tH > 1.02) strokeDashed(foot, h, rgba(DONE, 0.55), 2);
    else if (tH < -0.02) strokeDashed(vert, h, rgba(DONE, 0.55), 2);
  }
}

/** The orthocenter H, once all three altitudes meet: an enlarged done-colored
 *  dot with its label. Its three celebratory pulses ride the shared pulse list. */
function drawOrthocenter(v: [Vec, Vec, Vec]): void {
  const h = orthocenter(v);
  ctx.beginPath();
  ctx.arc(h.x, h.y, 8, 0, TWO_PI);
  ctx.fillStyle = rgba(DONE, 0.98);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();

  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = H_TEXT;
  ctx.fillText("H", h.x + 13, h.y - 12);
}

/** The triangle's name at the bottom of its band; once H has appeared it
 *  switches to the done color and says where H landed. */
function drawCaption(lesson: Lesson, celebrated: boolean): void {
  const { band } = lesson;
  const maxY = Math.max(...lesson.shape.map((o) => o.y));
  const s = Math.min(band.w, band.h) * SHAPE_SCALE;
  const y = Math.min(band.cy + maxY * s + 63, band.cy + band.h / 2 - 16);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = celebrated ? rgba(DONE, 0.85) : CAPTION;
  ctx.fillText(celebrated ? lesson.doneCaption : lesson.name, band.cx, y);
}

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(DONE, 1 - t);
  ctx.stroke();
}

function strokeSegment(p: Vec, q: Vec, color: string, width: number): void {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function strokeDashed(p: Vec, q: Vec, color: string, width: number): void {
  ctx.setLineDash([5, 6]);
  strokeSegment(p, q, color, width);
  ctx.setLineDash([]);
}

function drawHeader(): void {
  // A soft backdrop so scrolled triangles pass under the title, not through it.
  const fade = ctx.createLinearGradient(0, 0, 0, TOP_MARGIN);
  fade.addColorStop(0, "rgba(11,15,20,0.85)");
  fade.addColorStop(1, "rgba(11,15,20,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, TOP_MARGIN);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Altitudes", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText("drag each knob to drop a perpendicular onto the opposite side", W / 2, 48);
}

/** A slim thumb along the right edge showing where the pan sits in the world. */
function drawScrollbar(): void {
  if (maxScroll <= 0) return;
  const trackTop = TOP_MARGIN + 8;
  const trackH = H - trackTop - 16;
  const thumbH = Math.max(36, trackH * (H / (H + maxScroll)));
  const thumbY = trackTop + (trackH - thumbH) * (scrollY / maxScroll);
  ctx.beginPath();
  ctx.roundRect(W - 7, thumbY, 4, thumbH, 2);
  ctx.fillStyle = "rgba(233,240,247,0.22)";
  ctx.fill();
}

/** "scroll for more" at the bottom edge, fading out as soon as panning starts.
 *  It sits on its own soft gradient (the header's mirror image) so band
 *  captions slide under it instead of colliding with it. */
function drawScrollHint(): void {
  if (maxScroll <= 0) return;
  const alpha = clamp(1 - scrollY / 80, 0, 1);
  if (alpha <= 0) return;

  const fade = ctx.createLinearGradient(0, H - 48, 0, H);
  fade.addColorStop(0, "rgba(11,15,20,0)");
  fade.addColorStop(1, `rgba(11,15,20,${0.85 * alpha})`);
  ctx.fillStyle = fade;
  ctx.fillRect(0, H - 48, W, 48);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = `rgba(233,240,247,${0.55 * alpha})`;
  ctx.fillText("scroll for more triangles ↓", W / 2, H - 14);
}

// --- small helpers -------------------------------------------------------

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const bl = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

// --- notes drawer ------------------------------------------------------------

const notesToggle = document.getElementById("notes-toggle") as HTMLButtonElement;
const notesClose = document.getElementById("notes-close") as HTMLButtonElement;
notesToggle.addEventListener("click", () => document.body.classList.toggle("notes-open"));
notesClose.addEventListener("click", () => document.body.classList.remove("notes-open"));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.body.classList.remove("notes-open");
});

// --- loop ------------------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  for (const lesson of lessons) {
    // Stagger the three orthocenter pulses once the celebration is armed.
    if (lesson.celebrateAge >= 0) {
      lesson.celebrateAge += dt;
      while (
        lesson.celebrateFired < 3 &&
        lesson.celebrateAge >= lesson.celebrateFired * CELEBRATE_GAP
      ) {
        lesson.pulses.push({ center: orthocenter(lesson.verts), age: 0 });
        lesson.celebrateFired += 1;
      }
    }
    lesson.pulses = lesson.pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
