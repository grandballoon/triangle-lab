// Plane geometry for lab lessons: vectors, the classic constructions, and the
// constraints a draggable point can be held to. Pure — no DOM, no canvas.
//
// Stage coordinates are mathematical: y points up and angles run
// counter-clockwise, in radians.

import { add, clamp, dist, dot, len, normalize, scale, sub, type Vec } from "../geometry.ts";

export { add, clamp, dist, dot, len, mid, normalize, scale, sub, type Vec } from "../geometry.ts";

export const TAU = Math.PI * 2;

export const vec = (x: number, y: number): Vec => ({ x, y });
export const cross = (p: Vec, q: Vec): number => p.x * q.y - p.y * q.x;
export const lerp = (p: Vec, q: Vec, t: number): Vec => ({
  x: p.x + (q.x - p.x) * t,
  y: p.y + (q.y - p.y) * t,
});
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Quarter turn counter-clockwise. */
export const perp = (p: Vec): Vec => ({ x: -p.y, y: p.x });
export const toDeg = (rad: number): number => (rad * 180) / Math.PI;
export const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function rotate(p: Vec, angle: number): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export const rotateAbout = (p: Vec, center: Vec, angle: number): Vec =>
  add(center, rotate(sub(p, center), angle));

/** Direction of `p` from the origin, in (−π, π]. */
export const angleOf = (p: Vec): number => Math.atan2(p.y, p.x);

/** The point at distance `r` from `center` in direction `angle`. */
export const polar = (center: Vec, r: number, angle: number): Vec => ({
  x: center.x + r * Math.cos(angle),
  y: center.y + r * Math.sin(angle),
});

/** Wrap an angle into [0, 2π). */
export const wrapAngle = (a: number): number => ((a % TAU) + TAU) % TAU;

/** Unsigned angle ∠AVB at vertex `v`, in [0, π]. */
export function angleAt(a: Vec, v: Vec, b: Vec): number {
  const p = normalize(sub(a, v));
  const q = normalize(sub(b, v));
  return Math.acos(clamp(dot(p, q), -1, 1));
}

/** Foot of the perpendicular from `p` to the line through `a` and `b`. */
export function project(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-18) return { ...a };
  return add(a, scale(ab, dot(sub(p, a), ab) / l2));
}

/** Closest point to `p` on the segment `ab`. */
export function closestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-18) return { ...a };
  return add(a, scale(ab, clamp(dot(sub(p, a), ab) / l2, 0, 1)));
}

/** Perpendicular distance from `p` to the line through `a` and `b`. */
export const distToLine = (p: Vec, a: Vec, b: Vec): number => dist(p, project(p, a, b));

/** Mirror image of `p` in the line through `a` and `b`. */
export function reflect(p: Vec, a: Vec, b: Vec): Vec {
  const f = project(p, a, b);
  return { x: 2 * f.x - p.x, y: 2 * f.y - p.y };
}

/** Where line `ab` meets line `cd`, or null when they are parallel. */
export function lineLine(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = cross(r, s);
  if (Math.abs(denom) < 1e-12) return null;
  return add(a, scale(r, cross(sub(c, a), s) / denom));
}

/** Where line `ab` meets the circle: 0, 1 or 2 points, ordered from a to b. */
export function lineCircle(a: Vec, b: Vec, center: Vec, r: number): Vec[] {
  const d = normalize(sub(b, a));
  const f = project(center, a, b);
  const h2 = r * r - dist(f, center) ** 2;
  if (h2 < -1e-9) return [];
  if (h2 < 1e-9) return [f];
  const h = Math.sqrt(h2);
  return [sub(f, scale(d, h)), add(f, scale(d, h))];
}

/** Where two circles meet: 0, 1 or 2 points. */
export function circleCircle(c1: Vec, r1: number, c2: Vec, r2: number): Vec[] {
  const d = dist(c1, c2);
  if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const u = scale(sub(c2, c1), 1 / d);
  const base = add(c1, scale(u, a));
  if (h2 < 1e-9) return [base];
  const off = scale(perp(u), Math.sqrt(h2));
  return [add(base, off), sub(base, off)];
}

/** The two points where tangents from `p` touch the circle (none if inside). */
export function tangentPoints(p: Vec, center: Vec, r: number): Vec[] {
  const d = dist(p, center);
  if (d <= r) return [];
  // Thales: the tangent points lie on the circle with diameter p–center.
  return circleCircle(center, r, lerp(p, center, 0.5), d / 2);
}

export function centroid(pts: readonly Vec[]): Vec {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/** Signed area: positive when the vertices run counter-clockwise. */
export function signedArea(pts: readonly Vec[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) sum += cross(pts[i], pts[(i + 1) % pts.length]);
  return sum / 2;
}

export const polygonArea = (pts: readonly Vec[]): number => Math.abs(signedArea(pts));
export const triangleArea = (a: Vec, b: Vec, c: Vec): number => Math.abs(cross(sub(b, a), sub(c, a))) / 2;

/** Centre of the circle through three points (falls back to their centroid if collinear). */
export function circumcenter(a: Vec, b: Vec, c: Vec): Vec {
  const d = 2 * cross(sub(b, a), sub(c, a));
  if (Math.abs(d) < 1e-12) return centroid([a, b, c]);
  const a2 = dot(a, a);
  const b2 = dot(b, b);
  const c2 = dot(c, c);
  return {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  };
}

/** Where the angle bisectors meet: the centre of the inscribed circle. */
export function incenter(a: Vec, b: Vec, c: Vec): Vec {
  const la = dist(b, c);
  const lb = dist(c, a);
  const lc = dist(a, b);
  const p = la + lb + lc || 1;
  return {
    x: (la * a.x + lb * b.x + lc * c.x) / p,
    y: (la * a.y + lb * b.y + lc * c.y) / p,
  };
}

/** Where the altitudes meet. */
export function orthocenter(a: Vec, b: Vec, c: Vec): Vec {
  const o = circumcenter(a, b, c);
  return { x: a.x + b.x + c.x - 2 * o.x, y: a.y + b.y + c.y - 2 * o.y };
}

/** Vertices of a regular n-gon, counter-clockwise from `start`. */
export function regularPolygon(center: Vec, r: number, n: number, start = Math.PI / 2): Vec[] {
  return Array.from({ length: n }, (_, i) => polar(center, r, start + (i * TAU) / n));
}

// --- Constraints -----------------------------------------------------------
//
// A constraint maps where the hand wants a point to where the point may be.
// Arguments may be getters, so a constraint can follow other moving points.

export type Constraint = (p: Vec) => Vec;
export type Dyn<T> = T | (() => T);

const read = <T>(d: Dyn<T>): T => (typeof d === "function" ? (d as () => T)() : d);

export const onCircle = (center: Dyn<Vec>, r: Dyn<number>): Constraint => (p) => {
  const c = read(center);
  const d = sub(p, c);
  const dir = len(d) < 1e-9 ? { x: 1, y: 0 } : normalize(d);
  return add(c, scale(dir, read(r)));
};

export const onSegment = (a: Dyn<Vec>, b: Dyn<Vec>): Constraint => (p) =>
  closestOnSegment(p, read(a), read(b));

export const onLine = (a: Dyn<Vec>, b: Dyn<Vec>): Constraint => (p) => project(p, read(a), read(b));

export const inBox = (xmin: number, xmax: number, ymin: number, ymax: number): Constraint => (p) => ({
  x: clamp(p.x, xmin, xmax),
  y: clamp(p.y, ymin, ymax),
});

/** Keep the point within [rmin, rmax] of a centre. */
export const inRing = (center: Dyn<Vec>, rmin: Dyn<number>, rmax: Dyn<number>): Constraint => (p) => {
  const c = read(center);
  const d = sub(p, c);
  const l = len(d);
  const dir = l < 1e-9 ? { x: 1, y: 0 } : scale(d, 1 / l);
  return add(c, scale(dir, clamp(l, read(rmin), read(rmax))));
};

export const snapToGrid = (step = 1): Constraint => (p) => ({
  x: Math.round(p.x / step) * step,
  y: Math.round(p.y / step) * step,
});

/** Apply constraints left to right. */
export const both = (...cs: Constraint[]): Constraint => (p) => cs.reduce((q, c) => c(q), p);

// --- Formatting ------------------------------------------------------------

/** A number for display: fixed decimals, no trailing zeros, no "-0". */
export function fmt(value: number, digits = 1): string {
  const s = value.toFixed(digits);
  const trimmed = s.includes(".") ? s.replace(/\.?0+$/, "") : s;
  return trimmed === "-0" ? "0" : trimmed;
}

/** Radians as whole degrees with the degree sign. */
export const fmtDeg = (rad: number, digits = 0): string => `${fmt(toDeg(rad), digits)}°`;
