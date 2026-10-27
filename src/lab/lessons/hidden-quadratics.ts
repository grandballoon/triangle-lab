// Quadratics in disguise. x⁴ + Bx² + C = 0 holds an expression, x², and its
// square, x⁴, and nothing else; calling x² by a new name z leaves the
// quadratic z² + Bz + C = 0. Each positive root z then gives two roots ±√z
// of the original, z = 0 gives x = 0, and a negative z gives none that are
// real.

import { C } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { axes, onStage, plot, realRoots, texQuadratic, type Graph } from "../kit/algebra.ts";
import { texSum } from "../kit/coordinates.ts";
import { lesson, term, type Readout } from "../scene.ts";

const IN_Z = C.violet;
const ROOT = C.gold;
const GRAPH: Graph = { origin: { x: 0, y: 0 }, unit: { x: 1, y: 4 } };

/** The x roots that z = x² gives back for one root z. */
function backToX(z: number): { real: number[]; tex: string } {
  if (Math.abs(z) < 1e-9) return { real: [0], tex: "x = 0" };
  const r = fmt(Math.sqrt(Math.abs(z)), 3);
  return z > 0 ? { real: [-Math.sqrt(z), Math.sqrt(z)], tex: `x = \\pm ${r}` } : { real: [], tex: `x = \\pm ${r}\\,i` };
}

export default lesson((s) => {
  const B = s.slider({ label: "B =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: -8, max: 8, value: 3, step: 1 });
  const Cc = s.slider({ label: "C =", at: { x: -2.4, y: -4.3 }, width: 3.4, min: -8, max: 8, value: -4, step: 1 });

  return {
    steps: [
      {
        title: "Spot the square",
        text: "In $x^4 + Bx^2 + C = 0$, the only powers are $x^2$ and its square $x^4 = (x^2)^2$. Give $x^2$ a new name, $z$, and the equation becomes $z^2 + Bz + C = 0$: a quadratic in $z$.",
      },
      {
        title: "Solve for z",
        text: "The dashed curve is $z^2 + Bz + C$, read against the same axis, now standing for $z$. Its crossings are the solutions for $z$, found by factoring or the formula.",
      },
      {
        title: "Back to x",
        text: "Each solution for $z$ is a value of $x^2$. A positive $z$ gives two roots, $x = \\pm\\sqrt{z}$; the arrows carry it to both. $z = 0$ gives $x = 0$. A negative $z$ gives no real $x$, only $\\pm i\\sqrt{-z}$.",
      },
      {
        title: "Other disguises",
        text: "Look for an expression and its square: $2^{2n} - 6 \\cdot 2^n + 8 = 0$ is a quadratic in $z = 2^n$. Solve for $z$, then undo the substitution, discarding values it cannot take ($2^n$ is never negative). An extra term such as $x$ in $x^4 + x^2 + x$ breaks the trick.",
      },
    ],

    draw(g, f) {
      const [b, c] = [B.value, Cc.value];
      const zs = realRoots(1, b, c);
      axes(g, GRAPH, { xName: "x, and z" });
      if (f.at(1) > 0) {
        plot(g, GRAPH, (z) => z * z + b * z + c, { color: IN_Z, width: 2, dash: [8, 6], alpha: f.at(1) });
        for (const z of zs) {
          const at = onStage(GRAPH, { x: z, y: 0 });
          g.circle(at, g.px(8), { color: IN_Z, width: 2.5, alpha: f.at(1), term: "z" });
          g.label(at, `z = ${fmt(z, 2)}`.replace("-", "−"), { color: IN_Z, size: 13, dy: 26, alpha: f.at(1) });
        }
      }
      plot(g, GRAPH, (x) => x ** 4 + b * x * x + c, { color: g.accent });

      if (f.at(2) > 0) {
        for (const z of zs) {
          for (const x of backToX(z).real) {
            if (Math.abs(x - z) < 0.05) continue;
            // An arc over the axis, from z to the x it gives.
            const lift = 0.35 + 0.08 * Math.abs(x - z);
            const arc: Vec[] = Array.from({ length: 25 }, (_, i) => {
              const t = i / 24;
              const base = onStage(GRAPH, { x: z + (x - z) * t, y: 0 });
              return { x: base.x, y: base.y + lift * Math.sin(Math.PI * t) };
            });
            g.path(arc.slice(0, -1), { color: ROOT, width: 2, alpha: f.at(2) });
            g.arrow(arc[arc.length - 2], arc[arc.length - 1], { color: ROOT, width: 2, alpha: f.at(2) });
          }
        }
      }
      for (const z of zs) {
        for (const x of backToX(z).real) g.point(onStage(GRAPH, { x, y: 0 }), { color: ROOT, r: 7 });
      }
    },

    readout(f) {
      const [b, c] = [B.value, Cc.value];
      const zs = realRoots(1, b, c);
      const rows: Readout[] = [
        { label: "Equation", tex: `${texSum([[1, "x^4"], [b, "x^2"], [c, ""]])} = 0` },
        { label: "Let z = x²", tex: `${texQuadratic(1, b, c, "z")} = 0` },
      ];
      if (f.step === 0) return rows;
      const D = b * b - 4 * c;
      rows.push(
        zs.length
          ? { label: "Solutions for z", tex: `${term("z", "z")} = ${zs.map((z) => fmt(z, 3)).join(",\\ ")}` }
          : {
              label: "Solutions for z",
              tex: `z = ${fmt(-b / 2, 3)} \\pm ${fmt(Math.sqrt(-D) / 2, 3)}\\,i`,
              tone: "dim",
            },
      );
      if (f.step >= 2) {
        for (const z of zs) {
          const back = backToX(z);
          rows.push({
            label: `From z = ${fmt(z, 3)}`,
            tex: back.tex,
            tone: back.real.length ? "good" : "dim",
          });
        }
        const count = zs.flatMap((z) => backToX(z).real).length;
        rows.push({ label: "Real roots in x", tex: String(count) });
      }
      return rows;
    },
  };
});
