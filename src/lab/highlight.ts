// What hovering a term lights on the figure, as plain values. Each feature a
// term can name has a shape of its own — a point, a segment, the two equal
// halves of a segment around its midpoint, an arc, a circle, an angle's
// wedge, a polygon's outline, a region's area, or a printed label — so the
// reader sees exactly what the words mean. Draw (draw.ts) and the figure
// index (figure.ts) say which shapes a term lights; highlight-paint.ts puts
// them on the canvas.
//
// Everything is in screen pixels, y down. Directions are angles measured
// counter-clockwise as the reader sees them (0 points right, π/2 up), the
// same sense as stage angles.

import type { Vec } from "./geo.ts";

export type Shape =
  | { kind: "point"; at: Vec }
  | { kind: "segment"; a: Vec; b: Vec }
  /** The midpoint `at` of the segment from `a` to `b`, and the two equal halves either side of it. */
  | { kind: "midpoint"; at: Vec; a: Vec; b: Vec }
  /** Part of a circle, from direction `from` turning `sweep` (negative: clockwise). */
  | { kind: "arc"; center: Vec; r: number; from: number; sweep: number }
  | { kind: "circle"; center: Vec; r: number }
  /** The opening at `vertex` from direction `from` turning `sweep`; `r` is how far out its mark was drawn. */
  | { kind: "angle"; vertex: Vec; from: number; sweep: number; r: number }
  /** A figure with straight sides, lit by its outline. */
  | { kind: "polygon"; corners: Vec[] }
  /** A region, lit by filling it. */
  | { kind: "area"; outline: Vec[] }
  /** Printed text, its box centred on `at`. */
  | { kind: "label"; at: Vec; width: number; height: number };

/** The kind of feature a term names. */
export type Feature = Shape["kind"];

/** One thing a term lights: its shape, and where a leader line from the term meets it. */
export interface Highlight {
  anchor: Vec;
  shape: Shape;
}

/** How close two leader ends of one term may be before they count as the same place (an angle's arc and its label). */
export const ANCHOR_MERGE_PX = 36;

/** The point at direction `t`, `r` pixels from `center`. */
export function pointAt(center: Vec, r: number, t: number): Vec {
  return { x: center.x + r * Math.cos(t), y: center.y - r * Math.sin(t) };
}

/** The direction of `v` from `from`, in the reader's counter-clockwise sense. */
export function direction(from: Vec, v: Vec): number {
  return Math.atan2(-(v.y - from.y), v.x - from.x);
}

/** The turn from direction `a` to direction `b`, between −π and π. */
export function turn(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Points along an arc, both ends included. */
export function arcPoints(center: Vec, r: number, from: number, sweep: number, steps = 24): Vec[] {
  return Array.from({ length: steps + 1 }, (_, i) => pointAt(center, r, from + (sweep * i) / steps));
}

/**
 * `h` as the feature a lesson says its mark shows, where the mark's shape can
 * be read that way: a filled shape as its area, a circle as its centre, a
 * segment as its midpoint, an arc as its whole circle. Otherwise unchanged.
 */
export function asFeature(h: Highlight, feature: Feature | undefined): Highlight {
  const s = h.shape;
  if (!feature || feature === s.kind) return h;
  const to = (shape: Shape): Highlight => ({ anchor: h.anchor, shape });
  switch (feature) {
    case "area":
      if (s.kind === "polygon") return to({ kind: "area", outline: s.corners });
      if (s.kind === "circle") return to({ kind: "area", outline: arcPoints(s.center, s.r, 0, 2 * Math.PI, 64) });
      if (s.kind === "angle") return to({ kind: "area", outline: [s.vertex, ...arcPoints(s.vertex, s.r, s.from, s.sweep)] });
      if (s.kind === "arc") return to({ kind: "area", outline: arcPoints(s.center, s.r, s.from, s.sweep) });
      return h;
    case "point":
      return to({ kind: "point", at: s.kind === "circle" ? s.center : h.anchor });
    case "midpoint":
      if (s.kind === "segment") {
        return to({ kind: "midpoint", at: { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 }, a: s.a, b: s.b });
      }
      return h;
    case "circle":
      return s.kind === "arc" ? to({ kind: "circle", center: s.center, r: s.r }) : h;
    case "polygon":
      return s.kind === "area" ? to({ kind: "polygon", corners: s.outline }) : h;
    default:
      return h;
  }
}

/** A key equal for shapes that look the same on screen, to light each only once. */
export function shapeKey(s: Shape): string {
  const n = (x: number): number => Math.round(x);
  const p = (v: Vec): string => `${n(v.x)},${n(v.y)}`;
  const t = (x: number): number => Math.round(x * 100);
  switch (s.kind) {
    case "point":
      return `pt ${p(s.at)}`;
    case "segment": {
      const [a, b] = [p(s.a), p(s.b)].sort();
      return `seg ${a} ${b}`;
    }
    case "midpoint": {
      const [a, b] = [p(s.a), p(s.b)].sort();
      return `mid ${p(s.at)} ${a} ${b}`;
    }
    case "arc":
      return `arc ${p(s.center)} ${n(s.r)} ${t(s.sweep >= 0 ? s.from : s.from + s.sweep)} ${t(Math.abs(s.sweep))}`;
    case "circle":
      return `circle ${p(s.center)} ${n(s.r)}`;
    case "angle":
      return `ang ${p(s.vertex)} ${t(s.sweep >= 0 ? s.from : s.from + s.sweep)} ${t(Math.abs(s.sweep))}`;
    case "polygon":
      return `poly ${s.corners.map(p).sort().join(" ")}`;
    case "area":
      return `area ${s.outline.map(p).sort().join(" ")}`;
    case "label":
      return `label ${p(s.at)}`;
  }
}

/** The shapes of `lit`, each once. */
export function distinctShapes(lit: readonly Highlight[]): Shape[] {
  const seen = new Set<string>();
  const shapes: Shape[] = [];
  for (const { shape } of lit) {
    const key = shapeKey(shape);
    if (seen.has(key)) continue;
    seen.add(key);
    shapes.push(shape);
  }
  return shapes;
}

/** Where leader lines to `lit` end: one per place, the first that was drawn there. */
export function leaderEnds(lit: readonly Highlight[]): Vec[] {
  const ends: Vec[] = [];
  for (const { anchor: p } of lit) {
    if (!ends.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < ANCHOR_MERGE_PX)) ends.push(p);
  }
  return ends;
}
