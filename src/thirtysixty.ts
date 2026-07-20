// Trigonometry · Three — Folding the Equilateral: the 30°-60°-90° triangle.
//
// An equilateral triangle of side 2a, all three 60° angles marked, with a
// resize knob and a fold knob. Drag the fold knob and the left half folds
// over the altitude; the halves match exactly — congruent (ASA) — which is
// WHY the foot is the midpoint (the base splits into a + a) and why the apex
// angle splits into 30° + 30°. What remains is the 30-60-90 triangle:
// hypotenuse 2a, short leg a, and the Pythagorean Theorem computes the long
// leg √((2a)² − a²) = a√3 live — the ratio 1 : √3 : 2. The panel derives
// every ratio of 30° and of 60° with the cancellations shown (a/2a = 1/2),
// plus the callout that the hypotenuse is twice the leg opposite 30°.
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

const ACCENT = "#4ade80"; // header + the folding flap
const CREASE = "#ffd43b"; // the altitude, and the split-angle arcs
const OK = "#38d9a9"; // the congruence verdict
const EDGE = "#eef4fb";
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const SQRT3 = Math.sqrt(3);
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const U_MIN = 0.9;
const U_MAX = 1.8;
const SNAP_T = 0.07;
const PULSE_LIFE = 0.6;

// --- state -----------------------------------------------------------------

let half = 1.35; // a — HALF the equilateral's side; the side is 2a
let fold = 0; // 0 = whole equilateral, 1 = left half folded onto the right
let folded = false;
let drag: "fold" | "size" | null = null;
let pulses: Pulse[] = [];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let unit = 1;
let center: Vec = { x: 0, y: 0 };

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

// The equilateral in unit coords (y down), centroid at the origin:
// apex T on top, base corners L and R, altitude foot M — the fold line is TM.
const height = (): number => half * SQRT3;
const ptT = (): Vec => ({ x: 0, y: (-2 * height()) / 3 });
const ptL = (): Vec => ({ x: -half, y: height() / 3 });
const ptR = (): Vec => ({ x: half, y: height() / 3 });
const ptM = (): Vec => ({ x: 0, y: height() / 3 });

/** Fold a point of the left flap across the vertical altitude; t = 1 is flat. */
const foldPoint = (p: Vec, t: number): Vec => ({ x: p.x * (1 - 2 * t), y: p.y });

const toScreen = (p: Vec): Vec => ({ x: center.x + p.x * unit, y: center.y + p.y * unit });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const figureW = W - PANEL_W - 90;
  unit = Math.min((figureW - 80) / (2 * U_MAX + 0.6), (H - TOP_MARGIN - 150) / (U_MAX * SQRT3 + 0.6));
  center = { x: 50 + figureW / 2, y: TOP_MARGIN + (H - TOP_MARGIN) / 2 - 10 };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

const foldKnobPos = (): Vec => toScreen(foldPoint(ptL(), fold));

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, foldKnobPos()) <= GRAB_RADIUS) {
    drag = "fold";
  } else if (dist(p, toScreen(ptT())) <= GRAB_RADIUS) {
    // The apex resizes — the fold knob ends its ride ON the base corner, so
    // the two grips must never share a vertex.
    drag = "size";
  } else {
    return;
  }
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  drive(p);
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
  if (drag === "size") {
    // The apex sits 2h/3 above the centroid; pull it up or down to resize.
    const h = (Math.abs(p.y - center.y) * 3) / 2 / unit;
    half = clamp(h / SQRT3, U_MIN, U_MAX);
    return;
  }
  // The flying corner rides the straight line L → R.
  const a = toScreen(ptL());
  const b = toScreen(ptR());
  let t = (p.x - a.x) / (b.x - a.x);
  t = clamp(t, 0, 1);
  if (t < SNAP_T) t = 0;
  if (t > 1 - SNAP_T) t = 1;
  fold = t;
  if (fold === 1 && !folded) {
    pulses.push({ center: toScreen(ptR()), age: 0 });
    folded = true;
  }
  if (fold < 1) folded = false;
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();

  const sT = toScreen(ptT());
  const sL = toScreen(ptL());
  const sR = toScreen(ptR());
  const sM = toScreen(ptM());
  const isFolded = fold === 1;

  // The flap's home outline once it has left.
  if (fold > 0) {
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(sM.x, sM.y);
    ctx.lineTo(sL.x, sL.y);
    ctx.lineTo(sT.x, sT.y);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(233,240,247,0.3)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The staying half: the 30-60-90 triangle to be.
  ctx.beginPath();
  ctx.moveTo(sT.x, sT.y);
  ctx.lineTo(sR.x, sR.y);
  ctx.lineTo(sM.x, sM.y);
  ctx.closePath();
  ctx.fillStyle = isFolded ? rgba(OK, 0.13) : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = isFolded ? OK : EDGE;
  ctx.stroke();

  // The crease — the altitude, soon the long leg.
  ctx.setLineDash(isFolded ? [] : [6, 6]);
  ctx.beginPath();
  ctx.moveTo(sT.x, sT.y);
  ctx.lineTo(sM.x, sM.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = CREASE;
  ctx.stroke();
  ctx.setLineDash([]);

  // The flap, mid-air.
  const fL = toScreen(foldPoint(ptL(), fold));
  ctx.beginPath();
  ctx.moveTo(sT.x, sT.y);
  ctx.lineTo(fL.x, fL.y);
  ctx.lineTo(sM.x, sM.y);
  ctx.closePath();
  ctx.fillStyle = rgba(ACCENT, isFolded ? 0.1 : 0.2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(ACCENT, isFolded ? 0.6 : 0.95);
  ctx.stroke();

  // The 60° corners of the whole equilateral (before the fold finishes).
  if (!isFolded) {
    drawArc(sL, -60 * DEG, 0, "60°", "rgba(233,240,247,0.5)");
    drawArc(sR, Math.PI, Math.PI + 60 * DEG, "60°", "rgba(233,240,247,0.5)");
    drawArc(sT, 60 * DEG, 120 * DEG, "60°", "rgba(233,240,247,0.5)");
  } else {
    // The fold split the apex 60° into 30° + 30°, and the base at its midpoint.
    drawArc(sR, Math.PI, Math.PI + 60 * DEG, "60°", CREASE);
    drawArc(sT, 60 * DEG, 90 * DEG, "30°", CREASE);
    const m = 14;
    ctx.beginPath();
    ctx.moveTo(sM.x + m, sM.y);
    ctx.lineTo(sM.x + m, sM.y - m);
    ctx.lineTo(sM.x, sM.y - m);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = EDGE;
    ctx.stroke();
  }

  // Side labels.
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEXT;
  ctx.fillText(`a = ${half.toFixed(2)}`, (sM.x + sR.x) / 2, sM.y + 22);
  if (!isFolded) {
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText(`a = ${half.toFixed(2)}`, (sL.x + sM.x) / 2, sM.y + 22);
  }
  ctx.save();
  ctx.translate((sT.x + sR.x) / 2, (sT.y + sR.y) / 2);
  ctx.rotate(Math.atan2(sR.y - sT.y, sR.x - sT.x));
  ctx.fillStyle = TEXT;
  ctx.fillText(`2a = ${(2 * half).toFixed(2)}`, 0, -12);
  ctx.restore();
  ctx.save();
  ctx.translate(sM.x - 14, (sT.y + sM.y) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = CREASE;
  ctx.fillText(isFolded ? `a√3 = ${(half * SQRT3).toFixed(2)}` : "the altitude", 0, 0);
  ctx.restore();

  // Caption.
  ctx.font = isFolded ? "600 13px ui-sans-serif, system-ui, sans-serif" : "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = isFolded ? OK : TEXT_DIM;
  ctx.fillText(
    isFolded
      ? "the halves match (ASA) — the base splits at its MIDPOINT, the apex into 30° + 30°"
      : fold === 0
        ? "an equilateral triangle: three sides 2a, three 60° angles"
        : "folding over the altitude…",
    center.x,
    sM.y + 52,
  );

  for (const p of pulses) drawPulse(p);
  drawKnob(fL, drag === "fold");
  drawKnob(sT, drag === "size");
  drawPanel();
}

function drawArc(v: Vec, from: number, to: number, label: string, color: string): void {
  const r = 30;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, from, to);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  const mid = (from + to) / 2;
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label, v.x + Math.cos(mid) * (r + 16), v.y + Math.sin(mid) * (r + 16));
}

// --- panel -----------------------------------------------------------------

const PANEL_W = 360;
const PANEL_PAD = 14;

function drawPanel(): void {
  const x = W - PANEL_W - 18;
  const y = TOP_MARGIN;
  const h = 348;
  ctx.beginPath();
  ctx.roundRect(x, y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.65)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const a = half;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let ty = y + PANEL_PAD + 14;

  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("half an equilateral = 30°-60°-90°", x + PANEL_PAD, ty);
  ty += 22;

  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + PANEL_PAD, ty, [
    ["long leg", CREASE],
    [" = √((2a)² − a²) = √(3a²) = a√3", TEXT],
  ]);
  ty += 19;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText(
    `Pythagoras on hyp 2a, short leg a — here √3·${a.toFixed(2)} = ${(a * SQRT3).toFixed(2)}`,
    x + PANEL_PAD,
    ty,
  );
  ty += 20;
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + PANEL_PAD, ty, [
    ["short : long : hyp", TEXT],
    ["  =  ", TEXT_DIM],
    ["1 : √3 : 2", ACCENT],
    ["   (hyp = 2 × short)", TEXT_DIM],
  ]);
  ty += 26;

  // The two derived columns: standing at 30° (apex) and at 60° (base corner).
  const col30 = x + PANEL_PAD + 64;
  const col60 = col30 + 140;
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("at 30° (opp = a)", col30, ty);
  ctx.fillText("at 60° (opp = a√3)", col60, ty);
  ty += 19;

  const mono = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.font = mono;
  const row = (name: string, thirty: string, sixty: string): void => {
    ctx.fillStyle = TEXT;
    ctx.fillText(name, x + PANEL_PAD, ty);
    ctx.fillStyle = ACCENT;
    ctx.fillText(thirty, col30, ty);
    ctx.fillText(sixty, col60, ty);
    ty += 21;
  };

  row("sin", "a/2a = 1/2", "a√3/2a = √3/2");
  row("cos", "√3/2", "1/2");
  row("tan", "a/a√3 = √3/3", "a√3/a = √3");
  row("csc", "2", "2√3/3");
  row("sec", "2√3/3", "2");
  row("cot", "√3", "√3/3");

  ty += 2;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("forget which is 1/2? the leg opposite 30° is the SHORT one,", x + PANEL_PAD, ty);
  ty += 16;
  ctx.fillText("so sin 30° = 1/2 — just redraw this triangle.", x + PANEL_PAD, ty);
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

function drawKnob(v: Vec, active: boolean): void {
  ctx.beginPath();
  ctx.arc(v.x, v.y, active ? 15 : 11, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 44, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(OK, 1 - t);
  ctx.stroke();
}

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Folding the Equilateral — 30° & 60°", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "drag the flying corner across the altitude — congruent halves split the base evenly, and 1 : √3 : 2 appears",
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
