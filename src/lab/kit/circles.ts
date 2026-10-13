// Helpers shared by the circle and angle lessons: arcs as point lists (for
// filling regions with a curved edge) and a constraint that keeps two points
// of a circle from collapsing into one.

import { angleOf, polar, sub, TAU, type Constraint, type Vec } from "../geo.ts";

const ARC_STEP = 0.05; // radians between sampled points

/** Points along the arc from angle `from` to angle `to` (either direction). */
export function arcPoints(center: Vec, r: number, from: number, to: number): Vec[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / ARC_STEP));
  return Array.from({ length: n + 1 }, (_, i) => polar(center, r, from + ((to - from) * i) / n));
}

/** The turn from direction `b` to direction `a`, wrapped into (−π, π]. */
export function turnBetween(a: number, b: number): number {
  const d = (((a - b) % TAU) + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
}

/**
 * On the circle about `center`, but at least `gap` radians of arc away from
 * every direction in `avoid()`. The directions to avoid must themselves be
 * more than `2 * gap` apart.
 */
export const onCircleClearOf =
  (center: Vec, r: () => number, avoid: () => number[], gap: number): Constraint =>
  (p) => {
    let a = angleOf(sub(p, center));
    for (const b of avoid()) {
      const off = turnBetween(a, b);
      if (Math.abs(off) < gap) a = b + (off < 0 ? -gap : gap);
    }
    return polar(center, r(), a);
  };
