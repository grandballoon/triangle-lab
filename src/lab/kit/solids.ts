// Shared pieces of the solid-geometry lessons: a little 3D vector algebra,
// builders for the face lists of prisms, pyramids and boxes, outlines for the
// round solids, and convex polyhedra recovered from their vertices alone.
//
// Everything is drawn through an Orbit (solid.ts). 3D axes: x right, y up,
// z toward the viewer.

import { cross, signedArea, sub, TAU, type Vec } from "../geo.ts";
import { tint, type Draw, type Fill, type Stroke } from "../draw.ts";
import { add3, p3, path3, scale3, sub3, type Orbit, type P3 } from "../solid.ts";

const EPS = 1e-9;

// --- Vectors -----------------------------------------------------------------

export const dot3 = (a: P3, b: P3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: P3, b: P3): P3 =>
  p3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len3 = (a: P3): number => Math.hypot(a.x, a.y, a.z);
export const mid3 = (a: P3, b: P3): P3 => scale3(add3(a, b), 0.5);

/** The unit vector along `a`, or the zero vector when `a` has no direction. */
export function unit3(a: P3): P3 {
  const l = len3(a);
  return l < EPS ? p3(0, 0, 0) : scale3(a, 1 / l);
}

export function centroid3(pts: readonly P3[]): P3 {
  const sum = pts.reduce(add3, p3(0, 0, 0));
  return scale3(sum, 1 / Math.max(pts.length, 1));
}

/** Area of triangle ABC in space. */
export const triangleArea3 = (a: P3, b: P3, c: P3): number => len3(cross3(sub3(b, a), sub3(c, a))) / 2;

/** Volume of tetrahedron ABCD, from the scalar triple product. */
export const tetraVolume = (a: P3, b: P3, c: P3, d: P3): number =>
  Math.abs(dot3(sub3(d, a), cross3(sub3(b, a), sub3(c, a)))) / 6;

// --- Styles and marks ----------------------------------------------------------

/** The translucent look of a solid's faces: a faint fill and a clear edge. */
export const glass = (color: string, fill = 0.08): Fill => ({
  fill: tint(color, fill),
  stroke: tint(color, 0.9),
  width: 2,
});

/**
 * A square corner at `v` between the directions toward `a` and `b`, drawn in
 * space so it foreshortens with the figure. `size` is in 3D units.
 */
export function rightAngle3(g: Draw, cam: Orbit, v: P3, a: P3, b: P3, o: Stroke = {}, size = 0.3): void {
  const u = scale3(unit3(sub3(a, v)), size);
  const w = scale3(unit3(sub3(b, v)), size);
  path3(g, cam, [add3(v, u), add3(v, add3(u, w)), add3(v, w)], { width: 2, ...o });
}

// --- Face lists ----------------------------------------------------------------

/** A regular n-gon in the horizontal plane at height `y`, centred on the y-axis. */
export function polygonY(n: number, r: number, y: number, start = Math.PI / 2): P3[] {
  return Array.from({ length: n }, (_, i) => {
    const t = start + (TAU * i) / n;
    return p3(r * Math.cos(t), y, r * Math.sin(t));
  });
}

/** The lateral faces of a prism whose bases are the matching rings `bottom` and `top`. */
export function prismSides(bottom: readonly P3[], top: readonly P3[]): P3[][] {
  return bottom.map((p, i) => {
    const j = (i + 1) % bottom.length;
    return [p, bottom[j], top[j], top[i]];
  });
}

/** The lateral faces of a pyramid. */
export function pyramidSides(base: readonly P3[], apex: P3): P3[][] {
  return base.map((p, i) => [p, base[(i + 1) % base.length], apex]);
}

/**
 * The six faces of a box centred at `c` with half-edges `hx`, `hy`, `hz`, each
 * wound counter-clockwise as seen from outside, in the order ±x, ±y, ±z.
 */
export function boxFaces(c: P3, hx: number, hy = hx, hz = hx): P3[][] {
  const at = (x: number, y: number, z: number): P3 => p3(c.x + x * hx, c.y + y * hy, c.z + z * hz);
  return [
    [at(1, -1, 1), at(1, -1, -1), at(1, 1, -1), at(1, 1, 1)],
    [at(-1, -1, -1), at(-1, -1, 1), at(-1, 1, 1), at(-1, 1, -1)],
    [at(-1, 1, 1), at(1, 1, 1), at(1, 1, -1), at(-1, 1, -1)],
    [at(-1, -1, -1), at(1, -1, -1), at(1, -1, 1), at(-1, -1, 1)],
    [at(-1, -1, 1), at(1, -1, 1), at(1, 1, 1), at(-1, 1, 1)],
    [at(1, -1, -1), at(-1, -1, -1), at(-1, 1, -1), at(1, 1, -1)],
  ];
}

/**
 * Whether a face wound counter-clockwise from outside is turned toward the
 * viewer. The projection keeps orientation, so the test is a signed area.
 */
export const facesViewer = (cam: Orbit, pts: readonly P3[]): boolean =>
  signedArea(pts.map((p) => cam.project(p))) > 0;

// --- Round solids ----------------------------------------------------------------

/**
 * The two rulings that outline a cylinder-like surface on screen: indices of
 * the points of `ring` lying farthest to either side of the projected
 * direction from `ring[i]` to `partner[i]` (the matching point of the other rim).
 */
export function outlineRulings(cam: Orbit, ring: readonly P3[], partner: readonly P3[]): [number, number] {
  const pts = ring.map((p) => cam.project(p));
  const m = Math.floor(ring.length / 2);
  const axis = sub(cam.project(partner[m]), pts[m]);
  let lo = 0;
  let hi = 0;
  let least = Infinity;
  let most = -Infinity;
  pts.forEach((p, i) => {
    const side = cross(axis, sub(p, pts[m]));
    if (side < least) [least, lo] = [side, i];
    if (side > most) [most, hi] = [side, i];
  });
  return [lo, hi];
}

/**
 * The two points of a cone's rim (as indices) where its outline leaves the rim
 * for the apex, or null when the apex is seen inside the rim (looking down
 * the axis).
 */
export function coneOutline(cam: Orbit, apex: P3, rim: readonly P3[]): [number, number] | null {
  const a = cam.project(apex);
  const bearing = (p: Vec): number => Math.atan2(p.y - a.y, p.x - a.x);
  let angle = 0;
  let least = 0;
  let most = 0;
  let lo = 0;
  let hi = 0;
  let previous = bearing(cam.project(rim[0]));
  for (let i = 1; i < rim.length; i++) {
    const now = bearing(cam.project(rim[i]));
    let turn = now - previous;
    if (turn > Math.PI) turn -= TAU;
    if (turn < -Math.PI) turn += TAU;
    angle += turn;
    previous = now;
    if (angle < least) [least, lo] = [angle, i];
    if (angle > most) [most, hi] = [angle, i];
  }
  // A rim that winds all the way round the apex has no tangent from it.
  return most - least > Math.PI ? null : [lo, hi];
}

/**
 * Draw a right circular cone as glass: its silhouette shaded, the rim, and the
 * two outline rulings. `rim` is an open ring of distinct points.
 */
export function cone3(g: Draw, cam: Orbit, apex: P3, rim: readonly P3[], color: string): void {
  const edge: Stroke = { color: tint(color, 0.9), width: 2 };
  const flat = rim.map((p) => cam.project(p));
  const tip = cam.project(apex);
  const outline = coneOutline(cam, apex, rim);
  let silhouette: Vec[] = flat;
  if (outline) {
    // Of the two arcs between the tangent points, the outline follows the one
    // bulging away from the apex.
    const [from, to] = outline[0] < outline[1] ? outline : [outline[1], outline[0]];
    const inner = flat.slice(from, to + 1);
    const outer = [...flat.slice(to), ...flat.slice(0, from + 1)];
    const reach = (arc: Vec[]): number => Math.hypot(arc[arc.length >> 1].x - tip.x, arc[arc.length >> 1].y - tip.y);
    silhouette = [tip, ...(reach(inner) > reach(outer) ? inner : outer)];
  }
  g.polygon(silhouette, { fill: tint(color, 0.1), stroke: null });
  if (outline) for (const i of outline) g.segment(tip, flat[i], edge);
  g.polygon(flat, { stroke: edge.color, width: 2 });
}

// --- Convex polyhedra ------------------------------------------------------------

export interface Polyhedron {
  vertices: P3[];
  /** Each face as vertex indices, counter-clockwise seen from outside. */
  faces: number[][];
  edges: [number, number][];
}

/**
 * The faces and edges of the convex polyhedron with the given vertices (every
 * one of which must be a corner of it). A plane through three vertices holds a
 * face exactly when no vertex lies beyond it.
 */
export function convexHull(vertices: readonly P3[]): Polyhedron {
  const tolerance = 1e-6;
  const centre = centroid3(vertices);
  const found = new Map<string, number[]>();
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        let normal = unit3(cross3(sub3(vertices[j], vertices[i]), sub3(vertices[k], vertices[i])));
        if (len3(normal) === 0) continue;
        if (dot3(normal, sub3(centre, vertices[i])) > 0) normal = scale3(normal, -1);
        const heights = vertices.map((v) => dot3(normal, sub3(v, vertices[i])));
        if (heights.some((h) => h > tolerance)) continue;

        const on = heights.flatMap((h, index) => (Math.abs(h) <= tolerance ? [index] : []));
        const key = on.join(",");
        if (found.has(key)) continue;

        // Order the face's corners by angle about its centre, in its own plane.
        const middle = centroid3(on.map((index) => vertices[index]));
        const u = unit3(sub3(vertices[on[0]], middle));
        const w = cross3(normal, u);
        const angle = (index: number): number => {
          const d = sub3(vertices[index], middle);
          return Math.atan2(dot3(d, w), dot3(d, u));
        };
        found.set(key, [...on].sort((a, b) => angle(a) - angle(b)));
      }
    }
  }

  const faces = [...found.values()];
  const edges = new Map<string, [number, number]>();
  for (const face of faces) {
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length];
      edges.set(`${Math.min(a, b)},${Math.max(a, b)}`, [Math.min(a, b), Math.max(a, b)]);
    });
  }
  return { vertices: [...vertices], faces, edges: [...edges.values()] };
}
