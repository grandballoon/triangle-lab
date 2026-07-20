// Trigonometry · Two — Folding the Square: the 45°-45°-90° triangle.
//
// A square of side a with a resize knob on one corner and a fold knob on the
// opposite corner. Drag the fold knob and the square folds over its diagonal;
// the two halves land exactly on each other — congruent — so the fold bisects
// the corner right angles and 45° arcs appear at both ends of the crease.
// What remains is the 45-45-90 triangle: legs a and a, and the Pythagorean
// Theorem computes the hypotenuse √(a² + a²) = a√2 with live numbers. The
// panel builds all six ratios from those sides and shows the a's cancel:
// sin 45° = a/(a√2) = 1/√2 = √2/2 ≈ 0.707. Resize the square — every decimal
// on the sides changes, every ratio holds still. That is the whole lesson.
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

const ACCENT = "#e879f9"; // header + the folding flap
const CREASE = "#ffd43b"; // the diagonal, and the 45° arcs it creates
const OK = "#38d9a9"; // the congruence verdict
const EDGE = "#eef4fb";
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const A_MIN = 1.6;
const A_MAX = 3.4;
const SNAP_T = 0.07; // fold snaps flat/closed inside this margin
const PULSE_LIFE = 0.6;

// --- state -----------------------------------------------------------------

let side = 2.6; // a — the square's side, in units
let fold = 0; // 0 = open square, 1 = folded flat onto the lower half
let folded = false; // resting state, for the arrival pulse
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

// Square corners in unit coords (y down), centered on the origin.
const p1 = (): Vec => ({ x: -side / 2, y: -side / 2 }); // top-left — the flying corner
const p2 = (): Vec => ({ x: side / 2, y: -side / 2 }); // top-right — crease end
const p3 = (): Vec => ({ x: side / 2, y: side / 2 }); // bottom-right — the right angle
const p4 = (): Vec => ({ x: -side / 2, y: side / 2 }); // bottom-left — crease end

/** Fold a point of the flap across the diagonal p4→p2; t = 1 is flat. */
function foldPoint(p: Vec, t: number): Vec {
  const L = p4();
  const d = { x: Math.SQRT1_2, y: -Math.SQRT1_2 }; // along the crease
  const n = { x: d.y, y: -d.x };
  const rel = { x: p.x - L.x, y: p.y - L.y };
  const par = rel.x * d.x + rel.y * d.y;
  const perp = rel.x * n.x + rel.y * n.y;
  const k = perp * (1 - 2 * t);
  return { x: L.x + par * d.x + k * n.x, y: L.y + par * d.y + k * n.y };
}

const toScreen = (p: Vec): Vec => ({ x: center.x + p.x * unit, y: center.y + p.y * unit });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const figureW = W - PANEL_W - 90;
  unit = Math.min((figureW - 80) / (A_MAX + 0.7), (H - TOP_MARGIN - 130) / (A_MAX + 0.7));
  center = { x: 50 + figureW / 2, y: TOP_MARGIN + (H - TOP_MARGIN) / 2 };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

const foldKnobPos = (): Vec => toScreen(foldPoint(p1(), fold));

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, foldKnobPos()) <= GRAB_RADIUS) {
    drag = "fold";
  } else if (dist(p, toScreen(p2())) <= GRAB_RADIUS) {
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
    const dx = Math.abs(p.x - center.x) / unit;
    const dy = Math.abs(p.y - center.y) / unit;
    side = clamp(Math.max(dx, dy) * 2, A_MIN, A_MAX);
    return;
  }
  // The flying corner rides the straight line p1 → p3.
  const a = toScreen(p1());
  const b = toScreen(p3());
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
  t = clamp(t, 0, 1);
  if (t < SNAP_T) t = 0;
  if (t > 1 - SNAP_T) t = 1;
  fold = t;
  if (fold === 1 && !folded) {
    pulses.push({ center: toScreen(p3()), age: 0 });
    folded = true;
  }
  if (fold < 1) folded = false;
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();

  const s1 = toScreen(p1());
  const s2 = toScreen(p2());
  const s3 = toScreen(p3());
  const s4 = toScreen(p4());
  const isFolded = fold === 1;

  // Where the square used to be — the flap's home, kept as a faint outline.
  if (fold > 0) {
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(s4.x, s4.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(233,240,247,0.3)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The staying half: the 45-45-90 triangle to be.
  ctx.beginPath();
  ctx.moveTo(s4.x, s4.y);
  ctx.lineTo(s3.x, s3.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.closePath();
  ctx.fillStyle = isFolded ? rgba(OK, 0.13) : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = isFolded ? OK : EDGE;
  ctx.stroke();

  // The crease — the diagonal, soon the hypotenuse.
  ctx.setLineDash(isFolded ? [] : [6, 6]);
  ctx.beginPath();
  ctx.moveTo(s4.x, s4.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = CREASE;
  ctx.stroke();
  ctx.setLineDash([]);

  // The flap, mid-air.
  const f1 = toScreen(foldPoint(p1(), fold));
  ctx.beginPath();
  ctx.moveTo(s4.x, s4.y);
  ctx.lineTo(f1.x, f1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.closePath();
  ctx.fillStyle = rgba(ACCENT, isFolded ? 0.1 : 0.2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(ACCENT, isFolded ? 0.6 : 0.95);
  ctx.stroke();

  // Right-angle marker at the bottom-right corner.
  const m = 15;
  ctx.beginPath();
  ctx.moveTo(s3.x - m, s3.y);
  ctx.lineTo(s3.x - m, s3.y - m);
  ctx.lineTo(s3.x, s3.y - m);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = EDGE;
  ctx.stroke();

  // Side labels: the two legs and the crease.
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEXT;
  ctx.fillText(`a = ${side.toFixed(2)}`, (s4.x + s3.x) / 2, s3.y + 22);
  ctx.save();
  ctx.translate(s3.x + 22, (s2.y + s3.y) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`a = ${side.toFixed(2)}`, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate((s4.x + s2.x) / 2, (s4.y + s2.y) / 2);
  ctx.rotate(Math.atan2(s2.y - s4.y, s2.x - s4.x));
  ctx.fillStyle = CREASE;
  ctx.fillText(`a√2 = ${(side * Math.SQRT2).toFixed(2)}`, 0, -12);
  ctx.restore();

  // Once flat: the fold has bisected the corner angles — mark both 45°s.
  if (isFolded) {
    drawHalfAngle(s4, -Math.PI / 4, 0);
    drawHalfAngle(s2, Math.PI / 2, Math.PI * 0.75);
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = OK;
    ctx.fillText("the halves match — congruent — so the fold BISECTS the right angles", center.x, s3.y + 52);
  } else {
    ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText(
      fold === 0 ? "a square: four sides a, four right angles" : "folding over the diagonal…",
      center.x,
      s3.y + 52,
    );
  }

  for (const p of pulses) drawPulse(p);
  drawKnob(f1, drag === "fold");
  drawKnob(s2, drag === "size");
  drawPanel();
}

/** A 45° arc + label at a crease end, spanning [from, to] in canvas angles. */
function drawHalfAngle(v: Vec, from: number, to: number): void {
  const r = 34;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, from, to);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CREASE;
  ctx.stroke();
  const mid = (from + to) / 2;
  ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = CREASE;
  ctx.fillText("45°", v.x + Math.cos(mid) * (r + 17), v.y + Math.sin(mid) * (r + 17));
}

// --- panel -----------------------------------------------------------------

const PANEL_W = 348;
const PANEL_PAD = 14;

function drawPanel(): void {
  const x = W - PANEL_W - 18;
  const y = TOP_MARGIN;
  const h = 332;
  ctx.beginPath();
  ctx.roundRect(x, y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.65)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const a = side;
  const hyp = a * Math.SQRT2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let ty = y + PANEL_PAD + 14;

  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("half a square = 45°-45°-90°", x + PANEL_PAD, ty);
  ty += 24;

  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + PANEL_PAD, ty, [
    ["hyp", CREASE],
    [" = √(a² + a²)", TEXT],
    [` = √${(2 * a * a).toFixed(2)}`, TEXT_DIM],
    [" = a√2", CREASE],
  ]);
  ty += 19;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText(`Pythagoras on legs a, a — here √2·${a.toFixed(2)} = ${hyp.toFixed(2)}`, x + PANEL_PAD, ty);
  ty += 26;

  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  const row = (name: string, live: string, exact: string, value: string): void => {
    segments(x + PANEL_PAD, ty, [
      [name.padEnd(8), TEXT],
      ["= ", TEXT_DIM],
      [live.padEnd(12), TEXT_DIM],
      ["= ", TEXT_DIM],
      [exact.padEnd(12), ACCENT],
      [`= ${value}`, TEXT],
    ]);
    ty += 21;
  };

  row("sin 45°", `${a.toFixed(2)}/${hyp.toFixed(2)}`, "a/a√2 → 1/√2", "0.707");
  row("cos 45°", `${a.toFixed(2)}/${hyp.toFixed(2)}`, "1/√2 = √2/2", "0.707");
  row("tan 45°", `${a.toFixed(2)}/${a.toFixed(2)}`, "a/a → 1", "1.000");
  row("csc 45°", `${hyp.toFixed(2)}/${a.toFixed(2)}`, "√2", "1.414");
  row("sec 45°", `${hyp.toFixed(2)}/${a.toFixed(2)}`, "√2", "1.414");
  row("cot 45°", `${a.toFixed(2)}/${a.toFixed(2)}`, "1", "1.000");

  ty += 4;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("the a's cancel every time: the size never mattered.", x + PANEL_PAD, ty);
  ty += 17;
  ctx.fillText("resize the square — decimals move, ratios hold.", x + PANEL_PAD, ty);
  ty += 17;
  ctx.fillStyle = TEXT;
  ctx.fillText("hyp : leg is always √2 in a 45-45-90 triangle.", x + PANEL_PAD, ty);
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
  ctx.fillText("Folding the Square — 45°", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "drag the flying corner across the diagonal — bisect the right angle and the 45° triangle appears",
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
