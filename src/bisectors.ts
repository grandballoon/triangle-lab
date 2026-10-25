// Parts · Three — Angle Bisectors (first, drag-driven implementation).
//
// Four static triangles, each with one vertex chosen as the apex. From that
// apex a cevian runs to a point on the opposite side, but it starts off *not*
// bisecting the angle. A knob rides on the opposite side; slide it and the
// cevian sweeps with it. The two interior angles the cevian carves at the apex
// fill as coloured wedges — one warm, one cool — so their mismatch is visible
// at a glance. Slide until the two angles are equal and both wedges snap to the
// same colour; at that instant the apex pulses once. Nothing locks: the knob
// can drift past the true bisector to either side and the colours split again.
//
// Self-contained on purpose, matching medians.ts / perimeter.ts / etc. — only
// the webcam device, the shared grid layout, the small-screen helpers and
// this file's own little vector helpers are involved.

import { grabRadius } from "./fit.ts";
import { grid } from "./grid.ts";
import { capturePointer, releasePointer } from "./pointer.ts";
import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Pulse {
  center: Vec;
  age: number; // seconds since it fired
}

interface Lesson {
  shape: [Vec, Vec, Vec]; // normalised triangle, centred on its own centroid
  apex: number; // index (0,1,2) of the vertex the bisector springs from
  verts: [Vec, Vec, Vec]; // placed on screen by layout()
  t: number; // foot position along the opposite side, P -> Q, in [T_MIN, T_MAX]
  wasEqual: boolean; // were the two angles equal last frame (for one-shot pulse)
  pulses: Pulse[];
}

const C1 = "#f472b6"; // one half-angle (warm) while the cevian is off the bisector
const C2 = "#60a5fa"; // the other half-angle (cool)
const EQUAL = "#38d9a9"; // both halves once the angle is bisected
const CEVIAN = "rgba(233,240,247,0.85)"; // the would-be bisector, before it is one
const BASE_LINE = "rgba(233,240,247,0.28)"; // triangle sides, kept discreet
const LABEL_BG = "rgba(10,15,22,0.72)";

const GRAB_RADIUS = 36;
const TWO_PI = Math.PI * 2;
const DEG = 180 / Math.PI;
const TOP_MARGIN = 64; // room for the top bar above the grid

// Each triangle's unit, its normalised coordinates, is this share of its
// cell's smaller side.
const SHAPE_SCALE = 0.3;
const T_MIN = 0.07; // keep the foot off the very corners of the opposite side
const T_MAX = 0.93;
const EQUAL_EPS_DEG = 0.7; // half-angles within this of each other count as bisected
const PULSE_LIFE = 0.6;

// Four distinct triangles, each with its own apex vertex, so the lesson reads
// "every vertex has a bisector" rather than looking like one shape cloned.
// Coordinates live in a roughly unit box (y points down); layout() centres each
// on its centroid and scales it into a grid cell.
const LESSON_SEEDS: { shape: [Vec, Vec, Vec]; apex: number }[] = [
  // Scalene, bisector from the top vertex.
  { shape: [{ x: 0.12, y: -0.92 }, { x: 0.98, y: 0.78 }, { x: -0.95, y: 0.72 }], apex: 0 },
  // Tall isosceles, bisector from the apex (the axis of symmetry — t* lands mid-side).
  { shape: [{ x: 0.0, y: -1.02 }, { x: 0.72, y: 0.86 }, { x: -0.72, y: 0.86 }], apex: 0 },
  // Obtuse, bisector from a sharp vertex.
  { shape: [{ x: -1.12, y: -0.18 }, { x: 1.16, y: -0.06 }, { x: 0.22, y: 0.78 }], apex: 2 },
  // Right-ish scalene, bisector from the middle vertex.
  { shape: [{ x: -0.82, y: -0.72 }, { x: 0.92, y: -0.72 }, { x: -0.82, y: 0.88 }], apex: 1 },
];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let grabbed: number | null = null; // index of the lesson whose knob is held

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: Vec, q: Vec): Vec => ({ x: p.x + q.x, y: p.y + q.y });
const lerp = (p: Vec, q: Vec, t: number): Vec => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

function centroid(v: [Vec, Vec, Vec]): Vec {
  return { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 };
}

/** The two endpoints of the side opposite `apex`, in the order P -> Q that `t`
 *  runs along. */
function opposite(lesson: Lesson): [Vec, Vec] {
  return [lesson.verts[(lesson.apex + 1) % 3], lesson.verts[(lesson.apex + 2) % 3]];
}

/** Where the cevian's foot (and its knob) sits on the opposite side. */
function foot(lesson: Lesson): Vec {
  const [p, q] = opposite(lesson);
  return lerp(p, q, lesson.t);
}

/** The parameter `t` at which the cevian truly bisects the apex angle. By the
 *  angle-bisector theorem PF/FQ = VP/VQ, so t = VP / (VP + VQ). */
function bisectorT(lesson: Lesson): number {
  const v = lesson.verts[lesson.apex];
  const [p, q] = opposite(lesson);
  const vp = dist(v, p);
  const vq = dist(v, q);
  return vp / (vp + vq);
}

/** Signed minor arc in (-π, π] — the interior sweep between two rays. */
function normAngle(a: number): number {
  while (a <= -Math.PI) a += TWO_PI;
  while (a > Math.PI) a -= TWO_PI;
  return a;
}

/** The two half-angles (in degrees) the cevian carves at the apex: apex→P side
 *  vs. cevian, and cevian vs. apex→Q side. */
function halfAngles(lesson: Lesson): { a1: number; a2: number } {
  const v = lesson.verts[lesson.apex];
  const [p, q] = opposite(lesson);
  const f = foot(lesson);
  const aP = Math.atan2(p.y - v.y, p.x - v.x);
  const aF = Math.atan2(f.y - v.y, f.x - v.x);
  const aQ = Math.atan2(q.y - v.y, q.x - v.x);
  return {
    a1: Math.abs(normAngle(aF - aP)) * DEG,
    a2: Math.abs(normAngle(aQ - aF)) * DEG,
  };
}

// --- layout ----------------------------------------------------------------

const lessons: Lesson[] = LESSON_SEEDS.map((seed) => {
  const g = centroid(seed.shape);
  return {
    shape: seed.shape.map((p) => sub(p, g)) as [Vec, Vec, Vec], // centred on origin
    apex: seed.apex,
    verts: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ] as [Vec, Vec, Vec],
    t: 0, // set below, once verts exist to derive the bisector point
    wasEqual: false,
    pulses: [],
  };
});

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // As many columns as draws the triangles largest: a row of four on a wide
  // screen, 2×2 on a squarer one, a single column on a tall, narrow one.
  const content = { w: 1 / SHAPE_SCALE, h: 1 / SHAPE_SCALE };
  const { cells, scale } = grid(lessons.length, { x: 0, y: TOP_MARGIN, w: W, h: H - TOP_MARGIN }, content);
  cells.forEach((band, i) => {
    lessons[i].verts = lessons[i].shape.map((o) => ({
      x: band.cx + o.x * scale,
      y: band.cy + o.y * scale,
    })) as [Vec, Vec, Vec];
  });
}

/** Start each cevian clearly off its bisector, nudged to alternating sides so
 *  the four demos don't all lean the same way. */
function seedFeet(): void {
  lessons.forEach((lesson, i) => {
    const star = bisectorT(lesson);
    const nudge = i % 2 === 0 ? 0.24 : -0.24;
    let t = clamp(star + nudge, T_MIN, T_MAX);
    // If clamping pinned us back near the bisector, push off the other way.
    if (Math.abs(t - star) < 0.12) t = clamp(star - nudge, T_MIN, T_MAX);
    lesson.t = t;
  });
}

// --- interaction -------------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  let best: number | null = null;
  let bestD = grabRadius(e.pointerType, GRAB_RADIUS);
  for (let i = 0; i < lessons.length; i++) {
    const d = dist(p, foot(lessons[i]));
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best === null) return;
  grabbed = best;
  canvas.classList.add("grabbing");
  capturePointer(canvas, e);
  drive(best, p);
});

canvas.addEventListener("pointermove", (e) => {
  if (grabbed !== null) drive(grabbed, pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (grabbed === null) return;
  // The knob simply stays where you leave it — the whole side is fair game and
  // nothing locks; you can always slide back through the bisector.
  grabbed = null;
  canvas.classList.remove("grabbing");
  releasePointer(canvas, e);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Project the pointer onto the opposite side and move the foot there. Fire a
 *  single pulse the moment the two half-angles first come into agreement. */
function drive(i: number, p: Vec): void {
  const lesson = lessons[i];
  const [a, b] = opposite(lesson);
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  const raw = len2 < 1e-9 ? 0 : (sub(p, a).x * ab.x + sub(p, a).y * ab.y) / len2;
  lesson.t = clamp(raw, T_MIN, T_MAX);

  const { a1, a2 } = halfAngles(lesson);
  const equalNow = Math.abs(a1 - a2) < EQUAL_EPS_DEG;
  if (equalNow && !lesson.wasEqual) {
    lesson.pulses.push({ center: lesson.verts[lesson.apex], age: 0 });
  }
  lesson.wasEqual = equalNow;
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  for (const lesson of lessons) renderLesson(lesson);
}

function renderLesson(lesson: Lesson): void {
  const v = lesson.verts;
  drawBody(v);
  for (let s = 0; s < 3; s++) drawSide(v[s], v[(s + 1) % 3]);

  const { a1, a2 } = halfAngles(lesson);
  const equal = Math.abs(a1 - a2) < EQUAL_EPS_DEG;

  drawWedges(lesson, a1, a2, equal);
  drawCevian(lesson, equal);
  drawKnob(foot(lesson), grabbed === lessons.indexOf(lesson), equal);
  for (const p of lesson.pulses) drawPulse(p);
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

/** The two coloured wedges at the apex, split by the cevian, each labelled with
 *  its angle. Same colour once the two agree — that colour match is the whole
 *  point of the lesson. */
function drawWedges(lesson: Lesson, a1: number, a2: number, equal: boolean): void {
  const v = lesson.verts[lesson.apex];
  const [p, q] = opposite(lesson);
  const f = foot(lesson);

  const aP = Math.atan2(p.y - v.y, p.x - v.x);
  const aF = Math.atan2(f.y - v.y, f.x - v.x);
  const aQ = Math.atan2(q.y - v.y, q.x - v.x);
  const d1 = normAngle(aF - aP);
  const d2 = normAngle(aQ - aF);

  // Keep the arc comfortably inside the shortest of the three rays meeting here.
  const span = Math.min(dist(v, p), dist(v, q), dist(v, f));
  const r = clamp(span * 0.34, 13, 46);

  const col1 = equal ? EQUAL : C1;
  const col2 = equal ? EQUAL : C2;
  drawWedge(v, r, aP, d1, col1);
  drawWedge(v, r, aF, d2, col2);

  drawAngleLabel(v, aP + d1 / 2, r + 16, a1, col1);
  drawAngleLabel(v, aF + d2 / 2, r + 16, a2, col2);
}

function drawWedge(v: Vec, r: number, aStart: number, delta: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.arc(v.x, v.y, r, aStart, aStart + delta, delta < 0);
  ctx.closePath();
  ctx.fillStyle = rgba(color, 0.3);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(v.x, v.y, r, aStart, aStart + delta, delta < 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawAngleLabel(v: Vec, midAngle: number, reach: number, degrees: number, color: string): void {
  const pos = add(v, { x: Math.cos(midAngle) * reach, y: Math.sin(midAngle) * reach });
  const text = `${Math.round(degrees)}°`;
  ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const pad = 6;
  const tw = ctx.measureText(text).width;
  roundRect(pos.x - tw / 2 - pad, pos.y - 12, tw + pad * 2, 24, 7);
  ctx.fillStyle = LABEL_BG;
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(text, pos.x, pos.y + 1);
}

/** The would-be bisector itself, from apex to foot. */
function drawCevian(lesson: Lesson, equal: boolean): void {
  strokeSegment(lesson.verts[lesson.apex], foot(lesson), equal ? EQUAL : CEVIAN, equal ? 4 : 3);
}

function drawKnob(v: Vec, active: boolean, equal: boolean): void {
  const r = active ? 15 : 11;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, 0, TWO_PI);
  ctx.fillStyle = equal ? rgba(EQUAL, 0.95) : "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = equal ? rgba(EQUAL, 0.5) : "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(EQUAL, 1 - t);
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

// --- small helpers -------------------------------------------------------

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const bl = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

// --- loop ------------------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  for (const lesson of lessons) {
    lesson.pulses = lesson.pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
seedFeet();
startWebcam(video);
requestAnimationFrame(frame);
