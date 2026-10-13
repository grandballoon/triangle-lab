// The three angle bisectors of a triangle meet at one point, the incenter,
// which is the centre of the inscribed circle. The lesson starts from the one
// fact everything rests on — a point on an angle bisector is equally far from
// the two sides — and then lets two bisectors force the third.

import { C, tint } from "../draw.ts";
import { clamp, distToLine, dot, fmt, inBox, incenter, lerp, lineLine, mid, project, sub, type Vec } from "../geo.ts";
import { agree, dropPerp, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

const FROM_A = C.gold;
const FROM_B = C.blue;
const FROM_C = C.pink;
const DISTANCE = C.green;

export default lesson((s) => {
  // A and B stay below C, so the triangle never flips or flattens.
  const A = s.point(-5.6, -3.4, { label: "A", constrain: inBox(-7.4, -2, -4.4, -1.6) });
  const B = s.point(5.9, -2.8, { label: "B", constrain: inBox(2, 7.4, -4.4, -1.6) });
  const V = s.point(1.4, 3.7, { label: "C", constrain: inBox(-5.5, 5.5, 1.2, 4.2) });

  /** Where the bisector from `from` meets the opposite side `p`–`q`. */
  const bisectorFoot = (from: Vec, p: Vec, q: Vec): Vec =>
    lineLine(from, incenter(A, B, V), p, q) ?? mid(p, q);

  // P slides on the bisector from A; `along` is how far, as a fraction.
  let along = 0;
  const P = s.point(0, 0, {
    label: "P",
    color: DISTANCE,
    constrain: (p) => {
      const D = bisectorFoot(A, B, V);
      const AD = sub(D, A);
      along = clamp(dot(sub(p, A), AD) / dot(AD, AD), 0.2, 0.95);
      return lerp(A, D, along);
    },
  });
  const slidingPoint = (): Vec => lerp(A, bisectorFoot(A, B, V), along);
  along = 0.42; // where P starts

  return {
    steps: [
      {
        title: "A point on a bisector",
        text: "Slide $P$ along the bisector of angle $A$, and drag the corners. The two green perpendiculars from $P$ to the sides $AB$ and $AC$ always have the same length.",
      },
      {
        title: "Why the distances match",
        text: "The shaded right triangles share the hypotenuse $AP$ and have equal angles at $A$, so they are congruent. Conversely, a point equally far from both sides makes two congruent triangles as well, so it must lie on the bisector.",
      },
      {
        title: "Two bisectors cross",
        text: "Let the bisectors from $A$ and $B$ meet at $I$. Being on the first, $I$ is equally far from $AB$ and $AC$. Being on the second, it is equally far from $AB$ and $BC$.",
      },
      {
        title: "The third has no choice",
        text: "So $I$ is equally far from $AC$ and $BC$, which puts it on the bisector of angle $C$ as well. All three bisectors pass through the single point $I$, the incenter.",
      },
      {
        title: "The inscribed circle",
        text: "Call the common distance $r$. A circle with centre $I$ and radius $r$ reaches each side only at the foot of its perpendicular, the nearest point of that side. It touches all three sides: the incircle.",
      },
    ],

    draw(g, f) {
      const I = incenter(A, B, V);
      const D = bisectorFoot(A, B, V);
      const exploring = f.step <= 1;
      const p = slidingPoint();
      P.x = p.x;
      P.y = p.y;
      P.hidden = !exploring;
      P.enabled = exploring;

      g.polygon([A, B, V], { fill: "rgba(255, 255, 255, 0.05)" });

      g.segment(A, D, { color: FROM_A, width: 2 });
      g.angle(B, A, D, { color: FROM_A, r: 40 });
      g.angle(D, A, V, { color: FROM_A, r: 46 });

      if (exploring) {
        const onAB = project(p, A, B);
        const onAC = project(p, A, V);
        if (f.at(1) > 0) {
          g.polygon([A, p, onAB], { fill: tint(C.blue, 0.22), stroke: null, alpha: f.at(1) });
          g.polygon([A, p, onAC], { fill: tint(C.violet, 0.22), stroke: null, alpha: f.at(1) });
        }
        dropPerp(g, p, A, B, { color: DISTANCE });
        dropPerp(g, p, A, V, { color: DISTANCE });
        g.ticks(p, onAB, 1, { color: DISTANCE });
        g.ticks(p, onAC, 1, { color: DISTANCE });
        return;
      }

      const two = f.at(2);
      g.segment(B, bisectorFoot(B, V, A), { color: FROM_B, width: 2, alpha: two });
      g.angle(V, B, I, { color: FROM_B, r: 40, arcs: 2, alpha: two });
      g.angle(I, B, A, { color: FROM_B, r: 46, arcs: 2, alpha: two });

      if (f.at(3) > 0) {
        const three = f.at(3);
        g.segment(V, bisectorFoot(V, A, B), { color: FROM_C, width: 2, alpha: three });
        g.angle(A, V, I, { color: FROM_C, r: 34, arcs: 3, alpha: three });
        g.angle(I, V, B, { color: FROM_C, r: 40, arcs: 3, alpha: three });
      }
      if (f.at(4) > 0) {
        g.circle(I, distToLine(I, A, B), { color: g.accent, fill: tint(g.accent, 0.12), alpha: f.at(4) });
      }

      const feet = [
        [A, B],
        [B, V],
        [V, A],
      ].map(([p1, p2]) => dropPerp(g, I, p1, p2, { color: DISTANCE, width: 2.5, alpha: two }));
      for (const foot of feet) g.ticks(I, foot, 1, { color: DISTANCE, alpha: two });
      if (f.at(4) > 0) g.along(I, feet[0], "r", { color: DISTANCE, alpha: f.at(4), offset: 14 });
      g.point(I, { label: "I", color: g.accent, alpha: two });
    },

    readout(f) {
      if (f.step <= 1) {
        const p = slidingPoint();
        const toAB = distToLine(p, A, B);
        const toAC = distToLine(p, A, V);
        return [
          { label: "From $P$ to side $AB$", tex: `d(P, AB) = ${fmt(toAB, 2)}` },
          { label: "From $P$ to side $AC$", tex: `d(P, AC) = ${fmt(toAC, 2)}` },
          { label: "On the bisector", tex: "d(P, AB) = d(P, AC)", tone: holds(agree(toAB, toAC)) },
        ];
      }
      const I = incenter(A, B, V);
      const toAB = distToLine(I, A, B);
      const toBC = distToLine(I, B, V);
      const toCA = distToLine(I, V, A);
      const equal = holds(agree(toAB, toBC, toCA));
      const rows = [
        { label: "From $I$ to side $AB$", tex: `d(I, AB) = ${fmt(toAB, 2)}`, tone: equal },
        { label: "From $I$ to side $AC$", tex: `d(I, AC) = ${fmt(toCA, 2)}`, tone: equal },
        { label: "From $I$ to side $BC$", tex: `d(I, BC) = ${fmt(toBC, 2)}`, tone: equal },
      ];
      if (f.step >= 4) rows.push({ label: "Inradius", tex: `r = ${fmt(toAB, 2)}`, tone: equal });
      return rows;
    },
  };
});
