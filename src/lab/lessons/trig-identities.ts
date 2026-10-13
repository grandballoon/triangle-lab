// The trigonometric identities that fall straight out of one right triangle
// with hypotenuse 1: the cofunction identities (look at the triangle from its
// other acute angle), sin² + cos² = 1 (the Pythagorean theorem), and its two
// rescaled copies tan² + 1 = sec² and 1 + cot² = csc².

import { C, tint } from "../draw.ts";
import { add, dist, fmt, toDeg, toRad, vec, type Vec } from "../geo.ts";
import { inSector, sq } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const A = vec(-4.5, -3);
const UNIT = 3.6; // stage units in the length called 1

const SIN = C.gold;
const COS = C.blue;
const ANGLE = C.pink;
const OTHER = C.cyan; // the second acute angle, 90° − A
const BY_COS = C.violet; // the triangle scaled until its adjacent leg is 1
const BY_SIN = C.green; // the triangle scaled until its opposite leg is 1

const BAR = { left: 3.4, y: 3.3, height: 0.36 };

export default lesson((s) => {
  // The range keeps both rescaled triangles on the stage.
  const B = s.point(A.x + UNIT * 0.8, A.y + UNIT * 0.6, {
    label: "B",
    constrain: inSector(A, UNIT, UNIT, toRad(25), toRad(62)),
  });

  const measure = () => {
    const foot = vec(B.x, A.y);
    const sin = dist(B, foot) / UNIT;
    const cos = dist(A, foot) / UNIT;
    return { foot, sin, cos, angle: Math.atan2(sin, cos) };
  };

  return {
    steps: [
      {
        title: "Sine and cosine as lengths",
        text: "Drag $B$ to change the angle $A$. The hypotenuse is $1$, so the leg opposite $A$ is exactly $\\sin A$ long and the leg beside it is $\\cos A$.",
      },
      {
        title: "Look from the other corner",
        text: "The angle at $B$ is $90^\\circ - A$, and from there the legs swap roles: its opposite leg is the $\\cos A$ one. So $\\sin(90^\\circ - A) = \\cos A$ and $\\cos(90^\\circ - A) = \\sin A$; likewise $\\tan$ pairs with $\\cot$, and $\\sec$ with $\\csc$.",
      },
      {
        title: "Pythagoras in disguise",
        text: "The legs are $\\sin A$ and $\\cos A$ and the hypotenuse is $1$, so the Pythagorean theorem reads $\\sin^2 A + \\cos^2 A = 1$. The bar stacks the two squares: together they always fill one unit.",
      },
      {
        title: "Divide by cos²",
        text: "Enlarge the triangle by $\\frac{1}{\\cos A}$, so the leg beside $A$ becomes $1$. The other leg is now $\\tan A$ and the hypotenuse $\\sec A$. Pythagoras for this triangle: $\\tan^2 A + 1 = \\sec^2 A$.",
      },
      {
        title: "Divide by sin²",
        text: "Enlarge by $\\frac{1}{\\sin A}$ instead, so the leg opposite $A$ becomes $1$. The legs are $\\cot A$ and $1$, the hypotenuse $\\csc A$, and Pythagoras gives $1 + \\cot^2 A = \\csc^2 A$.",
      },
    ],

    draw(g, f) {
      const { foot, sin, cos } = measure();
      // The same triangle about A, enlarged by `k`.
      const enlarged = (k: number): [Vec, Vec, Vec] => [
        A,
        add(A, vec(UNIT * cos * k, 0)),
        add(A, vec(UNIT * cos * k, UNIT * sin * k)),
      ];

      const bySin = f.at(4);
      const byCos = f.at(3) * (1 - 0.7 * bySin);
      if (byCos > 0) {
        const [, foot2, top2] = enlarged(1 / cos);
        g.polygon([A, foot2, top2], { fill: tint(BY_COS, 0.1), color: BY_COS, width: 2.5, alpha: byCos });
        g.angle(A, foot2, top2, { color: BY_COS, r: 14, width: 2, alpha: byCos });
        g.along(A, foot2, "1", { color: BY_COS, offset: -34, alpha: byCos, size: 15 });
        g.along(foot2, top2, "tan A", { color: BY_COS, offset: -26, alpha: byCos, size: 15 });
        g.along(A, top2, "sec A", { color: BY_COS, offset: 34, alpha: byCos, size: 15 });
      }
      if (bySin > 0) {
        const [, foot3, top3] = enlarged(1 / sin);
        g.polygon([A, foot3, top3], { fill: tint(BY_SIN, 0.1), color: BY_SIN, width: 2.5, alpha: bySin });
        g.angle(A, foot3, top3, { color: BY_SIN, r: 14, width: 2, alpha: bySin });
        g.along(A, foot3, "cot A", { color: BY_SIN, offset: -52, alpha: bySin, size: 15 });
        g.along(foot3, top3, "1", { color: BY_SIN, offset: -16, alpha: bySin, size: 15 });
        g.along(A, top3, "csc A", { color: BY_SIN, offset: 52, alpha: bySin, size: 15 });
      }

      g.polygon([A, foot, B], { fill: "rgba(255, 255, 255, 0.05)", stroke: null });
      g.segment(A, B, { color: C.ink });
      g.segment(A, foot, { color: COS, width: 4 });
      g.segment(foot, B, { color: SIN, width: 4 });
      g.angle(A, foot, B, { color: C.ink, r: 16, width: 2 });
      g.angle(foot, A, B, { color: ANGLE, fill: true, r: 40, label: "A" });
      if (f.at(1) > 0) {
        g.angle(A, B, foot, { color: OTHER, fill: true, r: 30, label: "90°−A", alpha: f.at(1) });
      }

      const swapped = f.step === 1 || f.step === 2;
      g.along(A, B, "1", { offset: 16, size: 16 });
      g.along(A, foot, swapped ? "cos A = sin(90°−A)" : "cos A", { color: COS, offset: -16, size: 15 });
      g.label(vec(foot.x, (foot.y + B.y) / 2), swapped ? "sin A = cos(90°−A)" : "sin A", {
        color: SIN,
        align: "left",
        dx: 10,
        size: 15,
      });
      g.point(A, { r: 4 });
      g.label(A, "A", { dx: -15, dy: -4, bold: true });

      if (f.at(2) > 0) {
        const alpha = f.at(2);
        const at = (t: number, dy = 0): Vec => vec(BAR.left + UNIT * t, BAR.y + dy);
        const split = sq(sin);
        g.polygon([at(0), at(split), at(split, BAR.height), at(0, BAR.height)], {
          fill: tint(SIN, 0.7), stroke: null, alpha,
        });
        g.polygon([at(split), at(1), at(1, BAR.height), at(split, BAR.height)], {
          fill: tint(COS, 0.7), stroke: null, alpha,
        });
        g.label(at(split / 2, BAR.height), "sin²A", { color: SIN, dy: 14, size: 14, alpha });
        g.label(at((1 + split) / 2), "cos²A", { color: COS, dy: -14, size: 14, alpha });
        g.label(at(1, BAR.height / 2), "= 1", { align: "left", dx: 10, alpha });
      }
    },

    readout(f) {
      const { sin, cos, angle } = measure();
      const other = Math.PI / 2 - angle;
      const tan = sin / cos;
      const cot = cos / sin;
      const deg = (a: number): string => `${fmt(toDeg(a))}^\\circ`;
      const rows: Readout[] = [
        { label: "The two acute angles", tex: `A = ${deg(angle)},\\quad 90^\\circ - A = ${deg(other)}` },
        {
          label: "Cofunctions",
          tex: `\\sin ${deg(angle)} = ${fmt(sin, 3)},\\quad \\cos ${deg(other)} = ${fmt(Math.cos(other), 3)}`,
          tone: "good",
        },
        {
          label: "Pythagorean identity",
          tex: `(${fmt(sin, 3)})^2 + (${fmt(cos, 3)})^2 = ${fmt(sq(sin) + sq(cos), 3)}`,
          tone: "good",
        },
      ];
      if (f.step >= 3) {
        rows.push({
          label: "Divided by $\\cos^2 A$",
          tex: `\\tan^2 A + 1 = ${fmt(sq(tan) + 1, 2)},\\quad \\sec^2 A = ${fmt(1 / sq(cos), 2)}`,
          tone: "good",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: "Divided by $\\sin^2 A$",
          tex: `1 + \\cot^2 A = ${fmt(1 + sq(cot), 2)},\\quad \\csc^2 A = ${fmt(1 / sq(sin), 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
