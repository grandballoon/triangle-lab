// Probability as favourable over possible. When every outcome is equally
// likely, the probability of an event is the number of outcomes in it over
// the number of outcomes. Two dice have 36 equally likely ordered outcomes,
// so their sums are not equally likely; a seeded run of 360 rolls shows the
// counts landing near 10 times the number of ways. And the chance that
// something happens is 1 minus the chance that it does not.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { cellAt, die, diceGrid, rolls, texFracReduced, waysToSum, type DiceGrid } from "../kit/probability.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import raffleTicketChanceImage from "../../images/raffle-ticket-chance.svg";
import twoDiceSumCountsImage from "../../images/two-dice-sum-counts.svg";

const HIT = C.gold;
const MISS = C.cyan;
const BAR = C.violet;
const RUN = 360;

const GRID: DiceGrid = { origin: { x: -7.2, y: -2.6 }, cell: 0.85 };

export default lesson((s) => {
  const sum = s.slider({ label: "sum =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 12, value: 7, step: 1 });
  const face = s.slider({ label: "at least one", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 6, value: 6, step: 1 });
  let seed = 1;
  s.button("Roll again", () => {
    seed += 1;
  });

  return {
    steps: [
      {
        title: "Favourable over possible",
        text: "When all $n$ outcomes of an experiment are equally likely, the probability of an event is the number of outcomes in it over $n$. A fair die has 6 equally likely faces, and 2 of them are at least 5, so $P(\\text{at least } 5) = \\frac{2}{6} = \\frac{1}{3}$. A probability is always between 0 (impossible) and 1 (certain).",
      },
      {
        title: "Two dice, 36 outcomes",
        text: "Roll two dice and call them first and second, so they can be told apart. Each of the 6 faces of the first can go with each of the 6 of the second: 36 equally likely pairs. A sum of 7 comes from 6 of them, $(1,6), (2,5), \\ldots, (6,1)$, so $P(7) = \\frac{6}{36} = \\frac{1}{6}$. Slide the sum to count others.",
      },
      {
        title: "Sums are not equally likely",
        text: "There are 11 possible sums, from 2 to 12, but $P(2)$ is not $\\frac{1}{11}$: only $(1,1)$ makes 2, while six pairs make 7. Count the 36 equally likely ordered pairs, not the 11 sums. In 360 rolls expect about $360 \\cdot \\frac{6}{36} = 60$ sevens and 10 twos; the gold marks are one run of 360 rolls, and Roll again makes another.",
      },
      {
        title: "The complement",
        text: "An event and its complement, the event that it does not happen, together cover every outcome, so $P(\\text{not } E) = 1 - P(E)$. For at least one 6 on two dice, count the pairs with no 6 instead: $5 \\cdot 5 = 25$. So $P(\\text{at least one } 6) = 1 - \\frac{25}{36} = \\frac{11}{36}$.",
      },
    ],

    draw(g, f) {
      const S = sum.value;
      const K = face.value;

      if (f.step === 0) {
        for (let n = 1; n <= 6; n++) {
          const hit = n >= 5;
          die(g, { x: -5.6 + (n - 1) * 2.24, y: 1.0 }, 1.6, n, hit ? HIT : C.ink, hit ? tint(HIT, 0.25 * f.at(0) + 0.05) : undefined);
        }
        g.label({ x: 0, y: 3.2 }, "6 equally likely faces", { color: C.ink, size: 18, bold: true });
        g.label({ x: 0, y: -1.2 }, "at least 5: 2 of the 6", { color: HIT, size: 18, bold: true, alpha: f.at(0) });
        // A line from impossible to certain.
        const [a, b, y] = [-5.6, 5.6, -2.4];
        g.segment({ x: a, y }, { x: b, y }, { color: C.dim, width: 2 });
        for (const [t, name] of [[0, "0"], [1, "1"]] as const) g.label({ x: a + t * (b - a), y }, name, { color: C.dim, size: 12, dy: -16 });
        g.point({ x: a + (b - a) / 3, y }, { color: HIT, r: 7, alpha: f.at(0) });
        g.label({ x: a + (b - a) / 3, y }, "1/3", { color: HIT, size: 14, bold: true, dy: 14, alpha: f.at(0) });
        return;
      }

      if (f.step === 1 || f.step === 2) {
        diceGrid(g, GRID, (a, b) => (a + b === S ? HIT : null), { text: (a, b) => String(a + b) });
        if (f.step === 1) {
          const ways = waysToSum(S);
          g.label({ x: 0.2, y: 2.6 }, `sum ${S}: ${ways} of 36 pairs`, { color: HIT, size: 18, bold: true, align: "left", alpha: f.at(1) });
          g.label({ x: 0.2, y: 1.8 }, `P(${S}) = ${ways}/36`, { color: HIT, size: 18, bold: true, align: "left", alpha: f.at(1) });
          for (let a = 1; a <= 6; a++) {
            const b = S - a;
            if (b < 1 || b > 6) continue;
            const i = a - Math.max(1, S - 6);
            g.label({ x: 0.2 + (i % 3) * 2.2, y: 0.8 - Math.floor(i / 3) * 0.7 }, `(${a}, ${b})`, { color: C.ink, size: 16, bold: true, align: "left", alpha: f.at(1) });
          }
          return;
        }
        // Expected counts out of 360, and one seeded run.
        const counts = new Array<number>(13).fill(0);
        const r1 = rolls(seed, RUN);
        const r2 = rolls(seed + 1000, RUN);
        for (let i = 0; i < RUN; i++) counts[r1[i] + r2[i]]++;
        const [x0, y0, w, per] = [-1.1, -2.4, 0.78, 4.8 / 75];
        for (let t = 2; t <= 12; t++) {
          const x = x0 + (t - 2) * w;
          const expect = waysToSum(t) * (RUN / 36);
          const color = t === S ? HIT : BAR;
          box(g, { x: x + 0.08, y: y0 }, { x: x + w - 0.08, y: y0 + expect * per }, { color, fill: tint(color, 0.35), width: 1.5 });
          const y = y0 + counts[t] * per;
          g.segment({ x: x + 0.02, y }, { x: x + w - 0.02, y }, { color: HIT, width: 3, alpha: f.at(2) });
          g.label({ x: x + w / 2, y: y0 }, String(t), { color: t === S ? HIT : C.dim, size: 12, bold: true, dy: -14 });
        }
        g.label({ x: x0, y: 3.4 }, `out of ${RUN}: bars expected, gold rolled`, { color: C.dim, size: 13, bold: true, align: "left" });
        g.label({ x: x0, y: 2.8 }, `sum ${S}: expect ${fmt(waysToSum(S) * 10)}, rolled ${counts[S]}`, { color: HIT, size: 15, bold: true, align: "left", alpha: f.at(2) });
        return;
      }

      // At least one K, and its complement.
      diceGrid(g, GRID, (a, b) => (a === K || b === K ? HIT : MISS));
      const c = cellAt(GRID, K, K);
      g.circle(c, 0.3, { color: C.ink, width: 2 });
      g.label({ x: 0.2, y: 2.6 }, `at least one ${K}: 11 pairs`, { color: HIT, size: 18, bold: true, align: "left" });
      g.label({ x: 0.2, y: 1.8 }, `no ${K}: 5 × 5 = 25 pairs`, { color: MISS, size: 18, bold: true, align: "left", alpha: f.at(3) });
      g.label({ x: 0.2, y: 0.8 }, "1 − 25/36 = 11/36", { color: C.ink, size: 18, bold: true, align: "left", alpha: f.at(3) });
      g.label({ x: 0.2, y: 0.0 }, `(${K}, ${K}) is counted once, not twice`, { color: C.dim, size: 14, bold: true, align: "left", alpha: f.at(3) });
    },

    readout(f) {
      const S = sum.value;
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Probability", tex: "P(E) = \\frac{\\text{outcomes in } E}{\\text{all outcomes}}" });
        rows.push({ label: "At least 5", tex: "\\frac{2}{6} = \\frac{1}{3}", tone: "good" });
      } else if (f.step === 1 || f.step === 2) {
        rows.push({ label: `Sum ${S}`, tex: `P(${S}) = ${texFracReduced(waysToSum(S), 36)}`, tone: "good" });
        if (f.step === 2) rows.push({ label: "In 360 rolls", tex: `360 \\cdot \\frac{${waysToSum(S)}}{36} = ${waysToSum(S) * 10}` });
      } else {
        rows.push({ label: "Complement", tex: "P(\\text{not } E) = 1 - P(E)" });
        rows.push({ label: `At least one ${face.value}`, tex: "1 - \\frac{25}{36} = \\frac{11}{36}", tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Drawing a name from a hat",
        text: "With 20 names in a hat and yours on 1 slip, your chance is $\\frac{1}{20}$; put your name on 3 slips and it is $\\frac{3}{20}$. The slips are the equally likely outcomes, and yours are the favourable ones.",
      },
      {
        title: "A shuffled playlist",
        text: "A playlist of 12 songs, 4 of them by one band, picks the first song at random. The chance it is by that band is $\\frac{4}{12} = \\frac{1}{3}$, and the chance it is not is $1 - \\frac{1}{3} = \\frac{2}{3}$.",
      },
    ],

    uses: [
      {
        title: "Why 7 comes up most",
        text: "Board games that move by the sum of two dice rely on 7 being the commonest roll: 6 of the 36 pairs make it, against 1 each for 2 and 12. A designer who puts the most valuable square or resource on 7, and the rarest on 2 and 12, is pricing them by these counts.",
        tags: ["game-design"],
        image: {
          src: twoDiceSumCountsImage,
          caption: "Of the 36 ways two dice can land, 6 make a sum of 7 and only 1 each makes 2 or 12.",
          alt: "A bar chart of the number of ways to roll each sum from 2 to 12 with two dice, rising 1, 2, 3, 4, 5 to a gold bar of 6 at 7 and falling back to 1 at 12.",
        },
      },
      {
        title: "Raffle tickets",
        text: "In a raffle of 200 tickets drawn fairly, each ticket is an equally likely outcome. Buying 5 of them gives a chance of $\\frac{5}{200} = \\frac{1}{40}$ of winning, and a chance of $1 - \\frac{1}{40} = \\frac{39}{40}$ of not winning.",
        tags: ["money"],
        image: {
          src: raffleTicketChanceImage,
          caption: "5 tickets out of 200: a 1 in 40 chance of winning the draw.",
          alt: "A grid of 200 small raffle tickets in grey with 5 of them in gold, beside the line 5 / 200 = 1 / 40.",
        },
      },
    ],
  };
});
