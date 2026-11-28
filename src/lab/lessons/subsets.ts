// Subsets. A ⊆ S when every element of A is in S. Choosing a subset of an
// n-element set is n yes-or-no choices, one per element, so there are 2ⁿ of
// them: the leaves of a doubling tree, or the n-digit strings of 0s and 1s.
// Sorted by size, they come in the counts 1, n, …, n, 1.

import { C, tint } from "../draw.ts";
import { polar, type Vec } from "../geo.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import pizzaToppingSubsetsImage from "../../images/pizza-topping-subsets.svg";
import lightSwitchSettingsImage from "../../images/light-switch-settings.svg";

const GOLD = C.gold;
const YES = C.green;
const LETTERS = ["a", "b", "c", "d"] as const;

/** Subset number `bits` of the first n letters: bit i set means the i-th letter is in. */
const members = (bits: number, n: number): string[] => LETTERS.slice(0, n).filter((_, i) => (bits >> (n - 1 - i)) & 1);
const braces = (xs: readonly string[]): string => (xs.length ? `{${xs.join(", ")}}` : "∅");
const binary = (bits: number, n: number): string => bits.toString(2).padStart(n, "0");

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

export default lesson((s) => {
  const size = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 4, value: 3, step: 1 });
  const pickK = s.slider({ label: "subsets of size k =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 4, value: 2, step: 1 });
  const nk = (): [number, number] => {
    const n = size.value;
    return [n, Math.min(pickK.value, n)];
  };

  return {
    steps: [
      {
        title: "Subsets",
        text: "$A$ is a subset of $S$, written $A \\subseteq S$, when every element of $A$ is also in $S$: $\\{a, b\\} \\subseteq \\{a, b, c\\}$. The empty set is a subset of every set, since it has no element to fail, and every set is a subset of itself. A proper subset, $A \\subset S$, is a subset other than $S$ itself.",
      },
      {
        title: "A yes or no for each element",
        text: "To choose a subset of $S = \\{a, b, c\\}$, go through the elements and decide for each: in or out? Every decision doubles the number of ways, so the tree ends in $2 \\times 2 \\times 2 = 8$ branches. A set with $n$ elements has $2^n$ subsets, from $\\emptyset$ to $S$ itself.",
      },
      {
        title: "Strings of 0s and 1s",
        text: "Write 1 for in and 0 for out, one digit per element. Then each subset is an $n$-digit string and each string is a subset: with $S = \\{a, b, c\\}$, $101$ is $\\{a, c\\}$, $000$ is $\\emptyset$ and $111$ is $S$. There are $2^n$ such strings, the same count again.",
      },
      {
        title: "Counting by size",
        text: "The subsets of a 3-element set come 1 of size 0, 3 of size 1, 3 of size 2 and 1 of size 3, and $1 + 3 + 3 + 1 = 8 = 2^3$. For 4 elements the counts are $1, 4, 6, 4, 1$, adding to 16. Leaving out $S$ itself, a set with $n$ elements has $2^n - 1$ proper subsets.",
      },
    ],

    draw(g, f) {
      const [n, k] = nk();
      const all = Array.from({ length: 1 << n }, (_, b) => b);
      const sizeOf = (b: number): number => members(b, n).length;
      const S = braces(LETTERS.slice(0, n));

      if (f.step === 0) {
        const centre: Vec = { x: -4.2, y: 0.5 };
        g.circle(centre, 2.9, { color: C.ink, fill: tint(C.ink, 0.04), width: 2 });
        g.label({ x: -6.6, y: 3.3 }, "S", { color: C.ink, size: 20, bold: true });
        const spots = LETTERS.slice(0, n).map((_, i) => (n === 1 ? centre : polar(centre, 1.5, Math.PI / 2 + Math.PI / 4 - (i * 2 * Math.PI) / n)));
        if (k > 0) {
          const inA = spots.slice(0, k);
          const mid = { x: inA.reduce((t, p) => t + p.x, 0) / k, y: inA.reduce((t, p) => t + p.y, 0) / k };
          const r = Math.max(...inA.map((p) => Math.hypot(p.x - mid.x, p.y - mid.y))) + 0.6;
          g.circle(mid, r, { color: GOLD, fill: tint(GOLD, 0.15), width: 2.5, dash: [8, 5], alpha: f.at(0) });
        }
        spots.forEach((p, i) => {
          const lit = i < k;
          g.point(p, { color: lit ? GOLD : C.ink, r: 6 });
          g.label(p, LETTERS[i], { color: lit ? GOLD : C.ink, size: 18, bold: true, dy: 16 });
        });
        const A = braces(LETTERS.slice(0, k));
        const line = (row: number, text: string, color: string, size = 18): void => {
          g.label({ x: 0.6, y: 3.2 - row * 0.95 }, text, { color, size, bold: true, align: "left" });
        };
        line(0, `S = ${S}`, C.ink);
        line(1, `A = ${A} ⊆ S`, GOLD);
        line(2, k < n ? "A ≠ S, so A ⊂ S: proper" : "A = S: not proper", C.dim, 15);
        line(3.2, "∅ ⊆ S and S ⊆ S, always", C.dim, 15);
        return;
      }

      if (f.step === 1) {
        // A tree: level i decides the i-th letter, no to the left, yes to the right.
        const top = 3.7;
        const gap = 5.6 / n;
        const leafX = (j: number): number => -7.2 + ((j + 0.5) * 14.4) / (1 << n);
        const nodeX = (level: number, j: number): number => {
          const span = 1 << (n - level);
          return (leafX(j * span) + leafX(j * span + span - 1)) / 2;
        };
        const reveal = f.at(1);
        for (let level = 0; level < n; level++) {
          const y = top - level * gap;
          const alpha = Math.min(1, Math.max(0, reveal * n - level + 0.3));
          for (let j = 0; j < 1 << level; j++) {
            const from = { x: nodeX(level, j), y };
            const no = { x: nodeX(level + 1, 2 * j), y: y - gap };
            const yes = { x: nodeX(level + 1, 2 * j + 1), y: y - gap };
            g.segment(from, no, { color: C.dim, width: 1.5, dash: [4, 4], alpha });
            g.segment(from, yes, { color: YES, width: 2, alpha });
            g.point(from, { color: C.ink, r: 3.5 });
            if (level < 3 || n < 4) g.label({ x: (from.x + yes.x) / 2, y: y - gap / 2 }, LETTERS[level], { color: YES, size: 13, bold: true, dx: 9, alpha });
          }
        }
        all.forEach((b) => {
          const lit = sizeOf(b) === k;
          const p = { x: leafX(b), y: top - n * gap };
          const name = members(b, n).join("") || "∅";
          g.point(p, { color: lit ? GOLD : C.ink, r: 4 });
          g.label(p, name, { color: lit ? GOLD : C.ink, size: n === 4 ? 12 : 15, bold: true, dy: -16 });
        });
        g.label({ x: 7.6, y: 4.3 }, `${1 << n} = 2${sup(n)} subsets`, { color: GOLD, size: 17, bold: true, align: "right" });
        return;
      }

      if (f.step === 2) {
        const rows = all.length > 8 ? 8 : all.length;
        all.forEach((b) => {
          const col = Math.floor(b / rows);
          const row = b % rows;
          const lit = sizeOf(b) === k;
          const y = 3.6 - row * 0.78;
          const x = -6.6 + col * 7.4;
          g.label({ x, y }, binary(b, n), { color: lit ? GOLD : C.ink, size: 18, bold: true, align: "left" });
          g.label({ x: x + 0.45 * n + 0.6, y }, `→  ${braces(members(b, n))}`, { color: lit ? GOLD : C.dim, size: 16, bold: true, align: "left", alpha: f.at(2) });
        });
        return;
      }

      // Columns by size.
      const width = 15 / (n + 1);
      const counts: number[] = [];
      for (let c = 0; c <= n; c++) {
        const x = -7.5 + (c + 0.5) * width;
        const lit = c === k;
        const group = all.filter((b) => sizeOf(b) === c);
        counts.push(group.length);
        g.label({ x, y: 4.1 }, `size ${c}`, { color: lit ? GOLD : C.dim, size: 14, bold: true });
        group.forEach((b, i) => {
          g.label({ x, y: 3.3 - i * 0.65 }, braces(members(b, n)), { color: lit ? GOLD : C.ink, size: n === 4 ? 13 : 15, bold: true });
        });
        g.label({ x, y: -1.0 }, String(group.length), { color: lit ? GOLD : C.ink, size: 22, bold: true, alpha: f.at(3) });
      }
      g.label({ x: 0, y: -2.2 }, `${counts.join(" + ")} = ${1 << n} = 2${sup(n)}`, { color: GOLD, size: 20, bold: true, alpha: f.at(3) });
    },

    readout(f) {
      const [n, k] = nk();
      const rows: Readout[] = [{ label: "All subsets", tex: `2^{${n}} = ${1 << n}`, tone: "good" }];
      rows.push({ label: `Size ${k}`, tex: `${choose(n, k)} \\text{ subsets}` });
      if (f.step >= 3) rows.push({ label: "Proper", tex: `2^{${n}} - 1 = ${(1 << n) - 1}` });
      return rows;
    },

    likes: [
      {
        title: "Packing a bag",
        text: "Going through a pile of things to pack, you say yes or no to each one. Every way of answering is a different packed bag, from the empty bag to taking everything, and one more item to decide on doubles the number of possible bags.",
      },
      {
        title: "Twenty questions",
        text: "Each yes-or-no question halves what is left, so 20 questions can tell apart $2^{20}$, over a million, possibilities. Choosing a subset runs the same doubling forward: each element is one more question.",
      },
    ],

    uses: [
      {
        title: "Pizza toppings",
        text: "A pizzeria with 8 toppings can make $2^8 = 256$ different pizzas, counting the plain one, because each topping is on or off. Each pizza is a subset of the 8 toppings. Adding a ninth topping doubles the menu to 512 possibilities.",
        tags: ["home"],
        image: {
          src: pizzaToppingSubsetsImage,
          caption: "Each of 8 toppings is on or off, so there are 2⁸ = 256 possible pizzas.",
          alt: "A pizza beside a row of eight topping switches, three of them on, with the line 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 256 and the count 256 in gold.",
        },
      },
      {
        title: "A bank of light switches",
        text: "A row of 4 switches controlling 4 lights has $2^4 = 16$ settings: the set of lights that are on can be any subset of the four. Reading on as 1 and off as 0 turns each setting into a 4-digit binary string, from 0000, all dark, to 1111, all lit.",
        tags: ["electrical", "computing"],
        image: {
          src: lightSwitchSettingsImage,
          caption: "Four switches have 2⁴ = 16 settings; on-off-on-on reads as the binary string 1011.",
          alt: "Four wall switches, the first, third and fourth up and the second down, with lit and unlit bulbs above them and the string 1011 below; the total 16 = 2⁴ is in gold.",
        },
      },
    ],
  };
});
