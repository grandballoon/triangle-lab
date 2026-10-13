// Helpers shared by the area lessons: regions bounded by circular arcs, traced
// as polygons so they can be filled and measured, and a triangle whose corners
// can be dragged without it ever flattening.

import { inBox, mix, polar, polygonArea, type Vec } from "../geo.ts";
import type { Handle, Scene } from "../scene.ts";

/** Enough points per arc for a smooth filled outline. */
const SMOOTH = 48;

/**
 * Points per arc when an outline is traced to measure it. The polygon falls
 * short of the true region by about r²θ³ / 12n² per arc — under a millionth here.
 */
const FINE = 6000;

/** An arc: centre, radius, and the angles it runs between (either direction). */
export type Arc = readonly [center: Vec, r: number, from: number, to: number];

/** `n + 1` points along an arc, from angle `from` to angle `to`. */
export function arcPoints([center, r, from, to]: Arc, n = SMOOTH): Vec[] {
  return Array.from({ length: n + 1 }, (_, i) => polar(center, r, mix(from, to, i / n)));
}

/** The closed outline made by following arcs end to end. */
export const outline = (arcs: readonly Arc[], n = SMOOTH): Vec[] => arcs.flatMap((a) => arcPoints(a, n));

/**
 * The area inside a closed chain of arcs, measured directly from a fine
 * tracing of its boundary — no knowledge of how the region was built.
 */
export const tracedArea = (arcs: readonly Arc[]): number => polygonArea(outline(arcs, FINE));

/** Whether two independently computed values agree to display precision. */
export const agree = (a: number, b: number): boolean => Math.abs(a - b) < 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Three draggable corners A, B (below) and C (above). The boxes are far enough
 * apart that C stays strictly above line AB, so the triangle keeps its
 * orientation and a positive area wherever the corners go.
 */
export function looseTriangle(s: Scene): [Handle, Handle, Handle] {
  const a = s.point(-5, -3.2, { label: "A", constrain: inBox(-7.5, -2.5, -4.4, -1.6) });
  const b = s.point(5.2, -3.2, { label: "B", constrain: inBox(2.5, 7.5, -4.4, -1.6) });
  const c = s.point(1.2, 3.6, { label: "C", constrain: inBox(-6.5, 6.5, 1.2, 4.4) });
  return [a, b, c];
}
