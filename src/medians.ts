// Parts · Two — Medians (first, drag-driven implementation).
//
// Three static triangles. On each, every vertex sprouts a short stub pointing
// outward, carrying a knob. Grab a knob and pull it across the triangle toward
// the midpoint of the opposite side — the segment follows your hand in any
// direction, but its length is capped at 130% of the finished median, so it
// can never stretch off into nowhere. Bring the free end onto that midpoint and
// it pulses once and locks along the true median. Lock all three and the point
// where they cross — the centroid G — lights up as an enlarged dot and pulses
// three times.
//
// Self-contained on purpose, matching perimeter.ts / equilateral.ts / etc. —
// only the webcam device and this file's own little vector helpers are involved.

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

interface Median {
  vertex: number; // index (0,1,2) of the vertex this median springs from
  locked: boolean; // true once its free end has reached the opposite midpoint
  drag: Vec | null; // live free-end while being pulled; null when idle (parked on the stub)
}

interface Lesson {
  verts: [Vec, Vec, Vec];
  band: Band;
  medians: [Median, Median, Median];
  pulses: Pulse[];
  // Centroid celebration: -1 = not yet triggered; otherwise seconds elapsed
  // since all three medians locked, used to stagger three brief pulses.
  celebrateAge: number;
  celebrateFired: number; // how many of the three celebration pulses have spawned
}

const ACCENT = "#c084fc"; // header + a median currently being pulled
const DONE = "#38d9a9"; // a locked median, the centroid, and their pulses
const STUB = "rgba(192,132,252,0.55)"; // the idle outward stub — visibly grabbable, still discreet
const BASE_LINE = "rgba(233,240,247,0.28)"; // triangle sides + midpoint targets, kept discreet
const G_TEXT = "rgba(233,240,247,0.85)";

const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64; // room for the header above the three bands

const STUB_LEN = 26; // length of the outward starting stub, in screen px
const LENGTH_CAP = 1.3; // free end can reach at most 130% of the finished median
const SNAP_RADIUS = 22; // free end this close to the midpoint counts as "arrived"
const PULSE_LIFE = 0.6;
const CELEBRATE_GAP = 0.22; // seconds between the three centroid pulses

// One lopsided triangle "shape" (a decisively unequal 1 : 1.6 : 2.1 proportion),
// reused at three scales and rotations so the three medians read differently —
// the same seed the perimeter demo uses, for family resemblance.
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
// Which median is being dragged, as [lessonIndex, medianIndex].
let grabbed: [number, number] | null = null;

const lessons: Lesson[] = [0, 1, 2].map(() => ({
  verts: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  band: { cx: 0, cy: 0, w: 0, h: 0 },
  medians: [0, 1, 2].map((vertex) => ({ vertex, locked: false, drag: null })) as [
    Median,
    Median,
    Median,
  ],
  pulses: [],
  celebrateAge: -1,
  celebrateFired: 0,
}));

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: Vec, q: Vec): Vec => ({ x: p.x + q.x, y: p.y + q.y });
const scale = (p: Vec, s: number): Vec => ({ x: p.x * s, y: p.y * s });
const mid = (p: Vec, q: Vec): Vec => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

function unit(p: Vec): Vec {
  const l = Math.hypot(p.x, p.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

function centroid(v: [Vec, Vec, Vec]): Vec {
  return { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 };
}

/** Midpoint of the side opposite vertex `k` — the target that median aims for. */
function oppositeMidpoint(v: [Vec, Vec, Vec], k: number): Vec {
  return mid(v[(k + 1) % 3], v[(k + 2) % 3]);
}

/** Outward direction at vertex `k` — away from the opposite midpoint, i.e. the
 *  reverse of the median. The idle stub points this way. */
function outward(v: [Vec, Vec, Vec], k: number): Vec {
  return unit(sub(v[k], oppositeMidpoint(v, k)));
}

/** Where a median's free end (its knob) currently sits: parked on the outward
 *  stub when idle, on the opposite midpoint once locked, or wherever the drag
 *  has pulled it in between. */
function knobPos(lesson: Lesson, m: Median): Vec {
  const v = lesson.verts;
  if (m.locked) return oppositeMidpoint(v, m.vertex);
  if (m.drag) return m.drag;
  return add(v[m.vertex], scale(outward(v, m.vertex), STUB_LEN));
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
  let best: [number, number] | null = null;
  let bestD = GRAB_RADIUS;
  for (let i = 0; i < lessons.length; i++) {
    for (let k = 0; k < 3; k++) {
      const m = lessons[i].medians[k];
      if (m.locked) continue;
      const d = dist(p, knobPos(lessons[i], m));
      if (d <= bestD) {
        bestD = d;
        best = [i, k];
      }
    }
  }
  if (!best) return;
  grabbed = best;
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  drive(best, p);
});

canvas.addEventListener("pointermove", (e) => {
  if (grabbed) drive(grabbed, pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!grabbed) return;
  // Let go before reaching the midpoint and the segment springs back to its
  // outward stub — a median is only ever idle, mid-pull, or locked.
  const m = lessons[grabbed[0]].medians[grabbed[1]];
  if (!m.locked) m.drag = null;
  grabbed = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Follow the pointer with the free end, capped at 130% of the finished median,
 *  and lock onto the opposite midpoint the instant the end reaches it. */
function drive([i, k]: [number, number], p: Vec): void {
  const lesson = lessons[i];
  const m = lesson.medians[k];
  if (m.locked) return;

  const v = lesson.verts[m.vertex];
  const target = oppositeMidpoint(lesson.verts, m.vertex);
  const maxLen = dist(v, target) * LENGTH_CAP;

  const reach = sub(p, v);
  const len = Math.hypot(reach.x, reach.y);
  const end = len > maxLen ? add(v, scale(unit(reach), maxLen)) : { x: p.x, y: p.y };

  if (dist(end, target) <= SNAP_RADIUS) {
    lockMedian(lesson, m);
  } else {
    m.drag = end;
  }
}

function lockMedian(lesson: Lesson, m: Median): void {
  m.locked = true;
  m.drag = null;
  lesson.pulses.push({ center: oppositeMidpoint(lesson.verts, m.vertex), age: 0 });
  // The moment the third median locks, arm the centroid celebration.
  if (lesson.celebrateAge < 0 && lesson.medians.every((x) => x.locked)) {
    lesson.celebrateAge = 0;
  }
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();
  for (const lesson of lessons) renderLesson(lesson);
}

function renderLesson(lesson: Lesson): void {
  const v = lesson.verts;
  drawBody(v);
  for (let s = 0; s < 3; s++) {
    drawSide(v[s], v[(s + 1) % 3]);
  }
  // Target rings first, so the median lines draw over them.
  for (const m of lesson.medians) {
    if (!m.locked) drawTarget(oppositeMidpoint(v, m.vertex));
  }
  for (const m of lesson.medians) drawMedian(lesson, m);
  for (const p of lesson.pulses) drawPulse(p);
  if (lesson.medians.every((m) => m.locked)) drawCentroid(v);
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

/** A faint hollow ring marking the opposite midpoint a median is aiming for. */
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

/** One median: a dim outward stub when idle, the accent line while pulled, the
 *  done color once locked — plus the knob at its free end. */
function drawMedian(lesson: Lesson, m: Median): void {
  const start = lesson.verts[m.vertex];
  const end = knobPos(lesson, m);
  const dragging =
    grabbed !== null && grabbed[0] === lessons.indexOf(lesson) && grabbed[1] === m.vertex;

  if (m.locked) {
    strokeSegment(start, end, DONE, 4);
  } else if (m.drag) {
    strokeSegment(start, end, ACCENT, 5);
  } else {
    strokeSegment(start, end, STUB, 3);
  }

  drawKnob(end, m.locked, dragging);
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

/** The centroid G, once all three medians meet: an enlarged done-colored dot
 *  with its label. Its three celebratory pulses ride the shared pulse list. */
function drawCentroid(v: [Vec, Vec, Vec]): void {
  const g = centroid(v);
  ctx.beginPath();
  ctx.arc(g.x, g.y, 8, 0, TWO_PI);
  ctx.fillStyle = rgba(DONE, 0.98);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();

  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = G_TEXT;
  ctx.fillText("G", g.x + 13, g.y - 12);
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

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Medians", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText("pull each knob to the midpoint of the opposite side", W / 2, 48);
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
    // Stagger the three centroid pulses once the celebration is armed.
    if (lesson.celebrateAge >= 0) {
      lesson.celebrateAge += dt;
      while (
        lesson.celebrateFired < 3 &&
        lesson.celebrateAge >= lesson.celebrateFired * CELEBRATE_GAP
      ) {
        lesson.pulses.push({ center: centroid(lesson.verts), age: 0 });
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
