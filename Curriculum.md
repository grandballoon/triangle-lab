# Curriculum Coverage

A running check of what the lab teaches against a standard high school curriculum, and what is still missing.
Update it whenever a lesson is added or a gap is closed.

## Trigonometry

### Lessons that teach trig directly

These seven lessons are the minimum set that covers the trig we teach today.
They make up the Trigonometry chapter, which follows Triangles.

| # | Lesson | Slug | Covers |
| --- | --- | --- | --- |
| 1 | Naming the Ratios | `trig` | The six ratios, the cofunction rule sin A = cos B, and sin² + cos² = 1 |
| 2 | Folding the Square | `fortyfive` | Exact values for 45°; resizing shows the ratio depends only on the angle |
| 3 | Folding the Equilateral | `thirtysixty` | 1 : √3 : 2 and the exact values for 30° and 60° |
| 4 | The Whole Table | `table` | Hypotenuse fixed at 1, the 0°–90° table, tan 90° undefined |
| 5 | Identities from One Triangle | `trig-identities` | Cofunctions and all three Pythagorean identities |
| 6 | From Circle to Waves | `trig-waves` | The unit circle: (cos θ, sin θ) as the tip of a turning radius, signs in each quadrant, tan θ on the tangent line x = 1, and the sine, cosine and tangent waves traced out together |
| 7 | Two Sides and an Angle | `area-sine` | Area = ½ab·sin C |

Together they cover right-triangle trig for acute angles, and a first look at the unit circle and the three graphs over a full turn.

### Related lessons

Prerequisites:

- The Pythagorean Theorem (`pythagoras`) and Similar Triangles (`similar`).
- Kinds of Angle (`angle-kinds`) teaches radians.
- Arcs, Sectors, Segments (`arcs-sectors`) teaches arc length = rθ.

Lessons that use trig without teaching it:

- Apothem and Circumradius (`regular-polygon`) uses sin and tan in a regular polygon.
- A Belt on Two Wheels (`belt-pulleys`) uses cos α to find how much of each wheel the belt wraps.

### Gaps

Grouped by the course that usually teaches them.

**Geometry (right-triangle and oblique-triangle trig)**

- [ ] Solving right triangles: inverse trig to find an angle from sides, finding missing sides, angles of elevation and depression.
  This is the biggest gap, because the current lessons go from angle to ratio but never back again.
- [ ] Law of Sines, including the ambiguous SSA case.
  It builds naturally on The Circumcircle, since a/sin A = 2R.
- [ ] Law of Cosines, shown as Pythagoras plus a correction term.
- [ ] Heron's formula (optional).

**Algebra 2 (trig functions)**

- [ ] The unit circle past 90°: reference angles, coterminal and negative angles.
  From Circle to Waves (`trig-waves`) covers the circle itself and the signs in each quadrant.
- [ ] Graphs of sine and cosine: amplitude, phase shift, midline.
  From Circle to Waves draws both graphs over one period and shows cosine as sine shifted by 90°, but never stretches or moves them.
- [ ] The reciprocal-function graphs.
  From Circle to Waves covers the graph of tan with its asymptotes.
- [ ] Modeling with sinusoids.
- [ ] Angular and linear speed.

**Precalculus (analytic trig)**

- [ ] Inverse trig as functions, with their restricted domains.
- [ ] Even/odd identities.
- [ ] Sum and difference identities.
- [ ] Double-angle and half-angle identities.
- [ ] Proving identities.
- [ ] Solving trig equations, with their general solutions.
- [ ] Polar coordinates (optional, depending on the curriculum).
- [ ] Polar form of complex numbers (optional).
- [ ] Vectors (optional).

### Suggested order for filling the gaps

1. Solving right triangles (inverse trig).
2. The unit circle beyond 90°.
3. Law of Sines.
4. Law of Cosines.
5. Graphs of sine and cosine.
6. Sum and double-angle identities.
7. Trig equations.

That covers the standard sequence through Algebra 2 and most of the precalc trig unit.
Steps 1 and 2 extend the existing `table` dial, and step 3 reuses the circumcircle work.

## The Art of Problem Solving, Volume 1

A check of the lab against the 29 chapters of Lehoczky and Rusczyk, *The Art of Problem Solving, Volume 1: the Basics* (seventh edition, 2006).
The book is all rights reserved, so it decides only which topics are taught and in what order; every lesson's words, figures and examples are our own.
Checked 2026-11-27 by matching the book's contents against the lab's chapters (`src/lessons.ts`) and lesson names (`src/chapters/`), and searching the lessons for each missing topic, not by reading section against lesson.

### Covered

| AoPS chapter | Lab chapter |
| --- | --- |
| 3 Linear Equations | Linear Equations (`linear.ts`) |
| 6 Quadratic Equations | Quadratic Equations (`quadratic.ts`), except 6.5 |
| 9 An Introduction to Circles | Circles (`circles.ts`) |
| 10 Angles | Angles (`angles-lines.ts`, `angles-circles.ts`), except 10.6 |
| 11 Triangles, a.k.a. Geometry | Triangles (`triangles-classic.ts`, `triangles-centres.ts`, `triangles-measure.ts`), Trigonometry (`trigonometry.ts`) |
| 12 Quadrilaterals | Quadrilaterals (`quadrilaterals.ts`) |
| 13 Polygons | Polygons (`polygons.ts`) |
| 14 Angle Chasing | Angle Chasing (`chasing.ts`) |
| 15 Areas | Areas (`areas.ts`) |
| 16 The Power of Coordinates | Coordinates (`coordinates.ts`) |
| 17 Power of a Point | Power of a Point (`power.ts`) |
| 18 Three Dimensional Geometry | Three Dimensions (`solids.ts`) |
| 19 Shifts, Turns, Flips, Stretches, and Squeezes | Transformations (`transformations.ts`), except 19.7 |
| 20 A Potpourri of Geometry | Potpourri (`potpourri.ts`) |

### Gaps within covered chapters

- [x] 6.5 Square roots of irrationals and imaginaries: square roots of negative numbers are taught in The Square Root of −1 (`complex-i`), and of complex numbers in `complex-square-root`.
- [ ] 10.6 The Burden of Proof: the lessons step through proofs, but none teaches how to write one.
- [ ] 19.7 Transformation Proofs: proving a result by moving the figure.

### Chapters with no lessons

**Algebra**

- [x] 1 Exponents and Logarithms: integer and fractional exponents, simplifying radicals, rationalizing denominators, logarithms.
  Now the Exponents & Logarithms chapter (`exponents.ts`), seven lab lessons.
- [x] 2 Complex Numbers: the square root of −1, complex number operations.
  Now the Complex Numbers chapter (`complex.ts`), five lab lessons.
- [x] 4 Proportions: direct and inverse variation, manipulating proportions, conversion factors, percent.
  Now the Proportions chapter (`proportions.ts`), five lab lessons.
- [x] 7 Special Factorizations and Clever Manipulations: squares of binomials, difference of squares, sums and differences of cubes, completing the rectangle, symmetric sums.
  Now the Special Factorizations chapter (`factorizations.ts`), five lab lessons.

**Numbers**

- [x] 5 Using the Integers: divisibility, number bases, the last digit, modular arithmetic, tricks, primes, common factors and multiples.
  Now the Using the Integers chapter (`integers.ts`), six lab lessons.
- [x] 8 What Numbers Really Are: integers and rationals, lowest terms and irrationals, complex and beyond.
  Now the What Numbers Really Are chapter (`numbers.ts`), four lab lessons.

**Functions and inequalities**

- [ ] 21 Functions: inputs and outputs, graphing, even and odd, absolute value, floor, piecewise functions, transforming a function.
- [ ] 22 Inequalities: linear, quadratic and absolute value inequalities, the trivial inequality.
- [ ] 23 Operations and Relations: what an operation is, its properties, relations.

**Discrete mathematics**

- [ ] 24 Sequences and Series: arithmetic and geometric series, infinite series, Σ notation, sequences, sequences and means.
- [ ] 25 Learning to Count: multiplication, the number of divisors, restrictions, permutations and factorials, overcounting, counting another way, the binomial theorem.
- [ ] 26 Statistics and Probability: statistics, probability and common sense, multiplying probabilities, casework, odds, expected value.
- [ ] 27 Sets: definitions, operations on sets, Venn diagrams, subsets.

**Proof**

- [ ] 28 Prove It: proof in words, contradiction, converses, mathematical induction, the pigeonhole principle, convincing but wrong arguments.
  Some lessons already teach converses (`pythagoras-converse`, `quad-converses`).

**Problems**

- [ ] 29 Parting Shots is a problem set rather than new material; it belongs in recall rather than in a lesson.

These chapters need not be geometric: diagrams, simulations and step-through processes (a clock face for modular arithmetic, Venn diagrams for sets, trees for counting) are as welcome as interactive figures.
