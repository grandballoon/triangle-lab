// Puts the highlights of the term the reader is pointing at (highlight.ts)
// on the canvas, over the figure. Each kind has a look of its own, so the
// reader can tell what the words name before reading the mark beneath:
//
//   point     a ring around the dot
//   segment   a glowing band from end to end, with its ends dotted
//   midpoint  the ring, and each half banded with one tick, as equal halves are marked
//   arc       a band along the arc
//   circle    a band all round
//   angle     the wedge filled, its arc traced and its two sides drawn out
//   polygon   every side banded and every corner dotted, inside barely tinted
//   area      the inside filled and hatched, the edge only traced
//   label     a soft box behind the text
//
// This is the imperative edge: what to light was decided by pure functions
// already, and nothing here records anything.

import type { Vec } from "./geo.ts";
import { arcPoints, pointAt, type Shape } from "./highlight.ts";

/** The highlight colour: near white, so it reads over every lesson's palette. */
const LIGHT = "255, 250, 228";
const rgba = (alpha: number): string => `rgba(${LIGHT}, ${alpha})`;

const BAND_PX = 11;
const CORE_PX = 2.5;
const GLOW_PX = 12;
const RING_PX = 11;
const END_DOT_PX = 3.5;
const TICK_PX = 8;
/** An angle's wedge reaches at least this far, so a small arc still shows its opening. */
const WEDGE_MIN_PX = 34;
const HATCH_GAP_PX = 9;

export function paintHighlights(ctx: CanvasRenderingContext2D, shapes: readonly Shape[]): void {
  if (shapes.length === 0) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  for (const shape of shapes) {
    ctx.save();
    paint(ctx, shape);
    ctx.restore();
  }
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, s: Shape): void {
  switch (s.kind) {
    case "point":
      return ring(ctx, s.at);
    case "segment":
      band(ctx, [s.a, s.b]);
      dot(ctx, s.a);
      dot(ctx, s.b);
      return;
    case "midpoint":
      for (const end of [s.a, s.b]) {
        band(ctx, [end, s.at]);
        dot(ctx, end);
        tick(ctx, end, s.at);
      }
      return ring(ctx, s.at);
    case "arc":
      return band(ctx, arcPoints(s.center, s.r, s.from, s.sweep, 48));
    case "circle":
      return band(ctx, arcPoints(s.center, s.r, 0, 2 * Math.PI, 96));
    case "angle":
      return wedge(ctx, s);
    case "polygon":
      fill(ctx, s.corners, rgba(0.08));
      band(ctx, [...s.corners, s.corners[0]]);
      for (const c of s.corners) dot(ctx, c);
      return;
    case "area":
      fill(ctx, s.outline, rgba(0.26));
      hatch(ctx, s.outline);
      trace(ctx, [...s.outline, s.outline[0]]);
      ctx.strokeStyle = rgba(0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    case "label":
      return box(ctx, s.at, s.width, s.height);
  }
}

function trace(ctx: CanvasRenderingContext2D, pts: readonly Vec[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** A wide soft stroke along `pts` with a bright thin core. */
function band(ctx: CanvasRenderingContext2D, pts: readonly Vec[]): void {
  trace(ctx, pts);
  ctx.strokeStyle = rgba(0.22);
  ctx.lineWidth = BAND_PX;
  ctx.shadowColor = rgba(0.8);
  ctx.shadowBlur = GLOW_PX;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(0.95);
  ctx.lineWidth = CORE_PX;
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, p: Vec): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, END_DOT_PX, 0, 2 * Math.PI);
  ctx.fillStyle = rgba(1);
  ctx.fill();
}

function ring(ctx: CanvasRenderingContext2D, p: Vec): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, RING_PX + 4, 0, 2 * Math.PI);
  ctx.fillStyle = rgba(0.16);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y, RING_PX, 0, 2 * Math.PI);
  ctx.strokeStyle = rgba(0.95);
  ctx.lineWidth = CORE_PX;
  ctx.shadowColor = rgba(0.8);
  ctx.shadowBlur = GLOW_PX;
  ctx.stroke();
}

/** One tick across the middle of the segment from `a` to `b`. */
function tick(ctx: CanvasRenderingContext2D, a: Vec, b: Vec): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6) return;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  ctx.beginPath();
  ctx.moveTo(m.x - n.x * TICK_PX, m.y - n.y * TICK_PX);
  ctx.lineTo(m.x + n.x * TICK_PX, m.y + n.y * TICK_PX);
  ctx.strokeStyle = rgba(1);
  ctx.lineWidth = CORE_PX + 0.5;
  ctx.stroke();
}

function wedge(ctx: CanvasRenderingContext2D, s: Extract<Shape, { kind: "angle" }>): void {
  const r = Math.max(WEDGE_MIN_PX, s.r + 6);
  const rim = arcPoints(s.vertex, r, s.from, s.sweep, 32);
  fill(ctx, [s.vertex, ...rim], rgba(0.3));
  band(ctx, rim);
  // The two sides, drawn out past the wedge so the opening reads as between them.
  const reach = r * 1.7;
  for (const t of [s.from, s.from + s.sweep]) {
    trace(ctx, [s.vertex, pointAt(s.vertex, reach, t)]);
    ctx.strokeStyle = rgba(0.85);
    ctx.lineWidth = CORE_PX;
    ctx.stroke();
  }
  dot(ctx, s.vertex);
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Vec[], style: string): void {
  if (pts.length < 3) return;
  trace(ctx, pts);
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

/** Diagonal lines across the inside of `outline`. */
function hatch(ctx: CanvasRenderingContext2D, outline: readonly Vec[]): void {
  if (outline.length < 3) return;
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  ctx.save();
  trace(ctx, outline);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  for (let c = x0 - (y1 - y0); c <= x1; c += HATCH_GAP_PX) {
    ctx.moveTo(c, y1);
    ctx.lineTo(c + (y1 - y0), y0);
  }
  ctx.strokeStyle = rgba(0.32);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, at: Vec, width: number, height: number): void {
  const [x, y, w, h, r] = [at.x - width / 2 - 3, at.y - height / 2, width + 6, height, Math.min(8, height / 2)];
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = rgba(0.14);
  ctx.fill();
  ctx.strokeStyle = rgba(0.8);
  ctx.lineWidth = 1.5;
  ctx.shadowColor = rgba(0.6);
  ctx.shadowBlur = GLOW_PX;
  ctx.stroke();
}
