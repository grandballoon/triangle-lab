# Showing an equation on the main display

The Linear Equations and Quadratic Equations chapters are the first lessons in the lab whose subject is an equation rather than a figure.
For a first cut, every one of them draws the equation on a Cartesian graph, because it is the standard picture and the lab already has a plane (`src/lab/kit/coordinates.ts`) and now graphs with scaled axes (`src/lab/kit/algebra.ts`).
This note records what each lesson shows today and the other ways it could be shown, so the display can be iterated on.
It is a design note only; nothing here is shown in the app.

## What each lesson draws now

| Lesson | Main display today |
| --- | --- |
| Keep It Balanced (`linear-balance`) | Each side of ax + b = cx + d as a line; solving moves both lines alike, and the crossing keeps its x. |
| What Makes It Linear (`linear-solution-sets`) | A point you drag; the solutions you find stay as dots, then the full solution set is drawn. |
| Substitution (`linear-substitution`) | Two lines; a walker on the first line, dragged until the second equation holds. |
| Elimination (`linear-elimination`) | Two lines and their weighted sum, which pivots about the crossing until it stands upright. |
| Rate Times Time (`catching-up`) | Distance–time graph of two cars, plus a road strip with the cars on it. |
| The Average Speed Trap (`average-speed`) | Odometer–time graph of a round trip, with the true average as a chord. |
| Working Together (`work-rates`) | Fraction-of-the-job against time for each pipe and both together. |
| Why Squares Appear (`quadratic-falling-rock`) | Height–time graph beside a tower drawn to the same height scale. |
| Roots From Factors (`quadratic-factoring`) | Parabola y = a(x − r)(x − s) with draggable roots on the axis, and a dashed target to factor. |
| Completing the Square (`completing-the-square`) | The area picture: a square, a strip split in two and turned, and the missing corner. |
| The Quadratic Formula (`quadratic-formula`) | Parabola from a, b, c sliders, its mirror line, and arrows for the reach √D / 2\|a\|. |
| Squaring Adds Answers (`extraneous-roots`) | y = √(x + p) and the line y = x + q; squaring brings in the lower branch. |
| Hidden Quadratics (`hidden-quadratics`) | The quartic in x and the parabola in z on the same axis, with arcs from each z to ±√z. |
| Beyond Quadratics (`polynomial-roots`) | A polynomial from up to four draggable roots, with a toggle that lifts it off the axis. |

Completing the Square is the one lesson that does not use the plane: the area model is as standard as the graph for that idea, and the graph view of it (sliding y = x² to its vertex) is folded into The Quadratic Formula instead.

## Alternatives worth trying

### A balance scale (linear, one unknown)

Draw the equation as a two-pan balance: x-blocks and unit weights on each pan, kept level.
Every legal move is visibly "do the same to both pans", which is exactly the idea of Keep It Balanced, and it is a common classroom model.
It breaks down for negative numbers (a balloon or hole for −1 is the usual patch) and for division, which needs the pans to be split into equal groups.
It would suit a hand-driven lesson well: lifting a block off both pans at once is a natural two-hand gesture.

### Algebra tiles

Squares for x², strips for x and unit squares for 1, with a second colour for negatives; zero pairs cancel.
They cover one-variable linear equations, factoring (arranging tiles into a rectangle whose sides are the factors) and completing the square with one consistent vocabulary.
This would let the factoring lesson show why x² + 5x + 6 = (x + 2)(x + 3), not just that the roots move the coefficients.

### Number lines and their mapping diagrams

Two parallel number lines, x on one and the value of each side on the other, with arrows from x to its image.
A linear function maps evenly spaced points to evenly spaced points, and the solution of ax + b = cx + d is where two arrow fans land on the same value.
It keeps every quantity one-dimensional, which some learners find easier than a plane, and it scales to functions whose outputs grow too fast for a graph.

### The solution set as a highlighted region of the plane

For What Makes It Linear, colour every pixel by how far the point is from satisfying the equation (a heat map of lhs − rhs), so the solution set is the zero contour.
That shows "an equation is a test on points" more directly than a hand-found trail, and it generalises to inequalities, which would be the natural next chapter.

### Systems as intersecting planes

A third unknown turns each linear equation into a plane in space, and the lab already has an orbit camera (`src/lab/solid.ts`).
Three planes meeting at a point, along a line, or not at all would extend Elimination to three equations, as the source chapter's later problems do.

### Determinant / area picture for elimination

The quantity A₁B₂ − A₂B₁ that decides whether two lines cross is the signed area of the parallelogram spanned by the coefficient vectors.
Showing that parallelogram collapse to zero as the lines become parallel would connect elimination to the Areas and Transformations chapters.

### Complex roots on the complex plane

The Quadratic Formula and Beyond Quadratics only say in words where the complex roots are.
A second, small panel with the complex plane could plot both roots as the coefficients change, so the learner sees two real roots collide on the real axis at D = 0 and split into a conjugate pair above and below it.
A lighter alternative that stays on the single graph is the "mirror parabola" trick: reflect the parabola in the horizontal line through its vertex; where the reflection meets the axis sits at the real part ± the imaginary part of the roots.

### Separate axes for x and z

Hidden Quadratics overlays a curve in x and a curve in z on one axis, which may read as confusing.
Two stacked graphs sharing a vertical axis, linked by the fold z = x² drawn between them, would make the substitution a visible map rather than arcs over one axis.

### Motion and work as animations first, graphs second

The word-problem lessons could open on the scene itself (cars on a road, water rising in a pool) and only draw the graph once the learner has watched the quantities change.
Rate Times Time already has a road strip; the pool and the round trip could follow it, with the graph built point by point as the clock runs.

### Tower drop to scale, with real units

Why Squares Appear could switch to metres (−4.9t²) and draw strobe images of the rock at equal time steps, so the growing gaps show the acceleration before any formula is written.

## Open questions

- Should the vertical axis squeeze (several lessons number it in 2s, 4s or 20s) be shown more loudly, for instance with a tick-spacing label, since a squeezed axis changes how steep a line looks?
- Do the equation lessons want term linking (`term()` in `src/lab/scene.ts`) for coefficients, so pointing at b in a formula lights up the slider or the intercept it controls?
- On a phone, the bottom row of three sliders is tight; a choice of preset equations might work better there than continuous sliders.
