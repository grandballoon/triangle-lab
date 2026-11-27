// Logarithms as exponents read backwards. log_b x is the power b must be
// raised to to make x; its graph is the exponential's mirrored in y = x. The
// rules for exponents, read through that mirror, become the rules for logs.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { onStage, plot, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";
import decibelMeterImage from "../../images/decibel-meter.svg";
import guessingGameHalvingImage from "../../images/guessing-game-halving.svg";
import starMagnitudesImage from "../../images/star-magnitudes.svg";

const GRAPH: Graph = { origin: { x: -4, y: -2.6 }, unit: { x: 1, y: 1 } };
const X_MAX = 11.5;
const EXP = C.violet;
const LOG = C.cyan;
const BASES = ["2", "3", "10"] as const;

const logb = (b: number, x: number): number => Math.log(x) / Math.log(b);

export default lesson((s) => {
  const which = s.choice("b =", BASES, "2");
  const snap = s.toggle("Snap to powers", true);
  const x = s.point(GRAPH.origin.x + 8, GRAPH.origin.y, {
    label: "x",
    color: C.ink,
    constrain: (p) => {
      const b = Number(which.value);
      const raw = clamp(p.x - GRAPH.origin.x, 1 / 100, X_MAX);
      const value = snap.on ? clamp(b ** Math.round(logb(b, raw)), 1 / b ** 2, X_MAX) : raw;
      return { x: GRAPH.origin.x + value, y: GRAPH.origin.y };
    },
  });
  const xValue = (): number => Math.max(x.x - GRAPH.origin.x, 1 / 100);

  return {
    steps: [
      {
        title: "The missing exponent",
        text: "$\\log_b x$ is the exponent that turns $b$ into $x$: it answers $b^{?} = x$. Since $2^3 = 8$, $\\log_2 8 = 3$. Another way to see it: $\\log_2 8$ counts how many times you halve 8 to reach 1.",
      },
      {
        title: "The curve read backwards",
        text: "Swap the roles of $x$ and $y$ in $y = b^x$ and you get $x = b^y$, which is $y = \\log_b x$. Swapping coordinates mirrors a graph in the line $y = x$, so the log curve is the exponential's reflection. It crosses 0 at $x = 1$, since $b^0 = 1$, and has no value for $x \\le 0$.",
      },
      {
        title: "Products become sums",
        text: "Exponents add when powers multiply, so logs add when numbers multiply: $\\log_b(xy) = \\log_b x + \\log_b y$. Likewise $\\log_b \\frac{x}{y} = \\log_b x - \\log_b y$ and $\\log_b x^k = k \\log_b x$. Multiplying $x$ by $b$ moves its log up by exactly 1.",
      },
      {
        title: "Changing the base",
        text: "Logs in one base are a fixed multiple of logs in another: $\\log_b x = \\frac{\\log_c x}{\\log_c b}$. So a calculator with only $\\log_{10}$ can find $\\log_2 8 = \\frac{\\log 8}{\\log 2} = \\frac{0.903}{0.301} = 3$. Switch bases to see each curve.",
      },
    ],

    draw(g, f) {
      const b = Number(which.value);
      g.grid(1);
      g.axes({ origin: GRAPH.origin, units: GRAPH.unit, every: 2 });

      // The mirror line, from step 1.
      if (f.step >= 1) {
        plot(g, GRAPH, (t) => t, { color: C.faint, width: 2, dash: [6, 6], alpha: f.at(1) });
      }
      plot(g, GRAPH, (t) => b ** t, { color: EXP, width: 2.5, alpha: f.step >= 1 ? 1 : 0.35 });
      plot(g, GRAPH, (t) => logb(b, t), { color: LOG, width: 3, from: 0.01 });

      const t = xValue();
      const y = logb(b, t);
      const onLog = onStage(GRAPH, { x: t, y });
      g.segment(x, onLog, { color: C.faint, width: 1.5, dash: [3, 5] });
      g.segment(onLog, onStage(GRAPH, { x: 0, y }), { color: C.gold, width: 3 });
      g.point(onLog, { color: LOG, r: 6 });
      g.label(onLog, fmt(y, 3), { color: C.gold, size: 15, bold: true, dx: 12, dy: 12, align: "left" });

      if (f.step >= 1) {
        // The same pair of numbers, swapped, on the exponential.
        const mirrored = onStage(GRAPH, { x: y, y: t });
        if (Math.abs(mirrored.y) <= 5 && Math.abs(mirrored.x) <= 8) {
          g.segment(onLog, mirrored, { color: C.faint, width: 1.5, dash: [2, 4], alpha: f.at(1) });
          g.point(mirrored, { color: EXP, r: 5, alpha: f.at(1) });
        }
      }
      if (f.step === 2) {
        // x·b, one unit higher on the log curve.
        const times = t * b;
        if (times <= X_MAX) {
          const up = onStage(GRAPH, { x: times, y: y + 1 });
          g.point(up, { color: C.gold, r: 5 });
          g.label(up, `×${b}: +1`, { color: C.gold, size: 13, bold: true, dx: 10, dy: 10, align: "left" });
        }
      }
    },

    readout(f) {
      const b = Number(which.value);
      const t = xValue();
      const y = logb(b, t);
      const whole = Math.abs(y - Math.round(y)) < 1e-9;
      const xTex = whole && y < 0 ? `\\frac{1}{${b ** -Math.round(y)}}` : fmt(t, 3);
      const rows: Readout[] = [
        { label: "The question", tex: `${b}^{\\,?} = ${xTex}` },
        { label: "The answer", tex: `\\log_{${b}} ${xTex} = ${whole ? Math.round(y) : fmt(y, 3)}`, tone: "good" },
        { label: "Check", tex: `${b}^{${whole ? Math.round(y) : fmt(y, 3)}} ${whole ? "=" : "\\approx"} ${xTex}` },
      ];
      if (f.step === 2) {
        rows.push({ label: "Times b", tex: `\\log_{${b}}(${b} \\cdot ${fmt(t, 3)}) = 1 + ${fmt(y, 3)} = ${fmt(y + 1, 3)}` });
        rows.push({ label: "Squared", tex: `\\log_{${b}}(${fmt(t, 3)}^2) = 2 \\cdot ${fmt(y, 3)} = ${fmt(2 * y, 3)}` });
      }
      if (f.step === 3) {
        rows.push({
          label: "By change of base",
          tex: `\\frac{\\log ${fmt(t, 3)}}{\\log ${b}} = \\frac{${fmt(Math.log10(t), 4)}}{${fmt(Math.log10(b), 4)}} = ${fmt(y, 3)}`,
        });
      }
      return rows;
    },

    likes: [
      {
        title: "Counting digits",
        text: "The number of digits in a whole number is roughly its log in base 10: 100 has 3 digits and $\\log_{10} 100 = 2$; 1000 has 4 and $\\log_{10} 1000 = 3$. Multiply two numbers and the digits of the answer are about the digits of each added together, because logs of a product add.",
      },
      {
        title: "Rungs on the ladder",
        text: "On the ladder of powers of $b$, the log of a number is just which rung it sits on: $\\log_2 16 = 4$ because 16 is the fourth rung up from 1. A number between two rungs, like 10, has a log between their numbers: $\\log_2 10 \\approx 3.32$.",
      },
    ],

    uses: [
      {
        title: "Decibels",
        text: "Sound levels are measured in decibels, which are 10 times the log, base 10, of the sound's power over a faint reference. So every 10 dB means ten times the power: from 60 dB conversation to 90 dB traffic is $10^3 = 1000$ times as much. Adding 3 dB is about doubling, since $10 \\log_{10} 2 \\approx 3$.",
        tags: ["music", "health"],
        image: {
          src: decibelMeterImage,
          caption: "Each 10 decibels means ten times the sound power: from 60 dB conversation to 90 dB traffic is 10³ = 1000 times as much.",
          alt: "A sound level meter whose scale runs from 30 to 120 dB, with a whispering face above 30, speech bubbles above 60, a car above 90, gold arcs hopping between neighbouring ticks, and one arc marked ×10.",
        },
      },
      {
        title: "Star magnitudes",
        text: "Astronomers grade stars by magnitude, a log scale where 5 steps make a factor of 100 in brightness, and smaller numbers are brighter. One step is $100^{1/5} \\approx 2.512$ times. A difference in brightness $r$ is $2.5 \\log_{10} r$ magnitudes: Sirius, about 25 times brighter than Polaris, is about $2.5 \\log_{10} 25 \\approx 3.5$ magnitudes brighter.",
        tags: ["astronomy"],
        image: {
          src: starMagnitudesImage,
          caption: "Five steps of star magnitude make a 100-fold difference in brightness, so one step is 100^(1/5), about 2.512 times.",
          alt: "A night sky above a dark hill, with stars drawn at six shrinking sizes labelled magnitudes 1 to 6.",
        },
      },
      {
        title: "Twenty questions",
        text: "To find a number from 1 to a million by asking \"higher or lower?\", halve the range with every question. After $k$ questions $2^k$ numbers can be told apart, so you need the smallest $k$ with $2^k \\ge 1\\,000\\,000$: $\\log_2 1\\,000\\,000 \\approx 19.9$, so 20 questions. Computers search sorted lists this way, which is why doubling the list costs only one more step.",
        tags: ["computing"],
        image: {
          src: guessingGameHalvingImage,
          caption: "Guessing a number from 1 to 1,000,000 by asking \"higher or lower?\" halves the range each time, so it takes at most 20 questions, since 2²⁰ is just over a million.",
          alt: "A long bar from 1 to 1,000,000, and below it the bar again for questions 1 to 5 and 20, each shading the kept half of the last range, with a gold mark at each cut.",
        },
      },
    ],
  };
});
