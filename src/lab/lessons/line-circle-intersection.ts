// Where a line meets a circle. A common point satisfies both equations, so
// substituting the line into the circle leaves a quadratic in one variable.
// Its discriminant counts the meeting points — two, one (a tangent) or none —
// and its roots are their coordinates.

import { C, tint } from "../draw.ts";
import { both, fmt, inBox, snapToGrid, type Vec } from "../geo.ts";
import { keepApart, lattice, num, pair, plane, texPoint, texShiftSquared, texSum } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const R = 3;
const MEET = C.gold;
const CENTRE_BOX = both(snapToGrid(1), inBox(-4, 4, -1, 1));

interface Meeting {
  /** The variable left after substituting: y only when the line is vertical. */
  unknown: "x" | "y";
  /** The line as LaTeX, and the expression it puts in place of the other variable. */
  lineTex: string;
  substitutedTex: string;
  /** Coefficients of the quadratic a·u² + b·u + c = 0 in the unknown u. */
  a: number;
  b: number;
  c: number;
  discriminant: number;
  points: Vec[];
}

/** Substitute the line through `p1` and `p2` into the circle about `o`. */
function meet(p1: Vec, p2: Vec, o: Vec): Meeting {
  const run = p2.x - p1.x;
  const vertical = Math.abs(run) < 1e-9;
  // Non-vertical: y = mx + n, leaving a quadratic in x. Vertical: x = k,
  // leaving one in y.
  const m = vertical ? 0 : (p2.y - p1.y) / run;
  const n = p1.y - m * p1.x;
  const k = p1.x;
  const a = vertical ? 1 : 1 + m * m;
  const b = vertical ? -2 * o.y : 2 * (m * (n - o.y) - o.x);
  const c = vertical ? o.y ** 2 + (k - o.x) ** 2 - R * R : o.x ** 2 + (n - o.y) ** 2 - R * R;
  const raw = b * b - 4 * a * c;
  const discriminant = Math.abs(raw) < 1e-9 ? 0 : raw;
  const roots =
    discriminant < 0
      ? []
      : discriminant === 0
        ? [-b / (2 * a)]
        : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
  return {
    unknown: vertical ? "y" : "x",
    lineTex: vertical ? `x = ${fmt(k)}` : `y = ${texSum([[m, "x"], [n, ""]])}`,
    substitutedTex: vertical
      ? `(${fmt(k - o.x)})^2 + ${texShiftSquared("y", o.y)} = ${R * R}`
      : `${texShiftSquared("x", o.x)} + (${texSum([[m, "x"], [n - o.y, ""]])})^2 = ${R * R}`,
    a,
    b,
    c,
    discriminant,
    points: roots.map((u) => (vertical ? { x: k, y: u } : { x: u, y: m * u + n })),
  };
}

const COUNT = ["no common point", "one common point: a tangent", "two common points"];

export default lesson((s) => {
  const O = s.point(1, 0, { label: "O", constrain: CENTRE_BOX });
  const A = s.point(-5, -1, { label: "A", color: C.cyan });
  const B = s.point(3, 3, { label: "B", color: C.cyan });
  keepApart(A, B, lattice);

  return {
    steps: [
      {
        title: "Cross, touch or miss",
        text: "Drag $A$ and $B$ to move the line, and $O$ to move the circle. Count the points they share. Can you make the line just touch the circle?",
      },
      {
        title: "Substitute the line",
        text: "A shared point satisfies both equations at once. The line gives $y$ in terms of $x$; put that in place of $y$ in the circle's equation and only $x$ is left. (For a vertical line, $x$ is known and $y$ is left.)",
      },
      {
        title: "A quadratic decides",
        text: "Multiplied out, it is a quadratic $au^2 + bu + c = 0$. Its discriminant $D = b^2 - 4ac$ counts the solutions: two if $D > 0$, exactly one if $D = 0$ — the line is tangent — and none if $D < 0$.",
      },
      {
        title: "Solve, then go back",
        text: "The quadratic formula gives the solutions, marked on the axis in line with each meeting point. Put each one back into the line's equation for the other coordinate.",
      },
      {
        title: "Other pairs of curves",
        text: "Two different lines: eliminating $y$ leaves a linear equation, so they share one point, or none if parallel. Two circles: subtracting their equations cancels the squares and leaves a line, so again $0$, $1$ or $2$ points.",
      },
    ],

    draw(g, f) {
      const found = meet(A, B, O);
      const [first, second] = found.points;

      plane(g);
      g.circle(O, R, { color: g.accent, fill: tint(g.accent, 0.08) });
      g.line(A, B, { color: C.cyan });
      if (second) g.segment(first, second, { color: MEET, width: 5 });

      if (f.at(3) > 0) {
        // Each root is the shadow of a meeting point on the unknown's axis.
        for (const p of found.points) {
          const shadow = found.unknown === "x" ? { x: p.x, y: 0 } : { x: 0, y: p.y };
          g.segment(p, shadow, { color: MEET, width: 2, dash: [5, 5], alpha: f.at(3) });
          g.point(shadow, { color: MEET, r: 5, alpha: f.at(3) });
        }
      }
      found.points.forEach((p, i) => {
        g.point(p, { color: MEET, r: 7 });
        // The two captions sit on opposite sides so they do not collide.
        const right = i === 1;
        g.label(p, pair(p, 2), { color: MEET, size: 13, dx: right ? 14 : -14, dy: 18, align: right ? "left" : "right" });
      });

      const status = f.step >= 2 ? `D ${found.discriminant > 0 ? ">" : found.discriminant < 0 ? "<" : "="} 0: ` : "";
      g.label({ x: -7.7, y: 4.5 }, status + COUNT[found.points.length], {
        color: found.points.length ? MEET : C.dim,
        size: 18,
        bold: true,
        align: "left",
      });
      g.label(O, `R = ${num(R)}`, { color: g.accent, dx: -18, dy: -18, align: "right", size: 13 });
    },

    readout(f) {
      const found = meet(A, B, O);
      const u = found.unknown;
      const D = found.discriminant;
      const line: Readout = { label: "Line", tex: found.lineTex };
      const circle: Readout = {
        label: "Circle",
        tex: `${texShiftSquared("x", O.x)} + ${texShiftSquared("y", O.y)} = ${R * R}`,
      };
      const substituted: Readout = { label: `Substituted: only ${u} is left`, tex: found.substitutedTex };
      const quadratic: Readout = {
        label: `Quadratic in ${u}`,
        tex: `${texSum([[found.a, `${u}^2`], [found.b, u], [found.c, ""]])} = 0`,
      };
      const discriminant: Readout = {
        label: "Discriminant",
        tex: `D = (${fmt(found.b, 2)})^2 - 4(${fmt(found.a, 2)})(${fmt(found.c, 2)}) = ${fmt(D, 2)}`,
        tone: D > 0 ? "plain" : D === 0 ? "good" : "warn",
      };
      const count: Readout = {
        label: "Shared points",
        tex: `${found.points.length}`,
        tone: found.points.length ? "plain" : "dim",
      };

      if (f.step === 0) return [line, circle, count];
      if (f.step === 1) return [line, circle, substituted];
      if (f.step === 2) return [substituted, quadratic, discriminant, count];
      const roots = found.points.map((p) => fmt(u === "x" ? p.x : p.y, 2));
      return [
        quadratic,
        discriminant,
        found.points.length
          ? { label: "Quadratic formula", tex: `${u} = \\frac{-b \\pm \\sqrt{D}}{2a} = ${roots.join(",\\ ")}` }
          : { label: "Quadratic formula", tex: "\\sqrt{D}\\ \\text{is not real: no solution}", tone: "warn" },
        {
          label: "Meeting points",
          tex: found.points.length ? found.points.map((p) => texPoint(p, 2)).join(",\\ ") : "\\text{none}",
          tone: found.points.length ? "good" : "dim",
        },
      ];
    },
  };
});
