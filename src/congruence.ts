// Matching · One — Congruent Triangles: which measurements pin a triangle down?
//
// Four cells — SSS, SAS, ASA, and SSA — each with the same fixed base AB and
// a free knob for the third vertex C. The given measurements are drawn as
// dashed loci: a given side is a dashed circle around its endpoint, a given
// angle a dashed ray out of its vertex. Drag C anywhere; a checklist compares
// each live measurement against its given and ticks when it matches. C can
// only satisfy everything where the loci cross, and the knob snaps onto those
// spots. SSS / SAS / ASA cross at ONE spot (SSS also shows the mirror across
// AB — the same triangle, flipped): the data force one triangle. SSA is the
// warning: its ray and circle cross TWICE, and when C lands on either spot
// the other triangle stays as a ghost — same givens, different triangle.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
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
  age: number;
}

type VertexName = "A" | "B";

/** One given measurement: a side out of a vertex, or an angle at a vertex. */
interface Given {
  kind: "side" | "angle";
  at: VertexName;
  value: number; // units for sides, degrees for angles
  label: string;
}

interface Cell {
  key: "SSS" | "SAS" | "ASA" | "SSA";
  subtitle: string;
  givens: Given[];
  solutions: Vec[]; // where every given checks out
  twoTriangles: boolean; // SSA: the two spots are genuinely different triangles
  allowBelow: boolean; // SSS shows the mirror half-plane too
  knob: Vec; // C, live, in unit coords
  snappedTo: number; // index into solutions, or -1
  extent: { x0: number; x1: number; y0: number; y1: number };
  band: Band;
  unitPx: number;
  pulses: Pulse[];
}

const ACCENT = "#f97316"; // header + selected accents
const OK = "#38d9a9"; // a satisfied given / a pinned triangle
const DANGER = "#ff6b6b"; // the SSA verdict
const LOCUS = "#fbbf24"; // dashed loci of the givens
const EDGE = "#eef4fb";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const SNAP_PX = 20; // magnetic radius around a solution spot, screen px
const SIDE_TOL = 0.07; // units — when a measured side "matches" its given
const ANGLE_TOL = 1.6; // degrees
const PULSE_LIFE = 0.6;

// The shared base: every cell pins A and B (so side AB is a given everywhere).
const A: Vec = { x: -2, y: 1.4 };
const B: Vec = { x: 2, y: 1.4 };

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let drag: Cell | null = null;

// --- vector helpers --------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Interior angle at `v` of triangle v-p-q, in degrees. */
function angleAt(v: Vec, p: Vec, q: Vec): number {
  const a1 = Math.atan2(p.y - v.y, p.x - v.x);
  const a2 = Math.atan2(q.y - v.y, q.x - v.x);
  let d = Math.abs(a1 - a2);
  if (d > Math.PI) d = TWO_PI - d;
  return d / DEG;
}

const vertex = (name: VertexName): Vec => (name === "A" ? A : B);

/** Direction of the dashed angle-ray out of a vertex (interior, above AB). */
function rayDir(at: VertexName, degrees: number): Vec {
  const t = degrees * DEG;
  return at === "A" ? { x: Math.cos(t), y: -Math.sin(t) } : { x: -Math.cos(t), y: -Math.sin(t) };
}

// --- the four cells --------------------------------------------------------

// Shared target triangle for SSS / SAS / ASA: ∠A = 40°, AC = 3 off the same
// base, so the three cells pin the very same triangle three different ways.
const ALPHA = 40;
const SIDE_B = 3; // AC
const TARGET: Vec = {
  x: A.x + SIDE_B * Math.cos(ALPHA * DEG),
  y: A.y - SIDE_B * Math.sin(ALPHA * DEG),
};
const SIDE_A = dist(B, TARGET); // BC ≈ 2.57
const BETA = angleAt(B, A, TARGET); // ≈ 48.6°

// SSA's own numbers, chosen so the circle crosses the ray twice, cleanly.
const SSA_ALPHA = 35;
const SSA_SIDE_A = 3; // BC, the side NOT touching the given angle
function ssaSolutions(): Vec[] {
  const along = 4 * Math.cos(SSA_ALPHA * DEG); // |AB| = 4
  const drop = 4 * Math.sin(SSA_ALPHA * DEG);
  const spread = Math.sqrt(SSA_SIDE_A * SSA_SIDE_A - drop * drop);
  const dir = rayDir("A", SSA_ALPHA);
  return [along - spread, along + spread].map((d) => ({
    x: A.x + dir.x * d,
    y: A.y + dir.y * d,
  }));
}

const cells: Cell[] = [
  {
    key: "SSS",
    subtitle: "given AB, AC, BC",
    givens: [
      { kind: "side", at: "A", value: SIDE_B, label: "AC" },
      { kind: "side", at: "B", value: SIDE_A, label: "BC" },
    ],
    solutions: [TARGET, { x: TARGET.x, y: 2 * A.y - TARGET.y }],
    twoTriangles: false,
    allowBelow: true,
    knob: { x: 1.2, y: -0.4 },
    snappedTo: -1,
    extent: { x0: -3.4, x1: 3.4, y0: -1.6, y1: 4.4 },
    band: { cx: 0, cy: 0, w: 0, h: 0 },
    unitPx: 1,
    pulses: [],
  },
  {
    key: "SAS",
    subtitle: "given AB, ∠A, AC",
    givens: [
      { kind: "angle", at: "A", value: ALPHA, label: "∠A" },
      { kind: "side", at: "A", value: SIDE_B, label: "AC" },
    ],
    solutions: [TARGET],
    twoTriangles: false,
    allowBelow: false,
    knob: { x: 1.0, y: -1.3 },
    snappedTo: -1,
    extent: { x0: -3.4, x1: 3.4, y0: -2.6, y1: 2.2 },
    band: { cx: 0, cy: 0, w: 0, h: 0 },
    unitPx: 1,
    pulses: [],
  },
  {
    key: "ASA",
    subtitle: "given ∠A, AB, ∠B",
    givens: [
      { kind: "angle", at: "A", value: ALPHA, label: "∠A" },
      { kind: "angle", at: "B", value: BETA, label: "∠B" },
    ],
    solutions: [TARGET],
    twoTriangles: false,
    allowBelow: false,
    knob: { x: -1.2, y: -1.1 },
    snappedTo: -1,
    extent: { x0: -3.4, x1: 3.4, y0: -2.6, y1: 2.2 },
    band: { cx: 0, cy: 0, w: 0, h: 0 },
    unitPx: 1,
    pulses: [],
  },
  {
    key: "SSA",
    subtitle: "given AB, ∠A, BC — the warning",
    givens: [
      { kind: "angle", at: "A", value: SSA_ALPHA, label: "∠A" },
      { kind: "side", at: "B", value: SSA_SIDE_A, label: "BC" },
    ],
    solutions: ssaSolutions(),
    twoTriangles: true,
    allowBelow: false,
    knob: { x: 0.2, y: -1.6 },
    snappedTo: -1,
    extent: { x0: -3.4, x1: 3.4, y0: -2.6, y1: 2.2 },
    band: { cx: 0, cy: 0, w: 0, h: 0 },
    unitPx: 1,
    pulses: [],
  },
];

// --- layout ----------------------------------------------------------------

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const usableH = H - TOP_MARGIN;
  const cols = W >= H ? 2 : 1;
  const rows = Math.ceil(cells.length / cols);

  cells.forEach((cell, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cell.band = {
      cx: (W / cols) * (col + 0.5),
      cy: TOP_MARGIN + (usableH / rows) * (row + 0.5),
      w: W / cols,
      h: usableH / rows,
    };
    const ex = cell.extent;
    cell.unitPx = Math.min(
      (cell.band.w * 0.92) / (ex.x1 - ex.x0),
      (cell.band.h * 0.86) / (ex.y1 - ex.y0),
    );
  });
}

function toScreen(cell: Cell, p: Vec): Vec {
  const ex = cell.extent;
  return {
    x: cell.band.cx + (p.x - (ex.x0 + ex.x1) / 2) * cell.unitPx,
    y: cell.band.cy + (p.y - (ex.y0 + ex.y1) / 2) * cell.unitPx,
  };
}

function toUnit(cell: Cell, p: Vec): Vec {
  const ex = cell.extent;
  return {
    x: (p.x - cell.band.cx) / cell.unitPx + (ex.x0 + ex.x1) / 2,
    y: (p.y - cell.band.cy) / cell.unitPx + (ex.y0 + ex.y1) / 2,
  };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  for (const cell of cells) {
    if (dist(p, toScreen(cell, cell.knob)) <= GRAB_RADIUS) {
      drag = cell;
      canvas.classList.add("grabbing");
      canvas.setPointerCapture(e.pointerId);
      drive(p);
      return;
    }
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (drag) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  drag = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function drive(p: Vec): void {
  if (!drag) return;
  const cell = drag;
  const ex = cell.extent;
  const u = toUnit(cell, p);
  u.x = clamp(u.x, ex.x0 + 0.2, ex.x1 - 0.2);
  const yMax = cell.allowBelow ? ex.y1 - 0.2 : A.y - 0.25; // keep C off the base line
  u.y = clamp(u.y, ex.y0 + 0.2, yMax);

  // Magnetic snap onto any solution spot.
  let snapped = -1;
  for (let i = 0; i < cell.solutions.length; i++) {
    if (dist(toScreen(cell, u), toScreen(cell, cell.solutions[i])) <= SNAP_PX) {
      snapped = i;
      break;
    }
  }
  if (snapped >= 0) {
    cell.knob = { ...cell.solutions[snapped] };
    if (cell.snappedTo !== snapped) {
      cell.pulses.push({ center: { ...cell.knob }, age: 0 });
    }
  } else {
    cell.knob = u;
  }
  cell.snappedTo = snapped;
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();
  for (const cell of cells) renderCell(cell);
}

function renderCell(cell: Cell): void {
  const sA = toScreen(cell, A);
  const sB = toScreen(cell, B);
  const sC = toScreen(cell, cell.knob);
  const pinned = cell.snappedTo >= 0;
  const verdictColor = cell.twoTriangles ? DANGER : OK;

  // Dashed loci of the givens, under everything.
  for (const g of cell.givens) {
    const v = vertex(g.at);
    if (g.kind === "side") {
      dashCircle(toScreen(cell, v), g.value * cell.unitPx, rgba(LOCUS, 0.5));
    } else {
      const d = rayDir(g.at, g.value);
      const far = toScreen(cell, { x: v.x + d.x * 8, y: v.y + d.y * 8 });
      dashLine(toScreen(cell, v), far, rgba(LOCUS, 0.5));
      drawAngleArc(cell, v, d, g.value);
    }
  }

  // Solution spots (only the crossing points of the loci).
  cell.solutions.forEach((sol, i) => {
    const s = toScreen(cell, sol);
    ctx.beginPath();
    ctx.arc(s.x, s.y, cell.snappedTo === i ? 6 : 4.5, 0, TWO_PI);
    ctx.fillStyle = cell.twoTriangles ? DANGER : rgba(OK, 0.9);
    ctx.fill();
  });

  // The mirror (SSS) or the second triangle (SSA), as a ghost, once pinned.
  if (pinned && cell.solutions.length > 1) {
    const other = cell.solutions[1 - cell.snappedTo];
    if (other) {
      const sO = toScreen(cell, other);
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(sA.x, sA.y);
      ctx.lineTo(sO.x, sO.y);
      ctx.lineTo(sB.x, sB.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(cell.twoTriangles ? DANGER : EDGE, 0.55);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = rgba(cell.twoTriangles ? DANGER : EDGE, 0.7);
      ctx.fillText(
        cell.twoTriangles ? "…and this one fits too" : "the mirror — same triangle, flipped",
        sO.x,
        sO.y + (other.y > A.y ? 22 : -14),
      );
    }
  }

  // The base AB (always given) and the two live sides to C.
  strokeSegment(sA, sB, EDGE, 4);
  const sideColor = pinned ? verdictColor : "rgba(233,240,247,0.6)";
  strokeSegment(sA, sC, sideColor, pinned ? 4 : 2.5);
  strokeSegment(sB, sC, sideColor, pinned ? 4 : 2.5);
  if (pinned) {
    ctx.beginPath();
    ctx.moveTo(sA.x, sA.y);
    ctx.lineTo(sB.x, sB.y);
    ctx.lineTo(sC.x, sC.y);
    ctx.closePath();
    ctx.fillStyle = rgba(verdictColor, 0.16);
    ctx.fill();
  }

  // Vertex labels.
  ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText("A", sA.x - 14, sA.y + 12);
  ctx.fillText("B", sB.x + 14, sB.y + 12);
  ctx.fillText("C", sC.x + 16, sC.y - 10);

  drawChecklist(cell);
  drawCellCaption(cell, pinned);

  for (const p of cell.pulses) {
    const c = toScreen(cell, p.center);
    const t = clamp(p.age / PULSE_LIFE, 0, 1);
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8 + t * 40, 0, TWO_PI);
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.strokeStyle = rgba(cell.twoTriangles ? DANGER : OK, 1 - t);
    ctx.stroke();
  }

  drawKnob(sC, drag === cell, pinned ? verdictColor : null);
}

/** The live checklist: every given, measured right now, ticked when matched. */
function drawChecklist(cell: Cell): void {
  const x = cell.band.cx - cell.band.w / 2 + 14;
  let y = cell.band.cy - cell.band.h / 2 + 30;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = cell.twoTriangles ? DANGER : ACCENT;
  ctx.fillText(cell.key, x, y);
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText(cell.subtitle, x + ctx.measureText(cell.key).width + 26, y);
  y += 18;

  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("AB 4.00 ✓", x, y); // the base is fixed, so it always checks
  y += 16;

  for (const g of cell.givens) {
    const v = vertex(g.at);
    let measured: number;
    let ok: boolean;
    if (g.kind === "side") {
      measured = dist(cell.knob, v);
      ok = Math.abs(measured - g.value) <= SIDE_TOL;
    } else {
      measured = angleAt(v, vertex(g.at === "A" ? "B" : "A"), cell.knob);
      ok = Math.abs(measured - g.value) <= ANGLE_TOL;
    }
    const want = g.kind === "side" ? g.value.toFixed(2) : `${g.value.toFixed(0)}°`;
    const got = g.kind === "side" ? measured.toFixed(2) : `${measured.toFixed(0)}°`;
    ctx.fillStyle = ok ? OK : TEXT_DIM;
    ctx.fillText(`${g.label} ${got} / ${want} ${ok ? "✓" : "·"}`, x, y);
    y += 16;
  }
}

function drawCellCaption(cell: Cell, pinned: boolean): void {
  const y = cell.band.cy + cell.band.h / 2 - 12;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (!pinned) {
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText(
      cell.twoTriangles
        ? "drag C onto a crossing — how many are there?"
        : "drag C until every given checks out",
      cell.band.cx,
      y,
    );
  } else if (cell.twoTriangles) {
    ctx.fillStyle = DANGER;
    ctx.fillText("same givens, two DIFFERENT triangles — there is no SSA", cell.band.cx, y);
  } else {
    ctx.fillStyle = OK;
    ctx.fillText(`pinned — ${cell.key} forces this one triangle`, cell.band.cx, y);
  }
}

/** Small arc + label showing a given angle at its vertex. */
function drawAngleArc(cell: Cell, v: Vec, _dir: Vec, degrees: number): void {
  const s = toScreen(cell, v);
  const r = 0.62 * cell.unitPx;
  // Interior sweep, in canvas angles (y down): at A the angle opens from the
  // base (0) up to −θ; at B from the base (π) on to π + θ.
  const atA = v.x === A.x;
  const start = atA ? -degrees * DEG : Math.PI;
  const end = atA ? 0 : Math.PI + degrees * DEG;
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, start, end);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(LOCUS, 0.8);
  ctx.stroke();
  const mid = (start + end) / 2;
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = LOCUS;
  ctx.fillText(`${degrees.toFixed(0)}°`, s.x + Math.cos(mid) * (r + 16), s.y + Math.sin(mid) * (r + 12));
}

// --- shared strokes & chrome ----------------------------------------------

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

function dashCircle(c: Vec, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, TWO_PI);
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

function dashLine(p: Vec, q: Vec, color: string): void {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawKnob(v: Vec, active: boolean, ring: string | null): void {
  ctx.beginPath();
  ctx.arc(v.x, v.y, active ? 14 : 11, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ring ?? "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Congruent Triangles", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "a congruence theorem is a set of givens that leaves C only one place to land — drag each C and see which sets do",
    W / 2,
    48,
  );
}

// --- loop ------------------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  for (const cell of cells) {
    cell.pulses = cell.pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
