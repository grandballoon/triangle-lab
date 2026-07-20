// All Canvas 2D drawing. Given the pure geometry + a little transient UI state,
// paint one frame: the triangle, its three interior angles (each coloured by
// kind), the draggable knob, any right-angle splashes, and the type caption.

import {
  add,
  clamp,
  dist,
  scale,
  type AngleInfo,
  type AngleType,
  type Triangle,
  type TriangleAngles,
  type Vec,
} from "./geometry.ts";

const COLORS: Record<AngleType, string> = {
  acute: "#38d9a9", // all acute angles share one colour
  right: "#ffd43b", // the 90° angle: gold, with a box marker + splash
  obtuse: "#ff6b6b", // the single obtuse angle, distinctly highlighted
};

const EDGE = "#eef4fb";

export interface Splash {
  center: Vec;
  age: number; // seconds since it fired
}
export const SPLASH_LIFE = 0.6;

export interface Scene {
  triangle: Triangle;
  angles: TriangleAngles;
  knob: Vec;
  dragging: boolean;
  snapped: boolean;
  splashes: Splash[];
}

export function render(ctx: CanvasRenderingContext2D, w: number, h: number, s: Scene): void {
  ctx.clearRect(0, 0, w, h);
  const { triangle: t, angles } = s;

  drawBody(ctx, t, angles.type);

  // Angles: draw the acute ones first so a highlighted right/obtuse wedge and
  // its label always sit on top.
  const infos: AngleInfo[] = [angles.atA, angles.atB, angles.atC];
  const order = infos.slice().sort((a, b) => rank(a.type) - rank(b.type));
  for (const info of order) drawAngle(ctx, info, neighborSpan(t, info.vertex));

  for (const sp of s.splashes) drawSplash(ctx, sp);
  drawKnob(ctx, s.knob, t.c, s.dragging, s.snapped);
  drawCaption(ctx, w, Math.max(t.a.y, t.b.y), angles.type);
}

const rank = (k: AngleType): number => (k === "acute" ? 0 : 1);

/** Shortest distance from a vertex to its two neighbours (sizes the arc). */
function neighborSpan(t: Triangle, v: Vec): number {
  const others = [t.a, t.b, t.c].filter((p) => p !== v);
  return Math.min(...others.map((p) => dist(p, v)));
}

function drawBody(ctx: CanvasRenderingContext2D, t: Triangle, type: AngleType): void {
  ctx.beginPath();
  ctx.moveTo(t.a.x, t.a.y);
  ctx.lineTo(t.b.x, t.b.y);
  ctx.lineTo(t.c.x, t.c.y);
  ctx.closePath();

  const fill = COLORS[type];
  ctx.fillStyle = hexToRgba(fill, 0.1);
  ctx.fill();

  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = EDGE;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawAngle(ctx: CanvasRenderingContext2D, info: AngleInfo, span: number): void {
  const { vertex: v, toP, toQ, degrees, type } = info;
  const r = clamp(span * 0.24, 18, 44);
  const a1 = Math.atan2(toP.y, toP.x);
  const a2 = Math.atan2(toQ.y, toQ.x);
  const delta = norm(a2 - a1); // signed minor sweep — the interior of the angle
  const color = COLORS[type];

  if (type === "right") {
    drawRightMarker(ctx, v, toP, toQ, r);
  } else if (type === "obtuse") {
    // Filled wedge: makes the single obtuse angle unmistakable.
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.arc(v.x, v.y, r, a1, a1 + delta, delta < 0);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.32);
    ctx.fill();
    strokeArc(ctx, v, r, a1, delta, color, 4);
  } else {
    // Acute: a slim arc, same treatment for all of them.
    strokeArc(ctx, v, r, a1, delta, color, 3);
  }

  drawDegreeLabel(ctx, v, a1 + delta / 2, r + 22, degrees, color);
}

function strokeArc(
  ctx: CanvasRenderingContext2D,
  v: Vec,
  r: number,
  a1: number,
  delta: number,
  color: string,
  width: number,
): void {
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, a1, a1 + delta, delta < 0);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** The classic square tucked into a right angle. */
function drawRightMarker(ctx: CanvasRenderingContext2D, v: Vec, toP: Vec, toQ: Vec, r: number): void {
  const s = r * 0.68;
  const p1 = add(v, scale(toP, s));
  const p2 = add(v, scale(toQ, s));
  const corner = add(add(v, scale(toP, s)), scale(toQ, s));
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(corner.x, corner.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(COLORS.right, 0.3);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.right;
  ctx.stroke();
}

function drawDegreeLabel(
  ctx: CanvasRenderingContext2D,
  v: Vec,
  midAngle: number,
  reach: number,
  degrees: number,
  color: string,
): void {
  const pos = add(v, { x: Math.cos(midAngle) * reach, y: Math.sin(midAngle) * reach });
  const text = `${Math.round(degrees)}°`;
  ctx.font = "600 20px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const pad = 8;
  const tw = ctx.measureText(text).width;
  roundRect(ctx, pos.x - tw / 2 - pad, pos.y - 15, tw + pad * 2, 30, 8);
  ctx.fillStyle = "rgba(10,15,22,0.72)";
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(text, pos.x, pos.y + 1);
}

function drawSplash(ctx: CanvasRenderingContext2D, sp: Splash): void {
  const p = clamp(sp.age / SPLASH_LIFE, 0, 1);
  const alpha = 1 - p;
  ctx.strokeStyle = hexToRgba(COLORS.right, alpha);
  ctx.lineWidth = 3 * (1 - p) + 1;
  for (const spread of [0, 22]) {
    ctx.beginPath();
    ctx.arc(sp.center.x, sp.center.y, 10 + p * 70 + spread, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The grab handle. When snapped, it rides ahead of the pinned apex — that gap
 *  is the "give", so we draw an elastic link across it. */
function drawKnob(
  ctx: CanvasRenderingContext2D,
  knob: Vec,
  apex: Vec,
  dragging: boolean,
  snapped: boolean,
): void {
  if (dist(knob, apex) > 2) {
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(knob.x, knob.y);
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToRgba(snapped ? COLORS.right : EDGE, 0.7);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const rOuter = dragging ? 16 : 13;
  ctx.beginPath();
  ctx.arc(knob.x, knob.y, rOuter, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(snapped ? COLORS.right : "#ffffff", 0.9);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(10,15,22,0.85)";
  ctx.stroke();
}

const CAPTIONS: Record<AngleType, { title: string; sub: string }> = {
  acute: { title: "Acute Triangle", sub: "all three angles are less than 90°" },
  right: { title: "Right Triangle", sub: "one angle is exactly 90°" },
  obtuse: { title: "Obtuse Triangle", sub: "one angle is greater than 90°" },
};

function drawCaption(ctx: CanvasRenderingContext2D, w: number, baseY: number, type: AngleType): void {
  const { title, sub } = CAPTIONS[type];
  const cx = w / 2;
  const y = baseY + 62;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = COLORS[type];
  ctx.fillText(title, cx, y);

  ctx.font = "400 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(233,240,247,0.75)";
  ctx.fillText(sub, cx, y + 26);
}

// --- small drawing helpers ----------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Normalise an angle difference to the signed minor arc in (-π, π]. */
function norm(a: number): number {
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
