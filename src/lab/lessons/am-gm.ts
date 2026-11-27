// The AM–GM inequality. For x, y ≥ 0 the arithmetic mean (x + y)/2 is at
// least the geometric mean √(xy). Four x × y rectangles fit round a square
// hole of side |x − y| inside an (x + y)-square, so 4xy ≤ (x + y)²; and on a
// semicircle with diameter x + y the radius is the arithmetic mean and the
// half-chord over the join is the geometric mean. So a fixed sum gives the
// largest product, and a fixed product the least sum, when x = y.

import { C, tint } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { num } from "../kit/inequalities.ts";
import { lesson, type Readout } from "../scene.ts";
import unequalArmBalanceImage from "../../images/unequal-arm-balance.svg";
import growthRatesAverageImage from "../../images/growth-rates-average.svg";

const XC = C.cyan;
const YC = C.pink;
const AM = C.gold;
const GM = C.green;

export default lesson((s) => {
  const x = s.slider({ label: "x =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0.5, max: 8, value: 2, step: 0.5, format: (v) => num(v) });
  const y = s.slider({ label: "y =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0.5, max: 8, value: 8, step: 0.5, format: (v) => num(v) });

  return {
    steps: [
      {
        title: "Two kinds of average",
        text: "For $x, y \\ge 0$ the arithmetic mean is $\\frac{x + y}{2}$, halfway between them. The geometric mean is $\\sqrt{xy}$, the side of the square with the same area as an $x$ by $y$ rectangle. For $2$ and $8$ the arithmetic mean is $5$ and the geometric mean is $\\sqrt{16} = 4$.",
      },
      {
        title: "Four rectangles in a square",
        text: "Four $x$ by $y$ rectangles fit inside a square of side $x + y$, leaving a square hole of side $|x - y|$ in the middle. So $4xy \\le (x + y)^2$, and taking square roots, $\\sqrt{xy} \\le \\frac{x + y}{2}$. The hole closes, and the means are equal, only when $x = y$. The algebra is the trivial inequality: $(\\sqrt{x} - \\sqrt{y})^2 \\ge 0$.",
      },
      {
        title: "A semicircle shows both",
        text: "Lay $x$ and $y$ end to end as the diameter of a semicircle. Its radius is $\\frac{x + y}{2}$. The perpendicular from the join up to the circle is the altitude of a right triangle, so its square is $xy$ and it is $\\sqrt{xy}$ long. It can never be longer than a radius, and it is a radius only at the centre, when $x = y$.",
      },
      {
        title: "Fixed sum, fixed product",
        text: "If $x + y$ is fixed, $xy \\le \\left(\\frac{x + y}{2}\\right)^2$: of all rectangles with a given perimeter, the square has the largest area. If $xy$ is fixed, $x + y \\ge 2\\sqrt{xy}$: for an area of $36$, the perimeter $2(x + y)$ is at least $24$, and only the $6$ by $6$ square reaches it.",
      },
    ],

    draw(g, f) {
      const [X, Y] = [x.value, y.value];
      const am = (X + Y) / 2;
      const gm = Math.sqrt(X * Y);
      const rect = (o: Vec, w: number, h: number, color: string, alpha = 1, fill = 0.25): void => {
        g.polygon([o, { x: o.x + w, y: o.y }, { x: o.x + w, y: o.y + h }, { x: o.x, y: o.y + h }], { color, fill: tint(color, fill), width: 2, alpha });
      };

      if (f.step === 0 || f.step === 3) {
        // The rectangle, and beside it the square of the same area (or, on the
        // last step, the square of the same perimeter).
        const side = f.step === 0 ? gm : am;
        const u = Math.min(5.6 / Math.max(X, side), 6.4 / Math.max(Y, side));
        const O: Vec = { x: -7.4, y: -2.6 };
        rect(O, X * u, Y * u, XC);
        g.label({ x: O.x + (X * u) / 2, y: O.y }, `x = ${num(X)}`, { color: XC, size: 14, bold: true, dy: -14 });
        g.label({ x: O.x + X * u, y: O.y + (Y * u) / 2 }, `y = ${num(Y)}`, { color: YC, size: 14, bold: true, dx: 8, align: "left" });
        g.label({ x: O.x + (X * u) / 2, y: O.y + (Y * u) / 2 }, `area ${num(X * Y, 2)}`, { color: C.ink, size: 14, bold: true });
        const color = f.step === 0 ? GM : AM;
        const S: Vec = { x: 0.6, y: -2.6 };
        const t = f.at(f.step);
        rect(S, side * u, side * u, color, t);
        g.label({ x: S.x + (side * u) / 2, y: S.y }, f.step === 0 ? `√(xy) = ${num(gm, 2)}` : `(x + y)/2 = ${num(am, 2)}`, { color, size: 14, bold: true, dy: -14, alpha: t });
        g.label({ x: S.x + (side * u) / 2, y: S.y + (side * u) / 2 }, `area ${num(side * side, 2)}`, { color: C.ink, size: 14, bold: true, alpha: t });
        const line = f.step === 0
          ? `mean ${num(am, 2)} ≥ ${num(gm, 2)}`
          : `same sum ${num(X + Y)}: area ${num(X * Y, 2)} ≤ ${num(am * am, 2)}`;
        g.label({ x: 0, y: 4.4 }, line, { color: C.ink, size: 17, bold: true });
        return;
      }

      if (f.step === 1) {
        const [p, q] = [Math.max(X, Y), Math.min(X, Y)];
        const u = 6.8 / (p + q);
        const O: Vec = { x: -6.2, y: -2.6 };
        const at = (i: number, j: number): Vec => ({ x: O.x + i * u, y: O.y + j * u });
        const t = f.at(1);
        g.polygon([at(0, 0), at(p + q, 0), at(p + q, p + q), at(0, p + q)], { color: AM, width: 3 });
        const pieces: [number, number, number, number][] = [
          [0, 0, p, q],
          [p, 0, q, p],
          [q, p, p, q],
          [0, q, q, p],
        ];
        pieces.forEach(([i, j, w, h], n) => {
          const alpha = Math.min(1, t * 4 - n + 1);
          rect(at(i, j), w * u, h * u, n % 2 ? YC : XC, alpha);
          g.label(at(i + w / 2, j + h / 2), "xy", { color: C.ink, size: 14, bold: true, alpha });
        });
        if (p > q) {
          g.polygon([at(q, q), at(p, q), at(p, p), at(q, p)], { color: C.red, fill: tint(C.red, 0.2), width: 2, dash: [5, 4] });
          if ((p - q) * u > 0.7) g.label(at((p + q) / 2, (p + q) / 2), "hole", { color: C.red, size: 13, bold: true });
        }
        const R = 2.4;
        g.label({ x: R, y: 3.4 }, `(x + y)² = ${num((X + Y) ** 2, 2)}`, { color: AM, size: 17, bold: true, align: "left" });
        g.label({ x: R, y: 2.5 }, `4xy = ${num(4 * X * Y, 2)}`, { color: C.ink, size: 17, bold: true, align: "left" });
        g.label({ x: R, y: 1.6 }, `hole (x − y)² = ${num((X - Y) ** 2, 2)}`, { color: C.red, size: 17, bold: true, align: "left" });
        return;
      }

      // Step 2: the semicircle on x + y.
      const u = 12 / (X + Y);
      const L: Vec = { x: -6, y: -2.4 };
      const O: Vec = { x: 0, y: -2.4 };
      const J: Vec = { x: L.x + X * u, y: L.y };
      const r = am * u;
      g.arc(O, r, 0, Math.PI, { color: C.ink, width: 2.5 });
      g.segment(L, J, { color: XC, width: 5 });
      g.segment(J, { x: 6, y: L.y }, { color: YC, width: 5 });
      g.label({ x: (L.x + J.x) / 2, y: L.y }, `x = ${num(X)}`, { color: XC, size: 14, bold: true, dy: -16 });
      g.label({ x: (J.x + 6) / 2, y: L.y }, `y = ${num(Y)}`, { color: YC, size: 14, bold: true, dy: -16 });
      const t = f.at(2);
      const top: Vec = { x: J.x, y: L.y + gm * u };
      g.segment({ x: -6, y: L.y }, top, { color: C.dim, width: 1.5, alpha: t });
      g.segment({ x: 6, y: L.y }, top, { color: C.dim, width: 1.5, alpha: t });
      g.segment(J, top, { color: GM, width: 4, alpha: t });
      g.label({ x: J.x, y: (L.y + top.y) / 2 }, `√(xy) = ${num(gm, 2)}`, { color: GM, size: 14, bold: true, dx: J.x < 0 ? 10 : -10, align: J.x < 0 ? "left" : "right", alpha: t });
      g.segment(O, { x: 0, y: L.y + r }, { color: AM, width: 4 });
      g.label({ x: 0, y: L.y + r }, `radius (x + y)/2 = ${num(am, 2)}`, { color: AM, size: 14, bold: true, dy: 16 });
      g.point(O, { color: AM, r: 4 });
    },

    readout(f) {
      const [X, Y] = [x.value, y.value];
      const am = (X + Y) / 2;
      const gm = Math.sqrt(X * Y);
      const eq = X === Y;
      const rows: Readout[] = [
        { label: "Arithmetic mean", tex: `\\frac{x + y}{2} = ${fmt(am, 2)}` },
        { label: "Geometric mean", tex: `\\sqrt{xy} = \\sqrt{${fmt(X * Y, 2)}} = ${fmt(gm, 3)}` },
        { label: eq ? "Equal, since x = y" : "AM–GM", tex: `${fmt(am, 2)} ${eq ? "=" : "\\ge"} ${fmt(gm, 3)}`, tone: "good" },
      ];
      if (f.step === 1) rows.push({ label: "Four rectangles and a hole", tex: `(x + y)^2 = 4xy + (x - y)^2 = ${fmt(4 * X * Y, 2)} + ${fmt((X - Y) ** 2, 2)}` });
      if (f.step === 3) rows.push({ label: "Same perimeter, square", tex: `xy = ${fmt(X * Y, 2)} \\le ${fmt(am * am, 2)} = \\left(\\frac{x + y}{2}\\right)^2` });
      return rows;
    },

    likes: [
      {
        title: "Sharing a field fairly",
        text: "Two neighbours own strips of 2 and 8 rows. Swapping to 5 rows each keeps the total the same but makes the product of their shares grow from 16 to 25. Evening out two numbers with a fixed sum always raises their product.",
      },
      {
        title: "Average of a stretch and a squash",
        text: "A photo stretched to twice its width and then squashed to half is back where it started, so the right average of the factors 2 and $\\frac12$ is 1, the geometric mean, not $1\\frac14$, the arithmetic mean. For growth and scaling, the geometric mean is the honest average, and it is never the larger of the two.",
      },
    ],

    uses: [
      {
        title: "A balance with unequal arms",
        text: "On a balance whose arms are not quite equal, an object weighs 4 kg in one pan and 9 kg in the other. The arm lengths cancel when the two readings are multiplied, so its true mass is $\\sqrt{4 \\cdot 9} = 6$ kg, the geometric mean. Averaging the readings would give 6.5 kg, too much by AM–GM.",
        tags: ["trade-tricks"],
        image: {
          src: unequalArmBalanceImage,
          caption: "Weighed in each pan of a balance with unequal arms, readings of 4 kg and 9 kg give a true mass of √(4 × 9) = 6 kg, below their average 6.5 kg.",
          alt: "Two drawings of a balance with a short and a long arm, the same box balanced by a 4 kg weight one way and by 9 kg the other, with the line √(4 × 9) = 6 kg in gold.",
        },
      },
      {
        title: "Average growth",
        text: "Something that grows 10% one year and 30% the next has been multiplied by $1.1 \\cdot 1.3 = 1.43$. The steady yearly rate with the same effect has $(1 + r)^2 = 1.43$, so $1 + r = \\sqrt{1.43} \\approx 1.196$, about 19.6%. By AM–GM that is never more than the plain average of 20%, and equal only when every year is the same.",
        tags: ["money", "nature"],
        image: {
          src: growthRatesAverageImage,
          caption: "Growth of 10% then 30% multiplies by 1.43, the same as about 19.6% twice: the geometric mean, below the 20% average.",
          alt: "Two bar charts growing from 100 to 143, one by 110 then 143 and one by about 119.6 then 143, with 19.6% in gold and 20% crossed out.",
        },
      },
    ],
  };
});
