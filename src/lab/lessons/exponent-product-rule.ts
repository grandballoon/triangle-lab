// What an exponent counts. A power is a row of equal factors, so multiplying
// two powers of one base lays their rows end to end and the counts add, and
// dividing them cancels factors in pairs and the counts subtract.

import { C } from "../draw.ts";
import { bracket, powerText, row, tile } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import bacteriaDoublingImage from "../../images/bacteria-doubling.svg";
import memorySizesImage from "../../images/memory-sizes.svg";

const FIRST = C.cyan;
const SECOND = C.pink;

export default lesson((s) => {
  const base = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3, min: 2, max: 5, value: 2, step: 1 });
  const m = s.slider({ label: "m =", at: { x: -2.6, y: -4.3 }, width: 3, min: 1, max: 5, value: 3, step: 1 });
  const n = s.slider({ label: "n =", at: { x: 2.4, y: -4.3 }, width: 3, min: 1, max: 4, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "A power counts factors",
        text: "$a^m$ means $m$ factors of $a$ multiplied together: $2^3 = 2 \\cdot 2 \\cdot 2 = 8$. The base $a$ is what is multiplied, and the exponent $m$ only counts how many times.",
      },
      {
        title: "Multiplying adds the counts",
        text: "Multiply $a^m$ by $a^n$ and the two rows of factors simply join into one row of $m + n$. So $a^m \\cdot a^n = a^{m+n}$, whatever $a$ is. This only works when the bases match: $2^3 \\cdot 5^2$ is not a single power.",
      },
      {
        title: "Dividing cancels the counts",
        text: "In $\\frac{a^m}{a^n}$ each factor below cancels one above. When $m > n$, $m - n$ factors are left on top, so $\\frac{a^m}{a^n} = a^{m-n}$. Drag $n$ past $m$ and the factors left over are underneath, a puzzle the next lesson settles.",
      },
    ],

    draw(g, f) {
      const a = base.value;
      const [mm, nn] = [m.value, n.value];

      if (f.step < 2) {
        // The two powers, each a row named at its left, and below them the row they make together.
        const name = (y: number, count: number, text: string, color: string, alpha = 1): void =>
          g.label({ x: -count / 2 - 0.4, y }, text, { color, size: 17, bold: true, align: "right", alpha });
        const top = row(mm, 0, 3);
        top.forEach((p) => tile(g, p, String(a), { color: FIRST }));
        name(3, mm, powerText(a, mm), FIRST);
        if (f.at(1) > 0) {
          const alpha = f.at(1);
          row(nn, 0, 1.4).forEach((p) => tile(g, p, String(a), { color: SECOND, alpha }));
          name(1.4, nn, `× ${powerText(a, nn)}`, SECOND, alpha);
          const joined = row(mm + nn, 0, -0.8);
          joined.forEach((p, i) => tile(g, p, String(a), { color: i < mm ? FIRST : SECOND, alpha }));
          name(-0.8, mm + nn, `= ${powerText(a, mm + nn)}`, C.gold, alpha);
          bracket(g, { x: joined[0].x - 0.45, y: -1.4 }, { x: joined[mm + nn - 1].x + 0.45, y: -1.4 }, `${mm} + ${nn} = ${mm + nn} factors`, { alpha });
        }
        return;
      }

      // The quotient: one row over the other, matched factors struck out.
      const cancel = Math.min(mm, nn);
      const width = Math.max(mm, nn);
      const left = -(width - 1) / 2;
      for (let i = 0; i < mm; i++) tile(g, { x: left + i, y: 2.4 }, String(a), { color: FIRST, struck: i < cancel });
      g.segment({ x: left - 0.6, y: 1.6 }, { x: left + width - 0.4, y: 1.6 }, { color: C.ink, width: 3 });
      for (let i = 0; i < nn; i++) tile(g, { x: left + i, y: 0.8 }, String(a), { color: SECOND, struck: i < cancel });
      g.label({ x: 0, y: -1 }, mm === nn ? "everything cancels" : mm > nn ? `${mm - nn} left on top` : `${nn - mm} left underneath`, {
        color: C.gold,
        size: 16,
        bold: true,
      });
    },

    readout(f) {
      const a = base.value;
      const [mm, nn] = [m.value, n.value];
      const factors = (k: number): string => Array.from({ length: k }, () => a).join(" \\cdot ");
      const rows: Readout[] = [{ label: "The first power", tex: `${a}^{${mm}} = ${factors(mm)} = ${a ** mm}` }];
      if (f.step === 1) {
        rows.push({ label: "The second", tex: `${a}^{${nn}} = ${a ** nn}` });
        rows.push({ label: "Together", tex: `${a}^{${mm}} \\cdot ${a}^{${nn}} = ${a}^{${mm} + ${nn}} = ${a}^{${mm + nn}} = ${a ** (mm + nn)}`, tone: "good" });
      }
      if (f.step === 2) {
        rows.push({ label: "Divided by", tex: `${a}^{${nn}} = ${a ** nn}` });
        if (mm > nn) {
          rows.push({ label: "Quotient", tex: `\\frac{${a}^{${mm}}}{${a}^{${nn}}} = ${a}^{${mm} - ${nn}} = ${a}^{${mm - nn}} = ${a ** (mm - nn)}`, tone: "good" });
        } else if (mm === nn) {
          rows.push({ label: "Quotient", tex: `\\frac{${a}^{${mm}}}{${a}^{${nn}}} = 1,\\ \\text{and } ${a}^{${mm} - ${nn}} = ${a}^{0}\\ ?`, tone: "warn" });
        } else {
          rows.push({ label: "Quotient", tex: `\\frac{${a}^{${mm}}}{${a}^{${nn}}} = \\frac{1}{${a}^{${nn - mm}}},\\ \\text{and } ${a}^{${mm} - ${nn}} = ${a}^{${mm - nn}}\\ ?`, tone: "warn" });
        }
      }
      return rows;
    },

    likes: [
      {
        title: "Counting the folds",
        text: "Fold a sheet of paper in half and it is 2 layers thick; fold again and it is 4, then 8. Three folds give $2^3$ layers. Make three folds, then two more, and you have made five, so the thickness is $2^3 \\cdot 2^2 = 2^5 = 32$ layers. You never multiply the 8 by the 4 in your head; you just count the folds.",
      },
      {
        title: "Zeros on a cheque",
        text: "A thousand is $10^3$, three zeros, and a hundred is $10^2$, two. A thousand hundreds is written by putting the zeros side by side: $100\\,000$, five zeros, $10^5$. Multiplying powers of ten is just adding up zeros, and that is the product rule.",
      },
    ],

    uses: [
      {
        title: "Bacteria doubling",
        text: "Some bacteria split in two about every 20 minutes when food is plentiful, so one cell becomes $2^3 = 8$ in an hour. After two hours it has doubled six times: $2^3 \\cdot 2^3 = 2^6 = 64$ cells. After a whole day it would have doubled 72 times, $2^{72}$ cells, which is why a colony always runs out of food long before then.",
        tags: ["nature", "health"],
        image: {
          src: bacteriaDoublingImage,
          caption: "Bacteria splitting every 20 minutes: three doublings an hour make 2³ = 8 times as many, and two hours make 2³ · 2³ = 2⁶ = 64.",
          alt: "Rows of rounded green cells, one, two, four and eight, each row twice the one before, with a gold bracket marked 2³ across the three doublings.",
        },
      },
      {
        title: "Kibibytes and mebibytes",
        text: "Computer memory is built in powers of two, so its units are too: $2^{10} = 1024$ bytes make a kibibyte, and $2^{10}$ kibibytes make a mebibyte, $2^{10} \\cdot 2^{10} = 2^{20}$ bytes. A gibibyte is $2^{10}$ more again, $2^{30}$ bytes. Each step up the ladder adds 10 to the exponent.",
        tags: ["computing"],
        image: {
          src: memorySizesImage,
          caption: "Computer memory counts in powers of two: 2¹⁰ bytes make a kibibyte, and 2¹⁰ of those make 2²⁰, a mebibyte.",
          alt: "A small block labelled 2¹⁰ beside a larger square block built from a grid of blocks the same size, labelled 2²⁰, with a gold dashed arrow from the small block to the large one.",
        },
      },
    ],
  };
});
