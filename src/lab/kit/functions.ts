// Shared pieces of the Functions lessons: a graph window that keeps clear of
// the sliders, curves cut where they jump or leave the window, the open and
// closed dots that end a piece, and the arithmetic of even and odd parts and
// of moving a graph to y = a·f(b(x − h)) + k.

import { C, type Draw, type Stroke } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { onStage, type Graph } from "./algebra.ts";

/**
 * The graph the Functions lessons draw on: one stage unit per unit, lifted a
 * unit so that the window's floor (WINDOW.ymin) sits above the sliders and
 * the grid still falls on whole numbers.
 */
export const GRAPH: Graph = { origin: { x: 0, y: 1 }, unit: { x: 1, y: 1 } };

/** The part of the graph, in its own units, that curves are drawn in. */
export const WINDOW = { xmin: -7.8, xmax: 7.8, ymin: -3.8, ymax: 3.7 } as const;

/** A function of one real variable; NaN where it is undefined. */
export type Fn = (x: number) => number;

export interface CurveOptions extends Stroke {
  from?: number;
  to?: number;
  /**
   * A rise between neighbouring samples bigger than this is a jump, not a
   * steep stretch: the curve is broken there (the steps of ⌊x⌋).
   */
  jump?: number;
}

/**
 * The runs of y = fn(x) inside the window, as graph points, broken wherever
 * fn is undefined, leaves the window, or jumps.
 */
export function runs(fn: Fn, o: CurveOptions = {}, samples = 480): Vec[][] {
  const from = Math.max(o.from ?? -Infinity, WINDOW.xmin);
  const to = Math.min(o.to ?? Infinity, WINDOW.xmax);
  const out: Vec[][] = [];
  if (!(to > from)) return out;
  const jump = o.jump ?? Infinity;
  let run: Vec[] = [];
  const close = (): void => {
    if (run.length > 1) out.push(run);
    run = [];
  };
  for (let i = 0; i <= samples; i++) {
    const x = from + ((to - from) * i) / samples;
    const y = fn(x);
    if (!Number.isFinite(y) || y < WINDOW.ymin || y > WINDOW.ymax) {
      close();
      continue;
    }
    const last = run[run.length - 1];
    if (last && Math.abs(y - last.y) > jump) close();
    run.push({ x, y });
  }
  close();
  return out;
}

/** Draw y = fn(x) on the Functions graph. */
export function curve(g: Draw, fn: Fn, o: CurveOptions = {}): void {
  for (const run of runs(fn, o)) {
    g.path(
      run.map((p) => onStage(GRAPH, p)),
      o,
    );
  }
}

/** A graph point on the stage. */
export const at = (x: number, y: number): Vec => onStage(GRAPH, { x, y });

/** Whether a graph point lies inside the window. */
export const shown = (x: number, y: number): boolean =>
  Number.isFinite(x) && Number.isFinite(y) && x >= WINDOW.xmin && x <= WINDOW.xmax && y >= WINDOW.ymin && y <= WINDOW.ymax;

/**
 * The dot at the end of a piece: filled when the piece includes that point,
 * an open ring when it stops just short of it.
 */
export function endDot(g: Draw, x: number, y: number, closed: boolean, color: string, alpha = 1): void {
  if (!shown(x, y)) return;
  if (closed) g.point(at(x, y), { color, r: 5.5, alpha });
  else g.circle(at(x, y), g.px(5.5), { color, fill: "#0b0f14", width: 2.5, alpha });
}

// --- Even and odd ----------------------------------------------------------------

/** The even part of f: (f(x) + f(−x)) / 2, the same at x and −x. */
export const evenPart =
  (f: Fn): Fn =>
  (x) =>
    (f(x) + f(-x)) / 2;

/** The odd part of f: (f(x) − f(−x)) / 2, opposite at x and −x. */
export const oddPart =
  (f: Fn): Fn =>
  (x) =>
    (f(x) - f(-x)) / 2;

/** Which symmetry f has, judged at sample points: even, odd, both (only 0) or neither. */
export function parity(f: Fn, samples: readonly number[] = [0.3, 0.7, 1, 1.6, 2.5, 3.1]): "even" | "odd" | "both" | "neither" {
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
  const even = samples.every((x) => near(f(-x), f(x)));
  const odd = samples.every((x) => near(f(-x), -f(x)));
  return even && odd ? "both" : even ? "even" : odd ? "odd" : "neither";
}

// --- Moving a graph ------------------------------------------------------------------

/** The four numbers of y = a·f(b(x − h)) + k. */
export interface Move {
  a: number;
  b: number;
  h: number;
  k: number;
}

/** y = a·f(b(x − h)) + k. */
export const moved =
  (f: Fn, m: Move): Fn =>
  (x) =>
    m.a * f(m.b * (x - m.h)) + m.k;

/**
 * Where the point (x, y) of y = f(x) lands on y = a·f(b(x − h)) + k: across
 * to x / b + h, up to a·y + k. Null when b = 0, which flattens the graph.
 */
export const image = (p: Vec, m: Move): Vec | null =>
  m.b === 0 ? null : { x: p.x / m.b + m.h + 0, y: m.a * p.y + m.k + 0 };

/** `a·f(b(x − h)) + k` written out for these numbers, dropping what does nothing. */
export function texMove(m: Move, name = "f"): string {
  const inner = m.h === 0 ? "x" : `x ${m.h > 0 ? "-" : "+"} ${fmt(Math.abs(m.h), 2)}`;
  const arg = m.b === 1 ? inner : m.b === -1 ? `-${m.h === 0 ? "x" : `(${inner})`}` : `${fmt(m.b, 2)}${m.h === 0 ? "x" : `(${inner})`}`;
  const lead = m.a === 1 ? "" : m.a === -1 ? "-" : fmt(m.a, 2);
  const tail = m.k === 0 ? "" : ` ${m.k > 0 ? "+" : "-"} ${fmt(Math.abs(m.k), 2)}`;
  return `${lead}${name}(${arg})${tail}`;
}

/** Axis colours for the Functions lessons: inputs blue, outputs pink, as in Coordinates. */
export const INPUT = C.blue;
export const OUTPUT = C.pink;
