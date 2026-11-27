// The square root of 2 is irrational. If p/q squared to 2 then p² = 2q²,
// but p² has an even number of factors 2 and 2q² an odd number. A picture
// says the same: two q-squares in a p-square would overlap in a smaller
// square exactly as big as the two corners they miss, giving a smaller
// fraction for √2, and so on for ever. The near misses give fractions
// p/q with p² − 2q² = ±1, closing in on √2.

import { C, tint } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import squareFrameDiagonalImage from "../../images/square-frame-diagonal.svg";
import tritoneRootTwoImage from "../../images/tritone-root-two.svg";

const BIG = C.cyan;
const SMALL = C.pink;
const OVER = C.gold;
const MISS = C.red;
const ROOT2 = Math.SQRT2;

/** How many times 2 divides n. */
const twos = (n: number): number => {
  let k = 0;
  while (n > 0 && n % 2 === 0) [n, k] = [n / 2, k + 1];
  return k;
};

/** The fractions 1/1, 3/2, 7/5, …, each p/q followed by (p + 2q)/(p + q). */
const PELL: [number, number][] = [[1, 1]];
while (PELL.length < 7) {
  const [a, b] = PELL[PELL.length - 1];
  PELL.push([a + 2 * b, a + b]);
}

export default lesson((s) => {
  const p = s.slider({ label: "p =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 41, value: 7, step: 1 });
  const q = s.slider({ label: "q =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 29, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "Try a fraction",
        text: "Suppose $\\sqrt{2} = \\frac{p}{q}$. Squaring, $p^2 = 2q^2$: a $p$-square would have the area of two $q$-squares. Try any $p$ and $q$. Each 2 in $p$ appears twice in $p^2$, so $p^2$ has an even number of factors 2, while $2q^2$ has an odd number. They can never be equal, so $\\sqrt{2}$ is not a fraction.",
      },
      {
        title: "Squares inside squares",
        text: "Here is the same fact as a picture. Put the two $q$-squares in opposite corners of the $p$-square. If $p^2 = 2q^2$ exactly, the gold overlap, side $2q - p$, would have the same area as the two red corners they miss, side $p - q$. That is a smaller fraction $\\frac{2q - p}{p - q}$ equal to $\\sqrt{2}$, and shrinking for ever is impossible for whole numbers.",
      },
      {
        title: "Closer and closer",
        text: "No fraction hits $\\sqrt{2}$, but some come very close. From $\\frac{p}{q}$ go to $\\frac{p + 2q}{p + q}$: $\\frac{1}{1}, \\frac{3}{2}, \\frac{7}{5}, \\frac{17}{12}, \\frac{41}{29}, \\ldots$ Each misses by just $p^2 - 2q^2 = \\pm 1$, the closest whole numbers can come, and the error shrinks about six times each step. Its decimal $1.41421356\\ldots$ never stops or repeats.",
      },
    ],

    draw(g, f) {
      const [P, Q] = [p.value, q.value];
      const note = (row: number, text: string, color: string, alpha = 1, size = 18): void => {
        g.label({ x: 1.6, y: 3.6 - row * 0.9 }, text.replace(/= -/g, "= −"), { color, size, bold: true, align: "left", alpha });
      };

      if (f.step === 0) {
        const u = Math.min(6.6 / Math.max(P, Q), 8.4 / (P + 2 * Q));
        const sq = (x: number, side: number, color: string, alpha = 1): void => {
          const y = -2.8;
          g.polygon([{ x, y }, { x: x + side * u, y }, { x: x + side * u, y: y + side * u }, { x, y: y + side * u }], { color, fill: tint(color, 0.25), width: 2, alpha });
        };
        const x0 = -7.4;
        sq(x0, P, BIG);
        sq(x0 + P * u + 0.3, Q, SMALL, f.at(0));
        sq(x0 + (P + Q) * u + 0.45, Q, SMALL, f.at(0));
        g.label({ x: x0 + (P * u) / 2, y: -2.8 + (P * u) / 2 }, "p²", { color: BIG, size: 16, bold: true });
        const [a, b] = [P * P, 2 * Q * Q];
        note(0, `p² = ${a}`, BIG);
        note(1, `2q² = ${b}`, SMALL);
        note(2, a === b ? "equal?" : a < b ? "p² < 2q²" : "p² > 2q²", C.ink);
        note(3, `2s in p²: ${twos(a)}, even`, C.dim, 1, 14);
        note(3.6, `2s in 2q²: ${twos(b)}, odd`, C.dim, 1, 14);
        note(4.6, `${P}/${Q} = ${fmt(P / Q, 5)}`, OVER, 1, 16);
        return;
      }

      if (f.step === 1) {
        const ok = Q < P && P < 2 * Q;
        if (!ok) {
          g.label({ x: -3.6, y: 0.6 }, "Choose q < p < 2q, so p/q is between 1 and 2,", { color: MISS, size: 15, bold: true });
          g.label({ x: -3.6, y: -0.1 }, "as any fraction near √2 would be.", { color: MISS, size: 15, bold: true });
          return;
        }
        const u = 6.6 / P;
        const O: Vec = { x: -7.2, y: -2.8 };
        const at = (x: number, y: number): Vec => ({ x: O.x + x * u, y: O.y + y * u });
        const rect = (x0: number, y0: number, x1: number, y1: number): Vec[] => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
        const t = f.at(1);
        g.polygon(rect(0, 0, P, P), { color: BIG, width: 2 });
        // The two q-squares slide in from the outside corners.
        const slide = (1 - t) * 0.6;
        g.polygon(rect(-slide, -slide, Q - slide, Q - slide), { color: SMALL, fill: tint(SMALL, 0.2), width: 2 });
        g.polygon(rect(P - Q + slide, P - Q + slide, P + slide, P + slide), { color: SMALL, fill: tint(SMALL, 0.2), width: 2 });
        const [o, m] = [2 * Q - P, P - Q];
        g.polygon(rect(P - Q, P - Q, Q, Q), { color: OVER, fill: tint(OVER, 0.45), width: 2, alpha: t });
        g.polygon(rect(Q, 0, P, m), { color: MISS, fill: tint(MISS, 0.35), width: 2, alpha: t });
        g.polygon(rect(0, Q, m, P), { color: MISS, fill: tint(MISS, 0.35), width: 2, alpha: t });
        if (o * u > 0.6) g.label(at(P / 2, P / 2), String(o), { color: C.ink, size: 14, bold: true, alpha: t });
        if (m * u > 0.5) {
          g.label(at((Q + P) / 2, m / 2), String(m), { color: C.ink, size: 14, bold: true, alpha: t });
          g.label(at(m / 2, (Q + P) / 2), String(m), { color: C.ink, size: 14, bold: true, alpha: t });
        }
        note(0, `${P}² − 2·${Q}² = ${P * P - 2 * Q * Q}`, C.ink);
        note(1, `gold ${o}² = ${o * o}`, OVER, t);
        note(2, `red 2·${m}² = ${2 * m * m}`, MISS, t);
        note(3, `${o}² − 2·${m}² = ${o * o - 2 * m * m}`, C.ink, t);
        note(4, `${P}/${Q} → ${o}/${m}`, OVER, t);
        note(4.7, "same miss, opposite sign, smaller numbers", C.dim, t, 13);
        return;
      }

      // The fractions closing in on √2, on a line from 1 to 1.5 and in a table.
      const lo = 0.95;
      const hi = 1.55;
      const L = { x0: -7.2, x1: 7.2, y: 3.4 };
      const X = (v: number): number => L.x0 + ((v - lo) / (hi - lo)) * (L.x1 - L.x0);
      g.segment({ x: L.x0, y: L.y }, { x: L.x1, y: L.y }, { color: C.dim, width: 1.5 });
      for (const v of [1, 1.1, 1.2, 1.3, 1.4, 1.5]) {
        g.segment({ x: X(v), y: L.y - 0.1 }, { x: X(v), y: L.y + 0.1 }, { color: C.dim, width: 1.5 });
        g.label({ x: X(v), y: L.y }, fmt(v, 1), { color: C.dim, size: 11, dy: -16 });
      }
      g.segment({ x: X(ROOT2), y: L.y - 0.4 }, { x: X(ROOT2), y: L.y + 0.5 }, { color: OVER, width: 2 });
      g.segment({ x: X(ROOT2), y: L.y + 0.5 }, { x: X(ROOT2), y: L.y + 1.0 }, { color: OVER, width: 1, dash: [3, 3] });
      g.label({ x: X(ROOT2), y: L.y + 1.0 }, "√2", { color: OVER, size: 14, bold: true, dy: 10 });
      PELL.forEach(([a, b], i) => {
        const alpha = Math.min(1, f.at(2) * PELL.length - i + 1);
        const color = i % 2 ? C.violet : BIG;
        if (i < 4) {
          g.point({ x: X(a / b), y: L.y }, { color, r: 6, alpha });
          g.label({ x: X(a / b), y: L.y }, `${a}/${b}`, { color, size: 12, bold: true, dy: i % 2 ? 26 : -32, alpha });
        }
        const y = 1.6 - i * 0.62;
        g.label({ x: -7.2, y }, `${a}/${b}`, { color, size: 15, bold: true, align: "left", alpha });
        g.label({ x: -4.6, y }, fmt(a / b, 8), { color: C.ink, size: 15, bold: true, align: "left", alpha });
        g.label({ x: -0.8, y }, `${a}² − 2·${b}² = ${a * a - 2 * b * b > 0 ? "+" : "−"}1`, { color: C.dim, size: 14, bold: true, align: "left", alpha });
        g.label({ x: 4.0, y }, `off by ${Math.abs(a / b - ROOT2).toExponential(1).replace("e-", " × 10" + "⁻").replace(/⁻(\d)/, (_, d) => "⁻" + sup(Number(d)))}`, { color: C.dim, size: 13, align: "left", alpha });
      });
    },

    readout(f) {
      const [P, Q] = [p.value, q.value];
      const rows: Readout[] = [];
      const miss = P * P - 2 * Q * Q;
      rows.push({ label: "The miss", tex: `p^2 - 2q^2 = ${P * P} - ${2 * Q * Q} = ${miss}`, tone: Math.abs(miss) === 1 ? "good" : undefined });
      if (f.step === 1 && Q < P && P < 2 * Q) {
        const [o, m] = [2 * Q - P, P - Q];
        rows.push({ label: "Smaller pair", tex: `(2q - p)^2 - 2(p - q)^2 = ${o}^2 - 2 \\cdot ${m}^2 = ${o * o - 2 * m * m}`, tone: "good" });
      } else {
        rows.push({ label: "Fraction and root", tex: `\\frac{${P}}{${Q}} \\approx ${fmt(P / Q, 6)},\\quad \\sqrt{2} \\approx 1.414214`, tone: "dim" });
      }
      return rows;
    },

    likes: [
      {
        title: "A square's diagonal",
        text: "A square of side 1 has a diagonal of $\\sqrt{2}$ by Pythagoras. However finely you divide a ruler, no mark lands exactly on both the side and the diagonal: the two lengths have no common measure, which is what the Greeks first found.",
      },
      {
        title: "Other roots",
        text: "The same count of prime factors shows $\\sqrt{3}$, $\\sqrt{5}$ and $\\sqrt{6}$ are irrational too. In fact $\\sqrt{n}$ is either a whole number or irrational: it is never a fraction like $\\frac{3}{2}$.",
      },
    ],

    uses: [
      {
        title: "The tritone",
        text: "Equal temperament splits the octave's ratio of 2 into twelve equal semitone steps, so six of them multiply a frequency by $\\sqrt{2}$: from A at 440 Hz to D♯ at about 622.25 Hz. Because $\\sqrt{2}$ is irrational, no ratio of whole numbers names that interval exactly, and the tritone has long been heard as the most restless one.",
        tags: ["music"],
        image: {
          src: tritoneRootTwoImage,
          caption: "Six semitones up from A at 440 Hz is D♯ at about 622.25 Hz, and 622.25/440 ≈ 1.4142 ≈ √2.",
          alt: "A piano keyboard from F to F with A and D♯ in gold and six numbered semitone steps arcing between them, labelled 440 Hz and 622.25 Hz, above the lines 6 semitones multiply by exactly √2 and 622.25 / 440 ≈ 1.4142 ≈ √2.",
        },
      },
      {
        title: "Bracing a square frame",
        text: "A square frame 1 m on a side needs a diagonal brace $\\sqrt{2} \\approx 1.414$ m long. A carpenter cuts it to the nearest millimetre, 1414 mm, knowing that no measurement, however fine, would be exact: the side and the diagonal have no common unit.",
        tags: ["carpentry"],
        image: {
          src: squareFrameDiagonalImage,
          caption: "A square frame with 1 m sides has a diagonal of √2 ≈ 1.414 m, a decimal that never ends or repeats.",
          alt: "A wooden square frame with 1 m sides and a tape measure along its diagonal reading 1.414 m in gold, beside the lines diagonal, √2 m and ≈ 1.41421356… with the digits after 1.414 in gold, and never ends, never repeats.",
        },
      },
    ],
  };
});
