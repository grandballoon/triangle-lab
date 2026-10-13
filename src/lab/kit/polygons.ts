// A convex polygon whose corners the learner can drag, with a changeable
// number of sides. Shared by the polygon lessons that need a general (not
// regular) polygon and must still be able to rely on it being convex.

import { C } from "../draw.ts";
import { cross, dist, regularPolygon, sub, type Vec } from "../geo.ts";
import type { Handle, Scene } from "../scene.ts";

/** One colour per piece when a polygon is cut up or its corners are told apart. */
export const PIECES = [C.gold, C.blue, C.pink, C.green, C.violet, C.orange, C.cyan, C.red] as const;
export const pieceColor = (i: number): string => PIECES[i % PIECES.length];

export interface ConvexPolygonOptions {
  /** Most sides the polygon will ever have. */
  max: number;
  /** How many sides it has right now. */
  sides: () => number;
  /** The regular polygon it starts as, and returns to when `sides` changes. */
  center: Vec;
  radius: number;
  /** Where corners may go: [xmin, xmax, ymin, ymax]. */
  box: readonly [number, number, number, number];
  /** Label and colour for the first corner. */
  first?: { label: string; color: string };
}

export interface ConvexPolygon {
  /**
   * The corners, counter-clockwise. Call once at the top of `draw` and of
   * `readout`: it also notices a changed side count and lays the polygon out
   * afresh.
   */
  corners(): Handle[];
  /** Let the corners be dragged, or freeze and hide their grips. */
  setDraggable(on: boolean): void;
}

// Three consecutive corners must turn left and span a triangle whose shortest
// altitude is at least this, which keeps every interior angle clear of both
// 0° and 180° and every side clear of zero length.
const MIN_ALTITUDE = 0.25;
const BISECTIONS = 24;

/** Twice the triangle's area minus MIN_ALTITUDE times its longest side. */
function slack(a: Vec, b: Vec, c: Vec): number {
  const longest = Math.max(dist(a, b), dist(b, c), dist(c, a));
  return cross(sub(b, a), sub(c, b)) - MIN_ALTITUDE * longest;
}

export function convexPolygon(s: Scene, o: ConvexPolygonOptions): ConvexPolygon {
  const handles: Handle[] = [];
  let count = 0;
  let draggable = true;

  // Corner i may sit at p if the three corner-triples it belongs to stay
  // well-formed. Each condition is "a concave function of p is ≥ 0", so the
  // allowed region is convex.
  const allowed = (i: number, p: Vec): boolean => {
    const [xmin, xmax, ymin, ymax] = o.box;
    if (p.x < xmin || p.x > xmax || p.y < ymin || p.y > ymax) return false;
    const at = (k: number): Vec => {
      const j = (((i + k) % count) + count) % count;
      return j === i ? p : handles[j];
    };
    return slack(at(-2), at(-1), p) >= 0 && slack(at(-1), p, at(1)) >= 0 && slack(p, at(1), at(2)) >= 0;
  };

  // As far from `from` (allowed) toward `to` as the region permits.
  const advance = (i: number, from: Vec, to: Vec): Vec => {
    if (allowed(i, to)) return to;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < BISECTIONS; k++) {
      const t = (lo + hi) / 2;
      if (allowed(i, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) lo = t;
      else hi = t;
    }
    return { x: from.x + (to.x - from.x) * lo, y: from.y + (to.y - from.y) * lo };
  };

  const constrain = (i: number) => (p: Vec): Vec => {
    const h = handles[i];
    if (!h) return p; // still being constructed
    const here = { x: h.x, y: h.y };
    if (i >= count) return here;
    // Head straight for the target, then spend what is left of the move
    // along each axis so the corner slides along a boundary instead of sticking.
    const direct = advance(i, here, p);
    const alongX = advance(i, direct, { x: p.x, y: direct.y });
    return advance(i, alongX, { x: alongX.x, y: p.y });
  };

  const layOut = (): void => {
    count = Math.round(o.sides());
    const start = regularPolygon(o.center, o.radius, count);
    handles.forEach((h, i) => {
      const p = i < count ? start[i] : o.center;
      h.x = p.x;
      h.y = p.y;
    });
    applyDraggable();
  };

  const applyDraggable = (): void => {
    handles.forEach((h, i) => {
      h.enabled = draggable && i < count;
      h.hidden = !h.enabled;
    });
  };

  for (let i = 0; i < o.max; i++) {
    const first = i === 0 ? o.first : undefined;
    handles.push(s.point(o.center.x, o.center.y, { ...first, constrain: constrain(i) }));
  }
  layOut();

  return {
    corners() {
      if (Math.round(o.sides()) !== count) layOut();
      return handles.slice(0, count);
    },
    setDraggable(on) {
      draggable = on;
      applyDraggable();
    },
  };
}

/** Interior angle at each corner of a convex polygon, in radians. */
export function interiorAngles(pts: readonly Vec[]): number[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = sub(pts[(i + n - 1) % n], p);
    const b = sub(pts[(i + 1) % n], p);
    return Math.abs(Math.atan2(cross(a, b), a.x * b.x + a.y * b.y));
  });
}
