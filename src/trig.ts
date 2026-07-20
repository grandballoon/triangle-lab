// Trigonometry · One — Naming the Ratios.
//
// One right triangle ABC, right angle at C, with a knob on B that reshapes it
// freely. With respect to the focused acute angle, the opposite leg, adjacent
// leg, and hypotenuse each wear their own color, and the words themselves
// ride the sides. The panel builds all six ratios as colored fractions with
// live lengths and values: sin, cos, tan, and beneath them their three flips
// csc, sec, cot — literally the same fractions upside-down. Click the other
// acute angle and the opposite/adjacent colors trade places on the same
// triangle while the panel shows sin A = cos B with equal live numbers: the
// cofunction identity sin A = cos(90° − A), embodied. The footer computes
// sin² + cos² = (a² + b²)/c² live — always 1, because that IS Pythagoras.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
// only the webcam device and this file's own little vector helpers are involved.

import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

const ACCENT = "#38bdf8"; // header + focused angle
const OPP = "#ff6b6b"; // the opposite leg
const ADJ = "#4dabf7"; // the adjacent leg
const HYP = "#ffd43b"; // the hypotenuse
const EDGE = "#eef4fb";
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const LEG_A_MIN = 1.0; // BC, vertical
const LEG_A_MAX = 3.2;
const LEG_B_MIN = 1.6; // AC, horizontal
const LEG_B_MAX = 4.6;

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

// --- helpers ---------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);

const ptA = (): Vec => originA;
const ptC = (): Vec => ({ x: originA.x + legB * unit, y: originA.y });
const ptB = (): Vec => ({ x: originA.x + legB * unit, y: originA.y - legA * unit });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const figureW = W - PANEL_W - 90; // the panel owns the right side
  unit = Math.min((figureW - 60) / LEG_B_MAX, (H - TOP_MARGIN - 170) / LEG_A_MAX);
  originA = { x: 48, y: TOP_MARGIN + 60 + LEG_A_MAX * unit };
}

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  if (dist(p, ptB()) <= GRAB_RADIUS) {
    dragging = true;
    canvas.classList.add("grabbing");
    canvas.setPointerCapture(e.pointerId);
    drive(p);
    return;
  }
  // Clicking near an acute angle (but not on the knob) moves the focus there.
  if (dist(p, ptA()) <= 80) focus = "A";
  else if (dist(p, ptB()) <= 80) focus = "B";
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
  legB = clamp((p.x - originA.x) / unit, LEG_B_MIN, LEG_B_MAX);
  legA = clamp((originA.y - p.y) / unit, LEG_A_MIN, LEG_A_MAX);
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();

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

  // The words ride their sides.
  const vertMidY = (C.y + B.y) / 2;
  const vertWord = focus === "A" ? "opposite" : "adjacent";
  const vertColor = focus === "A" ? OPP : ADJ;
  ctx.save();
  ctx.translate(C.x + 16, vertMidY);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = vertColor;
  ctx.fillText(`${vertWord} · a = ${legA.toFixed(2)}`, 0, 0);
  ctx.restore();

  const horizWord = focus === "A" ? "adjacent" : "opposite";
  const horizColor = focus === "A" ? ADJ : OPP;
  ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = horizColor;
  ctx.fillText(`${horizWord} · b = ${legB.toFixed(2)}`, (A.x + C.x) / 2, A.y + 20);

  ctx.save();
  ctx.translate((A.x + B.x) / 2, (A.y + B.y) / 2);
  ctx.rotate(Math.atan2(B.y - A.y, B.x - A.x));
  ctx.fillStyle = HYP;
  ctx.fillText(`hypotenuse · c = ${hyp.toFixed(2)}`, 0, -14);
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
  drawPanel(hyp, thetaA);
}

/** One acute angle: an arc + degree label, bright when focused. */
function drawAcuteAngle(which: "A" | "B", v: Vec, degrees: number): void {
  const focused = focus === which;
  const r = focused ? 46 : 38;
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

// --- the panel of six ratios ----------------------------------------------

const PANEL_W = 342;
const PANEL_PAD = 14;

function drawPanel(hyp: number, thetaA: number): void {
  const x = W - PANEL_W - 18;
  const y = TOP_MARGIN;
  const h = 366;
  ctx.beginPath();
  ctx.roundRect(x, y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.65)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const theta = focus === "A" ? thetaA : 90 - thetaA;
  const opp = focus === "A" ? legA : legB;
  const adj = focus === "A" ? legB : legA;
  const oppName = focus === "A" ? "a" : "b";
  const adjName = focus === "A" ? "b" : "a";

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let ty = y + PANEL_PAD + 14;

  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  segments(x + PANEL_PAD, ty, [
    [`standing at ∠${focus} = ${theta.toFixed(1)}°`, ACCENT],
  ]);
  ty += 26;

  const mono = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.font = mono;
  const row = (
    name: string,
    top: string,
    bot: string,
    topColor: string,
    botColor: string,
    topLen: number,
    botLen: number,
  ): void => {
    segments(x + PANEL_PAD, ty, [
      [name.padEnd(6), TEXT],
      ["= ", TEXT_DIM],
      [top, topColor],
      ["/", TEXT_DIM],
      [bot.padEnd(4), botColor],
      [" = ", TEXT_DIM],
      [topLen.toFixed(2), topColor],
      ["/", TEXT_DIM],
      [botLen.toFixed(2), botColor],
      [` = ${(topLen / botLen).toFixed(3)}`, TEXT],
    ]);
    ty += 21;
  };

  row(`sin ${focus}`, "opp", "hyp", OPP, HYP, opp, hyp);
  row(`cos ${focus}`, "adj", "hyp", ADJ, HYP, adj, hyp);
  row(`tan ${focus}`, "opp", "adj", OPP, ADJ, opp, adj);

  ty += 4;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("flip each fraction upside-down:", x + PANEL_PAD, ty);
  ty += 20;
  ctx.font = mono;

  row(`csc ${focus}`, "hyp", "opp", HYP, OPP, hyp, opp);
  row(`sec ${focus}`, "hyp", "adj", HYP, ADJ, hyp, adj);
  row(`cot ${focus}`, "adj", "opp", ADJ, OPP, adj, opp);

  ty += 6;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText(`so csc = 1/sin, sec = 1/cos, cot = 1/tan — nothing new,`, x + PANEL_PAD, ty);
  ty += 16;
  ctx.fillText(`just the first three, flipped. (${oppName} is opp, ${adjName} is adj here.)`, x + PANEL_PAD, ty);
  ty += 26;

  // Cofunctions: the same triangle seen from the other corner.
  const other = focus === "A" ? "B" : "A";
  const sinHere = opp / hyp;
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + PANEL_PAD, ty, [
    [`sin ${focus}`, TEXT],
    [" = ", TEXT_DIM],
    [sinHere.toFixed(3), OPP],
    [" = ", TEXT_DIM],
    [`cos ${other}`, TEXT],
    [`   (∠${other} = 90° − ∠${focus})`, TEXT_DIM],
  ]);
  ty += 18;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("my opposite is the other angle's adjacent: sin θ = cos(90° − θ)", x + PANEL_PAD, ty);
  ty += 26;

  // The identity — Pythagoras in trigonometric clothes.
  const a2 = legA * legA;
  const b2 = legB * legB;
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + PANEL_PAD, ty, [
    [`sin²${focus} + cos²${focus}`, TEXT],
    [" = ", TEXT_DIM],
    [`(${a2.toFixed(2)} + ${b2.toFixed(2)})`, TEXT],
    ["/", TEXT_DIM],
    [`${(a2 + b2).toFixed(2)}`, HYP],
    [" = 1", ACCENT],
  ]);
  ty += 18;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("(a² + b²)/c² — the Pythagorean Theorem, wearing new clothes", x + PANEL_PAD, ty);
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
  ctx.arc(v.x, v.y, active ? 15 : 11, 0, TWO_PI);
  ctx.fillStyle = "rgba(233,240,247,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Naming the Ratios", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "drag B to reshape the triangle — click the other acute angle and watch opposite and adjacent trade places",
    W / 2,
    48,
  );
}

// --- loop ------------------------------------------------------------------

function frame(): void {
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
