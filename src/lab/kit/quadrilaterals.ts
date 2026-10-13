// Helpers shared by the quadrilateral lab lessons: interior angles that may be
// reflex, tests for a well-formed quadrilateral, and four draggable vertices
// that can never be pulled into a self-crossing or flattened shape.

import {
  angleOf,
  clamp,
  closestOnSegment,
  cross,
  dist,
  lerp,
  signedArea,
  sub,
  wrapAngle,
  type Constraint,
  type Vec,
} from "../geo.ts";
import type { Handle, Scene } from "../scene.ts";

/** The faint fill behind a figure. */
export const GLASS = "rgba(255, 255, 255, 0.05)";

/** Two lengths (or angles) that agree up to rounding error. */
export const same = (a: number, b: number, tolerance = 1e-6): boolean => Math.abs(a - b) < tolerance;

/** `=` or `≠` in LaTeX, for a readout comparing two values. */
export const eq = (equal: boolean): string => (equal ? "=" : "\\ne");

export interface Corner {
  /** Direction of the side leaving the vertex counter-clockwise. */
  from: number;
  /** The interior angle, in (0, 2π): more than π at a reflex corner. */
  sweep: number;
}

/** The interior angle at `v` of a polygon whose vertices run counter-clockwise. */
export function interior(prev: Vec, v: Vec, next: Vec): Corner {
  const from = angleOf(sub(next, v));
  return { from, sweep: wrapAngle(angleOf(sub(prev, v)) - from) };
}

/** The four interior angles of a counter-clockwise quadrilateral. */
export const corners = (q: readonly Vec[]): Corner[] =>
  q.map((v, i) => interior(q[(i + 3) % 4], v, q[(i + 1) % 4]));

const properlyCross = (a: Vec, b: Vec, c: Vec, d: Vec): boolean =>
  cross(sub(b, a), sub(c, a)) * cross(sub(b, a), sub(d, a)) < 0 &&
  cross(sub(d, c), sub(a, c)) * cross(sub(d, c), sub(b, c)) < 0;

/** How close a vertex may come to a side it does not belong to. */
const CLEARANCE = 1;

/** The sharpest corner allowed. */
const SHARPEST = 0.4;

/**
 * True when `q` is a counter-clockwise quadrilateral that does not cross
 * itself, has no vertex within `CLEARANCE` of a side it is not on (so no side
 * is short) and has no needle-sharp corner. It may be concave.
 */
export function isSimpleQuad(q: readonly Vec[]): boolean {
  if (signedArea(q) <= 0) return false;
  if (corners(q).some((c) => c.sweep < SHARPEST)) return false;
  for (let i = 0; i < 4; i++) {
    const [b, c, d] = [q[(i + 1) % 4], q[(i + 2) % 4], q[(i + 3) % 4]];
    if (dist(q[i], closestOnSegment(q[i], b, c)) < CLEARANCE) return false;
    if (dist(q[i], closestOnSegment(q[i], c, d)) < CLEARANCE) return false;
  }
  return !properlyCross(q[0], q[1], q[2], q[3]) && !properlyCross(q[1], q[2], q[3], q[0]);
}

/** The flattest corner a convex quadrilateral is allowed, short of a straight angle. */
const FLATTEST = Math.PI - 0.2;

/** `isSimpleQuad`, and every interior angle clearly under 180°. */
export const isConvexQuad = (q: readonly Vec[]): boolean =>
  isSimpleQuad(q) && corners(q).every((c) => c.sweep < FLATTEST);

const MARCH = 16;
const REFINE = 12;

/**
 * The farthest point toward `to` that can be reached from `from` without
 * leaving the region where `ok` holds. `from` must already be in it.
 */
function advance(from: Vec, to: Vec, ok: (p: Vec) => boolean): Vec {
  let good = 0;
  let bad = 1;
  // March first, so the point cannot jump across a forbidden strip to a legal
  // position on its far side.
  for (let i = 1; i <= MARCH; i++) {
    if (!ok(lerp(from, to, i / MARCH))) {
      bad = i / MARCH;
      break;
    }
    good = i / MARCH;
  }
  if (good === 1) return to;
  for (let i = 0; i < REFINE; i++) {
    const t = (good + bad) / 2;
    if (ok(lerp(from, to, t))) good = t;
    else bad = t;
  }
  return lerp(from, to, good);
}

export interface FreeQuadOptions {
  labels: readonly string[];
  /** Which quadrilaterals are allowed; the starting one must be. */
  ok: (q: readonly Vec[]) => boolean;
  /** A place vertex `i` would rather be when it is near `p` (taken only if allowed). */
  snap?: (i: number, p: Vec) => Vec;
}

const BOX = { xmin: -7.3, xmax: 7.3, ymin: -4.4, ymax: 4.3 };
const inBox = (p: Vec): boolean => p.x >= BOX.xmin && p.x <= BOX.xmax && p.y >= BOX.ymin && p.y <= BOX.ymax;

/**
 * Four draggable vertices, counter-clockwise from `start`. Each one stops at
 * the edge of the allowed region instead of entering it, and slides along
 * that edge when the hand keeps pulling.
 */
export function freeQuad(s: Scene, start: readonly Vec[], o: FreeQuadOptions): Handle[] {
  const handles: Handle[] = [];

  const constrain = (i: number): Constraint => (target) => {
    // While the scene is still being built the neighbours do not exist yet.
    if (handles.length < 4) return target;
    const here = { x: handles[i].x, y: handles[i].y };
    const allowed = (p: Vec): boolean => o.ok(handles.map((h, j) => (j === i ? p : h)));
    const p = { x: clamp(target.x, BOX.xmin, BOX.xmax), y: clamp(target.y, BOX.ymin, BOX.ymax) };

    // Straight toward the hand as far as possible, then along each axis in
    // turn: that is what lets the point slide round an obstacle.
    let q = advance(here, p, allowed);
    q = advance(q, { x: p.x, y: q.y }, allowed);
    q = advance(q, { x: q.x, y: p.y }, allowed);

    const snapped = o.snap?.(i, q);
    return snapped && inBox(snapped) && allowed(snapped) ? snapped : q;
  };

  start.forEach((p, i) => handles.push(s.point(p.x, p.y, { label: o.labels[i], constrain: constrain(i) })));
  return handles;
}
