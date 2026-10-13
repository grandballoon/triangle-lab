// Shared pieces of the coordinate-geometry lessons: the plane itself, the
// rise/run triangle, constraints that keep points on the lattice and apart,
// and the small formatters that turn live coordinates into canvas text and
// LaTeX.
//
// In these lessons the stage is the plane — a point drawn at (3, −2) has the
// coordinates (3, −2) — so nothing here converts between the two.

import { C, type Draw } from "../draw.ts";
import { both, cross, dist, fmt, inBox, lerp, snapToGrid, sub, type Constraint, type Vec } from "../geo.ts";
import type { Handle, Toggle } from "../scene.ts";

/** Horizontal things — x, runs — are blue; vertical things — y, rises — pink. */
export const X_COLOR = C.blue;
export const Y_COLOR = C.pink;

// --- Where points may go -----------------------------------------------------

/** Handles stay a unit inside the stage so their labels fit. */
export const INSIDE = inBox(-7, 7, -4, 4);

/** Whole-number points inside the stage. */
export const lattice = both(INSIDE, snapToGrid(1));

/** On the lattice while the toggle is on, anywhere inside otherwise. */
export const snapping =
  (snap: Toggle): Constraint =>
  (p) =>
    snap.on ? lattice(p) : INSIDE(p);

/**
 * Constrain `h` to `base`, refusing any move that `ok` rejects: the point then
 * stays where it last was, so it can never be dragged into a degenerate spot.
 */
export function guard(h: Handle, base: Constraint, ok: (q: Vec) => boolean): void {
  h.constrain = (p) => {
    const q = base(p);
    return ok(q) ? q : { x: h.x, y: h.y };
  };
}

/** Constrain two handles to `base` and keep them at least `gap` apart. */
export function keepApart(a: Handle, b: Handle, base: Constraint, gap = 1): void {
  guard(a, base, (q) => dist(q, b) >= gap);
  guard(b, base, (q) => dist(q, a) >= gap);
}

/** Re-apply each handle's constraint, after something it depends on changed. */
export function settle(...handles: Handle[]): void {
  for (const h of handles) h.set(h);
}

/**
 * The part of the line through `a` and `b` that lies within the stage (less a
 * small margin), running in the direction a → b; null if there is none.
 */
export function clipLine(a: Vec, b: Vec, xmax = 7.6, ymax = 4.6): [Vec, Vec] | null {
  const d = sub(b, a);
  let lo = -Infinity;
  let hi = Infinity;
  for (const [start, step, limit] of [
    [a.x, d.x, xmax],
    [a.y, d.y, ymax],
  ]) {
    if (Math.abs(step) < 1e-12) {
      if (Math.abs(start) > limit) return null;
      continue;
    }
    const t1 = (-limit - start) / step;
    const t2 = (limit - start) / step;
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) return null;
  return [lerp(a, b, lo), lerp(a, b, hi)];
}

// --- Drawing -------------------------------------------------------------------

/** The gridded plane with numbered axes. */
export function plane(g: Draw): void {
  g.grid(1);
  g.axes();
}

export interface RiseRunOptions {
  alpha?: number;
  /** Leg captions; by default the signed run and rise. Pass "" for none. */
  run?: string;
  rise?: string;
  dash?: number[];
}

/**
 * The right triangle that carries `a` to `b`: across first (the run), then up
 * (the rise). Either leg may have zero or negative length.
 */
export function riseRun(g: Draw, a: Vec, b: Vec, o: RiseRunOptions = {}): void {
  const corner = { x: b.x, y: a.y };
  const alpha = o.alpha ?? 1;
  const run = b.x - a.x;
  const rise = b.y - a.y;
  // +1 when the triangle lies to the left of the walk a → corner → b.
  const side = cross(sub(corner, a), sub(b, a)) >= 0 ? 1 : -1;

  g.polygon([a, corner, b], { fill: "rgba(255, 255, 255, 0.06)", stroke: null, alpha });
  g.segment(a, corner, { color: X_COLOR, alpha, dash: o.dash });
  g.segment(corner, b, { color: Y_COLOR, alpha, dash: o.dash });
  if (Math.abs(run) > 0.3 && Math.abs(rise) > 0.3) {
    g.angle(a, corner, b, { color: C.dim, r: 14, width: 1.5, alpha });
  }

  // Captions sit outside the triangle; a leg of zero length has no outside,
  // so its caption is set just below (run) or beside (rise) the point.
  const runText = o.run ?? num(run);
  const riseText = o.rise ?? num(rise);
  if (runText) {
    if (Math.abs(run) > 1e-9) g.along(a, corner, runText, { color: X_COLOR, alpha, offset: -16 * side });
    else g.label(a, runText, { color: X_COLOR, alpha, size: 14, dy: -26 });
  }
  if (riseText) {
    if (Math.abs(rise) > 1e-9) g.along(corner, b, riseText, { color: Y_COLOR, alpha, offset: -20 * side });
    else g.label(b, riseText, { color: Y_COLOR, alpha, size: 14, dx: 26, align: "left" });
  }
}

// --- Canvas text ---------------------------------------------------------------

/** A number for a canvas label, with a true minus sign. */
export const num = (v: number, digits = 1): string => fmt(v, digits).replace("-", "−");

/** A point's coordinates for a canvas label: "(3, −2)". */
export const pair = (p: Vec, digits = 1): string => `(${num(p.x, digits)}, ${num(p.y, digits)})`;

// --- LaTeX ---------------------------------------------------------------------

/** A number being substituted into a formula: negatives go in parentheses. */
export function par(v: number, digits = 1): string {
  const s = fmt(v, digits);
  return s.startsWith("-") ? `(${s})` : s;
}

/** A point's coordinates: `(3,\,-2)`. */
export const texPoint = (p: Vec, digits = 1): string => `(${fmt(p.x, digits)},\\,${fmt(p.y, digits)})`;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * The quotient n/d (d ≠ 0): a fraction in lowest terms when both are whole
 * numbers, a decimal otherwise.
 */
export function texRatio(n: number, d: number): string {
  if (!Number.isInteger(n) || !Number.isInteger(d)) return fmt(n / d, 2);
  const k = gcd(Math.abs(n), Math.abs(d)) || 1;
  const top = Math.abs(n) / k;
  const bottom = Math.abs(d) / k;
  const sign = n * d < 0 ? "-" : "";
  return bottom === 1 ? `${sign}${top}` : `${sign}\\tfrac{${top}}{${bottom}}`;
}

/**
 * A sum of terms such as `2x^2 - x + 3`, from [coefficient, variable] pairs.
 * Zero terms are dropped and a coefficient of 1 is left unwritten.
 */
export function texSum(terms: readonly (readonly [number, string])[], digits = 2): string {
  let out = "";
  for (const [coefficient, variable] of terms) {
    const size = fmt(Math.abs(coefficient), digits);
    if (size === "0") continue;
    const body = variable && size === "1" ? variable : `${size}${variable}`;
    if (out) out += coefficient < 0 ? ` - ${body}` : ` + ${body}`;
    else out = coefficient < 0 ? `-${body}` : body;
  }
  return out || "0";
}

/** `(x - 3)^2`, `(x + 1)^2` or plain `x^2`: the square of a shifted variable. */
export function texShiftSquared(variable: string, shift: number, digits = 1): string {
  const size = fmt(Math.abs(shift), digits);
  if (size === "0") return `${variable}^2`;
  return `(${variable} ${shift > 0 ? "-" : "+"} ${size})^2`;
}
