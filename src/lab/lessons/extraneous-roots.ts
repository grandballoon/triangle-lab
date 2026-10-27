// Extraneous roots. To solve √(x + p) = x + q, square both sides and solve
// the quadratic that results. But the squared equation is just as true where
// −√(x + p) = x + q: squaring has let in the lower half of the sideways
// parabola y² = x + p, and any root found there does not solve the original.
// Every root must be put back to be checked.

import { C } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { plot, PLANE, realRoots, texQuadratic } from "../kit/algebra.ts";
import { par, plane } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const CURVE = C.cyan;
const LINE = C.orange;
const GOOD = C.gold;
const BAD = C.red;

export default lesson((s) => {
  const p = s.slider({ label: "p =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 0, max: 6, value: 2, step: 1 });
  const q = s.slider({ label: "q =", at: { x: -2.4, y: -4.3 }, width: 3.4, min: -4, max: 4, value: 0, step: 0.5, format: (v) => fmt(v) });

  /** The squared equation's roots, each with whether it solves the original. */
  const candidates = (): { x: number; genuine: boolean }[] => {
    const [P, Q] = [p.value, q.value];
    return realRoots(1, 2 * Q - 1, Q * Q - P).map((x) => ({ x, genuine: x + Q >= -1e-9 }));
  };

  return {
    steps: [
      {
        title: "A root and a line",
        text: "Solve $\\sqrt{x + p} = x + q$. The left side is the curve, the right side the line, and a solution is an $x$ where they meet. Move the sliders and count the meetings.",
      },
      {
        title: "Square both sides",
        text: "To be rid of the root, square: $x + p = (x + q)^2$, which rearranges to the quadratic $x^2 + (2q - 1)x + q^2 - p = 0$. Solve it by factoring or the formula.",
      },
      {
        title: "Squaring lets in the mirror image",
        text: "The squared equation cannot tell $\\sqrt{x + p}$ from $-\\sqrt{x + p}$, so its solutions are where the line meets the whole sideways parabola, lower half included. A root found on the lower half is extraneous: it solves the squared equation but not the original.",
      },
      {
        title: "Always check",
        text: "So put every root back into the original equation and keep only those that work; $\\sqrt{\\ }$ means the positive root. The same care applies when you multiply through by an expression in $x$: a root that makes it zero must be thrown out.",
      },
    ],

    draw(g, f) {
      const [P, Q] = [p.value, q.value];
      plane(g);
      plot(g, PLANE, (x) => Math.sqrt(x + P), { color: CURVE, from: -P });
      if (f.at(2) > 0) plot(g, PLANE, (x) => -Math.sqrt(x + P), { color: CURVE, dash: [8, 6], width: 2, alpha: f.at(2), from: -P });
      g.line({ x: 0, y: Q }, { x: 1, y: 1 + Q }, { color: LINE });
      g.point({ x: -P, y: 0 }, { color: CURVE, r: 5 });

      for (const { x, genuine } of candidates()) {
        const at: Vec = { x, y: x + Q };
        if (genuine) {
          g.point(at, { color: GOOD, r: 8 });
          g.label(at, `x = ${fmt(x, 3)}`.replace("-", "−"), { color: GOOD, size: 14, bold: true, dx: 14, dy: 16, align: "left" });
        } else if (f.at(2) > 0) {
          g.circle(at, g.px(9), { color: BAD, width: 3, alpha: f.at(2) });
          g.segment({ x: at.x - g.px(6), y: at.y - g.px(6) }, { x: at.x + g.px(6), y: at.y + g.px(6) }, { color: BAD, width: 3, alpha: f.at(2) });
          g.label(at, `x = ${fmt(x, 3)}: extraneous`.replace("-", "−"), { color: BAD, size: 14, dx: 16, dy: -16, align: "left", alpha: f.at(2) });
        }
      }
      g.label({ x: -7.7, y: 4.5 }, `√(x + ${P}) = x ${Q < 0 ? "−" : "+"} ${fmt(Math.abs(Q))}`, { color: C.ink, size: 20, bold: true, align: "left" });
    },

    readout(f) {
      const [P, Q] = [p.value, q.value];
      const found = candidates();
      const rows: Readout[] = [
        { label: "Equation", tex: `\\sqrt{x + ${P}} = x ${Q < 0 ? "-" : "+"} ${fmt(Math.abs(Q))}` },
      ];
      if (f.step === 0) {
        rows.push({ label: "Meetings", tex: String(found.filter((r) => r.genuine).length) });
        return rows;
      }
      rows.push({ label: "Squared", tex: `x + ${P} = (x ${Q < 0 ? "-" : "+"} ${fmt(Math.abs(Q))})^2` });
      rows.push({ label: "As a quadratic", tex: `${texQuadratic(1, 2 * Q - 1, Q * Q - P)} = 0` });
      if (found.length === 0) {
        rows.push({ label: "Roots", tex: "\\text{none real}", tone: "dim" });
        return rows;
      }
      if (f.step === 1) {
        rows.push({ label: "Roots", tex: `x = ${found.map((r) => fmt(r.x, 3)).join(",\\ ")}` });
        return rows;
      }
      for (const { x, genuine } of found) {
        // x + p = (x + q)² ≥ 0, up to rounding.
        const left = Math.sqrt(Math.max(0, x + P));
        const right = x + Q;
        rows.push({
          label: genuine ? `x = ${fmt(x, 3)} checks` : `x = ${fmt(x, 3)} is extraneous`,
          tex: `\\sqrt{${par(x, 3)} + ${P}} = ${fmt(left, 3)} ${genuine ? "=" : "\\ne"} ${fmt(right, 3)}`,
          tone: genuine ? "good" : "warn",
        });
      }
      return rows;
    },
  };
});
