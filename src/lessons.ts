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
    lessons: circles,
  },
  {
    title: "Angles",
    blurb: "Measuring turns, crossing parallels, and reading angles off a circle.",
    lessons: [...anglesLines, ...anglesCircles],
  },
  {
    title: "Triangles",
    blurb: "Classifying, measuring, matching and proving with three sides.",
    lessons: inOrder([...trianglesClassic, ...trianglesCentres, ...trianglesMeasure], TRIANGLES_ORDER),
  },
  {
    title: "Quadrilaterals",
    blurb: "Trapezoids to squares, and what each extra symmetry buys.",
    lessons: quadrilaterals,
  },
  {
    title: "Polygons",
    blurb: "Counting diagonals and angles in any number of sides.",
    lessons: polygons,
  },
  {
    title: "Angle Chasing",
    blurb: "Puzzles solved one small deduction at a time.",
    lessons: chasing,
  },
  {
    title: "Areas",
    blurb: "Scaling, sliding and cutting shapes without losing track of area.",
    lessons: areas,
  },
  {
    title: "Coordinates",
    blurb: "Geometry turned into numbers: slopes, distances and equations.",
    lessons: coordinates,
  },
  {
    title: "Power of a Point",
    blurb: "One product that every line through a point agrees on.",
    lessons: power,
  },
  {
    title: "Three Dimensions",
    blurb: "Solids you can turn over in your hand.",
    lessons: solids,
  },
  {
    title: "Transformations",
    blurb: "Shifts, turns, flips, stretches and squeezes.",
    lessons: transformations,
  },
  {
    title: "Potpourri",
    blurb: "Classic results that pull several chapters together.",
    lessons: potpourri,
  },
];

export const lessons: Lesson[] = chapters.flatMap((chapter) => chapter.lessons);

/** Position of a lesson in the reading order, or -1 for an unknown slug. */
export function indexOfSlug(slug: string): number {
  return lessons.findIndex((l) => l.slug === slug);
}

/** Where a lesson lives, relative to the site root. */
export function hrefOf(lesson: Lesson): string {
  return lesson.lab ? `lab.html?lesson=${lesson.slug}` : `${lesson.slug}.html`;
}

/** The slug of the lesson a URL points at, or "" when it names none. */
export function slugOfLocation(url: { pathname: string; search: string }): string {
  const page = (url.pathname.split("/").pop() ?? "").replace(/\.html$/, "");
  return page === "lab" ? (new URLSearchParams(url.search).get("lesson") ?? "") : page;
}
