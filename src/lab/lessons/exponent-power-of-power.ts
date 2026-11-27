// Raising a power to a power stacks its row of factors into a grid, so the
// exponents multiply. Raising a product to a power splits each factor into
// its parts, so the power falls on each of them.

import { C } from "../draw.ts";
import { bracket, powerText, row, tile } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import cakeTinSizesImage from "../../images/cake-tin-sizes.svg";
import screenColoursImage from "../../images/screen-colours.svg";

const ROW_COLORS = [C.cyan, C.green, C.blue, C.violet];
const rowY = (i: number): number => 3 - i * 1.15;

export default lesson((s) => {
  const m = s.slider({ label: "m =", at: { x: -6.6, y: -4.3 }, width: 3.4, min: 1, max: 5, value: 3, step: 1 });
  const n = s.slider({ label: "n =", at: { x: -0.8, y: -4.3 }, width: 3.4, min: 1, max: 4, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "A power of a power",
        text: "$(a^m)^n$ means $n$ copies of $a^m$ multiplied together. Each copy is a row of $m$ factors of $a$, so lay the copies one under another.",
      },
      {
        title: "Count the grid",
        text: "The rows make a grid of $n$ rows and $m$ columns, and a grid holds $m \\times n$ squares. Every square is a factor of $a$, so $(a^m)^n = a^{mn}$: the exponents multiply.",
      },
      {
        title: "Not a tower",
        text: "Brackets matter. $(2^3)^2 = 2^6 = 64$, but $2^{3^2}$ means $2$ to the power $3^2 = 9$, which is $512$. A tower of exponents is worked out from the top down, and it has no simple rule.",
      },
      {
        title: "A power of a product",
        text: "Now let each factor be a product $ab$. Then $(ab)^n$ is $n$ factors of $ab$; sort the $a$'s from the $b$'s and there are $n$ of each, so $(ab)^n = a^n b^n$. Sums do not split this way: $(a + b)^2$ is not $a^2 + b^2$.",
      },
    ],

    draw(g, f) {
      const [mm, nn] = [m.value, n.value];

      if (f.step < 3) {
        for (let i = 0; i < nn; i++) {
          const color = ROW_COLORS[i];
          const cells = row(mm, 0.6, rowY(i));
          cells.forEach((p) => tile(g, p, "a", { color }));
          g.label({ x: cells[0].x - 1.1, y: rowY(i) }, powerText("a", mm), { color, size: 16, bold: true, align: "right", dy: -6 });
        }
        if (f.at(1) > 0) {
          const cells = row(mm, 0.6, 0);
          const bottom = rowY(nn - 1) - 0.6;
          bracket(g, { x: cells[0].x - 0.45, y: bottom }, { x: cells[mm - 1].x + 0.45, y: bottom }, `${mm} × ${nn} = ${mm * nn} factors`, {
            alpha: f.at(1),
          });
        }
        return;
      }

      // (ab)^n: one row of mixed factors above, sorted into two rows below.
      const mixed = row(nn, 0, 3);
      mixed.forEach((p) => tile(g, p, "ab", { color: C.gold }));
      g.label({ x: mixed[0].x - 1.1, y: 3 }, powerText("(ab)", nn), { color: C.gold, size: 16, bold: true, align: "right", dy: -6 });
      g.arrow({ x: 0, y: 2.2 }, { x: 0, y: 1.3 }, { color: C.dim, width: 2 });
      const as = row(nn, 0, 0.6);
      const bs = row(nn, 0, -0.6);
      as.forEach((p) => tile(g, p, "a", { color: C.cyan }));
      bs.forEach((p) => tile(g, p, "b", { color: C.pink }));
      g.label({ x: as[0].x - 1.1, y: 0.6 }, powerText("a", nn), { color: C.cyan, size: 16, bold: true, align: "right", dy: -6 });
      g.label({ x: bs[0].x - 1.1, y: -0.6 }, powerText("b", nn), { color: C.pink, size: 16, bold: true, align: "right", dy: -6 });
    },

    readout(f) {
      const [mm, nn] = [m.value, n.value];
      if (f.step === 3) {
        return [
          { label: "Sorted", tex: `(ab)^{${nn}} = a^{${nn}} b^{${nn}}` },
          { label: "With a = 2, b = 3", tex: `6^{${nn}} = ${6 ** nn} = ${2 ** nn} \\cdot ${3 ** nn} = 2^{${nn}} \\cdot 3^{${nn}}`, tone: "good" },
        ];
      }
      const rows: Readout[] = [{ label: "Rows of the grid", tex: `(a^{${mm}})^{${nn}} = ${Array.from({ length: nn }, () => `a^{${mm}}`).join(" \\cdot ")}` }];
      if (f.step >= 1) rows.push({ label: "Counted", tex: `(a^{${mm}})^{${nn}} = a^{${mm} \\cdot ${nn}} = a^{${mm * nn}}`, tone: "good" });
      if (f.step >= 2) {
        rows.push({ label: "With a = 2", tex: `(2^{${mm}})^{${nn}} = ${2 ** (mm * nn)}` });
        rows.push({ label: "The tower", tex: `2^{${mm}^{${nn}}} = 2^{${mm ** nn}}${mm ** nn <= 30 ? ` = ${2 ** (mm ** nn)}` : ""}`, tone: mm ** nn === mm * nn ? "plain" : "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "Egg boxes in a crate",
        text: "A box holds a row of eggs, and a crate holds a row of boxes. Count the eggs in a crate by multiplying the two counts, not by adding them. Exponents in brackets work the same way: $(a^m)^n$ is $n$ boxes of $m$ factors each.",
      },
      {
        title: "A thousand thousands",
        text: "A thousand is $10^3$, and a million is a thousand thousands: $(10^3)^2 = 10^6$, six zeros, not five. A billion is a thousand millions, $10^9 = (10^3)^3$.",
      },
    ],

    uses: [
      {
        title: "Colours on a screen",
        text: "Each pixel on a screen mixes red, green and blue light, and each of the three is stored in 8 bits, $2^8 = 256$ levels. The number of colours is $256 \\cdot 256 \\cdot 256 = (2^8)^3 = 2^{24}$, about 16.7 million. Graphics files call this 24-bit colour, because the bits multiply out: $8 \\times 3 = 24$.",
        tags: ["computing", "game-design"],
        image: {
          src: screenColoursImage,
          caption: "A screen pixel mixes red, green and blue, each at 2⁸ = 256 levels, for (2⁸)³ = 2²⁴, about 16.7 million colours.",
          alt: "A monitor with one pixel enlarged into red, green and blue bars, each ruled with gold steps, and the label (2⁸)³ = 2²⁴.",
        },
      },
      {
        title: "A bigger cake tin",
        text: "A square tin whose sides are twice as long has a base of $(2s)^2 = 2^2 s^2 = 4s^2$: four times the area, so four times the batter for a cake of the same depth. A tin three times as wide needs $3^2 = 9$ times as much. The same rule, $(ks)^3 = k^3 s^3$, says a box twice as wide, deep and tall holds 8 times as much.",
        tags: ["home"],
        image: {
          src: cakeTinSizesImage,
          caption: "A square tin with sides twice as long has (2s)² = 4s² of base, so it needs four times the batter for a cake of the same depth.",
          alt: "A small square cake tin beside one twice as wide, the larger divided by gold dashed lines into four squares the size of the smaller, with gold measuring lines under them marked s and 2s.",
        },
      },
    ],
  };
});
