// The angles of a triangle sum to 180°. The proof slides two of the angles up
// to the third along a line through C parallel to AB, where the three of them
// visibly fill a straight line.

import { C } from "../draw.ts";
import { add, angleAt, fmt, inBox, normalize, scale, sub, toDeg } from "../geo.ts";
import { lesson } from "../scene.ts";

const ALPHA = C.gold;
const BETA = C.blue;
const GAMMA = C.pink;

export default lesson((s) => {
  // A and B stay below C, so the triangle never flips or flattens.
  const A = s.point(-4.5, -2.6, { label: "A", constrain: inBox(-7.5, 7.5, -4.6, 0) });
  const B = s.point(4, -2.6, { label: "B", constrain: inBox(-7.5, 7.5, -4.6, 0) });
  const P = s.point(1.2, 2.4, { label: "C", constrain: inBox(-6.5, 6.5, 1.2, 4.2) });

  return {
    steps: [
      {
        title: "Three angles, one sum",
        text: "Drag any corner. Each angle changes, but keep an eye on $\\alpha + \\beta + \\gamma$ in the panel.",
      },
      {
        title: "Draw a parallel",
        text: "Through $C$, draw the line parallel to $AB$. Nothing about the triangle has changed — we have only added a line to compare against.",
      },
      {
        title: "Carry the base angles up",
        text: "$AC$ crosses two parallel lines, so the alternate interior angles are equal: $\\alpha$ reappears at $C$. The same argument along $BC$ carries $\\beta$ up.",
      },
      {
        title: "A straight line",
        text: "At $C$ the three angles sit side by side along the parallel and fill it exactly, so $\\alpha + \\gamma + \\beta = 180^\\circ$.",
      },
    ],

    likes: [
      {
        title: "Tearing off the corners",
        text: "Cut any triangle out of paper, tear off its three corners and fit them together point to point. They always line up along a straight edge, however you cut the triangle: the three angles make a straight angle, $180^\\circ$.",
      },
      {
        title: "Turning a pencil round a triangle",
        text: "Lay a pencil along one side of a paper triangle. At each corner, turn it through that corner's angle so it lies along the next side. After all three corners it lies on the first side again but pointing the other way: it has turned a half turn, $180^\\circ$.",
      },
    ],

    uses: [
      {
        title: "The peak of a roof",
        text: "A simple roof truss is a triangle. If the roof rises at $35^\\circ$ at each eave, the angle at the ridge must be $180^\\circ - 2 \\cdot 35^\\circ = 110^\\circ$, which tells the carpenter how to cut the rafters where they meet.",
      },
      {
        title: "Spotting a fire from two towers",
        text: "Two fire lookouts $5$ km apart both sight the same smoke, one at $60^\\circ$ and the other at $70^\\circ$ from the line joining the towers. The angle at the fire must be $180^\\circ - 60^\\circ - 70^\\circ = 50^\\circ$, so the whole triangle is known and the distance to the fire can be worked out.",
      },
    ],

    draw(g, f) {
      const along = normalize(sub(B, A));
      const E = sub(P, scale(along, 3)); // on A's side of C
      const D = add(P, scale(along, 3)); // on B's side of C

      g.polygon([A, B, P], { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(1) > 0) {
        g.line(P, D, { color: g.accent, width: 2, dash: [8, 6], alpha: f.at(1) });
        g.chevrons(E, P, 1, { color: g.accent, alpha: f.at(1) });
        g.chevrons(A, B, 1, { color: g.accent, alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        g.angle(A, P, E, { color: ALPHA, fill: true, label: "α", r: 34, alpha: f.at(2) });
        g.angle(D, P, B, { color: BETA, fill: true, label: "β", r: 34, alpha: f.at(2) });
      }

      g.angle(B, A, P, { color: ALPHA, fill: true, label: f.step === 0 ? true : "α", r: 34 });
      g.angle(P, B, A, { color: BETA, fill: true, label: f.step === 0 ? true : "β", r: 34 });
      g.angle(A, P, B, { color: GAMMA, fill: true, label: f.step === 0 ? true : "γ", r: 34 });
    },

    readout() {
      const alpha = toDeg(angleAt(B, A, P));
      const beta = toDeg(angleAt(A, B, P));
      const gamma = toDeg(angleAt(A, P, B));
      return [
        { label: "Angle at A", tex: `\\alpha = ${fmt(alpha)}^\\circ` },
        { label: "Angle at B", tex: `\\beta = ${fmt(beta)}^\\circ` },
        { label: "Angle at C", tex: `\\gamma = ${fmt(gamma)}^\\circ` },
        {
          label: "Sum",
          tex: `\\alpha + \\beta + \\gamma = ${fmt(alpha + beta + gamma)}^\\circ`,
          tone: "good",
        },
      ];
    },
  };
});
