// Conjugates and division. The conjugate a − bi is z mirrored in the real
// axis; z times its conjugate is a² + b², a real number and the square of
// z's length; and multiplying top and bottom by the conjugate divides
// complex numbers, just as rationalizing clears a root from a denominator.

import { C, tint } from "../draw.ts";
import { both, fmt, inBox, snapToGrid } from "../geo.ts";
import { conj, cx, norm, over, plane, plus, size, texCx, texFactor, texTerm, textCx, times, vector } from "../kit/complex.ts";
import { lesson, type Readout } from "../scene.ts";
import acCurrentDivisionImage from "../../images/ac-current-division.svg";
import spriteFlipImage from "../../images/sprite-flip.svg";

const Z = C.cyan;
const BAR = C.violet;
const W = C.pink;
const RESULT = C.gold;

export default lesson((s) => {
  const z = s.point(3, 2, { label: "z", color: Z, constrain: both(snapToGrid(1), inBox(-6, 6, -4, 4)) });
  const w = s.point(1, -1, { label: "w", color: W, constrain: both(snapToGrid(1), inBox(-4, 4, -3, 3)) });

  return {
    steps: [
      {
        title: "The mirror image",
        text: "The conjugate of $z = a + bi$ is $\\bar{z} = a - bi$: the same real part, the opposite imaginary part. On the plane it is $z$ reflected in the real axis. A real number is its own conjugate, and the conjugate of $bi$ is $-bi$.",
      },
      {
        title: "Times its conjugate is real",
        text: "$(a + bi)(a - bi) = a^2 - abi + abi - b^2 i^2 = a^2 + b^2$. The imaginary parts cancel and what is left is real. By Pythagoras it is the square of the arrow's length, so $|z| = \\sqrt{a^2 + b^2} = \\sqrt{z \\bar{z}}$.",
      },
      {
        title: "Dividing",
        text: "To find $\\frac{z}{w}$, multiply top and bottom by $\\bar{w}$: $\\frac{z}{w} = \\frac{z \\bar{w}}{w \\bar{w}} = \\frac{z \\bar{w}}{|w|^2}$. The bottom is now real, so divide each part by it. It is the same move as rationalizing $\\frac{1}{1 + \\sqrt2}$ with its conjugate.",
      },
      {
        title: "Adding a number to its mirror",
        text: "$z + \\bar{z} = 2a$ is real and $z - \\bar{z} = 2bi$ is pure imaginary, so $\\operatorname{Re} z = \\frac{z + \\bar{z}}{2}$. Conjugates also respect multiplication: $\\overline{zw} = \\bar{z} \\, \\bar{w}$, since mirroring both factors mirrors their product.",
      },
    ],

    draw(g, f) {
      plane(g);
      const zz = cx(z.x, z.y);
      const bar = conj(zz);

      if (f.step === 2) {
        const ww = cx(w.x, w.y);
        const q = over(zz, ww);
        vector(g, zz, { color: Z, label: textCx(zz) });
        vector(g, ww, { color: W, label: textCx(ww) });
        vector(g, conj(ww), { color: W, alpha: 0.4, dash: [5, 5], label: "w̄" });
        if (q) vector(g, q, { color: RESULT, label: `z ÷ w = ${textCx(q)}` });
        return;
      }

      g.segment(zz, bar, { color: C.faint, width: 1.5, dash: [4, 5] });
      vector(g, zz, { color: Z, label: `z = ${textCx(zz)}` });
      vector(g, bar, { color: BAR, label: `z̄ = ${textCx(bar)}` });

      if (f.step === 1 && size(zz) > 1e-9) {
        g.polygon([cx(0, 0), cx(z.x, 0), zz], { color: RESULT, fill: tint(RESULT, 0.12), width: 1.5 });
        g.label(cx(z.x / 2, 0), String(Math.abs(z.x)), { color: RESULT, size: 14, bold: true, dy: z.y >= 0 ? -16 : 12 });
        g.label(cx(z.x, z.y / 2), String(Math.abs(z.y)), { color: RESULT, size: 14, bold: true, dx: z.x >= 0 ? 12 : -12, align: z.x >= 0 ? "left" : "right" });
      }
      if (f.step === 3) {
        vector(g, bar, { color: BAR, from: zz, alpha: 0.6 });
        vector(g, plus(zz, bar), { color: RESULT, label: `z + z̄ = ${textCx(plus(zz, bar))}` });
      }
    },

    readout(f) {
      const zz = cx(z.x, z.y);
      const bar = conj(zz);
      const rows: Readout[] = [{ label: "Conjugate", tex: `z = ${texCx(zz)},\\quad \\bar{z} = ${texCx(bar)}` }];
      if (f.step === 1) {
        rows.push({ label: "Product", tex: `z \\bar{z} = ${texFactor(zz)}${texFactor(bar)} = ${texTerm(z.x)}^2 + ${texTerm(z.y)}^2 = ${norm(zz)}`, tone: "good" });
        rows.push({ label: "Length", tex: `|z| = \\sqrt{${norm(zz)}} \\approx ${fmt(size(zz), 3)}` });
      }
      if (f.step === 2) {
        const ww = cx(w.x, w.y);
        const n = norm(ww);
        if (n === 0) {
          rows.push({ label: "Dividing by 0", tex: "w = 0:\\ \\text{no quotient}", tone: "warn" });
        } else {
          const top = times(zz, conj(ww));
          rows.push({ label: "Top and bottom by w̄", tex: `\\frac{${texCx(zz)}}{${texCx(ww)}} = \\frac{${texFactor(zz)}${texFactor(conj(ww))}}{${n}} = \\frac{${texCx(top)}}{${n}}` });
          rows.push({ label: "Quotient", tex: `\\frac{z}{w} = ${texCx(over(zz, ww)!, 3)}`, tone: "good" });
          rows.push({ label: "Check", tex: `w \\cdot \\frac{z}{w} = ${texCx(times(ww, over(zz, ww)!), 3)}` });
        }
      }
      if (f.step === 3) {
        rows.push({ label: "Sum", tex: `z + \\bar{z} = ${2 * z.x} = 2 \\operatorname{Re} z`, tone: "good" });
        rows.push({ label: "Difference", tex: `z - \\bar{z} = ${texCx(cx(0, 2 * z.y))}` });
      }
      return rows;
    },

    likes: [
      {
        title: "A reflection in still water",
        text: "A tree on the bank and its reflection in a pond are the same distance across and the same distance from the waterline, one up and one down. The conjugate is that reflection with the real axis as the waterline. The tree and its reflection together make a shape that is symmetric about the water, just as $z + \\bar{z}$ is real.",
      },
      {
        title: "Difference of two squares",
        text: "$(x + y)(x - y) = x^2 - y^2$ is the old trick for turning a product into something simpler. With $y = bi$, $y^2 = -b^2$, so the minus becomes a plus: $(a + bi)(a - bi) = a^2 + b^2$. The conjugate is that trick, put to work on complex numbers.",
      },
    ],

    uses: [
      {
        title: "Current from voltage",
        text: "In an alternating-current circuit the current is the voltage divided by the impedance, $I = \\frac{V}{Z}$, and engineers divide by the conjugate method. With 120 V across $30 + 40j$ Ω: $\\frac{120}{30 + 40j} = \\frac{120(30 - 40j)}{30^2 + 40^2} = 1.44 - 1.92j$ amps. Its size is $\\frac{120}{50} = 2.4$ A, and the minus sign says the current lags the voltage.",
        tags: ["electrical"],
        image: {
          src: acCurrentDivisionImage,
          caption: "Dividing 120 V by an impedance of 30 + 40j Ω gives a current of 1.44 − 1.92j amps, of size 2.4 A.",
          alt: "A generic wall socket marked 120 V wired to a box marked 30 + 40j Ω, with a gold current arrow along the wires marked 2.4 A.",
        },
      },
      {
        title: "Flipping a sprite",
        text: "Write each point of a game sprite as $x + yi$, and taking the conjugate of every point flips the sprite over the horizontal axis: $x + yi$ becomes $x - yi$. Flipping twice gives back the original, since $\\bar{\\bar{z}} = z$. A flip followed by a quarter turn is another reflection, in a slanted line.",
        tags: ["game-design"],
        image: {
          src: spriteFlipImage,
          caption: "Taking the conjugate of every point flips a sprite across the real axis: x + yi becomes x − yi.",
          alt: "A small pennant flag above a horizontal axis and its mirror image below it, gold dashed lines joining the matching corners.",
        },
      },
    ],
  };
});
