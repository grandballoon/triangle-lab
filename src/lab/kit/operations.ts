// Binary operations and relations for the Operations and Relations lessons:
// a handful of made-up operations, the table of one on a small set, checks
// for its properties, and the points of a set placed round a circle for an
// arrow diagram.

import { C, tint, type Draw } from "../draw.ts";
import type { Vec } from "../geo.ts";

/** A rule that takes two numbers, in order, and gives one. */
export interface Operation {
  /** How the menu names it: the right-hand side of a ∗ b = … */
  name: string;
  /** The same in LaTeX. */
  tex: string;
  of: (a: number, b: number) => number;
}

/** An integer for the figure, with a true minus sign. */
export const num = (n: number): string => String(n).replace("-", "−");

/** An integer for LaTeX, bracketed when negative so it can follow an operator. */
export const texNum = (n: number): string => (n < 0 ? `(${n})` : String(n));

/** The pairs (a, b) of `set` with a ∗ b ≠ b ∗ a, each once with a < b. */
export function unswapped(op: Operation, set: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const a of set) for (const b of set) if (a < b && op.of(a, b) !== op.of(b, a)) out.push([a, b]);
  return out;
}

/** The triples of `set` with (a ∗ b) ∗ c ≠ a ∗ (b ∗ c). */
export function ungrouped(op: Operation, set: readonly number[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const a of set) for (const b of set) for (const c of set) {
    if (op.of(op.of(a, b), c) !== op.of(a, op.of(b, c))) out.push([a, b, c]);
  }
  return out;
}

export interface TableOptions {
  /** Top-left corner of the header cell, in stage units. */
  at: Vec;
  /** Side of one cell, in stage units. */
  cell: number;
  /** The set the rows and columns run over. */
  set: readonly number[];
  of: (a: number, b: number) => number;
  /** What sits in the corner cell, such as ∗. */
  symbol: string;
  /** A cell's background, if any. */
  fill?: (a: number, b: number) => string | undefined;
  /** A cell's text colour; ink by default. */
  color?: (a: number, b: number) => string | undefined;
  /** Font size in pixels. */
  size?: number;
  alpha?: number;
}

/** The centre of the cell in row a, column b of a table drawn with these options. */
export function cellAt(o: Pick<TableOptions, "at" | "cell" | "set">, a: number, b: number): Vec {
  const i = o.set.indexOf(a) + 1;
  const j = o.set.indexOf(b) + 1;
  return { x: o.at.x + (j + 0.5) * o.cell, y: o.at.y - (i + 0.5) * o.cell };
}

/** The corners of the cell in row a, column b, shrunk by `inset` stage units. */
export function cellBox(o: Pick<TableOptions, "at" | "cell" | "set">, a: number, b: number, inset = 0): Vec[] {
  const c = cellAt(o, a, b);
  const h = o.cell / 2 - inset;
  return [
    { x: c.x - h, y: c.y - h },
    { x: c.x + h, y: c.y - h },
    { x: c.x + h, y: c.y + h },
    { x: c.x - h, y: c.y + h },
  ];
}

/** An operation table: the row's element first, the column's second. */
export function drawTable(g: Draw, o: TableOptions): void {
  const { at, cell, set } = o;
  const n = set.length;
  const size = o.size ?? 15;
  const alpha = o.alpha ?? 1;
  const head = tint(C.ink, 0.08);
  // Header row and column.
  g.polygon([at, { x: at.x + (n + 1) * cell, y: at.y }, { x: at.x + (n + 1) * cell, y: at.y - cell }, { x: at.x, y: at.y - cell }], { color: C.faint, fill: head, width: 1, alpha });
  g.polygon([{ x: at.x, y: at.y - cell }, { x: at.x + cell, y: at.y - cell }, { x: at.x + cell, y: at.y - (n + 1) * cell }, { x: at.x, y: at.y - (n + 1) * cell }], { color: C.faint, fill: head, width: 1, alpha });
  g.label({ x: at.x + cell / 2, y: at.y - cell / 2 }, o.symbol, { color: C.dim, size, bold: true, alpha });
  set.forEach((v, k) => {
    g.label({ x: at.x + (k + 1.5) * cell, y: at.y - cell / 2 }, num(v), { color: C.dim, size, bold: true, alpha });
    g.label({ x: at.x + cell / 2, y: at.y - (k + 1.5) * cell }, num(v), { color: C.dim, size, bold: true, alpha });
  });
  for (const a of set) {
    for (const b of set) {
      const fill = o.fill?.(a, b);
      g.polygon(cellBox(o, a, b), { color: C.faint, width: 1, fill, alpha });
      g.label(cellAt(o, a, b), num(o.of(a, b)), { color: o.color?.(a, b) ?? C.ink, size, bold: true, alpha });
    }
  }
}

/** Where element k of n sits round a circle, the first at the top and the rest clockwise. */
export function around(centre: Vec, r: number, k: number, n: number): Vec {
  const t = Math.PI / 2 - (k * 2 * Math.PI) / n;
  return { x: centre.x + r * Math.cos(t), y: centre.y + r * Math.sin(t) };
}
