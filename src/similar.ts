// Matching · Two — Similar Triangles: same angles, same ratios.
//
// One acute angle θ sits at A between a horizontal base ray and a tilted
// hypotenuse ray, with a dial knob on its arc. Dropping a perpendicular from
// any point of the tilted ray makes a right triangle, and every such triangle
// shares the angles 90°, θ, 90°−θ — AA similarity made visible by the
// parallel vertical legs. Two sample triangles sit at fixed spots on the ray;
// a third belongs to the user via a knob that slides along the ray. The
// formula band below works out each ratio opp/hyp, adj/hyp, opp/adj in all
// three triangles side by side: slide the knob and the sides churn while each
// ratio holds still; turn the dial and all three move together. The ratio
// belongs to the ANGLE — a function of θ worth naming, which is the next
// lesson.
//
// Self-contained on purpose, matching perimeter.ts / inequality.ts / etc. —
// only the webcam device, the page's formula band, the small-screen helpers
// and this file's own little vector helpers are involved.

import { formulaBand } from "./chrome.ts";
import { grabRadius, nearest } from "./fit.ts";
import { capturePointer, releasePointer } from "./pointer.ts";
import { similarReadouts } from "./readouts.ts";
import { startWebcam } from "./webcam.ts";

interface Vec {
  x: number;
  y: number;
}

interface Pulse {
  center: Vec; // screen coords
  age: number;
}

const ACCENT = "#2dd4bf"; // the user's triangle
const SAMPLE = "rgba(233,240,247,0.5)"; // the two fixed triangles
const RIGHT = "#ffd43b"; // right-angle markers
const TEXT = "rgba(233,240,247,0.85)";
const TEXT_DIM = "rgba(233,240,247,0.55)";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const TOP_MARGIN = 64;
const GRAB_RADIUS = 26;
const PULSE_LIFE = 0.6;

const THETA_MIN = 15 * DEG;
const THETA_MAX = 72 * DEG;
const R_MIN = 1.6;
const R_MAX = 6.9;
const SAMPLES = [2.2, 3.9]; // fixed hypotenuse lengths of the two samples
const DIAL_R = 1.05; // radius (units) of the dial arc
const SNAP_DEGS = [30, 45, 60]; // the dial leans onto the angles coming next
const SNAP_IN = 1.3; // degrees
// Room around the figure for its labels, in screen px: θ and the dial's
// ticks left of A, "opp" right of the widest foot, "adj" under the base and
// each triangle's name over its apex.
const PAD_LEFT = 34;
const PAD_RIGHT = 84;
const PAD_TOP = 36;
const PAD_BOTTOM = 32;
const KNOB_GAP = 44; // px the slide knob keeps from the dial knob on the same ray

// --- state -----------------------------------------------------------------

let theta = 34 * DEG;
let rUser = 5.6;
let drag: "dial" | "size" | null = null;
let lastSnap = -1; // which SNAP_DEGS we're resting on, for the pulse
let pulses: Pulse[] = [];

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let W = 0;
let H = 0;
let unit = 1;
let origin: Vec = { x: 0, y: 0 }; // screen position of A
const showFormulas = formulaBand();

// --- helpers ---------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const hypDir = (): Vec => ({ x: Math.cos(theta), y: -Math.sin(theta) });

/** Apex of the triangle with hypotenuse r; its foot is directly below. */
const apexOf = (r: number): Vec => ({ x: origin.x + r * Math.cos(theta) * unit, y: origin.y - r * Math.sin(theta) * unit });
const footOf = (r: number): Vec => ({ x: origin.x + r * Math.cos(theta) * unit, y: origin.y });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Room for the widest (θ = 15°) and tallest (θ = 72°) the ray can reach,
  // centred in the canvas.
  const reachW = R_MAX * Math.cos(THETA_MIN) + 0.6;
  const reachH = R_MAX * Math.sin(THETA_MAX) + 0.4;
  const usableW = W - PAD_LEFT - PAD_RIGHT;
  const usableH = H - TOP_MARGIN - PAD_TOP - PAD_BOTTOM;
  unit = Math.min(usableW / reachW, usableH / reachH);
  origin = {
    x: PAD_LEFT + (usableW - reachW * unit) / 2,
    y: H - PAD_BOTTOM - (usableH - reachH * unit) / 2,
  };
  rUser = clamp(rUser, rMin(), R_MAX);
}

/** The shortest the learner's hypotenuse may be: its knob stays clear of the dial's. */
const rMin = (): number => Math.max(R_MIN, DIAL_R + KNOB_GAP / unit);

// --- interaction -----------------------------------------------------------

function pointer(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function dialKnobPos(): Vec {
  return {
    x: origin.x + Math.cos(theta) * DIAL_R * unit,
    y: origin.y - Math.sin(theta) * DIAL_R * unit,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointer(e);
  const hit = nearest(p, [apexOf(rUser), dialKnobPos()], grabRadius(e.pointerType, GRAB_RADIUS));
  if (hit < 0) return;
  drag = hit === 0 ? "size" : "dial";
  canvas.classList.add("grabbing");
  capturePointer(canvas, e);
  drive(p);
});

canvas.addEventListener("pointermove", (e) => {
  if (drag) drive(pointer(e));
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  drag = null;
  canvas.classList.remove("grabbing");
  releasePointer(canvas, e);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function drive(p: Vec): void {
  if (drag === "size") {
    // Project the pointer onto the hypotenuse ray.
    const d = hypDir();
    const along = ((p.x - origin.x) * d.x + (p.y - origin.y) * d.y) / unit;
    rUser = clamp(along, rMin(), R_MAX);
    return;
  }
  if (drag === "dial") {
    let t = Math.atan2(origin.y - p.y, p.x - origin.x);
    t = clamp(t, THETA_MIN, THETA_MAX);
    // Lean gently onto the angles the next lessons will derive exactly.
    let snap = -1;
    for (let i = 0; i < SNAP_DEGS.length; i++) {
      if (Math.abs(t / DEG - SNAP_DEGS[i]) <= SNAP_IN) {
        t = SNAP_DEGS[i] * DEG;
        snap = i;
        break;
      }
    }
    if (snap !== -1 && snap !== lastSnap) {
      pulses.push({ center: dialKnobPos(), age: 0 });
    }
    lastSnap = snap;
    theta = t;
  }
}

// --- rendering -------------------------------------------------------------

function render(): void {
  ctx.clearRect(0, 0, W, H);

  const d = hypDir();
  const rayEnd = { x: origin.x + d.x * (R_MAX + 0.35) * unit, y: origin.y + d.y * (R_MAX + 0.35) * unit };
  const baseEnd = { x: origin.x + (R_MAX * Math.cos(THETA_MIN) + 0.35) * unit, y: origin.y };

  // The two rays that make the angle.
  strokeSegment(origin, baseEnd, "rgba(233,240,247,0.3)", 2);
  strokeSegment(origin, rayEnd, "rgba(233,240,247,0.3)", 2);

  // Sample triangles, then the user's on top.
  for (let i = 0; i < SAMPLES.length; i++) drawTriangle(SAMPLES[i], false, `△${i + 1}`);
  drawTriangle(rUser, true, "yours");

  drawDial();
  for (const p of pulses) drawPulse(p);
}

function drawTriangle(r: number, mine: boolean, label: string): void {
  const apex = apexOf(r);
  const foot = footOf(r);
  const color = mine ? ACCENT : SAMPLE;

  if (mine) {
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.lineTo(apex.x, apex.y);
    ctx.closePath();
    ctx.fillStyle = rgba(ACCENT, 0.1);
    ctx.fill();
  }

  strokeSegment(origin, apex, color, mine ? 4 : 2); // hypotenuse
  strokeSegment(origin, foot, color, mine ? 4 : 2); // adjacent
  strokeSegment(foot, apex, color, mine ? 4 : 2); // opposite (vertical)

  // Right-angle marker at the foot — the shared 90° that makes AA work.
  const m = mine ? 13 : 9;
  ctx.beginPath();
  ctx.moveTo(foot.x - m, foot.y);
  ctx.lineTo(foot.x - m, foot.y - m);
  ctx.lineTo(foot.x, foot.y - m);
  ctx.lineWidth = 2;
  ctx.strokeStyle = mine ? RIGHT : "rgba(255,212,59,0.5)";
  ctx.stroke();

  ctx.font = mine
    ? "700 13px ui-sans-serif, system-ui, sans-serif"
    : "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = mine ? ACCENT : TEXT_DIM;
  ctx.fillText(label, apex.x, apex.y - 16);

  if (mine) {
    const opp = r * Math.sin(theta);
    const adj = r * Math.cos(theta);
    ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = TEXT;
    ctx.textAlign = "left";
    ctx.fillText(`opp ${opp.toFixed(2)}`, foot.x + 8, (foot.y + apex.y) / 2);
    ctx.textAlign = "center";
    ctx.fillText(`adj ${adj.toFixed(2)}`, (origin.x + foot.x) / 2, foot.y + 18);
    ctx.save();
    ctx.translate((origin.x + apex.x) / 2, (origin.y + apex.y) / 2);
    ctx.rotate(-theta);
    ctx.fillText(`hyp ${r.toFixed(2)}`, 0, -8);
    ctx.restore();
    drawKnob(apex, drag === "size");
  }
}

function drawDial(): void {
  const r = DIAL_R * unit;
  // The arc of θ itself.
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, r, -theta, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();
  // Faint full guide arc with ticks at the angles to come.
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, r, -THETA_MAX, -THETA_MIN);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(233,240,247,0.2)";
  ctx.stroke();
  for (const deg of SNAP_DEGS) {
    const t = deg * DEG;
    const c = Math.cos(t);
    const s = Math.sin(t);
    ctx.beginPath();
    ctx.moveTo(origin.x + c * (r - 5), origin.y - s * (r - 5));
    ctx.lineTo(origin.x + c * (r + 5), origin.y - s * (r + 5));
    ctx.lineWidth = 2;
    ctx.strokeStyle = Math.abs(theta - t) < 0.001 ? ACCENT : "rgba(233,240,247,0.4)";
    ctx.stroke();
    ctx.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(233,240,247,0.45)";
    ctx.fillText(`${deg}°`, origin.x + c * (r + 18), origin.y - s * (r + 18));
  }

  const mid = theta / 2;
  ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ACCENT;
  ctx.fillText(`θ = ${(theta / DEG).toFixed(1)}°`, origin.x + Math.cos(mid) * (r + 34), origin.y - Math.sin(mid) * (r + 20));

  drawKnob(dialKnobPos(), drag === "dial");
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

function drawPulse(p: Pulse): void {
  const t = clamp(p.age / PULSE_LIFE, 0, 1);
  ctx.beginPath();
  ctx.arc(p.center.x, p.center.y, 8 + t * 36, 0, TWO_PI);
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
  showFormulas(similarReadouts(theta / DEG, [rUser, ...SAMPLES]));
  requestAnimationFrame(frame);
}

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
