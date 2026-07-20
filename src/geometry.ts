// Pure geometry for the "Angles" lesson. No DOM, no canvas — just the math.
// A triangle here is three points; everything else (the three interior angles,
// the acute/right/obtuse classification, and the apex snap) is derived.

export interface Vec {
  x: number;
  y: number;
}

export interface Triangle {
  a: Vec; // base, left
  b: Vec; // base, right
  c: Vec; // apex (the draggable vertex)
}

export type AngleType = "acute" | "right" | "obtuse";

export interface AngleInfo {
  vertex: Vec;
  /** Directions (unit vectors) to the two neighbouring vertices. */
  toP: Vec;
  toQ: Vec;
  degrees: number;
  type: AngleType;
}

export type VertexKey = "a" | "b" | "c";

export interface TriangleAngles {
  atA: AngleInfo;
  atB: AngleInfo;
  atC: AngleInfo;
  /** The largest of the three angles — the one that decides the type. */
  largest: AngleInfo;
  largestVertex: VertexKey;
  /** Classification of the whole triangle (by its largest angle). */
  type: AngleType;
}

// How far from exactly 90° we still call an angle "right". The apex snap keeps
// us pinned to a true 90° while snapped, so this only needs to absorb rounding.
const RIGHT_EPSILON_DEG = 0.25;

export const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y });
export const add = (p: Vec, q: Vec): Vec => ({ x: p.x + q.x, y: p.y + q.y });
export const scale = (p: Vec, s: number): Vec => ({ x: p.x * s, y: p.y * s });
export const dot = (p: Vec, q: Vec): number => p.x * q.x + p.y * q.y;
export const len = (p: Vec): number => Math.hypot(p.x, p.y);
export const dist = (p: Vec, q: Vec): number => Math.hypot(p.x - q.x, p.y - q.y);
export const mid = (p: Vec, q: Vec): Vec => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

export function normalize(p: Vec): Vec {
  const l = len(p);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l };
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

function classifyAngle(degrees: number): AngleType {
  if (degrees > 90 + RIGHT_EPSILON_DEG) return "obtuse";
  if (degrees >= 90 - RIGHT_EPSILON_DEG) return "right";
  return "acute";
}

/** Interior angle at `v`, given its two neighbouring vertices `p` and `q`. */
function angleAt(v: Vec, p: Vec, q: Vec): AngleInfo {
  const toP = normalize(sub(p, v));
  const toQ = normalize(sub(q, v));
  const cos = clamp(dot(toP, toQ), -1, 1);
  const degrees = (Math.acos(cos) * 180) / Math.PI;
  return { vertex: v, toP, toQ, degrees, type: classifyAngle(degrees) };
}

export function analyze(t: Triangle): TriangleAngles {
  const atA = angleAt(t.a, t.b, t.c);
  const atB = angleAt(t.b, t.a, t.c);
  const atC = angleAt(t.c, t.a, t.b);
  // Classify by the largest angle: obtuse wins, then right, else acute. A
  // triangle has at most one angle >= 90°, so the largest is the deciding one.
  const entries: [VertexKey, AngleInfo][] = [["a", atA], ["b", atB], ["c", atC]];
  let largest = entries[0];
  for (const e of entries) if (e[1].degrees > largest[1].degrees) largest = e;
  return {
    atA,
    atB,
    atC,
    largest: largest[1],
    largestVertex: largest[0],
    type: largest[1].type,
  };
}

// --- The right-angle snap ------------------------------------------------
//
// Any of the three angles can reach 90°, and each has its own locus of apex
// positions that makes it exactly right:
//   • the APEX angle at C is 90° on the circle whose diameter is the base
//     (Thales' theorem) — outside it acute, inside it obtuse;
//   • a BASE angle at A (or B) is 90° when the apex sits directly above that
//     vertex, i.e. on the vertical line through it — pull the apex to the
//     OUTSIDE of the vertex and that base angle turns obtuse.
// Since a triangle has at most one angle >= 90°, we snap whichever angle is
// currently the largest. Entering the snap is easy; leaving it needs a wider
// swing (measured in degrees) — that hysteresis is the knob's "give".

export interface ThalesCircle {
  center: Vec;
  radius: number;
}

export function thalesCircle(a: Vec, b: Vec): ThalesCircle {
  return { center: mid(a, b), radius: dist(a, b) / 2 };
}

/** Snap to a right angle once the largest angle comes within this of 90°. */
const SNAP_ENTER_DEG = 2.5;
/** Wider swing you must leave to break the snap — the "drag further". */
const SNAP_EXIT_DEG = 6.5;

export interface SnapResult {
  /** Where the apex actually lands (on a right-angle locus while snapped). */
  apex: Vec;
  /** Whether we are currently pinned to a right angle. */
  snapped: boolean;
}

/** Move the apex onto the locus that makes `vertex`'s angle exactly 90°. */
function snapToRight(vertex: VertexKey, raw: Vec, a: Vec, b: Vec): Vec {
  if (vertex === "a") return { x: a.x, y: raw.y }; // apex straight above A
  if (vertex === "b") return { x: b.x, y: raw.y }; // apex straight above B
  const { center, radius } = thalesCircle(a, b);
  const offset = sub(raw, center);
  const d = len(offset);
  const dir = d < 1e-6 ? { x: 0, y: -1 } : scale(offset, 1 / d);
  return add(center, scale(dir, radius));
}

/**
 * Resolve a raw pointer position into an apex position, snapping whichever
 * angle is nearest 90° with hysteresis. `wasSnapped` is the previous frame's
 * snap state.
 */
export function resolveApex(raw: Vec, a: Vec, b: Vec, wasSnapped: boolean): SnapResult {
  const angles = analyze({ a, b, c: raw });
  const band = wasSnapped ? SNAP_EXIT_DEG : SNAP_ENTER_DEG;
  if (Math.abs(angles.largest.degrees - 90) > band) return { apex: raw, snapped: false };
  return { apex: snapToRight(angles.largestVertex, raw, a, b), snapped: true };
}
