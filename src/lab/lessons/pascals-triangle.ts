// Pascal's triangle and the binomial theorem. Entry k of row n counts the
// paths down to it, n moves of which k go right, so it is n choose k. Each
// entry is the sum of the two above it, the coefficients of (x + y)^n are
// row n, and a row adds up to 2^n, the number of subsets of n things.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { choose, subsets } from "../kit/counting.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import galtonBoardRowImage from "../../images/galton-board-row.svg";
import interestBinomialImage from "../../images/interest-binomial.svg";

const ROWS = 8;
const GOLD = C.gold;
const PATH = C.cyan;
const PARENT = C.pink;

/** Where entry k of row n sits. */
const spot = (n: number, k: number): Vec => ({ x: (k - n / 2) * 1.05, y: 3.9 - n * 0.8 });

/** The term C x^a y^b of (x + y)^n, as TeX. */
function texTerm(coefficient: number, a: number, b: number): string {
  const power = (v: string, e: number): string => (e === 0 ? "" : e === 1 ? v : `${v}^{${e}}`);
  const body = power("x", a) + power("y", b);
  if (body === "") return String(coefficient);
  return coefficient === 1 ? body : `${coefficient}${body}`;
}

export default lesson((s) => {
  const n = s.slider({ label: "row n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: ROWS, value: 4, step: 1 });
  const k = s.slider({ label: "entry k =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: ROWS, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "Paths down the triangle",
        text: "Start with 1 at the top and write each number as the sum of the two above it. Entry $k$ of row $n$, counting both from 0, is the number of paths down to it, each move going down to the left or to the right. Of the $n$ moves, choose which $k$ go right: so the entries are $\\binom{n}{k}$, and row 4 is 1, 4, 6, 4, 1.",
      },
      {
        title: "Why each is a sum",
        text: "Choose $k$ of $n$ people, and look at the last of them. Either they are chosen, and the other $k - 1$ come from the remaining $n - 1$, or they are not, and all $k$ do. So $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$, Pascal's rule: $\\binom{4}{2} = 3 + 3 = 6$.",
      },
      {
        title: "The binomial theorem",
        text: "Multiplying out $(x + y)^n$ means choosing $x$ or $y$ from each of the $n$ brackets. The products with $y$ chosen $k$ times are $x^{n-k}y^k$, and there are $\\binom{n}{k}$ of them. So $(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k$, with row $n$ as the coefficients: $(x + y)^4 = x^4 + 4x^3y + 6x^2y^2 + 4xy^3 + y^4$.",
      },
      {
        title: "Row sums",
        text: "Put $x = y = 1$ and the entries of row $n$ add up to $(1 + 1)^n = 2^n$. Both sides count the subsets of $n$ things, one by their size and the other by saying yes or no to each thing in turn: 5 things have $1 + 5 + 10 + 10 + 5 + 1 = 32$ subsets.",
      },
    ],

    draw(g, f) {
      const N = n.value;
      const K = Math.min(k.value, N);
      const tick = Math.floor(f.time / 1.2);

      // A path to the chosen entry: the moves that go right, cycling through all of them.
      if (f.step === 0 && N > 0) {
        const rights = subsets(
          Array.from({ length: N }, (_, i) => i),
          K,
        );
        const pick = rights[tick % rights.length];
        const pts: Vec[] = [spot(0, 0)];
        let col = 0;
        for (let m = 0; m < N; m++) {
          if (pick.includes(m)) col++;
          pts.push(spot(m + 1, col));
        }
        g.path(pts, { color: PATH, width: 4, alpha: f.at(0) });
      }

      if (f.step === 1 && N > 0) {
        for (const j of [K - 1, K]) {
          if (j < 0 || j > N - 1) continue;
          g.arrow(spot(N - 1, j), spot(N, K), { color: PARENT, width: 2.5, alpha: f.at(1) });
        }
      }

      for (let row = 0; row <= ROWS; row++) {
        const onRow = (f.step === 2 || f.step === 3) && row === N;
        for (let j = 0; j <= row; j++) {
          const p = spot(row, j);
          const target = row === N && j === K && f.step <= 1;
          const parent = f.step === 1 && row === N - 1 && (j === K - 1 || j === K);
          const color = target || onRow ? GOLD : parent ? PARENT : C.ink;
          if (target || onRow) g.circle(p, 0.36, { color: GOLD, fill: tint(GOLD, 0.18), width: 2 });
          g.label(p, String(choose(row, j)), { color, size: 15, bold: true, alpha: row > N && f.step !== 0 ? 0.35 : 1 });
        }
      }

      const side = { x: 5.9, y: 3.4 };
      if (f.step === 0) {
        g.label(side, `C(${N}, ${K}) = ${choose(N, K)}`, { color: GOLD, size: 18, bold: true });
        g.label({ x: side.x, y: side.y - 0.8 }, `${N} moves, ${K} right`, { color: PATH, size: 14, bold: true });
      } else if (f.step === 1) {
        g.label(side, `${choose(N - 1, K - 1)} + ${choose(N - 1, K)} = ${choose(N, K)}`, { color: GOLD, size: 18, bold: true });
        g.label({ x: side.x, y: side.y - 0.8 }, "the two above", { color: PARENT, size: 14, bold: true });
      } else if (f.step === 2) {
        g.label(side, `(x + y)${sup(N)}`, { color: GOLD, size: 18, bold: true });
        g.label({ x: side.x, y: side.y - 0.8 }, "coefficients: row " + N, { color: C.dim, size: 14, bold: true });
      } else {
        g.label(side, `sum = 2${sup(N)} = ${2 ** N}`, { color: GOLD, size: 18, bold: true });
        g.label({ x: side.x, y: side.y - 0.8 }, `subsets of ${N} things`, { color: C.dim, size: 14, bold: true });
      }
    },

    readout(f) {
      const N = n.value;
      const K = Math.min(k.value, N);
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Paths", tex: `\\binom{${N}}{${K}} = ${choose(N, K)}`, tone: "good" });
      else if (f.step === 1) {
        rows.push(
          N === 0
            ? { label: "Top", tex: "\\binom{0}{0} = 1", tone: "dim" }
            : { label: "Pascal's rule", tex: `\\binom{${N - 1}}{${K - 1}} + \\binom{${N - 1}}{${K}} = ${choose(N - 1, K - 1)} + ${choose(N - 1, K)} = ${choose(N, K)}`, tone: "good" },
        );
      } else if (f.step === 2) {
        const terms = Array.from({ length: N + 1 }, (_, j) => texTerm(choose(N, j), N - j, j));
        rows.push({ label: "Expansion", tex: `(x + y)^{${N}} = ${terms.join(" + ")}`, tone: "good" });
      } else {
        const terms = Array.from({ length: N + 1 }, (_, j) => choose(N, j));
        rows.push({ label: "Row sum", tex: `${terms.join(" + ")} = 2^{${N}} = ${2 ** N}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Walking a city grid",
        text: "Walking from one corner of a grid of streets to the opposite one, always heading east or south, every route is a choice of which blocks go east. The number of routes to each corner is the sum of the routes to the two corners just before it, the way Pascal's triangle grows.",
      },
      {
        title: "Tossing coins",
        text: "Toss four coins and the 16 ways they can land split by the number of heads as 1, 4, 6, 4, 1. Two heads is the most common result because there are 6 ways to choose which two coins show them.",
      },
    ],

    uses: [
      {
        title: "Balls through a peg board",
        text: "A ball dropped through 8 rows of pegs goes left or right at each, so it reaches the bin $k$ places from the left by $\\binom{8}{k}$ of the $2^8 = 256$ paths. Drop many balls and the bins fill in the proportions 1, 8, 28, 56, 70, 56, 28, 8, 1: a heap highest in the middle, the shape of so many measurements in nature.",
        tags: ["nature", "game-design"],
        image: {
          src: galtonBoardRowImage,
          caption: "After 8 rows of pegs, the 256 paths reach the bins 1, 8, 28, 56, 70, 56, 28, 8, 1 ways: row 8 of Pascal's triangle.",
          alt: "A triangle of pegs above nine bins whose stacks of balls rise to a gold middle bin, labelled 1, 8, 28, 56, 70, 56, 28, 8, 1.",
        },
      },
      {
        title: "Estimating compound interest",
        text: "Money growing 5% a year for 10 years is multiplied by $(1 + 0.05)^{10}$. The binomial theorem gives $1 + 10(0.05) + 45(0.05)^2 + 120(0.05)^3 + \\cdots \\approx 1 + 0.5 + 0.1125 + 0.015 = 1.6275$, close to the true 1.6289, and the first two terms alone are simple interest.",
        tags: ["money"],
        image: {
          src: interestBinomialImage,
          caption: "(1 + 0.05)¹⁰ ≈ 1 + 0.5 + 0.1125 + 0.015 = 1.6275 from the first four terms; the true value is 1.6289.",
          alt: "A bar of 1 plus three gold pieces 0.5, 0.1125 and 0.015 adding to 1.6275, beside the coefficients 1, 10, 45, 120 from row 10 of Pascal's triangle.",
        },
      },
    ],
  };
});
