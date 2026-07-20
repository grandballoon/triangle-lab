// Parts · One — Perimeter & Semiperimeter (first, drag-driven implementation).
//
// Three static triangles of different sizes, each with sides and angles
// labeled discreetly (small, muted — the numbers matter, not the decoration).
// Each carries one knob, parked at a starting vertex. Drag it along the
// current side; the traveled portion fills in an accent color while the rest
// of that side stays dim. Reach the far vertex and the side "snaps" to its
// done color, the angle you just arrived at (the side's second endpoint)
// snaps too with a brief flash, and a running perimeter total appears in a
// small box tucked in that triangle's corner. Loop all the way back to the
// start and the semiperimeter s = p/2 joins it.
//
// Self-contained on purpose, matching equilateral.ts / isosceles.ts / scalene.ts
// — only the webcam device and this file's own little vector helpers are involved.

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

interface Flash {
  center: Vec;
  age: number; // seconds since it fired
}

interface Lesson {
  verts: [Vec, Vec, Vec];
  band: Band;
  sideIndex: number; // which side (0, 1, 2) is currently being traced; 3 = fully traced
  t: number; // progress along the current side, 0..1
  flashes: Flash[];
}

const ACCENT = "#60a5fa"; // header + the side currently being traced
const DONE = "#38d9a9"; // a completed side/angle, and its snap flash
const BASE_LINE = "rgba(233,240,247,0.28)"; // untraced side/angle — kept discreet
const LABEL_MUTED = "rgba(233,240,247,0.5)"; // side-length labels — kept discreet

const UNIT_PX = 40; // screen pixels per displayed length "unit"
const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64; // room for the header above the three bands

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
const ROTATION = [-0.15, 0.3, -0.45]; // radians — just enough to avoid looking cloned

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let grabbed: number | null = null;

const lessons: Lesson[] = [0, 1, 2].map(() => ({
  verts: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  band: { cx: 0, cy: 0, w: 0, h: 0 },
  sideIndex: 0,
  t: 0,
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

/** Sum of the sides already traced, fresh from the current geometry (so a
 *  mid-trace resize never leaves a stale total behind). */
function completedPerimeterPx(i: number): number {
  const lesson = lessons[i];
  const count = Math.min(lesson.sideIndex, 3);
  let sum = 0;
  for (let k = 0; k < count; k++) sum += dist(lesson.verts[k], lesson.verts[(k + 1) % 3]);
  return sum;
}

// --- layout ----------------------------------------------------------------

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const usableH = H - TOP_MARGIN;
  const columns = W >= H; // landscape-ish: side by side; else stacked

  for (let i = 0; i < 3; i++) {
    const band: Band = columns
      ? { cx: (W / 3) * (i + 0.5), cy: TOP_MARGIN + usableH / 2, w: W / 3, h: usableH }
      : { cx: W / 2, cy: TOP_MARGIN + (usableH / 3) * (i + 0.5), w: W, h: usableH / 3 };

    const scale = Math.min(band.w, band.h) * 0.17 * SIZE_FACTOR[i];
    const rot = ROTATION[i];
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const verts = SHAPE.map((o) => ({
      x: band.cx + (o.x * cosR - o.y * sinR) * scale,
      y: band.cy + (o.x * sinR + o.y * cosR) * scale,
    })) as [Vec, Vec, Vec];

    lessons[i].band = band;
    lessons[i].verts = verts;
  }
}

// --- interaction -------------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  let best = -1;
  let bestD = GRAB_RADIUS;
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
  canvas.setPointerCapture(e.pointerId);
  drive(best, p);
});

canvas.addEventListener("pointermove", (e) => {
  if (grabbed !== null) drive(grabbed, pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (grabbed === null) return;
  grabbed = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
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
  lesson.flashes.push({ center: { ...arrival }, age: 0 });
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();
  for (let i = 0; i < lessons.length; i++) renderLesson(i);
}

function renderLesson(i: number): void {
  const lesson = lessons[i];
  const v = lesson.verts;
  const c = centroid(v);

  drawBody(v);
  for (let s = 0; s < 3; s++) drawSide(i, s, c);
  for (let k = 0; k < 3; k++) drawAngle(i, k);
  for (const f of lesson.flashes) drawFlash(f);
  if (lesson.sideIndex < 3) drawKnob(knobPos(i), grabbed === i, false);
  else drawKnob(v[0], false, true);
  drawScoreBox(i);
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

  drawSideLabel(a, b, c, dist(a, b) / UNIT_PX);
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

function drawFlash(f: Flash): void {
  const p = clamp(f.age / FLASH_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(f.center.x, f.center.y, 8 + p * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - p) + 1;
  ctx.strokeStyle = rgba(DONE, 1 - p);
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

/** The running perimeter (and, once the figure closes, the semiperimeter),
 *  tucked in the corner of each triangle's own band. */
function drawScoreBox(i: number): void {
  const lesson = lessons[i];
  const b = lesson.band;
  const pUnits = completedPerimeterPx(i) / UNIT_PX;
  const complete = lesson.sideIndex >= 3;

  const x = b.cx - b.w / 2 + 16;
  const y = b.cy - b.h / 2 + 16;
  const w = 96;
  const h = complete ? 58 : 34;

  roundRect(x, y, w, h, 10);
  ctx.fillStyle = "rgba(10,15,22,0.55)";
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = complete ? DONE : ACCENT;
  ctx.fillText(`p = ${pUnits.toFixed(1)}`, x + 14, y + (complete ? h / 3 : h / 2));

  if (complete) {
    ctx.fillStyle = DONE;
    ctx.fillText(`s = ${(pUnits / 2).toFixed(1)}`, x + 14, y + (h * 2) / 3);
  }
}

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Perimeter & Semiperimeter", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText("drag the knob all the way around each triangle", W / 2, 48);
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
    lesson.flashes = lesson.flashes.filter((f) => (f.age += dt) < FLASH_LIFE);
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
