// Shared by the circle-angle and power-of-a-point lessons: points held to arcs
// of a circle in a fixed cyclic order, the arc a point outside the circle
// cannot see, and labels that sit outside the circle they name.

import type { Draw, LabelOptions } from "../draw.ts";
import { angleOf, clamp, dist, fmt, normalize, polar, sub, TAU, toDeg, wrapAngle, type Vec } from "../geo.ts";
import type { Handle, Scene } from "../scene.ts";

/** LaTeX for "arc AB". */
export const arcTex = (name: string): string => `\\overset{\\frown}{${name}}`;

/** LaTeX for an angle given in radians, printed in degrees to one decimal. */
export const degTex = (rad: number): string => `${fmt(toDeg(rad))}^\\circ`;

/** Direction of `p` as seen from `center`. */
export const bearing = (center: Vec, p: Vec): number => angleOf(sub(p, center));

/**
 * `angle` moved the short way onto the arc that starts at `from` and runs
 * counter-clockwise for `span` radians. The result is `from` plus an offset in
 * [0, span], so subtracting `from` gives the position along the arc.
 */
export function clampToArc(angle: number, from: number, span: number): number {
  const t = wrapAngle(angle - from);
  if (t <= span) return from + t;
  return t - span < TAU - t ? from + span : from;
}

function place(s: Scene, center: Vec, r: number, angle: number): Handle {
  const p = polar(center, r, angle);
  return s.point(p.x, p.y);
}

/**
 * Draggable points on a circle that keep their counter-clockwise order: each
 * stays between its neighbours, at least `minGap` and at most `maxGap` radians
 * from either. `angles` must start out in that order.
 */
export function ring(
  s: Scene,
  center: Vec,
  r: number,
  angles: readonly number[],
  minGap: number,
  maxGap = TAU,
): Handle[] {
  const pts = angles.map((a) => place(s, center, r, a));
  pts.forEach((h, i) => {
    const prev = pts[(i + pts.length - 1) % pts.length];
    const next = pts[(i + 1) % pts.length];
    h.constrain = (p) => {
      const from = bearing(center, prev);
      const room = wrapAngle(bearing(center, next) - from);
      const lo = Math.max(minGap, room - maxGap);
      const hi = Math.max(lo, Math.min(room - minGap, maxGap));
      return polar(center, r, clampToArc(bearing(center, p), from + lo, hi - lo));
    };
  });
  return pts;
}

/**
 * The arc of the circle on the far side from an outside point `p`: it runs
 * counter-clockwise from one tangent point (at angle `from`) for `span`
 * radians to the other. A line from `p` to any point of it is a secant, and at
 * either end the secant becomes a tangent.
 */
export function farArc(p: Vec, center: Vec, r: number): { from: number; span: number } {
  const half = Math.acos(clamp(r / Math.max(dist(p, center), r), 0, 1));
  return { from: bearing(center, p) + half, span: TAU - 2 * half };
}

/** Where the line from outside point `p` to `far` (on the circle) first meets the circle. */
export function nearPoint(p: Vec, far: Vec, center: Vec, r: number): Vec {
  const d2 = dist(p, far) ** 2;
  if (d2 < 1e-12) return { x: far.x, y: far.y };
  // Power of the point: (near distance)(far distance) = OP² − r².
  const t = Math.max(0, dist(p, center) ** 2 - r * r) / d2;
  return { x: p.x + (far.x - p.x) * t, y: p.y + (far.y - p.y) * t };
}

export interface FarPair {
  /** The two points, in counter-clockwise order along the far arc. */
  points: [Handle, Handle];
  /** Put the points back on the far arc after `p` has moved. Call every frame. */
  settle(): void;
}

/**
 * Two draggable points on the far arc from `p`, kept at least `gap` radians
 * apart and in order, the second at least `endGap` short of the arc's end.
 * `start` gives their first positions as bearings from the centre.
 */
export function farPair(
  s: Scene,
  p: Vec,
  center: Vec,
  r: number,
  start: readonly [number, number],
  gap: number,
  endGap = 0,
): FarPair {
  const offsetOf = (q: Vec): number => {
    const arc = farArc(p, center, r);
    return clampToArc(bearing(center, q), arc.from, arc.span) - arc.from;
  };
  const at = (offset: number): Vec => polar(center, r, farArc(p, center, r).from + offset);
  const end = (): number => farArc(p, center, r).span - endGap;

  const first = place(s, center, r, start[0]);
  const second = place(s, center, r, start[1]);
  first.constrain = (q) => at(clamp(offsetOf(q), 0, Math.max(0, Math.min(offsetOf(second), end()) - gap)));
  second.constrain = (q) => at(clamp(offsetOf(q), Math.min(offsetOf(first) + gap, end()), end()));

  return {
    points: [first, second],
    settle() {
      const a = clamp(offsetOf(first), 0, end() - gap);
      const b = clamp(offsetOf(second), a + gap, end());
      Object.assign(first, at(a));
      Object.assign(second, at(b));
    },
  };
}

/** A name for a point, pushed `push` pixels directly away from `center`. */
export function nameOutside(
  g: Draw,
  center: Vec,
  p: Vec,
  text: string,
  o: LabelOptions & { push?: number } = {},
): void {
  const dir = normalize(sub(p, center));
  const push = o.push ?? 26;
  g.label(p, text, { bold: true, ...o, dx: dir.x * push, dy: dir.y * push });
}
