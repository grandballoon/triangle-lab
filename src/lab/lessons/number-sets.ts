// Closing the gaps. Each kind of number answers a question the last could
// not: subtraction needs the integers, division the rationals, square roots
// the reals, and square roots of negatives the complex numbers. The sets
// nest, and a result lands in the smallest one that holds it.

import { C, tint } from "../draw.ts";
import { gcd } from "../kit/integers.ts";
import { fmt } from "../geo.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import floatPointSumImage from "../../images/float-point-sum.svg";
import overdrawnBalanceImage from "../../images/overdrawn-balance.svg";

const SETS: { name: string; symbol: string; color: string; samples: string[] }[] = [
  { name: "counting numbers", symbol: "ℕ", color: C.cyan, samples: ["1", "2", "7"] },
  { name: "integers", symbol: "ℤ", color: C.green, samples: ["0", "−3"] },
  { name: "rationals", symbol: "ℚ", color: C.violet, samples: ["½", "−0.75"] },
  { name: "reals", symbol: "ℝ", color: C.pink, samples: ["√2", "π"] },
  { name: "complex numbers", symbol: "ℂ", color: C.orange, samples: ["i", "2 + 3i"] },
];
/** The outer box, and how far each inner box is pulled in on each side. */
const OUTER = { x0: -7.6, y0: -2.9, x1: 3.4, y1: 4.4 };
const IN = { left: 0.25, bottom: 0.25, right: 1.5, top: 1.1 };
const OPS = ["+", "−", "÷", "√", "√"] as const;

const frame = (level: number) => {
  const k = SETS.length - 1 - level;
  return { x0: OUTER.x0 + k * IN.left, y0: OUTER.y0 + k * IN.bottom, x1: OUTER.x1 - k * IN.right, y1: OUTER.y1 - k * IN.top };
};

/** What op does to a and b: the smallest set that holds it, as text and as TeX. */
function result(op: (typeof OPS)[number], a: number, b: number): { level: number; text: string; tex: string } | null {
  if (op === "+" || op === "−") {
    const v = op === "+" ? a + b : a - b;
    return { level: v >= 1 ? 0 : 1, text: String(v).replace("-", "−"), tex: `${v}` };
  }
  if (op === "÷") {
    if (b === 0) return null;
    const g = gcd(a, b) || 1;
    const [n, d] = [(a / g) * Math.sign(b), Math.abs(b / g)];
    if (d === 1) return { level: n >= 1 ? 0 : 1, text: String(n).replace("-", "−"), tex: `${n}` };
    return { level: 2, text: `${n}/${d}`.replace("-", "−"), tex: `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}` };
  }
  const r = Math.sqrt(Math.abs(a));
  const whole = Number.isInteger(r);
  if (a < 0) return { level: 4, text: whole ? `${r}i` : `√${-a} i`, tex: whole ? `${r}i` : `\\sqrt{${-a}}\\,i` };
  if (whole) return { level: r >= 1 ? 0 : 1, text: String(r), tex: `${r}` };
  return { level: 3, text: `≈ ${fmt(r, 3)}`, tex: `\\sqrt{${a}} \\approx ${fmt(r, 4)}` };
}

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -9, max: 9, value: 3, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -9, max: 9, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "Counting numbers",
        text: "The counting numbers $1, 2, 3, \\ldots$ are closed under addition and multiplication: add or multiply two of them and you get another. Set $a$ and $b$ to counting numbers and $a + b$ always lands in the innermost box.",
      },
      {
        title: "Subtraction needs the integers",
        text: "$3 - 5$ has no answer among the counting numbers. Adding 0 and the negatives $-1, -2, \\ldots$ gives the integers, and now every subtraction has an answer. The integers are closed under addition, subtraction and multiplication.",
      },
      {
        title: "Division needs the rationals",
        text: "$3 \\div 5$ is not an integer. The rational numbers are all the fractions $\\frac{p}{q}$ of integers with $q \\ne 0$, and now every division except by zero has an answer. A rational number's decimal either stops or repeats.",
      },
      {
        title: "Roots need the reals",
        text: "No fraction squares to 5, so $\\sqrt{5}$ is not rational. The real numbers fill every gap on the number line, irrationals like $\\sqrt{2}$ and $\\pi$ included, whose decimals never stop or repeat. Every nonnegative real has a real square root.",
      },
      {
        title: "Roots of negatives need the complex numbers",
        text: "No real number squares to a negative, so make $a$ negative: $\\sqrt{-9} = 3i$, where $i^2 = -1$. The complex numbers $x + yi$ hold all of these, and in them every polynomial equation has a root. Each set sits inside the next.",
      },
    ],

    draw(g, f) {
      const step = f.step;
      SETS.forEach((set, level) => {
        const r = frame(level);
        const on = level <= step;
        box(g, { x: r.x0, y: r.y0 }, { x: r.x1, y: r.y1 }, { color: set.color, fill: tint(set.color, on ? 0.06 : 0.02), width: on ? 2 : 1, alpha: on ? 1 : 0.3 });
        g.label({ x: r.x0 + 0.15, y: r.y1 - 0.32 }, `${set.symbol}  ${set.name}`, { color: set.color, size: 14, bold: true, align: "left", alpha: on ? 1 : 0.35 });
        const inner = level > 0 ? frame(level - 1) : null;
        const cx = inner ? (inner.x1 + r.x1) / 2 : (r.x0 + r.x1) / 2 + 0.3;
        set.samples.forEach((text, i) => {
          const y = inner ? r.y0 + 0.6 + i * 0.7 : r.y0 + 0.35;
          const x = inner ? cx : cx + (i - 1) * 0.55;
          g.label({ x, y }, text, { color: set.color, size: 14, alpha: on ? 0.85 : 0.3 });
        });
      });

      const op = OPS[step];
      const [x, y] = [a.value, b.value];
      const res = result(op, x, y);
      const ask = op === "√" ? `√${x}`.replace("-", "−") : `${x} ${op} ${y}`.replace(/-/g, "−");
      g.label({ x: 4.0, y: 3.2 }, ask, { color: C.ink, size: 22, bold: true, align: "left" });
      if (!res) {
        g.label({ x: 4.0, y: 2.3 }, "no answer: b = 0", { color: C.red, size: 16, bold: true, align: "left" });
        return;
      }
      g.label({ x: 4.0, y: 2.3 }, res.text.startsWith("≈") ? res.text : `= ${res.text}`, { color: C.gold, size: 20, bold: true, align: "left" });
      g.label({ x: 4.0, y: 1.5 }, `in ${SETS[res.level].symbol}, the ${SETS[res.level].name}`, { color: SETS[res.level].color, size: 13, bold: true, align: "left" });
      const r = frame(res.level);
      const inner = res.level > 0 ? frame(res.level - 1) : null;
      const at = { x: inner ? (inner.x1 + r.x1) / 2 : (r.x0 + r.x1) / 2, y: inner ? r.y1 - 0.95 : r.y0 + 0.95 };
      g.point(at, { color: C.gold, r: 8, alpha: f.at(step) });
      if (res.level > step) g.label({ x: 4.0, y: 0.7 }, "beyond the sets so far", { color: C.red, size: 13, bold: true, align: "left" });
    },

    readout(f) {
      const op = OPS[f.step];
      const [x, y] = [a.value, b.value];
      const res = result(op, x, y);
      const ask = op === "√" ? `\\sqrt{${x}}` : `${x} ${op === "÷" ? "\\div" : op === "−" ? "-" : "+"} ${y < 0 ? `(${y})` : y}`;
      const rows: Readout[] = [];
      if (!res) rows.push({ label: "Division by zero", tex: `${ask} \\text{ is undefined}`, tone: "warn" });
      else rows.push({ label: `Smallest set: ${SETS[res.level].name}`, tex: `${ask} = ${res.tex}`, tone: res.level <= f.step ? "good" : "warn" });
      rows.push({ label: "Nesting", tex: "\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q} \\subset \\mathbb{R} \\subset \\mathbb{C}", tone: "dim" });
      return rows;
    },

    likes: [
      {
        title: "Tools that fit inside each other",
        text: "A ruler marked only in centimetres cannot show 2.5 cm, so you add millimetre marks; even those cannot show $\\sqrt{2}$ cm exactly. Each new kind of number is a finer ruler that keeps every old mark.",
      },
      {
        title: "Floors below the ground",
        text: "A lift that only knows floors 1, 2, 3 has no answer for going down four floors from the third. A building with basements labels them 0, −1, −2: the integers, invented to make every trip down possible.",
      },
    ],

    uses: [
      {
        title: "Overdrawn accounts",
        text: "A bank balance of 50 dollars less a payment of 80 is $50 - 80 = -30$ dollars: the account is overdrawn by 30. Bookkeepers have written debts as negative numbers, often in red or in brackets, for centuries, because the counting numbers have no answer for spending more than you have.",
        tags: ["money"],
        image: {
          src: overdrawnBalanceImage,
          caption: "With 50 dollars in an account, a payment of 80 leaves 50 − 80 = −30: the counting numbers have no answer, so the integers add the negatives.",
          alt: "Three boxes read balance 50 dollars, payment −80 dollars and new balance −30 dollars in red. Below them a number line from −40 to 60 has a gold arrow labelled − 80 dropping from 50 to a red dot at −30, above the line 50 − 80 = −30.",
        },
      },
      {
        title: "Why 0.1 + 0.2 is not 0.3 on a computer",
        text: "Computers store numbers as binary fractions, whose denominators are powers of 2. One tenth has a denominator of 10, so its binary digits repeat forever and must be cut off. Adding the cut-off 0.1 and 0.2 gives 0.30000000000000004, which is why money is usually counted in whole cents.",
        tags: ["computing"],
        image: {
          src: floatPointSumImage,
          caption: "A computer stores 0.1 and 0.2 as nearby binary fractions, so adding them gives 0.30000000000000004, not exactly 0.3.",
          alt: "A screen shows 0.1 + 0.2 and the answer 0.30000000000000004, the last 4 in gold. Below, a number line from 0 to 0.5 opens into a zoomed view where the 0.3 mark and a gold 0.1 + 0.2 mark sit slightly apart.",
        },
      },
    ],
  };
});
