// Two secants from a point outside a circle make an angle equal to half the
// difference of the far and near arcs they cut off. One chord, from the far
// end of one secant to the near end of the other, makes a triangle in which an
// inscribed angle on the far arc is exterior and one on the near arc is
// interior. B and D can be slid to the ends of their arc, where a secant
// becomes a tangent and the same rule still holds.

import { C, tint } from "../draw.ts";
import { add, angleAt, both, dist, inBox, inRing, polar, sub, toRad, vec, wrapAngle, type Vec } from "../geo.ts";
import { arcTex, bearing, degTex, farArc, farPair, nameOutside, nearPoint } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(2.2, 0.2);
const R = 3.3;
const GAP = 0.3;
// Closer than this, a secant's two crossings are drawn as one tangent point.
const MERGED = 0.06;

const FAR = C.blue;
const NEAR = C.gold;
const AUX = C.violet;

export default lesson((s) => {
  // The ring keeps P outside the circle; its inner edge lies inside the box.
  const P = s.point(-6.5, -1, { label: "P", constrain: both(inRing(O, R + 1, 30), inBox(-7.5, 7.5, -4.6, 4.6)) });
  const far = farPair(s, P, O, R, [toRad(-60), toRad(40)], GAP);
  const [B, D] = far.points;

  const measure = () => {
    far.settle();
    const A = nearPoint(P, B, O, R);
    const ptC = nearPoint(P, D, O, R);
    const b = bearing(O, B);
    const c = bearing(O, ptC);
    return {
      A,
      ptC,
      // A point on the second secant beyond C: toward D, and still well defined when C and D merge.
      beyondC: add(ptC, sub(D, P)),
      b,
      c,
      // Seen from P, the far arc runs counter-clockwise from B to D and the near one from C to A.
      farArc: wrapAngle(bearing(O, D) - b),
      nearArc: wrapAngle(bearing(O, A) - c),
    };
  };

  return {
    steps: [
      {
        title: "An angle from outside",
        text: "Drag $P$, $B$ and $D$. The two lines from $P$ cut off a far arc $BD$ and a near arc $AC$. Compare the angle at $P$ with those two arcs.",
      },
      {
        title: "Join B to C",
        text: "One chord, from the far end of one secant to the near end of the other, makes triangle $PBC$, with the angle we want at $P$.",
      },
      {
        title: "Two inscribed angles",
        text: "$\\angle BCD$ stands on the far arc $BD$, so it is half of it. $\\angle PBC$ stands on the near arc $AC$, so it is half of that.",
      },
      {
        title: "An exterior angle",
        text: "$\\angle BCD$ is an exterior angle of triangle $PBC$, so $\\angle BCD = \\angle P + \\angle PBC$. Subtract: $\\angle P$ is half the far arc minus half the near arc.",
      },
      {
        title: "Tangents at the limit",
        text: "Slide $B$ to the end of its range: $A$ and $B$ merge and the secant becomes a tangent, and the rule still holds. Do the same with $D$ for two tangents. The proof then needs the tangent–chord angle, coming next.",
      },
    ],

    draw(g, f) {
      const m = measure();
      const { A, ptC } = m;

      g.circle(O, R, { color: C.dim, width: 2 });
      g.arc(O, R, m.b, m.b + m.farArc, { color: FAR, width: 6 });
      g.arc(O, R, m.c, m.c + m.nearArc, { color: NEAR, width: 6 });

      if (f.at(4) > 0) {
        const arc = farArc(P, O, R);
        for (const end of [arc.from, arc.from + arc.span]) {
          g.ray(P, polar(O, R, end), { color: C.dim, width: 1.5, dash: [4, 6], alpha: f.at(4) });
        }
      }
      if (f.at(1) > 0) {
        g.polygon([P, B, ptC], { fill: tint(AUX, 0.14), stroke: null, alpha: f.at(1) });
        g.segment(B, ptC, { color: AUX, width: 2.5, dash: [7, 6], alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        g.angle(B, ptC, m.beyondC, { color: FAR, fill: true, r: 40, label: true, alpha: f.at(2) });
        g.angle(P, B, ptC, { color: NEAR, fill: true, r: 46, label: true, alpha: f.at(2) });
      }

      for (const end of [B, D]) {
        g.ray(P, end, { color: C.dim, width: 1.5 });
        g.segment(P, end);
      }
      g.angle(B, P, D, { color: g.accent, fill: true, r: 46, label: true });

      const name = (near: Vec, farEnd: Vec, nearName: string, farName: string): void => {
        if (dist(near, farEnd) < MERGED) {
          nameOutside(g, O, farEnd, `${nearName} = ${farName}`, { push: 34 });
          return;
        }
        g.point(near, { color: C.ink });
        nameOutside(g, O, near, nearName, { push: 18 });
        nameOutside(g, O, farEnd, farName);
      };
      name(A, B, "A", "B");
      name(ptC, D, "C", "D");
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        { label: "Far arc", tex: `${arcTex("BD")} = ${degTex(m.farArc)}` },
        { label: "Near arc", tex: `${arcTex("AC")} = ${degTex(m.nearArc)}` },
      ];
      if (f.step >= 2) {
        rows.push(
          { label: "Inscribed on the far arc", tex: `\\angle BCD = ${degTex(angleAt(B, m.ptC, m.beyondC))}` },
          { label: "Inscribed on the near arc", tex: `\\angle PBC = ${degTex(angleAt(P, B, m.ptC))}` },
        );
      }
      rows.push(
        { label: "Angle between the secants", tex: `\\angle P = ${degTex(angleAt(B, P, D))}` },
        {
          label: "Half the difference of the arcs",
          tex: `\\tfrac12(${degTex(m.farArc)} - ${degTex(m.nearArc)}) = ${degTex((m.farArc - m.nearArc) / 2)}`,
          tone: "good",
        },
      );
      return rows;
    },
  };
});
