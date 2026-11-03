# Primitives as APIs: triangle, circle, quadrilateral

A first cut at the interface of three geometric primitives, drawn from the axioms listed in `src/lessons.ts` and the lessons in `src/chapters/`.
It is a starting point for a creative coding library in which the relationships between figures, and the theorems that govern them, are the values a program works with.

## The idea in one paragraph

In a typical graphics library a triangle is three points and a fill.
Here a triangle is a value that knows its centres, its circles, its cevians and its classification, and every one of those is itself a live figure that moves when the triangle does.
A theorem is not a comment beside the code but a value too: it can be checked against a figure, drawn as a diagram, and run backwards as a constraint that bends a figure until the theorem's hypothesis holds.
Every lab lesson is already this shape ("drag a point and watch a product refuse to change"), so the library is the lab's figures turned into a language.

## The vocabulary underneath

Three primitives need a few smaller ones beneath them.
These are not the subject of this document, but every method below returns them.

| Type | What it is |
| --- | --- |
| `Point` | A position; free (draggable), or derived from other figures. |
| `Segment`, `Ray`, `Line` | Two points, read as bounded, half-bounded or unbounded. |
| `Angle` | A vertex and two rays; has a measure, a bisector and a kind (acute, right, obtuse, straight, reflex). |
| `Arc` | A circle and two points on it; minor or major. |
| `Measure` | A number with a unit and a provenance: length, angle, area, ratio. |
| `Relation` | A typed claim between figures or measures (see below). |
| `Theorem` | Hypotheses, a claim, and a witness (see below). |
| `Construction` | An ordered list of steps that build a figure; what a diagram is. |

### Figures are live

Every figure is a function of the free points it was built from.
`triangle.incircle()` is not a circle computed once; it is a circle that follows the triangle.
This is the lab's `Dyn<T>` (`src/lab/geo.ts`) made universal: a derived figure is a pure function of its parents, and the shell re-evaluates it each frame.

### Relations are the grammar

The axioms all claim one of a small number of relations.
Making them a closed set of types is what lets theorems be first-class.

| Relation | Example axiom |
| --- | --- |
| `equal(m1, m2)` | Isosceles triangle theorem: base angles equal. |
| `sum(ms, total)` | Triangle angle sum: ∠A + ∠B + ∠C = 180°. |
| `ratio(m1, m2, k)` | Centroid divides each median 2 : 1. |
| `product(a·b, c·d)` | Intersecting chords: PA·PB = PC·PD. |
| `parallel(l1, l2)` | Varignon: opposite sides of the midpoint quadrilateral are parallel. |
| `perpendicular(l1, l2)` | Rhombus diagonals cross at right angles. |
| `concurrent(l1, l2, l3)` | The three medians meet at one point. |
| `collinear(p1, p2, p3)` | A triangle's degenerate case; the Euler line, later. |
| `concyclic(p1, …, pn)` | Thales: every right-angle apex over a diameter lies on one circle. |
| `incident(p, figure)` | A point lies on a line or circle. |
| `tangent(f1, f2)` | A line touches a circle; two circles touch. |
| `inequality(m1, m2)` | Triangle inequality: c < a + b. |
| `invariant(m, under)` | Power of a point: PA·PB does not change as the line through P turns. |

### Theorems are values

```ts
interface Theorem<F> {
  name: string;                          // "Inscribed angle theorem"
  hypotheses: Predicate<F>[];            // what the figure must be
  claim: (f: F) => Relation;             // what then holds
  check(f: F): Evidence;                 // both sides measured, and the residual
  witness(f: F): Construction;           // the diagram: the proof as steps
  enforce(f: F, free: Point[]): Constraint; // run backwards: move `free` until the claim holds
}
```

The three uses map onto what the lab already does.
`check` is a readout: the formula band showing both sides of an equation agree.
`witness` is a proof: the step column, each step a construction that fades in.
`enforce` is a snap: dragging the apex until the angle clicks to right, which is the converse of Pythagoras used as a solver.

A creative coder mostly uses the third.
"Keep this quadrilateral a parallelogram while I drag one corner" is `parallelogramTests.enforce(quad, [D])`.
"Animate a point round the circle and draw the angle it sees" is the inscribed angle theorem's `witness` with its free point on a `vary`.

### Classification is refinement

The most programming-language-like part of the design: the classification axioms are types.

A predicate on a figure, when it holds, refines the figure to a subtype with more methods.
`triangle.asRight()` returns a `RightTriangle | null`, and only a `RightTriangle` has `hypotenuse()`, `sin(θ)` or `altitudeToHypotenuse()`.

Each family of axioms then splits cleanly in two.
The tests for a shape are its introduction rules: the ways to prove a figure is one ("Parallelogram tests", "Converse of Pythagoras").
The properties of a shape are its elimination rules: what you may use once you know it is one ("Parallelogram properties", "Rhombus diagonals").
A test is a refining constructor, and a property is a method on the refined type.

```
Triangle
├── IsoscelesTriangle ── EquilateralTriangle
├── RightTriangle ─┬── RightIsosceles (45-45-90)
│                  └── ThirtySixty (30-60-90)
├── AcuteTriangle
└── ObtuseTriangle

Quadrilateral
├── ConvexQuad / ConcaveQuad / CrossedQuad
├── Trapezoid ── IsoscelesTrapezoid
│      └── Parallelogram ─┬── Rhombus ──┐
│                         └── Rectangle ┴── Square
├── TangentialQuad (has an incircle)
└── CyclicQuad (has a circumcircle)

Circle
└── (no subtypes; a circle's variety is in its relations to points, lines and circles)
```

A refinement can be held or merely observed.
`tri.asRight()` asks whether the figure is right now; `tri.keepRight(at: C)` enforces it, so the figure stays right as it is dragged.
That distinction, observing a property versus constraining by it, is the whole difference between a readout and an instrument.

## Triangle

### Making one

| Method | Returns | Axiom |
| --- | --- | --- |
| `triangle(A, B, C)` | `Triangle` | — |
| `triangle.sss(a, b, c)` | `Triangle \| null` | SSS congruence; null when the triangle inequality fails |
| `triangle.sas(b, C, a)` | `Triangle` | SAS congruence |
| `triangle.asa(A, c, B)` | `Triangle \| null` | ASA congruence; null when A + B ≥ 180° |
| `triangle.aas(A, B, a)` | `Triangle \| null` | AAS congruence |
| `triangle.hl(hyp, leg)` | `RightTriangle \| null` | HL congruence |
| `triangle.ssa(a, b, A)` | `Triangle[]` (0, 1 or 2) | The ambiguous case; why SSA is not a criterion |
| `triangle.equilateral(side)` | `EquilateralTriangle` | — |
| `triangle.isosceles(base, leg)` | `IsoscelesTriangle` | — |
| `triangle.right(a, b)` | `RightTriangle` | — |
| `triangle.fortyFive(leg)` | `RightIsosceles` | 45-45-90: 1 : 1 : √2 |
| `triangle.thirtySixty(short)` | `ThirtySixty` | 30-60-90: 1 : √3 : 2 |
| `triangle.triple(m, n)` | `RightTriangle` with whole sides | Pythagorean triples (Euclid's formula) |

The congruence criteria are constructors because a criterion says exactly that: these parts leave no freedom.
That is what the congruence lesson shows ("SSS, SAS, ASA leave C one landing spot"), so `ssa` returning a list is the theorem, not an awkwardness.

### Parts

| Method | Returns |
| --- | --- |
| `.vertices()`, `.A`, `.B`, `.C` | `Point` |
| `.sides()`, `.a`, `.b`, `.c` | `Segment` (side a opposite A) |
| `.angles()`, `.angleAt(v)` | `Angle` |
| `.exteriorAngle(v, side)` | `Angle` |
| `.perimeter()`, `.semiperimeter()` | `Measure` |

### Lines through it

| Method | Returns | Axiom |
| --- | --- | --- |
| `.median(v)` | `Segment` to the opposite midpoint | — |
| `.altitude(v)` | `Segment` to the foot, which may lie on the extended side | Half base times height |
| `.angleBisector(v)` | `Segment` to the opposite side | Angle bisector theorem: the foot splits the side as b : c |
| `.perpendicularBisector(side)` | `Line` | — |
| `.midsegment(side)` | `Segment` parallel to `side`, half its length | Medial triangle |

### Centres and their circles

| Method | Returns | Axiom |
| --- | --- | --- |
| `.centroid()` | `Point` | Centroid: medians concurrent, 2 : 1; the vertex average |
| `.incentre()` | `Point` | Incentre: bisectors concurrent |
| `.incircle()` | `Circle` | Inradius area formula: r = Area / s |
| `.tangentLengths()` | `[s−a, s−b, s−c]` | Incircle tangent lengths |
| `.circumcentre()` | `Point` | Circumcentre: perpendicular bisectors concurrent |
| `.circumcircle()` | `Circle` | Inside, on or outside by acute, right or obtuse |
| `.orthocentre()` | `Point` | Orthocentre: altitudes concurrent |
| `.excentre(v)`, `.excircle(v)` | `Point`, `Circle` | Incentre–excentre lemma |
| `.arcMidpoint(v)` | `Point` on the circumcircle | Incentre–excentre lemma: equidistant from B, C, I and I_A |

### Measures and the theorems that compute them

| Method | Returns | Axiom |
| --- | --- | --- |
| `.area()` | `Measure` | — |
| `.area.byBaseHeight(side)` | `Construction` | Half base times height (right triangles add or subtract) |
| `.area.bySine(v)` | `Construction` | Sine area formula: ½ab·sin C |
| `.area.byInradius()` | `Construction` | Inradius area formula: r·s |
| `.angleSum()` | `Construction` | Triangle angle sum: carry two angles along a parallel |
| `.exteriorAngleTheorem(v)` | `Construction` | Exterior angle = sum of the two remote interiors |
| `.inequality(side)` | `Construction` | Triangle inequality: swing a side on its circle |

Each of these returns a construction rather than a number, because the interesting thing is the diagram that shows the number; `.area()` alone is the number.

### Classification

| Method | Returns | Axiom |
| --- | --- | --- |
| `.bySides()` | `"equilateral" \| "isosceles" \| "scalene"` | Classification by sides |
| `.byAngles()` | `"acute" \| "right" \| "obtuse"` | Converse of Pythagoras: compare c² with a² + b² |
| `.asIsosceles()`, `.keepIsosceles(apex)` | `IsoscelesTriangle \| null`, `Constraint` | Isosceles triangle theorem |
| `.asEquilateral()`, `.keepEquilateral()` | | — |
| `.asRight()`, `.keepRight(at)` | `RightTriangle \| null`, `Constraint` | Converse of Pythagoras; Thales |

### Comparing two triangles

| Method | Returns | Axiom |
| --- | --- | --- |
| `.congruent(t)` | `{ criterion, correspondence } \| null` | SSS, SAS, ASA, AAS, HL |
| `.similar(t)` | `{ criterion, k, correspondence } \| null` | AA, SAS, SSS similarity |
| `.areaRatio(t)` | `Measure` | Area scales by k² |

The result names the criterion that witnesses the claim, so a program can draw the matching marks (ticks on equal sides, arcs on equal angles) without being told which parts to compare.

### Derived figures

| Method | Returns | Axiom |
| --- | --- | --- |
| `.medialTriangle()` | `Triangle` | Medial triangle: a quarter of the area |
| `.medianPieces()` | `Triangle[6]` | Medians cut six equal areas |
| `.squaresOnSides()` | `Quadrilateral[3]` | Pythagorean theorem |
| `.splitAtIncentre()` | `Triangle[3]` | Inradius area formula |
| `.slideApex()` | `Constraint` along the parallel to the base | Same base, same altitude |

### Refined: `RightTriangle`

| Method | Returns | Axiom |
| --- | --- | --- |
| `.hypotenuse()`, `.legs()` | `Segment` | — |
| `.pythagoras()` | `Construction` | Four triangles in the square on the hypotenuse |
| `.sin(θ)`, `.cos(θ)`, `.tan(θ)`, `.csc`, `.sec`, `.cot` | `Measure` | Trigonometric ratios; cofunction rule sin A = cos B |
| `.identity()` | `Construction` | Pythagorean identity: sin² + cos² = 1 at hypotenuse 1 |
| `.thalesCircle()` | `Circle` on the hypotenuse | Thales' theorem |
| `.altitudeToHypotenuse()` | `{ foot, triangles: [3 similar] }` | Geometric mean theorem: h² = pq |

### Refined: `EquilateralTriangle`

| Method | Returns | Axiom |
| --- | --- | --- |
| `.fold()` | `ThirtySixty[2]` | 30-60-90 triangles |
| `.viviani(P)` | `Construction` | Viviani's theorem: the three distances sum to the altitude |

### Transformations

`translate(v)`, `rotate(centre, θ)`, `reflect(line)`, `pointReflect(P)`, `dilate(centre, k)` and `stretch(axis, k)` apply to every figure, not only to triangles.
Each knows what it keeps (Isometry invariants), so `t.dilate(O, 2).similar(t)` is answered from the transformation, not measured.

| Transformation | Keeps |
| --- | --- |
| translate, rotate, reflect, point reflect | lengths, angles, areas, and so congruence |
| dilate | angles, ratios, parallel directions; areas by k² |
| stretch | parallels and ratios along a line; areas by k; not angles |

## Circle

### Making one

| Method | Returns | Axiom |
| --- | --- | --- |
| `circle(O, r)` | `Circle` | — |
| `circle.throughPoint(O, P)` | `Circle` | — |
| `circle.throughThree(A, B, C)` | `Circle \| null` | Circumcentre; null when collinear |
| `circle.onDiameter(A, B)` | `Circle` | Thales' theorem |
| `circle.fromEquation(h, k, r)` | `Circle` | Equation of a circle |

### Parts

| Method | Returns | Axiom |
| --- | --- | --- |
| `.centre`, `.radius()`, `.diameter(through)` | `Point`, `Measure`, `Segment` | Parts of a circle |
| `.pointAt(θ)` | `Point` | Cartesian and polar coordinates |
| `.chord(P, Q)` | `Segment` | — |
| `.arc(P, Q, major?)` | `Arc` | — |
| `.sector(P, Q)`, `.segment(P, Q)` | regions | Arc length and sector area |
| `.tangentAt(P)` | `Line` | — |

### Measures

| Method | Returns | Axiom |
| --- | --- | --- |
| `.circumference()` | `Measure`; `.unroll()` is its diagram | Circumference and π |
| `.area()` | `Measure`; `.wedges(n)` is its diagram | Area of a circle: wedges into a πr × r rectangle |
| `arc.length()`, `sector.area()` | rθ, ½r²θ | Arc length and sector area |
| `segment.area()` | sector minus triangle | Area by subtraction |

### A circle and a point

| Method | Returns | Axiom |
| --- | --- | --- |
| `.side(P)` | `"inside" \| "on" \| "outside"` | Equation of a circle |
| `.power(P)` | `Measure`: d² − r² | Power of a point |
| `.tangentsFrom(P)` | `{ points: [T1, T2], length }` | Equal tangents theorem; the centre line bisects them |
| `.chordsThrough(P)` | `Construction` with a free line through P | Power of a point as an invariant |

### A circle and a line

| Method | Returns | Axiom |
| --- | --- | --- |
| `.meet(line)` | `Point[]` (0, 1 or 2) and the discriminant | Discriminant test |
| `chord.perpendicularBisector()` | `Line` through the centre | Perpendicular bisector of a chord |

### The angle theorems

Each takes the points it names and returns the angle together with the arcs it is half of, so drawing the claim draws the reason.

| Method | Returns | Axiom |
| --- | --- | --- |
| `.centralAngle(arc)` | `Angle` | — |
| `.inscribedAngle(arc, P)` | `Angle`, equal to half the central angle | Inscribed angle theorem |
| `.angleInSemicircle(diameter, P)` | a right `Angle` | Thales' theorem |
| `.chordChordAngle(c1, c2)` | ½(arc₁ + arc₂) | Chord–chord angle |
| `.secantSecantAngle(P, s1, s2)` | ½(far arc − near arc) | Secant–secant angle |
| `.tangentChordAngle(T, chord)` | ½ the intercepted arc | Tangent–chord angle |

### The products

| Method | Returns | Axiom |
| --- | --- | --- |
| `.crossingChords(c1, c2)` | `product` relation PA·PB = PC·PD | Intersecting chords theorem |
| `.tangentSecant(P, secant)` | `product` relation PT² = PA·PB | Tangent–secant theorem |

These are three faces of one theorem, and the API should say so: `crossingChords`, `tangentSecant` and `power` all return the same `Measure`, named the power of P.

### Two circles

| Method | Returns | Axiom |
| --- | --- | --- |
| `.meet(c)` | `Point[]` | — |
| `.touches(c)` | `"externally" \| "internally" \| null` | Distance between tangent circles: r₁ ± r₂ |
| `.keepTangent(c)` | `Constraint` | Distance between tangent circles |
| `.commonTangents(c)` | `Line[]` (up to 4) | Common tangents |
| `.belt(c)` | `{ tangents, arcs, length }` | Common tangents; a belt on two wheels |
| `.lens(c)` | region; its area as two sectors minus two triangles | Lens area |

### Polygons on a circle

| Method | Returns | Axiom |
| --- | --- | --- |
| `.inscribe(n)` | regular `Polygon` | Apothem and circumradius |
| `.circumscribe(n)` | regular `Polygon` | Apothem and circumradius |
| `.inscribedQuad(P, Q, R, S)` | `CyclicQuad` | (follows from the inscribed angle theorem) |

### Transformations

`dilate(O, k)` scales the area by k² (Area scales by k²), and a circle's symmetries are every rotation about its centre and every reflection in a diameter.
`Sphere.slice(plane)` returns a circle of radius √(R² − d²) (Sphere cross-sections), and `Cone.unroll()` a sector (Cone lateral area), so the solids reach the circle through methods of their own.

## Quadrilateral

### Making one

| Method | Returns | Axiom |
| --- | --- | --- |
| `quad(A, B, C, D)` | `Quadrilateral` | — |
| `quad.parallelogram(A, B, C)` | `Parallelogram` with D = A + C − B | Parallelogram properties |
| `quad.rectangle(w, h)`, `quad.rhombus(side, θ)`, `quad.square(side)` | | — |
| `quad.trapezoid(base1, base2, height, shift)` | `Trapezoid` | — |
| `quad.isoscelesTrapezoid(base1, base2, height)` | `IsoscelesTrapezoid` | Isosceles trapezoid |
| `quad.fromDiagonals(d1, d2, { bisect?, equal?, perpendicular? })` | the shape the conditions force | Rectangle and square diagonals; Rhombus diagonals |
| `quad.tangential(circle, T1, T2, T3, T4)` | `TangentialQuad` | Pitot's theorem |

`fromDiagonals` is the "Diagonals decide" lesson as a function: the return type is computed from the flags, so `{ bisect, equal, perpendicular }` returns a `Square`.

### Parts

| Method | Returns |
| --- | --- |
| `.vertices()`, `.sides()`, `.angles()` | `Point[4]`, `Segment[4]`, `Angle[4]` |
| `.diagonals()` | `Segment[2]` |
| `.diagonalCrossing()` | `Point \| null` (null when concave or crossed) |
| `.split(diagonal)` | `Triangle[2]` |

### Measures

| Method | Returns | Axiom |
| --- | --- | --- |
| `.angleSum()` | `Construction`: split by a diagonal into two triangles | Quadrilateral angle sum; works when dented |
| `.area()` | `Measure` | — |
| `.diagonalCount()` | 2, as n(n − 3)/2 | Diagonal count |
| `.exteriorAngleSum()` | `Construction`: shrink to a point | Exterior angle sum |

### Classification

| Method | Returns | Axiom |
| --- | --- | --- |
| `.shape()` | `"convex" \| "concave" \| "crossed"` | — |
| `.asTrapezoid()` | `Trapezoid \| null` | — |
| `.asParallelogram()` | `{ quad: Parallelogram, test } \| null` | Parallelogram tests: which of the five tests holds |
| `.asRhombus()`, `.asRectangle()`, `.asSquare()` | | Rhombus diagonals; Rectangle and square diagonals |
| `.asTangential()` | `TangentialQuad \| null` | Pitot's theorem: a + c = b + d |
| `.asCyclic()` | `CyclicQuad \| null` | (opposite angles supplementary) |
| `.keepParallelogram(free)` and the rest | `Constraint` | the same tests, run as constraints |

`asParallelogram` names its test for the same reason `congruent` names its criterion: the test is what a diagram marks.

### Derived figures

| Method | Returns | Axiom |
| --- | --- | --- |
| `.varignon()` | `Parallelogram` on the midpoints | Varignon's theorem: half the area, perimeter = the diagonals' sum |
| `.trisectors()` | the angles between adjacent corner trisectors | Trisected corners (angle chasing) |
| `.triangulate()` | `Triangle[2]` | Interior angle sum |

### Refined: `Trapezoid`

| Method | Returns | Axiom |
| --- | --- | --- |
| `.bases()`, `.legs()`, `.height()` | | — |
| `.midsegment()` | `Segment`, the average of the bases | Trapezoid midsegment |
| `.area()` | midsegment × height | Trapezoid midsegment |
| `.diagonalAreas()` | `Triangle[4]`: the two beside the legs equal | Trapezoid diagonal areas |

### Refined: `IsoscelesTrapezoid`

Equal legs, equal base angles and equal diagonals, each available as a relation (`.legsEqual()`, `.baseAnglesEqual()`, `.diagonalsEqual()`), since the lesson's point is that they arrive together.

### Refined: `Parallelogram`

| Method | Returns | Axiom |
| --- | --- | --- |
| `.oppositeSidesEqual()`, `.oppositeAnglesEqual()`, `.diagonalsBisect()` | `Relation` | Parallelogram properties |
| `.area()` | base × height; `.shear()` is its diagram | Parallelogram area: cut a corner off, make a rectangle |
| `.slideTop()` | `Constraint`: area held still | Parallelogram area |

### Refined: `Rhombus`, `Rectangle`, `Square`

| Method | On | Returns | Axiom |
| --- | --- | --- | --- |
| `.diagonalsPerpendicular()` | Rhombus | `Relation` | Rhombus diagonals |
| `.diagonalsBisectAngles()` | Rhombus | `Relation` | Rhombus diagonals |
| `.diagonalsEqual()` | Rectangle | `Relation` | Rectangle and square diagonals |
| `.diagonal()` | Square | side·√2 | 45-45-90 triangles |
| `.midpointSquare()` | Square | `Square` of half the area | Rectangles and squares lesson |
| `.cornersCut()` | Square | regular octagon | Octagon from a square |
| `.leaves()` | Square | the four leaves of four semicircles | Inclusion–exclusion |

### Refined: `TangentialQuad`

`.incircle()`, and `.pitot()`: the relation a + c = b + d, with the eight tangent lengths as its diagram.

### Symmetries

`.symmetries()` returns the rotations and reflections that map a figure onto itself (Rotational and reflective symmetry).
The type hierarchy and the symmetry groups line up, which is worth exploiting: a square has eight, a rectangle and a rhombus four each, a parallelogram two, an isosceles trapezoid two, and a general quadrilateral one.

## How the pieces compose

A short example of the intended feel, not of final syntax.

```ts
const A = free(-3, 0), B = free(3, 0), C = free(0, 4);
const t = triangle(A, B, C);

draw(t, t.incircle(), t.circumcircle());
draw(t.centroid(), t.orthocentre(), t.circumcentre());  // the Euler line appears on its own

t.keepRight(C);                        // C now moves on the Thales circle over AB
draw(t.asRight()!.altitudeToHypotenuse());

const q = quad(free(), free(), free(), free());
draw(q.varignon());                    // always a parallelogram, however q is dragged
show(q.varignon().area(), "=", q.area().half());

const k = circle(origin, 3);
const P = free(5, 1);
const line = turning(P);               // a line through P that rotates over time
show(k.power(P), "=", product(...k.meet(line).map((X) => dist(P, X))));
```

The last block is the Power of a Point lesson in four lines, and the claim on its last line is checked every frame.

## What this suggests for the build

The library falls into a functional core and a thin shell, as the lab already does.
Figures, relations, theorems and constructions are pure values; a frame is a function from free-point positions to the figures they determine.
The shell holds the free points, reads the pointer and the hands, and draws.
Constraints are the lab's `Constraint` (`src/lab/geo.ts`) generalised: a function that projects a free point back onto where a theorem lets it be.

Three things to settle early, because everything else leans on them.

1. **Degenerate and ambiguous cases are values, not exceptions.** `ssa` returns a list, `meet` returns a list, `asRight` returns null, a collinear triple has no circumcircle. A creative coder drags into these cases constantly, and the lab's lessons are often about them (SSA's second landing spot, an altitude's foot leaving the side).
2. **Correspondence is part of every comparison.** Congruence and similarity are claims about which vertex goes to which, and the marks a diagram draws depend on it.
3. **A theorem's `enforce` needs a choice of what moves.** "Keep it right" can move C, or B, or rotate a side; the API should always take the free points explicitly rather than guess.

## Axioms not yet placed

These belong to other primitives, and are where the library grows next.

- Lines and angles: Vertical angles, Corresponding and alternate angles, Degrees and radians, Slope, Equation of a line, Parallel and perpendicular slopes, Distance formula, Section formula.
- Polygons in general: Interior angle sum, Exterior angle sum, Angles in a regular polygon, Regular hexagon (the quadrilateral is the n = 4 case of each).
- Transformations as values in their own right: Fold as perpendicular bisector, Heron's reflection principle.
- Solids: Skew lines, Space diagonal, Nets and unrolling, Pyramid volume, Euler's polyhedron formula.
- Combinations of several figures: Hippocrates' lune, Crossed ladders theorem, Area by subtraction in general.
