// Shared pieces of the Proportions lessons: rectangles by their corners,
// amounts of money, and a number scale of ticks along a line.

import { C, type Draw, type Fill } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";

/** The rectangle with opposite corners `a` and `b`. */
export function box(g: Draw, a: Vec, b: Vec, o: Fill = {}): void {
  g.polygon(
    [
      { x: a.x, y: a.y },
      { x: b.x, y: a.y },
      { x: b.x, y: b.y },
      { x: a.x, y: b.y },
    ],
    o,
  );
}

/** Dollars and cents, without the dollar sign: 4.50, 12.00. */
export const cents = (v: number): string => v.toFixed(2);

/** Dollars for TeX, `\$4.50`. */
export const texMoney = (v: number): string => `\\text{\\textdollar}${cents(v)}`;

/** A number for TeX, whole when it is whole and to `digits` places otherwise. */
export const texNum = (v: number, digits = 2): string => fmt(v, digits);

export interface ScaleOptions {
  /** Stage x of the scale's 0. */
  x0: number;
  /** Stage y of the scale's line. */
  y: number;
  /** Stage units per unit of the scale. */
  per: number;
  /** The scale's last value. */
  to: number;
  /** A small tick every this much, and a numbered one every `label`. */
  tick: number;
  label: number;
  /** The unit written at the right-hand end. */
  unit: string;
  color?: string;
  /** Numbers below the line (true) or above it. */
  below?: boolean;
  digits?: number;
}

/** A ruler-like scale: a line from 0 to `to`, ticked, numbered and named. */
export function scale(g: Draw, o: ScaleOptions): void {
  const color = o.color ?? C.ink;
  const end = o.x0 + o.to * o.per;
  g.segment({ x: o.x0, y: o.y }, { x: end, y: o.y }, { color, width: 2 });
  const count = Math.round(o.to / o.tick);
  for (let i = 0; i <= count; i++) {
    const v = i * o.tick;
    const x = o.x0 + v * o.per;
    const big = Math.abs(v / o.label - Math.round(v / o.label)) < 1e-9;
    const h = big ? 0.22 : 0.11;
    g.segment({ x, y: o.y - h }, { x, y: o.y + h }, { color, width: big ? 2 : 1, alpha: big ? 1 : 0.6 });
    if (big) g.label({ x, y: o.y }, fmt(v, o.digits ?? 2), { color: C.dim, size: 12, dy: o.below ? -20 : 14 });
  }
  g.label({ x: end, y: o.y }, o.unit, { color, size: 14, bold: true, dx: 12, align: "left" });
}
