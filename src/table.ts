// Trigonometry · Four — The Whole Table.
//
// A right triangle whose hypotenuse is pinned at length 1, so the opposite
// leg literally IS sin θ and the adjacent leg literally IS cos θ. A dial at A
// drives θ from 0° to 90°, snapping at 0°, 30°, 45°, 60°, 90°; at each snap
// the sides trade their decimals for the exact values the last two lessons
// derived, and the caption names which special triangle you are holding. At
// θ = 0° the triangle degenerates — B and C become the same point, so
// sin 0° = 0; at 90° the adjacent leg vanishes and tan 90° divides by zero.
// The right side holds the full six-function table in exact form, the column
// nearest the dial highlighted, with a live decimal column between snaps. And
// the footer: sin²θ + cos²θ = 1 — on this triangle, that IS Pythagoras.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
// only the webcam device and this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Pulse {
  center: Vec; // screen coords
  age: number;
}

const ACCENT = "#f43f5e"; // header + dial
const OPP = "#ff6b6b"; // the opposite leg — sin θ
const ADJ = "#4dabf7"; // the adjacent leg — cos θ
const HYP = "#ffd43b"; // the unit hypotenuse
const EDGE = "#eef4fb";
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 30;
const SNAP_DEGS = [0, 30, 45, 60, 90];
const SNAP_IN = 2.5; // degrees
const PULSE_LIFE = 0.6;

// The table itself — every entry derived in the previous lessons.
const COLUMNS = ["0°", "30°", "45°", "60°", "90°"];
const TABLE: { name: string; sub: string; cells: string[] }[] = [
  { name: "sin", sub: "opp/hyp", cells: ["0", "1/2", "√2/2", "√3/2", "1"] },
  { name: "cos", sub: "adj/hyp", cells: ["1", "√3/2", "√2/2", "1/2", "0"] },
  { name: "tan", sub: "sin/cos", cells: ["0", "√3/3", "1", "√3", "—"] },
  { name: "sec", sub: "1/cos", cells: ["1", "2√3/3", "√2", "2", "—"] },
  { name: "csc", sub: "1/sin", cells: ["—", "2", "√2", "2√3/3", "1"] },
  { name: "cot", sub: "cos/sin", cells: ["—", "√3", "1", "√3/3", "0"] },
];

// Exact side labels to swap in at each snap: [sin, cos].
const EXACT_SIDES: Record<number, [string, string]> = {
  0: ["0", "1"],
  30: ["1/2", "√3/2"],
  45: ["√2/2", "√2/2"],
  60: ["√3/2", "1/2"],
  90: ["1", "0"],
};

const CAPTIONS: Record<number, string> = {
  0: "flat: B and C are the SAME point — the opposite leg vanished, and AB lies on AC",
  30: "you are holding half an equilateral triangle — short leg opposite the 30°",
  45: "you are holding half a square — two 45°s, legs equal",
  60: "half an equilateral again, stood on its short leg — long leg opposite the 60°",
  90: "flat the other way: C slid back onto A — the adjacent leg vanished",
};

// --- state -----------------------------------------------------------------

let theta = 30 * DEG;
let snapDeg: number | null = 30; // which snap we're resting on
let dragging = false;
let pulses: Pulse[] = [];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let hypPx = 300; // the pixel length of "1"
let originA: Vec = { x: 0, y: 0 };

// --- helpers ---------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ptB = (): Vec => ({
  x: originA.x + Math.cos(theta) * hypPx,
  y: originA.y - Math.sin(theta) * hypPx,
});
const ptC = (): Vec => ({ x: originA.x + Math.cos(theta) * hypPx, y: originA.y });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const figureW = W - PANEL_W - 90;
  hypPx = Math.min(figureW - 150, H - TOP_MARGIN - 220);
  originA = { x: 80, y: TOP_MARGIN + 110 + hypPx };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, ptB()) > GRAB_RADIUS) return;
  dragging = true;
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  drive(p);
});

canvas.addEventListener("pointermove", (e) => {
  if (dragging) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function drive(p: Vec): void {
  let deg = clamp(Math.atan2(originA.y - p.y, p.x - originA.x) / DEG, 0, 90);
  let snapped: number | null = null;
  for (const s of SNAP_DEGS) {
    if (Math.abs(deg - s) <= SNAP_IN) {
      deg = s;
      snapped = s;
      break;
    }
  }
  theta = deg * DEG;
  if (snapped !== null && snapped !== snapDeg) {
    pulses.push({ center: ptB(), age: 0 });
  }
  snapDeg = snapped;
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();

  const A = originA;
  const B = ptB();
  const C = ptC();
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const degenerate = snapDeg === 0 || snapDeg === 90;

  drawDial();

  // Body (skip the fill when flat — there is no interior to shade).
  if (!degenerate) {
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
  }

  strokeSegment(A, C, ADJ, 5); // adjacent = cos θ
  strokeSegment(C, B, OPP, 5); // opposite = sin θ
  strokeSegment(A, B, HYP, 5); // the unit hypotenuse

  // Right-angle marker at C, when there is a corner to mark.
  if (!degenerate) {
    const m = 13;
    ctx.beginPath();
    ctx.moveTo(C.x - m, C.y);
    ctx.lineTo(C.x - m, C.y - m);
    ctx.lineTo(C.x, C.y - m);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = EDGE;
    ctx.stroke();
  }

  // Side labels: exact at a snap, live decimals between.
  const [sinLabel, cosLabel] =
    snapDeg !== null ? EXACT_SIDES[snapDeg] : [sinT.toFixed(3), cosT.toFixed(3)];
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = ADJ;
  ctx.fillText(`cos ${fmtDeg()} = ${cosLabel}`, (A.x + C.x) / 2, A.y + 24);
  if (theta > 6 * DEG) {
    ctx.fillStyle = OPP;
    ctx.save();
    ctx.translate(C.x + 22, (C.y + B.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`sin ${fmtDeg()} = ${sinLabel}`, 0, 0);
    ctx.restore();
  }
  ctx.save();
  ctx.translate((A.x + B.x) / 2, (A.y + B.y) / 2);
  ctx.rotate(-theta);
  ctx.fillStyle = HYP;
  ctx.fillText("hypotenuse = 1", 0, -14);
  ctx.restore();

  // Vertex letters.
  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.7)";
  ctx.fillText("A", A.x - 14, A.y + 14);
  ctx.fillText("B", B.x + 6, B.y - 16);
  if (!degenerate) ctx.fillText("C", C.x + 14, C.y + 14);

  // Caption + identity, beneath the figure.
  const capY = A.y + 54;
  ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  if (snapDeg !== null) {
    ctx.fillStyle = degenerate ? OPP : ACCENT;
    ctx.fillText(CAPTIONS[snapDeg], 40, capY);
  } else {
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText("between the landmarks — the ratios still exist, just not with tidy exact forms", 40, capY);
  }
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(40, capY + 24, [
    ["sin²θ + cos²θ", TEXT],
    [" = ", TEXT_DIM],
    [(sinT * sinT).toFixed(3), OPP],
    [" + ", TEXT_DIM],
    [(cosT * cosT).toFixed(3), ADJ],
    [" = 1", HYP],
    ["   — with hypotenuse 1, that IS Pythagoras", TEXT_DIM],
  ]);

  for (const p of pulses) drawPulse(p);
  drawKnob(B, dragging);
  drawTable(sinT, cosT);
}

const fmtDeg = (): string => (snapDeg !== null ? `${snapDeg}°` : `${(theta / DEG).toFixed(1)}°`);

function drawDial(): void {
  const r = hypPx * 0.32;
  const A = originA;

  // The guide quarter-circle and its landmark ticks.
  ctx.beginPath();
  ctx.arc(A.x, A.y, r, -Math.PI / 2, 0);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(233,240,247,0.22)";
  ctx.stroke();
  for (let d = 10; d < 90; d += 10) {
    if (SNAP_DEGS.includes(d)) continue;
    tick(A, d * DEG, r, 4, "rgba(233,240,247,0.25)", 1.5);
  }
  for (const d of SNAP_DEGS) {
    const on = snapDeg === d;
    tick(A, d * DEG, r, 7, on ? ACCENT : "rgba(233,240,247,0.55)", on ? 3 : 2);
    const t = d * DEG;
    ctx.font = on
      ? "700 12px ui-monospace, SFMono-Regular, Menlo, monospace"
      : "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = on ? ACCENT : "rgba(233,240,247,0.5)";
    ctx.fillText(`${d}°`, A.x + Math.cos(t) * (r + 22), A.y - Math.sin(t) * (r + 16));
  }

  // The lit arc of θ itself.
  if (theta > 0.001) {
    ctx.beginPath();
    ctx.arc(A.x, A.y, r, -theta, 0);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
  }
  const mid = theta / 2;
  ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ACCENT;
  ctx.fillText(`θ = ${fmtDeg()}`, A.x + Math.cos(mid) * (r + 42), A.y - Math.sin(mid) * (r + 30));
}

function tick(A: Vec, t: number, r: number, len: number, color: string, width: number): void {
  const c = Math.cos(t);
  const s = Math.sin(t);
  ctx.beginPath();
  ctx.moveTo(A.x + c * (r - len), A.y - s * (r - len));
  ctx.lineTo(A.x + c * (r + len), A.y - s * (r + len));
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// --- the table -------------------------------------------------------------

const PANEL_W = 392;
const PANEL_PAD = 14;

function drawTable(sinT: number, cosT: number): void {
  const x = W - PANEL_W - 18;
  const y = TOP_MARGIN;
  const live = snapDeg === null;
  const h = live ? 328 : 306;
  ctx.beginPath();
  ctx.roundRect(x, y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.68)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const nameW = 74;
  const colW = 58;
  const col0 = x + PANEL_PAD + nameW;
  const rowH = 34;
  const headY = y + PANEL_PAD + 14;
  const bodyY = headY + 14;

  // Highlight slab behind the column we're resting on.
  if (snapDeg !== null) {
    const ci = SNAP_DEGS.indexOf(snapDeg);
    ctx.beginPath();
    ctx.roundRect(col0 + ci * colW - 8, y + 10, colW - 2, h - 20, 8);
    ctx.fillStyle = rgba(ACCENT, 0.13);
    ctx.fill();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  COLUMNS.forEach((c, i) => {
    ctx.fillStyle = snapDeg === SNAP_DEGS[i] ? ACCENT : TEXT_DIM;
    ctx.fillText(c, col0 + i * colW, headY);
  });
  if (live) {
    ctx.fillStyle = ACCENT;
    ctx.fillText("now", col0 + 5 * colW, headY);
  }

  const liveVals = [
    sinT,
    cosT,
    cosT > 0.02 ? sinT / cosT : NaN,
    cosT > 0.02 ? 1 / cosT : NaN,
    sinT > 0.02 ? 1 / sinT : NaN,
    sinT > 0.02 ? cosT / sinT : NaN,
  ];

  TABLE.forEach((row, ri) => {
    const ry = bodyY + ri * rowH + 14;
    ctx.font = "700 14px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = TEXT;
    ctx.fillText(row.name, x + PANEL_PAD, ry);
    ctx.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText(row.sub, x + PANEL_PAD, ry + 13);

    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    row.cells.forEach((cell, ci) => {
      ctx.fillStyle = snapDeg === SNAP_DEGS[ci] ? TEXT : TEXT_DIM;
      ctx.fillText(cell, col0 + ci * colW, ry + 6);
    });
    if (live) {
      const v = liveVals[ri];
      ctx.fillStyle = ACCENT;
      ctx.fillText(Number.isNaN(v) ? "—" : v.toFixed(2), col0 + 5 * colW, ry + 6);
    }
  });

  const footY = bodyY + TABLE.length * rowH + 16;
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("— means undefined: that ratio divides by a leg of length 0.", x + PANEL_PAD, footY);
  ctx.fillText("nothing here was memorized — every entry came off a triangle.", x + PANEL_PAD, footY + 16);
}

/** Draw colored text runs left-to-right from (x, y). */
function segments(x: number, y: number, runs: [string, string][]): void {
  let cx = x;
  for (const [text, color] of runs) {
    ctx.fillStyle = color;
    ctx.fillText(text, cx, y);
    cx += ctx.measureText(text).width;
  }
}

// --- chrome ----------------------------------------------------------------

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

function drawKnob(v: Vec, active: boolean): void {
  ctx.beginPath();
  ctx.arc(v.x, v.y, active ? 15 : 12, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(ACCENT, 1 - t);
  ctx.stroke();
}

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("The Whole Table", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "hypotenuse pinned at 1: the legs ARE sin θ and cos θ — swing B through the landmark angles you derived",
    W / 2,
    48,
  );
}

// --- loop ------------------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  pulses = pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
