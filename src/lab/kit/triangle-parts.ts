// The movements the triangle-parts lessons are built on (perimeter.ts,
// semiperimeter.ts, medians.ts, bisectors.ts), as pure functions of points:
// walking a knob round a triangle's edge, and a knob on a side that locks
// onto the one point it is looking for and takes a firm pull to leave.

import { clamp, closestOnSegment, dist, dot, lerp, sub, type Vec } from "../geo.ts";

/** A triangle's corners, walked A → B → C → A. */
export type Corners = readonly [Vec, Vec, Vec];

/** The three sides in walking order: from each corner to the next. */
export function sides(t: Corners): [Vec, Vec][] {
  return [
    [t[0], t[1]],
    [t[1], t[2]],
    [t[2], t[0]],
  ];
}

/** How far it is all the way round. */
export function perimeterOf(t: Corners): number {
  return sides(t).reduce((sum, [p, q]) => sum + dist(p, q), 0);
}

/** The point `d` along the edge from A, walking A → B → C → A; clamped to the walk. */
export function edgeAt(t: Corners, d: number): Vec {
  let left = clamp(d, 0, perimeterOf(t));
  for (const [p, q] of sides(t)) {
    const len = dist(p, q);
    if (left <= len) return len === 0 ? p : lerp(p, q, left / len);
    left -= len;
  }
  return t[0];
}

/** How far along the walk from A the nearest point of the edge to `p` is. */
export function edgeDistanceOf(t: Corners, p: Vec): number {
  let best = 0;
  let bestGap = Infinity;
  let before = 0;
  for (const [a, b] of sides(t)) {
    const len = dist(a, b);
    const f = len === 0 ? 0 : clamp(dot(sub(p, a), sub(b, a)) / (len * len), 0, 1);
    const gap = dist(p, lerp(a, b, f));
    if (gap < bestGap) {
      bestGap = gap;
      best = before + f * len;
    }
    before += len;
  }
  return best;
}

/**
 * How far the knob has walked, from `last`, now that it is nearest the edge
 * `next` along. A knob only walks along the edge, so a jump of more than half
 * the way round is the walk passing its start: walking on past it stays at
 * the full way round, and walking back past it stays at the start.
 */
export function walkOn(last: number, next: number, total: number): number {
  if (next - last > total / 2) return 0;
  if (last - next > total / 2) return total;
  return clamp(next, 0, total);
}

/** The edge walked so far, from A to `d` along it: the corners passed, then where the knob is. */
export function walkedPath(t: Corners, d: number): Vec[] {
  const path: Vec[] = [t[0]];
  let left = clamp(d, 0, perimeterOf(t));
  for (const [p, q] of sides(t)) {
    const len = dist(p, q);
    if (left <= len) {
      path.push(len === 0 ? p : lerp(p, q, left / len));
      return path;
    }
    path.push(q);
    left -= len;
  }
  return path;
}

/** A knob that slides along a side and locks onto one point of it. */
export interface Lock {
  /** Where the knob is. */
  at: Vec;
  locked: boolean;
}

/**
 * Where a knob on the side `p`–`q`, pulled toward `pulled`, comes to rest.
 * It locks onto `target` once within `catchAt` of it, and once locked stays
 * there until pulled more than `releaseAt` away, so it is easy to land on and
 * hard to knock off.
 */
export function slideToLock(pulled: Vec, p: Vec, q: Vec, target: Vec, wasLocked: boolean, catchAt: number, releaseAt: number): Lock {
  const along = closestOnSegment(pulled, p, q);
  const reach = wasLocked ? releaseAt : catchAt;
  return dist(along, target) <= reach ? { at: target, locked: true } : { at: along, locked: false };
}

