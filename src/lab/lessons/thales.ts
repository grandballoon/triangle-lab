// An angle inscribed in a semicircle is a right angle: it stands on an arc of
// 180°, and an inscribed angle is half its arc. Read backwards, the right
// angle of any right triangle stands on half of the circumcircle, so the
// hypotenuse is a diameter and its midpoint is the circumcentre.

import { C } from "../draw.ts";
import { angleAt, cross, dist, fmt, polar, sub, toRad, vec, wrapAngle, type Constraint } from "../geo.ts";
import { arcTex, bearing, degTex, nameOutside } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.2);
const R = 3.8;
// How close (in radians of arc) P may come to either end of the diameter.
const GAP = 0.25;

const DIAMETER = C.gold;
const AT_A = C.green;
const AT_B = C.pink;
const AUX = C.violet;

/** On the circle, at least GAP away from each of the given directions. */
const clearOf = (others: () => number[]): Constraint => (p) => {
  let a = bearing(O, p);
  for (const b of others()) {
    const off = wrapAngle(a - b + Math.PI) - Math.PI;
    if (Math.abs(off) < GAP) a = b + (off < 0 ? -GAP : GAP);
  }
  return polar(O, R, a);
};

export default lesson((s) => {
  const start = { A: polar(O, R, toRad(190)), P: polar(O, R, toRad(65)) };
  const A = s.point(start.A.x, start.A.y);
  const P = s.point(start.P.x, start.P.y);
  A.constrain = clearOf(() => [bearing(O, P), bearing(O, P) + Math.PI]);
  P.constrain = clearOf(() => [bearing(O, A), bearing(O, A) + Math.PI]);

  const opposite = () => vec(2 * O.x - A.x, 2 * O.y - A.y);

  return {
    steps: [
      {
        title: "A corner on the circle",
        text: "$AB$ is a diameter. Drag $P$ anywhere on the circle, or swing the diameter round by dragging $A$, and watch the angle at $P$.",
      },
      {
        title: "Half of a half-circle",
        text: "The angle at $P$ is inscribed, and the arc it stands on is the half of the circle beyond $AB$: $180^\\circ$. An inscribed angle is half its arc, so $\\angle APB = 90^\\circ$.",
      },
      {
        title: "The same thing with radii",
        text: "Draw $OP$. Three equal radii make two isosceles triangles with base angles $\\alpha$ and $\\beta$. Triangle $APB$ has angles $\\alpha$, $\\beta$ and $\\alpha + \\beta$, so $2\\alpha + 2\\beta = 180^\\circ$.",
      },
      {
        title: "Run it backwards",
        text: "Start instead from any right triangle and its circumcircle. The right angle is inscribed, so its arc is $2 \\cdot 90^\\circ = 180^\\circ$: the hypotenuse is a diameter, and its midpoint is equally far from all three corners.",
      },
    ],

    likes: [
      {
        title: "A sliding ladder",
        text: "A ladder slides down a wall, its foot slipping out across the floor. Wall and floor meet at a right angle and the ladder is the hypotenuse, so its midpoint is always half a ladder's length from the corner: a paint spot at the middle traces a quarter circle.",
      },
      {
        title: "A set square between two nails",
        text: "Push the corner of a set square between two nails so each edge rests against one nail, then slide it round, keeping the edges on the nails. The corner traces a semicircle, with the two nails at the ends of its diameter.",
      },
    ],

    uses: [
      {
        title: "Finding the centre of a round table",
        text: "Lay a carpenter's square with its corner on the edge of the table and mark where its two edges cross the rim: the line joining the marks is a diameter. Do it again from another spot, and the two diameters cross at the centre.",
      },
      {
        title: "One sprinkler for a right-angled lawn",
        text: "To reach all three corners of a lawn shaped like a right triangle with one sprinkler set to the shortest throw, put it at the midpoint of the longest side. That point is the same distance from all three corners.",
      },
    ],

    draw(g, f) {
      const B = opposite();
      const a = bearing(O, A);
      // The semicircle the angle stands on is the one P is not on.
      const pIsLeft = cross(sub(B, A), sub(P, A)) > 0;
      const arcFrom = wrapAngle(bearing(O, P) - a) < Math.PI ? a + Math.PI : a;

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(1) > 0) {
        g.arc(O, R, arcFrom, arcFrom + Math.PI, { color: DIAMETER, width: 6, alpha: f.at(1) });
        g.angleMark(O, arcFrom, arcFrom + Math.PI, { color: DIAMETER, fill: true, r: 20, alpha: f.at(1) });
        nameOutside(g, O, polar(O, R, arcFrom + Math.PI / 2), "180°", {
          color: DIAMETER,
          push: 20,
          alpha: f.at(1),
        });
      }

      g.segment(A, B, { color: DIAMETER, width: 4 });
      g.segment(P, A);
      g.segment(P, B);

      if (f.at(2) > 0) {
        const marks = f.at(2) * (1 - f.at(3));
        g.segment(O, P, { color: AUX, width: 2.5, alpha: f.at(2) });
        for (const end of [A, B, P]) g.ticks(O, end, 1, { color: AUX, alpha: f.at(2) });
        g.angle(P, A, O, { color: AT_A, r: 30, label: "α", alpha: marks });
        g.angle(A, P, O, { color: AT_A, r: 48, label: "α", alpha: marks });
        g.angle(P, B, O, { color: AT_B, r: 30, label: "β", alpha: marks });
        g.angle(B, P, O, { color: AT_B, r: 56, label: "β", alpha: marks });
      }
      if (f.at(3) > 0) {
        g.along(A, B, "hypotenuse", { color: DIAMETER, offset: pIsLeft ? -18 : 18, alpha: f.at(3) });
      }

      g.angle(A, P, B, { color: g.accent, fill: true, r: 30, label: f.step === 2 ? undefined : true });
      g.point(O, { color: C.ink, label: "O" });
      g.point(B, { color: DIAMETER });
      nameOutside(g, O, A, "A");
      nameOutside(g, O, B, "B", { push: 18 });
      nameOutside(g, O, P, "P");
    },

    readout(f) {
      const B = opposite();
      const pa = dist(P, A);
      const pb = dist(P, B);
      const ab = dist(A, B);
      const alpha = angleAt(P, A, B);
      const beta = angleAt(P, B, A);
      const rows: Readout[] = [
        { label: "Diameter", tex: `AB = 2r = 2(${fmt(R)}) = ${fmt(ab)}` },
        { label: "Angle in the semicircle", tex: `\\angle APB = ${degTex(angleAt(A, P, B))}`, tone: "good" },
        {
          label: "So Pythagoras holds",
          tex: `PA^2 + PB^2 = ${fmt(pa * pa + pb * pb)},\\quad AB^2 = ${fmt(ab * ab)}`,
        },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Half the arc it stands on",
          tex: `\\tfrac12\\,${arcTex("AB")} = \\tfrac12(180^\\circ) = 90^\\circ`,
        });
      }
      if (f.step >= 2) {
        rows.push({
          label: "Base angles of the two triangles",
          tex: `\\alpha + \\beta = ${degTex(alpha)} + ${degTex(beta)} = ${degTex(alpha + beta)}`,
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Midpoint of the hypotenuse",
          tex: `OP = ${fmt(dist(O, P))},\\quad \\tfrac12 AB = ${fmt(ab / 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
