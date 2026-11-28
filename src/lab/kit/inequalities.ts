// Shared pieces of the Inequalities chapter: a number line drawn across the
// stage, the open and closed dots that end an interval, and the shaded runs
// of numbers that make up a solution set.

import { C, type Draw } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";

/** A horizontal number line: value v sits at stage x = x0 + v · unit, height y. */
export interface NumberLine {
  y: number;
  /** The least and greatest values drawn. */
  from: number;
  to: number;
  unit: number;
  x0?: number;
}

/** A value's point on the line. */
export const onLine = (nl: NumberLine, v: number): Vec => ({ x: (nl.x0 ?? 0) + v * nl.unit, y: nl.y });

/** A number for a canvas label, with a true minus sign: "−2.5". */
export const num = (v: number, digits = 1): string => fmt(v, digits).replace("-", "−");

/** The line, a tick at every whole number and a number every `every`. */
export function numberLine(g: Draw, nl: NumberLine, o: { every?: number; color?: string; alpha?: number } = {}): void {
  const color = o.color ?? C.dim;
  const every = o.every ?? 1;
  g.segment(onLine(nl, nl.from - 0.4), onLine(nl, nl.to + 0.4), { color, width: 2, alpha: o.alpha });
  for (let v = Math.ceil(nl.from); v <= nl.to; v++) {
    const big = v % every === 0;
    const p = onLine(nl, v);
    const h = g.px(big ? 6 : 3.5);
    g.segment({ x: p.x, y: p.y - h }, { x: p.x, y: p.y + h }, { color, width: big ? 1.5 : 1, alpha: o.alpha });
    if (big) g.label(p, num(v), { color, size: 11, dy: -17, alpha: o.alpha });
  }
}

/** The end of an interval: a closed dot when the end is included, an open one when not. */
export function endpoint(g: Draw, nl: NumberLine, v: number, closed: boolean, color: string, alpha = 1): void {
  if (v < nl.from || v > nl.to) return;
  const p = onLine(nl, v);
  if (closed) g.point(p, { color, r: 7, alpha });
  else g.circle(p, g.px(6.5), { color, fill: "#0a0f16", width: 3, alpha });
}

/**
 * The numbers from lo to hi shaded along the line; an end at ±Infinity (or
 * past the drawn range) runs to the line's edge with an arrowhead.
 */
export function shade(g: Draw, nl: NumberLine, lo: number, hi: number, color: string, alpha = 1): void {
  const a = Math.max(lo, nl.from - 0.4);
  const b = Math.min(hi, nl.to + 0.4);
  if (!(b > a)) return;
  const style = { color, width: 7, alpha };
  if (hi > nl.to + 0.4 && lo < nl.from - 0.4) {
    const m = onLine(nl, (a + b) / 2);
    g.arrow(m, onLine(nl, b), style);
    g.arrow(m, onLine(nl, a), style);
  } else if (hi > nl.to + 0.4) g.arrow(onLine(nl, a), onLine(nl, b), style);
  else if (lo < nl.from - 0.4) g.arrow(onLine(nl, b), onLine(nl, a), style);
  else g.segment(onLine(nl, a), onLine(nl, b), style);
}
