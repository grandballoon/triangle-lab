// Fractional exponents, read off the curve y = bˣ between its whole-number
// points. The product rule forces b^(1/2) · b^(1/2) = b, so a half power is a
// square root; a 1/q power is a q-th root, and p/q is that root taken p times.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { onStage, plot, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";
import animalMetabolismImage from "../../images/animal-metabolism.svg";
import pianoSemitonesImage from "../../images/piano-semitones.svg";

const BASES = ["4", "8", "16"] as const;
type Base = (typeof BASES)[number];
/** Each base is a power of 2: 4 = 2², 8 = 2³, 16 = 2⁴. */
const ROOT_INDEX: Record<Base, number> = { "4": 2, "8": 3, "16": 4 };
const ORIGIN = { x: -5, y: -3.4 };
/** Four stage units to each whole step of x, so x runs from 0 to 2. */
const X_UNIT = 0.25;
const X_MAX = 2;
const CURVE = C.violet;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export default lesson((s) => {
  const which = s.choice("b =", BASES, "8");
  const snap = s.toggle("Snap to fractions", true);
  const graph = (): Graph => {
    const b = Number(which.value);
    return { origin: ORIGIN, unit: { x: X_UNIT, y: (b * b) / 8 } };
  };
  const q = (): number => ROOT_INDEX[which.value];
  const x = s.point(ORIGIN.x + 2 / 3 / X_UNIT, ORIGIN.y, {
    label: "x",
    color: C.ink,
    constrain: (p) => {
      const raw = clamp((p.x - ORIGIN.x) * X_UNIT, 0, X_MAX);
      const value = snap.on ? Math.round(raw * q()) / q() : raw;
      return { x: ORIGIN.x + value / X_UNIT, y: ORIGIN.y };
    },
  });
  const xValue = (): number => (x.x - ORIGIN.x) * X_UNIT;

  return {
    steps: [
      {
        title: "The whole powers",
        text: "The curve is $y = b^x$. At the whole numbers it is what we know: $b^0 = 1$, $b^1 = b$, $b^2 = b \\cdot b$. But a smooth curve runs between them, so what can a power like $b^{1/2}$ mean, half a factor?",
      },
      {
        title: "Half a power is a square root",
        text: "Whatever $b^{1/2}$ is, the product rule says $b^{1/2} \\cdot b^{1/2} = b^{1/2 + 1/2} = b^1 = b$. A number that times itself gives $b$ is $\\sqrt{b}$, so $b^{1/2} = \\sqrt{b}$. With $b = 4$ the curve passes through 2 at $x = \\frac12$.",
      },
      {
        title: "Other roots",
        text: "In the same way, $q$ copies of $b^{1/q}$ multiply to $b$, so $b^{1/q} = \\sqrt[q]{b}$, the $q$-th root. With $b = 8$, $8^{1/3} = 2$, since $2 \\cdot 2 \\cdot 2 = 8$; with $b = 16$, $16^{1/4} = 2$.",
      },
      {
        title: "Any fraction",
        text: "Then $b^{p/q} = (b^{1/q})^p = (\\sqrt[q]{b})^p$, the root taken $p$ times, and the same as $\\sqrt[q]{b^p}$. So $8^{2/3} = 2^2 = 4$, and $8^{-2/3} = \\frac14$. Turn snapping off to drag to any $x$: the curve fills in every number between.",
      },
    ],

    draw(g, f) {
      const b = Number(which.value);
      const gr = graph();
      const qq = q();
      const root = 2;
      g.grid(1);
      g.axes({ origin: ORIGIN, units: gr.unit, positive: true, every: 4 });

      plot(g, gr, (t) => b ** t, { color: CURVE, width: 3, from: 0, to: X_MAX });

      // The whole powers, and from step 2 the q-th root and its powers.
      for (let k = 0; k <= 2; k++) g.point(onStage(gr, { x: k, y: b ** k }), { color: CURVE, r: 6 });
      if (f.step >= 1) {
        const marks = f.step === 1 ? [1 / 2] : Array.from({ length: 2 * qq - 1 }, (_, i) => (i + 1) / qq);
        for (const t of marks) {
          if (Math.abs(t - Math.round(t)) < 1e-9) continue;
          const v = b ** t;
          g.point(onStage(gr, { x: t, y: v }), { color: C.gold, r: 5, alpha: f.at(1) });
        }
        if (f.step >= 2) {
          // Root steps up the y-axis: 1, 2, 4, 8, ... each a factor of the root.
          for (let k = 1; root ** k <= b * b; k++) {
            const at = onStage(gr, { x: 0, y: root ** k });
            g.segment(at, { x: at.x + 0.3, y: at.y }, { color: C.gold, width: 2 });
          }
        }
      }

      // The point being read.
      const t = xValue();
      const v = b ** t;
      const onCurve = onStage(gr, { x: t, y: v });
      const foot = onStage(gr, { x: 0, y: v });
      g.segment(x, onCurve, { color: C.faint, width: 1.5, dash: [3, 5] });
      g.segment(onCurve, foot, { color: C.faint, width: 1.5, dash: [3, 5] });
      g.point(onCurve, { color: C.ink, r: 6 });
      g.label(onCurve, fmt(v, 3), { color: C.ink, size: 15, bold: true, dx: -12, dy: 16, align: "right" });
    },

    readout(f) {
      const b = Number(which.value);
      const qq = q();
      const t = xValue();
      const v = b ** t;
      const rows: Readout[] = [];
      const numerator = Math.round(t * qq);
      const snapped = Math.abs(t * qq - numerator) < 1e-9;
      if (!snapped) {
        rows.push({ label: "Between the fractions", tex: `${b}^{${fmt(t, 3)}} \\approx ${fmt(v, 3)}` });
      } else {
        const d = gcd(numerator, qq) || qq;
        const [p, r] = [numerator / d, qq / d];
        const exponent = r === 1 ? String(p) : `\\frac{${p}}{${r}}`;
        const rootValue = b ** (1 / r);
        const rootTex = r === 1 ? String(b) : r === 2 ? `\\sqrt{${b}}` : `\\sqrt[${r}]{${b}}`;
        rows.push({ label: "Where x is", tex: `x = ${exponent}` });
        if (r === 1) rows.push({ label: "A whole power", tex: `${b}^{${p}} = ${fmt(v, 3)}` });
        else rows.push({ label: f.step === 0 ? "On the curve" : "As a root", tex: `${b}^{${exponent}} = \\left(${rootTex}\\right)^{${p}} = ${fmt(rootValue, 3)}^{${p}} = ${fmt(v, 3)}`, tone: f.step === 0 ? "plain" : "good" });
      }
      if (f.step >= 2) {
        rows.push({ label: "Why", tex: `\\underbrace{${b}^{1/${qq}} \\cdots ${b}^{1/${qq}}}_{${qq} \\text{ factors}} = ${b}^{${qq}/${qq}} = ${b}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Halfway in a doubling",
        text: "Money that doubles every 10 years does not grow by half in the first 5. Over two 5-year spells it must double, so each spell multiplies it by the same number $r$ with $r \\cdot r = 2$: $r = 2^{1/2} = \\sqrt2 \\approx 1.414$. After 5 years it has grown by about 41%, not 50%.",
      },
      {
        title: "The side of a cube",
        text: "A cube's volume grows as its side cubed. To find the side of a cube holding 8 litres, you ask what side, cubed, makes 8: the side is $8^{1/3} = 2$ decimetres. The $\\frac13$ power undoes the cubing, just as the $\\frac12$ power undoes squaring.",
      },
    ],

    uses: [
      {
        title: "Tuning a piano",
        text: "A piano tuned in equal temperament has 12 equal semitones to the octave, and an octave doubles the pitch. So each semitone multiplies the pitch by $2^{1/12} \\approx 1.0595$. Seven semitones up, the fifth is $2^{7/12} \\approx 1.498$ times the pitch, a whisker under the pure ratio $\\frac32$.",
        tags: ["music"],
        image: {
          src: pianoSemitonesImage,
          caption: "In equal temperament each semitone multiplies the pitch by the twelfth root of 2, so twelve of them double it: from A at 220 Hz to A at 440 Hz.",
          alt: "An octave of piano keys from A to A, gold arcs hopping between neighbouring keys, the end keys lettered A and labelled 220 Hz and 440 Hz above.",
        },
      },
      {
        title: "How much a bigger animal eats",
        text: "Across mammals, resting energy use grows roughly as body mass to the power $\\frac34$, a pattern called Kleiber's law. An animal 16 times heavier needs about $16^{3/4} = (\\sqrt[4]{16})^3 = 2^3 = 8$ times the energy, so pound for pound it needs only half as much. That is one reason an elephant eats less for its size than a mouse.",
        tags: ["nature"],
        image: {
          src: animalMetabolismImage,
          caption: "Kleiber's rule: an animal's resting energy use grows about as its mass to the power 3/4, so an animal 16 times heavier uses about 16^(3/4) = 8 times as much.",
          alt: "A cat beside a large dog, an arrow between them marked mass × 16 and energy × 8.",
        },
      },
    ],
  };
});
