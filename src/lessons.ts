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
import { complex } from "./chapters/complex.ts";
import { proportions } from "./chapters/proportions.ts";
import { integers } from "./chapters/integers.ts";
import { factorizations } from "./chapters/factorizations.ts";
import { numbers } from "./chapters/numbers.ts";
import { functions } from "./chapters/functions.ts";
import { coordinates } from "./chapters/coordinates.ts";
import { exponents } from "./chapters/exponents.ts";
import { linear } from "./chapters/linear.ts";
import { polygons } from "./chapters/polygons.ts";
import { potpourri } from "./chapters/potpourri.ts";
import { power } from "./chapters/power.ts";
import { quadratic } from "./chapters/quadratic.ts";
import { quadrilaterals } from "./chapters/quadrilaterals.ts";
import { sequences } from "./chapters/sequences.ts";
import { solids } from "./chapters/solids.ts";
import { transformations } from "./chapters/transformations.ts";
import { trianglesCentres } from "./chapters/triangles-centres.ts";
import { trianglesClassic } from "./chapters/triangles-classic.ts";
import { trianglesMeasure } from "./chapters/triangles-measure.ts";
import { trigonometry } from "./chapters/trigonometry.ts";
import type { Chapter, Lesson } from "./chapters/types.ts";

export type { Chapter, Lesson } from "./chapters/types.ts";

// The triangle lessons come from three files (the standalone pages and two
// batches of lab lessons) but read as one sequence, so their order is spelled
// out here.
const TRIANGLES_ORDER = [
  "angles", "equilateral", "isosceles", "scalene",
  "perimeter", "semiperimeter", "medians", "centroid", "bisectors", "incircle", "circumcircle", "altitudes",
  "inequality",
  "pythagoras", "pythagoras-square", "pythagoras-converse", "pythagorean-triples",
  "congruence", "right-congruence", "isosceles-base-angles", "chord-bisector",
  "similar", "similarity-tests", "altitude-on-hypotenuse", "angle-bisector-theorem", "triangle-tests",
  "area-base-height", "area-inradius",
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
      "Half base times height",
      "Inradius area formula",
    ],
    lessons: inOrder([...trianglesClassic, ...trianglesCentres, ...trianglesMeasure], TRIANGLES_ORDER),
  },
  {
    title: "Trigonometry",
    blurb: "SOH CAH TOA, then the unit circle that turns the ratios into waves.",
    axioms: [
      "Trigonometric ratios",
      "45-45-90 and 30-60-90 triangles",
      "Pythagorean identity",
      "The unit circle",
      "Sine, cosine and tangent waves",
      "Sine area formula",
    ],
    lessons: trigonometry,
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
    title: "Exponents & Logarithms",
    blurb: "Powers as counted factors, roots as fractional powers, and logarithms as powers read backwards.",
    axioms: [
      "Product of powers",
      "Quotient of powers",
      "Zero exponent",
      "Negative exponents",
      "Power of a power",
      "Power of a product",
      "Fractional exponents as roots",
      "Simplest radical form",
      "Rationalizing the denominator",
      "Conjugate radicals",
      "Logarithm as an exponent",
      "Laws of logarithms",
      "Change of base",
    ],
    lessons: exponents,
  },
  {
    title: "Complex Numbers",
    blurb: "A square root for −1, and the plane of numbers it opens up.",
    axioms: [
      "Imaginary unit",
      "Powers of i",
      "Square roots of negatives",
      "Complex addition",
      "Complex multiplication",
      "Multiplying by i is a quarter turn",
      "Lengths multiply, angles add",
      "Complex conjugate",
      "Modulus",
      "Complex division",
      "Complex square roots",
    ],
    lessons: complex,
  },
  {
    title: "Linear Equations",
    blurb: "Balancing, substituting and eliminating until one number is left.",
    axioms: [
      "Same operation on both sides",
      "Linear means degree one",
      "Substitution",
      "Elimination",
      "Rate × time = distance",
      "Average speed over a round trip",
      "Work rates add",
    ],
    lessons: linear,
  },
  {
    title: "Proportions",
    blurb: "Quantities that grow together or trade off, and the ratios and products that stay fixed.",
    axioms: [
      "Direct variation",
      "Constant of proportionality",
      "Inverse variation",
      "Cross-multiplying",
      "Adding tops and bottoms",
      "Dividing in a ratio",
      "Conversion factors equal 1",
      "Squared units need the factor squared",
      "Percent as hundredths",
      "Percent change as a multiplier",
      "Successive changes multiply",
    ],
    lessons: proportions,
  },
  {
    title: "Using the Integers",
    blurb: "Remainders, primes, common factors, other bases and clock arithmetic: what whole numbers do when you divide them.",
    axioms: [
      "Division with remainder",
      "b divides a",
      "Primes have two divisors",
      "Unique prime factorization",
      "Euclid's algorithm",
      "gcd × lcm = ab",
      "Place value in base b",
      "Converting by repeated division",
      "Congruence modulo m",
      "Sums and products mod m",
      "Powers cycle mod m",
      "Digit sums and 9",
      "Alternating sums and 11",
    ],
    lessons: integers,
  },
  {
    title: "Special Factorizations",
    blurb: "Squares of sums, differences of squares and cubes, and the clever manipulations they make possible.",
    axioms: [
      "(a + b)² = a² + 2ab + b²",
      "(a − b)² = a² − 2ab + b²",
      "(a + b)² − (a − b)² = 4ab",
      "a² − b² = (a + b)(a − b)",
      "Odd numbers sum to squares",
      "a³ − b³ = (a − b)(a² + ab + b²)",
      "a³ + b³ = (a + b)(a² − ab + b²)",
      "Completing the rectangle",
      "x² + y² = (x + y)² − 2xy",
      "Power sums by recurrence",
    ],
    lessons: factorizations,
  },
  {
    title: "What Numbers Really Are",
    blurb: "From counting numbers to complex ones, fractions in lowest terms, decimals that repeat, and a number no fraction can name.",
    axioms: [
      "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ",
      "Closure under an operation",
      "Equal fractions lie on one line",
      "Lowest terms: divide by the gcd",
      "The mediant lies between",
      "Rational decimals stop or repeat",
      "Repeating decimal to fraction",
      "Stops iff only 2s and 5s",
      "√2 is irrational",
      "p² − 2q² = ±1 approximations",
    ],
    lessons: numbers,
  },
  {
    title: "Quadratic Equations",
    blurb: "Factoring, completing the square, and the formula that always works.",
    axioms: [
      "Motion under gravity",
      "Zero-product property",
      "Sum and product of roots",
      "Completing the square",
      "Quadratic formula",
      "Discriminant",
      "Conjugate roots",
      "Extraneous roots",
      "Substitution into a quadratic",
      "Polynomial factor theorem",
    ],
    lessons: quadratic,
  },
  {
    title: "Sequences and Series",
    blurb: "Lists that grow by equal steps or equal ratios, their sums finite and infinite, and the means between their terms.",
    axioms: [
      "nth term a + (n − 1)d",
      "Arithmetic series n(first + last)/2",
      "nth term arⁿ⁻¹",
      "Geometric series a(1 − rⁿ)/(1 − r)",
      "Infinite series a/(1 − r)",
      "Repeating decimals as series",
      "Σ notation",
      "Sum of squares n(n + 1)(2n + 1)/6",
      "Recursive sequences",
      "Fixed point c/(1 − m)",
      "Arithmetic and geometric means",
      "AM–GM inequality",
    ],
    lessons: sequences,
  },
  {
    title: "Functions",
    blurb: "Rules that turn each input into one output, drawn as graphs you can mirror, cut into pieces and move.",
    axioms: [
      "Function, domain and range",
      "Composition of functions",
      "Vertical line test",
      "Even functions: f(−x) = f(x)",
      "Odd functions: f(−x) = −f(x)",
      "Even part plus odd part",
      "Absolute value as distance",
      "Piecewise functions",
      "Floor and ceiling",
      "Fractional part",
      "Shifting a graph",
      "Stretching and reflecting a graph",
    ],
    lessons: functions,
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

/** The id of a chapter's section on the menu, from its title: "Angles & Lines" is "angles-lines". */
export function anchorOf(chapter: Pick<Chapter, "title">): string {
  return chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
