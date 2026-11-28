// Proof in words. Examples suggest that two odd numbers always add to an
// even one, but no list of examples covers every pair. Naming the numbers
// 2a + 1 and 2b + 1 does: as dots, each odd number is pairs plus one, and the
// two leftover dots make one more pair. The proof is then written out as
// sentences, each following from the ones before.

import { C } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import parityCheckBitImage from "../../images/parity-check-bit.svg";
import knightColourSwapImage from "../../images/knight-colour-swap.svg";

const M = C.cyan;
const N = C.pink;
const SPARE = C.gold;
const GAP = 0.34;
const R = 5;

export default lesson((s) => {
  // The sliders pick a and b; the odd numbers are 2a + 1 and 2b + 1.
  const odd = (v: number): string => String(2 * v + 1);
  const m = s.slider({ label: "first odd =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 9, value: 3, step: 1, format: odd });
  const n = s.slider({ label: "second odd =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 9, value: 2, step: 1, format: odd });

  return {
    steps: [
      {
        title: "Examples are not a proof",
        text: "Add two odd numbers: $1 + 3 = 4$, $7 + 5 = 12$, $19 + 9 = 28$. Every sum you try is even, which makes the claim believable, but there are infinitely many pairs and you can only try some of them. A proof must say why the claim holds for every pair at once, including the ones nobody has tried.",
      },
      {
        title: "Name the numbers",
        text: "An odd number is one more than an even number, so every odd number can be written $2a + 1$ for some whole number $a$. As dots, that is $a$ columns of two with one dot left over. For $7$, $a = 3$; for $5$, $b = 2$. Letters stand for every odd number at once, which examples never can.",
      },
      {
        title: "Add them",
        text: "Put the dots together. The pairs stay pairs, and the two leftover dots make one more pair, so nothing is left over: $(2a + 1) + (2b + 1) = 2a + 2b + 2 = 2(a + b + 1)$. That is twice a whole number, so it is even, whatever $a$ and $b$ are.",
      },
      {
        title: "Write it in words",
        text: "A proof in words says what is given, then takes steps that each follow from what came before, and ends with what was to be shown. Each line here can be checked on its own: that is what makes the argument a proof rather than a pattern. The same steps show that an odd number times an odd number is odd.",
      },
    ],

    draw(g, f) {
      const [a, b] = [m.value, n.value];
      const [mv, nv] = [2 * a + 1, 2 * b + 1];
      const x0 = -7.3;

      /** `pairs` columns of two dots from x, then one spare dot on top. */
      const dots = (x: number, y: number, pairs: number, color: string, spare: string): void => {
        for (let i = 0; i < pairs; i++) {
          g.point({ x: x + i * GAP, y }, { color, r: R });
          g.point({ x: x + i * GAP, y: y - GAP }, { color, r: R });
        }
        g.point({ x: x + pairs * GAP, y }, { color: spare, r: R });
      };

      const showSpare = f.step >= 1;
      dots(x0, 3.4, a, M, showSpare ? SPARE : M);
      g.label({ x: x0 - 0.2, y: 3.4 }, `${mv}`, { color: M, size: 16, bold: true, align: "right", dy: -6 });
      dots(x0, 2.0, b, N, showSpare ? SPARE : N);
      g.label({ x: x0 - 0.2, y: 2.0 }, `${nv}`, { color: N, size: 16, bold: true, align: "right", dy: -6 });
      if (showSpare) {
        g.label({ x: x0 + a * GAP + 0.3, y: 3.4 }, `2·${a} + 1`, { color: M, size: 14, bold: true, align: "left", dy: -6 });
        g.label({ x: x0 + b * GAP + 0.3, y: 2.0 }, `2·${b} + 1`, { color: N, size: 14, bold: true, align: "left", dy: -6 });
      }

      // The sum: m's pairs, n's pairs, then the two spares stood together as a pair.
      const y = -0.2;
      const join = f.step >= 2 ? f.at(2) : 0;
      for (let i = 0; i < a; i++) {
        g.point({ x: x0 + i * GAP, y }, { color: M, r: R });
        g.point({ x: x0 + i * GAP, y: y - GAP }, { color: M, r: R });
      }
      for (let i = 0; i < b; i++) {
        g.point({ x: x0 + (a + i) * GAP, y }, { color: N, r: R });
        g.point({ x: x0 + (a + i) * GAP, y: y - GAP }, { color: N, r: R });
      }
      const last = x0 + (a + b) * GAP;
      const spareColor = f.step === 0 ? C.ink : SPARE;
      g.point({ x: last, y }, { color: spareColor, r: R });
      g.point({ x: last + GAP * (1 - join), y: y - GAP * join }, { color: spareColor, r: R });
      g.label({ x: x0 - 0.2, y }, `${mv + nv}`, { color: C.ink, size: 16, bold: true, align: "right", dy: -6 });
      if (f.step >= 2) {
        g.polygon(
          [
            { x: last - 0.17, y: y + 0.17 },
            { x: last + 0.17, y: y + 0.17 },
            { x: last + 0.17, y: y - GAP - 0.17 },
            { x: last - 0.17, y: y - GAP - 0.17 },
          ],
          { color: SPARE, width: 2, alpha: join },
        );
        g.label({ x: x0, y: y - 0.9 }, `${a + b + 1} pairs, none left over: even`, { color: SPARE, size: 15, bold: true, align: "left", alpha: join });
      } else if (f.step === 0) {
        g.label({ x: x0, y: y - 0.9 }, `${mv} + ${nv} = ${mv + nv}, even`, { color: C.ink, size: 15, bold: true, align: "left" });
      }

      // The right-hand column: examples, then algebra, then the written proof.
      const lines: [string, string][] =
        f.step === 0
          ? [
              ["1 + 3 = 4", C.ink],
              ["7 + 5 = 12", C.ink],
              ["19 + 9 = 28", C.ink],
              [`${mv} + ${nv} = ${mv + nv}`, SPARE],
              ["… and infinitely many more", C.dim],
            ]
          : f.step === 1
            ? [
                ["odd = 2 × whole + 1", C.ink],
                [`${mv} = 2·${a} + 1`, M],
                [`${nv} = 2·${b} + 1`, N],
              ]
            : f.step === 2
              ? [
                  ["(2a + 1) + (2b + 1)", C.ink],
                  ["= 2a + 2b + 2", C.ink],
                  ["= 2(a + b + 1)", SPARE],
                  [`= 2 × ${a + b + 1} = ${mv + nv}`, C.dim],
                ]
              : [
                  ["1. Let m and n be odd.", C.ink],
                  ["2. So m = 2a + 1 and n = 2b + 1,", C.ink],
                  ["    for whole numbers a and b.", C.ink],
                  ["3. Then m + n = 2a + 2b + 2", C.ink],
                  ["    = 2(a + b + 1).", C.ink],
                  ["4. a + b + 1 is whole,", C.ink],
                  ["    so m + n is even.  ∎", SPARE],
                ];
      const at: Vec = { x: 1.2, y: 3.6 };
      lines.forEach(([text, color], i) => {
        const alpha = f.step === 3 ? Math.min(1, f.at(3) * lines.length - i + 0.5) : 1;
        g.label({ x: at.x, y: at.y - i * (f.step === 3 ? 0.78 : 0.9) }, text, { color, size: 17, bold: true, align: "left", alpha });
      });
    },

    readout(f) {
      const [a, b] = [m.value, n.value];
      const [mv, nv] = [2 * a + 1, 2 * b + 1];
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "One example", tex: `${mv} + ${nv} = ${mv + nv}`, tone: "dim" });
      else rows.push({ label: "Named", tex: `${mv} = 2 \\cdot ${a} + 1, \\quad ${nv} = 2 \\cdot ${b} + 1` });
      if (f.step >= 2) rows.push({ label: "Sum", tex: `${mv} + ${nv} = 2(${a} + ${b} + 1) = 2 \\cdot ${a + b + 1}`, tone: "good" });
      if (f.step === 3) rows.push({ label: "Product", tex: `(2a + 1)(2b + 1) = 2(2ab + a + b) + 1 = ${mv * nv}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "Showing your working",
        text: "A teacher who sees only the answer cannot tell luck from understanding. Written working lets them check each line on its own, and a proof is working that leaves no line unexplained.",
      },
      {
        title: "Pairing up for a dance",
        text: "Two groups each have one person without a partner. Put the groups together and the two left-over people pair with each other, so everyone has a partner. That is the whole proof, told about people instead of dots.",
      },
    ],

    uses: [
      {
        title: "Parity bits",
        text: "A computer sending 7 bits adds an eighth, chosen so the number of 1s is even. If noise flips a single bit, the count of 1s changes by one and becomes odd, and the receiver knows the byte was damaged. The check works because of facts about odd and even proved exactly as here, not merely observed.",
        tags: ["computing"],
        image: {
          src: parityCheckBitImage,
          caption: "A parity bit makes the number of 1s even; one flipped bit makes it odd, so the error shows.",
          alt: "Two rows of eight bit boxes. The top row, 1011001 with parity bit 0, has four 1s and is marked even. In the bottom row one bit, outlined in gold, has flipped to make five 1s, marked odd.",
        },
      },
      {
        title: "A knight changes colour",
        text: "A chess knight moves 2 squares one way and 1 the other, 3 in all, which is odd, so every move takes it to a square of the other colour. After an odd number of moves it is always on the other colour, so it can never return to its starting square in an odd number of moves. A proof settles this for every route at once.",
        tags: ["game-design"],
        image: {
          src: knightColourSwapImage,
          caption: "Each knight move covers 2 + 1 = 3 squares, an odd number, so it always lands on the other colour.",
          alt: "A chessboard corner with a knight and the eight squares it can reach, all of the opposite colour, one move drawn as a gold L of two squares and one square.",
        },
      },
    ],
  };
});
