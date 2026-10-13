// Shared pieces for the transformations chapter: the scalene test triangle
// every lesson transforms, the two colours that tell a figure from its image,
// and the marks and readout fragments that compare the two.

import { C, tint, type Draw } from "../draw.ts";
import {
  add,
  angleAt,
  centroid,
  dist,
  fmt,
  incenter,
  lerp,
  normalize,
  polar,
  scale,
  signedArea,
  sub,
  toDeg,
  type Constraint,
  type Vec,
} from "../geo.ts";
import type { Handle, PointOptions, Scene } from "../scene.ts";

/** The figure the learner starts from, and what the transformation makes of it. */
export const ORIGINAL = C.blue;
export const IMAGE = C.orange;

export const NAMES = ["A", "B", "C"] as const;
export const PRIMED = ["A′", "B′", "C′"] as const;

export type Triple = readonly [Vec, Vec, Vec];
export type Mapping = (p: Vec) => Vec;

export const mapTriple = (t: Triple, m: Mapping): Triple => [m(t[0]), m(t[1]), m(t[2])];

// --- The test triangle -------------------------------------------------------

/** The shortest altitude the test triangle may be squeezed to, in stage units. */
const MIN_ALTITUDE = 1;
const WALK_BACK_STEPS = 8;

/** Shortest altitude of a triangle, negative when its vertices run clockwise. */
function signedAltitude(t: readonly Vec[]): number {
  const longest = Math.max(dist(t[0], t[1]), dist(t[1], t[2]), dist(t[2], t[0]));
  return longest < 1e-9 ? 0 : (2 * signedArea(t)) / longest;
}

/**
 * A draggable triangle ABC, given counter-clockwise. Each vertex stays inside
 * `region`, and stops short of any position that would flatten the triangle
 * or turn it clockwise — so ABC is always a real triangle with a known
 * orientation, and a reversed image can only be the transformation's doing.
 */
export function testTriangle(s: Scene, start: Triple, region: Constraint): [Handle, Handle, Handle] {
  const pts: Handle[] = [];
  start.forEach((p, i) => {
    const constrain: Constraint = (q) => {
      const want = region(q);
      if (pts.length < 3) return want; // still being created, from a valid start
      const here = { x: pts[i].x, y: pts[i].y };
      // Walk back from where the hand is toward where the vertex is until the
      // triangle is fat enough again.
      for (let k = WALK_BACK_STEPS; k > 0; k--) {
        const p2 = region(lerp(here, want, k / WALK_BACK_STEPS));
        if (signedAltitude(pts.map((v, j) => (j === i ? p2 : v))) >= MIN_ALTITUDE) return p2;
      }
      return here;
    };
    pts.push(s.point(p.x, p.y, { label: NAMES[i], color: ORIGINAL, constrain }));
  });
  return [pts[0], pts[1], pts[2]];
}

/**
 * A handle that rides along with a moving `center`. It remembers its offset
 * from the centre (kept inside `limit`), so dragging the centre carries it
 * along; call `follow()` at the start of each frame to put it back in place.
 * Read `offset`, not the handle, for the value it stands for.
 */
export function satellite(
  s: Scene,
  center: Vec,
  start: Vec,
  limit: Constraint,
  options: PointOptions = {},
): { handle: Handle; offset: Vec; follow(): void } {
  const offset = limit(start);
  const handle = s.point(center.x + offset.x, center.y + offset.y, {
    ...options,
    constrain: (p) => {
      const o = limit(sub(p, center));
      offset.x = o.x;
      offset.y = o.y;
      return add(center, o);
    },
  });
  return { handle, offset, follow: () => handle.set(add(center, offset)) };
}

// --- Drawing -------------------------------------------------------------------

/** A figure as a tinted outline in its colour. */
export function drawFigure(g: Draw, pts: readonly Vec[], color: string, alpha = 1): void {
  g.polygon(pts, { fill: tint(color, 0.16), color, width: 3, alpha });
}

/**
 * The image of a figure, its vertices dotted and named on the side away from
 * its middle. Pass "" for a vertex that already carries a handle's label.
 */
export function drawImage(g: Draw, pts: readonly Vec[], names: readonly string[] = PRIMED, alpha = 1): void {
  drawFigure(g, pts, IMAGE, alpha);
  const middle = centroid(pts);
  pts.forEach((p, i) => {
    g.point(p, { color: IMAGE, alpha });
    const out = normalize(sub(p, middle));
    if (names[i]) g.label(p, names[i], { color: IMAGE, bold: true, alpha, dx: out.x * 20, dy: out.y * 20 });
  });
}

const SPIN_RADIUS = 10; // screen pixels
const SPIN_SWEEP = Math.PI * 1.5;

/** A small curved arrow inside a triangle, turning the way A → B → C runs. */
export function spin(g: Draw, t: Triple, color: string, alpha = 1): void {
  const center = incenter(t[0], t[1], t[2]);
  const r = g.px(SPIN_RADIUS);
  const sense = signedArea(t) >= 0 ? 1 : -1;
  const from = Math.PI / 2;
  const to = from + sense * SPIN_SWEEP;
  g.arc(center, r, Math.min(from, to), Math.max(from, to), { color, width: 2, alpha });
  const forward = scale({ x: -Math.sin(to), y: Math.cos(to) }, sense);
  g.polygon(
    [
      add(polar(center, r, to), scale(forward, g.px(7))),
      polar(center, r - g.px(4.5), to),
      polar(center, r + g.px(4.5), to),
    ],
    { fill: color, stroke: null, alpha },
  );
}

// --- Measuring and readout fragments -------------------------------------------

/** The three interior angles, at A, B and C, in degrees. */
export const anglesOf = (t: Triple): [number, number, number] => [
  toDeg(angleAt(t[1], t[0], t[2])),
  toDeg(angleAt(t[0], t[1], t[2])),
  toDeg(angleAt(t[0], t[2], t[1])),
];

/** The side lengths AB, BC and CA. */
export const sidesOf = (t: Triple): [number, number, number] => [dist(t[0], t[1]), dist(t[1], t[2]), dist(t[2], t[0])];

/** LaTeX for the way a triangle's vertices run. */
export const turnTex = (t: Triple): string => (signedArea(t) >= 0 ? "\\circlearrowleft" : "\\circlearrowright");

/** LaTeX for a point's coordinates. */
export const coordsTex = (p: Vec, digits = 1): string => `(${fmt(p.x, digits)},\\, ${fmt(p.y, digits)})`;

/** LaTeX for adding a signed number: "+ 3" or "- 3". */
export const plusTex = (v: number, digits = 1): string => (v < 0 ? `- ${fmt(-v, digits)}` : `+ ${fmt(v, digits)}`);

/** Whether two measurements agree, up to rounding error. */
export const same = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
