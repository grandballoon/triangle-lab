// The quadratic formula, read off the graph. Every parabola y = ax² + bx + c
// is symmetric about the line x = −b/2a, so its roots sit the same distance
// either side of it. Completing the square finds that distance, √D / 2|a|
// with D = b² − 4ac, and the sign of D says whether there are two roots, one,
// or a pair of complex conjugates with no crossing at all.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes, EPS, onStage, plot, realRoots, texQuadratic, type Graph } from "../kit/algebra.ts";
import { par } from "../kit/coordinates.ts";
import { lesson, term, type Readout } from "../scene.ts";

const AXIS = C.violet;
const ROOT = C.gold;
const REACH = C.cyan;
const GRAPH: Graph = { origin: { x: 0, y: 0 }, unit: { x: 1, y: 2 } };

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: -3, max: 3, value: 1, step: 0.5, format: (v) => fmt(v) });
  const b = s.slider({ label: "b =", at: { x: -2.4, y: -4.3 }, width: 3.4, min: -8, max: 8, value: -2, step: 0.5, format: (v) => fmt(v) });
  const c = s.slider({ label: "c =", at: { x: 2.8, y: -4.3 }, width: 3.4, min: -8, max: 8, value: -2, step: 0.5, format: (v) => fmt(v) });
  s.button("Root 3 + √2", () => {
    // Its partner must be 3 − √2: x² − 6x + 7.
    [a.value, b.value, c.value] = [1, -6, 7];
  });

  const discriminant = (): number => {
    const raw = b.value * b.value - 4 * a.value * c.value;
    return Math.abs(raw) < EPS ? 0 : raw;
  };

  return {
    steps: [
      {
        title: "A mirror down the middle",
        text: "Move the sliders. Every parabola $y = ax^2 + bx + c$ is symmetric about the upright line $x = -\\frac{b}{2a}$, through its lowest or highest point. So where it does cross the axis, the two roots sit the same distance either side of that line.",
      },
      {
        title: "Completing the square",
        text: "Divide by $a$ and move $c$ over: $x^2 + \\frac{b}{a}x = -\\frac{c}{a}$. Add the missing corner $\\left(\\frac{b}{2a}\\right)^2$ to both sides, and the left becomes a square: $\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2}$.",
      },
      {
        title: "The formula",
        text: "Take the square root of both sides, both signs: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. Read it as the mirror line $-\\frac{b}{2a}$, plus or minus a reach of $\\frac{\\sqrt{b^2 - 4ac}}{2a}$ to either side.",
      },
      {
        title: "The discriminant counts",
        text: "Everything hangs on $D = b^2 - 4ac$ under the root. $D > 0$: two real roots. $D = 0$: the reach is zero, and the parabola touches the axis at a double root. $D < 0$: no real square root, and no crossing.",
      },
      {
        title: "Roots come in pairs",
        text: "With $D < 0$ the roots are $-\\frac{b}{2a} \\pm i\\frac{\\sqrt{-D}}{2a}$, complex conjugates. With whole-number coefficients, an irrational root has a partner too: press “Root 3 + √2” to see $3 - \\sqrt2$ appear beside it.",
      },
      {
        title: "Sum and product",
        text: "Adding the two roots cancels the $\\pm$ parts: $r + s = -\\frac{b}{a}$. Multiplying them gives $rs = \\frac{c}{a}$. These hold for complex roots as well, and give the coefficients straight from the roots.",
      },
    ],

    draw(g, f) {
      const [A, B, Cc] = [a.value, b.value, c.value];
      axes(g, GRAPH, { xName: "x" });
      plot(g, GRAPH, (x) => A * x * x + B * x + Cc, { color: g.accent });
      if (A === 0) {
        g.label({ x: -7.7, y: 4.5 }, "a = 0: a line, not a quadratic", { color: C.red, size: 17, bold: true, align: "left" });
        return;
      }

      const mid = -B / (2 * A);
      const vertex = onStage(GRAPH, { x: mid, y: A * mid * mid + B * mid + Cc });
      const foot = onStage(GRAPH, { x: mid, y: 0 });
      g.line(foot, { x: foot.x, y: foot.y + 1 }, { color: AXIS, width: 2, dash: [8, 6], term: "mirror" });
      g.point(vertex, { color: AXIS, r: 5 });
      g.label(foot, `x = ${fmt(mid, 2)}`.replace("-", "−"), { color: AXIS, size: 13, dx: 8, dy: vertex.y > foot.y ? -16 : 16, align: "left" });

      const roots = realRoots(A, B, Cc);
      for (const r of roots) g.point(onStage(GRAPH, { x: r, y: 0 }), { color: ROOT, r: 7 });
      if (f.at(2) > 0 && roots.length === 2) {
        for (const r of roots) {
          g.arrow(foot, onStage(GRAPH, { x: r, y: 0 }), { color: REACH, width: 3, alpha: f.at(2), term: "reach" });
        }
        g.label(onStage(GRAPH, { x: roots[1], y: 0 }), fmt(roots[1], 3).replace("-", "−"), { color: ROOT, size: 13, dy: vertex.y > foot.y ? 18 : -18 });
        g.label(onStage(GRAPH, { x: roots[0], y: 0 }), fmt(roots[0], 3).replace("-", "−"), { color: ROOT, size: 13, dy: vertex.y > foot.y ? 18 : -18 });
      }
      if (f.step >= 3) {
        const D = discriminant();
        const text = D > 0 ? "D > 0: two real roots" : D === 0 ? "D = 0: one double root" : "D < 0: no real roots";
        g.label({ x: -7.7, y: 4.5 }, text, { color: D < 0 ? C.dim : ROOT, size: 18, bold: true, align: "left" });
      }
    },

    readout(f) {
      const [A, B, Cc] = [a.value, b.value, c.value];
      const equation: Readout = { label: "Equation", tex: `${texQuadratic(A, B, Cc)} = 0` };
      if (A === 0) return [equation, { label: "Not a quadratic", tex: "a = 0", tone: "warn" }];
      const D = discriminant();
      const mid = -B / (2 * A);
      const mirror: Readout = { label: "Mirror line", tex: `${term("mirror", "x = -\\frac{b}{2a}")} = ${fmt(mid, 3)}` };
      if (f.step === 0) return [equation, mirror];
      if (f.step === 1) {
        return [
          equation,
          { label: "Divide by a", tex: `x^2 + ${par(B / A, 3)}x = ${fmt(-Cc / A, 3)}` },
          {
            label: "Add the corner",
            tex: `\\left(x + ${par(B / (2 * A), 3)}\\right)^2 = ${fmt(-Cc / A, 3)} + ${fmt((B / (2 * A)) ** 2, 4)} = ${fmt(D / (4 * A * A), 4)}`,
          },
        ];
      }
      const discriminantRow: Readout = {
        label: "Discriminant",
        tex: `D = ${par(B)}^2 - 4(${fmt(A)})(${fmt(Cc)}) = ${fmt(D, 3)}`,
        tone: D > 0 ? "plain" : D === 0 ? "good" : "warn",
      };
      const reach = Math.sqrt(Math.abs(D)) / (2 * Math.abs(A));
      const rows: Readout[] = [equation, mirror, discriminantRow];
      if (D >= 0) {
        rows.push({
          label: D === 0 ? "One double root" : "Roots",
          // A double root has no reach to point at.
          tex: `x = ${fmt(mid, 3)} \\pm ${D > 0 ? term("reach", "\\frac{\\sqrt{D}}{2|a|}") : "\\frac{\\sqrt{D}}{2|a|}"} = ${fmt(mid, 3)} \\pm ${fmt(reach, 3)}`,
          tone: "good",
        });
      } else {
        rows.push({
          label: "Complex conjugate roots",
          tex: `x = ${fmt(mid, 3)} \\pm ${fmt(reach, 3)}\\,i`,
          tone: f.step >= 4 ? "good" : "dim",
        });
      }
      if (f.step >= 5) {
        rows.push({
          label: "Sum and product",
          tex: `r + s = -\\tfrac{b}{a} = ${fmt(-B / A, 3)},\\quad rs = \\tfrac{c}{a} = ${fmt(Cc / A, 3)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
