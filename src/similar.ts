// Matching · Two — Similar Triangles: same angles, same ratios.
//
// One acute angle θ sits at A between a horizontal base ray and a tilted
// hypotenuse ray, with a dial knob on its arc. Dropping a perpendicular from
// any point of the tilted ray makes a right triangle, and every such triangle
// shares the angles 90°, θ, 90°−θ — AA similarity made visible by the
// parallel vertical legs. Two sample triangles sit at fixed spots on the ray;
// a third belongs to the user via a knob that slides along the ray. The table
// shows each triangle's three sides and the three ratios opp/hyp, adj/hyp,
// opp/adj: slide the knob and the sides churn while the ratio columns hold
// still; turn the dial and all three columns move together. The ratio belongs
// to the ANGLE — a function of θ worth naming, which is the next lesson.
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

const ACCENT = "#2dd4bf"; // the user's triangle + header
const SAMPLE = "rgba(233,240,247,0.5)"; // the two fixed triangles
const RATIO_BG = "#2dd4bf"; // tint behind the frozen ratio columns
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

const hypDir = (): Vec => ({ x: Math.cos(theta), y: -Math.sin(theta) });

/** Apex of the triangle with hypotenuse r; its foot is directly below. */
const apexOf = (r: number): Vec => ({ x: origin.x + r * Math.cos(theta) * unit, y: origin.y - r * Math.sin(theta) * unit });
const footOf = (r: number): Vec => ({ x: origin.x + r * Math.cos(theta) * unit, y: origin.y });

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Room for the tallest (θ = 72°) and widest (θ = 15°) the ray can reach.
  unit = Math.min((W - 120) / (R_MAX * Math.cos(THETA_MIN) + 0.6), (H - TOP_MARGIN - 120) / (R_MAX * Math.sin(THETA_MAX) + 0.4));
  origin = { x: 60, y: H - 60 };
}

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
  if (dist(p, apexOf(rUser)) <= GRAB_RADIUS) {
    drag = "size";
  } else if (dist(p, dialKnobPos()) <= GRAB_RADIUS) {
    drag = "dial";
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
    // Project the pointer onto the hypotenuse ray.
    const d = hypDir();
    const along = ((p.x - origin.x) * d.x + (p.y - origin.y) * d.y) / unit;
    rUser = clamp(along, R_MIN, R_MAX);
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
  drawHeader();

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
  drawPanel();
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

// --- the table -------------------------------------------------------------

const PANEL_X = 18;
const PANEL_Y = 64;
const PANEL_PAD = 12;
const COLS = [46, 52, 52, 52, 62, 62, 62]; // label, opp, adj, hyp, three ratios
const PANEL_W = COLS.reduce((a, b) => a + b, 0) + PANEL_PAD * 2;

function drawPanel(): void {
  const rows = [...SAMPLES, rUser];
  const h = 172;
  ctx.beginPath();
  ctx.roundRect(PANEL_X, PANEL_Y, PANEL_W, h, 12);
  ctx.fillStyle = "rgba(6, 10, 16, 0.6)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  // The tinted slab behind the three ratio columns — the ones that refuse
  // to move while the sides churn.
  const ratioX = PANEL_X + PANEL_PAD + COLS[0] + COLS[1] + COLS[2] + COLS[3];
  const ratioW = COLS[4] + COLS[5] + COLS[6];
  ctx.beginPath();
  ctx.roundRect(ratioX - 6, PANEL_Y + 8, ratioW + 8, h - 66, 8);
  ctx.fillStyle = rgba(RATIO_BG, 0.09);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = PANEL_Y + PANEL_PAD + 12;

  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  const headers = ["", "opp", "adj", "hyp", "opp/hyp", "adj/hyp", "opp/adj"];
  let x = PANEL_X + PANEL_PAD;
  headers.forEach((hdr, i) => {
    ctx.fillStyle = i >= 4 ? ACCENT : TEXT_DIM;
    ctx.fillText(hdr, x, y);
    x += COLS[i];
  });
  y += 20;

  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  rows.forEach((r, i) => {
    const mine = i === rows.length - 1;
    const opp = r * Math.sin(theta);
    const adj = r * Math.cos(theta);
    const values = [
      mine ? "yours" : `△${i + 1}`,
      opp.toFixed(2),
      adj.toFixed(2),
      r.toFixed(2),
      (opp / r).toFixed(3),
      (adj / r).toFixed(3),
      (opp / adj).toFixed(3),
    ];
    let cx = PANEL_X + PANEL_PAD;
    values.forEach((v, col) => {
      ctx.fillStyle = col === 0 ? (mine ? ACCENT : TEXT_DIM) : col >= 4 ? ACCENT : mine ? TEXT : TEXT_DIM;
      ctx.fillText(v, cx, y);
      cx += COLS[col];
    });
    y += 19;
  });

  y += 8;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(`all three: 90°, θ = ${(theta / DEG).toFixed(1)}°, ${(90 - theta / DEG).toFixed(1)}°  —  AA ⇒ similar`, PANEL_X + PANEL_PAD, y);
  y += 18;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("sides scale, ratios hold: the ratio belongs to the angle.", PANEL_X + PANEL_PAD, y);
  y += 16;
  ctx.fillText("A function of θ alone — worth naming. Next lesson.", PANEL_X + PANEL_PAD, y);
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

function drawHeader(): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.fillText("Similar Triangles", W / 2, 30);
  ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.6)";
  ctx.fillText(
    "slide the knob along the ray — the sides change, the ratios refuse to. Turn the dial — everything changes together.",
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
