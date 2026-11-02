// The incircle touches each side of a triangle once, and the two tangent
// segments from each corner are equal. Calling them x, y, z, the sides are
// y + z, z + x and x + y, so the semiperimeter is x + y + z and each tangent
// length is s minus the opposite side. When the angle at C is a right angle,
// the radii to the two nearby points of contact make a square with C, so the
// inradius is z = s − c = (a + b − c)/2.

import { C, tint } from "../draw.ts";
import {
  angleAt,
  angleOf,
  clamp,
  dist,
  fmt,
  inBox,
  incenter,
  mid,
  onSegment,
  polar,
  project,
  sub,
  toDeg,
  toRad,
  vec,
  type Vec,
} from "../geo.ts";
import { degTex } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const BASE_Y = -3.2;
// With the right angle switched on, C rides the semicircle on AB; these keep it off the base.
const RIGHT_MIN = toRad(30);
const RIGHT_MAX = toRad(150);
const RIGHT_TOLERANCE = 0.05; // degrees

const FROM_A = C.gold; // x
const FROM_B = C.blue; // y
const FROM_C = C.pink; // z

export default lesson((s) => {
  // A and B slide along a base line and cannot meet; C stays above it.
  const A = s.point(-5.2, BASE_Y, { label: "A", constrain: onSegment(vec(-7.2, BASE_Y), vec(-1.5, BASE_Y)) });
  const B = s.point(5.4, BASE_Y, { label: "B", constrain: onSegment(vec(1.5, BASE_Y), vec(7.2, BASE_Y)) });
  const right = s.toggle("Right angle at C");
  const free = inBox(-7.2, 7.2, BASE_Y + 0.75, 4.3);
  // On the circle with diameter AB the angle at C is exactly 90°.
  const onSemicircle = (p: Vec): Vec => {
    const centre = mid(A, B);
    const raw = angleOf(sub(p, centre));
    return polar(centre, dist(A, B) / 2, clamp(raw < -Math.PI / 2 ? Math.PI : raw, RIGHT_MIN, RIGHT_MAX));
  };
  const ptC = s.point(-1.6, 3.4, { label: "C", constrain: (p) => (right.on ? onSemicircle(p) : free(p)) });

  const measure = () => {
    ptC.set(ptC); // the semicircle moves with A and B
    const a = dist(B, ptC);
    const b = dist(ptC, A);
    const c = dist(A, B);
    const I = incenter(A, B, ptC);
    const X = project(I, B, ptC);
    const Y = project(I, ptC, A);
    const Z = project(I, A, B);
    return { a, b, c, s: (a + b + c) / 2, I, X, Y, Z, r: dist(I, Z), atC: angleAt(A, ptC, B) };
  };

  return {
    steps: [
      {
        title: "A circle inside a triangle",
        text: "Drag the corners. The incircle touches each side once, cutting it into two pieces. Watch the pieces that meet at the same corner.",
      },
      {
        title: "Equal tangents",
        text: "Two tangents from one point to a circle are equal. So the pieces pair up by corner: $x$ at $A$, $y$ at $B$, $z$ at $C$.",
      },
      {
        title: "Add up the sides",
        text: "Each side is two pieces: $a = y + z$, $b = z + x$, $c = x + y$. The perimeter uses every piece twice, so the semiperimeter is $s = x + y + z$.",
      },
      {
        title: "Take a side away",
        text: "Remove side $a = y + z$ from $s$ and only $x$ is left: $x = s - a$. In the same way $y = s - b$ and $z = s - c$.",
      },
      {
        title: "A right angle at C",
        text: "Switch on “Right angle at C”. The radii to the two points of contact beside $C$ meet the sides squarely, making a square of side $r$. So $r = z = s - c = \\tfrac12(a + b - c)$.",
      },
    ],

    draw(g, f) {
      const m = measure();
      const { I, X, Y, Z } = m;
      const isRight = Math.abs(toDeg(m.atC) - 90) < RIGHT_TOLERANCE;
      const symbols = f.step >= 1;
      const piece = (corner: Vec, touch: Vec, color: string, name: string, ticks: number, outside: number): void => {
        g.segment(corner, touch, { color, width: 5 });
        if (f.at(1) > 0) g.ticks(corner, touch, ticks, { color: C.ink, alpha: f.at(1) });
        g.along(corner, touch, symbols ? name : fmt(dist(corner, touch)), { color, offset: outside * 16 });
      };

      g.polygon([A, B, ptC], { fill: "rgba(255, 255, 255, 0.05)", stroke: null });
      if (f.at(4) > 0) {
        if (isRight) g.polygon([ptC, X, I, Y], { fill: tint(FROM_C, 0.3), stroke: null, alpha: f.at(4) });
        g.segment(I, X, { color: C.ink, width: 2, alpha: f.at(4) });
        g.segment(I, Y, { color: C.ink, width: 2, alpha: f.at(4) });
        g.angle(I, X, ptC, { r: 14, width: 2, alpha: f.at(4) });
        g.angle(I, Y, ptC, { r: 14, width: 2, alpha: f.at(4) });
        g.along(I, X, "r", { offset: 12, alpha: f.at(4) });
      }
      g.circle(I, m.r, { color: g.accent, width: 2.5 });

      // A, B, C run counter-clockwise, so the outside of each side is on the right.
      piece(A, Z, FROM_A, "x", 1, -1);
      piece(A, Y, FROM_A, "x", 1, 1);
      piece(B, Z, FROM_B, "y", 2, 1);
      piece(B, X, FROM_B, "y", 2, -1);
      piece(ptC, X, FROM_C, "z", 3, 1);
      piece(ptC, Y, FROM_C, "z", 3, -1);
      if (f.at(2) > 0) {
        g.along(B, ptC, "a", { offset: -40, bold: true, alpha: f.at(2) });
        g.along(ptC, A, "b", { offset: -40, bold: true, alpha: f.at(2) });
        g.along(A, B, "c", { offset: -40, bold: true, alpha: f.at(2) });
      }
      if (f.at(4) > 0) g.angle(A, ptC, B, { r: 18, width: 2, label: isRight ? undefined : true, alpha: f.at(4) });

      for (const touch of [X, Y, Z]) g.point(touch, { color: C.ink, r: 4 });
      g.point(I, { color: g.accent, r: 3.5 });
    },

    readout(f) {
      const m = measure();
      const isRight = Math.abs(toDeg(m.atC) - 90) < RIGHT_TOLERANCE;
      const rows: Readout[] = [
        { label: "Sides opposite A, B, C", tex: `a, b, c = ${fmt(m.a, 2)},\\ ${fmt(m.b, 2)},\\ ${fmt(m.c, 2)}` },
        { label: "Semiperimeter", tex: `s = \\tfrac12(a + b + c) = ${fmt(m.s, 2)}` },
        { label: "From A", tex: `AZ = AY = ${fmt(dist(A, m.Z), 2)},\\quad s - a = ${fmt(m.s - m.a, 2)}`, tone: "good" },
        { label: "From B", tex: `BZ = BX = ${fmt(dist(B, m.Z), 2)},\\quad s - b = ${fmt(m.s - m.b, 2)}`, tone: "good" },
        {
          label: "From C",
          tex: `CX = CY = ${fmt(dist(ptC, m.X), 2)},\\quad s - c = ${fmt(m.s - m.c, 2)}`,
          tone: "good",
        },
      ];
      if (f.step >= 4) {
        rows.push({
          label: isRight ? "Inradius of a right triangle" : `Needs a right angle (now $${degTex(m.atC)}$)`,
          tex: `r = ${fmt(m.r, 2)},\\quad \\tfrac12(a + b - c) = ${fmt((m.a + m.b - m.c) / 2, 2)}`,
          tone: isRight ? "good" : "dim",
        });
      }
      return rows;
    },

    likes: [
      {
        title: "Weighing three parcels in pairs",
        text: "Suppose you can only weigh three parcels two at a time, and the readings are $y + z$, $z + x$ and $x + y$. Adding all three readings counts every parcel twice, so half the total is $x + y + z$, and taking one reading away from that leaves the parcel that was not in it. The sides of the triangle are those readings and the tangent pieces are the parcels: $x = s - a$.",
      },
      {
        title: "A ball pushed into a corner",
        text: "Roll a ball into the corner of a box. It touches the two walls equally far from the corner: the two equal tangents. When the corner is square, the corner, the two points of contact and the ball's centre make a little square, so that distance is just the ball's radius, as $r = z$ is at a right angle.",
      },
    ],

    uses: [
      {
        title: "The biggest round pond in a corner plot",
        text: "A triangular plot has sides 3 m, 4 m and 5 m, with a right angle between the two shorter ones. The biggest round pond that fits touches all three sides: it is the incircle, of radius $r = \\tfrac12(3 + 4 - 5) = 1$ m. To peg it out, use the tangent lengths: with $s = 6$, the pond touches the sides 1 m from the right-angled corner, 2 m from the corner where the 3 m side meets the longest, and 3 m from the corner where the 4 m side does.",
      },
      {
        title: "Cutting a disc from an offcut",
        text: "A plywood offcut is a right triangle with short edges 30 cm and 40 cm, and a long edge of 50 cm. The largest disc you can cut from it has radius $\\tfrac12(30 + 40 - 50) = 10$ cm, a 20 cm clock face. Its centre is 10 cm in from each short edge, so you can mark it with a square from the right-angled corner before reaching for the compass.",
      },
    ],
  };
});
