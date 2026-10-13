// The two tangent segments from a point outside a circle are equal, and the
// line from the point to the centre bisects the angle between them. Radii to
// the points of contact meet the tangents at right angles, so the two right
// triangles share a hypotenuse and have equal legs: they are congruent.

import { C, tint } from "../draw.ts";
import { angleAt, both, dist, fmt, inBox, inRing, lerp, polar, vec } from "../geo.ts";
import { degTex, farArc, nameOutside } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(2.3, 0);
const R = 3;

const RADIUS = C.gold;
const AUX = C.violet;
const HALF = C.blue;

export default lesson((s) => {
  // The ring keeps P outside the circle; its inner edge lies inside the box.
  const P = s.point(-5.8, 1, { label: "P", constrain: both(inRing(O, R + 0.9, 30), inBox(-7.5, 7.5, -4.6, 4.6)) });

  const measure = () => {
    const arc = farArc(P, O, R);
    const S = polar(O, R, arc.from);
    const T = polar(O, R, arc.from + arc.span);
    return { S, T, d: dist(P, O), ps: dist(P, S), pt: dist(P, T) };
  };

  return {
    steps: [
      {
        title: "Two tangents from one point",
        text: "Drag $P$ around the circle. Two lines from it just touch the circle, at $S$ and $T$. Watch the two tangent lengths, and the two angles they make with the line to the centre.",
      },
      {
        title: "Radii to the points of contact",
        text: "Draw $OS$ and $OT$. A radius meets the tangent at its point of contact at a right angle, so triangles $POS$ and $POT$ are right triangles.",
      },
      {
        title: "Congruent right triangles",
        text: "They share the hypotenuse $PO$, and their legs $OS$ and $OT$ are both radii. Right triangles with equal hypotenuse and leg are congruent, so $PS = PT$ and $\\angle SPO = \\angle TPO$: the line $PO$ bisects the angle.",
      },
      {
        title: "The power of the point agrees",
        text: "Along the line through the centre, $PA \\cdot PB = (d - r)(d + r) = d^2 - r^2$, and the square of either tangent equals that same product. So $PS = PT$ once more.",
      },
    ],

    draw(g, f) {
      const { S, T, d } = measure();

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(2) > 0) {
        g.polygon([P, O, S], { fill: tint(AUX, 0.16), stroke: null, alpha: f.at(2) });
        g.polygon([P, O, T], { fill: tint(HALF, 0.16), stroke: null, alpha: f.at(2) });
      }
      g.segment(P, O, { color: AUX, width: 2, dash: [7, 6] });
      if (f.at(3) > 0) {
        const A = lerp(P, O, (d - R) / d);
        const B = lerp(P, O, (d + R) / d);
        g.segment(P, B, { color: AUX, width: 2.5, alpha: f.at(3) });
        g.point(A, { color: AUX, label: "A", alpha: f.at(3) });
        g.point(B, { color: AUX, label: "B", alpha: f.at(3) });
      }
      if (f.at(1) > 0) {
        for (const touch of [S, T]) {
          g.segment(O, touch, { color: RADIUS, alpha: f.at(1) });
          g.angle(O, touch, P, { color: RADIUS, r: 20, alpha: f.at(1) });
          g.ticks(O, touch, 2, { color: RADIUS, alpha: f.at(1) });
        }
      }

      for (const touch of [S, T]) {
        g.ray(P, touch, { color: C.dim, width: 1.5 });
        g.segment(P, touch, { color: g.accent, width: 4 });
        g.ticks(P, touch, 1, { color: g.accent });
        g.point(touch, { color: g.accent });
      }
      g.angle(S, P, O, { color: HALF, fill: true, r: 50, label: true });
      g.angle(O, P, T, { color: HALF, fill: true, r: 50, label: true });

      g.point(O, { color: C.ink, label: "O" });
      nameOutside(g, O, S, "S", { push: 18 });
      nameOutside(g, O, T, "T", { push: 18 });
    },

    readout(f) {
      const { S, T, d, ps, pt } = measure();
      const rows: Readout[] = [
        { label: "Tangent lengths", tex: `PS = ${fmt(ps, 2)},\\quad PT = ${fmt(pt, 2)}`, tone: "good" },
        {
          label: "Angles with the line to the centre",
          tex: `\\angle SPO = ${degTex(angleAt(S, P, O))},\\quad \\angle TPO = ${degTex(angleAt(T, P, O))}`,
          tone: "good",
        },
        { label: "Distance to the centre, radius", tex: `d = ${fmt(d, 2)},\\quad r = ${fmt(R, 2)}` },
      ];
      if (f.step >= 3) {
        rows.push(
          {
            label: "Through the centre",
            tex: `(d - r)(d + r) = (${fmt(d - R, 2)})(${fmt(d + R, 2)}) = ${fmt((d - R) * (d + R), 2)}`,
          },
          { label: "Tangent, squared", tex: `PS^2 = (${fmt(ps, 2)})^2 = ${fmt(ps * ps, 2)}`, tone: "good" },
        );
      }
      return rows;
    },
  };
});
