// Constraints · One — The Triangle Inequality.
//
// Six triangles. Click any side to select it: the side lights up, both of its
// endpoints grow knobs, and a dotted circle appears around each end — the
// locus that end can travel while the side keeps its length. Grab a knob and
// the side rotates rigidly about its other endpoint, the third side
// stretching or shrinking after it. Two small red dots on the active circle
// mark where the moving vertex crosses the line through the other two — the
// degenerate spots where one side exactly equals the sum (or difference) of
// the other two — and the pointer snaps onto them so exact equality is
// reachable. Side lengths live on the sides themselves, and a panel in the
// upper left shows a, b, c and all three inequalities as they tighten.
//
// Self-contained on purpose, matching perimeter.ts / medians.ts / etc. —
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
  center: Vec; // unit coords
  age: number; // seconds since it fired
}

interface Lesson {
  name: string;
  verts: [Vec, Vec, Vec]; // live vertex positions in unit coords, band-centered
  r0: number; // extent of the seed shape, in units — pins the on-screen scale
  band: Band;
  unitPx: number; // screen px per unit; lengths display as px / unitPx
  pulses: Pulse[];
}

const ACCENT = "#a3e635"; // header + the selected side and its circles
const CHANGING = "#facc15"; // the third side that stretches during a drag
const OK = "#38d9a9"; // an inequality with comfortable slack
const WARN = "#fbbf24"; // an inequality getting tight
const DANGER = "#ff6b6b"; // equality — the degenerate straight line
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64; // room for the header above the grid
const GRAB_RADIUS = 24; // screen px around an endpoint knob
const PICK_RADIUS = 15; // screen px around a side for click-to-select
const SNAP_ANG = 0.055; // rad — the drag snaps onto the degenerate spots
const DEGEN_EPS = 0.01; // slack (units) below which the triangle is a line
const TIGHT = 0.55; // slack (units) where the flattening warnings begin
const PULSE_LIFE = 0.6;

// Edge k joins verts[k] and verts[(k+1)%3]. Vertices are labeled A, B, C, so
// per the standard convention (a = BC, b = CA, c = AB) the edges read c, a, b.
const VERTEX_NAME = ["A", "B", "C"] as const;
const EDGE_NAME = ["c", "a", "b"] as const;

// Six seed triangles in unit coordinates (y down, centered at startup) —
// their coordinates ARE the displayed lengths, so the numbers read nicely.
const SEEDS: { name: string; verts: [Vec, Vec, Vec] }[] = [
  {
    name: "right 3·4·5",
    verts: [
      { x: -2, y: -1.5 },
      { x: 2, y: -1.5 },
      { x: -2, y: 1.5 },
    ],
  },
  {
    name: "equilateral",
    verts: [
      { x: -2, y: 1.155 },
      { x: 2, y: 1.155 },
      { x: 0, y: -2.309 },
    ],
  },
  {
    name: "isosceles 5·5·6",
    verts: [
      { x: -3, y: 1.6 },
      { x: 3, y: 1.6 },
      { x: 0, y: -2.4 },
    ],
  },
  {
    name: "obtuse",
    verts: [
      { x: -3.5, y: 1 },
      { x: 3.5, y: 1 },
      { x: -4.8, y: -1.2 },
    ],
  },
  {
    name: "nearly flat",
    verts: [
      { x: -4, y: 0.8 },
      { x: 4, y: 0.8 },
      { x: -0.5, y: -0.8 },
    ],
  },
  {
    name: "tall scalene",
    verts: [
      { x: -1.5, y: 2.5 },
      { x: 1.5, y: 2.5 },
      { x: 0.5, y: -2.5 },
    ],
  },
];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;

// The one selected side, page-wide; the panel reads from it.
let sel: { li: number; side: number } | null = null;
// A live drag: which end of the selected side is being swung.
let drag: { li: number; side: number; movEnd: 0 | 1; snapped: boolean } | null = null;

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

function centroidOf(v: [Vec, Vec, Vec]): Vec {
  return { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 };
}

/** Signed difference between two angles, folded into (−π, π]. */
function angleDiff(a: number, b: number): number {
  return ((a - b + Math.PI * 3) % TWO_PI) - Math.PI;
}

function pointSegDist(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-9) return dist(p, a);
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2, 0, 1);
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Length of edge k (in units — these are the numbers on screen). */
function edgeLen(l: Lesson, k: number): number {
  return dist(l.verts[k], l.verts[(k + 1) % 3]);
}

/** Slack of the inequality with edge k as the lone side: (sum of others) − k. */
function slackOf(l: Lesson, k: number): number {
  return edgeLen(l, (k + 1) % 3) + edgeLen(l, (k + 2) % 3) - edgeLen(l, k);
}

function minSlack(l: Lesson): number {
  return Math.min(slackOf(l, 0), slackOf(l, 1), slackOf(l, 2));
}

// --- lessons & layout ------------------------------------------------------

const lessons: Lesson[] = SEEDS.map((seed) => {
  const g = centroidOf(seed.verts);
  const verts = seed.verts.map((v) => sub(v, g)) as [Vec, Vec, Vec];
  const r0 = Math.max(...verts.map((v) => Math.hypot(v.x, v.y)));
  return { name: seed.name, verts, r0, band: { cx: 0, cy: 0, w: 0, h: 0 }, unitPx: 1, pulses: [] };
});

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const usableH = H - TOP_MARGIN;
  const cols = W >= H ? 3 : 2; // landscape-ish: 3×2; portrait: 2×3
  const rows = Math.ceil(lessons.length / cols);

  lessons.forEach((l, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    l.band = {
      cx: (W / cols) * (col + 0.5),
      cy: TOP_MARGIN + (usableH / rows) * (row + 0.5),
      w: W / cols,
      h: usableH / rows,
    };
    // Scale is pinned to the seed's extent, so a resize mid-exploration only
    // rescales — the shape the user has made survives.
    l.unitPx = (Math.min(l.band.w, l.band.h) * 0.23) / l.r0;
  });
}

const toScreen = (l: Lesson, p: Vec): Vec => ({
  x: l.band.cx + p.x * l.unitPx,
  y: l.band.cy + p.y * l.unitPx,
});
const toUnit = (l: Lesson, p: Vec): Vec => ({
  x: (p.x - l.band.cx) / l.unitPx,
  y: (p.y - l.band.cy) / l.unitPx,
});

// --- interaction -------------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);

  // A knob on the selected side gets first claim on the pointer.
  if (sel) {
    const l = lessons[sel.li];
    for (const end of [0, 1] as const) {
      const knob = toScreen(l, l.verts[(sel.side + end) % 3]);
      if (dist(p, knob) <= GRAB_RADIUS) {
        drag = { li: sel.li, side: sel.side, movEnd: end, snapped: false };
        canvas.classList.add("grabbing");
        canvas.setPointerCapture(e.pointerId);
        drive(p);
        return;
      }
    }
  }

  // Otherwise (re)select whichever side sits under the pointer; empty space
  // clears the selection.
  let best: { li: number; side: number } | null = null;
  let bestD = PICK_RADIUS;
  lessons.forEach((l, li) => {
    for (let k = 0; k < 3; k++) {
      const d = pointSegDist(p, toScreen(l, l.verts[k]), toScreen(l, l.verts[(k + 1) % 3]));
      if (d <= bestD) {
        bestD = d;
        best = { li, side: k };
      }
    }
  });
  sel = best;
});

canvas.addEventListener("pointermove", (e) => {
  if (drag) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  // The triangle stays wherever it was left — flat is a legitimate resting
  // place; that IS the lesson.
  drag = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Swing the grabbed end of the selected side around its other end. The side
 *  keeps its length — the free end rides the dotted circle — and the pointer
 *  snaps onto the two collinear spots so exact degeneracy is reachable. */
function drive(p: Vec): void {
  if (!drag) return;
  const l = lessons[drag.li];
  const movIdx = (drag.side + drag.movEnd) % 3;
  const pivIdx = (drag.side + 1 - drag.movEnd) % 3;
  const thirdIdx = (drag.side + 2) % 3;

  const pivot = l.verts[pivIdx];
  const radius = dist(pivot, l.verts[movIdx]);
  const aim = sub(toUnit(l, p), pivot);
  if (Math.hypot(aim.x, aim.y) < 1e-6) return;

  const axisAng = Math.atan2(l.verts[thirdIdx].y - pivot.y, l.verts[thirdIdx].x - pivot.x);
  let ang = Math.atan2(aim.y, aim.x);
  let snapped = false;
  const off = angleDiff(ang, axisAng);
  if (Math.abs(off) <= SNAP_ANG) {
    ang = axisAng; // moving vertex between/beyond the third: difference case
    snapped = true;
  } else if (Math.abs(Math.abs(off) - Math.PI) <= SNAP_ANG) {
    ang = axisAng + Math.PI; // moving vertex swung fully away: sum case
    snapped = true;
  }

  l.verts[movIdx] = add(pivot, { x: Math.cos(ang) * radius, y: Math.sin(ang) * radius });
  if (snapped && !drag.snapped) {
    l.pulses.push({ center: { ...l.verts[movIdx] }, age: 0 });
  }
  drag.snapped = snapped;
}

// --- rendering ---------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();
  lessons.forEach((l, li) => renderLesson(l, li));
  drawPanel(); // last, so it reads over anything swung underneath it
}

function renderLesson(l: Lesson, li: number): void {
  const v = l.verts;
  const s = v.map((p) => toScreen(l, p));
  const selectedHere = sel !== null && sel.li === li;
  const draggingHere = drag !== null && drag.li === li;
  const slack = minSlack(l);

  // The dotted circles — the heart of the visualization — go under the body.
  if (selectedHere && sel) drawCircles(l, sel.side, draggingHere ? drag : null);

  drawBody(s);

  // The side that stretches during a drag: the one joining the moving vertex
  // to the third vertex.
  const changingEdge = draggingHere && drag ? (drag.side + 2 - drag.movEnd) % 3 : -1;

  for (let k = 0; k < 3; k++) {
    const a = s[k];
    const b = s[(k + 1) % 3];
    if (selectedHere && sel && k === sel.side) {
      strokeSegment(a, b, ACCENT, 4);
    } else if (k === changingEdge) {
      strokeSegment(a, b, CHANGING, 4);
    } else {
      strokeSegment(a, b, flattenTint(slack), 3);
    }
  }

  drawSideLabels(l, s, selectedHere ? sel : null, changingEdge);
  drawVertexLabels(s);

  if (selectedHere && sel) {
    for (const end of [0, 1] as const) {
      const idx = (sel.side + end) % 3;
      const active = draggingHere && drag !== null && drag.movEnd === end;
      drawKnob(s[idx], active);
    }
  }

  for (const p of l.pulses) drawPulse(l, p);
  drawCaption(l, slack);
}

/** Idle selection: a faint dashed circle around each end of the side — either
 *  end may swing on it. Mid-drag: only the pivot's circle, brighter, with two
 *  red dots where the swing crosses the line through pivot and third vertex —
 *  the degenerate spots. */
function drawCircles(l: Lesson, side: number, d: { movEnd: 0 | 1 } | null): void {
  const e0 = side;
  const e1 = (side + 1) % 3;
  const r = edgeLen(l, side) * l.unitPx;

  if (d === null) {
    dashCircle(toScreen(l, l.verts[e0]), r, rgba(ACCENT, 0.3));
    dashCircle(toScreen(l, l.verts[e1]), r, rgba(ACCENT, 0.3));
    return;
  }

  const pivIdx = (side + 1 - d.movEnd) % 3;
  const thirdIdx = (side + 2) % 3;
  const pivot = l.verts[pivIdx];
  dashCircle(toScreen(l, pivot), r, rgba(ACCENT, 0.75));

  const axis = unit(sub(l.verts[thirdIdx], pivot));
  const radiusU = edgeLen(l, side);
  for (const sign of [1, -1]) {
    const spot = toScreen(l, add(pivot, scale(axis, radiusU * sign)));
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 3.5, 0, TWO_PI);
    ctx.fillStyle = DANGER;
    ctx.fill();
  }
}

function dashCircle(c: Vec, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, TWO_PI);
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBody(s: Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  ctx.lineTo(s[1].x, s[1].y);
  ctx.lineTo(s[2].x, s[2].y);
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

/** "name = length" at each side's midpoint, nudged outward from the centroid. */
function drawSideLabels(
  l: Lesson,
  s: Vec[],
  selHere: { side: number } | null,
  changingEdge: number,
): void {
  const g = toScreen(l, centroidOf(l.verts));
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let k = 0; k < 3; k++) {
    const m = mid(s[k], s[(k + 1) % 3]);
    const out = unit(sub(m, g));
    const at = add(m, scale(out, 18));
    ctx.fillStyle =
      selHere && k === selHere.side ? ACCENT : k === changingEdge ? CHANGING : TEXT_DIM;
    ctx.fillText(`${EDGE_NAME[k]} = ${edgeLen(l, k).toFixed(1)}`, at.x, at.y);
  }
}

function drawVertexLabels(s: Vec[]): void {
  const g = { x: (s[0].x + s[1].x + s[2].x) / 3, y: (s[0].y + s[1].y + s[2].y) / 3 };
  ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(233,240,247,0.45)";
  for (let k = 0; k < 3; k++) {
    const at = add(s[k], scale(unit(sub(s[k], g)), 24));
    ctx.fillText(VERTEX_NAME[k], at.x, at.y);
  }
}

function drawKnob(v: Vec, active: boolean): void {
  ctx.beginPath();
  ctx.arc(v.x, v.y, active ? 15 : 11, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawPulse(l: Lesson, p: Pulse): void {
  const c = toScreen(l, p.center);
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(c.x, c.y, 8 + t * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(DANGER, 1 - t);
  ctx.stroke();
}

/** The triangle's name under its band — and its state when it is flattening. */
function drawCaption(l: Lesson, slack: number): void {
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const y = l.band.cy + l.band.h / 2 - 10;
  if (slack <= DEGEN_EPS) {
    ctx.fillStyle = DANGER;
    ctx.fillText(`${l.name} — degenerate: a straight line`, l.band.cx, y);
  } else if (slack < TIGHT) {
    ctx.fillStyle = WARN;
    ctx.fillText(`${l.name} — almost flat`, l.band.cx, y);
  } else {
    ctx.fillStyle = "rgba(233,240,247,0.35)";
    ctx.fillText(l.name, l.band.cx, y);
  }
}

/** Idle sides blush toward red as the triangle's tightest inequality closes. */
function flattenTint(slack: number): string {
  const t = clamp(1 - slack / TIGHT, 0, 1);
  const r = Math.round(233 + (255 - 233) * t);
  const g = Math.round(240 + (107 - 240) * t);
  const b = Math.round(247 + (107 - 247) * t);
  return `rgba(${r}, ${g}, ${b}, ${0.28 + 0.5 * t})`;
}

// --- the readout panel -------------------------------------------------------

const PANEL_X = 18;
const PANEL_Y = 64; // just under the back link
const PANEL_W = 258;
const PANEL_PAD = 12;
const MONO = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "500 12px ui-sans-serif, system-ui, sans-serif";

function drawPanel(): void {
  const h = sel ? 168 : 64;
  ctx.beginPath();
  ctx.roundRect(PANEL_X, PANEL_Y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.6)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = PANEL_Y + PANEL_PAD + 11;

  if (!sel) {
    ctx.font = SANS;
    ctx.fillStyle = TEXT;
    ctx.fillText("Click any side to select it,", PANEL_X + PANEL_PAD, y);
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText("then swing one of its round ends.", PANEL_X + PANEL_PAD, y + 18);
    return;
  }

  const l = lessons[sel.li];

  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText(`△ ${sel.li + 1} · ${l.name}`, PANEL_X + PANEL_PAD, y);
  y += 17;
  ctx.font = SANS;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText(`side ${EDGE_NAME[sel.side]} selected — grab an end`, PANEL_X + PANEL_PAD, y);
  y += 24;

  // a, b, c across one row, each colored by its role. Edges (c, a, b) are
  // shown in letter order a, b, c — edge indices 1, 2, 0.
  const changingEdge = drag !== null ? (drag.side + 2 - drag.movEnd) % 3 : -1;
  const colW = (PANEL_W - PANEL_PAD * 2) / 3;
  ctx.font = MONO;
  [1, 2, 0].forEach((k, col) => {
    ctx.fillStyle = k === sel!.side ? ACCENT : k === changingEdge ? CHANGING : TEXT;
    ctx.fillText(
      `${EDGE_NAME[k]} = ${edgeLen(l, k).toFixed(2)}`,
      PANEL_X + PANEL_PAD + colW * col,
      y,
    );
  });
  y += 22;

  // The three inequalities, live. Rows are (pair) vs (third edge index).
  const rows: { label: [number, number]; third: number }[] = [
    { label: [1, 0], third: 2 }, // a + c ? b
    { label: [2, 0], third: 1 }, // b + c ? a
    { label: [1, 2], third: 0 }, // a + b ? c
  ];
  for (const row of rows) {
    const sum = edgeLen(l, row.label[0]) + edgeLen(l, row.label[1]);
    const third = edgeLen(l, row.third);
    const slack = sum - third;
    const sym = slack <= DEGEN_EPS ? "=" : ">";
    const color = slack <= DEGEN_EPS ? DANGER : slack < TIGHT ? WARN : OK;
    ctx.font = MONO;
    ctx.fillStyle = color;
    ctx.fillText(
      `${EDGE_NAME[row.label[0]]} + ${EDGE_NAME[row.label[1]]} ${sym} ${EDGE_NAME[row.third]}`,
      PANEL_X + PANEL_PAD,
      y,
    );
    ctx.textAlign = "right";
    ctx.fillText(`${sum.toFixed(2)} ${sym} ${third.toFixed(2)}`, PANEL_X + PANEL_W - PANEL_PAD, y);
    ctx.textAlign = "left";
    y += 17;
  }
  y += 6;

  const slack = minSlack(l);
  ctx.font = SANS;
  if (slack <= DEGEN_EPS) {
    ctx.fillStyle = DANGER;
    ctx.fillText("degenerate — a straight line, not a triangle", PANEL_X + PANEL_PAD, y);
  } else if (slack < TIGHT) {
    ctx.fillStyle = WARN;
    ctx.fillText("nearly flat — one sum is barely winning", PANEL_X + PANEL_PAD, y);
  } else {
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText("a real triangle — every sum wins", PANEL_X + PANEL_PAD, y);
  }
}

// --- shared strokes & helpers ----------------------------------------------

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
  ctx.fillText("The Triangle Inequality", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "click a side, then swing an end around its dotted circle — how far can the third side stretch?",
    W / 2,
    48,
  );
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
  for (const l of lessons) {
    l.pulses = l.pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
