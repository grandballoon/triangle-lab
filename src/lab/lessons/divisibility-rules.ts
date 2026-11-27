// Divisibility tricks. Write a four-digit number as its digits times
// powers of ten. Ten is a multiple of 2 and 5, a hundred of 4 and a
// thousand of 8, so the last digits decide those; each power of ten is one
// more than a multiple of 9, so the digit sum decides 3 and 9; and they
// alternate round multiples of 11, so the alternating sum decides 11.

import { C, tint } from "../draw.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import barcodeCheckDigitImage from "../../images/barcode-check-digit.svg";
import chairsRowsNineImage from "../../images/chairs-rows-nine.svg";

const DIGIT = C.ink;
const KEY = C.gold;
const YES = C.green;
const NO = C.red;
const PLACES = ["1000s", "100s", "10s", "1s"];

type Rule = { d: number; test: (ds: number[], n: number) => string; ok: (n: number) => boolean; parts: number[] };

export default lesson((s) => {
  const sliders = PLACES.map((label, i) =>
    s.slider({ label, at: { x: -7.6 + i * 3.8, y: -4.3 }, width: 2.8, min: 0, max: 9, value: [1, 2, 3, 3][i], step: 1 }),
  );
  const read = (): number[] => sliders.map((d) => d.value);

  return {
    steps: [
      {
        title: "Last digits",
        text: "A number is its digits times powers of ten: $1233 = 1 \\cdot 1000 + 2 \\cdot 100 + 3 \\cdot 10 + 3$. Since 10 is a multiple of 2, 5 and 10, everything but the ones digit is too, and the last digit decides them. A hundred is a multiple of 4, so the last two digits decide 4; a thousand is a multiple of 8, so the last three decide 8.",
      },
      {
        title: "Digit sums",
        text: "Each power of ten is one more than a multiple of 9: $10 = 9 + 1$, $100 = 99 + 1$, $1000 = 999 + 1$. So a number differs from the sum of its digits by a multiple of 9, and the two leave the same remainder on division by 9, and by 3. A number is divisible by 9, or by 3, exactly when its digit sum is: $1 + 2 + 3 + 3 = 9$, so $9 \\mid 1233$.",
      },
      {
        title: "Alternating sums",
        text: "Powers of ten are alternately one more and one less than multiples of 11: $10 = 11 - 1$, $100 = 99 + 1$, $1000 = 1001 - 1$. So add and subtract the digits in turn from the right; the number is divisible by 11 exactly when that alternating sum is. For 1232, $2 - 3 + 2 - 1 = 0$, and indeed $1232 = 11 \\cdot 112$.",
      },
      {
        title: "Combining tests",
        text: "When a divisor splits into factors with no common factor, test each one. A number is divisible by 6 when it passes the tests for 2 and for 3; by 12 for 3 and 4; by 15 for 3 and 5. The factors must share nothing: 12 is divisible by 2 and by 4 but not by 8.",
      },
    ],

    draw(g, f) {
      const ds = read();
      const n = ds.reduce((acc, d) => acc * 10 + d, 0);
      const step = f.step;

      // The digits in boxes across the top, the deciding ones lit.
      const cw = 1.3;
      const x0 = -2 * cw;
      const lit = (i: number): boolean => step === 0 ? i >= 1 : step <= 2;
      ds.forEach((d, i) => {
        const lo = { x: x0 + i * cw + 0.08, y: 2.4 };
        const hi = { x: lo.x + cw - 0.16, y: 3.7 };
        const on = lit(i);
        box(g, lo, hi, { color: on ? KEY : C.dim, fill: on ? tint(KEY, 0.15) : undefined, width: 2 });
        g.label({ x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 }, String(d), { color: DIGIT, size: 26, bold: true });
        const sign = step === 2 ? ((3 - i) % 2 === 0 ? "+" : "−") : step === 1 ? "+" : "";
        if (sign) g.label({ x: (lo.x + hi.x) / 2, y: lo.y }, sign, { color: KEY, size: 18, bold: true, dy: -16 });
      });
      g.label({ x: x0 + 4 * cw, y: 3.05 }, `= ${n}`, { color: C.dim, size: 18, dx: 12, align: "left" });

      const sum = ds.reduce((a, d) => a + d, 0);
      const alt = ds.reduce((a, d, i) => a + ((3 - i) % 2 === 0 ? d : -d), 0);
      const lastTwo = ds[2] * 10 + ds[3];
      const lastThree = ds[1] * 100 + lastTwo;
      const rules: Rule[][] = [
        [
          { d: 2, test: () => `last digit ${ds[3]}`, ok: (v) => v % 2 === 0, parts: [] },
          { d: 5, test: () => `last digit ${ds[3]}`, ok: (v) => v % 5 === 0, parts: [] },
          { d: 10, test: () => `last digit ${ds[3]}`, ok: (v) => v % 10 === 0, parts: [] },
          { d: 4, test: () => `last two ${String(lastTwo).padStart(2, "0")}`, ok: (v) => v % 4 === 0, parts: [] },
          { d: 8, test: () => `last three ${String(lastThree).padStart(3, "0")}`, ok: (v) => v % 8 === 0, parts: [] },
        ],
        [
          { d: 3, test: () => `digit sum ${sum}`, ok: (v) => v % 3 === 0, parts: [] },
          { d: 9, test: () => `digit sum ${sum}`, ok: (v) => v % 9 === 0, parts: [] },
        ],
        [{ d: 11, test: () => `alternating sum ${alt}`, ok: (v) => v % 11 === 0, parts: [] }],
        [
          { d: 6, test: () => "2 and 3", ok: (v) => v % 6 === 0, parts: [2, 3] },
          { d: 12, test: () => "3 and 4", ok: (v) => v % 12 === 0, parts: [3, 4] },
          { d: 15, test: () => "3 and 5", ok: (v) => v % 15 === 0, parts: [3, 5] },
        ],
      ];
      const list = rules[step];
      const gap = 0.85;
      const top = 1.1;
      list.forEach((rule, i) => {
        const y = top - i * gap;
        const ok = rule.ok(n);
        const color = ok ? YES : NO;
        const alpha = Math.min(1, f.at(step) * list.length * 1.5 - i + 1);
        g.label({ x: -4.2, y }, `÷ ${rule.d}`, { color: KEY, size: 17, bold: true, align: "right", alpha });
        let text = rule.test(ds, n);
        if (step === 0) {
          const part = rule.d === 4 ? lastTwo : rule.d === 8 ? lastThree : ds[3];
          text += `  →  ${part} ${ok ? "is" : "is not"} a multiple of ${rule.d}`;
        } else if (step === 3) {
          text = rule.parts.map((p) => `${p} ${n % p === 0 ? "✓" : "✗"}`).join("   ");
        } else {
          const v = step === 1 ? sum : alt;
          text += `  →  ${v} ${ok ? "is" : "is not"} a multiple of ${rule.d}`;
        }
        g.label({ x: -3.8, y }, text, { color: C.ink, size: 15, align: "left", alpha });
        g.label({ x: 6.2, y }, ok ? "yes" : "no", { color, size: 16, bold: true, align: "left", alpha });
      });
    },

    readout(f) {
      const ds = read();
      const n = ds.reduce((acc, d) => acc * 10 + d, 0);
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Expanded", tex: `${n} = ${ds.map((d, i) => `${d} \\cdot ${10 ** (3 - i)}`).join(" + ")}` });
      } else if (f.step === 1) {
        rows.push({ label: "Number minus digit sum", tex: `${n} - ${ds.reduce((a, d) => a + d, 0)} = ${n - ds.reduce((a, d) => a + d, 0)} = 9 \\cdot ${(n - ds.reduce((a, d) => a + d, 0)) / 9}` });
      } else if (f.step === 2) {
        const alt = ds.reduce((a, d, i) => a + ((3 - i) % 2 === 0 ? d : -d), 0);
        rows.push({ label: "Number minus alternating sum", tex: `${n} - (${alt}) = ${n - alt} = 11 \\cdot ${(n - alt) / 11}` });
      } else {
        const ok = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 15].filter((d) => n % d === 0);
        rows.push({ label: "Divisible by", tex: ok.length ? ok.join(", ") : "\\text{none of these}" });
      }
      rows.push({ label: "Check", tex: n === 0 ? "0 \\text{ is divisible by everything}" : `${n} \\bmod 9 = ${n % 9},\\quad ${n} \\bmod 11 = ${n % 11}`, tone: "dim" });
      return rows;
    },

    likes: [
      {
        title: "Casting out nines",
        text: "Bookkeepers once checked sums by replacing each number with its digit sum, over and over, down to one digit. Since that keeps the remainder mod 9, a correct sum must still add up after the swap; a mismatch shows a mistake, though some slips, like swapped digits, get through.",
      },
      {
        title: "Splitting a bill",
        text: "Before splitting a bill of 432 dollars three ways, add the digits: $4 + 3 + 2 = 9$, a multiple of 3, so it splits exactly, 144 dollars each.",
      },
    ],

    uses: [
      {
        title: "Check digits on barcodes",
        text: "The last digit of a shop barcode is chosen so a weighted sum of all the digits is a multiple of 10. For 12345678901, three times the odd-place digits plus the even-place ones gives $3 \\cdot 26 + 20 = 98$, so the check digit is 2, making 100. A scanner that misreads one digit gets a sum that is not a multiple of 10 and asks for a rescan.",
        tags: ["computing"],
        image: {
          src: barcodeCheckDigitImage,
          caption: "A barcode's last digit makes a weighted digit sum a multiple of 10: 3 × 26 + 20 + 2 = 100, so a misread digit is caught.",
          alt: "A barcode with the digits 1 23456 78901 2 under it, the final 2 in a gold box, and the line 3 × 26 + 20 + 2 = 100.",
        },
      },
      {
        title: "Chairs in equal rows",
        text: "Can 1233 chairs be set out in 9 equal rows? Its digits add to $1 + 2 + 3 + 3 = 9$, so yes, 137 in each row, worked out without a calculator. But not in 2 rows, since it is odd, nor in 11, since $3 - 3 + 2 - 1 = 1$.",
        tags: ["trade-tricks"],
        image: {
          src: chairsRowsNineImage,
          caption: "1233 chairs fill 9 equal rows of 137, as the digit sum 1 + 2 + 3 + 3 = 9 shows.",
          alt: "Rows of folding chairs, nine to a row, numbered 1, 2 and on to 137, with the lines 1 + 2 + 3 + 3 = 9 in gold and 1233 = 137 × 9.",
        },
      },
    ],
  };
});
