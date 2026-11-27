// Rationalizing a denominator. 1/√2 and √2/2 are one length, seen in a unit
// square: the half-diagonal, which is the leg of a right isosceles triangle
// with hypotenuse 1. Multiplying by √b/√b, or by a conjugate, rewrites any
// such fraction without a root underneath.

import { C, tint } from "../draw.ts";
import { fmt, lerp, mid } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import mainsVoltagePeakImage from "../../images/mains-voltage-peak.svg";
import paperSizesImage from "../../images/paper-sizes.svg";

const U = 4.2;
const SQ = { x: -6.6, y: -1.4 };
const LINE = { y: -3.7, x0: -6, perUnit: 3.2 };

interface Fraction {
  /** What the fraction is, as written. */
  given: string;
  /** Multiplied by a form of 1, step by step, to its root-free bottom. */
  steps: string;
  value: number;
  /** Whether the bottom is a sum or difference, needing a conjugate. */
  conjugate: boolean;
}

const FRACTIONS: Record<string, Fraction> = {
  "1/√2": { given: "\\frac{1}{\\sqrt2}", steps: "\\frac{1}{\\sqrt2} \\cdot \\frac{\\sqrt2}{\\sqrt2} = \\frac{\\sqrt2}{2}", value: 1 / Math.SQRT2, conjugate: false },
  "1/√3": { given: "\\frac{1}{\\sqrt3}", steps: "\\frac{1}{\\sqrt3} \\cdot \\frac{\\sqrt3}{\\sqrt3} = \\frac{\\sqrt3}{3}", value: 1 / Math.sqrt(3), conjugate: false },
  "3/√6": { given: "\\frac{3}{\\sqrt6}", steps: "\\frac{3}{\\sqrt6} \\cdot \\frac{\\sqrt6}{\\sqrt6} = \\frac{3\\sqrt6}{6} = \\frac{\\sqrt6}{2}", value: 3 / Math.sqrt(6), conjugate: false },
  "2/√8": { given: "\\frac{2}{\\sqrt8}", steps: "\\frac{2}{\\sqrt8} = \\frac{2}{2\\sqrt2} = \\frac{1}{\\sqrt2} = \\frac{\\sqrt2}{2}", value: 2 / Math.sqrt(8), conjugate: false },
  "1/(1+√2)": { given: "\\frac{1}{1+\\sqrt2}", steps: "\\frac{1}{1+\\sqrt2} \\cdot \\frac{\\sqrt2-1}{\\sqrt2-1} = \\frac{\\sqrt2-1}{2-1} = \\sqrt2-1", value: 1 / (1 + Math.SQRT2), conjugate: true },
  "1/(√3−√2)": { given: "\\frac{1}{\\sqrt3-\\sqrt2}", steps: "\\frac{1}{\\sqrt3-\\sqrt2} \\cdot \\frac{\\sqrt3+\\sqrt2}{\\sqrt3+\\sqrt2} = \\frac{\\sqrt3+\\sqrt2}{3-2} = \\sqrt3+\\sqrt2", value: 1 / (Math.sqrt(3) - Math.SQRT2), conjugate: true },
};
const NAMES = Object.keys(FRACTIONS);

export default lesson((s) => {
  const pick = s.choice("Fraction", NAMES, "1/√2");

  return {
    steps: [
      {
        title: "Two ways to write one number",
        text: "$\\frac{1}{\\sqrt2}$ asks you to divide 1 by $1.41421\\ldots$, which is hard by hand. $\\frac{\\sqrt2}{2}$ only asks you to halve it: $0.70711\\ldots$. They are equal, and the square shows why.",
      },
      {
        title: "Half a diagonal",
        text: "A unit square's diagonals have length $\\sqrt2$ and cross at its centre, cutting it into four right isosceles triangles. The bottom one has hypotenuse 1, and its legs are half-diagonals, $\\frac{\\sqrt2}{2}$. But a leg times $\\sqrt2$ is the hypotenuse, so a leg is also $\\frac{1}{\\sqrt2}$.",
      },
      {
        title: "Multiply by a form of 1",
        text: "In general, multiply top and bottom by the root underneath: $\\frac{a}{\\sqrt{b}} = \\frac{a}{\\sqrt{b}} \\cdot \\frac{\\sqrt{b}}{\\sqrt{b}} = \\frac{a\\sqrt{b}}{b}$. The value cannot change, since $\\frac{\\sqrt{b}}{\\sqrt{b}} = 1$, and the root moves to the top. This is called rationalizing the denominator.",
      },
      {
        title: "Conjugates",
        text: "When the bottom is a sum like $1 + \\sqrt2$, multiplying by $\\sqrt2$ does not clear it. Multiply by its conjugate $\\sqrt2 - 1$ instead: $(\\sqrt2 + 1)(\\sqrt2 - 1) = 2 - 1 = 1$, because $(x + y)(x - y) = x^2 - y^2$ squares each root away. Pick a fraction with a sum underneath.",
      },
    ],

    draw(g, f) {
      const square = [SQ, { x: SQ.x + U, y: SQ.y }, { x: SQ.x + U, y: SQ.y + U }, { x: SQ.x, y: SQ.y + U }];
      const centre = { x: SQ.x + U / 2, y: SQ.y + U / 2 };
      const squareAlpha = f.step >= 2 ? 0.35 : 1;

      g.polygon(square, { color: C.ink, width: 2.5, alpha: squareAlpha });
      g.along(square[0], square[1], "1", { color: C.ink, size: 15, bold: true, offset: -16, alpha: squareAlpha });
      if (f.step >= 1) {
        const alpha = f.at(1) * squareAlpha;
        g.segment(square[0], square[2], { color: C.dim, width: 1.5, dash: [5, 5], alpha });
        g.segment(square[1], square[3], { color: C.dim, width: 1.5, dash: [5, 5], alpha });
        g.polygon([square[0], square[1], centre], { color: C.gold, fill: tint(C.gold, 0.25), width: 3, alpha });
        g.angle(square[0], centre, square[1], { color: C.gold, r: 14, alpha });
        g.label(lerp(square[0], centre, 0.5), "√2/2", { color: C.gold, size: 14, bold: true, dx: -26, dy: 6, alpha });
        g.label(lerp(square[1], centre, 0.5), "1/√2", { color: C.gold, size: 14, bold: true, dx: 26, dy: 6, alpha });
        g.label(mid(square[2], square[3]), "diagonal √2", { color: C.dim, size: 13, dy: 14, alpha });
      }

      // The number line, with the fraction as given above it and as rewritten below.
      const name = f.step >= 2 ? pick.value : "1/√2";
      const frac = FRACTIONS[name];
      const at = (v: number): { x: number; y: number } => ({ x: LINE.x0 + v * LINE.perUnit, y: LINE.y });
      g.segment(at(0), at(3.7), { color: C.dim, width: 2 });
      for (let k = 0; k <= 3; k++) {
        g.segment({ x: at(k).x, y: LINE.y - 0.12 }, { x: at(k).x, y: LINE.y + 0.12 }, { color: C.dim, width: 2 });
        g.label(at(k), String(k), { color: C.dim, size: 12, dy: -18 });
      }
      g.point(at(frac.value), { color: C.gold, r: 7 });
      g.label(at(frac.value), `${name} ≈ ${fmt(frac.value, 3)}`, { color: C.gold, size: 14, bold: true, dy: 16 });

      if (f.step >= 2) {
        g.label({ x: 1.2, y: 2.4 }, "× 1, in disguise", { color: C.ink, size: 18, bold: true, align: "left", alpha: f.at(2) });
        g.label({ x: 1.2, y: 1.3 }, frac.conjugate ? "use the conjugate" : "use the root below", { color: C.dim, size: 15, align: "left", alpha: f.at(2) });
      }
    },

    readout(f) {
      if (f.step < 2) {
        const rows: Readout[] = [{ label: "Divide by a root", tex: `\\frac{1}{\\sqrt2} = \\frac{1}{1.41421\\ldots} \\approx 0.7071` }];
        rows.push({ label: "Halve a root", tex: `\\frac{\\sqrt2}{2} = \\frac{1.41421\\ldots}{2} \\approx 0.7071` });
        if (f.step >= 1) rows.push({ label: "The leg, two ways", tex: `\\frac{1}{\\sqrt2} = \\frac{\\sqrt2}{2}`, tone: "good" });
        return rows;
      }
      const frac = FRACTIONS[pick.value];
      const rows: Readout[] = [
        { label: "Given", tex: `${frac.given} \\approx ${fmt(frac.value, 4)}` },
        { label: "Rewritten", tex: frac.steps, tone: "good" },
      ];
      if (frac.conjugate && f.step < 3) rows.push({ label: "Underneath is a sum", tex: "\\text{the next step clears it}", tone: "dim" });
      return rows;
    },

    likes: [
      {
        title: "Dividing by a tenth",
        text: "Nobody divides 3 by 0.1 directly; you multiply top and bottom by 10 and get $\\frac{30}{1} = 30$. Rationalizing is the same move with $\\sqrt{b}$ in place of 10: choose the factor that turns the bottom into something easy, and multiply both parts by it.",
      },
      {
        title: "Making change",
        text: "A shop that only takes whole pounds turns 2.50 into 250 pence before counting. The amount is the same, written in units that suit the job. Multiplying by $\\frac{\\sqrt{b}}{\\sqrt{b}}$ re-expresses a number the same way, in a form where the awkward part is on top.",
      },
    ],

    uses: [
      {
        title: "Paper sizes",
        text: "A-series paper, like A4, has sides in the ratio $1 : \\sqrt2$, so folding a sheet in half gives a smaller sheet of exactly the same shape. Its short side is $\\frac{1}{\\sqrt2} = \\frac{\\sqrt2}{2} \\approx 0.707$ of its long side, which is why enlarging A4 to A3 on a copier is a 141% zoom and reducing it is 71%.",
        tags: ["art", "home"],
        image: {
          src: paperSizesImage,
          caption: "A-series paper keeps its shape when halved because its sides are in the ratio 1 : √2. Short over long is 1/√2 = √2/2, about 0.707.",
          alt: "An A4 sheet divided into an A5 half and two A6 quarters, labelled A5 and A6, all the same shape, with gold measuring lines marking the short side 1 and the long side √2.",
        },
      },
      {
        title: "Mains voltage",
        text: "Household alternating current swings back and forth, and its effective voltage is its peak divided by $\\sqrt2$. Electricians write this as peak times $\\frac{\\sqrt2}{2} \\approx 0.707$: a peak of about 170 volts gives the 120 volts of North American mains. Going the other way, 230 V mains in Europe peaks near $230\\sqrt2 \\approx 325$ volts.",
        tags: ["electrical", "home"],
        image: {
          src: mainsVoltagePeakImage,
          caption: "Mains voltage swings to a peak of about 170 V; its effective value is the peak over √2, peak × √2/2, about 120 V.",
          alt: "A sine wave of voltage with a gold dashed line at its peak marked 170 V and a second gold dashed level lower down marked 120 V.",
        },
      },
    ],
  };
});
