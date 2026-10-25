// Trigonometry · Four — The Whole Table.
//
// A right triangle whose hypotenuse is pinned at length 1, so the opposite
// leg literally IS sin θ and the adjacent leg literally IS cos θ. A dial at A
// drives θ from 0° to 90°, snapping at 0°, 30°, 45°, 60°, 90°; at each snap
// the sides trade their decimals for the exact values the last two lessons
// derived, and the formula band names which special triangle you are
// holding. At θ = 0° the triangle degenerates — B and C become the same point, so
// sin 0° = 0; at 90° the adjacent leg vanishes and tan 90° divides by zero.
// The formula band below leads with the six ratios now, exact at a snap and
// live decimals between, and sin²θ + cos²θ = 1 — on this triangle, that IS
// Pythagoras — then holds the full six-function table in exact form, one
// landmark angle a row, the one the dial rests on lit.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
// only the webcam device, the page's formula band, the small-screen helpers
// and this file's own little vector helpers are involved.

import { formulaBand } from "./chrome.ts";
import { grabRadius } from "./fit.ts";
import { capturePointer, releasePointer } from "./pointer.ts";
import { LANDMARKS, tableReadouts } from "./readouts.ts";
import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Pulse {
  center: Vec; // screen coords
  age: number;
}

const ACCENT = "#f43f5e"; // dial
const OPP = "#ff6b6b"; // the opposite leg — sin θ
const ADJ = "#4dabf7"; // the adjacent leg — cos θ
const HYP = "#ffd43b"; // the unit hypotenuse
const EDGE = "#eef4fb";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const MIN_HYP_PX = 120; // however cramped the window
// Room around the triangle for its labels, the dial's and the knob, in screen px.
const PAD_LEFT = 40;
const PAD_RIGHT = 50;
const PAD_Y = 40;
const GRAB_RADIUS = 30;
const SNAP_DEGS = LANDMARKS;
const SNAP_IN = 2.5; // degrees
const PULSE_LIFE = 0.6;

// Exact side labels to swap in at each snap: [sin, cos].
const EXACT_SIDES: Record<number, [string, string]> = {
  0: ["0", "1"],
  30: ["1/2", "√3/2"],
  45: ["√2/2", "√2/2"],
  60: ["√3/2", "1/2"],
  90: ["1", "0"],
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
const showFormulas = formulaBand();

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
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // The triangle sweeps a quarter circle of radius 1 about A; centre that.
  // Floored so a narrow window shrinks the figure rather than inverting it.
  const usableH = H - TOP_MARGIN;
  hypPx = Math.max(MIN_HYP_PX, Math.min(W - PAD_LEFT - PAD_RIGHT, usableH - 2 * PAD_Y));
  originA = {
    x: PAD_LEFT + (W - PAD_LEFT - PAD_RIGHT - hypPx) / 2,
    y: TOP_MARGIN + (usableH + hypPx) / 2,
  };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, ptB()) > grabRadius(e.pointerType, GRAB_RADIUS)) return;
  dragging = true;
  canvas.classList.add("grabbing");
  capturePointer(canvas, e);
  drive(p);
});

canvas.addEventListener("pointermove", (e) => {
  if (dragging) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove("grabbing");
  releasePointer(canvas, e);
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

  for (const p of pulses) drawPulse(p);
  drawKnob(B, dragging);
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

// --- loop ------------------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;
  pulses = pulses.filter((p) => (p.age += dt) < PULSE_LIFE);
  render();
  showFormulas(tableReadouts(theta / DEG, snapDeg));
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
