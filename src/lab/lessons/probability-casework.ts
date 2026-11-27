// Casework. Split the outcomes of an event into cases that do not overlap,
// count or weigh each case, and add. On the grid of two dice: the first die
// beating the second, by the first die's value; a prime sum, by the sum; an
// even product, by whether the first die is even. Cases that overlap are
// counted twice. And when the cases have different probabilities, each adds
// its own probability times the chance of the event within it.

import { C, tint, type Draw } from "../draw.ts";
import { type Vec } from "../geo.ts";
import { diceGrid, texFracReduced, type DiceGrid } from "../kit/probability.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import bestOfThreeCasesImage from "../../images/best-of-three-cases.svg";
import testPositiveCasesImage from "../../images/test-positive-cases.svg";

const CASE_COLORS = [C.cyan, C.pink, C.violet, C.green, C.orange];
const GOLD = C.gold;
const OVERLAP = C.red;

const GRID: DiceGrid = { origin: { x: -7.2, y: -2.6 }, cell: 0.85 };

interface Case {
  name: string;
  holds: (a: number, b: number) => boolean;
}

interface Event {
  name: string;
  cases: Case[];
}

const EVENTS: Record<string, Event> = {
  "first beats second": {
    name: "first > second",
    cases: [2, 3, 4, 5, 6].map((k) => ({ name: `first is ${k}`, holds: (a: number, b: number) => a === k && b < k })),
  },
  "prime sum": {
    name: "sum is prime",
    cases: [2, 3, 5, 7, 11].map((p) => ({ name: `sum is ${p}`, holds: (a: number, b: number) => a + b === p })),
  },
  "even product": {
    name: "product is even",
    cases: [
      { name: "first even", holds: (a: number) => a % 2 === 0 },
      { name: "first odd, second even", holds: (a: number, b: number) => a % 2 === 1 && b % 2 === 0 },
    ],
  },
};

const countOf = (c: Case): number => {
  let n = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (c.holds(a, b)) n++;
  return n;
};

export default lesson((s) => {
  const which = s.choice("Event", Object.keys(EVENTS) as (keyof typeof EVENTS)[], "first beats second");

  const note = (g: Draw, row: number, text: string, color: string, alpha = 1): void => {
    g.label({ x: -1.0, y: 3.4 - row * 0.72 }, text, { color, size: 16, bold: true, align: "left", alpha });
  };

  return {
    steps: [
      {
        title: "Split into cases",
        text: "To count the outcomes in an event, split them into cases that do not overlap and between them cover the event. For the first die beating the second, split by what the first die shows: if it is $k$, the second must be one of $1, \\ldots, k - 1$, which is $k - 1$ outcomes. Pick another event to see its cases.",
      },
      {
        title: "Add the cases",
        text: "Because no outcome is in two cases, the counts add: $1 + 2 + 3 + 4 + 5 = 15$, so $P(\\text{first} > \\text{second}) = \\frac{15}{36} = \\frac{5}{12}$. A prime sum splits by the sum: $1 + 2 + 4 + 6 + 2 = 15$ outcomes, also $\\frac{5}{12}$.",
      },
      {
        title: "Cases must not overlap",
        text: "For an even product, the cases first die even (18 outcomes) and second die even (18) overlap: the 9 outcomes with both even are in each. Adding gives 36, as if every product were even. Split instead into first even (18) and first odd, second even (9): $\\frac{27}{36} = \\frac{3}{4}$.",
      },
      {
        title: "Cases with different weights",
        text: "A bag holds a fair coin and a coin with two heads. Pick one at random and flip it. The cases are which coin: each has probability $\\frac{1}{2}$, and heads then has probability $\\frac{1}{2}$ or 1. Weigh each case by its probability and add: $P(\\text{heads}) = \\frac{1}{2} \\cdot \\frac{1}{2} + \\frac{1}{2} \\cdot 1 = \\frac{3}{4}$.",
      },
    ],

    draw(g, f) {
      if (f.step === 3) {
        // The unit square, split by which coin was picked.
        const O: Vec = { x: -7.2, y: -2.6 };
        const S = 5.6;
        const at = (u: number, v: number): Vec => ({ x: O.x + u * S, y: O.y + v * S });
        box(g, at(0, 0), at(0.5, 0.5), { color: GOLD, fill: tint(GOLD, 0.45), width: 2 });
        box(g, at(0, 0.5), at(0.5, 1), { color: C.dim, fill: tint(C.cyan, 0.15), width: 2 });
        box(g, at(0.5, 0), at(1, 1), { color: GOLD, fill: tint(GOLD, 0.45), width: 2 });
        g.label(at(0.25, 0.25), "heads", { color: C.ink, size: 14, bold: true });
        g.label(at(0.25, 0.75), "tails", { color: C.ink, size: 14, bold: true });
        g.label(at(0.75, 0.5), "heads", { color: C.ink, size: 14, bold: true });
        g.label(at(0.25, 1), "fair coin, 1/2", { color: C.ink, size: 13, bold: true, dy: 12 });
        g.label(at(0.75, 1), "two heads, 1/2", { color: C.ink, size: 13, bold: true, dy: 12 });
        note(g, 0, "fair: 1/2 × 1/2 = 1/4", C.ink, f.at(3));
        note(g, 1, "two heads: 1/2 × 1 = 1/2", C.ink, f.at(3));
        note(g, 2, "heads: 1/4 + 1/2 = 3/4", GOLD, f.at(3));
        return;
      }

      if (f.step === 2) {
        const firstEven = (a: number): boolean => a % 2 === 0;
        const secondEven = (b: number): boolean => b % 2 === 0;
        diceGrid(g, GRID, (a, b) => (firstEven(a) && secondEven(b) ? OVERLAP : firstEven(a) ? CASE_COLORS[0] : secondEven(b) ? CASE_COLORS[1] : null), {
          text: (a, b) => String(a * b),
        });
        note(g, 0, "first even: 18", CASE_COLORS[0]);
        note(g, 1, "second even: 18", CASE_COLORS[1]);
        note(g, 2, "both even: 9, in each case", OVERLAP, f.at(2));
        note(g, 3, "18 + 18 − 9 = 27 = 18 + 9", GOLD, f.at(2));
        note(g, 4, "P(even product) = 27/36 = 3/4", GOLD, f.at(2));
        return;
      }

      const ev = EVENTS[which.value];
      diceGrid(
        g,
        GRID,
        (a, b) => {
          const i = ev.cases.findIndex((c) => c.holds(a, b));
          return i < 0 ? null : CASE_COLORS[i % CASE_COLORS.length];
        },
        { text: (a, b) => (which.value === "even product" ? String(a * b) : which.value === "prime sum" ? String(a + b) : "") },
      );
      g.label({ x: -1.0, y: 4.2 }, ev.name, { color: C.ink, size: 17, bold: true, align: "left" });
      const counts = ev.cases.map(countOf);
      ev.cases.forEach((c, i) => {
        note(g, i, `${c.name}: ${counts[i]}`, CASE_COLORS[i % CASE_COLORS.length], f.step === 0 ? Math.min(1, f.at(0) * ev.cases.length - i + 1) : 1);
      });
      if (f.step === 1) {
        const total = counts.reduce((a, b) => a + b, 0);
        note(g, ev.cases.length, `${counts.join(" + ")} = ${total} of 36`, GOLD, f.at(1));
      }
    },

    readout(f) {
      const rows: Readout[] = [];
      if (f.step <= 1) {
        const ev = EVENTS[which.value];
        const counts = ev.cases.map(countOf);
        const total = counts.reduce((a, b) => a + b, 0);
        rows.push({ label: "Cases", tex: `${counts.join(" + ")} = ${total}` });
        rows.push({ label: "Probability", tex: `P = ${texFracReduced(total, 36)}`, tone: f.step === 1 ? "good" : "plain" });
      } else if (f.step === 2) {
        rows.push({ label: "Overlapping", tex: "18 + 18 = 36", tone: "warn" });
        rows.push({ label: "Disjoint", tex: "18 + 9 = 27,\\ \\frac{27}{36} = \\frac{3}{4}", tone: "good" });
      } else {
        rows.push({ label: "Weighted cases", tex: "\\frac{1}{2} \\cdot \\frac{1}{2} + \\frac{1}{2} \\cdot 1 = \\frac{3}{4}", tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Sorting laundry",
        text: "Sort a basket into whites, colours and darks, with every item in exactly one pile, and the item count is the sum of the piles. Put a striped shirt in two piles and the total comes out one too many.",
      },
      {
        title: "Which bus you catch",
        text: "If you catch the early bus 3 days in 4 and it is late 1 time in 10, while the later bus is late 1 time in 5, your chance of being late mixes the two: $\\frac{3}{4} \\cdot \\frac{1}{10} + \\frac{1}{4} \\cdot \\frac{1}{5} = \\frac{1}{8}$.",
      },
    ],

    uses: [
      {
        title: "How often a test says yes",
        text: "A disease affects 1% of people. A test finds it 90% of the time in someone who has it, and wrongly says yes 5% of the time in someone who does not. Split by whether the person has the disease: $0.01 \\times 0.9 + 0.99 \\times 0.05 = 0.009 + 0.0495 = 0.0585$. Only 0.009 of that comes from people who are ill, so most positive results are false alarms.",
        tags: ["health"],
        image: {
          src: testPositiveCasesImage,
          caption: "Positive results: 0.01 × 0.9 = 0.009 from people with the disease plus 0.99 × 0.05 = 0.0495 from people without, 0.0585 in all.",
          alt: "A tree splitting into has the disease 0.01 and does not 0.99, then each into test positive and negative, with the two positive branches 0.009 and 0.0495 adding to a gold 0.0585.",
        },
      },
      {
        title: "Winning a best of three",
        text: "A player who wins each game with probability 0.6, independently, wins a best-of-three match in three cases: win, win; win, lose, win; or lose, win, win. They add to $0.36 + 0.144 + 0.144 = 0.648$, so the stronger player's edge grows over a match.",
        tags: ["sport"],
        image: {
          src: bestOfThreeCasesImage,
          caption: "Winning a best of three at 0.6 a game: WW 0.36, WLW 0.144 and LWW 0.144, 0.648 in all.",
          alt: "Three rows of game results, W W, W L W and L W W, with their probabilities 0.36, 0.144 and 0.144, and a gold total of 0.648.",
        },
      },
    ],
  };
});
