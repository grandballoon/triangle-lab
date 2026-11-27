// Shared pieces for the Exponents & Logarithms lessons: factor tiles, the
// small square cards that stand for one factor of a power, and superscripts
// for writing a power in a canvas label, where TeX is not available.

import { C, tint, type Draw } from "../draw.ts";
import type { Vec } from "../geo.ts";

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻",
};

/** A whole number as superscript characters: 12 is "¹²", −3 is "⁻³". */
export const sup = (n: number): string => [...String(Math.round(n))].map((ch) => SUPERSCRIPTS[ch] ?? ch).join("");

/** A power as a canvas label: base 2 and exponent −3 is "2⁻³". */
export const powerText = (base: string | number, exponent: number): string => `${base}${sup(exponent)}`;

export interface TileOptions {
  color?: string;
  alpha?: number;
  /** Side in stage units. */
  size?: number;
  /** Strike the tile through, as a factor cancelled. */
  struck?: boolean;
}

/** One factor, drawn as a square card with its value written on it. */
export function tile(g: Draw, center: Vec, text: string, o: TileOptions = {}): void {
  const color = o.color ?? C.cyan;
  const half = (o.size ?? 0.86) / 2;
  const alpha = o.alpha ?? 1;
  g.polygon(
    [
      { x: center.x - half, y: center.y - half },
      { x: center.x + half, y: center.y - half },
      { x: center.x + half, y: center.y + half },
      { x: center.x - half, y: center.y + half },
    ],
    { color, fill: tint(color, 0.18), width: 2, alpha },
  );
  g.label(center, text, { color: C.ink, size: 16, bold: true, alpha });
  if (o.struck) {
    g.segment({ x: center.x - half, y: center.y - half }, { x: center.x + half, y: center.y + half }, {
      color: C.red,
      width: 3,
      alpha,
    });
  }
}

/** The centres of `count` tiles in a row centred on `x`, one stage unit apart. */
export function row(count: number, x: number, y: number, gap = 1): Vec[] {
  const start = x - ((count - 1) * gap) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: start + i * gap, y }));
}

/** A bracket under (or over, with `up`) a run from `a` to `b`, with a label at its middle. */
export function bracket(g: Draw, a: Vec, b: Vec, text: string, o: { color?: string; alpha?: number; up?: boolean } = {}): void {
  const color = o.color ?? C.gold;
  const lip = o.up ? 0.18 : -0.18;
  const style = { color, width: 2, alpha: o.alpha };
  g.path(
    [
      { x: a.x, y: a.y - lip },
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
      { x: b.x, y: b.y - lip },
    ],
    style,
  );
  g.label({ x: (a.x + b.x) / 2, y: a.y }, text, { color, size: 15, bold: true, dy: o.up ? 14 : -20, alpha: o.alpha });
}
