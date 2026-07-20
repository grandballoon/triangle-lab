// Constraints · Two — The Pythagorean Theorem.
//
// Left: one right triangle (right angle at C) with a knob on each acute
// vertex and a square built outward on every side, each labeled with its
// live area. A panel keeps a² + b² = c² running with the real numbers.
// Right: the proof. A single big square of side a + b holds four congruent
// copies of the triangle; a scrub knob slides them — by pure translation —
// between two packings. At one end the leftover space is visibly the two
// squares a² and b²; at the other end it is the one tilted square c².
// Same box, same four triangles, so the leftovers must be equal.
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
  age: number; // seconds since it fired
}

const ACCENT = "#ffd43b"; // header, hypotenuse & its square
const A_COLOR = "#4dabf7"; // leg a and its square
const B_COLOR = "#38d9a9"; // leg b and its square
const EDGE = "#eef4fb";
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const LEG_MIN = 1.2;
const LEG_MAX = 3.0;
const PULSE_LIFE = 0.6;
const SNAP_T = 0.06; // scrub snaps flush to its ends inside this margin

// --- state -----------------------------------------------------------------

let legA = 1.5; // a = BC, the vertical leg
let legB = 2.0; // b = AC, the horizontal leg
let scrub = 0; // 0 = two squares (a² + b²), 1 = tilted square (c²)
let atEnd: 0 | 1 | -1 = 0; // which scrub end we're resting at (for the pulse)
let drag: "A" | "B" | "scrub" | null = null;
let pulses: Pulse[] = [];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;

// --- small helpers ---------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- layout ----------------------------------------------------------------
//
// Scales are pinned to the LARGEST the figures can grow (legs up to LEG_MAX),
// so dragging a knob never rescales the world under the pointer.

let unitL = 1; // px per unit, left figure
let unitR = 1; // px per unit, right (proof) figure
let originC: Vec = { x: 0, y: 0 }; // screen position of vertex C
let proofCenter: Vec = { x: 0, y: 0 }; // screen center of the proof square
let track = { x0: 0, x1: 0, y: 0 }; // the scrub rail

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const usableH = H - TOP_MARGIN;

  // Left band. Extents in units: x ∈ [−a, a+b] (left square … hyp square),
  // y ∈ [−(a+b), b] — with both legs at LEG_MAX that's 3·max wide and tall.
  const bandW = W * 0.52;
  unitL = Math.min(bandW / (3 * LEG_MAX + 0.9), usableH / (3 * LEG_MAX + 1.1));
  originC = {
    x: bandW / 2 - ((LEG_MAX + 2 * LEG_MAX) / 2 - LEG_MAX) * unitL,
    y: TOP_MARGIN + usableH / 2 + ((2 * LEG_MAX + LEG_MAX) / 2 - LEG_MAX) * unitL,
  };

  // Right band: the proof square (side up to 2·LEG_MAX) plus the rail below.
  const bandX = W * 0.52;
  const bandW2 = W - bandX;
  unitR = Math.min((bandW2 * 0.86) / (2 * LEG_MAX), (usableH * 0.74) / (2 * LEG_MAX));
  proofCenter = { x: bandX + bandW2 / 2, y: TOP_MARGIN + usableH * 0.44 };
  track = {
    x0: proofCenter.x - 120,
    x1: proofCenter.x + 120,
    y: proofCenter.y + LEG_MAX * unitR + 46,
  };
}

// --- the main triangle (unit coords, C at the origin, y down) --------------

const vertexA = (): Vec => ({ x: legB, y: 0 });
const vertexB = (): Vec => ({ x: 0, y: -legA });

const toScreenL = (p: Vec): Vec => ({
  x: originC.x + p.x * unitL,
  y: originC.y + p.y * unitL,
});

/** Square built on segment p→q, extruded along the outward normal n. */
function squareOn(p: Vec, q: Vec, n: Vec, side: number): Vec[] {
  return [p, q, { x: q.x + n.x * side, y: q.y + n.y * side }, { x: p.x + n.x * side, y: p.y + n.y * side }];
}

// --- the proof square (unit coords, top-left origin, y down) ---------------
//
// Corner poses (scrub = 1): the four triangles hug the corners and the
// leftover is the tilted c² square. Sliding each one by its own fixed offset
// (scrub = 0) pairs them into two a×b rectangles, leaving the squares a², b².
// Every move is a pure translation — that's what makes the scrub honest.

interface ProofTri {
  corner: Vec[]; // pose at scrub = 1
  slide: Vec; // where it sits at scrub = 0, relative to `corner`
}

function proofTris(): ProofTri[] {
  const a = legA;
  const b = legB;
  const s = a + b;
  return [
    { corner: [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: 0, y: b }], slide: { x: 0, y: a } },
    { corner: [{ x: s, y: 0 }, { x: s, y: a }, { x: a, y: 0 }], slide: { x: 0, y: 0 } },
    { corner: [{ x: s, y: s }, { x: b, y: s }, { x: s, y: a }], slide: { x: -b, y: 0 } },
    { corner: [{ x: 0, y: s }, { x: 0, y: b }, { x: b, y: s }], slide: { x: a, y: -b } },
  ];
}

const toScreenR = (p: Vec): Vec => {
  const s = legA + legB;
  return {
    x: proofCenter.x + (p.x - s / 2) * unitR,
    y: proofCenter.y + (p.y - s / 2) * unitR,
  };
};

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function scrubKnobPos(): Vec {
  return { x: track.x0 + (track.x1 - track.x0) * scrub, y: track.y };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  const candidates: { name: "A" | "B" | "scrub"; at: Vec }[] = [
    { name: "A", at: toScreenL(vertexA()) },
    { name: "B", at: toScreenL(vertexB()) },
    { name: "scrub", at: scrubKnobPos() },
  ];
  for (const c of candidates) {
    if (dist(p, c.at) <= GRAB_RADIUS) {
      drag = c.name;
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
  if (drag === "A") {
    legB = clamp((p.x - originC.x) / unitL, LEG_MIN, LEG_MAX);
  } else if (drag === "B") {
    legA = clamp((originC.y - p.y) / unitL, LEG_MIN, LEG_MAX);
  } else if (drag === "scrub") {
    let t = clamp((p.x - track.x0) / (track.x1 - track.x0), 0, 1);
    if (t < SNAP_T) t = 0;
    if (t > 1 - SNAP_T) t = 1;
    scrub = t;
    const end: 0 | 1 | -1 = t === 0 ? 0 : t === 1 ? 1 : -1;
    if (end !== -1 && end !== atEnd) {
      pulses.push({ center: scrubKnobPos(), age: 0 });
    }
    atEnd = end;
  }
}

// --- rendering: the main triangle ------------------------------------------

function renderTriangle(): void {
  const A = vertexA();
  const B = vertexB();
  const C = { x: 0, y: 0 };
  const c = Math.hypot(legA, legB);

  // Outward normals: below the base, left of the vertical leg, and away
  // from C for the hypotenuse.
  const squares: { pts: Vec[]; color: string; label: string; area: number }[] = [
    { pts: squareOn(C, A, { x: 0, y: 1 }, legB), color: B_COLOR, label: "b²", area: legB * legB },
    { pts: squareOn(B, C, { x: -1, y: 0 }, legA), color: A_COLOR, label: "a²", area: legA * legA },
    {
      pts: squareOn(A, B, { x: legA / c, y: -legB / c }, c),
      color: ACCENT,
      label: "c²",
      area: c * c,
    },
  ];

  for (const sq of squares) {
    const s = sq.pts.map(toScreenL);
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(s[i].x, s[i].y);
    ctx.closePath();
    ctx.fillStyle = rgba(sq.color, 0.14);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(sq.color, 0.85);
    ctx.stroke();

    const gx = (s[0].x + s[1].x + s[2].x + s[3].x) / 4;
    const gy = (s[0].y + s[1].y + s[2].y + s[3].y) / 4;
    ctx.font = "700 17px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = sq.color;
    ctx.fillText(sq.label, gx, gy - 11);
    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = rgba(sq.color, 0.9);
    ctx.fillText(`= ${sq.area.toFixed(2)}`, gx, gy + 10);
  }

  // The triangle body on top of the squares.
  const sA = toScreenL(A);
  const sB = toScreenL(B);
  const sC = toScreenL(C);
  ctx.beginPath();
  ctx.moveTo(sA.x, sA.y);
  ctx.lineTo(sB.x, sB.y);
  ctx.lineTo(sC.x, sC.y);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = EDGE;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Right-angle marker at C.
  const m = 14;
  ctx.beginPath();
  ctx.moveTo(sC.x + m, sC.y);
  ctx.lineTo(sC.x + m, sC.y - m);
  ctx.lineTo(sC.x, sC.y - m);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();

  // Side labels ride their sides, tucked toward the triangle's interior.
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = B_COLOR;
  ctx.fillText(`b = ${legB.toFixed(2)}`, (sC.x + sA.x) / 2, sC.y - 14);
  ctx.save();
  ctx.translate(sC.x + 14, (sC.y + sB.y) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = A_COLOR;
  ctx.fillText(`a = ${legA.toFixed(2)}`, 0, 0);
  ctx.restore();
  const hx = (sA.x + sB.x) / 2;
  const hy = (sA.y + sB.y) / 2;
  const cLen = Math.hypot(legA, legB);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(Math.atan2(sB.y - sA.y, sB.x - sA.x) + Math.PI);
  ctx.fillStyle = ACCENT;
  ctx.fillText(`c = ${cLen.toFixed(2)}`, 0, 14);
  ctx.restore();

  // Vertex labels.
  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText("A", sA.x + 16, sA.y + 14);
  ctx.fillText("B", sB.x - 12, sB.y - 12);
  ctx.fillText("C", sC.x - 12, sC.y + 14);

  drawKnob(sA, drag === "A");
  drawKnob(sB, drag === "B");
}

// --- rendering: the proof --------------------------------------------------

function renderProof(): void {
  const a = legA;
  const b = legB;
  const s = a + b;

  // The box itself, with the a | b split ticked along the top edge.
  const tl = toScreenR({ x: 0, y: 0 });
  const br = toScreenR({ x: s, y: s });
  ctx.beginPath();
  ctx.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  ctx.fillStyle = "rgba(6,10,16,0.35)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(233,240,247,0.7)";
  ctx.stroke();

  const split = toScreenR({ x: a, y: 0 });
  ctx.beginPath();
  ctx.moveTo(split.x, split.y - 6);
  ctx.lineTo(split.x, split.y + 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = TEXT_DIM;
  ctx.stroke();
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = A_COLOR;
  ctx.fillText("a", (tl.x + split.x) / 2, tl.y - 8);
  ctx.fillStyle = B_COLOR;
  ctx.fillText("b", (split.x + br.x) / 2, tl.y - 8);

  // Leftover-region tints fade in at the scrub's ends, under the triangles.
  const showA = 1 - clamp(scrub / 0.2, 0, 1); // two-squares end
  const showC = clamp((scrub - 0.8) / 0.2, 0, 1); // tilted-square end
  if (showA > 0) {
    tintQuad([{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: a }, { x: 0, y: a }], A_COLOR, 0.3 * showA);
    tintQuad([{ x: a, y: a }, { x: s, y: a }, { x: s, y: s }, { x: a, y: s }], B_COLOR, 0.3 * showA);
    labelAt({ x: a / 2, y: a / 2 }, "a²", A_COLOR, showA);
    labelAt({ x: (a + s) / 2, y: (a + s) / 2 }, "b²", B_COLOR, showA);
  }
  if (showC > 0) {
    tintQuad([{ x: a, y: 0 }, { x: s, y: a }, { x: b, y: s }, { x: 0, y: b }], ACCENT, 0.3 * showC);
    labelAt({ x: s / 2, y: s / 2 }, "c²", ACCENT, showC);
    // One side of the tilted square is a hypotenuse — say so.
    const m1 = toScreenR({ x: a / 2, y: b / 2 });
    ctx.save();
    ctx.translate(m1.x - 10, m1.y - 10);
    ctx.rotate(Math.atan2(-b, a));
    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = rgba(ACCENT, showC);
    ctx.fillText("c", 0, -4);
    ctx.restore();
  }

  // The four congruent triangles, translated by their scrub offsets.
  for (const tri of proofTris()) {
    const off = { x: tri.slide.x * (1 - scrub), y: tri.slide.y * (1 - scrub) };
    const pts = tri.corner.map((p) => toScreenR({ x: p.x + off.x, y: p.y + off.y }));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = EDGE;
    ctx.stroke();
  }

  // The rail and its knob.
  ctx.beginPath();
  ctx.moveTo(track.x0, track.y);
  ctx.lineTo(track.x1, track.y);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(233,240,247,0.25)";
  ctx.stroke();
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("a² + b²", track.x0 - 34, track.y + 4);
  ctx.fillText("c²", track.x1 + 20, track.y + 4);
  drawKnob(scrubKnobPos(), drag === "scrub");

  // Caption under the rail.
  ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  let caption: string;
  if (scrub === 0) caption = "four triangles — the leftover space is a² + b²";
  else if (scrub === 1) caption = "the SAME four triangles — the leftover space is c²";
  else caption = "same box, same four triangles: the leftovers must be equal";
  ctx.fillStyle = scrub === 0 || scrub === 1 ? ACCENT : TEXT_DIM;
  ctx.fillText(caption, (track.x0 + track.x1) / 2, track.y + 30);
}

function tintQuad(pts: Vec[], color: string, alpha: number): void {
  const s = pts.map(toScreenR);
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
}

function labelAt(p: Vec, text: string, color: string, alpha: number): void {
  const at = toScreenR(p);
  ctx.font = "700 19px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillText(text, at.x, at.y);
}

// --- panel, header, chrome -------------------------------------------------

function drawPanel(): void {
  const x = 18;
  const y = TOP_MARGIN;
  const w = 252;
  const h = 118;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.6)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const a2 = legA * legA;
  const b2 = legB * legB;
  const c2 = a2 + b2;
  const pad = 14;
  let ty = y + pad + 14;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = "700 17px ui-sans-serif, system-ui, sans-serif";
  segments(x + pad, ty, [
    ["a²", A_COLOR],
    [" + ", TEXT],
    ["b²", B_COLOR],
    [" = ", TEXT],
    ["c²", ACCENT],
  ]);
  ty += 26;
  ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  segments(x + pad, ty, [
    [a2.toFixed(2), A_COLOR],
    [" + ", TEXT],
    [b2.toFixed(2), B_COLOR],
    [" = ", TEXT],
    [c2.toFixed(2), ACCENT],
  ]);
  ty += 24;
  segments(x + pad, ty, [
    ["c = √", TEXT],
    [c2.toFixed(2), ACCENT],
    [` = ${Math.sqrt(c2).toFixed(2)}`, TEXT],
  ]);
  ty += 26;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("drag the corner knobs · scrub the proof", x + pad, ty);
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

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("The Pythagorean Theorem", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "the two leg squares hold exactly as much room as the hypotenuse square — scrub the proof and watch",
    W / 2,
    48,
  );
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

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 40, 0, TWO_PI);
  ctx.lineWidth = 3 * (1 - t) + 1;
  ctx.strokeStyle = rgba(ACCENT, 1 - t);
  ctx.stroke();
}

// --- loop ------------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);
  drawHeader();
  renderTriangle();
  renderProof();
  for (const p of pulses) drawPulse(p);
  drawPanel();
}

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
