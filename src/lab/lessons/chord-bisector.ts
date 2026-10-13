// A line from the centre of a circle is perpendicular to a chord exactly when
// it bisects the chord: either fact makes the two triangles it forms with the
// radii congruent. The same idea, with SSS, shows that equal chords cut off
// equal arcs.

import { C, tint } from "../draw.ts";
import {
  angleAt, angleOf, clamp, dist, fmt, mid, onCircle, polar, sub, toDeg, toRad, wrapAngle,
  type Constraint, type Vec,
} from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

const O: Vec = { x: 0, y: 0.2 };
const R = 3.8;
// The chord's central angle is kept in this range, so it never shrinks to a
// point or becomes a diameter (where the midpoint would land on O).
const MIN_ARC = toRad(35);
const MAX_ARC = toRad(150);

const RADII = C.blue;
const HALVES = C.gold;
const SECOND = C.pink;

/** On the circle, with the central angle to `other` kept in range. */
const apartFrom = (other: () => Vec): Constraint => (p) => {
  const base = angleOf(sub(other(), O));
  // Signed turn from `other` to `p`, in (−π, π].
  const turn = Math.PI - wrapAngle(Math.PI - (angleOf(sub(p, O)) - base));
  const size = clamp(Math.abs(turn), MIN_ARC, MAX_ARC);
  return polar(O, R, base + (turn < 0 ? -size : size));
};

export default lesson((s) => {
  const A = s.point(O.x - 3.2, O.y - 2, { label: "A", constrain: onCircle(O, R) });
  const B = s.point(O.x + 3.2, O.y - 2, { label: "B", constrain: onCircle(O, R) });
  A.constrain = apartFrom(() => B);
  B.constrain = apartFrom(() => A);
  const V = s.point(O.x + 1, O.y + 3.6, { label: "C", color: SECOND, constrain: onCircle(O, R) });

  /** The far end of the chord from C that spans the same central angle as AB. */
  const secondEnd = (): Vec => polar(O, R, angleOf(sub(V, O)) + angleAt(A, O, B));

  return {
    steps: [
      {
        title: "A chord and the centre",
        text: "Drag $A$ and $B$ around the circle. $M$ is the midpoint of the chord, and the radius drawn through $M$ always meets the chord at a right angle.",
      },
      {
        title: "Bisecting forces perpendicular",
        text: "Suppose the radius passes through the midpoint: $AM = MB$. With radii $OA = OB$ and the shared side $OM$, triangles $OMA$ and $OMB$ are congruent by SSS. Their angles at $M$ are equal and add to $180^\\circ$, so each is $90^\\circ$.",
      },
      {
        title: "Perpendicular forces bisecting",
        text: "Suppose instead the radius meets the chord at a right angle. Right triangles $OMA$ and $OMB$ have equal hypotenuses $OA = OB$ and share the leg $OM$. By HL they are congruent, so $AM = MB$.",
      },
      {
        title: "Equal chords, equal arcs",
        text: "Drag $C$: chord $CD$ is kept as long as $AB$. Triangles $OAB$ and $OCD$ have three pairs of equal sides, so their angles at $O$ are equal, and equal central angles cut off equal arcs.",
      },
    ],

    draw(g, f) {
      const M = mid(A, B);
      const N = polar(O, R, angleOf(sub(M, O)));
      const central = angleAt(A, O, B);
      const chords = f.step >= 3;
      V.hidden = !chords;
      V.enabled = chords;

      g.circle(O, R, { color: C.dim, width: 2 });

      if (f.at(1) > 0 && !chords) {
        g.polygon([O, M, A], { fill: tint(C.blue, 0.22), stroke: null, alpha: f.at(1) });
        g.polygon([O, M, B], { fill: tint(C.violet, 0.22), stroke: null, alpha: f.at(1) });
      }
      if (chords) {
        const three = f.at(3);
        const D = secondEnd();
        const fromC = angleOf(sub(V, O));
        // The minor arc AB runs counter-clockwise from whichever end comes first.
        const fromA = angleOf(sub(A, O));
        const start = wrapAngle(angleOf(sub(B, O)) - fromA) < Math.PI ? fromA : fromA - central;
        g.polygon([O, A, B], { fill: tint(g.accent, 0.16), stroke: null, alpha: three });
        g.polygon([O, V, D], { fill: tint(SECOND, 0.16), stroke: null, alpha: three });
        g.arc(O, R, start, start + central, { color: g.accent, width: 6, alpha: three });
        g.arc(O, R, fromC, fromC + central, { color: SECOND, width: 6, alpha: three });
        g.segment(V, D, { color: SECOND, alpha: three });
        g.ticks(V, D, 3, { color: SECOND, alpha: three });
        g.ticks(A, B, 3, { color: g.accent, alpha: three });
        for (const end of [V, D]) g.segment(O, end, { color: RADII, width: 2.5, alpha: three });
        g.angle(A, O, B, { color: g.accent, fill: true, r: 30, alpha: three });
        g.angle(V, O, D, { color: SECOND, fill: true, r: 30, alpha: three });
        g.point(D, { color: SECOND, alpha: three });
        g.label(D, "D", { color: SECOND, bold: true, dx: 16 * Math.cos(fromC + central), dy: 16 * Math.sin(fromC + central), alpha: three });
      } else {
        g.segment(O, N, { color: HALVES, width: 2.5 });
        g.angle(O, M, A, { color: HALVES, r: 15, width: 2, fill: f.step === 2 });
        g.ticks(A, M, 1, { color: HALVES });
        g.ticks(M, B, 1, { color: HALVES });
        g.point(M, { color: HALVES });
        g.label(M, "M", { color: HALVES, bold: true, dx: 14, dy: -14 });
      }

      g.segment(A, B, { color: g.accent, width: 4 });
      if (f.at(1) > 0) {
        for (const end of [A, B]) {
          g.segment(O, end, { color: RADII, width: 2.5, alpha: f.at(1) });
          g.ticks(O, end, 2, { color: RADII, alpha: f.at(1) });
        }
      }
      g.point(O);
      g.label(O, "O", { bold: true, dy: 18 });
    },

    readout(f) {
      const M = mid(A, B);
      const AM = dist(A, M);
      const MB = dist(M, B);
      const atM = toDeg(angleAt(O, M, A));
      const rows = [
        { label: "Halves of the chord", tex: `AM = ${fmt(AM, 2)},\\quad MB = ${fmt(MB, 2)}`, tone: holds(agree(AM, MB)) },
        { label: "Radius meets chord", tex: `\\angle OMA = ${fmt(atM)}^\\circ`, tone: holds(agree(atM, 90)) },
        { label: "Radii", tex: `OA = ${fmt(dist(O, A), 2)},\\quad OB = ${fmt(dist(O, B), 2)}`, tone: holds(agree(dist(O, A), dist(O, B))) },
      ];
      if (f.step < 3) return rows;
      const D = secondEnd();
      const AB = dist(A, B);
      const CD = dist(V, D);
      const arcAB = toDeg(angleAt(A, O, B));
      const arcCD = toDeg(angleAt(V, O, D));
      return [
        rows[2],
        { label: "Chords", tex: `AB = ${fmt(AB, 2)},\\quad CD = ${fmt(CD, 2)}`, tone: holds(agree(AB, CD)) },
        {
          label: "Arcs",
          tex: `\\widehat{AB} = ${fmt(arcAB)}^\\circ,\\quad \\widehat{CD} = ${fmt(arcCD)}^\\circ`,
          tone: holds(agree(arcAB, arcCD)),
        },
      ];
    },
  };
});
