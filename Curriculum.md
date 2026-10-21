# Curriculum Coverage

A running check of what the lab teaches against a standard high school curriculum, and what is still missing.
Update it whenever a lesson is added or a gap is closed.

## Trigonometry

### Lessons that teach trig directly

These six lessons are the minimum set that covers the trig we teach today.
They live in the Triangles chapter.

| # | Lesson | Slug | Covers |
| --- | --- | --- | --- |
| 1 | Naming the Ratios | `trig` | The six ratios, the cofunction rule sin A = cos B, and sin² + cos² = 1 |
| 2 | Folding the Square | `fortyfive` | Exact values for 45°; resizing shows the ratio depends only on the angle |
| 3 | Folding the Equilateral | `thirtysixty` | 1 : √3 : 2 and the exact values for 30° and 60° |
| 4 | The Whole Table | `table` | Hypotenuse fixed at 1, the 0°–90° table, tan 90° undefined |
| 5 | Identities from One Triangle | `trig-identities` | Cofunctions and all three Pythagorean identities |
| 6 | Two Sides and an Angle | `area-sine` | Area = ½ab·sin C |

Together they cover right-triangle trig for acute angles and nothing past that.

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

- [ ] The unit circle past 90°: reference angles, signs in each quadrant, coterminal and negative angles.
  [specs/07-introduction-to-trigonometry.md](specs/07-introduction-to-trigonometry.md) already lists extending the dial past 90° as future work.
- [ ] Graphs of sine and cosine: amplitude, period, phase shift, midline.
- [ ] Graph of tan with its asymptotes, and the reciprocal-function graphs.
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
