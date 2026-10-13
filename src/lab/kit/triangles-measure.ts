// Small helpers shared by the "measuring triangles" lab lessons: similar
// triangles, trigonometric identities, area formulas and right-angle tests.

import type { Draw, LabelOptions } from "../draw.ts";
import { angleOf, clamp, len, normalize, polar, sub, TAU, type Constraint, type Vec } from "../geo.ts";

export const sq = (x: number): number => x * x;

/** `n / d`, or 0 when the denominator has collapsed. */
export const ratio = (n: number, d: number): number => (Math.abs(d) < 1e-9 ? 0 : n / d);

/**
 * Keep a point in the part of a ring around `center` between the directions
 * `from` and `to` (radians, counter-clockwise, less than a full turn apart).
 */
export function inSector(center: Vec, rmin: number, rmax: number, from: number, to: number): Constraint {
  const middle = (from + to) / 2;
  const half = (to - from) / 2;
  return (p) => {
    const d = sub(p, center);
    // Measure the direction from the sector's middle so it clamps to the nearer edge.
    let off = (angleOf(d) - middle) % TAU;
    if (off > Math.PI) off -= TAU;
    if (off < -Math.PI) off += TAU;
    return polar(center, clamp(len(d), rmin, rmax), middle + clamp(off, -half, half));
  };
}

/** A label beside `p`, pushed `px` screen pixels directly away from `from`. */
export function labelAway(g: Draw, p: Vec, text: string, from: Vec, o: LabelOptions & { px?: number } = {}): void {
  const d = normalize(sub(p, from));
  const px = o.px ?? 18;
  g.label(p, text, { bold: true, ...o, dx: d.x * px, dy: d.y * px });
}
