// The angles of a triangle sum to 180°. One picture holds the proof from the
// start: the line through C parallel to AB, with the two base angles copied up
// beside the third, where the three of them visibly fill a straight line. Two
// hands framing a triangle squish it; without them, the corners are dragged.

import { C } from "../draw.ts";
import { add, angleAt, fmt, inBox, normalize, scale, sub, toDeg, type Constraint } from "../geo.ts";
import { lesson } from "../scene.ts";
import { triangleOf } from "../kit/two-hands.ts";

const ALPHA = C.gold;
const BETA = C.blue;
const GAMMA = C.pink;

export default lesson((s) => {
  // Dragged, A and B stay below C, so the triangle never flips or flattens.
  // Held between two hands, it goes wherever the hands put it on the stage.
  let held = false;
  const stage = inBox(-7.5, 7.5, -4.6, 4.6);
  const within =
    (drag: Constraint): Constraint =>
    (p) =>
      held ? stage(p) : drag(p);
  const A = s.point(-4.5, -2.6, { label: "A", constrain: within(inBox(-7.5, 7.5, -4.6, 0)) });
  const B = s.point(4, -2.6, { label: "B", constrain: within(inBox(-7.5, 7.5, -4.6, 0)) });
  const P = s.point(1.2, 2.4, { label: "C", constrain: within(inBox(-6.5, 6.5, 1.2, 4.2)) });

  return {
    steps: [
      {
        title: "Three angles, one sum",
        text: "Hold both hands up to the camera in a triangle, index fingertips touching above and thumbs below, and squish it: tall, flat, leaning. No camera? Drag the corners instead. Each angle changes, but keep an eye on $\\alpha + \\beta + \\gamma$ in the panel.",
      },
      {
        title: "A parallel through the top",
        text: "The dashed line through $C$ runs parallel to $AB$. It changes nothing about the triangle; it is only a line to compare against.",
      },
      {
        title: "The base angles, copied up",
        text: "$AC$ crosses the two parallel lines, so the alternate interior angles are equal: $\\alpha$ appears again at $C$. The same argument along $BC$ copies $\\beta$ up.",
      },
      {
        title: "A straight line",
        text: "At $C$ the three angles sit side by side along the parallel and fill it exactly, so $\\alpha + \\gamma + \\beta = 180^\\circ$, however the triangle is squished.",
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
      const framed = triangleOf(f.hands);
      held = framed !== null;
      if (framed) {
        A.set(framed.A);
        B.set(framed.B);
        P.set(framed.C);
      }
      const along = normalize(sub(B, A));
      const E = sub(P, scale(along, 3)); // on A's side of C
      const D = add(P, scale(along, 3)); // on B's side of C

      g.polygon([A, B, P], { fill: "rgba(255, 255, 255, 0.05)" });

      g.line(E, D, { color: g.accent, width: 2, dash: [8, 6] });
      g.chevrons(E, P, 1, { color: g.accent });
      g.chevrons(A, B, 1, { color: g.accent });
      g.angle(A, P, E, { color: ALPHA, fill: true, label: "α", r: 34 });
      g.angle(D, P, B, { color: BETA, fill: true, label: "β", r: 34 });

      g.angle(B, A, P, { color: ALPHA, fill: true, label: "α", r: 34 });
      g.angle(P, B, A, { color: BETA, fill: true, label: "β", r: 34 });
      g.angle(A, P, B, { color: GAMMA, fill: true, label: "γ", r: 34 });
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
