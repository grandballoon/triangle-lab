// What a frame's figure showed, and where: the record `Draw` keeps as it
// draws, and the lookup that finds the marks a `linkTex` term refers to
// (link.ts). Everything is in screen pixels, so tolerances read the same at
// any window size.
//
// A point is known by its name label: a label whose whole text is a name
// (A, A′, O₁) marks the point it is anchored to. A segment AB is shown by any
// drawn line both A and B lie on, or failing that by an arc from A to B (the
// same two letters name an arc); an angle by a mark at its vertex whose
// sides run through its points, a polygon by a filled shape on its corners,
// and a symbol or a number by any label that prints it.

import type { Vec } from "./geo.ts";
import { GREEK, parseTermId, type TermRef } from "./link.ts";

export interface FigureLabel {
  text: string;
  /** The point the label belongs to. */
  at: Vec;
  /** Where its text sits. */
  screen: Vec;
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
}

export interface FigureAngle {
  vertex: Vec;
  /** Unit directions of its two sides. */
  sides: [Vec, Vec];
  /** Where the mark is drawn. */
  screen: Vec;
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

/** The screen places that show what term `id` refers to, or none when `id` is not a `linkTex` term. */
export function resolveTerm(id: string, figure: FigureIndex): Vec[] {
  const ref = parseTermId(id);
  return ref ? resolve(ref, figure) : [];
}

export function resolve(ref: TermRef, figure: FigureIndex): Vec[] {
  const at = (name: string): Vec[] => namedPoints(figure, name);
  switch (ref.kind) {
    case "point":
      return at(ref.name);
    case "segment": {
      const ends = pairs(at(ref.names[0]), at(ref.names[1]));
      const lines = ends.filter(([p, q]) => segmentShown(figure, p, q)).map(([p, q]) => mid(p, q));
      return lines.length > 0 ? lines : ends.flatMap(([p, q]) => arcsBetween(figure, p, q));
    }
    case "angle":
      return ref.names.length === 1 ? cornerAngles(figure, at(ref.names[0])) : namedAngles(figure, ref.names, at);
    case "polygon":
      return polygons(figure, ref.names.map(at));
    case "symbol":
      return figure.labels.filter((l) => symbolsIn(l.text).includes(ref.text)).map((l) => l.screen);
    case "number":
      return figure.labels.filter((l) => numbersIn(l.text).some((n) => sameNumber(n, ref.text))).map((l) => l.screen);
  }
}

/** Where the figure put the point labelled `name`. */
function namedPoints(figure: FigureIndex, name: string): Vec[] {
  const found: Vec[] = [];
  for (const l of figure.labels) {
    if (normalize(l.text.trim()) !== name) continue;
    if (!found.some((p) => distance(p, l.at) < ON_PX)) found.push(l.at);
  }
  return found;
}

function segmentShown(figure: FigureIndex, p: Vec, q: Vec): boolean {
  return distance(p, q) > ON_PX && figure.lines.some((line) => onLine(line, p) && onLine(line, q));
}

function arcsBetween(figure: FigureIndex, p: Vec, q: Vec): Vec[] {
  const near = (a: Vec, b: Vec): boolean => distance(a, b) <= ON_PX;
  return figure.arcs
    .filter(({ ends: [s, t] }) => (near(s, p) && near(t, q)) || (near(s, q) && near(t, p)))
    .map((arc) => arc.screen);
}

/** Marks at any of `corners`, or the corner itself when it has none. */
function cornerAngles(figure: FigureIndex, corners: Vec[]): Vec[] {
  return corners.flatMap((v) => {
    const marks = figure.angles.filter((m) => distance(m.vertex, v) <= ON_PX).map((m) => m.screen);
    return marks.length > 0 ? marks : [v];
  });
}

/** ∠ABC: a mark at B whose sides run through A and C, or B's corner when both sides are drawn. */
function namedAngles(figure: FigureIndex, names: string[], at: (name: string) => Vec[]): Vec[] {
  if (names.length !== 3) return [];
  const found: Vec[] = [];
  for (const v of at(names[1])) {
    for (const [a, c] of pairs(at(names[0]), at(names[2]))) {
      const da = unit(sub(a, v));
      const dc = unit(sub(c, v));
      if (!da || !dc) continue;
      const marks = figure.angles
        .filter((m) => distance(m.vertex, v) <= ON_PX && sidesMatch(m.sides, da, dc))
        .map((m) => m.screen);
      if (marks.length > 0) {
        found.push(...marks);
      } else if (segmentShown(figure, v, a) && segmentShown(figure, v, c)) {
        const inside = unit({ x: da.x + dc.x, y: da.y + dc.y });
        if (inside) found.push({ x: v.x + inside.x * CORNER_REACH_PX, y: v.y + inside.y * CORNER_REACH_PX });
      }
    }
  }
  return found;
}

/** A filled shape on exactly these corners, or the corners' middle when every side is drawn. */
function polygons(figure: FigureIndex, corners: Vec[][]): Vec[] {
  if (corners.some((c) => c.length === 0)) return [];
  const pts = corners.map((c) => c[0]);
  const shapes = figure.polygons
    .filter((s) => s.corners.length === pts.length && pts.every((p) => s.corners.some((q) => distance(p, q) <= ON_PX)))
    .map((s) => s.screen);
  if (shapes.length > 0) return shapes;
  const closed = pts.every((p, i) => segmentShown(figure, p, pts[(i + 1) % pts.length]));
  return closed ? [centroid(pts)] : [];
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
const centroid = (pts: Vec[]): Vec => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

function unit(v: Vec): Vec | null {
  const len = Math.hypot(v.x, v.y);
  return len > 1e-9 ? { x: v.x / len, y: v.y / len } : null;
}

const pairs = <T>(xs: T[], ys: T[]): [T, T][] => xs.flatMap((x) => ys.map((y): [T, T] => [x, y]));
