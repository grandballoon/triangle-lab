// The one triangle each triangle-parts lesson is drawn on (perimeter.ts,
// semiperimeter.ts, medians.ts, centroid.ts, bisectors.ts): its draggable
// corners, kept from flipping or flattening, with the base AB along the
// bottom and the apex C above it; and the knobs that walk its edge or slide
// along its base.

import { C as COLOR, type Draw } from "../draw.ts";
import { add, inBox, lerp, mid, perp, project, sub, vec, type Vec } from "../geo.ts";
import type { Handle, Scene } from "../scene.ts";
import { edgeAt, edgeDistanceOf, perimeterOf, slideToLock, walkOn, type Corners } from "./triangle-parts.ts";

/** Where each lesson's definition is captioned, under the figure. */
export const CAPTION_AT = vec(0, -4.3);

export interface StageTriangle {
  A: Handle;
  B: Handle;
  C: Handle;
  corners(): Corners;
}

/**
 * The corners. `apex` may hold C somewhere narrower, as the isosceles steps
 * do; it is given where C was pulled, and C is kept above the base either way.
 */
export function stageTriangle(s: Scene, apex: (pulled: Vec, base: { A: Vec; B: Vec }) => Vec = (p) => p): StageTriangle {
  const A = s.point(-4.6, -2.8, { label: "A", constrain: inBox(-7, -2.5, -3.6, -1.4) });
  const B = s.point(4.4, -2.6, { label: "B", constrain: inBox(2.5, 7, -3.6, -1.4) });
  const above = inBox(-5, 5, 1, 3.9);
  const C = s.point(0.6, 3.2, { label: "C", constrain: (p) => above(apex(p, { A, B })) });
  return { A, B, C, corners: () => [A, B, C] };
}

/** C pulled onto the perpendicular bisector of AB, so CA = CB: an apex for `stageTriangle`. */
export function overMidpoint(pulled: Vec, base: { A: Vec; B: Vec }): Vec {
  return project(pulled, mid(base.A, base.B), add(mid(base.A, base.B), perp(sub(base.B, base.A))));
}

/** A knob that walks the triangle's edge from A, one way round. */
export interface EdgeWalker {
  knob: Handle;
  /** How much of the way round it has walked, from 0 to 1. */
  walked(): number;
  /** Put the knob back where it has walked to, on the triangle as it now is. */
  follow(): void;
}

export function edgeWalker(s: Scene, t: StageTriangle, snaps: readonly number[] = []): EdgeWalker {
  let walked = 0;
  const knob = s.point(t.A.x, t.A.y, {
    color: COLOR.ink,
    constrain: (p) => {
      const corners = t.corners();
      const total = perimeterOf(corners);
      const next = walkOn(walked, edgeDistanceOf(corners, p) / total, 1);
      walked = snaps.find((at) => Math.abs(at - next) < 0.02) ?? next;
      return edgeAt(corners, walked * total);
    },
  });
  return {
    knob,
    walked: () => walked,
    follow() {
      const corners = t.corners();
      const at = edgeAt(corners, walked * perimeterOf(corners));
      knob.x = at.x;
      knob.y = at.y;
    },
  };
}

/** A knob on the base AB that locks onto one point of it. */
export interface BaseKnob {
  knob: Handle;
  locked(): boolean;
  /** Keep the knob on the base, and on its point while locked, as the corners move. */
  follow(): void;
}

/**
 * A knob on AB, starting `start` of the way from A, that locks onto
 * `target()` once within `catchAt` of it and lets go only when pulled more
 * than `releaseAt` away (stage units).
 */
export function baseKnob(s: Scene, t: StageTriangle, target: () => Vec, catchAt: number, releaseAt: number, start = 0.25): BaseKnob {
  let locked = false;
  const from = lerp(t.A, t.B, start);
  const knob = s.point(from.x, from.y, {
    color: COLOR.ink,
    constrain: (p) => {
      const lock = slideToLock(p, t.A, t.B, target(), locked, catchAt, releaseAt);
      locked = lock.locked;
      return lock.at;
    },
  });
  return {
    knob,
    locked: () => locked,
    follow() {
      if (locked) {
        const at = target();
        knob.x = at.x;
        knob.y = at.y;
      } else knob.set(knob);
    },
  };
}

/** The sides a, b, c, named as usual for the corners opposite them, each labelled outside the triangle. */
export function labelSides(g: Draw, t: Corners, text: (name: "a" | "b" | "c", length: number) => string, color: string = COLOR.dim): void {
  const [A, B, C] = t;
  g.along(B, C, text("a", Math.hypot(C.x - B.x, C.y - B.y)), { color, offset: -20 });
  g.along(C, A, text("b", Math.hypot(A.x - C.x, A.y - C.y)), { color, offset: -20 });
  g.along(A, B, text("c", Math.hypot(B.x - A.x, B.y - A.y)), { color, offset: -20 });
}
