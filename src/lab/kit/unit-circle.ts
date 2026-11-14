// The unit circle and the three waves it unrolls into. Pure: an angle and a
// clock go in, the angle's ratios, the next angle and the wave outlines (in
// θ–value coordinates, to be placed on the stage by the lesson) come out.

import { clamp, TAU, wrapAngle, type Vec } from "../geo.ts";

/** Below this |cos θ| the tangent is treated as undefined: the radius is nearly vertical. */
export const VERTICAL = 1e-3;

export interface Ratios {
  sin: number;
  cos: number;
  /** null where cos θ = 0, at 90° and 270°. */
  tan: number | null;
}

/** sin, cos and tan of θ: the height, the width, and height ÷ width. */
export function ratiosOf(theta: number): Ratios {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  return { sin, cos, tan: Math.abs(cos) < VERTICAL ? null : sin / cos };
}

/** Which quarter of the turn θ is in, 1 to 4, counting from the positive x-axis. */
export function quadrantOf(theta: number): 1 | 2 | 3 | 4 {
  return (Math.min(3, Math.floor(wrapAngle(theta) / (Math.PI / 2))) + 1) as 1 | 2 | 3 | 4;
}

/** The longest gap between frames that still counts as smooth motion, in seconds. */
export const MAX_STEP_SECONDS = 0.1;

/**
 * The angle `dt` seconds later, turning counter-clockwise at `speed` radians a
 * second and starting again at 0 after a full turn. A long gap (a hidden tab,
 * a first frame) moves it at most `MAX_STEP_SECONDS` worth, so it never jumps.
 */
export function turned(theta: number, dt: number, speed: number): number {
  return wrapAngle(theta + clamp(dt, 0, MAX_STEP_SECONDS) * speed);
}

/** The angle of `p` seen from `center`, in [0, 2π). */
export function angleFrom(center: Vec, p: Vec): number {
  return wrapAngle(Math.atan2(p.y - center.y, p.x - center.x));
}

/** Samples of `fn` from θ = `from` to `to`, about `perTurn` to a full turn, as (θ, value). */
export function wave(fn: (theta: number) => number, from: number, to: number, perTurn = 180): Vec[] {
  if (!(to > from)) return [];
  const n = Math.max(1, Math.ceil(((to - from) / TAU) * perTurn));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    return { x, y: fn(x) };
  });
}

/**
 * The tangent curve from θ = `from` to `to`, as (θ, value), cut into one
 * piece per branch between asymptotes and clipped to |tan θ| ≤ `limit`, so a
 * piece ends exactly where it leaves the visible band.
 */
export function tanBranches(from: number, to: number, limit: number, perTurn = 360): Vec[][] {
  if (!(to > from)) return [];
  const edge = Math.atan(limit); // tan reaches ±limit this far either side of a multiple of π
  const branches: Vec[][] = [];
  // Branch k is centred on kπ and runs over (kπ − π/2, kπ + π/2).
  for (let k = Math.floor(from / Math.PI); k * Math.PI - Math.PI / 2 < to; k++) {
    const lo = Math.max(from, k * Math.PI - edge);
    const hi = Math.min(to, k * Math.PI + edge);
    if (hi <= lo) continue;
    const piece = wave(Math.tan, lo, hi, perTurn);
    branches.push(piece.map((p) => ({ x: p.x, y: clamp(p.y, -limit, limit) })));
  }
  return branches;
}

/** The asymptotes of tan θ between `from` and `to`: the odd multiples of π/2. */
export function asymptotes(from: number, to: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil((from - Math.PI / 2) / Math.PI); k * Math.PI + Math.PI / 2 <= to; k++) {
    out.push(k * Math.PI + Math.PI / 2);
  }
  return out;
}

/** "+" or "−" for the sign of a coordinate. */
export const signOf = (v: number): string => (v < 0 ? "−" : "+");
