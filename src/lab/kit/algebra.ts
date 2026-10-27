// Shared pieces of the equation lessons (the Linear Equations and Quadratic
// Equations chapters): graphs whose axes may be numbered in units other than
// the stage's, plotting a function as a curve, lines written Ax + By = C and
// what two of them have in common, and the roots of a quadratic.
//
// The graph is the standard picture for now; specs/equations-display.md lists
// the other ways these lessons could show an equation.

import { C, type Draw, type Stroke } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { texSum } from "./coordinates.ts";

// --- Graphs ------------------------------------------------------------------

/**
 * Where a graph sits on the stage: the stage point of its origin, and how
 * much one stage unit stands for along each axis. The plain plane, where a
 * point drawn at (3, −2) is (3, −2), is `PLANE`.
 */
export interface Graph {
  origin: Vec;
  unit: Vec;
}

export const PLANE: Graph = { origin: { x: 0, y: 0 }, unit: { x: 1, y: 1 } };

/** A point of the graph, in its own units, on the stage. */
export const onStage = (gr: Graph, p: Vec): Vec => ({
  x: gr.origin.x + p.x / gr.unit.x,
  y: gr.origin.y + p.y / gr.unit.y,
});

/** A stage point, in the graph's own units. */
export const fromStage = (gr: Graph, p: Vec): Vec => ({
  x: (p.x - gr.origin.x) * gr.unit.x,
  y: (p.y - gr.origin.y) * gr.unit.y,
});

export interface AxesOptions {
  /** Only the quadrant where both quantities are positive. */
  positive?: boolean;
  /** What each axis measures, written at its far end. */
  xName?: string;
  yName?: string;
}

/** The grid and numbered axes of a graph. */
export function axes(g: Draw, gr: Graph, o: AxesOptions = {}): void {
  g.grid(1);
  g.axes({ origin: gr.origin, units: gr.unit, positive: o.positive });
  const { xmax, ymax } = g.bounds;
  if (o.xName) g.label({ x: xmax, y: gr.origin.y }, o.xName, { color: C.dim, size: 13, dx: -8, dy: 14, align: "right" });
  if (o.yName) g.label({ x: gr.origin.x, y: ymax }, o.yName, { color: C.dim, size: 13, dx: 10, dy: -14, align: "left" });
}

/**
 * The graph of `fn` sampled from `from` to `to`, cut into the runs where it is
 * defined and no further than `reach` outside [ymin, ymax]. Each run keeps one
 * sample past the edge, so a curve leaving the window is drawn up to it.
 */
export function pieces(
  fn: (x: number) => number,
  from: number,
  to: number,
  ymin: number,
  ymax: number,
  samples = 240,
): Vec[][] {
  const reach = (ymax - ymin) * 0.5;
  const out: Vec[][] = [];
  let run: Vec[] = [];
  const close = (): void => {
    if (run.length > 1) out.push(run);
    run = [];
  };
  for (let i = 0; i <= samples; i++) {
    const x = from + ((to - from) * i) / samples;
    const y = fn(x);
    if (!Number.isFinite(y) || y < ymin - reach || y > ymax + reach) {
      close();
      continue;
    }
    run.push({ x, y });
  }
  close();
  return out;
}

/**
 * Plot y = fn(x) across the visible part of the graph, or over [from, to] in
 * the graph's units.
 */
export function plot(
  g: Draw,
  gr: Graph,
  fn: (x: number) => number,
  o: Stroke & { from?: number; to?: number } = {},
): void {
  const { xmin, xmax, ymin, ymax } = g.bounds;
  const low = fromStage(gr, { x: xmin, y: ymin });
  const high = fromStage(gr, { x: xmax, y: ymax });
  const from = Math.max(o.from ?? -Infinity, low.x);
  const to = Math.min(o.to ?? Infinity, high.x);
  if (!(to > from)) return;
  for (const run of pieces(fn, from, to, low.y, high.y)) {
    g.path(
      run.map((p) => onStage(gr, p)),
      o,
    );
  }
}

// --- Lines as equations ------------------------------------------------------

/** The line Ax + By = C. A and B are never both zero for a real line. */
export interface Line {
  A: number;
  B: number;
  C: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/**
 * The line through two different whole-number points, with whole-number
 * coefficients sharing no factor, and A > 0 (or B > 0 when A = 0).
 */
export function lineThrough(p: Vec, q: Vec): Line {
  const A = q.y - p.y;
  const B = p.x - q.x;
  const C = A * p.x + B * p.y;
  const k = gcd(gcd(A, B), C) || 1;
  const sign = A < 0 || (A === 0 && B < 0) ? -1 : 1;
  // Adding 0 turns a −0 into 0.
  return { A: (sign * A) / k + 0, B: (sign * B) / k + 0, C: (sign * C) / k + 0 };
}

/** k₁ times the first equation plus k₂ times the second. */
export const combine = (l1: Line, k1: number, l2: Line, k2: number): Line => ({
  A: k1 * l1.A + k2 * l2.A + 0,
  B: k1 * l1.B + k2 * l2.B + 0,
  C: k1 * l1.C + k2 * l2.C + 0,
});

/** What two lines have in common: one point, none (parallel) or all of it. */
export type Meeting = { kind: "point"; at: Vec } | { kind: "none" } | { kind: "same" };

export function meet(l1: Line, l2: Line): Meeting {
  const det = l1.A * l2.B - l2.A * l1.B;
  if (Math.abs(det) > 1e-12) {
    return {
      kind: "point",
      at: { x: (l1.C * l2.B - l2.C * l1.B) / det + 0, y: (l1.A * l2.C - l2.A * l1.C) / det + 0 },
    };
  }
  // Parallel: the same line exactly when the constants are in the same ratio.
  const same = Math.abs(l1.A * l2.C - l2.A * l1.C) < 1e-12 && Math.abs(l1.B * l2.C - l2.B * l1.C) < 1e-12;
  return same ? { kind: "same" } : { kind: "none" };
}

/** `2x + 3y = -1`. */
export const texLine = (l: Line): string => `${texSum([[l.A, "x"], [l.B, "y"]])} = ${fmt(l.C, 2)}`;

/** The same for a canvas label, with true minus signs: "2x + 3y = −1". */
export const lineText = (l: Line): string => textOf(texLine(l));

/** A plain sum or equation from texSum, readied for a canvas label. */
export const textOf = (tex: string): string => tex.replace(/-/g, "−").replace(/\^2/g, "²");

/** Two points of the line, for drawing it; null for an equation with no line (0 = C). */
export function pointsOf(l: Line): [Vec, Vec] | null {
  if (l.A === 0 && l.B === 0) return null;
  // The point of the line nearest the origin, and one a step along it.
  const n2 = l.A * l.A + l.B * l.B;
  const foot = { x: (l.A * l.C) / n2, y: (l.B * l.C) / n2 };
  return [foot, { x: foot.x - l.B, y: foot.y + l.A }];
}

// --- Linear and quadratic expressions -----------------------------------------

/** `3x + 5`, from the coefficient of x and the constant. */
export const texLinear = (a: number, b: number, variable = "x"): string =>
  texSum([
    [a, variable],
    [b, ""],
  ]);

/** `x^2 - 3x + 2`, from the three coefficients. */
export const texQuadratic = (a: number, b: number, c: number, variable = "x"): string =>
  texSum([
    [a, `${variable}^2`],
    [b, variable],
    [c, ""],
  ]);

/**
 * The coefficients of (x − r₁)(x − r₂)…(x − rₙ), highest power first: [1] for
 * no roots, [1, −r] for one, and so on.
 */
export function fromRoots(roots: readonly number[]): number[] {
  let out = [1];
  for (const r of roots) {
    // Multiply by (x − r): shift up a power, then subtract r times the old.
    out = [...out, 0].map((c, i) => c - (i > 0 ? r * out[i - 1] : 0) + 0);
  }
  return out;
}

/** `x^3 - 2x^2 + 4`, from coefficients highest power first. */
export const texPolynomial = (coefficients: readonly number[], variable = "x"): string => {
  const n = coefficients.length - 1;
  return texSum(coefficients.map((c, i) => [c, n - i === 0 ? "" : n - i === 1 ? variable : `${variable}^${n - i}`] as const));
};

/** How many times fn changes sign between `from` and `to`, sampled finely. */
export function signChanges(fn: (x: number) => number, from: number, to: number, samples = 4000): number {
  let count = 0;
  let last = Math.sign(fn(from));
  for (let i = 1; i <= samples; i++) {
    const sign = Math.sign(fn(from + ((to - from) * i) / samples));
    if (sign !== 0 && last !== 0 && sign !== last) count++;
    if (sign !== 0) last = sign;
  }
  return count;
}

/** Values closer than this to zero count as zero, against floating-point noise. */
export const EPS = 1e-9;

/** The real roots of ax² + bx + c = 0 (a ≠ 0), smallest first; one when they coincide. */
export function realRoots(a: number, b: number, c: number): number[] {
  const raw = b * b - 4 * a * c;
  const D = Math.abs(raw) < EPS ? 0 : raw;
  if (D < 0) return [];
  if (D === 0) return [-b / (2 * a) + 0];
  const r = Math.sqrt(D);
  const roots = [(-b - r) / (2 * a), (-b + r) / (2 * a)];
  return roots.sort((p, q) => p - q);
}
