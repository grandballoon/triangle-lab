// Expected value. Roll a die many times and the running average settles
// near 3.5, the mean of its faces. In general the expected value is each
// outcome times its probability, summed: the balance point of the outcomes
// weighted by their chances. A game is fair when its expected value is 0,
// and expected values add, so two dice have an expected sum of 7.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { rolls, waysToSum } from "../kit/probability.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import fourthDownChoiceImage from "../../images/fourth-down-choice.svg";
import insuranceExpectedClaimImage from "../../images/insurance-expected-claim.svg";

const RUN = C.cyan;
const MEAN = C.gold;
const WIN = C.green;
const LOSE = C.red;
const BAR = C.violet;
const COUNT = 600;

/** A balance point under a beam at `y`. */
function fulcrum(g: Draw, x: number, y: number, text: string, alpha = 1): void {
  const tip: Vec = { x, y: y - 0.02 };
  g.polygon([tip, { x: x - 0.32, y: y - 0.6 }, { x: x + 0.32, y: y - 0.6 }], { color: MEAN, fill: tint(MEAN, 0.5), width: 2, alpha });
  g.label({ x, y: y - 0.6 }, text, { color: MEAN, size: 14, bold: true, dy: -14, alpha });
}

export default lesson((s) => {
  const p = s.slider({ label: "win chance", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0.05, max: 0.95, value: 0.25, step: 0.05, format: (v) => fmt(v, 2) });
  const prize = s.slider({ label: "prize", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 9, value: 2, step: 0.5, format: (v) => fmt(v, 1) });
  let seed = 7;
  s.button("Roll again", () => {
    seed += 1;
  });

  return {
    steps: [
      {
        title: "The long-run average",
        text: "Roll a fair die again and again and keep the average of all the rolls so far. Early on it jumps about, but over 600 rolls it settles near 3.5, the mean of the faces: $\\frac{1 + 2 + 3 + 4 + 5 + 6}{6} = 3.5$. No single roll is 3.5; it is what the rolls average to in the long run. Roll again for another run.",
      },
      {
        title: "A weighted average",
        text: "The expected value of a random quantity is each value times its probability, all added: $E = \\sum x \\cdot P(x)$. In a game that pays the prize $W$ with probability $p$ and otherwise loses a stake of 1, $E = pW - (1 - p)$. Weights of $p$ and $1 - p$ at $W$ and $-1$ balance at $E$; with $p = 0.25$ and $W = 2$, $E = 0.5 - 0.75 = -0.25$.",
      },
      {
        title: "A fair game",
        text: "A game is fair when its expected value is 0: then $pW = 1 - p$, so $W = \\frac{1 - p}{p}$. At $p = \\frac{1}{4}$ a fair prize is 3, which is paying at the odds against, $3 : 1$. A smaller prize loses on average, and a larger one wins.",
      },
      {
        title: "Expectations add",
        text: "The expected value of a sum is the sum of the expected values. Each die has $E = 3.5$, so the sum of two dice has $E = 3.5 + 3.5 = 7$, which is the balance point of the 11 sums weighted by their $\\frac{1}{36}, \\frac{2}{36}, \\ldots, \\frac{6}{36}, \\ldots, \\frac{1}{36}$. Likewise 10 coin flips have an expected 5 heads.",
      },
    ],

    draw(g, f) {
      if (f.step === 0) {
        // Running average of a seeded run, against the number of rolls.
        const r = rolls(seed, COUNT);
        const [x0, x1, y0, y1] = [-6.6, 7.0, -2.4, 3.2];
        const yOf = (v: number): number => y0 + ((v - 1) / 5) * (y1 - y0);
        const xOf = (n: number): number => x0 + (n / COUNT) * (x1 - x0);
        g.segment({ x: x0, y: y0 }, { x: x1, y: y0 }, { color: C.dim, width: 1.5 });
        g.segment({ x: x0, y: y0 }, { x: x0, y: y1 }, { color: C.dim, width: 1.5 });
        for (let v = 1; v <= 6; v++) g.label({ x: x0, y: yOf(v) }, String(v), { color: C.dim, size: 12, dx: -12 });
        for (const n of [100, 300, 600]) g.label({ x: xOf(n), y: y0 }, String(n), { color: C.dim, size: 12, dy: -14 });
        g.segment({ x: x0, y: yOf(3.5) }, { x: x1, y: yOf(3.5) }, { color: MEAN, width: 2, dash: [6, 5] });
        g.label({ x: x1, y: yOf(3.5) }, "3.5", { color: MEAN, size: 14, bold: true, dy: 14, align: "right" });
        const shown = Math.max(2, Math.round(COUNT * f.at(0)));
        const pts: Vec[] = [];
        let total = 0;
        for (let i = 0; i < shown; i++) {
          total += r[i];
          pts.push({ x: xOf(i + 1), y: yOf(total / (i + 1)) });
        }
        g.path(pts, { color: RUN, width: 2.5 });
        g.label({ x: -6.2, y: 4.0 }, `average of ${shown} rolls: ${fmt(total / shown, 3)}`, { color: RUN, size: 17, bold: true, align: "left" });
        return;
      }

      if (f.step === 3) {
        const [x0, y0, w, per] = [-6.6, -0.9, 1.2, 4.2 / 6];
        g.segment({ x: x0 - 0.2, y: y0 }, { x: x0 + 11 * w + 0.2, y: y0 }, { color: C.ink, width: 3 });
        for (let t = 2; t <= 12; t++) {
          const x = x0 + (t - 2) * w;
          box(g, { x: x + 0.12, y: y0 }, { x: x + w - 0.12, y: y0 + waysToSum(t) * per * f.at(3) }, { color: BAR, fill: tint(BAR, 0.4), width: 1.5 });
          g.label({ x: x + w / 2, y: y0 + waysToSum(t) * per * f.at(3) }, `${waysToSum(t)}/36`, { color: C.dim, size: 11, bold: true, dy: 10, alpha: f.at(3) });
          g.label({ x: x + w / 2, y: y0 }, String(t), { color: C.dim, size: 12, bold: true, dy: -18 });
        }
        fulcrum(g, x0 + 5.5 * w, y0 - 0.55, "E = 3.5 + 3.5 = 7");
        return;
      }

      // The game: lose 1 or win the prize, weights by chance.
      const [P, W] = [p.value, prize.value];
      const E = P * W - (1 - P);
      const [lo, hi] = [-1, 9];
      const x0 = -6.6;
      const per = 13.2 / (hi - lo);
      const xOf = (v: number): number => x0 + (v - lo) * per;
      const y = -1.0;
      g.segment({ x: xOf(lo) - 0.2, y }, { x: xOf(hi) + 0.2, y }, { color: C.ink, width: 3 });
      for (let v = lo; v <= hi; v++) {
        g.segment({ x: xOf(v), y: y - 0.12 }, { x: xOf(v), y: y + 0.12 }, { color: C.dim, width: 1.5 });
        g.label({ x: xOf(v), y }, String(v).replace("-", "−"), { color: C.dim, size: 12, dy: -18 });
      }
      const weight = (v: number, chance: number, color: string, name: string): void => {
        const h = chance * 3.6;
        box(g, { x: xOf(v) - 0.32, y }, { x: xOf(v) + 0.32, y: y + h }, { color, fill: tint(color, 0.5), width: 2 });
        g.label({ x: xOf(v), y: y + h }, name, { color, size: 13, bold: true, dy: 12 });
      };
      weight(-1, 1 - P, LOSE, `lose 1: ${fmt(1 - P, 2)}`);
      weight(W, P, WIN, `win ${fmt(W, 1)}: ${fmt(P, 2)}`);
      fulcrum(g, xOf(E), y - 0.55, `E = ${fmt(E, 3)}`, f.at(1));

      if (f.step === 2) {
        const fair = (1 - P) / P;
        if (fair <= hi) {
          const xf = xOf(fair);
          g.segment({ x: xf, y: y + 0.2 }, { x: xf, y: 3.2 }, { color: MEAN, width: 2, dash: [5, 5], alpha: f.at(2) });
          g.label({ x: xf, y: 3.2 }, `fair prize ${fmt(fair, 2)}`, { color: MEAN, size: 14, bold: true, dy: 12, alpha: f.at(2) });
        } else {
          g.label({ x: 0, y: 3.4 }, `fair prize ${fmt(fair, 2)}, off the scale`, { color: MEAN, size: 14, bold: true, alpha: f.at(2) });
        }
        const verdict = Math.abs(E) < 1e-9 ? "fair" : E < 0 ? "loses on average" : "wins on average";
        g.label({ x: 0, y: 4.2 }, `this game ${verdict}`, { color: Math.abs(E) < 1e-9 ? MEAN : E < 0 ? LOSE : WIN, size: 17, bold: true, alpha: f.at(2) });
      }
    },

    readout(f) {
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Mean of the faces", tex: "\\frac{1 + 2 + 3 + 4 + 5 + 6}{6} = 3.5", tone: "good" });
      } else if (f.step === 3) {
        rows.push({ label: "Sum of two dice", tex: "E = 3.5 + 3.5 = 7", tone: "good" });
        rows.push({ label: "Ten coin flips", tex: "E = 10 \\cdot \\frac{1}{2} = 5" });
      } else {
        const [P, W] = [p.value, prize.value];
        const E = P * W - (1 - P);
        rows.push({ label: "Expected value", tex: `${fmt(P, 2)} \\cdot ${fmt(W, 1)} - ${fmt(1 - P, 2)} \\cdot 1 = ${fmt(E, 3)}`, tone: f.step === 1 ? "good" : "plain" });
        if (f.step === 2) rows.push({ label: "Fair prize", tex: `W = \\frac{1 - ${fmt(P, 2)}}{${fmt(P, 2)}} = ${fmt((1 - P) / P, 3)}`, tone: Math.abs(E) < 1e-9 ? "good" : "plain" });
      }
      return rows;
    },

    likes: [
      {
        title: "Points per turn",
        text: "A player who scores 0, 2 or 10 on a turn, 10 only once in five turns, can work out a typical haul over many turns without playing them: the scores weighted by how often they come. One turn is never exactly average, but a long game is.",
      },
      {
        title: "A seesaw",
        text: "A heavy child near the middle balances a light child far out. Expected value is that balance point, with probabilities for weights: a large prize at a small chance can balance a small loss at a large chance.",
      },
    ],

    uses: [
      {
        title: "Pricing insurance",
        text: "If a house has a 1 in 200 chance a year of a claim of 30000, the expected claim is $\\frac{1}{200} \\times 30000 = 150$ a year. An insurer covering many houses pays out close to 150 each on average, so it must charge more than that to cover its costs.",
        tags: ["money", "home"],
        image: {
          src: insuranceExpectedClaimImage,
          caption: "A 1 in 200 chance of a 30000 claim is an expected claim of 30000 ÷ 200 = 150 a year.",
          alt: "A grid of 200 small houses, one in gold marked claim 30000, beside the line 1/200 × 30000 = 150 a year.",
        },
      },
      {
        title: "Going for it on fourth down",
        text: "A football coach can kick a field goal worth 3 points that succeeds 90% of the time, or try for a touchdown worth 7 that succeeds half the time. The expected points are $0.9 \\times 3 = 2.7$ and $0.5 \\times 7 = 3.5$, so on average going for the touchdown is worth more.",
        tags: ["sport"],
        image: {
          src: fourthDownChoiceImage,
          caption: "A field goal: 0.9 × 3 = 2.7 expected points; going for a touchdown: 0.5 × 7 = 3.5.",
          alt: "Two options side by side, a goal post labelled 0.9 × 3 = 2.7 and an end zone labelled 0.5 × 7 = 3.5 in gold.",
        },
      },
    ],
  };
});
