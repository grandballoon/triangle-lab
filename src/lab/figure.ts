// What a frame's figure showed, and where: the record `Draw` keeps as it
// draws, and the lookup that finds the marks a `linkTex` term refers to
// (link.ts). Everything is in screen pixels, so tolerances read the same at
// any window size.
//
// A point is known by its name label: a label whose whole text is a name
// (A, A′, O₁) marks the point it is anchored to, and a point halfway along a
// drawn segment is lit as that segment's midpoint. A segment AB is shown by
// any drawn line both A and B lie on, or failing that by an arc from A to B
// (the same two letters name an arc); an angle by a mark at its vertex whose
// sides run through its points, or by the corner its two drawn sides make; a
// polygon, and its area, by a filled shape on its corners or by all its sides
// drawn; and a symbol or a number by any label that prints it, which lights
// the mark the label names (highlight.ts).

import type { Vec } from "./geo.ts";
import { direction, turn, type Highlight, type Shape } from "./highlight.ts";
import { GREEK, parseTermId, type TermRef } from "./link.ts";

export interface FigureLabel {
  text: string;
  /** The point the label belongs to. */
  at: Vec;
  /** Where its text sits. */
  screen: Vec;
  /** The mark it names — an angle's arc, a side, a point — or its own box when it stands alone. */
  shows: Shape;
}

export interface FigureLine {
  a: Vec;
  b: Vec;
  /** How far past `a` and `b` the drawn line runs. */
  extent: "segment" | "ray" | "line";
}

export interface FigureArc {
  ends: [Vec, Vec];
  /** Its middle. */
  screen: Vec;
  shape: Extract<Shape, { kind: "arc" }>;
}

export interface FigureAngle {
  vertex: Vec;
  /** Unit directions of its two sides. */
  sides: [Vec, Vec];
  /** Where the mark is drawn. */
  screen: Vec;
  shape: Extract<Shape, { kind: "angle" }>;
}

export interface FigurePolygon {
  corners: Vec[];
  screen: Vec;
}

export interface FigureIndex {
  labels: FigureLabel[];
  lines: FigureLine[];
  arcs: FigureArc[];
  angles: FigureAngle[];
  polygons: FigurePolygon[];
}

export const emptyFigure = (): FigureIndex => ({ labels: [], lines: [], arcs: [], angles: [], polygons: [] });

/** How far a named point may sit from a line or corner and still be on it. */
const ON_PX = 6;
/** How far, in radians, a side may turn from a point and still run through it. */
const SIDE_TOLERANCE = 0.035;
/** How far from the corner a leader meets an angle that has no mark of its own. */
const CORNER_REACH_PX = 28;
/** The shortest segment whose midpoint is worth marking. */
const MIN_HALVED_PX = 4 * ON_PX;
/**
 * How far a point may sit from a segment's middle and still be its midpoint:
 * far tighter than ON_PX, since a lesson places a midpoint exactly, and a
 * point that merely passes near the middle of a segment is not one.
 */
const MIDPOINT_PX = 1;

/** What the figure lights for term `id`, or nothing when `id` is not a `linkTex` term. */
export function resolveTerm(id: string, figure: FigureIndex): Highlight[] {
  const ref = parseTermId(id);
  return ref ? resolve(ref, figure) : [];
}

export function resolve(ref: TermRef, figure: FigureIndex): Highlight[] {
  const at = (name: string): Vec[] => namedPoints(figure, name);
  switch (ref.kind) {
    case "point":
      return at(ref.name).flatMap((p) => pointShapes(figure, p));
    case "segment": {
      const ends = pairs(at(ref.names[0]), at(ref.names[1]));
      const lines = ends
        .filter(([p, q]) => segmentShown(figure, p, q))
        .map(([p, q]): Highlight => ({ anchor: mid(p, q), shape: { kind: "segment", a: p, b: q } }));
      return lines.length > 0 ? lines : ends.flatMap(([p, q]) => arcsBetween(figure, p, q));
    }
    case "angle":
      return ref.names.length === 1 ? cornerAngles(figure, at(ref.names[0])) : namedAngles(figure, ref.names, at);
    case "polygon":
    case "area":
      return polygons(figure, ref.names.map(at)).map(({ anchor, corners }) => ({
        anchor,
        shape: ref.kind === "area" ? { kind: "area", outline: corners } : { kind: "polygon", corners },
      }));
    case "symbol":
      return figure.labels.filter((l) => symbolsIn(l.text).includes(ref.text)).map(shownBy);
    case "number":
      return figure.labels.filter((l) => numbersIn(l.text).some((n) => sameNumber(n, ref.text))).map(shownBy);
  }
}

const shownBy = (l: FigureLabel): Highlight => ({ anchor: l.screen, shape: l.shows });

/** Where the figure put the point labelled `name`. */
function namedPoints(figure: FigureIndex, name: string): Vec[] {
  const found: Vec[] = [];
  for (const l of figure.labels) {
    if (normalize(l.text.trim()) !== name) continue;
    if (!found.some((p) => distance(p, l.at) < ON_PX)) found.push(l.at);
  }
  return found;
}

/** A point, shown as the midpoint of each drawn segment it halves, or as itself. */
function pointShapes(figure: FigureIndex, p: Vec): Highlight[] {
  const halved = halvedSegments(figure, p);
  return halved.length > 0
    ? halved.map(([a, b]): Highlight => ({ anchor: p, shape: { kind: "midpoint", at: p, a, b } }))
    : [{ anchor: p, shape: { kind: "point", at: p } }];
}

/**
 * The ends of the drawn segments `p` is the midpoint of: a segment drawn
 * through it, or two drawn in line from it, as long as each other.
 */
function halvedSegments(figure: FigureIndex, p: Vec): [Vec, Vec][] {
  const segments = figure.lines.filter((l) => l.extent === "segment" && distance(l.a, l.b) >= MIN_HALVED_PX);
  const found: [Vec, Vec][] = [];
  const add = (a: Vec, b: Vec): void => {
    const known = found.some(([s, t]) => (near(s, a) && near(t, b)) || (near(s, b) && near(t, a)));
    if (!known) found.push([a, b]);
  };
  const halves = (a: Vec, b: Vec): boolean => distance(mid(a, b), p) <= MIDPOINT_PX;
  for (const l of segments) if (halves(l.a, l.b) && !near(l.a, p)) add(l.a, l.b);
  // Halves drawn on their own: the far ends of segments that end at p.
  const ends = segments.flatMap((l) => (near(l.a, p) ? [l.b] : near(l.b, p) ? [l.a] : []));
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (halves(ends[i], ends[j]) && distance(ends[i], ends[j]) >= 2 * MIN_HALVED_PX) add(ends[i], ends[j]);
    }
  }
  return found;
}

function segmentShown(figure: FigureIndex, p: Vec, q: Vec): boolean {
  return distance(p, q) > ON_PX && figure.lines.some((line) => onLine(line, p) && onLine(line, q));
}

function arcsBetween(figure: FigureIndex, p: Vec, q: Vec): Highlight[] {
  return figure.arcs
    .filter(({ ends: [s, t] }) => (near(s, p) && near(t, q)) || (near(s, q) && near(t, p)))
    .map((arc) => ({ anchor: arc.screen, shape: arc.shape }));
}

const angleMark = (m: FigureAngle): Highlight => ({ anchor: m.screen, shape: m.shape });

/** Marks at any of `corners`, or the corner itself when it has none. */
function cornerAngles(figure: FigureIndex, corners: Vec[]): Highlight[] {
  return corners.flatMap((v) => {
    const marks = figure.angles.filter((m) => distance(m.vertex, v) <= ON_PX).map(angleMark);
    if (marks.length > 0) return marks;
    const corner = cornerBetween(figure, v);
    return [corner ?? { anchor: v, shape: { kind: "point", at: v } }];
  });
}

/**
 * The opening at `v` between the two sides that meet there: a filled shape's
 * neighbouring corners, or else the only two drawn segments that end at it.
 */
function cornerBetween(figure: FigureIndex, v: Vec): Highlight | null {
  for (const shape of figure.polygons) {
    const i = shape.corners.findIndex((q) => near(q, v));
    if (i < 0) continue;
    const n = shape.corners.length;
    return opening(v, shape.corners[(i + n - 1) % n], shape.corners[(i + 1) % n]);
  }
  const ends: Vec[] = [];
  for (const l of figure.lines) {
    if (l.extent !== "segment") continue;
    const far = near(l.a, v) ? l.b : near(l.b, v) ? l.a : null;
    if (!far || distance(far, v) <= ON_PX) continue;
    const t = direction(v, far);
    if (!ends.some((e) => Math.abs(turn(direction(v, e), t)) <= SIDE_TOLERANCE)) ends.push(far);
  }
  return ends.length === 2 ? opening(v, ends[0], ends[1]) : null;
}

/** The angle at `v` from the side through `a` to the side through `c`, the way under 180°. */
function opening(v: Vec, a: Vec, c: Vec): Highlight | null {
  const da = unit(sub(a, v));
  const dc = unit(sub(c, v));
  const inside = da && dc ? unit({ x: da.x + dc.x, y: da.y + dc.y }) : null;
  if (!inside) return null;
  const from = direction(v, a);
  return {
    anchor: { x: v.x + inside.x * CORNER_REACH_PX, y: v.y + inside.y * CORNER_REACH_PX },
    shape: { kind: "angle", vertex: v, from, sweep: turn(from, direction(v, c)), r: CORNER_REACH_PX },
  };
}

/** ∠ABC: a mark at B whose sides run through A and C, or B's corner when both sides are drawn. */
function namedAngles(figure: FigureIndex, names: string[], at: (name: string) => Vec[]): Highlight[] {
  if (names.length !== 3) return [];
  const found: Highlight[] = [];
  for (const v of at(names[1])) {
    for (const [a, c] of pairs(at(names[0]), at(names[2]))) {
      const da = unit(sub(a, v));
      const dc = unit(sub(c, v));
      if (!da || !dc) continue;
      const marks = figure.angles.filter((m) => distance(m.vertex, v) <= ON_PX && sidesMatch(m.sides, da, dc));
      if (marks.length > 0) {
        found.push(...marks.map(angleMark));
      } else if (segmentShown(figure, v, a) && segmentShown(figure, v, c)) {
        const corner = opening(v, a, c);
        if (corner) found.push(corner);
      }
    }
  }
  return found;
}

/** A filled shape on exactly these corners, or the corners themselves when every side is drawn. */
function polygons(figure: FigureIndex, corners: Vec[][]): { anchor: Vec; corners: Vec[] }[] {
  if (corners.some((c) => c.length === 0)) return [];
  const pts = corners.map((c) => c[0]);
  const shapes = figure.polygons
    .filter((s) => s.corners.length === pts.length && pts.every((p) => s.corners.some((q) => distance(p, q) <= ON_PX)))
    .map((s) => ({ anchor: s.screen, corners: s.corners }));
  if (shapes.length > 0) return shapes;
  const closed = pts.every((p, i) => segmentShown(figure, p, pts[(i + 1) % pts.length]));
  return closed ? [{ anchor: centroid(pts), corners: pts }] : [];
}

function sidesMatch([s, t]: [Vec, Vec], a: Vec, c: Vec): boolean {
  return (same(s, a) && same(t, c)) || (same(s, c) && same(t, a));
}

const same = (u: Vec, v: Vec): boolean => Math.acos(Math.min(1, u.x * v.x + u.y * v.y)) <= SIDE_TOLERANCE;

function onLine(line: FigureLine, p: Vec): boolean {
  const d = sub(line.b, line.a);
  const len2 = d.x * d.x + d.y * d.y;
  if (len2 === 0) return distance(line.a, p) <= ON_PX;
  let t = ((p.x - line.a.x) * d.x + (p.y - line.a.y) * d.y) / len2;
  if (line.extent !== "line") t = Math.max(0, t);
  if (line.extent === "segment") t = Math.min(1, t);
  return distance({ x: line.a.x + t * d.x, y: line.a.y + t * d.y }, p) <= ON_PX;
}

// --- Reading labels ------------------------------------------------------------

const GREEK_LETTERS = new Set(Object.values(GREEK));

/** Variant letter forms folded to the ones link.ts uses. */
function normalize(text: string): string {
  return text.replace(/ϕ/g, "φ").replace(/ϑ/g, "θ").replace(/ϵ/g, "ε").replace(/[’']/g, "′").replace(/″/g, "′′");
}

/**
 * The variables a label prints: Greek letters wherever they stand, and single
 * Latin letters, which count only when the label has no words in it (so the
 * "a" in "a fold" is not a side).
 */
export function symbolsIn(label: string): string[] {
  const text = normalize(label);
  const found: string[] = [];
  for (const m of text.matchAll(/(?<![A-Za-z])([a-zα-ωℓ])(′*[₀-₉]*)(?![A-Za-z])/g)) {
    const letter = m[1];
    if (GREEK_LETTERS.has(letter) || !/[A-Za-z]{2}/.test(text)) found.push(letter + m[2]);
  }
  return found;
}

/** The numbers a label prints, other than coefficients and indices glued to a letter (3b, T₁). */
export function numbersIn(label: string): string[] {
  return [...label.matchAll(/(?<![\p{L}\d.])\d+(?:\.\d+)?(?![\p{L}\d])/gu)].map((m) => m[0]);
}

/**
 * Whether two printed numbers show the same value: equal once the more
 * precise one is rounded like the other (37.4 and 37°), except that small
 * whole numbers must match exactly, since those are as often counts and
 * indices as measurements.
 */
export function sameNumber(a: string, b: string): boolean {
  const places = (s: string): number => (s.includes(".") ? s.length - s.indexOf(".") - 1 : 0);
  const x = Number(a);
  const y = Number(b);
  if (x === y) return true;
  const digits = Math.min(places(a), places(b));
  if (digits === 0 && Math.min(Math.abs(x), Math.abs(y)) < 10) return false;
  return x.toFixed(digits) === y.toFixed(digits);
}

// --- Small vector helpers in screen space --------------------------------------

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a: Vec, b: Vec): boolean => distance(a, b) <= ON_PX;
const centroid = (pts: Vec[]): Vec => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

function unit(v: Vec): Vec | null {
  const len = Math.hypot(v.x, v.y);
  return len > 1e-9 ? { x: v.x / len, y: v.y / len } : null;
}

const pairs = <T>(xs: T[], ys: T[]): [T, T][] => xs.flatMap((x) => ys.map((y): [T, T] => [x, y]));
