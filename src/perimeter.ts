// Parts · One — Perimeter & Semiperimeter (first, drag-driven implementation).
//
// Three static triangles of different sizes, each with sides and angles
// labeled discreetly (small, muted — the numbers matter, not the decoration).
// Each carries one knob, parked at a starting vertex. Drag it along the
// current side; the traveled portion fills in an accent color while the rest
// of that side stays dim. Reach the far vertex and the side "snaps" to its
// done color, the angle you just arrived at (the side's second endpoint)
// snaps too with a brief flash, and the running perimeter total in the
// formula band below grows by that side. The moment the knob has walked half
// the perimeter, a gold mark drops on that spot: the semiperimeter s. Loop
// all the way back to the start and the formula reads p and s = p/2 in full.
//
// Self-contained on purpose, matching equilateral.ts / isosceles.ts / scalene.ts
// — only the webcam device, the shared grid layout, the page's formula band
// and this file's own little vector helpers are involved.

import { formulaBand } from "./chrome.ts";
import { grid, type Cell } from "./grid.ts";
import type { Readout } from "./lab/scene.ts";
import { grabRadius } from "./fit.ts";
import { capturePointer, releasePointer } from "./pointer.ts";
import { perimeterReadout } from "./readouts.ts";
import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Flash {
  center: Vec;
  age: number; // seconds since it fired
  color: string;
}

interface Lesson {
  verts: [Vec, Vec, Vec];
  sideIndex: number; // which side (0, 1, 2) is currently being traced; 3 = fully traced
  t: number; // progress along the current side, 0..1
  halfway: boolean; // the knob has walked at least half the perimeter
  flashes: Flash[];
}

const ACCENT = "#60a5fa"; // the side currently being traced
const DONE = "#38d9a9"; // a completed side/angle, and its snap flash
const HALF = "#fbbf24"; // the semiperimeter mark, halfway round
const BASE_LINE = "rgba(233,240,247,0.28)"; // untraced side/angle — kept discreet
const LABEL_MUTED = "rgba(233,240,247,0.5)"; // side-length labels — kept discreet

const LENGTH_PER_SHAPE = 3; // displayed length of one SHAPE unit at size factor 1
const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64; // room for the top bar above the triangles

// Reaching this much of the way along a side counts as "arrived" at its far
// vertex — forgiving enough that a mouse drag can "snap" the last stretch.
const SNAP_T = 0.985;
const FLASH_LIFE = 0.6;

// One lopsided triangle "shape" (same ratios as the scalene demo's seed — a
// decisively unequal 1 : 1.6 : 2.1 proportion), reused at three different
// scales and rotations so the sides and angles carry three different sets of
// values without needing three unrelated shapes.
const SHAPE: [Vec, Vec, Vec] = [
  { x: -0.58, y: -1.19 },
  { x: 1.17, y: 0.96 },
  { x: -0.77, y: 0.12 },
];
const SIZE_FACTOR = [0.72, 1.0, 1.34]; // small, medium, large
const SIZE_NAME = ["Small", "Medium", "Large"];
const ROTATION = [-0.15, 0.3, -0.45]; // radians — just enough to avoid looking cloned
// Room around each triangle for its side labels and its s mark: SHAPE units
// while it is drawn large, screen px once it is drawn small.
const LABEL_ROOM = { units: 0.6, px: 24 };

/** SHAPE as triangle i is drawn, in SHAPE units about its cell's centre. */
function placed(i: number): [Vec, Vec, Vec] {
  const cosR = Math.cos(ROTATION[i]);
  const sinR = Math.sin(ROTATION[i]);
  const k = SIZE_FACTOR[i];
  return SHAPE.map((o) => ({ x: (o.x * cosR - o.y * sinR) * k, y: (o.x * sinR + o.y * cosR) * k })) as [
    Vec,
    Vec,
    Vec,
  ];
}

// Every cell is the size of the one the largest triangle needs.
const CONTENT = (() => {
  let w = 0;
  let h = 0;
  for (let i = 0; i < 3; i++) {
    const xs = placed(i).map((p) => p.x);
    const ys = placed(i).map((p) => p.y);
    w = Math.max(w, Math.max(...xs) - Math.min(...xs));
    h = Math.max(h, Math.max(...ys) - Math.min(...ys));
  }
  return { w, h };
})();

const showFormulas = formulaBand();

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let unitPx = 1; // screen pixels per displayed length unit
let grabbed: number | null = null;

const lessons: Lesson[] = [0, 1, 2].map(() => ({
  verts: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  sideIndex: 0,
  t: 0,
  halfway: false,
  flashes: [],
}));

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const dot = (p: Vec, q: Vec): number => p.x * q.x + p.y * q.y;
const mid = (p: Vec, q: Vec): Vec => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

function unit(p: Vec): Vec {
  const l = Math.hypot(p.x, p.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

function centroid(v: [Vec, Vec, Vec]): Vec {
  return { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 };
}

/** A vertex reads as "done" (arrived at during tracing) once the side that
 *  leads into it has been completed. Vertex 0 is the start, so it only reads
 *  done again once the whole perimeter has looped back to it. */
function vertexDone(i: number, k: number): boolean {
  const s = lessons[i].sideIndex;
  return k === 0 ? s >= 3 : s >= k;
}

/** Where the knob currently sits: on the vertex once a side is done, or
 *  somewhere along the side still being traced. */
function knobPos(i: number): Vec {
  const lesson = lessons[i];
  if (lesson.sideIndex >= 3) return lesson.verts[0];
  const a = lesson.verts[lesson.sideIndex];
  const b = lesson.verts[(lesson.sideIndex + 1) % 3];
  return { x: a.x + (b.x - a.x) * lesson.t, y: a.y + (b.y - a.y) * lesson.t };
}

/** Length of side k (vertex k to vertex k + 1) as displayed, to one place.
 *  Read fresh from the geometry, so a resize never leaves a stale total. */
function sideLength(i: number, k: number): number {
  const v = lessons[i].verts;
  return Math.round((dist(v[k], v[(k + 1) % 3]) / unitPx) * 10) / 10;
}

function halfPerimeterPx(v: [Vec, Vec, Vec]): number {
  return (dist(v[0], v[1]) + dist(v[1], v[2]) + dist(v[2], v[0])) / 2;
}

/** How far the knob has walked from the start, in screen pixels. */
function walkedPx(i: number): number {
  const lesson = lessons[i];
  const v = lesson.verts;
  let sum = 0;
  for (let k = 0; k < Math.min(lesson.sideIndex, 3); k++) sum += dist(v[k], v[(k + 1) % 3]);
  if (lesson.sideIndex < 3) sum += dist(v[lesson.sideIndex], v[(lesson.sideIndex + 1) % 3]) * lesson.t;
  return sum;
}

/** The point half the perimeter from the start, walking the sides in order,
 *  and the direction of the side it lies on. */
function halfwayPoint(v: [Vec, Vec, Vec]): { at: Vec; along: Vec } {
  let left = halfPerimeterPx(v);
  for (let k = 0; ; k++) {
    const a = v[k];
    const b = v[(k + 1) % 3];
    const len = dist(a, b);
    if (left <= len || k === 2) {
      const t = len < 1e-9 ? 0 : Math.min(1, left / len);
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, along: unit(sub(b, a)) };
    }
    left -= len;
  }
}

// --- layout ----------------------------------------------------------------

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { cells, scale } = grid(3, { x: 0, y: TOP_MARGIN, w: W, h: H - TOP_MARGIN }, CONTENT, LABEL_ROOM);
  unitPx = scale / LENGTH_PER_SHAPE;
  cells.forEach((cell: Cell, i) => {
    lessons[i].verts = placed(i).map((o) => ({ x: cell.cx + o.x * scale, y: cell.cy + o.y * scale })) as [
      Vec,
      Vec,
      Vec,
    ];
  });
}

// --- interaction -------------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  let best = -1;
  let bestD = grabRadius(e.pointerType, GRAB_RADIUS);
  for (let i = 0; i < lessons.length; i++) {
    if (lessons[i].sideIndex >= 3) continue;
    const d = dist(p, knobPos(i));
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return;
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
  grabbed = null;
  canvas.classList.remove("grabbing");
  releasePointer(canvas, e);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Project the pointer onto the side currently being traced, then — if it
 *  reaches far enough — snap that side complete and, in the same motion,
 *  keep going in case the drag already reached into the next side too. */
function drive(i: number, p: Vec): void {
  const lesson = lessons[i];
  for (let guard = 0; guard < 3 && lesson.sideIndex < 3; guard++) {
    const side = lesson.sideIndex;
    const a = lesson.verts[side];
    const b = lesson.verts[(side + 1) % 3];
    const t = projectT(p, a, b);
    lesson.t = t;
    if (t < SNAP_T) break;
    completeSide(i, side);
  }
  // Half a pixel short still counts, so the mark can land on a vertex.
  if (!lesson.halfway && walkedPx(i) >= halfPerimeterPx(lesson.verts) - 0.5) {
    lesson.halfway = true;
    lesson.flashes.push({ center: halfwayPoint(lesson.verts).at, age: 0, color: HALF });
  }
}

function projectT(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < 1e-9) return 1;
  return clamp(dot(sub(p, a), ab) / len2, 0, 1);
}

function completeSide(i: number, side: number): void {
  const lesson = lessons[i];
  const arrival = lesson.verts[(side + 1) % 3];
  lesson.sideIndex = side + 1;
  lesson.t = 0;
  lesson.flashes.push({ center: { ...arrival }, age: 0, color: DONE });
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < lessons.length; i++) renderLesson(i);
}

function renderLesson(i: number): void {
  const lesson = lessons[i];
  const v = lesson.verts;
  const c = centroid(v);

  drawBody(v);
  for (let s = 0; s < 3; s++) drawSide(i, s, c);
  for (let k = 0; k < 3; k++) drawAngle(i, k);
  if (lesson.halfway) drawHalfway(v, c);
  for (const f of lesson.flashes) drawFlash(f);
  if (lesson.sideIndex < 3) drawKnob(knobPos(i), grabbed === i, false);
  else drawKnob(v[0], false, true);
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

/** One side: done color once complete, an accent-filled lead with a dim tail
 *  while it's the one being traced, or a flat dim line before its turn. */
function drawSide(i: number, sideIdx: number, c: Vec): void {
  const lesson = lessons[i];
  const a = lesson.verts[sideIdx];
  const b = lesson.verts[(sideIdx + 1) % 3];

  if (sideIdx < lesson.sideIndex || lesson.sideIndex >= 3) {
    strokeSegment(a, b, DONE, 4);
  } else if (sideIdx === lesson.sideIndex) {
    const k = knobPos(i);
    strokeSegment(k, b, BASE_LINE, 3);
    strokeSegment(a, k, ACCENT, 5);
  } else {
    strokeSegment(a, b, BASE_LINE, 3);
  }

  drawSideLabel(a, b, c, sideLength(i, sideIdx));
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

function drawSideLabel(p: Vec, q: Vec, c: Vec, value: number): void {
  const m = mid(p, q);
  const along = unit(sub(q, p));
  const outward = unit(sub(m, c));
  const pos = { x: m.x + outward.x * 16, y: m.y + outward.y * 16 };

  let a = Math.atan2(along.y, along.x);
  if (a > Math.PI / 2) a -= Math.PI;
  else if (a < -Math.PI / 2) a += Math.PI;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(a);
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = LABEL_MUTED;
  ctx.fillText(value.toFixed(1), 0, 0);
  ctx.restore();
}

/** One corner: a discreet arc + its live degree, which both snap to the done
 *  color the moment tracing arrives there. */
function drawAngle(i: number, k: number): void {
  const lesson = lessons[i];
  const v = lesson.verts[k];
  const p = lesson.verts[(k + 1) % 3];
  const q = lesson.verts[(k + 2) % 3];
  const toP = unit(sub(p, v));
  const toQ = unit(sub(q, v));
  const legMin = Math.min(dist(v, p), dist(v, q));
  const r = clamp(legMin * 0.22, 12, 26);
  const a1 = Math.atan2(toP.y, toP.x);
  let delta = Math.atan2(toQ.y, toQ.x) - a1;
  while (delta <= -Math.PI) delta += TWO_PI;
  while (delta > Math.PI) delta -= TWO_PI;

  const done = vertexDone(i, k);
  const color = done ? DONE : BASE_LINE;

  ctx.beginPath();
  ctx.arc(v.x, v.y, r, a1, a1 + delta, delta < 0);
  ctx.lineWidth = done ? 3 : 2;
  ctx.strokeStyle = color;
  ctx.stroke();

  const cosA = clamp(dot(toP, toQ), -1, 1);
  const degrees = (Math.acos(cosA) * 180) / Math.PI;
  const midAngle = a1 + delta / 2;
  const pos = { x: v.x + Math.cos(midAngle) * (r + 16), y: v.y + Math.sin(midAngle) * (r + 16) };
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = done ? DONE : LABEL_MUTED;
  ctx.fillText(`${Math.round(degrees)}°`, pos.x, pos.y);
}

/** The semiperimeter mark: a gold bar across the perimeter half of the way
 *  round from the start, labelled s on the outside. */
function drawHalfway(v: [Vec, Vec, Vec], c: Vec): void {
  const { at, along } = halfwayPoint(v);
  let n = { x: -along.y, y: along.x };
  if (dot(n, sub(at, c)) < 0) n = { x: -n.x, y: -n.y };
  ctx.beginPath();
  ctx.moveTo(at.x - n.x * 11, at.y - n.y * 11);
  ctx.lineTo(at.x + n.x * 11, at.y + n.y * 11);
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = HALF;
  ctx.stroke();

  ctx.font = "italic 700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = HALF;
  ctx.fillText("s", at.x + n.x * 24, at.y + n.y * 24);
}

function drawFlash(f: Flash): void {
  const p = clamp(f.age / FLASH_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(f.center.x, f.center.y, 8 + p * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - p) + 1;
  ctx.strokeStyle = rgba(f.color, 1 - p);
  ctx.stroke();
}

function drawKnob(v: Vec, active: boolean, done: boolean): void {
  const r = active ? 15 : 12;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, 0, TWO_PI);
  ctx.fillStyle = done ? rgba(DONE, 0.95) : "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = done ? rgba(DONE, 0.5) : "rgba(10,15,22,0.85)";
  ctx.stroke();
}

// --- formulas ----------------------------------------------------------------

function readouts(): Readout[] {
  return lessons.map((lesson, i) =>
    perimeterReadout({
      name: SIZE_NAME[i],
      sides: [sideLength(i, 0), sideLength(i, 1), sideLength(i, 2)],
      walked: lesson.sideIndex,
      halfway: lesson.halfway,
    }),
  );
}

// --- small helpers -------------------------------------------------------

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
    lesson.flashes = lesson.flashes.filter((f) => (f.age += dt) < FLASH_LIFE);
  }
  render();
  showFormulas(readouts());
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
