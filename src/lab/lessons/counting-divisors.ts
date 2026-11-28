// Counting divisors. Every divisor of n = 2^a · 3^b · 5^c is 2^i · 3^j · 5^k
// with each exponent from 0 up to n's own, so the divisors fill a grid of
// exponents, (a + 1)(b + 1)(c + 1) cells. A divisor d and its partner n/d sit
// opposite each other in the grid, which is why only squares have an odd count.

import { C, tint } from "../draw.ts";
import { divisors } from "../kit/integers.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import chairRowsSixtyImage from "../../images/chair-rows-sixty.svg";
import degreesThreeSixtyDivisorsImage from "../../images/degrees-360-divisors.svg";

const TWO = C.cyan;
const THREE = C.pink;
const FIVE = C.green;
const GOLD = C.gold;

/** n = 2^a 3^b 5^c in TeX, leaving out the primes with exponent 0. */
function texN(a: number, b: number, c: number): string {
  const parts = ([[2, a], [3, b], [5, c]] as const)
    .filter(([, e]) => e > 0)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`));
  return parts.length ? parts.join(" \\cdot ") : "1";
}

export default lesson((s) => {
  const a = s.slider({ label: "power of 2", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 0, max: 4, value: 3, step: 1 });
  const b = s.slider({ label: "power of 3", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 0, max: 3, value: 2, step: 1 });
  const c = s.slider({ label: "power of 5", at: { x: 0, y: -4.3 }, width: 2.8, min: 0, max: 2, value: 0, step: 1 });

  return {
    steps: [
      {
        title: "A grid of divisors",
        text: "Every divisor of $72 = 2^3 \\cdot 3^2$ is $2^i \\cdot 3^j$, with $i$ from 0 to 3 and $j$ from 0 to 2, and no other primes, by the uniqueness of prime factorization. Lay them out with the power of 2 across and the power of 3 down: each cell holds a different divisor, and every divisor has a cell. So 72 has $4 \\times 3 = 12$ divisors.",
      },
      {
        title: "Why one more",
        text: "The exponent of 2 in a divisor of 72 can be 0, 1, 2 or 3: four choices from an exponent of 3, because 0 counts too. The gold row and column are the divisors with no 3 or no 2 in them. Choosing the two exponents is a two-stage choice, so by the multiplication principle $p^a q^b$, for different primes $p$ and $q$, has $(a + 1)(b + 1)$ divisors.",
      },
      {
        title: "More primes",
        text: "A third prime lays out one copy of the grid for each power of 5. For $360 = 2^3 \\cdot 3^2 \\cdot 5$ there are $4 \\cdot 3 \\cdot 2 = 24$ divisors. In general, if $n = p_1^{e_1} p_2^{e_2} \\cdots p_k^{e_k}$, then $n$ has $(e_1 + 1)(e_2 + 1) \\cdots (e_k + 1)$ divisors.",
      },
      {
        title: "Odd counts are squares",
        text: "Divisors pair off, $d$ with $\\frac{n}{d}$, and partners sit opposite each other, turning the grid half a turn about its centre. A divisor is its own partner only when $d^2 = n$, the centre cell, which exists when every exponent is even. So $n$ has an odd number of divisors exactly when it is a perfect square: $36 = 2^2 \\cdot 3^2$ has 9, with 6 in the middle.",
      },
    ],

    draw(g, f) {
      const [A, B, K] = [a.value, b.value, c.value];
      const N = 2 ** A * 3 ** B * 5 ** K;
      const cols = A + 1;
      const rows = B + 1;
      const blocks = K + 1;
      const gap = 0.7;
      const size = Math.min(1.15, 13.6 / (cols * blocks + gap * K), 5.2 / rows);
      const width = cols * blocks * size + gap * K;
      const x0 = -width / 2;
      const y0 = 3.3;
      const corner = (i: number, j: number, k: number) => ({ x: x0 + k * (cols * size + gap) + i * size, y: y0 - j * size });
      const centre = (i: number, j: number, k: number) => {
        const p = corner(i, j, k);
        return { x: p.x + size / 2, y: p.y - size / 2 };
      };
      const textSize = Math.max(10, Math.min(16, size * 15));

      for (let k = 0; k < blocks; k++) {
        if (K > 0) g.label({ x: corner(0, 0, k).x + (cols * size) / 2, y: y0 + 0.95 }, `× 5${sup(k)}`, { color: FIVE, size: 14, bold: true });
        for (let i = 0; i < cols; i++) g.label({ x: centre(i, 0, k).x, y: y0 + 0.35 }, `2${sup(i)}`, { color: TWO, size: 13, bold: true });
        for (let j = 0; j < rows; j++) {
          if (k === 0) g.label({ x: x0 - 0.35, y: centre(0, j, 0).y }, `3${sup(j)}`, { color: THREE, size: 13, bold: true, align: "right" });
          for (let i = 0; i < cols; i++) {
            const d = 2 ** i * 3 ** j * 5 ** k;
            const p = corner(i, j, k);
            const edge = f.step === 1 && (i === 0 || j === 0);
            const middle = f.step === 3 && 2 * i === A && 2 * j === B && 2 * k === K;
            const lit = edge || middle;
            g.polygon([p, { x: p.x + size, y: p.y }, { x: p.x + size, y: p.y - size }, { x: p.x, y: p.y - size }], {
              color: lit ? GOLD : C.dim,
              fill: lit ? tint(GOLD, 0.25 * (f.step === 1 ? f.at(1) : f.at(3))) : tint(C.cyan, 0.08),
              width: lit ? 2.5 : 1.5,
            });
            g.label(centre(i, j, k), String(d), { color: lit ? GOLD : C.ink, size: textSize, bold: true });
          }
        }
      }

      if (f.step === 3) {
        // Join each divisor to its partner, n/d, once.
        for (let k = 0; k < blocks; k++)
          for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
              const key = (k * rows + j) * cols + i;
              const partner = ((K - k) * rows + (B - j)) * cols + (A - i);
              if (key >= partner) continue;
              g.segment(centre(i, j, k), centre(A - i, B - j, K - k), { color: tint(C.violet, 0.55), width: 1.5, alpha: f.at(3) });
            }
      }

      const count = cols * rows * blocks;
      const yText = y0 - rows * size - 0.7;
      const counts = K > 0 ? `${cols} × ${rows} × ${blocks}` : `${cols} × ${rows}`;
      g.label({ x: 0, y: Math.max(yText, -2.3) }, `${N} has ${counts} = ${count} divisors`, { color: GOLD, size: 18, bold: true });
    },

    readout(f) {
      const [A, B, K] = [a.value, b.value, c.value];
      const N = 2 ** A * 3 ** B * 5 ** K;
      const count = divisors(N).length;
      const rows: Readout[] = [{ label: "n", tex: `n = ${texN(A, B, K)} = ${N}` }];
      rows.push({ label: "Divisors", tex: `(${A} + 1)(${B} + 1)(${K} + 1) = ${count}`, tone: "good" });
      if (f.step === 3) {
        const square = A % 2 === 0 && B % 2 === 0 && K % 2 === 0;
        rows.push(
          square
            ? { label: "Square", tex: `${N} = ${Math.round(Math.sqrt(N))}^2: \\text{odd count}`, tone: "good" }
            : { label: "Not a square", tex: `\\text{${count / 2} pairs}`, tone: "dim" },
        );
      }
      return rows;
    },

    likes: [
      {
        title: "Building a sandwich from a tray",
        text: "From a tray of 3 slices of cheese and 2 of ham, a sandwich can take 0 to 3 cheese and 0 to 2 ham: 4 times 3, or 12, different fillings, counting the empty one. The plus one in each bracket is the choice to take none.",
      },
      {
        title: "Partners at a dance",
        text: "If everyone at a dance has a partner, the head count is even. It is odd only when someone dances alone, the way a square number's square root is the one divisor paired with itself.",
      },
    ],

    uses: [
      {
        title: "Setting out chairs",
        text: "Sixty chairs can stand in equal rows in as many ways as 60 has divisors. Since $60 = 2^2 \\cdot 3 \\cdot 5$, that is $3 \\cdot 2 \\cdot 2 = 12$ ways, from 1 row of 60 to 60 rows of 1, including 6 rows of 10 and 5 rows of 12. That flexibility is one reason halls are often fitted with 60 or 120 chairs.",
        tags: ["building", "home"],
        image: {
          src: chairRowsSixtyImage,
          caption: "60 = 2² · 3 · 5 has (2 + 1)(1 + 1)(1 + 1) = 12 divisors, so 60 chairs make 12 different sets of equal rows.",
          alt: "Sixty chairs drawn as dots in 6 rows of 10, beside the twelve divisors of 60 with 6 and 10 picked out in gold.",
        },
      },
      {
        title: "Why a circle has 360 degrees",
        text: "Since $360 = 2^3 \\cdot 3^2 \\cdot 5$, it has $4 \\cdot 3 \\cdot 2 = 24$ divisors, more than any smaller number. So a full turn splits into whole degrees in 24 ways: halves, thirds, quarters, fifths, sixths, eighths, ninths, tenths, twelfths and more, which made it a handy number for early astronomers and is still handy for anyone marking out a dial.",
        tags: ["astronomy", "navigation"],
        image: {
          src: degreesThreeSixtyDivisorsImage,
          caption: "360 = 2³ · 3² · 5 has 4 · 3 · 2 = 24 divisors, so a full turn splits into equal whole-degree parts in 24 ways.",
          alt: "A dial marked every 30 degrees with a gold sector of 45 degrees, one eighth of the turn, beside the line 360 = 2³ · 3² · 5 and 4 × 3 × 2 = 24 divisors.",
        },
      },
    ],
  };
});
