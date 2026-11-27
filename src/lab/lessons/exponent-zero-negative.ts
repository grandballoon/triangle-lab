// Zero and negative exponents, from a ladder of powers. Each rung down
// divides by the base, so carrying on below the first power gives a⁰ = 1 and
// then the reciprocals a⁻ⁿ = 1/aⁿ, the only values that keep the product
// rule true.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { powerText } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import cameraStopsImage from "../../images/camera-stops.svg";
import resistorCapacitorValuesImage from "../../images/resistor-capacitor-values.svg";

const TOP = 4;
const BOTTOM = -3;
const RUNG_X = { left: -4.4, right: 2.4 };
const rungY = (k: number): number => 0.1 + (k - 0.5) * 0.9;

/** a^k written as a fraction when k is negative. */
function valueText(a: number, k: number): string {
  return k >= 0 ? String(a ** k) : `1/${a ** -k}`;
}

export default lesson((s) => {
  const base = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 2, max: 10, value: 2, step: 1 });
  const pick = s.slider({ label: "k =", at: { x: -1.6, y: -4.3 }, width: 4.2, min: BOTTOM, max: TOP, value: 3, step: 1 });

  /** How far down the ladder each step has reached. */
  const lowest = (step: number): number => (step === 0 ? 1 : step === 1 ? 0 : BOTTOM);

  return {
    steps: [
      {
        title: "Down the ladder, divide",
        text: "Write the powers of $a$ as rungs of a ladder. Going up a rung multiplies by $a$; going down divides by $a$: $2^4 = 16$, $2^3 = 8$, $2^2 = 4$, $2^1 = 2$. The ladder seems to stop at $a^1$, since a row of factors cannot be shorter than one.",
      },
      {
        title: "The zeroth power is 1",
        text: "One more rung down divides $a^1$ by $a$ and gives 1, so $a^0 = 1$. That is also what the quotient rule says: $\\frac{a^m}{a^m} = a^{m-m} = a^0$, and anything divided by itself is 1. The base can be any number except 0, since dividing by 0 means nothing.",
      },
      {
        title: "Negative powers are reciprocals",
        text: "Keep going and the rungs below 1 are $\\frac{1}{a}$, $\\frac{1}{a^2}$, $\\frac{1}{a^3}$. So $a^{-n} = \\frac{1}{a^n}$. The product rule still holds: $a^3 \\cdot a^{-3} = a^0 = 1$, because $a^{-3}$ undoes the three factors of $a^3$.",
      },
      {
        title: "Flipping a fraction",
        text: "A negative exponent on a fraction flips it: $\\left(\\frac{2}{3}\\right)^{-2} = \\frac{1}{(2/3)^2} = \\left(\\frac{3}{2}\\right)^2 = \\frac{9}{4}$. And a negative exponent underneath moves a factor up: $\\frac{1}{a^{-n}} = a^n$.",
      },
    ],

    draw(g, f) {
      const a = base.value;
      const chosen = pick.value;
      const last = lowest(f.step);

      g.segment({ x: RUNG_X.left - 0.3, y: rungY(BOTTOM) - 0.4 }, { x: RUNG_X.left - 0.3, y: rungY(TOP) + 0.4 }, { color: C.dim, width: 3 });
      g.segment({ x: RUNG_X.right + 0.3, y: rungY(BOTTOM) - 0.4 }, { x: RUNG_X.right + 0.3, y: rungY(TOP) + 0.4 }, { color: C.dim, width: 3 });

      for (let k = TOP; k >= BOTTOM; k--) {
        const y = rungY(k);
        const shown = k >= last;
        const alpha = shown ? 1 : 0.18;
        const color = k > 0 ? C.cyan : k === 0 ? C.gold : C.violet;
        const lit = k === chosen && shown;
        g.polygon(
          [
            { x: RUNG_X.left, y: y - 0.36 },
            { x: RUNG_X.right, y: y - 0.36 },
            { x: RUNG_X.right, y: y + 0.36 },
            { x: RUNG_X.left, y: y + 0.36 },
          ],
          { color, fill: tint(color, lit ? 0.4 : 0.12), width: lit ? 3 : 1.5, alpha },
        );
        g.label({ x: RUNG_X.left + 0.4, y }, powerText(a, k), { color: C.ink, size: 16, bold: true, align: "left", dy: -6, alpha });
        g.label({ x: RUNG_X.right - 0.4, y }, shown ? valueText(a, k) : "?", { color: C.ink, size: 16, bold: true, align: "right", dy: -6, alpha });

        // The step from this rung down to the next.
        if (k > BOTTOM && k - 1 >= last) {
          const below = rungY(k - 1);
          g.arrow({ x: RUNG_X.right + 0.9, y: y - 0.1 }, { x: RUNG_X.right + 0.9, y: below + 0.1 }, { color: C.dim, width: 2 });
          g.label({ x: RUNG_X.right + 1.2, y: (y + below) / 2 }, `÷ ${a}`, { color: C.dim, size: 13, align: "left", dy: -5 });
        }
      }
    },

    readout(f) {
      const a = base.value;
      const k = pick.value;
      const rows: Readout[] = [];
      if (k < lowest(f.step)) {
        return [{ label: `Rung ${k}`, tex: `${a}^{${k}} = \\ ?\\quad\\text{(not reached yet)}`, tone: "dim" }];
      }
      if (k > 0) rows.push({ label: "The rung", tex: `${a}^{${k}} = ${Array.from({ length: k }, () => a).join(" \\cdot ")} = ${a ** k}` });
      else if (k === 0) rows.push({ label: "The rung", tex: `${a}^{0} = \\frac{${a}^1}{${a}} = 1`, tone: "good" });
      else rows.push({ label: "The rung", tex: `${a}^{${k}} = \\frac{1}{${a}^{${-k}}} = \\frac{1}{${a ** -k}} = ${fmt(a ** k, 4)}`, tone: "good" });
      if (k < TOP) rows.push({ label: "From the rung above", tex: `${a}^{${k}} = ${a}^{${k + 1}} \\div ${a}` });
      if (f.step >= 2 && k !== 0) {
        rows.push({ label: "Product rule check", tex: `${a}^{${k}} \\cdot ${a}^{${-k}} = ${a}^{${k} + (${-k})} = ${a}^0 = 1` });
      }
      if (f.step >= 3) rows.push({ label: "Flipped", tex: `\\left(\\frac{1}{${a}}\\right)^{${-k}} = ${a}^{${k}}` });
      return rows;
    },

    likes: [
      {
        title: "Moving the decimal point",
        text: "Each place to the right of a number's units is worth a tenth of the place before it: tenths, hundredths, thousandths. They are the rungs $10^{-1}$, $10^{-2}$, $10^{-3}$ of the same ladder whose rungs above are tens, hundreds and thousands. The units place in the middle is $10^0 = 1$.",
      },
      {
        title: "Halving a pizza",
        text: "Cut a pizza in half, then halve a slice, and halve again. The slices are $\\frac12$, $\\frac14$, $\\frac18$ of the pizza: $2^{-1}$, $2^{-2}$, $2^{-3}$. Each cut moves one rung down. Putting eight of the smallest slices back together climbs three rungs, $2^{-3} \\cdot 2^3 = 1$ whole pizza.",
      },
    ],

    uses: [
      {
        title: "Reading component values",
        text: "Electrical parts are labelled with metric prefixes, each a power of ten: kilo is $10^3$, milli $10^{-3}$, micro $10^{-6}$, nano $10^{-9}$. A 4.7 kΩ resistor is $4.7 \\times 10^3 = 4700$ ohms. A 100 nF capacitor is $100 \\times 10^{-9} = 10^2 \\cdot 10^{-9} = 10^{-7}$ farads, or 0.1 µF.",
        tags: ["electrical"],
        image: {
          src: resistorCapacitorValuesImage,
          caption: "Electrical parts are marked with metric prefixes: a 4.7 kΩ resistor is 4.7 × 10³ ohms, and a 100 nF capacitor is 100 × 10⁻⁹ farads.",
          alt: "A striped resistor labelled 4.7 kΩ = 4.7 × 10³ Ω and a small disc capacitor labelled 100 nF = 10⁻⁷ F.",
        },
      },
      {
        title: "Stops on a camera",
        text: "Photographers measure light in stops, and each stop halves it or doubles it. Closing the lens three stops lets in $2^{-3} = \\frac18$ of the light, so to keep the picture as bright the shutter must stay open $2^3 = 8$ times as long. The two changes cancel: $2^{-3} \\cdot 2^3 = 2^0 = 1$.",
        tags: ["art", "light"],
        image: {
          src: cameraStopsImage,
          caption: "Each stop down on a camera lets in half the light: one stop is 2⁻¹ of it, three stops 2⁻³ = 1/8.",
          alt: "A lens drawn at four apertures, each opening half the area of the one before, labelled 1, 1/2, 1/4 and 1/8.",
        },
      },
    ],
  };
});
