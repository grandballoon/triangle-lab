// Three dimensions on a flat stage. An Orbit is a camera circling the origin;
// it projects 3D points to stage coordinates, and the helpers below draw the
// usual parts of a solid through it. Faces are painted back to front, which
// is all the hidden-surface handling convex solids need.
//
// 3D axes: x right, y up, z toward the viewer.

import { clamp, TAU, type Vec } from "./geo.ts";
import { C, type Draw, type Fill, type LabelOptions, type Stroke } from "./draw.ts";

export interface P3 {
  x: number;
  y: number;
  z: number;
}

export const p3 = (x: number, y: number, z: number): P3 => ({ x, y, z });
export const add3 = (a: P3, b: P3): P3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: P3, b: P3): P3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale3 = (a: P3, s: number): P3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const lerp3 = (a: P3, b: P3, t: number): P3 => add3(a, scale3(sub3(b, a), t));
export const dist3 = (a: P3, b: P3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A projected point: stage position plus depth (larger is nearer the viewer). */
export interface Projected extends Vec {
  depth: number;
}

const PITCH_LIMIT = 1.45;
const TURN_PER_PIXEL = 0.01;

export class Orbit {
  /**
   * @param yaw Turn about the vertical axis, radians.
   * @param pitch Tilt of the top toward the viewer, radians.
   * @param center Where the 3D origin sits on the stage.
   * @param distance Camera distance in 3D units; smaller exaggerates perspective.
   */
  constructor(
    public yaw = 0.6,
    public pitch = 0.35,
    public center: Vec = { x: 0, y: 0 },
    public distance = 24,
  ) {}

  /** Turn by a screen-pixel drag: the near side of the solid follows the hand. */
  turn(dx: number, dy: number): void {
    this.yaw += dx * TURN_PER_PIXEL;
    this.pitch = clamp(this.pitch + dy * TURN_PER_PIXEL, -PITCH_LIMIT, PITCH_LIMIT);
  }

  project(p: P3): Projected {
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const x = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const y = p.y * cp - z1 * sp;
    const depth = p.y * sp + z1 * cp;
    const k = this.distance / Math.max(this.distance - depth, 1e-3);
    return { x: this.center.x + x * k, y: this.center.y + y * k, depth };
  }
}

export function segment3(g: Draw, cam: Orbit, a: P3, b: P3, o: Stroke = {}): void {
  g.segment(cam.project(a), cam.project(b), o);
}

export function path3(g: Draw, cam: Orbit, pts: readonly P3[], o: Stroke = {}): void {
  g.path(pts.map((p) => cam.project(p)), o);
}

export function polygon3(g: Draw, cam: Orbit, pts: readonly P3[], o: Fill = {}): void {
  g.polygon(pts.map((p) => cam.project(p)), o);
}

export function point3(
  g: Draw,
  cam: Orbit,
  p: P3,
  o: { label?: string; color?: string; r?: number; alpha?: number } = {},
): void {
  g.point(cam.project(p), o);
}

export function label3(g: Draw, cam: Orbit, p: P3, text: string, o: LabelOptions = {}): void {
  g.label(cam.project(p), text, o);
}

export interface Face extends Fill {
  pts: readonly P3[];
}

/** Paint faces farthest first, so nearer ones cover them. */
export function faces(g: Draw, cam: Orbit, list: readonly Face[]): void {
  const ordered = list
    .map((face) => {
      const projected = face.pts.map((p) => cam.project(p));
      const depth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
      return { face, projected, depth };
    })
    .sort((a, b) => a.depth - b.depth);
  for (const { face, projected } of ordered) g.polygon(projected, face);
}

/**
 * Points round a circle in space: centre `c`, radius `r`, lying in the plane
 * spanned by the perpendicular unit vectors `u` and `v`. Pass `from`/`to` for
 * an arc.
 */
export function ring(c: P3, u: P3, v: P3, r: number, from = 0, to = TAU, n = 64): P3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return add3(c, add3(scale3(u, r * Math.cos(t)), scale3(v, r * Math.sin(t))));
  });
}

/** A horizontal circle (in a plane of constant y). */
export const ringY = (c: P3, r: number, from = 0, to = TAU, n = 64): P3[] =>
  ring(c, p3(1, 0, 0), p3(0, 0, 1), r, from, to, n);

/** A sphere drawn as its outline plus an equator and one meridian. */
export function sphere3(g: Draw, cam: Orbit, c: P3, r: number, o: Fill = {}): void {
  const centre = cam.project(c);
  const k = cam.distance / Math.max(cam.distance - centre.depth, 1e-3);
  g.circle(centre, r * k, o);
  const faint: Stroke = { color: o.color ?? o.stroke ?? C.dim, width: 1.5, alpha: (o.alpha ?? 1) * 0.6 };
  path3(g, cam, ringY(c, r), faint);
  path3(g, cam, ring(c, p3(1, 0, 0), p3(0, 1, 0), r), faint);
}
