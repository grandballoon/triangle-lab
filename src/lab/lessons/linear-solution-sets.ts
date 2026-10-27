// What makes an equation linear. An equation in x and y is a test that each
// point of the plane passes or fails; the points that pass are its solutions.
// Hunting for them by hand leaves a trail of dots that, for x + y = 3, falls
// on a straight line — and solving for y shows why. Equations with a term of
// degree two, such as xy or x², fail that test: their solutions bend.

import { C } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { plot, PLANE } from "../kit/algebra.ts";
import { pair, par, plane, snapping } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const FOUND = C.gold;
/** At most this many found solutions are kept on the figure. */
const TRAIL = 80;

interface Equation {
  /** The toolbar's name for it. */
  name: string;
  tex: string;
  /** The left side at a point, and the number it must equal. */
  lhs(p: Vec): number;
  rhs: number;
  /** The left side with P's coordinates put in. */
  substituted(p: Vec): string;
  /** The solutions as a graph y = curve(x). */
  curve(x: number): number;
  solvedTex: string;
  /** The same, for a canvas label. */
  solvedText: string;
  degreeTex: string;
  linear: boolean;
}

const EQUATIONS: readonly Equation[] = [
  {
    name: "x + y = 3",
    tex: "x + y = 3",
    lhs: (p) => p.x + p.y,
    rhs: 3,
    substituted: (p) => `${par(p.x)} + ${par(p.y)}`,
    curve: (x) => 3 - x,
    solvedTex: "y = 3 - x",
    solvedText: "y = 3 − x",
    degreeTex: "x,\\ y:\\ \\text{degree } 1",
    linear: true,
  },
  {
    name: "2x − y = 1",
    tex: "2x - y = 1",
    lhs: (p) => 2 * p.x - p.y,
    rhs: 1,
    substituted: (p) => `2 \\cdot ${par(p.x)} - ${par(p.y)}`,
    curve: (x) => 2 * x - 1,
    solvedTex: "y = 2x - 1",
    solvedText: "y = 2x − 1",
    degreeTex: "2x,\\ y:\\ \\text{degree } 1",
    linear: true,
  },
  {
    name: "xy = 4",
    tex: "xy = 4",
    lhs: (p) => p.x * p.y,
    rhs: 4,
    substituted: (p) => `${par(p.x)} \\cdot ${par(p.y)}`,
    curve: (x) => 4 / x,
    solvedTex: "y = \\frac{4}{x}",
    solvedText: "y = 4/x",
    degreeTex: "xy:\\ \\text{degree } 1 + 1 = 2",
    linear: false,
  },
  {
    name: "x² + y = 4",
    tex: "x^2 + y = 4",
    lhs: (p) => p.x * p.x + p.y,
    rhs: 4,
    substituted: (p) => `${par(p.x)}^2 + ${par(p.y)}`,
    curve: (x) => 4 - x * x,
    solvedTex: "y = 4 - x^2",
    solvedText: "y = 4 − x²",
    degreeTex: "x^2:\\ \\text{degree } 2",
    linear: false,
  },
];

export default lesson((s) => {
  const which = s.choice(
    "Equation",
    EQUATIONS.map((e) => e.name),
  );
  const snap = s.toggle("Snap to grid", true);
  const P = s.point(-2, 1, { label: "P", color: C.ink, constrain: snapping(snap) });
  const equation = (): Equation => EQUATIONS.find((e) => e.name === which.value) ?? EQUATIONS[0];
  const solves = (p: Vec): boolean => {
    const e = equation();
    return Math.abs(e.lhs(p) - e.rhs) < (snap.on ? 1e-9 : 0.08);
  };

  // The solutions found so far, for the equation they were found for.
  let trailFor = which.value;
  let trail: Vec[] = [];

  return {
    steps: [
      {
        title: "One equation, two unknowns",
        text: "Drag $P$. Its coordinates are put into $x + y = 3$; when both sides agree, $P$ is a solution, and a dot stays behind. $(3, 0)$ works, and so do $(0, 3)$ and $(1, 2)$. How many can you find?",
      },
      {
        title: "Infinitely many, on a line",
        text: "There is no end to them: $(6, -3)$, $(-1, 4)$, $(\\tfrac12, \\tfrac52)$… Turn off snapping to try points between the grid lines. All of the solutions together make up a straight line.",
      },
      {
        title: "Solve for y",
        text: "Rearranged, $x + y = 3$ says $y = 3 - x$. Choose any $x$ and exactly one $y$ goes with it, and that $y$ falls by $1$ each time $x$ grows by $1$: the steady change of a line.",
      },
      {
        title: "Degree one makes a line",
        text: "Pick $xy = 4$ or $x^2 + y = 4$ and hunt again. The degree of a term is the sum of its variables' powers, so $xy$ and $x^2$ have degree $2$. Only an equation of degree $1$ is linear, and only then do its solutions fall on a line.",
      },
    ],

    draw(g, f) {
      const e = equation();
      if (which.value !== trailFor) {
        trailFor = which.value;
        trail = [];
      }
      const here = { x: P.x, y: P.y };
      if (solves(here) && !trail.some((q) => Math.hypot(q.x - here.x, q.y - here.y) < 0.2)) {
        trail = [...trail, here].slice(-TRAIL);
      }

      plane(g);
      if (f.at(1) > 0) {
        plot(g, PLANE, e.curve, { color: g.accent, alpha: f.at(1) });
        if (f.step >= 2) g.label({ x: -7.7, y: 3.9 }, e.solvedText, {
          color: g.accent,
          size: 16,
          align: "left",
          alpha: f.at(2),
        });
      }
      for (const p of trail) g.point(p, { color: FOUND, r: 6 });
      g.label({ x: -7.7, y: 4.5 }, e.name, { color: g.accent, size: 20, bold: true, align: "left" });
      const ok = solves(here);
      g.label(P, pair(P, 2), { color: ok ? FOUND : C.dim, size: 13, dx: 14, dy: -18, align: "left" });
    },

    readout(f) {
      const e = equation();
      const here = { x: P.x, y: P.y };
      const value = e.lhs(here);
      const ok = solves(here);
      const rows: Readout[] = [
        { label: "Equation", tex: e.tex },
        {
          label: ok ? "P is a solution" : "P is not a solution",
          tex: `${e.substituted(here)} = ${fmt(value, 2)} ${ok ? "=" : "\\ne"} ${e.rhs}`,
          tone: ok ? "good" : "plain",
        },
        { label: "Solutions found", tex: String(trail.length), tone: trail.length ? "plain" : "dim" },
      ];
      if (f.step >= 2) rows.push({ label: "Solved for y", tex: e.solvedTex });
      if (f.step >= 3) {
        rows.push({
          label: e.linear ? "Linear" : "Not linear",
          tex: e.degreeTex,
          tone: e.linear ? "good" : "warn",
        });
      }
      return rows;
    },

    uses: [
      {
        title: "Making change",
        text: "How many ways can you pay 50 cents in nickels and dimes? With $x$ nickels and $y$ dimes, $5x + 10y = 50$. The answers (10, 0), (8, 1), (6, 2), (4, 3), (2, 4) and (0, 5) lie on one straight line, because each dime you add replaces exactly two nickels.",
      },
      {
        title: "Edging for a garden bed",
        text: "With 12 m of edging for a rectangular bed, the length and width must satisfy $2x + 2y = 12$: 5 by 1, 4 by 2 and 3 by 3 all use it up, and they line up. Ask instead for a bed of area 8 m², $xy = 8$, and the shapes that work (8 by 1, 4 by 2, 2 by 4…) curve away instead.",
      },
    ],
  };
});
