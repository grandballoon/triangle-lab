// Arithmetic sequences and series. Each term is the last plus a fixed
// difference d, so the terms stand as a staircase of columns. Turn a copy of
// the staircase upside down on top of it and every column holds first + last:
// the two make an n × (first + last) rectangle, and the sum is half of it.

import { C, tint } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { listText, sub } from "../kit/sequences.ts";
import { lesson, type Readout } from "../scene.ts";
import seatRowsTotalImage from "../../images/seat-rows-total.svg";
import pipePileRowsImage from "../../images/pipe-pile-rows.svg";

const STAIR = C.cyan;
const COPY = C.violet;
const GOLD = C.gold;

export default lesson((s) => {
  const first = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 1, max: 5, value: 1, step: 1 });
  const diff = s.slider({ label: "d =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 0, max: 3, value: 1, step: 1 });
  const count = s.slider({ label: "n =", at: { x: 0, y: -4.3 }, width: 2.8, min: 2, max: 10, value: 6, step: 1 });

  return {
    steps: [
      {
        title: "Equal steps",
        text: "An arithmetic sequence goes up by the same amount each time: $a, a + d, a + 2d, \\ldots$, with common difference $d$. To reach the $n$th term you take $n - 1$ steps, so it is $a + (n - 1)d$. In $3, 7, 11, 15, \\ldots$ the difference is 4 and the 10th term is $3 + 9 \\cdot 4 = 39$.",
      },
      {
        title: "A copy turned over",
        text: "Stand each term as a column and the sequence is a staircase. Turn a copy upside down and set it on top: the shortest column of one meets the tallest of the other, and every column now holds first + last. The two staircases fill an $n$ by (first + last) rectangle.",
      },
      {
        title: "Half the rectangle",
        text: "The series, the sum of the terms, is one staircase, half the rectangle: $S = \\frac{n}{2}(\\text{first} + \\text{last}) = \\frac{n}{2}\\big(2a + (n - 1)d\\big)$. Pairing 1 with 100, 2 with 99 and so on gives $1 + 2 + \\cdots + 100 = \\frac{100 \\cdot 101}{2} = 5050$.",
      },
      {
        title: "Counting the terms",
        text: "To use the formula you need $n$: from first to last is $\\frac{\\text{last} - \\text{first}}{d}$ steps, so one more term than that. The sum $7 + 10 + \\cdots + 97$ has $\\frac{90}{3} + 1 = 31$ terms and is $\\frac{31}{2} \\cdot 104 = 1612$. The odd numbers $1 + 3 + \\cdots + (2n - 1)$ make $\\frac{n}{2} \\cdot 2n = n^2$, as the squares showed.",
      },
    ],

    draw(g, f) {
      const [a, d, n] = [first.value, diff.value, count.value];
      const terms = Array.from({ length: n }, (_, k) => a + k * d);
      const last = terms[n - 1];
      const top = a + last;
      const w = Math.min(0.8, 7 / n);
      const u = Math.min(w, 6.2 / top);
      const O: Vec = { x: -7.4, y: -2.7 };
      const at = (p: number, q: number): Vec => ({ x: O.x + p * w, y: O.y + q * u });
      const box = (p0: number, q0: number, p1: number, q1: number): Vec[] => [at(p0, q0), at(p1, q0), at(p1, q1), at(p0, q1)];
      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: 0.6, y: 3.6 - row * 0.8 }, text, { color, size: 18, bold: true, align: "left", alpha });
      };
      const cells = (k: number, q0: number, h: number, color: string, alpha: number): void => {
        g.polygon(box(k, q0, k + 1, q0 + h), { color, fill: tint(color, 0.3), width: 2, alpha });
        if (u > 0.22) for (let j = 1; j < h; j++) g.segment(at(k, q0 + j), at(k + 1, q0 + j), { color, width: 1, alpha: alpha * 0.5 });
      };

      // The staircase, column by column.
      terms.forEach((t, k) => {
        const alpha = f.step === 0 ? Math.min(1, f.at(0) * n - k + 1) : 1;
        cells(k, 0, t, STAIR, alpha);
        if (f.step === 0) g.label(at(k + 0.5, t), fmt(t), { color: C.ink, size: 13, bold: true, dy: 12, alpha });
      });
      g.label(at(n / 2, 0), `n = ${n} terms`, { color: C.dim, size: 14, bold: true, dy: -14 });

      if (f.step >= 1) {
        // The copy, turned over, drops onto the staircase.
        const drop = f.step === 1 ? 1 - f.at(1) : 0;
        terms.forEach((t, k) => {
          const h = terms[n - 1 - k];
          cells(k, t + drop * 4, h, COPY, f.step === 1 ? Math.min(1, f.at(1) * 3) : 1);
        });
        if (drop < 0.05) {
          g.segment(at(n, 0), at(n, top), { color: GOLD, width: 2.5 });
          g.label(at(n, top / 2), `${fmt(a)} + ${fmt(last)} = ${fmt(top)}`, { color: GOLD, size: 14, bold: true, dx: 8, align: "left" });
        }
      }

      const sum = (n * top) / 2;
      if (f.step === 0) {
        note(0, "aₙ = a + (n − 1)d", C.ink);
        note(1, listText(terms), STAIR);
        note(2, `a${sub(n)} = ${fmt(a)} + ${n - 1} × ${fmt(d)} = ${fmt(last)}`, GOLD, f.at(0));
      } else if (f.step === 1) {
        note(0, `each column: ${fmt(a)} + ${fmt(last)} = ${fmt(top)}`, C.ink);
        note(1, `rectangle: ${n} × ${fmt(top)} = ${fmt(n * top)}`, GOLD, f.at(1));
      } else if (f.step === 2) {
        note(0, "S = n(first + last) ÷ 2", C.ink);
        note(1, `= ${n} × ${fmt(top)} ÷ 2`, C.ink);
        note(2, `= ${fmt(sum)}`, GOLD, f.at(2));
        note(3, listText(terms, 5, " + ") + ` = ${fmt(sum)}`, STAIR, f.at(2));
      } else {
        note(0, `(${fmt(last)} − ${fmt(a)}) ÷ ${fmt(d)} + 1 = ${d === 0 ? "?" : fmt((last - a) / d + 1)} terms`, C.ink);
        note(1, `1 + 3 + … + ${2 * n - 1} = ${n}²`, GOLD, f.at(3));
        note(2, `= ${n * n}`, GOLD, f.at(3));
        if (d === 0) note(3, "d = 0: every term is a, S = na", C.red);
      }
    },

    readout(f) {
      const [a, d, n] = [first.value, diff.value, count.value];
      const last = a + (n - 1) * d;
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "nth term", tex: `a_{${n}} = ${a} + (${n} - 1) \\cdot ${d} = ${last}`, tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Each column", tex: `\\text{first} + \\text{last} = ${a} + ${last} = ${a + last}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Arithmetic series", tex: `S = \\frac{${n}}{2}(${a} + ${last}) = ${fmt((n * (a + last)) / 2)}`, tone: "good" });
      } else {
        rows.push({ label: "Odd numbers", tex: `1 + 3 + \\cdots + ${2 * n - 1} = \\frac{${n}}{2}(1 + ${2 * n - 1}) = ${n * n}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Adding a column of figures from both ends",
        text: "Asked to add 1 to 100, write the list forwards and again backwards underneath. Each pair down the page adds to 101, there are 100 pairs, and that counts every number twice: 5050.",
      },
      {
        title: "Saving a little more each week",
        text: "Put 1 coin in a jar the first week, 2 the next, and so on for a year. The first and last weeks together give 53, as do the second and second-last, so 52 weeks hold $26 \\cdot 53 = 1378$ coins.",
      },
    ],

    uses: [
      {
        title: "Seats in a theatre",
        text: "A theatre has 20 seats in its front row and each row behind has 2 more, for 15 rows. The back row has $20 + 14 \\cdot 2 = 48$ seats, and the hall seats $\\frac{15}{2}(20 + 48) = 510$, without counting row by row.",
        tags: ["building"],
        image: {
          src: seatRowsTotalImage,
          caption: "Rows of 20, 22, 24, … 48 seats, 15 rows in all, hold 15 × (20 + 48) ÷ 2 = 510 seats.",
          alt: "A fan of curved rows of seats widening toward the back, the front row marked 20 seats and the back row 48 seats in gold, beside the lines 15 rows, 15 × (20 + 48) ÷ 2 = 510.",
        },
      },
      {
        title: "A pile of pipes",
        text: "Pipes stacked in a yard lie in rows that shrink by one: 12 on the bottom up to 5 on top. That is $12 - 5 + 1 = 8$ rows, holding $\\frac{8}{2}(12 + 5) = 68$ pipes, which a supplier can count from the bottom and top rows alone.",
        tags: ["plumbing", "building"],
        image: {
          src: pipePileRowsImage,
          caption: "Rows of 12 down to 5 pipes are 8 rows, holding 8 × (12 + 5) ÷ 2 = 68 pipes.",
          alt: "Pipe ends stacked in rows from 12 at the bottom to 5 at the top, the bottom and top rows outlined in gold, beside the lines 8 rows, 8 × (12 + 5) ÷ 2 = 68.",
        },
      },
    ],
  };
});
