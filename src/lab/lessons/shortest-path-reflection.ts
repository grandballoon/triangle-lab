// The shortest path from A to a line and on to B, with A and B on the same
// side. Reflecting B in the line turns every such path into a path from A to
// the mirror image B′ of the same length, and the shortest of those is the
// straight segment — which meets the line at equal angles.

import { C } from "../draw.ts";
import { angleAt, dist, fmt, inBox, lineLine, onSegment, project, reflect, toDeg, vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const LINE_Y = -0.6;
const WEST = vec(-7.6, LINE_Y);
const EAST = vec(7.6, LINE_Y);
// A and B stay strictly above the line, low enough that B′ stays on the stage.
const above = inBox(-7, 7, LINE_Y + 0.6, LINE_Y + 3.8);

const EQUAL_DEG = 0.5;
const INCOMING = C.gold;
const OUTGOING = C.blue;
const BEST = C.green;

export default lesson((s) => {
  const A = s.point(-5, 1.4, { label: "A", constrain: above });
  const B = s.point(4.2, 2.6, { label: "B", constrain: above });
  const P = s.point(1.8, LINE_Y, { label: "P", constrain: onSegment(vec(-7, LINE_Y), vec(7, LINE_Y)) });

  const image = () => reflect(B, WEST, EAST);
  // A and B′ lie on opposite sides of the line, so segment AB′ always crosses it.
  const best = () => lineLine(A, image(), WEST, EAST) ?? project(A, WEST, EAST);
  s.button("Jump to the best point", () => P.set(best()));

  return {
    steps: [
      {
        title: "Touch the line on the way",
        text: "Travel from $A$ to the line, then on to $B$. Drag $P$ along the line and watch $AP + PB$. Where is it smallest, and what happens to the two angles there?",
      },
      {
        title: "Mirror B in the line",
        text: "Reflect $B$ in the line to get $B'$. The line is the perpendicular bisector of $BB'$, so every point on it is equally far from both: $PB = PB'$ wherever $P$ is.",
      },
      {
        title: "Same length, new path",
        text: "So $AP + PB = AP + PB'$: each trip to $B$ is as long as a trip to $B'$. By the triangle inequality $AP + PB' \\ge AB'$, with equality only when $P$ lies on segment $AB'$.",
      },
      {
        title: "The best point",
        text: "$A$ and $B'$ are on opposite sides of the line, so segment $AB'$ crosses it at one point $P^*$. That is the best place to touch, and the shortest trip has length $AB'$.",
      },
      {
        title: "Equal angles",
        text: "At $P^*$ the angle $AP^*$ makes with the line equals its vertical angle below, and reflection copies that angle onto the one $P^*B$ makes. The shortest path arrives and leaves at equal angles, like light off a mirror.",
      },
    ],

    draw(g, f) {
      const Bi = image();
      const best_ = best();
      const foot = project(B, WEST, EAST);
      const in_ = toDeg(angleAt(A, P, WEST));
      const out = toDeg(angleAt(B, P, EAST));
      const equal = Math.abs(in_ - out) < EQUAL_DEG;

      g.segment(WEST, EAST, { color: C.ink, width: 4 });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.segment(B, Bi, { color: C.dim, width: 2, dash: [5, 5], alpha });
        g.angle(B, foot, EAST, { color: C.dim, r: 16, width: 2, alpha });
        g.ticks(B, foot, 2, { color: C.dim, alpha });
        g.ticks(foot, Bi, 2, { color: C.dim, alpha });
        g.segment(P, Bi, { color: OUTGOING, width: 2.5, dash: [8, 6], alpha });
        g.ticks(P, B, 1, { color: OUTGOING, alpha });
        g.ticks(P, Bi, 1, { color: OUTGOING, alpha });
        g.point(Bi, { label: "B′", color: OUTGOING, alpha });
      }
      if (f.at(2) > 0) {
        g.segment(A, Bi, { color: BEST, width: 2.5, dash: [3, 5], alpha: f.at(2) });
      }
      if (f.at(4) > 0) {
        const alpha = f.at(4);
        g.path([A, best_, B], { color: BEST, width: 2.5, alpha });
        g.angle(A, best_, WEST, { color: BEST, fill: true, r: 40, arcs: 2, alpha });
        g.angle(Bi, best_, EAST, { color: BEST, fill: true, r: 40, arcs: 2, alpha });
        g.angle(B, best_, EAST, { color: BEST, fill: true, r: 40, arcs: 2, alpha });
      }
      if (f.at(3) > 0) {
        g.point(best_, { color: BEST, r: 6, alpha: f.at(3) });
        g.label(best_, "P*", { color: BEST, dx: -14, dy: -16, alpha: f.at(3) });
      }

      g.segment(A, P, { color: g.accent });
      g.segment(P, B, { color: g.accent });
      if (f.step < 4) {
        g.angle(A, P, WEST, { color: equal ? BEST : INCOMING, fill: true, r: 30, label: true });
        g.angle(B, P, EAST, { color: equal ? BEST : OUTGOING, fill: true, r: 30, label: true });
      }
    },

    readout() {
      const Bi = image();
      const ap = dist(A, P);
      const pb = dist(P, B);
      const shortest = dist(A, Bi);
      const extra = ap + pb - shortest;
      const in_ = toDeg(angleAt(A, P, WEST));
      const out = toDeg(angleAt(B, P, EAST));
      return [
        { label: "Your path", tex: `AP + PB = ${fmt(ap, 2)} + ${fmt(pb, 2)} = ${fmt(ap + pb, 2)}` },
        { label: "Reflection keeps length", tex: `PB = ${fmt(pb, 2)},\\quad PB' = ${fmt(dist(P, Bi), 2)}`, tone: "good" },
        { label: "Straight to the image", tex: `AB' = ${fmt(shortest, 2)}` },
        {
          label: "Extra distance",
          tex: `AP + PB - AB' = ${fmt(extra, 2)}`,
          tone: extra < 0.005 ? "good" : "plain",
        },
        {
          label: "Angles with the line",
          tex: `${fmt(in_)}^\\circ \\text{ in},\\quad ${fmt(out)}^\\circ \\text{ out}`,
          tone: Math.abs(in_ - out) < EQUAL_DEG ? "good" : "plain",
        },
      ];
    },
  };
});
