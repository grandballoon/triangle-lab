// Percent. p% is p hundredths, shown as p squares of a hundred; p% of a
// number is p/100 times it; a rise or a cut by p% multiplies by 1 ± p/100;
// and one percent change after another multiplies the factors, so +20% then
// −20% does not get back where it started.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { box, texNum } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import roadGradeSignImage from "../../images/road-grade-sign.svg";
import saleOnSaleImage from "../../images/sale-on-sale.svg";

const GRID = C.cyan;
const PART = C.gold;
const FIRST = C.pink;
const SECOND = C.violet;
/** The price the bars start from, in dollars. */
const PRICE = 80;
/** Room for the longest bar, in stage units: the bars are scaled to fit it. */
const ROOM = 7.5;
const BAR_X = -0.5;
const BAR_H = 0.7;
const CELL = 0.5;
const GRID_X = -7.2;
const GRID_Y = -3.2;

const signed = (v: number): string => (v < 0 ? `−${Math.abs(v)}%` : `+${v}%`);
/** A percent change for TeX: +20\%, -20\%. */
const texChange = (v: number): string => `${v < 0 ? "-" : "+"}${Math.abs(v)}\\%`;
/** The multiplier for a change of v percent, for TeX. */
const texFactor = (v: number): string => fmt(1 + v / 100, 2);

export default lesson((s) => {
  const p = s.slider({ label: "p =", format: (v) => `${v}%`, at: { x: -7.6, y: -4.3 }, width: 3.4, min: 0, max: 100, value: 20, step: 1 });
  const q = s.slider({ label: "then q =", format: signed, at: { x: 1.6, y: -4.3 }, width: 3.4, min: -50, max: 50, value: -20, step: 5 });

  return {
    steps: [
      {
        title: "Per hundred",
        text: "Percent means per hundred: $p\\%$ is $\\frac{p}{100}$. The grid has 100 squares, so $p\\%$ of it is $p$ squares. $25\\%$ is $\\frac{25}{100} = \\frac14 = 0.25$, a quarter of the grid, and $100\\%$ is all of it.",
      },
      {
        title: "Percent of a number",
        text: "$p\\%$ of a number is $\\frac{p}{100}$ times it. For an $\\text{\\textdollar}80$ jacket, $20\\%$ of 80 is $0.2 \\times 80 = 16$. The bar is the grid stretched out to 80, so each of its hundredths is worth $0.8$.",
      },
      {
        title: "Up or down by a percent",
        text: "Raising 80 by $p\\%$ adds $\\frac{p}{100} \\cdot 80$, which is the same as multiplying by $1 + \\frac{p}{100}$. Cutting it by $p\\%$ multiplies by $1 - \\frac{p}{100}$. So a $20\\%$ rise multiplies by 1.2, and a $20\\%$ discount by 0.8.",
      },
      {
        title: "One change after another",
        text: "Percent changes multiply; they do not add. Raise 80 by $20\\%$ to 96, then cut that by $20\\%$: $96 \\times 0.8 = 76.8$, not 80, because the second $20\\%$ is taken of a bigger number. In all, $1.2 \\times 0.8 = 0.96$, a $4\\%$ loss. Set $q$ to try other pairs.",
      },
    ],

    draw(g, f) {
      const P = p.value;
      // The hundred squares, filled from the bottom row up.
      for (let i = 0; i < 100; i++) {
        const [col, row] = [i % 10, Math.floor(i / 10)];
        const a = { x: GRID_X + col * CELL, y: GRID_Y + row * CELL };
        const on = i < P;
        box(g, a, { x: a.x + CELL, y: a.y + CELL }, { color: tint(GRID, 0.5), fill: on ? tint(GRID, 0.55) : undefined, width: 1 });
      }
      g.label({ x: GRID_X + 5 * CELL, y: GRID_Y + 10 * CELL }, `${P} of 100 squares = ${P}%`, { color: GRID, size: 15, bold: true, dy: 16 });

      if (f.step === 0) return;

      // Stage units per dollar: as large as the longest bar on show allows.
      const longest = Math.max(PRICE, PRICE * (1 + P / 100), f.step === 3 ? PRICE * (1 + P / 100) * (1 + q.value / 100) : 0);
      const PER = Math.min(0.085, ROOM / longest);
      const bar = (y: number, amount: number, color: string, text: string, alpha = 1): void => {
        box(g, { x: BAR_X, y }, { x: BAR_X + amount * PER, y: y + BAR_H }, { color, fill: tint(color, 0.3), width: 2, alpha });
        g.label({ x: BAR_X, y: y + BAR_H }, text, { color, size: 14, bold: true, dy: 12, align: "left", alpha });
      };
      const [top, mid, low] = [2.6, 1.0, -0.6];

      if (f.step === 1) {
        bar(top, PRICE, C.dim, "$80");
        const part = (P / 100) * PRICE;
        box(g, { x: BAR_X, y: top }, { x: BAR_X + part * PER, y: top + BAR_H }, { color: PART, fill: tint(PART, 0.6), width: 2, alpha: f.at(1) });
        g.label({ x: BAR_X, y: top }, `${P}% of 80 = ${texNum(part)}`, { color: PART, size: 15, bold: true, dy: -18, align: "left", alpha: f.at(1) });
        return;
      }

      g.segment({ x: BAR_X + PRICE * PER, y: low - 0.3 }, { x: BAR_X + PRICE * PER, y: top + BAR_H + 0.6 }, { color: C.faint, width: 1.5, dash: [4, 5] });
      bar(top, PRICE, C.dim, "$80");
      if (f.step === 2) {
        const up = PRICE * (1 + P / 100);
        const down = PRICE * (1 - P / 100);
        bar(mid, up, FIRST, `up ${P}%: × ${fmt(1 + P / 100, 2)} = ${texNum(up)}`, f.at(2));
        bar(low, down, SECOND, `down ${P}%: × ${fmt(1 - P / 100, 2)} = ${texNum(down)}`, f.at(2));
        if (P > 0) box(g, { x: BAR_X + down * PER, y: low }, { x: BAR_X + PRICE * PER, y: low + BAR_H }, { color: SECOND, width: 1.5, dash: [4, 4], alpha: f.at(2) });
      } else {
        const once = PRICE * (1 + P / 100);
        const twice = once * (1 + q.value / 100);
        bar(mid, once, FIRST, `${signed(P)}: × ${fmt(1 + P / 100, 2)} = ${texNum(once)}`, f.at(3));
        bar(low, twice, SECOND, `then ${signed(q.value)}: × ${fmt(1 + q.value / 100, 2)} = ${texNum(twice)}`, f.at(3));
      }
    },

    readout(f) {
      const P = p.value;
      const rows: Readout[] = [{ label: "Percent", tex: `${P}\\% = \\frac{${P}}{100} = ${fmt(P / 100, 2)}` }];
      if (f.step === 1) {
        rows.push({ label: "Of 80", tex: `${fmt(P / 100, 2)} \\times 80 = ${texNum((P / 100) * PRICE)}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Up", tex: `80 \\times \\left(1 + \\frac{${P}}{100}\\right) = 80 \\times ${texFactor(P)} = ${texNum(PRICE * (1 + P / 100))}` });
        rows.push({ label: "Down", tex: `80 \\times \\left(1 - \\frac{${P}}{100}\\right) = 80 \\times ${texFactor(-P)} = ${texNum(PRICE * (1 - P / 100))}` });
      } else if (f.step === 3) {
        const factor = (1 + P / 100) * (1 + q.value / 100);
        const net = Math.round((factor - 1) * 10000) / 100;
        rows.push({ label: "Factors", tex: `${texFactor(P)} \\times ${texFactor(q.value)} = ${fmt(factor, 4)}` });
        rows.push({
          label: "In all",
          tex: `80 \\times ${fmt(factor, 4)} = ${texNum(PRICE * factor)},\\ \\text{a change of } ${texChange(net)}`,
          tone: "good",
        });
        rows.push({ label: "Not the sum", tex: `${texChange(P)} ${texChange(q.value)} = ${texChange(P + q.value)}`, tone: "dim" });
      }
      return rows;
    },

    likes: [
      {
        title: "Marks out of a hundred",
        text: "A score of 18 out of 25 is hard to compare with 35 out of 50 until both are made out of 100: $\\frac{18}{25} = \\frac{72}{100}$ and $\\frac{35}{50} = \\frac{70}{100}$, so 72% beats 70%. Percent puts every fraction over the same bottom.",
      },
      {
        title: "Shrinking and enlarging a photo",
        text: "Shrink a photo to 50% and then enlarge the copy to 150%: it ends up at 75% of the original size, since $0.5 \\times 1.5 = 0.75$. Each copy works on the one before it, so the settings multiply.",
      },
    ],

    uses: [
      {
        title: "A sale on a sale",
        text: "A $\\text{\\textdollar}100$ coat marked 20% off, with another 10% off at the till, costs $100 \\times 0.8 \\times 0.9 = \\text{\\textdollar}72$: 28% off in all, not 30%. The second discount is taken from the already lower price.",
        tags: ["money"],
        image: {
          src: saleOnSaleImage,
          caption: "20% off and then another 10% off is 28% off in all, not 30%: the price is multiplied by 0.8 and then 0.9.",
          alt: "Three price tags in a row, $100 crossed out, $80 crossed out and a gold $72, joined by gold arrows marked × 0.8 and × 0.9, above 0.8 × 0.9 = 0.72 and 28% off, not 30%.",
        },
      },
      {
        title: "Road grades",
        text: "A road sign warning of a 6% grade means the road climbs 6 feet for every 100 feet across: its slope is $\\frac{6}{100}$. Over a mile of 5280 feet that is $0.06 \\times 5280 \\approx 317$ feet of climb, which matters to heavy trucks braking downhill.",
        tags: ["travel"],
        image: {
          src: roadGradeSignImage,
          caption: "A 6% grade climbs 6 feet for every 100 feet along the road.",
          alt: "A road gently climbing to the right past a yellow diamond truck-on-slope warning sign with a 6% plate, and a gold right triangle under the road, drawn to scale, marked 100 ft across and 6 ft up, with the line up 6 ft per 100 ft.",
        },
      },
    ],
  };
});
