// The reading order for the whole project, in one place. The menu (index.ts)
// and the prev/next pager (pager.ts) both render from this list, so the order
// a reader pages through is by construction the order the menu shows.
//
// Lessons come in two kinds. A standalone lesson has its own page and entry
// point: add an entry, create <slug>.html next to index.html, and register
// the slug in vite.config.ts. A lab lesson (`lab: true`) is a module in
// src/lab/lessons/<slug>.ts hosted by lab.html: add an entry and the module,
// nothing else. Either way the menu card and the pager links on the
// neighbouring lessons then appear on their own.

import { anglesCircles } from "./chapters/angles-circles.ts";
import { anglesLines } from "./chapters/angles-lines.ts";
import { areas } from "./chapters/areas.ts";
import { chasing } from "./chapters/chasing.ts";
import { circles } from "./chapters/circles.ts";
import { coordinates } from "./chapters/coordinates.ts";
import { polygons } from "./chapters/polygons.ts";
import { potpourri } from "./chapters/potpourri.ts";
import { power } from "./chapters/power.ts";
import { quadrilaterals } from "./chapters/quadrilaterals.ts";
import { solids } from "./chapters/solids.ts";
import { transformations } from "./chapters/transformations.ts";
import { trianglesCentres } from "./chapters/triangles-centres.ts";
import { trianglesClassic } from "./chapters/triangles-classic.ts";
import { trianglesMeasure } from "./chapters/triangles-measure.ts";
import type { Chapter, Lesson } from "./chapters/types.ts";

export type { Chapter, Lesson } from "./chapters/types.ts";

// The triangle lessons come from three files (the standalone pages and two
// batches of lab lessons) but read as one sequence, so their order is spelled
// out here.
const TRIANGLES_ORDER = [
  "angles", "equilateral", "isosceles", "scalene",
  "perimeter", "medians", "bisectors", "incircle", "circumcircle", "altitudes",
  "inequality",
  "pythagoras", "pythagoras-square", "pythagoras-converse", "pythagorean-triples",
  "congruence", "right-congruence", "isosceles-base-angles", "chord-bisector",
  "similar", "similarity-tests", "altitude-on-hypotenuse", "angle-bisector-theorem",
  "trig", "fortyfive", "thirtysixty", "table", "trig-identities",
  "area-base-height", "area-sine", "area-inradius",
  "right-angle-tests", "parallel-trick",
];

/** Sort lessons into a stated slug order. Every lesson must be named once. */
function inOrder(list: Lesson[], order: readonly string[]): Lesson[] {
  const missing = list.filter((l) => !order.includes(l.slug)).map((l) => l.slug);
  const unknown = order.filter((slug) => !list.some((l) => l.slug === slug));
  if (missing.length || unknown.length || new Set(order).size !== order.length) {
    throw new Error(`Lesson order is out of date: missing [${missing}], unknown [${unknown}]`);
  }
  return order.map((slug) => list.find((l) => l.slug === slug)!);
}

export const chapters: Chapter[] = [
  {
    title: "Circles",
    blurb: "Radius, chord, tangent — and where π comes from.",
    axioms: [
      "Parts of a circle",
      "Circumference and π",
      "Area of a circle",
      "Distance between tangent circles",
    ],
    lessons: circles,
  },
  {
    title: "Angles",
    blurb: "Measuring turns, crossing parallels, and reading angles off a circle.",
    axioms: [
      "Degrees and radians",
      "Vertical angles",
      "Corresponding and alternate angles",
      "Triangle angle sum",
      "Exterior angle theorem",
      "Arc length and sector area",
      "Inscribed angle theorem",
      "Thales' theorem",
      "Chord–chord angle",
      "Secant–secant angle",
      "Tangent–chord angle",
    ],
    lessons: [...anglesLines, ...anglesCircles],
  },
  {
    title: "Triangles",
    blurb: "Classifying, measuring, matching and proving with three sides.",
    axioms: [
      "Classification by sides and angles",
      "Centroid",
      "Incentre",
      "Circumcentre",
      "Orthocentre",
      "Triangle inequality",
      "Pythagorean theorem",
      "Converse of Pythagoras",
      "Pythagorean triples",
      "SSS, SAS, ASA congruence",
      "AAS and HL congruence",
      "Isosceles triangle theorem",
      "Perpendicular bisector of a chord",
      "AA, SAS, SSS similarity",
      "Geometric mean theorem",
      "Angle bisector theorem",
      "Trigonometric ratios",
      "45-45-90 and 30-60-90 triangles",
      "Pythagorean identity",
      "Half base times height",
      "Sine area formula",
      "Inradius area formula",
    ],
    lessons: inOrder([...trianglesClassic, ...trianglesCentres, ...trianglesMeasure], TRIANGLES_ORDER),
  },
  {
    title: "Quadrilaterals",
    blurb: "Trapezoids to squares, and what each extra symmetry buys.",
    axioms: [
      "Quadrilateral angle sum",
      "Trapezoid midsegment",
      "Isosceles trapezoid",
      "Parallelogram properties",
      "Parallelogram area",
      "Rhombus diagonals",
      "Rectangle and square diagonals",
      "Parallelogram tests",
      "Varignon's theorem",
    ],
    lessons: quadrilaterals,
  },
  {
    title: "Polygons",
    blurb: "Counting diagonals and angles in any number of sides.",
    axioms: [
      "Diagonal count",
      "Interior angle sum",
      "Exterior angle sum",
      "Apothem and circumradius",
      "Regular hexagon",
    ],
    lessons: polygons,
  },
  {
    title: "Angle Chasing",
    blurb: "Puzzles solved one small deduction at a time.",
    axioms: [
      "Isosceles base angles",
      "Triangle angle sum",
      "Exterior angle theorem",
      "Angles in a regular polygon",
    ],
    lessons: chasing,
  },
  {
    title: "Areas",
    blurb: "Scaling, sliding and cutting shapes without losing track of area.",
    axioms: [
      "Area scales by k²",
      "Medial triangle",
      "Same base, same altitude",
      "Medians cut six equal areas",
      "Trapezoid diagonal areas",
      "Area by subtraction",
      "Hippocrates' lune",
      "Inclusion–exclusion",
    ],
    lessons: areas,
  },
  {
    title: "Coordinates",
    blurb: "Geometry turned into numbers: slopes, distances and equations.",
    axioms: [
      "Cartesian and polar coordinates",
      "Slope",
      "Equation of a line",
      "Parallel and perpendicular slopes",
      "Distance formula",
      "Section formula",
      "Equation of a circle",
      "Discriminant test",
      "Centroid as vertex average",
    ],
    lessons: coordinates,
  },
  {
    title: "Power of a Point",
    blurb: "One product that every line through a point agrees on.",
    axioms: [
      "Intersecting chords theorem",
      "Tangent–secant theorem",
      "Equal tangents theorem",
      "Power of a point",
      "Incircle tangent lengths",
      "Pitot's theorem",
    ],
    lessons: power,
  },
  {
    title: "Three Dimensions",
    blurb: "Solids you can turn over in your hand.",
    axioms: [
      "Skew lines",
      "Sphere cross-sections",
      "Space diagonal",
      "Nets and unrolling",
      "Pyramid volume",
      "Cone lateral area",
      "Euler's polyhedron formula",
    ],
    lessons: solids,
  },
  {
    title: "Transformations",
    blurb: "Shifts, turns, flips, stretches and squeezes.",
    axioms: [
      "Translation",
      "Rotation",
      "Reflection",
      "Point reflection",
      "Stretch",
      "Dilation",
      "Isometry invariants",
      "Rotational and reflective symmetry",
    ],
    lessons: transformations,
  },
  {
    title: "Potpourri",
    blurb: "Classic results that pull several chapters together.",
    axioms: [
      "Heron's reflection principle",
      "Common tangents",
      "Incentre–excentre lemma",
      "Lens area",
      "Fold as perpendicular bisector",
      "Viviani's theorem",
      "Crossed ladders theorem",
    ],
    lessons: potpourri,
  },
];

export const lessons: Lesson[] = chapters.flatMap((chapter) => chapter.lessons);

/** Position of a lesson in the reading order, or -1 for an unknown slug. */
export function indexOfSlug(slug: string): number {
  return lessons.findIndex((l) => l.slug === slug);
}

/**
 * Where a lesson lives, relative to the site root. With a `step` (counted
 * from 0), the link opens the lesson at that step: `#step-3` for the third.
 */
export function hrefOf(lesson: Lesson, step?: number): string {
  const page = lesson.lab ? `lab.html?lesson=${lesson.slug}` : `${lesson.slug}.html`;
  return step === undefined ? page : `${page}#step-${step + 1}`;
}

/** The step, counted from 0, that a link's `#step-N` asks for, or null for none. */
export function stepOfHash(hash: string): number | null {
  const match = /^#step-([1-9]\d*)$/.exec(hash);
  return match ? Number(match[1]) - 1 : null;
}

/** The slug of the lesson a URL points at, or "" when it names none. */
export function slugOfLocation(url: { pathname: string; search: string }): string {
  const page = (url.pathname.split("/").pop() ?? "").replace(/\.html$/, "");
  return page === "lab" ? (new URLSearchParams(url.search).get("lesson") ?? "") : page;
}
