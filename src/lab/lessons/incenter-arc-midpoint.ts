// The bisector of angle A meets the circumcircle again at D. Then D is the
// midpoint of arc BC, and DB = DI = DC, where I is the incentre: an angle
// chase shows triangle DBI has equal angles at B and I.

import { C } from "../draw.ts";
import { angleAt, angleOf, clamp, dist, fmt, incenter, lineCircle, polar, sub, toDeg, toRad, vec, wrapAngle, type Constraint } from "../geo.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0.2);
const RADIUS = 3.7;

const HALF_A = C.gold; // α, half of angle A
const HALF_B = C.blue; // β, half of angle B
const SUM = C.pink; // α + β

/** Hold a point to the arc of the circumcircle within `half` degrees of `middle`. */
function onArc(middle: number, half: number): Constraint {
  return (p) => {
    const off = wrapAngle(angleOf(sub(p, O)) - toRad(middle) + Math.PI) - Math.PI;
    return polar(O, RADIUS, toRad(middle) + clamp(off, -toRad(half), toRad(half)));
  };
}

export default lesson((s) => {
  // Three separate arcs: A above, B lower left, C lower right. The triangle
  // can never flatten, and D always lands on the bottom arc between B and C.
  const A = s.point(-1.6, 3.5, { label: "A", constrain: onArc(90, 65) });
  const B = s.point(-3.2, -1.8, { label: "B", constrain: onArc(215, 30) });
  const P = s.point(3.4, -1.4, { label: "C", constrain: onArc(325, 30) });

  function figure() {
    const I = incenter(A, B, P);
    // Line AI cuts the circle at A and at D; D is the one that is not A.
    const hits = lineCircle(A, I, O, RADIUS);
    const D = hits.reduce((far, h) => (dist(h, A) > dist(far, A) ? h : far), A);
    return { I, D };
  }

  return {
    steps: [
      {
        title: "Where the bisector lands",
        text: "$I$ is the incentre, where the angle bisectors meet. The bisector from $A$ runs through $I$ and hits the circle again at $D$. Drag $A$, $B$, $C$ around the circle and compare $DB$, $DI$ and $DC$.",
      },
      {
        title: "D halves the arc",
        text: "$AD$ splits angle $A$ into two equal angles $\\alpha$. Equal inscribed angles cut off equal arcs, so arc $BD$ equals arc $DC$: $D$ is the midpoint of arc $BC$. Equal arcs have equal chords, so $DB = DC$.",
      },
      {
        title: "The angle at B",
        text: "Angles $DBC$ and $DAC$ are inscribed in the same arc $DC$, so $\\angle DBC = \\alpha$. And $BI$ bisects angle $B$ into two angles $\\beta$. Together, $\\angle DBI = \\alpha + \\beta$.",
      },
      {
        title: "The angle at I",
        text: "$\\angle BID$ is an exterior angle of triangle $ABI$, so it equals the sum of the two remote interior angles: $\\angle BID = \\angle IAB + \\angle ABI = \\alpha + \\beta$.",
      },
      {
        title: "An isosceles triangle",
        text: "Triangle $DBI$ has equal angles at $B$ and $I$, so $DB = DI$. The same chase on the other side gives $DC = DI$. A circle centred at $D$ passes through $B$, $I$ and $C$; its arc is dashed.",
      },
    ],

    draw(g, f) {
      const { I, D } = figure();

      g.circle(O, RADIUS, { color: C.dim, width: 2 });
      g.polygon([A, B, P], { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(4) > 0) {
        // Only the arc inside the circumcircle: counter-clockwise from C, through I, to B.
        const from = angleOf(sub(P, D));
        const sweep = wrapAngle(angleOf(sub(B, D)) - from);
        g.arc(D, dist(D, B), from, from + sweep, { color: g.accent, width: 2, dash: [6, 6], alpha: f.at(4) });
      }
      if (f.at(2) > 0) {
        const a = f.at(2);
        g.segment(B, I, { color: HALF_B, width: 2.5, alpha: a });
        g.angle(A, B, I, { color: HALF_B, fill: true, r: 38, label: "β", alpha: a });
        g.angle(I, B, P, { color: HALF_B, fill: true, r: 38, label: "β", alpha: a });
        g.angle(P, B, D, { color: HALF_A, fill: true, r: 38, label: "α", alpha: a });
      }
      if (f.at(3) > 0) {
        g.angle(B, I, D, { color: SUM, fill: true, r: 28, label: "α+β", alpha: f.at(3) });
      }

      g.segment(A, I, { color: C.ink, width: 2.5 });
      g.segment(D, B, { color: g.accent });
      g.segment(D, P, { color: g.accent });
      g.segment(D, I, { color: g.accent });

      if (f.at(1) > 0) {
        const a = f.at(1);
        g.angle(B, A, D, { color: HALF_A, fill: true, r: 40, label: "α", alpha: a });
        g.angle(D, A, P, { color: HALF_A, fill: true, r: 40, label: "α", alpha: a });
        g.ticks(D, B, 2, { color: g.accent, alpha: a });
        g.ticks(D, P, 2, { color: g.accent, alpha: a });
      }
      if (f.at(4) > 0) g.ticks(D, I, 2, { color: g.accent, alpha: f.at(4) });

      g.point(I, { color: C.green });
      g.label(I, "I", { color: C.green, dx: 13, dy: 4 });
      g.point(D, { color: g.accent });
      g.label(D, "D", { color: g.accent, dy: -18 });
    },

    readout() {
      const { I, D } = figure();
      const alpha = toDeg(angleAt(B, A, P)) / 2;
      const beta = toDeg(angleAt(A, B, P)) / 2;
      return [
        { label: "Half angles", tex: `\\alpha = ${fmt(alpha)}^\\circ,\\quad \\beta = ${fmt(beta)}^\\circ` },
        { label: "Their sum", tex: `\\alpha + \\beta = ${fmt(alpha + beta)}^\\circ` },
        { label: "Measured at B", tex: `\\angle DBI = ${fmt(toDeg(angleAt(D, B, I)))}^\\circ`, tone: "good" },
        { label: "Measured at I", tex: `\\angle BID = ${fmt(toDeg(angleAt(B, I, D)))}^\\circ`, tone: "good" },
        {
          label: "Three equal lengths",
          tex: `DB = ${fmt(dist(D, B), 2)},\\; DI = ${fmt(dist(D, I), 2)},\\; DC = ${fmt(dist(D, P), 2)}`,
          tone: "good",
        },
      ];
    },
  };
});
