// Shared pieces of the Statistics and Probability lessons: a seeded random
// number generator (so a simulation draws the same rolls every frame), dice
// faces, the six-by-six grid of two dice, and fractions in lowest terms.

import { C, tint, type Draw } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { gcd } from "./integers.ts";
import { box } from "./proportions.ts";

/**
 * A random number generator from a seed (mulberry32): the same seed gives the
 * same numbers in [0, 1), so a simulation redraws identically every frame.
 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` rolls of a fair die from `seed`, each 1 to 6. */
export function rolls(seed: number, count: number): number[] {
  const next = seeded(seed);
  return Array.from({ length: count }, () => 1 + Math.floor(next() * 6));
}

/** a/b in lowest terms for TeX, with a whole number left whole. */
export function texFrac(a: number, b: number): string {
  if (b === 0) return "\\text{undefined}";
  const d = gcd(a, b) || 1;
  const [n, m] = [a / d, b / d];
  return m === 1 ? String(n) : `\\frac{${n}}{${m}}`;
}

/** a/b, then a/b in lowest terms when that differs: \frac{6}{36} = \frac{1}{6}. */
export function texFracReduced(a: number, b: number): string {
  const low = texFrac(a, b);
  return low === `\\frac{${a}}{${b}}` ? low : `\\frac{${a}}{${b}} = ${low}`;
}

/** Where the pips of face n sit, in units of half the face's width. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.5, 0.5], [0.5, -0.5]],
  3: [[-0.5, 0.5], [0, 0], [0.5, -0.5]],
  4: [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]],
  5: [[-0.5, 0.5], [0.5, 0.5], [0, 0], [-0.5, -0.5], [0.5, -0.5]],
  6: [[-0.5, 0.5], [0.5, 0.5], [-0.5, 0], [0.5, 0], [-0.5, -0.5], [0.5, -0.5]],
};

/** A die showing `n`, centred at `at`, `size` stage units across. */
export function die(g: Draw, at: Vec, size: number, n: number, color: string = C.ink, fill?: string, alpha = 1): void {
  const h = size / 2;
  box(g, { x: at.x - h, y: at.y - h }, { x: at.x + h, y: at.y + h }, { color, fill: fill ?? tint(color, 0.1), width: 2, alpha });
  for (const [px, py] of PIPS[n] ?? []) g.circle({ x: at.x + px * h, y: at.y + py * h }, size * 0.09, { color, fill: color, stroke: null, alpha });
}

/** The six-by-six grid of two dice: the first die across, the second up. */
export interface DiceGrid {
  /** Bottom-left corner. */
  origin: Vec;
  cell: number;
}

/** The centre of the cell where the first die shows `a` and the second `b`. */
export const cellAt = (grid: DiceGrid, a: number, b: number): Vec => ({
  x: grid.origin.x + (a - 0.5) * grid.cell,
  y: grid.origin.y + (b - 0.5) * grid.cell,
});

/**
 * Draw the 36 outcomes of two dice. `colorOf` picks each cell's colour (null
 * leaves it plain); `text` prints something in each cell, such as the sum.
 */
export function diceGrid(
  g: Draw,
  grid: DiceGrid,
  colorOf: (a: number, b: number) => string | null,
  o: { text?: (a: number, b: number) => string; alpha?: number } = {},
): void {
  const { origin, cell } = grid;
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const color = colorOf(a, b);
      const c = cellAt(grid, a, b);
      const h = cell / 2 - 0.04;
      box(g, { x: c.x - h, y: c.y - h }, { x: c.x + h, y: c.y + h }, {
        color: color ?? C.faint,
        fill: color ? tint(color, 0.45) : undefined,
        width: color ? 2 : 1,
        alpha: o.alpha,
      });
      const t = o.text?.(a, b);
      if (t) g.label(c, t, { color: color ? C.ink : C.dim, size: 12, bold: true, alpha: o.alpha });
    }
  }
  for (let k = 1; k <= 6; k++) {
    g.label({ x: origin.x + (k - 0.5) * cell, y: origin.y }, String(k), { color: C.dim, size: 12, bold: true, dy: -14 });
    g.label({ x: origin.x, y: origin.y + (k - 0.5) * cell }, String(k), { color: C.dim, size: 12, bold: true, dx: -12 });
  }
  g.label({ x: origin.x + 3 * cell, y: origin.y + 6 * cell }, "first die across, second up", { color: C.dim, size: 12, bold: true, dy: 12 });
}

/** The number of ways two dice make the sum s. */
export const waysToSum = (s: number): number => (s < 2 || s > 12 ? 0 : 6 - Math.abs(s - 7));
