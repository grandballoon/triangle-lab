// Beyond quadratics. A polynomial of degree n with roots r₁ … rₙ is
// (x − r₁)…(x − rₙ), one factor for each root, and it is zero exactly there.
// Multiplying out puts the roots' sum, the sums of their products, and their
// product into the coefficients. Lifting the curve off its roots shows that a
// polynomial can cross the axis fewer times than its degree; the missing
// roots are complex, and come in conjugate pairs.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { axes, fromRoots, onStage, plot, signChanges, texPolynomial, type Graph } from "../kit/algebra.ts";
import { lesson, type Handle, type Readout } from "../scene.ts";

const ROOT = C.gold;
const DEGREES = ["2", "3", "4"] as const;
/** The vertical axis is squeezed more for higher degrees, whose values grow faster. */
const SQUEEZE: Record<(typeof DEGREES)[number], number> = { "2": 2, "3": 8, "4": 30 };
/** How far "Lift the curve" raises it, in stage units. */
const LIFT = 1.5;

/** `(x - 3)`, `(x + 2)`, or `x` for a root at 0. */
const factor = (r: number): string => (r === 0 ? "x" : `(x ${r > 0 ? "-" : "+"} ${fmt(Math.abs(r))})`);

export default lesson((s) => {
  const degree = s.choice("Degree", DEGREES, "3");
  const lift = s.toggle("Lift the curve");
  const onAxis = (p: { x: number; y: number }) => ({ x: clamp(Math.round(p.x), -7, 7), y: 0 });
  const handles: Handle[] = [-4, -1, 2, 5].map((x, i) =>
    s.point(x, 0, { label: `r${"₁₂₃₄"[i]}`, color: ROOT, constrain: onAxis }),
  );

  const n = (): number => Number(degree.value);
  const roots = (): number[] => handles.slice(0, n()).map((h) => h.x);
  const graph = (): Graph => ({ origin: { x: 0, y: 0 }, unit: { x: 1, y: SQUEEZE[degree.value] } });
  const shift = (): number => (lift.on ? LIFT * graph().unit.y : 0);
  const value = (x: number): number => roots().reduce((p, r) => p * (x - r), 1) + shift();

  return {
    steps: [
      {
        title: "One factor for each root",
        text: "Drag the roots. The curve is the product $(x - r_1)(x - r_2)\\cdots$, one factor for each root. A product is zero only when a factor is, so the curve meets the axis at the roots and nowhere else.",
      },
      {
        title: "Cubics and quartics",
        text: "Pick a degree: $3$ is a cubic, $4$ a quartic. Between neighbouring roots the curve turns back, and at each root it changes sign, except where two roots coincide: there it touches the axis and turns away, as a perfect square does.",
      },
      {
        title: "The coefficients remember the roots",
        text: "Multiplied out, a cubic is $x^3 - (r_1 + r_2 + r_3)x^2 + (r_1r_2 + r_1r_3 + r_2r_3)x - r_1r_2r_3$. The roots' sum and product sit in the coefficients, as they did for quadratics, with signs alternating.",
      },
      {
        title: "Fewer crossings than the degree",
        text: "Turn on “Lift the curve”. Crossings vanish in pairs as the curve rises off the axis. The polynomial still has as many roots as its degree, but the ones that left the axis are complex, in conjugate pairs. A cubic always keeps at least one real root.",
      },
    ],

    draw(g) {
      handles.forEach((h, i) => {
        h.hidden = i >= n();
        h.enabled = i < n();
      });
      const gr = graph();
      axes(g, gr, { xName: "x" });
      plot(g, gr, value, { color: g.accent });
      // Each root's place stays marked; lifted, the curve may no longer pass it.
      for (const r of roots()) g.label(onStage(gr, { x: r, y: 0 }), fmt(r), { color: ROOT, size: 13, dy: -26 });
    },

    readout(f) {
      const rs = roots();
      const coefficients = fromRoots(rs);
      const rows: Readout[] = [
        { label: "Factored", tex: `${rs.map(factor).join("")}${lift.on ? ` + ${fmt(shift())}` : ""}` },
        { label: "Multiplied out", tex: texPolynomial([...coefficients.slice(0, -1), coefficients[coefficients.length - 1] + shift()]) },
      ];
      if (f.step >= 2) {
        // Read off the polynomial before any lift, whose constant it changes.
        const last = coefficients[coefficients.length - 1];
        const note = lift.on ? " (before lifting)" : "";
        rows.push({
          label: `Sum of the roots${note}`,
          tex: `${rs.map((r) => fmt(r)).join(" + ").replace(/\+ -/g, "- ")} = ${fmt(-coefficients[1])} = -(${fmt(coefficients[1])})`,
        });
        rows.push({
          label: `Product of the roots${note}`,
          tex: `${rs.map((r) => (r < 0 ? `(${fmt(r)})` : fmt(r))).join(" \\cdot ")} = ${fmt((rs.length % 2 === 0 ? 1 : -1) * last)} = ${rs.length % 2 === 0 ? "" : "-"}(${fmt(last)})`,
        });
      }
      if (f.step >= 3) {
        const real = lift.on ? signChanges(value, -40, 40) : rs.length;
        rows.push({
          label: "Real roots",
          tex: `${real} \\text{ of } ${rs.length}${real < rs.length ? `,\\ ${rs.length - real} \\text{ complex}` : ""}`,
          tone: real < rs.length ? "warn" : "good",
        });
      }
      return rows;
    },
  };
});
