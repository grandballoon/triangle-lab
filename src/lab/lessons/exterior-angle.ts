// The exterior angle theorem. Side AC of a triangle runs on past C; the angle
// it makes there with CB equals the sum of the two interior angles at A and B.
// The proof sets the angle sum of the triangle against the straight line at C.
// A last step extends every side and shows the three exterior angles making
// one full turn.

import { C } from "../draw.ts";
import { add, angleAt, fmt, inBox, normalize, scale, sub, toDeg, type Vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const ALPHA = C.gold;
const BETA = C.blue;
const GAMMA = C.pink;
const DELTA = C.green;
const EXTEND = 2.4; // how far AC runs past C
const EXTEND_ALL = 1.6; // how far each side runs on in the last step

/** The point `far` beyond `to` on the ray from `from` through `to`. */
const beyond = (from: Vec, to: Vec, far: number): Vec => add(to, scale(normalize(sub(to, from)), far));

export default lesson((s) => {
  // A is left of C and both stay below B, so the triangle never flips or flattens.
  const A = s.point(-5, -2.2, { label: "A", constrain: inBox(-6.2, -2, -3, -0.8) });
  const P = s.point(2, -2.2, { label: "C", constrain: inBox(0.5, 4, -3, -0.8) });
  const B = s.point(-1.5, 2.6, { label: "B", constrain: inBox(-5, 5, 1, 3.2) });

  const angles = () => ({
    alpha: toDeg(angleAt(P, A, B)),
    beta: toDeg(angleAt(A, B, P)),
    gamma: toDeg(angleAt(A, P, B)),
    delta: toDeg(angleAt(beyond(A, P, EXTEND), P, B)),
  });

  return {
    steps: [
      {
        title: "An angle on the outside",
        text: "Drag the corners. Side $AC$ runs on past $C$, making the exterior angle $\\delta$. Compare it with $\\alpha + \\beta$, the two interior angles far from it.",
      },
      {
        title: "Start from the angle sum",
        text: "The three interior angles of any triangle make $\\alpha + \\beta + \\gamma = 180^\\circ$.",
      },
      {
        title: "A straight line at C",
        text: "$\\gamma$ and $\\delta$ lie side by side along the line $AD$, so $\\gamma + \\delta = 180^\\circ$ as well.",
      },
      {
        title: "Cancel the shared angle",
        text: "Both sums are $180^\\circ$, so $\\alpha + \\beta + \\gamma = \\gamma + \\delta$. Remove $\\gamma$: $\\delta = \\alpha + \\beta$. The dashed parallel to $AB$ shows the two pieces sitting inside $\\delta$.",
      },
      {
        title: "All the way round",
        text: "Extend every side in turn. The exterior angles are $180^\\circ - \\alpha$, $180^\\circ - \\beta$ and $180^\\circ - \\gamma$, which total $540^\\circ - 180^\\circ = 360^\\circ$: one full turn.",
      },
    ],

    draw(g, f) {
      const D = beyond(A, P, EXTEND);
      const exploring = f.step === 0;
      const name = (letter: string): string | boolean => (exploring ? true : letter);

      g.polygon([A, P, B], { fill: "rgba(255, 255, 255, 0.05)" });
      g.segment(P, D, { color: C.dim });
      if (f.at(2) > 0) g.segment(A, D, { color: g.accent, width: 5, alpha: f.at(2) * (1 - f.at(4)) });

      if (f.at(3) > 0) {
        // The ray from C parallel to AB cuts δ into a copy of α and a copy of β.
        const alpha = f.at(3) * (1 - f.at(4));
        const N = add(P, scale(normalize(sub(B, A)), EXTEND));
        g.segment(P, N, { color: C.dim, width: 2, dash: [8, 6], alpha });
        g.chevrons(A, B, 1, { color: C.dim, alpha });
        g.chevrons(P, N, 1, { color: C.dim, alpha });
        g.angle(D, P, N, { color: ALPHA, fill: true, r: 66, label: "α", alpha });
        g.angle(N, P, B, { color: BETA, fill: true, r: 66, label: "β", alpha });
      }

      if (f.at(4) > 0) {
        const alpha = f.at(4);
        const E = beyond(P, B, EXTEND_ALL);
        const F = beyond(B, A, EXTEND_ALL);
        g.segment(B, E, { color: C.dim, alpha });
        g.segment(A, F, { color: C.dim, alpha });
        g.angle(E, B, A, { color: DELTA, fill: true, r: 46, label: true, alpha });
        g.angle(F, A, P, { color: DELTA, fill: true, r: 46, label: true, alpha });
      }

      g.angle(P, A, B, { color: ALPHA, fill: true, r: 34, label: name("α"), alpha: 1 - 0.6 * f.at(4) });
      g.angle(A, B, P, { color: BETA, fill: true, r: 34, label: name("β"), alpha: 1 - 0.6 * f.at(4) });
      g.angle(A, P, B, { color: GAMMA, fill: true, r: 34, label: name("γ"), alpha: 1 - 0.6 * f.at(4) });
      g.angle(D, P, B, { color: DELTA, fill: true, r: 46, label: f.step === 4 ? true : name("δ") });
      g.point(D, { label: "D", color: C.dim });
    },

    readout(f) {
      const { alpha, beta, gamma, delta } = angles();

      if (f.step === 4) {
        const atA = toDeg(angleAt(beyond(B, A, EXTEND_ALL), A, P));
        const atB = toDeg(angleAt(beyond(P, B, EXTEND_ALL), B, A));
        return [
          { label: "Exterior angle at A", tex: `180^\\circ - \\alpha = ${fmt(atA)}^\\circ` },
          { label: "Exterior angle at B", tex: `180^\\circ - \\beta = ${fmt(atB)}^\\circ` },
          { label: "Exterior angle at C", tex: `180^\\circ - \\gamma = ${fmt(delta)}^\\circ` },
          {
            label: "Sum of the exterior angles",
            tex: `${fmt(atA)}^\\circ + ${fmt(atB)}^\\circ + ${fmt(delta)}^\\circ = ${fmt(atA + atB + delta)}^\\circ`,
            tone: "good",
          },
        ];
      }

      return [
        { label: "Remote interior angles", tex: `\\alpha + \\beta = ${fmt(alpha)}^\\circ + ${fmt(beta)}^\\circ = ${fmt(alpha + beta)}^\\circ` },
        { label: "Exterior angle", tex: `\\delta = ${fmt(delta)}^\\circ`, tone: "good" },
        { label: "Angle sum of the triangle", tex: `\\alpha + \\beta + \\gamma = ${fmt(alpha + beta + gamma)}^\\circ` },
        { label: "Straight line at C", tex: `\\gamma + \\delta = ${fmt(gamma)}^\\circ + ${fmt(delta)}^\\circ = ${fmt(gamma + delta)}^\\circ` },
      ];
    },
  };
});
