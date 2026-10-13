// Area = ½ab·sin C: two sides and the angle between them. The altitude to
// side a is the leg opposite C in a right triangle with hypotenuse b, so
// h = b·sin C. When C is obtuse that right triangle sits outside and holds
// the supplement of C, which has the same sine. With a = b and C = 60° the
// formula becomes the equilateral triangle's (√3/4)s².

import { C, tint } from "../draw.ts";
import {
  angleAt, both, dist, fmt, onSegment, polar, toDeg, toRad, vec,
  type Constraint, type Vec,
} from "../geo.ts";
import { inSector } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(-1.5, -2.8); // the vertex C, where the angle is

const SIDE_A = C.blue;
const SIDE_B = C.gold;
const ANGLE = C.pink;
const HEIGHT = C.green;
const SUPPLEMENT = C.violet;

const SNAP = 0.2;
const EQUAL = 1e-6;

export default lesson((s) => {
  const B = s.point(3.5, -2.8, { label: "B", constrain: onSegment(vec(1.5, -2.8), vec(5, -2.8)) });
  const apex = (): Vec => polar(O, dist(O, B), toRad(60));
  /** Catch A at the corner that makes the triangle equilateral. */
  const snapEquilateral: Constraint = (p) => (dist(p, apex()) < SNAP ? apex() : p);
  const A = s.point(0.6, 1.6, {
    label: "A",
    constrain: both(inSector(O, 2.5, 6.5, toRad(20), toRad(155)), snapEquilateral),
  });
  s.button("Make it equilateral", () => A.set(apex()));

  const measure = () => {
    const a = dist(O, B);
    const b = dist(O, A);
    const X = vec(A.x, O.y);
    return {
      a, b, X,
      angle: angleAt(B, O, A),
      h: dist(A, X),
      obtuse: A.x < O.x,
      equilateral: Math.abs(a - b) < EQUAL && Math.abs(dist(A, B) - a) < EQUAL,
    };
  };

  return {
    steps: [
      {
        title: "Two sides and the angle between",
        text: "Drag $A$ to swing side $b$ about $C$ or to stretch it, and slide $B$ to change $a$. The numbers $a$, $b$ and the angle $C$ fix the triangle completely, so they must fix its area too.",
      },
      {
        title: "Look for the height",
        text: "Take $a$ as the base. The area is $\\frac12 ah$, where $h$ is the altitude dropped from $A$ to the line $CB$. All that is missing is $h$ in terms of $b$ and $C$.",
      },
      {
        title: "A right triangle holding C",
        text: "The altitude is the leg opposite $C$ in a right triangle whose hypotenuse is $b$. So $\\sin C = \\dfrac{h}{b}$, giving $h = b \\sin C$ and area $= \\frac12 ab \\sin C$.",
      },
      {
        title: "When C is obtuse",
        text: "Swing $A$ over to the left of $C$. The altitude falls outside, and the right triangle now holds the supplement: $h = b\\sin(180^\\circ - C)$. An angle and its supplement have the same sine, so the formula is unchanged.",
      },
      {
        title: "The equilateral triangle",
        text: "Press “Make it equilateral”. With $a = b = s$ and $C = 60^\\circ$, the area is $\\frac12 s^2 \\sin 60^\\circ = \\frac12 s^2 \\cdot \\frac{\\sqrt3}{2} = \\frac{\\sqrt3}{4}s^2$.",
      },
    ],

    draw(g, f) {
      const { X, obtuse, equilateral } = measure();
      const beyond = vec(O.x - 1.2, O.y); // a point on CB extended past C

      if (f.at(2) > 0) g.polygon([O, X, A], { fill: tint(SIDE_B, 0.16), stroke: null, alpha: f.at(2) });
      g.polygon([O, B, A], { fill: f.step < 2 ? tint(g.accent, 0.12) : undefined, stroke: null });
      g.segment(A, B, { color: C.ink });
      g.segment(O, B, { color: SIDE_A, width: 4 });
      g.segment(O, A, { color: SIDE_B, width: 4 });
      g.angle(B, O, A, { color: ANGLE, fill: true, r: 30, label: true });
      g.along(O, B, "a", { color: SIDE_A, offset: -17, size: 16 });
      g.along(O, A, "b", { color: SIDE_B, offset: 17, size: 16 });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        if (obtuse) g.segment(O, X, { color: C.dim, width: 2, dash: [6, 5], alpha });
        g.segment(A, X, { color: HEIGHT, dash: [7, 5], alpha });
        g.angle(A, X, obtuse ? O : B, { color: HEIGHT, r: 14, width: 2, alpha });
        g.along(X, A, f.step >= 2 ? "h = b·sin C" : "h", {
          color: HEIGHT, offset: obtuse ? 17 : -17, size: 15, align: obtuse ? "right" : "left", alpha,
        });
        g.point(X, { color: HEIGHT, r: 4, alpha });
      }
      if (f.at(3) > 0) {
        if (obtuse) {
          g.angle(A, O, beyond, { color: SUPPLEMENT, fill: true, r: 44, label: "180°−C", alpha: f.at(3) });
        } else {
          g.label(vec(O.x, 4.4), "C is acute here: swing A to the left of C", { color: C.dim, size: 14, alpha: f.at(3) });
        }
      }
      if (f.at(4) > 0 && equilateral) {
        for (const [p, q] of [[O, B], [O, A], [A, B]] as const) g.ticks(p, q, 1, { alpha: f.at(4) });
      }

      g.point(O, { r: 4 });
      g.label(O, "C", { dx: obtuse ? 12 : -12, dy: -16, bold: true });
    },

    readout(f) {
      const { a, b, angle, h, equilateral } = measure();
      const sin = Math.sin(angle);
      const deg = `${fmt(toDeg(angle))}^\\circ`;
      const rows: Readout[] = [
        { label: "Given", tex: `a = ${fmt(a, 2)},\\quad b = ${fmt(b, 2)},\\quad C = ${deg}` },
        {
          label: "Area $= \\frac12 ab \\sin C$",
          tex: `\\tfrac12(${fmt(a, 2)})(${fmt(b, 2)})\\sin ${deg} = ${fmt((a * b * sin) / 2, 2)}`,
          tone: "good",
        },
      ];
      if (f.step >= 1) {
        rows.push(
          { label: "Height", tex: `h = ${fmt(h, 2)},\\qquad b\\sin C = ${fmt(b * sin, 2)}`, tone: "good" },
          { label: "Half base times height", tex: `\\tfrac12 ah = \\tfrac12(${fmt(a, 2)})(${fmt(h, 2)}) = ${fmt((a * h) / 2, 2)}`, tone: "good" },
        );
      }
      if (f.step >= 3) {
        const supplement = Math.PI - angle;
        rows.push({
          label: "Supplements share a sine",
          tex: `\\sin ${deg} = ${fmt(sin, 3)},\\quad \\sin ${fmt(toDeg(supplement))}^\\circ = ${fmt(Math.sin(supplement), 3)}`,
          tone: "good",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: equilateral ? "Equilateral, side $s = a$" : "If it were equilateral, side $a$",
          tex: `\\tfrac{\\sqrt3}{4}s^2 = \\tfrac{\\sqrt3}{4}(${fmt(a, 2)})^2 = ${fmt((Math.sqrt(3) / 4) * a * a, 2)}`,
          tone: equilateral ? "good" : "dim",
        });
      }
      return rows;
    },
  };
});
