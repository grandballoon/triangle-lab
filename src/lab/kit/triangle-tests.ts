// Every congruence and similarity test, the working ones and the ones that
// fail, applied to one triangle: given the learner's triangle ABC and a test,
// which triangles share the parts that test names. Pure: triangles in,
// triangles and the construction that found them out. The lesson
// (lessons/triangle-tests.ts) only draws what this returns.
//
// A test that works leaves one triangle, a copy of the learner's (scaled, for
// similarity). A test that fails leaves a second, different triangle with the
// same named parts: the impostor. The construction is returned as loci (rays
// and compass arcs) so the figure can show why one or two triangles fit.

import { add, angleAt, cross, dist, dot, normalize, scale, sub, toDeg, type Vec } from "../geo.ts";

export type Name = "A" | "B" | "C";
export type Tri = Record<Name, Vec>;

/** A side, named by its two ends, or the angle at a corner. */
export type Part = { kind: "side"; ends: readonly [Name, Name] } | { kind: "angle"; at: Name };

export type TestKey = "SSS" | "SAS" | "ASA" | "AAS" | "HL" | "SSA" | "AAA" | "AA~" | "SSS~" | "SAS~" | "SSA~";

export interface Test {
  key: TestKey;
  /** Congruence asks for the same size and shape; similarity for the same shape. */
  family: "congruence" | "similarity";
  /** Whether the test proves its claim. */
  works: boolean;
}

/** The tests in the order the lesson steps through them. */
export const TESTS: readonly Test[] = [
  { key: "SSS", family: "congruence", works: true },
  { key: "SAS", family: "congruence", works: true },
  { key: "ASA", family: "congruence", works: true },
  { key: "AAS", family: "congruence", works: true },
  { key: "HL", family: "congruence", works: true },
  { key: "SSA", family: "congruence", works: false },
  { key: "AAA", family: "congruence", works: false },
  { key: "AA~", family: "similarity", works: true },
  { key: "SSS~", family: "similarity", works: true },
  { key: "SAS~", family: "similarity", works: true },
  { key: "SSA~", family: "similarity", works: false },
];

export const testOf = (key: TestKey): Test => TESTS.find((t) => t.key === key)!;

/** A construction line: a ray out of a corner, or compass arcs about a centre. */
export type Locus =
  | { kind: "ray"; from: Vec; through: Vec }
  | { kind: "arc"; center: Vec; r: number; at: readonly Vec[] };

/**
 * What a test makes of the learner's triangle.
 *
 * - `pinned`: one triangle fits, `copy`.
 * - `fooled`: `impostor` fits as well as `copy`, and is not a match.
 * - `unique-here`: a failing test that happens to leave one triangle for this shape.
 * - `needs-right`: HL, on a triangle with no right angle at C.
 * - `flat`: the triangle is too thin to test.
 */
export type Status = "pinned" | "fooled" | "unique-here" | "needs-right" | "flat";

export interface Example {
  status: Status;
  /** The parts the test names, on the learner's triangle and on every example alike. */
  given: readonly Part[];
  /** Parts the given ones force, worth marking (AAS's third angle). */
  derived: readonly Part[];
  copy: Tri | null;
  impostor: Tri | null;
  /** The impostor's corners that differ from the copy's. */
  moved: readonly Name[];
  /** The part that tells the impostor apart, compared in the readout. */
  tell: Part | null;
  loci: readonly Locus[];
  /** The copy's size relative to the learner's triangle. */
  k: number;
}

/** Where the examples are built: the learner's triangle moved by this much. */
export const SHIFT: Vec = { x: 8.2, y: 0 };
/** How much a similarity test's copy is scaled. */
export const SIMILAR_K = 0.6;
/** How much smaller AAA's nested impostor is than the copy. */
export const AAA_K = 0.6;

// A triangle thinner than this is not tested, and an impostor whose moved
// corner lands this near the copy's (or the corner it shares) counts as none.
const MIN_AREA = 0.25;
const MIN_SIDE = 0.6;
const MIN_GAP = 0.3;
/** How near 90° the angle at C must be for HL, in degrees. */
const RIGHT_TOLERANCE = 0.25;

const NAMES: readonly Name[] = ["A", "B", "C"];
const side = (p: Name, q: Name): Part => ({ kind: "side", ends: [p, q] });
const angle = (at: Name): Part => ({ kind: "angle", at });

/** The two corners other than `n`, in A→B→C order. */
const others = (n: Name): [Name, Name] => NAMES.filter((m) => m !== n) as [Name, Name];

/** The length of a side or the size of an angle, in degrees. */
export function measure(t: Tri, part: Part): number {
  if (part.kind === "side") return dist(t[part.ends[0]], t[part.ends[1]]);
  const [p, q] = others(part.at);
  return toDeg(angleAt(t[p], t[part.at], t[q]));
}

const area = (t: Tri): number => Math.abs(cross(sub(t.B, t.A), sub(t.C, t.A))) / 2;
const map = (t: Tri, f: (p: Vec) => Vec): Tri => ({ A: f(t.A), B: f(t.B), C: f(t.C) });
const moveBy = (t: Tri, d: Vec): Tri => map(t, (p) => add(p, d));
const scaleAbout = (t: Tri, c: Vec, k: number): Tri => map(t, (p) => add(c, scale(sub(p, c), k)));

/** The centre of a triangle's bounding box, about which a copy is scaled. */
function boxCentre(t: Tri): Vec {
  const xs = NAMES.map((n) => t[n].x);
  const ys = NAMES.map((n) => t[n].y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** Whether a triangle is too thin to test. */
export function isFlat(t: Tri): boolean {
  return area(t) < MIN_AREA || NAMES.some((n) => measure(t, side(...others(n))) < MIN_SIDE);
}

/** The angle at C, if it is right enough for HL. */
export const rightAtC = (t: Tri): boolean => Math.abs(measure(t, angle("C")) - 90) < RIGHT_TOLERANCE;

/**
 * Where C lands when dragged to `c`: onto the circle on diameter AB, making the
 * angle at C exactly right, when it comes within `tolerance` degrees of it.
 */
export function snapRight(a: Vec, b: Vec, c: Vec, tolerance = 3): Vec {
  const centre = scale(add(a, b), 0.5);
  const r = dist(a, b) / 2;
  const off = sub(c, centre);
  if (r < 1e-9 || Math.hypot(off.x, off.y) < 1e-9) return c;
  if (Math.abs(toDeg(angleAt(a, c, b)) - 90) >= tolerance) return c;
  return add(centre, scale(normalize(off), r));
}

/**
 * The SSA case for a triangle: the angle at its smallest corner `v`, the
 * longest side `v`–`w` beside it, and the side `w`–`u` opposite it. These leave
 * the most room for a second triangle: the arc of radius |wu| about w crosses
 * the ray from v toward u twice unless the triangle is equilateral, or right
 * at u (then the arc only touches the ray: that case is HL).
 */
export function ssaCorners(t: Tri): { v: Name; w: Name; u: Name } {
  const v = [...NAMES].sort((p, q) => measure(t, angle(p)) - measure(t, angle(q)))[0];
  const [p, q] = others(v);
  const [w, u] = dist(t[v], t[p]) >= dist(t[v], t[q]) ? [p, q] : [q, p];
  return { v, w, u };
}

/** SSA's second triangle: `t` with corner `u` moved to the arc's other crossing, or null if it has none. */
function ssaImpostor(t: Tri, v: Name, w: Name, u: Name): Tri | null {
  const along = normalize(sub(t[u], t[v]));
  const toW = sub(t[w], t[v]);
  const foot = dot(toW, along);
  const height2 = dot(toW, toW) - foot * foot;
  const o = dist(t[w], t[u]);
  const spread = Math.sqrt(Math.max(0, o * o - height2));
  const here = dist(t[v], t[u]);
  const roots = [foot + spread, foot - spread];
  const other = Math.abs(roots[0] - here) > Math.abs(roots[1] - here) ? roots[0] : roots[1];
  if (other < MIN_GAP || Math.abs(other - here) < MIN_GAP) return null;
  return { ...t, [u]: add(t[v], scale(along, other)) };
}

const EMPTY = { derived: [], copy: null, impostor: null, moved: [], tell: null, loci: [], k: 1 } as const;

/** Which triangles share with `t` the parts that test `key` names. */
export function example(t: Tri, key: TestKey): Example {
  const similar = testOf(key).family === "similarity";
  const k = similar ? SIMILAR_K : 1;
  const moved = moveBy(t, SHIFT);
  const centre = boxCentre(moved);
  const place = (x: Tri): Tri => scaleAbout(moveBy(x, SHIFT), centre, k);
  const copy = place(t);
  const ray = (from: Name, through: Name): Locus => ({ kind: "ray", from: copy[from], through: copy[through] });
  const arc = (center: Name, through: Name): Locus => ({
    kind: "arc",
    center: copy[center],
    r: dist(copy[center], copy[through]),
    at: [copy[through]],
  });
  const pinned = (given: Part[], loci: Locus[] = [], derived: Part[] = []): Example => ({
    ...EMPTY,
    status: "pinned",
    given,
    derived,
    copy,
    loci,
    k,
  });

  if (isFlat(t)) return { ...EMPTY, status: "flat", given: [] };

  switch (key) {
    case "SSS":
      return pinned([side("B", "C"), side("C", "A"), side("A", "B")], [arc("A", "C"), arc("B", "C")]);
    case "SAS":
      return pinned([side("C", "A"), angle("A"), side("A", "B")], [ray("A", "C"), arc("A", "C")]);
    case "ASA":
      return pinned([angle("A"), side("A", "B"), angle("B")], [ray("A", "C"), ray("B", "C")]);
    case "AAS":
      return pinned([angle("A"), angle("B"), side("B", "C")], [ray("B", "A"), ray("C", "A")], [angle("C")]);
    case "HL": {
      const given = [angle("C"), side("A", "B"), side("B", "C")];
      if (!rightAtC(t)) return { ...EMPTY, status: "needs-right", given };
      return pinned(given, [ray("C", "A"), arc("B", "A")]);
    }
    case "AA~":
      return pinned([angle("A"), angle("B")], [], [angle("C")]);
    case "SSS~":
      return pinned([side("B", "C"), side("C", "A"), side("A", "B")]);
    case "SAS~":
      return pinned([side("C", "A"), angle("A"), side("A", "B")]);
    case "AAA": {
      const given = [angle("A"), angle("B"), angle("C")];
      const impostor = scaleAbout(copy, copy.A, AAA_K);
      return {
        ...EMPTY,
        status: "fooled",
        given,
        copy,
        impostor,
        moved: ["B", "C"],
        tell: side("A", "B"),
        loci: [ray("A", "B"), ray("A", "C")],
        k,
      };
    }
    case "SSA":
    case "SSA~": {
      const { v, w, u } = ssaCorners(t);
      const given = [angle(v), side(v, w), side(w, u)];
      const second = ssaImpostor(t, v, w, u);
      const loci = [ray(v, u), arc(w, u)];
      if (!second) return { ...EMPTY, status: "unique-here", given, copy, loci, k };
      const impostor = place(second);
      const crossings: Locus = { kind: "arc", center: copy[w], r: dist(copy[w], copy[u]), at: [copy[u], impostor[u]] };
      return {
        ...EMPTY,
        status: "fooled",
        given,
        copy,
        impostor,
        moved: [u],
        tell: side(v, u),
        loci: [ray(v, u), crossings],
        k,
      };
    }
  }
}
