// Helpers shared by the lessons on triangle centres, the Pythagorean theorem
// and the congruence and similarity tests.

import type { Draw, Stroke } from "../draw.ts";
import type { Readout } from "../scene.ts";
import { dist, dot, project, sub, type Vec } from "../geo.ts";

/** Whether measured values agree, up to rounding in their computation. */
export function agree(...values: number[]): boolean {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return hi - lo <= 1e-6 * Math.max(1, Math.abs(lo), Math.abs(hi));
}

/** The readout tone for an identity that should hold. */
export const holds = (ok: boolean): Readout["tone"] => (ok ? "good" : "warn");

/**
 * Draw the perpendicular from `p` to the line through `a` and `b`, with a
 * right-angle mark at its foot. When the foot falls beyond the segment, the
 * side is extended to it with a thin dashed line. Returns the foot.
 */
export function dropPerp(g: Draw, p: Vec, a: Vec, b: Vec, o: Stroke = {}): Vec {
  const foot = project(p, a, b);
  const ab = sub(b, a);
  const t = dot(sub(foot, a), ab) / (dot(ab, ab) || 1);
  const extension: Stroke = { color: o.color, alpha: o.alpha, width: 1.5, dash: [5, 5] };
  if (t < 0) g.segment(a, foot, extension);
  if (t > 1) g.segment(b, foot, extension);
  g.segment(p, foot, o);
  if (dist(p, foot) > 1e-6) {
    const far = dist(foot, a) > dist(foot, b) ? a : b;
    g.angle(p, foot, far, { color: o.color, alpha: o.alpha, r: 14, width: 2 });
  }
  return foot;
}
