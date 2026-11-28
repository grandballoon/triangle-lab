// Mathematical induction. A row of dominoes all falls when the first one
// falls and each one knocks over the next. A statement about every whole
// number n is proved the same way: check it for n = 1, the base case, and
// show that its truth for k forces its truth for k + 1, the inductive step.
// Here that proves 1 + 2 + … + n = n(n + 1)/2, as a staircase growing by a
// column; and n² + n + 41 shows what goes wrong with no inductive step.

import { C, tint } from "../draw.ts";
import { clamp, type Vec } from "../geo.ts";
import { isPrime } from "../kit/integers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import hanoiTowerMovesImage from "../../images/hanoi-tower-moves.svg";
import loopInvariantSumImage from "../../images/loop-invariant-sum.svg";

const DOMINO = C.blue;
const OLD = C.cyan;
const NEW = C.gold;
const BAD = C.red;

const triangular = (n: number): number => (n * (n + 1)) / 2;

export default lesson((s) => {
  const n = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 10, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "Falling dominoes",
        text: "Two facts make a whole row of dominoes fall: the first one falls, and every domino that falls knocks over the next. Neither is enough alone. Induction proves a statement about every whole number $n$ the same way: show it holds for $n = 1$, and show that whenever it holds for some $k$, it holds for $k + 1$.",
      },
      {
        title: "The base case",
        text: "Claim: $1 + 2 + \\cdots + n = \\frac{n(n + 1)}{2}$ for every whole number $n \\ge 1$. The base case is $n = 1$: the left side is $1$ and the right side is $\\frac{1 \\cdot 2}{2} = 1$. The first domino falls.",
      },
      {
        title: "The inductive step",
        text: "Suppose the claim holds for some $k$: $1 + \\cdots + k = \\frac{k(k + 1)}{2}$. Adding the next column, of height $k + 1$, gives $\\frac{k(k + 1)}{2} + (k + 1) = \\frac{(k + 1)(k + 2)}{2}$, which is the claim for $k + 1$. So each domino knocks over the next, and with the base case, the claim holds for every $n$.",
      },
      {
        title: "Both parts are needed",
        text: "The number $n^2 + n + 41$ is prime for $n = 0, 1, \\ldots, 39$: forty cases, and no inductive step. At $n = 40$ it is $1681 = 41^2$. Checking many cases is not induction. Nor is a step without a base: if $k = k + 1$ then $k + 1 = k + 2$, yet $1 \\ne 2$.",
      },
    ],

    draw(g, f) {
      const N = n.value;

      // A row of N dominoes, each pivoting on its bottom right corner.
      const gap = Math.min(1.4, 14 / Math.max(N, 1));
      const [w, h] = [0.28, Math.min(1.3, gap * 0.95)];
      const rest = Math.asin(clamp((gap - w) / h, 0, 1));
      const x0 = -7 + (14 - gap * (N - 1)) / 2 - w;
      const progress = f.step === 0 ? f.at(0) : f.step === 1 ? f.at(1) / N : f.step === 2 ? f.at(2) : 0;
      const base = 2.1;
      for (let i = 0; i < N; i++) {
        const t = clamp(progress * N - i, 0, 1);
        const lean = (i === N - 1 ? Math.PI / 2 - 0.25 : rest) * t;
        const pivot: Vec = { x: x0 + i * gap + w, y: base };
        const turn = (p: Vec): Vec => {
          const [dx, dy] = [p.x - pivot.x, p.y - pivot.y];
          return { x: pivot.x + dx * Math.cos(lean) + dy * Math.sin(lean), y: pivot.y - dx * Math.sin(lean) + dy * Math.cos(lean) };
        };
        const corners = [
          { x: pivot.x - w, y: base },
          { x: pivot.x, y: base },
          { x: pivot.x, y: base + h },
          { x: pivot.x - w, y: base + h },
        ].map(turn);
        const color = f.step === 3 ? C.dim : t > 0 ? NEW : DOMINO;
        g.polygon(corners, { color, fill: tint(color, 0.35), width: 2 });
        g.label({ x: pivot.x - w / 2, y: base - 0.35 }, String(i + 1), { color: C.dim, size: 12, bold: true });
      }
      g.segment({ x: -7.6, y: base }, { x: 7.6, y: base }, { color: C.faint, width: 1.5 });
      if (f.step === 0) {
        g.label({ x: x0, y: base + 1.9 }, "the first falls", { color: NEW, size: 14, bold: true, align: "left" });
        g.label({ x: 7.4, y: base + 1.9 }, "each knocks over the next", { color: NEW, size: 14, bold: true, align: "right" });
        return;
      }

      if (f.step === 3) {
        g.label({ x: 0, y: 4.0 }, "forty that fall are not a proof", { color: C.dim, size: 14, bold: true });
        const rows = [37, 38, 39, 40, 41];
        rows.forEach((m, i) => {
          const v = m * m + m + 41;
          const prime = isPrime(v);
          const y = 0.9 - i * 0.72;
          const text = prime ? `n = ${m}:  ${m}² + ${m} + 41 = ${v}, prime` : `n = ${m}:  ${m}² + ${m} + 41 = ${v} = ${m === 40 ? "41 × 41" : "41 × 43"}`;
          g.label({ x: -6.8, y }, text, { color: prime ? C.green : BAD, size: 16, bold: true, align: "left", alpha: Math.min(1, f.at(3) * 5 - i + 1) });
        });
        return;
      }

      // The staircase 1 + 2 + … + n, the newest column in gold.
      const u = 0.33;
      const sx = -7;
      const sy = -2.8;
      const top = f.step === 1 ? 1 : N;
      for (let c = 1; c <= top; c++) {
        const isNew = f.step === 2 && c === top;
        const alpha = isNew ? f.at(2) : 1;
        for (let r = 0; r < c; r++) {
          const a = { x: sx + (c - 1) * u, y: sy + r * u };
          box(g, a, { x: a.x + u, y: a.y + u }, { color: isNew ? NEW : OLD, fill: tint(isNew ? NEW : OLD, 0.3), width: 1.5, alpha });
        }
      }
      if (f.step === 2 && top > 1) {
        g.label({ x: sx + top * u + 0.2, y: sy + (top * u) / 2 }, `+ ${top}`, { color: NEW, size: 15, bold: true, align: "left", alpha: f.at(2) });
      }

      const lines: [string, string][] =
        f.step === 1
          ? [
              ["n = 1:", C.ink],
              ["left side  1", OLD],
              ["right side  1 · 2 ÷ 2 = 1", OLD],
              ["equal: the first domino falls", NEW],
            ]
          : [
              [`suppose true for k = ${N - 1}:`, C.ink],
              [`1 + … + ${N - 1} = ${N - 1}·${N} ÷ 2 = ${triangular(N - 1)}`, OLD],
              [`add ${N}:  ${triangular(N - 1)} + ${N} = ${triangular(N)}`, NEW],
              [`= ${N}·${N + 1} ÷ 2, true for k + 1 = ${N}`, NEW],
            ];
      lines.forEach(([text, color], i) => {
        g.label({ x: 0.2, y: 0.9 - i * 0.8 }, text, { color, size: 16, bold: true, align: "left" });
      });
    },

    readout(f) {
      const N = n.value;
      const rows: Readout[] = [];
      if (f.step <= 1) {
        rows.push({ label: "Base case", tex: "1 = \\frac{1 \\cdot 2}{2}", tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Inductive step", tex: "\\frac{k(k + 1)}{2} + (k + 1) = \\frac{(k + 1)(k + 2)}{2}", tone: "good" });
        rows.push({ label: `n = ${N}`, tex: `1 + \\cdots + ${N} = \\frac{${N} \\cdot ${N + 1}}{2} = ${triangular(N)}` });
      } else {
        rows.push({ label: "No step", tex: "40^2 + 40 + 41 = 1681 = 41^2", tone: "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "Climbing a ladder",
        text: "You can climb any height on a ladder if you can get onto the bottom rung and can always get from one rung to the next. Neither skill alone gets you up.",
      },
      {
        title: "Passing on a message",
        text: "If the first person in a line hears the news, and everyone who hears it tells the next person, then everyone in the line hears it, however long the line.",
      },
    ],

    uses: [
      {
        title: "Proving a loop correct",
        text: "A program that adds up a list keeps a running total. Programmers prove it right by induction: the total is correct before the loop starts, and if it is correct after $k$ items it is correct after $k + 1$. So it is correct when the loop ends, for a list of any length, without testing every length.",
        tags: ["computing"],
        image: {
          src: loopInvariantSumImage,
          caption: "The running total is right before the loop, and each pass keeps it right, so it is right at the end.",
          alt: "A list of numbers 4, 7, 2, 9 with a running total under each: 0, 4, 11, 13, 22, the last one in gold, and arrows from each total to the next.",
        },
      },
      {
        title: "The Tower of Hanoi",
        text: "Moving a tower of $n$ discs to another peg, one disc at a time and never a larger disc on a smaller one, takes $2^n - 1$ moves. Induction proves it: one disc takes 1 move, and $n + 1$ discs take the $n$-disc moves twice plus one move of the big disc, $2(2^n - 1) + 1 = 2^{n + 1} - 1$.",
        tags: ["game-design"],
        image: {
          src: hanoiTowerMovesImage,
          caption: "A tower of n discs takes 2ⁿ − 1 moves: 1, 3, 7, 15, each twice the last plus one.",
          alt: "Three pegs with a tower of four discs on the left, the largest disc in gold, above the move counts 1, 3, 7, 15 for one to four discs.",
        },
      },
    ],
  };
});
