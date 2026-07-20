// Classifying · Four — Scalene (first, drag-driven implementation).
//
// A free-form triangle with a knob on every vertex — grab any one and drag it
// anywhere. The one rule the figure enforces is the definition of "scalene":
// it may never sit in an equilateral or isosceles state. Whenever a drag would
// bring two sides (and so, two angles) to within a whisker of each other, the
// vertex simply *skips over* that configuration and lands on the far side of
// it, so the triangle can pass through but never rest there.
//
// Because "two equal sides" and "two equal opposite angles" are the same fact,
// guarding the three side lengths against near-equality guards the angles too.
// Colour drives the lesson home the other way: each side and the angle opposite
// it share one of three distinct hues, so the eye reads "every side different,
// every angle different, and the biggest side faces the biggest angle."
//
// Self-contained on purpose, matching equilateral.ts / isosceles.ts — only the
// webcam device and this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

// Three distinct hues, one per side. Nothing is congruent in a scalene
// triangle, so — unlike the equal/unique pairing of the isosceles demo — every
// piece gets its own colour. Edge i and the angle opposite it share a hue.
const SIDE_COLORS = ["#f59e0b", "#22d3ee", "#c084fc"]; // amber · cyan · violet
const LEAD = SIDE_COLORS[0]; // caption / heading accent

const UNIT_PX = 40; // screen pixels per displayed length "unit"
const GRAB_RADIUS = 34;
const TWO_PI = Math.PI * 2;

// How far apart the guard keeps things. Two sides are never allowed within
// EQUAL_TOL pixels of each other (that would read as isosceles), and a vertex
// is never allowed within MIN_HEIGHT pixels of its opposite side (that would
// collapse the triangle toward a degenerate sliver).
const EQUAL_TOL = 26;
const MIN_HEIGHT = 46;
const MIN_SIDE = 70;

// The drag is resolved by marching toward the pointer STEP_PX at a time (fine
// enough to slip cleanly across the thin forbidden bands), capped so a big jump
// stays cheap.
const STEP_PX = 3;
const MAX_STEPS = 320;

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let margin = 90; // keep vertices (and their outside labels) on-screen

// The scalene triangle is stored as three free points — there is no symmetry to
// parametrise, so the vertices simply are the state.
let verts: [Vec, Vec, Vec] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

let grab: number | null = null; // index of the vertex being dragged, if any
let orientSign = 1; // winding sign of the dragged vertex vs its opposite side

// --- geometry ------------------------------------------------------------

const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const centroid = (): Vec => ({
  x: (verts[0].x + verts[1].x + verts[2].x) / 3,
  y: (verts[0].y + verts[1].y + verts[2].y) / 3,
});

// --- layout --------------------------------------------------------------

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  const prevW = W;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  margin = Math.min(90, Math.min(W, H) * 0.16);

  if (prevW === 0) {
    seed();
  } else {
    for (const v of verts) {
      v.x = clamp(v.x, margin, W - margin);
      v.y = clamp(v.y, margin, H - margin);
    }
  }
}

/** A deliberately lopsided starting triangle, scaled to the viewport. Its three
 *  sides are visibly different so it opens already, unambiguously, scalene. */
function seed(): void {
  // These offsets give sides in roughly 1 : 1.6 : 2.1 proportion — decisively
  // scalene, with every pair of sides well outside EQUAL_TOL at any viewport.
  const c: Vec = { x: W / 2, y: H / 2 };
  const s = Math.min(W, H) * 0.32;
  verts = [
    { x: c.x - 0.58 * s, y: c.y - 1.19 * s }, // apex, high and left
    { x: c.x + 1.17 * s, y: c.y + 0.96 * s }, // far bottom right
    { x: c.x - 0.77 * s, y: c.y + 0.12 * s }, // mid left, closer in
  ];
}

// --- interaction ---------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  // Pick the nearest vertex within grabbing range (nearest wins if two overlap).
  let best = -1;
  let bestD = GRAB_RADIUS;
  for (let i = 0; i < 3; i++) {
    const d = dist(p, verts[i]);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return;
  grab = best;
  const [i, j] = others(best);
  orientSign = Math.sign(cross(verts[i], verts[j], verts[best])) || 1;
  canvas.classList.add("grabbing");
  canvas.setPointerCapture(e.pointerId);
  drive(p);
});

canvas.addEventListener("pointermove", (e) => {
  if (grab !== null) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (grab === null) return;
  grab = null;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** The two vertices that are *not* the given one, in order. */
function others(k: number): [number, number] {
  return [(k + 1) % 3, (k + 2) % 3];
}

/** Drag the grabbed vertex toward the pointer, sliding *through* any forbidden
 *  configuration without ever resting on one (see march() for how). */
function drive(p: Vec): void {
  if (grab === null) return;
  const target: Vec = {
    x: clamp(p.x, margin, W - margin),
    y: clamp(p.y, margin, H - margin),
  };
  verts[grab] = march(grab, target);
}

/** True when placing vertex `k` at `a` leaves a legitimately scalene, non-
 *  degenerate triangle. The two other corners P_i, P_j are fixed, so the
 *  opposite side is constant and only the two incident sides vary.
 *
 *  Forbidden (any one of these): the triangle would read isosceles/equilateral
 *  — some pair of sides within EQUAL_TOL of each other — or it would collapse:
 *  a vertex closer than MIN_HEIGHT to its opposite side, an incident side under
 *  MIN_SIDE, or the vertex crossing to the wrong side of the base (which would
 *  flip the winding as it passes through zero area). */
function valid(k: number, a: Vec): boolean {
  const [i, j] = others(k);
  const Pi = verts[i];
  const Pj = verts[j];
  const sOpp = dist(Pi, Pj);
  const di = dist(a, Pi);
  const dj = dist(a, Pj);
  if (di < MIN_SIDE || dj < MIN_SIDE) return false;
  if (Math.abs(di - dj) < EQUAL_TOL) return false;
  if (Math.abs(di - sOpp) < EQUAL_TOL) return false;
  if (Math.abs(dj - sOpp) < EQUAL_TOL) return false;
  const n = unit(perp(sub(Pj, Pi)));
  const height = ((a.x - Pi.x) * n.x + (a.y - Pi.y) * n.y) * orientSign;
  return height >= MIN_HEIGHT;
}

/** Walk the grabbed vertex from where it is now toward the pointer target in
 *  small steps, keeping the furthest step that lands in a valid state.
 *
 *  The vertex's current position is always valid (the seed is, and this is the
 *  only way it ever moves), so marching from it and only ever *recording* valid
 *  samples means the result is valid by construction — the invariant the spec
 *  demands: the triangle "never occupies a state of being equilateral or
 *  isosceles." Forbidden bands are simply stepped over: while the pointer sits
 *  inside one, the vertex waits at the near edge; the instant the pointer
 *  reaches the far side, a valid sample there is recorded and the vertex hops
 *  across — "if its angles or sides approach these ratios it simply skips over
 *  them." When the target itself is valid the vertex lands exactly on it. */
function march(k: number, target: Vec): Vec {
  const from = verts[k];
  const steps = clamp(Math.ceil(dist(from, target) / STEP_PX), 1, MAX_STEPS);
  let landed = from;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const p: Vec = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
    if (valid(k, p)) landed = p;
  }
  return landed;
}

// --- rendering -----------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  const cs = verts;
  const c = centroid();

  drawBody(cs);
  for (let i = 0; i < 3; i++) drawSide(cs[i], cs[(i + 1) % 3], SIDE_COLORS[i], c);
  // Angle at corner i is opposite edge (i+1); they share a colour.
  for (let i = 0; i < 3; i++) {
    drawAngle(cs[i], cs[(i + 1) % 3], cs[(i + 2) % 3], SIDE_COLORS[(i + 1) % 3]);
  }
  for (let i = 0; i < 3; i++) drawKnob(cs[i], grab === i);
  drawCaption(cs);
}

function drawBody(cs: Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(cs[0].x, cs[0].y);
  ctx.lineTo(cs[1].x, cs[1].y);
  ctx.lineTo(cs[2].x, cs[2].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();

  // A soft shadow under the whole outline; the coloured edges go on top.
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.001)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** One side: its own coloured stroke plus a length label laid parallel to the
 *  side, just outside the body. No congruence ticks — nothing is congruent. */
function drawSide(p: Vec, q: Vec, color: string, c: Vec): void {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();

  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const along = unit({ x: q.x - p.x, y: q.y - p.y });
  const outward = unit({ x: m.x - c.x, y: m.y - c.y });
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

/** One corner: a coloured arc + its live degree, drawn inside the body. Each
 *  angle wears the colour of the side facing it, so all three read distinct. */
function drawAngle(v: Vec, p: Vec, q: Vec, color: string): void {
  const toP = unit({ x: p.x - v.x, y: p.y - v.y });
  const toQ = unit({ x: q.x - v.x, y: q.y - v.y });
  const legMin = Math.min(dist(v, p), dist(v, q));
  const r = clamp(legMin * 0.26, 16, 34);
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

function drawKnob(v: Vec, active: boolean): void {
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
  const cx = centroid().x;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 32px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = LEAD;
  ctx.fillText("Scalene Triangle", cx, baseY);
  ctx.font = "400 16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.75)";
  ctx.fillText("no equal sides · no equal angles", cx, baseY + 25);
}

// --- small helpers -------------------------------------------------------

function unit(p: Vec): Vec {
  const l = Math.hypot(p.x, p.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
const perp = (p: Vec): Vec => ({ x: -p.y, y: p.x });

/** Signed area (×2) of triangle A-B-C — its sign is the winding direction. */
function cross(a: Vec, b: Vec, c: Vec): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
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
