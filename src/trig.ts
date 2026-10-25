// Trigonometry · One — Naming the Ratios.
//
// One right triangle ABC, right angle at C, with a knob on B that reshapes it
// freely. With respect to the focused acute angle, the opposite leg, adjacent
// leg, and hypotenuse each wear their own color, and the words themselves
// ride the sides. The formula band below builds all six ratios as fractions
// with live lengths and values: sin, cos, tan, then their three flips csc,
// sec, cot — literally the same fractions upside-down. Click the other acute
// angle and the opposite/adjacent colors trade places on the same triangle
// while the band shows sin A = cos B with equal live numbers: the cofunction
// identity sin A = cos(90° − A), embodied. Its last row computes
// sin² + cos² = (a² + b²)/c² live — always 1, because that IS Pythagoras.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
// only the webcam device, the page's formula band, the small-screen helpers
// and this file's own little vector helpers are involved.

import { formulaBand } from "./chrome.ts";
import { fillFitted, grabRadius } from "./fit.ts";
import { capturePointer, releasePointer } from "./pointer.ts";
import { trigReadouts } from "./readouts.ts";
import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

const ACCENT = "#38bdf8"; // focused angle
const OPP = "#ff6b6b"; // the opposite leg
const ADJ = "#4dabf7"; // the adjacent leg
const HYP = "#ffd43b"; // the hypotenuse
const EDGE = "#eef4fb";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const LEG_A_MIN = 1.0; // BC, vertical
const LEG_A_MAX = 3.2;
const LEG_B_MIN = 1.6; // AC, horizontal
const LEG_B_MAX = 4.6;
const MIN_UNIT = 24; // px per unit, however cramped the window
// Room around the triangle for its labels and knob, in screen px.
const PAD_X = 44;
const PAD_Y = 42;
const FOCUS_RADIUS = 80; // a click this near an acute angle stands there
const LABEL_SPILL = 30; // how far a side's label may run past the side's ends, px

const SIDE_LABEL = { font: (px: number): string => `700 ${px}px ui-sans-serif, system-ui, sans-serif`, size: 14 };

// --- state -----------------------------------------------------------------

let legA = 2.0; // a = BC
let legB = 3.2; // b = AC
let focus: "A" | "B" = "A";
let dragging = false;

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let unit = 1;
let originA: Vec = { x: 0, y: 0 }; // screen position of A
const showFormulas = formulaBand();

// --- helpers ---------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);

const ptA = (): Vec => originA;
const ptC = (): Vec => ({ x: originA.x + legB * unit, y: originA.y });
const ptB = (): Vec => ({ x: originA.x + legB * unit, y: originA.y - legA * unit });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Sized and centred for the largest the triangle can grow, so a drag never
  // rescales it. Floored so a narrow window shrinks the figure rather than
  // inverting it.
  const usableH = H - TOP_MARGIN;
  unit = Math.max(MIN_UNIT, Math.min((W - 2 * PAD_X) / LEG_B_MAX, (usableH - 2 * PAD_Y) / LEG_A_MAX));
  originA = {
    x: (W - LEG_B_MAX * unit) / 2,
    y: TOP_MARGIN + (usableH + LEG_A_MAX * unit) / 2,
  };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, ptB()) <= grabRadius(e.pointerType, GRAB_RADIUS)) {
    dragging = true;
    canvas.classList.add("grabbing");
    capturePointer(canvas, e);
    drive(p);
    return;
  }
  // Clicking near an acute angle (but not on the knob) moves the focus there.
  if (dist(p, ptA()) <= FOCUS_RADIUS) focus = "A";
  else if (dist(p, ptB()) <= FOCUS_RADIUS) focus = "B";
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
  legB = clamp((p.x - originA.x) / unit, LEG_B_MIN, LEG_B_MAX);
  legA = clamp((originA.y - p.y) / unit, LEG_A_MIN, LEG_A_MAX);
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);

  const A = ptA();
  const B = ptB();
  const C = ptC();
  const hyp = Math.hypot(legA, legB);
  const thetaA = Math.atan2(legA, legB) / DEG;

  // Which leg is opposite / adjacent depends on where we stand.
  const oppSide: [Vec, Vec] = focus === "A" ? [C, B] : [A, C];
  const adjSide: [Vec, Vec] = focus === "A" ? [A, C] : [C, B];

  // Body.
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(C.x, C.y);
  ctx.lineTo(B.x, B.y);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  strokeSegment(adjSide[0], adjSide[1], ADJ, 5);
  strokeSegment(oppSide[0], oppSide[1], OPP, 5);
  strokeSegment(A, B, HYP, 5);

  // Right-angle marker at C.
  const m = 14;
  ctx.beginPath();
  ctx.moveTo(C.x - m, C.y);
  ctx.lineTo(C.x - m, C.y - m);
  ctx.lineTo(C.x, C.y - m);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = EDGE;
  ctx.stroke();

  // The words ride their sides, shrinking to fit a short one.
  const vertWord = focus === "A" ? "opposite" : "adjacent";
  const horizWord = focus === "A" ? "adjacent" : "opposite";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(C.x + 16, (C.y + B.y) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = focus === "A" ? OPP : ADJ;
  fillFitted(ctx, `${vertWord} · a = ${legA.toFixed(2)}`, 0, 0, dist(B, C) + LABEL_SPILL, SIDE_LABEL);
  ctx.restore();

  ctx.fillStyle = focus === "A" ? ADJ : OPP;
  fillFitted(ctx, `${horizWord} · b = ${legB.toFixed(2)}`, (A.x + C.x) / 2, A.y + 20, dist(A, C) + LABEL_SPILL, SIDE_LABEL);

  ctx.save();
  ctx.translate((A.x + B.x) / 2, (A.y + B.y) / 2);
  ctx.rotate(Math.atan2(B.y - A.y, B.x - A.x));
  ctx.fillStyle = HYP;
  fillFitted(ctx, `hypotenuse · c = ${hyp.toFixed(2)}`, 0, -14, dist(A, B) + LABEL_SPILL, SIDE_LABEL);
  ctx.restore();

  // The two acute angles: focused one bright, the other a clickable dim arc.
  drawAcuteAngle("A", A, thetaA);
  drawAcuteAngle("B", B, 90 - thetaA);

  // Vertex letters.
  ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.75)";
  ctx.fillText("A", A.x - 16, A.y + 14);
  ctx.fillText("B", B.x + 14, B.y - 12);
  ctx.fillText("C", C.x + 14, C.y + 14);

  drawKnob(ptB(), dragging);
}

/** One acute angle: an arc + degree label, bright when focused. */
function drawAcuteAngle(which: "A" | "B", v: Vec, degrees: number): void {
  const focused = focus === which;
  // Inside the shorter leg, however small the triangle is drawn.
  const r = clamp(Math.min(legA, legB) * unit * 0.45, 20, focused ? 46 : 38);
  ctx.beginPath();
  if (which === "A") {
    // At A the angle opens upward from the base toward the hypotenuse.
    ctx.arc(v.x, v.y, r, -degrees * DEG, 0);
  } else {
    // At B it opens from the vertical leg (straight down, π/2) around to the
    // hypotenuse direction toward A.
    const toA = Math.atan2(ptA().y - v.y, ptA().x - v.x);
    ctx.arc(v.x, v.y, r, Math.PI / 2, toA);
  }
  ctx.lineWidth = focused ? 3.5 : 2;
  ctx.strokeStyle = focused ? ACCENT : "rgba(233,240,247,0.35)";
  ctx.stroke();

  const mid = which === "A" ? (-degrees * DEG) / 2 : (Math.atan2(ptA().y - v.y, ptA().x - v.x) + Math.PI / 2) / 2;
  const lx = v.x + Math.cos(mid) * (r + 24);
  const ly = v.y + Math.sin(mid) * (r + 18);
  ctx.font = focused
    ? "700 14px ui-monospace, SFMono-Regular, Menlo, monospace"
    : "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = focused ? ACCENT : TEXT_DIM;
  ctx.fillText(`∠${which} = ${degrees.toFixed(1)}°`, lx, ly);
  if (!focused) {
    ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("click to stand here", lx, ly + 15);
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
  ctx.arc(v.x, v.y, active ? 15 : 11, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

// --- loop ------------------------------------------------------------------

function frame(): void {
  render();
  showFormulas(trigReadouts({ focus, a: legA, b: legB }));
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
