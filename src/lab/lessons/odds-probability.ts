// Odds against probability. A bag holds a favourable marbles and b others.
// The probability of drawing a favourable one compares part to whole,
// a/(a + b); the odds compare part to part, a : b in favour and b : a
// against. Each converts to the other, and a bet paid at the odds against is
// a fair one: it wins as much in the long run as it loses.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { gcd } from "../kit/integers.ts";
import { texFrac } from "../kit/probability.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import cardHeartOddsImage from "../../images/card-heart-odds.svg";
import oddsAgainstImpliedImage from "../../images/odds-against-implied.svg";

const FOR = C.gold;
const AGAINST = C.cyan;

/** a : b in lowest terms. */
const ratio = (a: number, b: number): string => {
  const d = gcd(a, b) || 1;
  return `${a / d} : ${b / d}`;
};

export default lesson((s) => {
  const fav = s.slider({ label: "gold =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 12, value: 1, step: 1 });
  const other = s.slider({ label: "blue =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 12, value: 3, step: 1 });

  return {
    steps: [
      {
        title: "Part over whole",
        text: "A bag holds $a$ gold marbles and $b$ blue ones, and you draw one at random. Each marble is equally likely, so $P(\\text{gold}) = \\frac{a}{a + b}$: the gold part over the whole bag. With 1 gold and 3 blue it is $\\frac{1}{4}$.",
      },
      {
        title: "Part to part",
        text: "The odds compare the two parts instead. The odds in favour of gold are $a : b$, favourable to unfavourable, and the odds against are $b : a$. With 1 gold and 3 blue the odds are $1 : 3$ in favour, or $3 : 1$ against; a probability of $\\frac{1}{4}$ is not odds of $1 : 4$.",
      },
      {
        title: "Converting",
        text: "Odds of $a : b$ in favour mean $a$ favourable outcomes for every $b$ unfavourable ones, so $P = \\frac{a}{a + b}$. The other way, a probability $p$ gives odds of $p : (1 - p)$, so $P = \\frac{2}{5}$ is odds of $2 : 3$. Even odds, $1 : 1$, are a probability of $\\frac{1}{2}$.",
      },
      {
        title: "A bet at fair odds",
        text: "A bet paid at odds of $b : a$ against wins $b$ for every $a$ staked. At $3 : 1$ against, stake 1 and win 3 if gold comes up. Over 4 draws expect 1 win, $+3$, and 3 losses, $-3$: no gain either way, so the bet is fair. Paying less than the odds against favours whoever takes the bet.",
      },
    ],

    draw(g, f) {
      const [a, b] = [fav.value, other.value];
      const n = a + b;
      // The bag, gold first.
      const perRow = 12;
      const r = 0.26;
      for (let i = 0; i < n; i++) {
        const [col, row] = [i % perRow, Math.floor(i / perRow)];
        const color = i < a ? FOR : AGAINST;
        g.circle({ x: -6.6 + col * 0.66, y: 3.9 - row * 0.66 }, r, { color, fill: tint(color, 0.6), width: 2 });
      }

      // A bar of the whole bag, split part to part.
      const [x0, x1, y0, h] = [-6.9, 6.9, 0.8, 0.8];
      const xa = x0 + (x1 - x0) * (a / n);
      box(g, { x: x0, y: y0 }, { x: xa, y: y0 + h }, { color: FOR, fill: tint(FOR, 0.45), width: 2 });
      box(g, { x: xa, y: y0 }, { x: x1, y: y0 + h }, { color: AGAINST, fill: tint(AGAINST, 0.35), width: 2 });
      if (a > 0) g.label({ x: (x0 + xa) / 2, y: y0 + h / 2 }, String(a), { color: C.ink, size: 15, bold: true });
      g.label({ x: (xa + x1) / 2, y: y0 + h / 2 }, String(b), { color: C.ink, size: 15, bold: true });

      if (f.step === 0) {
        g.arrow({ x: 0, y: y0 - 0.45 }, { x: x0, y: y0 - 0.45 }, { color: C.ink, width: 2, alpha: f.at(0) });
        g.arrow({ x: 0, y: y0 - 0.45 }, { x: x1, y: y0 - 0.45 }, { color: C.ink, width: 2, alpha: f.at(0) });
        g.label({ x: 0, y: y0 - 0.45 }, `whole: ${n}`, { color: C.ink, size: 14, bold: true, dy: -16, alpha: f.at(0) });
        g.label({ x: 0, y: -1.4 }, `P(gold) = ${a} / ${n} = ${fmt(a / n, 3)}`, { color: FOR, size: 20, bold: true, alpha: f.at(0) });
        return;
      }

      if (f.step === 1) {
        g.label({ x: 0, y: -0.4 }, `odds in favour  ${a} : ${b}`, { color: FOR, size: 20, bold: true, alpha: f.at(1) });
        g.label({ x: 0, y: -1.3 }, `odds against  ${b} : ${a}`, { color: AGAINST, size: 20, bold: true, alpha: f.at(1) });
        g.label({ x: 0, y: -2.2 }, `probability  ${a} / ${n}`, { color: C.dim, size: 16, bold: true, alpha: f.at(1) });
        return;
      }

      if (f.step === 2) {
        // A probability line with some common odds marked.
        const [l0, l1, y] = [-6.9, 6.9, -1.4];
        const xp = (p: number): number => l0 + (l1 - l0) * p;
        g.segment({ x: l0, y }, { x: l1, y }, { color: C.dim, width: 2 });
        for (const [p, name] of [[0, "0"], [1 / 4, "1 : 3"], [1 / 2, "1 : 1"], [3 / 4, "3 : 1"], [1, "1"]] as const) {
          g.segment({ x: xp(p), y: y - 0.15 }, { x: xp(p), y: y + 0.15 }, { color: C.dim, width: 1.5 });
          g.label({ x: xp(p), y }, name, { color: C.dim, size: 12, bold: true, dy: -18 });
        }
        g.segment({ x: xa, y: y0 }, { x: xp(a / n), y }, { color: FOR, width: 1.5, dash: [4, 4], alpha: f.at(2) });
        g.point({ x: xp(a / n), y }, { color: FOR, r: 7, alpha: f.at(2) });
        g.label({ x: xp(a / n), y }, `${ratio(a, b)} → ${fmt(a / n, 3)}`, { color: FOR, size: 14, bold: true, dy: 16, alpha: f.at(2) });
        return;
      }

      // The fair bet over a + b draws.
      g.label({ x: 0, y: -0.3 }, `stake ${a}, win ${b} at ${b} : ${a} against`, { color: C.ink, size: 17, bold: true });
      g.label({ x: 0, y: -1.1 }, `over ${n} draws: ${a} wins × ${b} = +${a * b}`, { color: FOR, size: 17, bold: true, alpha: f.at(3) });
      g.label({ x: 0, y: -1.9 }, `${b} losses × ${a} = −${a * b}`, { color: AGAINST, size: 17, bold: true, alpha: f.at(3) });
      g.label({ x: 0, y: -2.6 }, "net 0: a fair bet", { color: C.dim, size: 15, bold: true, alpha: f.at(3) });
    },

    readout(f) {
      const [a, b] = [fav.value, other.value];
      const n = a + b;
      const rows: Readout[] = [{ label: "Probability", tex: `P = \\frac{${a}}{${a} + ${b}} = ${texFrac(a, n)}`, tone: f.step === 0 ? "good" : "plain" }];
      if (f.step >= 1) rows.push({ label: "Odds", tex: `${a} : ${b} \\text{ in favour},\\ ${b} : ${a} \\text{ against}`, tone: f.step === 1 ? "good" : "plain" });
      if (f.step === 2) rows.push({ label: "Back again", tex: `P : (1 - P) = ${texFrac(a, n)} : ${texFrac(b, n)} = ${ratio(a, b)}` });
      if (f.step === 3) {
        rows.push({ label: "Each bet", tex: `${texFrac(a, n)} \\cdot ${b} - ${texFrac(b, n)} \\cdot ${a} = 0`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "A team's record",
        text: "A team that has won 3 games and lost 1 has a win-to-loss ratio of $3 : 1$, but it has won $\\frac{3}{4}$ of its games, not $\\frac{3}{1}$. Odds are like the record, part to part; probability is like the share won, part to whole.",
      },
      {
        title: "Mixing paint",
        text: "Paint mixed 1 part red to 3 parts white is a quarter red. The recipe $1 : 3$ is a ratio of parts, like odds; the fraction of the can that is red, $\\frac{1}{4}$, is like a probability.",
      },
    ],

    uses: [
      {
        title: "Odds at the racetrack",
        text: "Racing odds are quoted against: a horse at $4 : 1$ pays 4 for each 1 staked. Read as a probability, $4 : 1$ against means $\\frac{1}{1 + 4} = \\frac{1}{5}$, a 20% chance. The probabilities read from all the horses in a race add to more than 1, and that excess is the bookmaker's margin.",
        tags: ["sport", "money"],
        image: {
          src: oddsAgainstImpliedImage,
          caption: "Odds of 4 : 1 against: 1 chance to win for every 4 to lose, a probability of 1/5 = 20%.",
          alt: "A row of five boxes, one gold labelled win and four grey labelled lose, under the heading 4 : 1 against, with the line 1 / (1 + 4) = 20%.",
        },
      },
      {
        title: "Drawing a heart",
        text: "A shuffled pack of 52 cards has 13 hearts and 39 other cards. The probability of drawing a heart is $\\frac{13}{52} = \\frac{1}{4}$, and the odds are $13 : 39 = 1 : 3$ in favour, or $3 : 1$ against.",
        tags: ["game-design"],
        image: {
          src: cardHeartOddsImage,
          caption: "13 hearts and 39 other cards: probability 13/52 = 1/4, odds 13 : 39 = 1 : 3 in favour.",
          alt: "Four rows of 13 small cards, one row of hearts in gold and three rows in grey, with the lines P = 13/52 = 1/4 and odds 13 : 39 = 1 : 3.",
        },
      },
    ],
  };
});
