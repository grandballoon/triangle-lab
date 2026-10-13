// Angle pairs at a crossing. Two lines through O make four angles: neighbours
// are supplementary, and the proof that vertical angles are equal is that both
// are supplements of the same neighbour. A toggle shows the complement of α
// while α is acute.

import { C } from "../draw.ts";
import { add, angleAt, angleOf, cross, fmt, onCircle, perp, scale, sub, toDeg, vec } from "../geo.ts";
import { onCircleClearOf } from "../kit/circles.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0);
const REACH = 3.6;
const MIN_ANGLE = 0.3; // radians kept between the two lines
const PAIR_ONE = C.gold; // α and θ
const PAIR_TWO = C.blue; // β and φ
const LINE_P = C.green;
const LINE_Q = C.violet;
const COMPLEMENT = C.pink;

export default lesson((s) => {
  const P = s.point(3.5, -0.8, { label: "P", color: LINE_P, constrain: onCircle(O, REACH) });
  const Q = s.point(1.2, 3.4, {
    label: "Q",
    color: LINE_Q,
    constrain: onCircleClearOf(
      O,
      () => REACH,
      () => [angleOf(sub(P, O)), angleOf(sub(O, P))],
      MIN_ANGLE,
    ),
  });
  const complement = s.toggle("Show complement", false);

  const figure = () => {
    Q.set(Q); // P may have swung onto Q's line
    const P2 = sub(O, sub(P, O));
    const Q2 = sub(O, sub(Q, O));
    return {
      P2,
      Q2,
      alpha: toDeg(angleAt(P, O, Q)),
      beta: toDeg(angleAt(Q, O, P2)),
      theta: toDeg(angleAt(P2, O, Q2)),
      phi: toDeg(angleAt(Q2, O, P)),
    };
  };

  return {
    steps: [
      {
        title: "Two lines, four angles",
        text: "Drag $P$ or $Q$ to turn the lines, and compare the angles that face each other across $O$. Turn on the complement to see what $\\alpha$ lacks from a right angle.",
      },
      {
        title: "Neighbours on a straight line",
        text: "$\\alpha$ and $\\beta$ sit side by side along line $PP'$ and fill one side of it, so they are supplementary: $\\alpha + \\beta = 180^\\circ$.",
      },
      {
        title: "The same neighbour again",
        text: "$\\theta$ and $\\beta$ fill one side of the other line, $QQ'$, so $\\theta + \\beta = 180^\\circ$ too.",
      },
      {
        title: "Vertical angles are equal",
        text: "$\\alpha$ and $\\theta$ are each what is left of $180^\\circ$ once $\\beta$ is removed, so $\\alpha = \\theta$. The same argument with $\\alpha$ as the shared neighbour gives $\\beta = \\varphi$.",
      },
    ],

    draw(g, f) {
      const { P2, Q2, alpha } = figure();
      const exploring = f.step === 0;
      const name = (letter: string): string | boolean => (exploring ? true : letter);

      g.line(P, P2, { color: C.ink });
      g.line(Q, Q2, { color: C.ink });
      if (f.at(1) > 0) g.segment(P, P2, { color: LINE_P, width: 5, alpha: f.at(1) });
      if (f.at(2) > 0) g.segment(Q, Q2, { color: LINE_Q, width: 5, alpha: f.at(2) });

      g.angle(P, O, Q, { color: PAIR_ONE, fill: true, r: 40, label: name("α") });
      g.angle(Q, O, P2, { color: PAIR_TWO, fill: true, r: 40, label: name("β") });
      g.angle(P2, O, Q2, { color: PAIR_ONE, fill: true, r: 40, label: name("θ"), alpha: exploring ? 1 : f.at(2) });
      g.angle(Q2, O, P, { color: PAIR_TWO, fill: true, r: 40, label: name("φ"), alpha: exploring ? 1 : f.at(3) });

      if (complement.on && alpha < 90) {
        // The perpendicular to OP on Q's side: α and its complement fill the right angle.
        const side = cross(sub(P, O), sub(Q, O)) < 0 ? -1 : 1;
        const N = add(O, scale(perp(sub(P, O)), side));
        g.ray(O, N, { color: C.dim, width: 2, dash: [6, 6] });
        g.angle(P, O, N, { color: C.dim, r: 18, width: 2 });
        g.angle(Q, O, N, { color: COMPLEMENT, fill: true, r: 74, label: `${fmt(90 - alpha)}°` });
      }

      g.point(P2, { label: "P′", color: LINE_P });
      g.point(Q2, { label: "Q′", color: LINE_Q });
      g.point(O, { label: "O" });
    },

    readout() {
      const { alpha, beta, theta, phi } = figure();
      return [
        { label: "Along line PP′", tex: `\\alpha + \\beta = ${fmt(alpha)}^\\circ + ${fmt(beta)}^\\circ = ${fmt(alpha + beta)}^\\circ` },
        { label: "Along line QQ′", tex: `\\theta + \\beta = ${fmt(theta)}^\\circ + ${fmt(beta)}^\\circ = ${fmt(theta + beta)}^\\circ` },
        { label: "Vertical angles", tex: `\\alpha = ${fmt(alpha)}^\\circ,\\quad \\theta = ${fmt(theta)}^\\circ`, tone: "good" },
        { label: "The other vertical pair", tex: `\\beta = ${fmt(beta)}^\\circ,\\quad \\varphi = ${fmt(phi)}^\\circ`, tone: "good" },
        {
          label: "Complement of α",
          tex: alpha < 90 ? `90^\\circ - ${fmt(alpha)}^\\circ = ${fmt(90 - alpha)}^\\circ` : "\\text{none (not acute)}",
          tone: alpha < 90 ? "plain" : "dim",
        },
        { label: "Supplement of α", tex: `180^\\circ - ${fmt(alpha)}^\\circ = ${fmt(180 - alpha)}^\\circ = \\beta` },
      ];
    },
  };
});
