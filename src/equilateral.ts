// Classifying · Two — Equilateral (first, drag-driven implementation).
// An equilateral triangle centred on screen with a knob on one corner. Drag the
// knob to resize (and spin) it; because it is always equilateral, all three
// sides stay equal and all three angles stay 60°. Sides carry a congruence tick
// + a length label laid parallel to the side, outside the body; every corner
// carries the same 60° arc. Self-contained on purpose (see the page brief:
// "don't worry about code duplication for now") — only the webcam device and
// this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

const ACCENT = "#a5b4ff"; // the single colour every side & angle shares
const UNIT_PX = 40; // screen pixels per displayed length "unit"
const R_MIN = 60;
const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let center: Vec = { x: 0, y: 0 };
let rMax = 300;

// The triangle is fully described by its circumradius and rotation; corner 0
// (the knob) sits at `theta`, the other two at +120° and +240°.
let radius = 180;
let theta = -Math.PI / 2; // corner 0 starts at the top
let dragging = false;

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function corners(): [Vec, Vec, Vec] {
  const pt = (i: number): Vec => ({
    x: center.x + radius * Math.cos(theta + (i * TWO_PI) / 3),
    y: center.y + radius * Math.sin(theta + (i * TWO_PI) / 3),
  });
  return [pt(0), pt(1), pt(2)];
}

/** Equilateral side length = R·√3, expressed in display units. */
function sideUnits(): number {
  return (radius * Math.sqrt(3)) / UNIT_PX;
}

// --- layout --------------------------------------------------------------

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  center = { x: W / 2, y: H / 2 };
  const prevMax = rMax;
  rMax = Math.min(W, H) * 0.34;
  // First run seeds a comfortable size; later runs keep the relative size.
  radius = prevMax === rMax ? clamp(radius, R_MIN, rMax) : rMax * 0.62;
}

// --- interaction ---------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, corners()[0]) <= GRAB_RADIUS) {
    dragging = true;
    canvas.classList.add("grabbing");
    canvas.setPointerCapture(e.pointerId);
    drive(p);
  }
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

/** The grabbed corner follows the pointer: its distance sets the size, its
 *  direction sets the rotation. The triangle stays equilateral throughout. */
function drive(p: Vec): void {
  radius = clamp(dist(p, center), R_MIN, rMax);
  theta = Math.atan2(p.y - center.y, p.x - center.x);
}

// --- rendering -----------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  const cs = corners();

  drawBody(cs);
  for (let i = 0; i < 3; i++) drawSide(cs[i], cs[(i + 1) % 3]);
  for (let i = 0; i < 3; i++) drawAngle(cs[i], cs[(i + 1) % 3], cs[(i + 2) % 3]);
  drawKnob(cs[0]);
  drawCaption(cs);
}

function drawBody(cs: Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(cs[0].x, cs[0].y);
  ctx.lineTo(cs[1].x, cs[1].y);
  ctx.lineTo(cs[2].x, cs[2].y);
  ctx.closePath();
  ctx.fillStyle = rgba(ACCENT, 0.12);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = ACCENT;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** One side: a congruence tick at its midpoint plus the shared length label,
 *  laid parallel to the side and just outside the body. */
function drawSide(p: Vec, q: Vec): void {
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const along = unit({ x: q.x - p.x, y: q.y - p.y });
  const outward = unit({ x: m.x - center.x, y: m.y - center.y });

  // Congruence tick: a short stroke crossing the side (equal-length notation).
  ctx.beginPath();
  ctx.moveTo(m.x - outward.x * 8, m.y - outward.y * 8);
  ctx.lineTo(m.x + outward.x * 8, m.y + outward.y * 8);
  ctx.lineWidth = 3;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();

  // Length label, rotated to run parallel to the side.
  const pos = { x: m.x + outward.x * 26, y: m.y + outward.y * 26 };
  let a = Math.atan2(along.y, along.x);
  if (a > Math.PI / 2) a -= Math.PI;
  else if (a < -Math.PI / 2) a += Math.PI;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(a);
  ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ACCENT;
  ctx.fillText(sideUnits().toFixed(1), 0, 0);
  ctx.restore();
}

/** One corner: the shared 60° arc + label, drawn inside the body. */
function drawAngle(v: Vec, p: Vec, q: Vec): void {
  const toP = unit({ x: p.x - v.x, y: p.y - v.y });
  const toQ = unit({ x: q.x - v.x, y: q.y - v.y });
  const r = clamp(radius * 0.2, 16, 34);
  const a1 = Math.atan2(toP.y, toP.x);
  let delta = Math.atan2(toQ.y, toQ.x) - a1;
  while (delta <= -Math.PI) delta += TWO_PI;
  while (delta > Math.PI) delta -= TWO_PI;

  ctx.beginPath();
  ctx.arc(v.x, v.y, r, a1, a1 + delta, delta < 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();

  const mid = a1 + delta / 2;
  const pos = { x: v.x + Math.cos(mid) * (r + 20), y: v.y + Math.sin(mid) * (r + 20) };
  const text = "60°";
  ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  roundRect(pos.x - w / 2 - 7, pos.y - 13, w + 14, 26, 7);
  ctx.fillStyle = "rgba(10,15,22,0.7)";
  ctx.fill();
  ctx.fillStyle = ACCENT;
  ctx.fillText(text, pos.x, pos.y + 1);
}

function drawKnob(v: Vec): void {
  const r = dragging ? 16 : 13;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, 0, TWO_PI);
  ctx.fillStyle = rgba(ACCENT, 0.95);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawCaption(cs: Vec[]): void {
  // Sit clear of a bottom side's outside length label (edge + ~35px).
  const baseY = Math.max(cs[0].y, cs[1].y, cs[2].y) + 78;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 32px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Equilateral Triangle", center.x, baseY);
  ctx.font = "400 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.75)";
  ctx.fillText("all three sides equal · all three angles 60°", center.x, baseY + 25);
}

// --- small helpers -------------------------------------------------------

function unit(p: Vec): Vec {
  const l = Math.hypot(p.x, p.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

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
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- loop ----------------------------------------------------------------

function frame(): void {
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
