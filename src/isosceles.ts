// Classifying · Three — Isosceles (first, drag-driven implementation).
//
// An isosceles triangle centred on screen with two knobs. Grab the APEX knob to
// heighten/lower the triangle (and spin the whole thing freely, like the
// equilateral demo); grab a BASE knob to widen/narrow the base. Either way the
// triangle stays isosceles: the two legs stay equal (shared colour + a
// congruence tick each), and the two base angles stay equal to each other
// (shared colour) no matter their actual value or the side lengths. The apex
// angle and the base carry their own distinct colour.
//
// Self-contained on purpose, matching equilateral.ts — only the webcam device
// and this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

// Congruent parts (the two legs + the two base angles) share one colour; the
// unique parts (the base + the apex angle) share the other. Colour is the whole
// point: it shows which pieces the isosceles symmetry forces to be equal.
const EQUAL = "#f472b6"; // legs & base angles — the equal pair
const UNIQUE = "#38bdf8"; // base & apex angle — the odd ones out

const UNIT_PX = 40; // screen pixels per displayed length "unit"
const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let center: Vec = { x: 0, y: 0 };

// Parameter bounds are seeded from the viewport in layout().
let hMin = 60;
let hMax = 300;
let bMin = 40;
let bMax = 260;

// The triangle is fully described by three numbers: the height `h` (base to
// apex), the base half-width `b`, and the rotation `phi` (direction of the
// symmetry axis, base → apex). The centroid is pinned to screen centre so the
// figure spins about its own middle, like the equilateral knob does.
let h = 200;
let b = 150;
let phi = -Math.PI / 2; // apex points up to start

type Grab = "apex" | "base" | null;
let grab: Grab = null;

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Corners as [apex, baseRight, baseLeft]. The centroid sits at `center`, so
 *  the apex is 2h/3 along the axis and the base midpoint is h/3 behind it. */
function corners(): [Vec, Vec, Vec] {
  const axis: Vec = { x: Math.cos(phi), y: Math.sin(phi) };
  const perp: Vec = { x: -Math.sin(phi), y: Math.cos(phi) };
  const baseMid: Vec = { x: center.x - (axis.x * h) / 3, y: center.y - (axis.y * h) / 3 };
  const apex: Vec = { x: center.x + (axis.x * 2 * h) / 3, y: center.y + (axis.y * 2 * h) / 3 };
  const baseR: Vec = { x: baseMid.x + perp.x * b, y: baseMid.y + perp.y * b };
  const baseL: Vec = { x: baseMid.x - perp.x * b, y: baseMid.y - perp.y * b };
  return [apex, baseR, baseL];
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
  const s = Math.min(W, H);
  const first = hMax === 300 && bMax === 260; // untouched seed values
  hMin = 60;
  hMax = s * 0.5;
  bMin = 40;
  bMax = s * 0.42;
  if (first) {
    h = hMax * 0.72;
    b = bMax * 0.6;
  } else {
    h = clamp(h, hMin, hMax);
    b = clamp(b, bMin, bMax);
  }
}

// --- interaction ---------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  const [apex, baseR] = corners();
  if (dist(p, apex) <= GRAB_RADIUS) grab = "apex";
  else if (dist(p, baseR) <= GRAB_RADIUS) grab = "base";
  else return;
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  drive(p);
});

canvas.addEventListener("pointermove", (e) => {
  if (grab) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!grab) return;
  grab = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Route a pointer position to the grabbed knob.
 *  - APEX: sets the height and the free rotation; the base width is untouched,
 *    so both base angles change together and stay equal.
 *  - BASE: slides the base corner along the base line, changing only the width;
 *    height and rotation hold, so the two base angles stay identical. */
function drive(p: Vec): void {
  if (grab === "apex") {
    // Apex sits 2h/3 from the centre, so recover h from that distance.
    h = clamp(dist(p, center) * 1.5, hMin, hMax);
    phi = Math.atan2(p.y - center.y, p.x - center.x);
  } else if (grab === "base") {
    const axis: Vec = { x: Math.cos(phi), y: Math.sin(phi) };
    const perp: Vec = { x: -Math.sin(phi), y: Math.cos(phi) };
    const baseMid: Vec = { x: center.x - (axis.x * h) / 3, y: center.y - (axis.y * h) / 3 };
    // Width is the pointer's reach along the perpendicular from the base line.
    b = clamp((p.x - baseMid.x) * perp.x + (p.y - baseMid.y) * perp.y, bMin, bMax);
  }
}

// --- rendering -----------------------------------------------------------

// Per-edge and per-corner colours, indexed like corners() → [apex, R, L].
// Edge i runs from corner i to corner i+1: leg, base, leg.
const EDGE_COLOR = [EQUAL, UNIQUE, EQUAL];
const EDGE_TICK = [true, false, true]; // congruence ticks only on the equal legs
const CORNER_COLOR = [UNIQUE, EQUAL, EQUAL];

function render(): void {
  ctx.clearRect(0, 0, W, H);
  const cs = corners();

  drawBody(cs);
  for (let i = 0; i < 3; i++) drawSide(cs[i], cs[(i + 1) % 3], EDGE_COLOR[i], EDGE_TICK[i]);
  for (let i = 0; i < 3; i++) drawAngle(cs[i], cs[(i + 1) % 3], cs[(i + 2) % 3], CORNER_COLOR[i]);
  drawKnob(cs[0]); // apex
  drawKnob(cs[1]); // one base corner
  drawCaption(cs);
}

function drawBody(cs: Vec[]): void {
  // A neutral fill lets the two accent colours read cleanly on the edges.
  ctx.beginPath();
  ctx.moveTo(cs[0].x, cs[0].y);
  ctx.lineTo(cs[1].x, cs[1].y);
  ctx.lineTo(cs[2].x, cs[2].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();

  // Coloured edges are drawn per-side in drawSide; here we only lay a soft
  // shadow under the whole outline for depth.
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.001)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** One side: its coloured stroke, an optional congruence tick at the midpoint,
 *  and a length label laid parallel to the side, just outside the body. */
function drawSide(p: Vec, q: Vec, color: string, tick: boolean): void {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();

  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const along = unit({ x: q.x - p.x, y: q.y - p.y });
  const outward = unit({ x: m.x - center.x, y: m.y - center.y });

  if (tick) {
    ctx.beginPath();
    ctx.moveTo(m.x - outward.x * 8, m.y - outward.y * 8);
    ctx.lineTo(m.x + outward.x * 8, m.y + outward.y * 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

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
  ctx.fillStyle = color;
  ctx.fillText((dist(p, q) / UNIT_PX).toFixed(1), 0, 0);
  ctx.restore();
}

/** One corner: a coloured arc + its live degree, drawn inside the body. Base
 *  corners share EQUAL, so their matching colour + matching number show the
 *  base-angles-are-equal theorem directly. */
function drawAngle(v: Vec, p: Vec, q: Vec, color: string): void {
  const toP = unit({ x: p.x - v.x, y: p.y - v.y });
  const toQ = unit({ x: q.x - v.x, y: q.y - v.y });
  const r = clamp(Math.min(h, b) * 0.28, 16, 34);
  const a1 = Math.atan2(toP.y, toP.x);
  let delta = Math.atan2(toQ.y, toQ.x) - a1;
  while (delta <= -Math.PI) delta += TWO_PI;
  while (delta > Math.PI) delta -= TWO_PI;

  ctx.beginPath();
  ctx.arc(v.x, v.y, r, a1, a1 + delta, delta < 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  const mid = a1 + delta / 2;
  const pos = { x: v.x + Math.cos(mid) * (r + 22), y: v.y + Math.sin(mid) * (r + 22) };
  const text = `${Math.round((Math.abs(delta) * 180) / Math.PI)}°`;
  ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  roundRect(pos.x - w / 2 - 7, pos.y - 13, w + 14, 26, 7);
  ctx.fillStyle = "rgba(10,15,22,0.7)";
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, pos.x, pos.y + 1);
}

function drawKnob(v: Vec): void {
  const active = grab !== null;
  const r = active ? 15 : 13;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawCaption(cs: Vec[]): void {
  const baseY = Math.max(cs[0].y, cs[1].y, cs[2].y) + 78;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 32px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = EQUAL;
  ctx.fillText("Isosceles Triangle", center.x, baseY);
  ctx.font = "400 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.75)";
  ctx.fillText("two equal sides · two equal base angles", center.x, baseY + 25);
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

// --- loop ----------------------------------------------------------------

function frame(): void {
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
