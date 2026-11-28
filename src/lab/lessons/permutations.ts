// Permutations and factorials. Filling a row of places one at a time leaves
// one fewer choice each time, so n people line up in n! ways and r of the
// places can be filled in n!/(n − r)! ways. A restriction is handled first:
// fix the restricted places, or glue the people who must stay together.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { arrangements, factorial, ordering } from "../kit/counting.ts";
import { lesson, type Readout } from "../scene.ts";
import podiumOrdersImage from "../../images/podium-orders.svg";
import cardDeckOrdersImage from "../../images/card-deck-orders.svg";

const PEOPLE = ["Ann", "Ben", "Cal", "Dee", "Eve", "Fay", "Gus"];
const COLORS = [C.gold, C.cyan, C.pink, C.green, C.violet, C.orange, C.blue];
const GOLD = C.gold;
const BOX = 1.35;

/** The centres of `count` places in a row, BOX wide with a small gap, centred on x = 0. */
const places = (count: number, y: number): Vec[] =>
  Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * (BOX + 0.25), y }));

export default lesson((s) => {
  const n = s.slider({ label: "people", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 7, value: 5, step: 1 });
  const r = s.slider({ label: "places", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 7, value: 3, step: 1 });

  return {
    steps: [
      {
        title: "Filling a row",
        text: "To line up $n$ people, fill the places one at a time: $n$ choices for the first place, then $n - 1$ for the second, and so on down to 1 for the last. By the multiplication principle there are $n(n-1)\\cdots 2 \\cdot 1$ orders, written $n!$ and read $n$ factorial. Five people line up in $5! = 120$ ways.",
      },
      {
        title: "Only some places",
        text: "With only $r$ places for $n$ people the product stops after $r$ factors: $n(n-1)\\cdots(n-r+1) = \\frac{n!}{(n-r)!}$. Gold, silver and bronze among 5 runners can go $5 \\cdot 4 \\cdot 3 = 60$ ways. With $r = n$ the formula reads $\\frac{n!}{0!}$, which is why $0!$ is taken to be 1.",
      },
      {
        title: "Restrictions first",
        text: "If Ann and Ben must take the two ends of the row, place them first: 2 ways, Ann on the left or on the right. The other $n - 2$ people then fill the middle in $(n-2)!$ ways, so there are $2 \\cdot (n-2)!$ rows; for 5 people, $2 \\cdot 3! = 12$. Deal with the restricted places before the free ones.",
      },
      {
        title: "Glue a block",
        text: "If Ann and Ben must stand together, glue them into one block. That leaves $n - 1$ things to line up, in $(n-1)!$ ways, and the block itself can be Ann then Ben or Ben then Ann. So there are $2 \\cdot (n-1)!$ rows: for 5 people, $2 \\cdot 4! = 48$ of the 120.",
      },
    ],

    draw(g, f) {
      const N = n.value;
      const R = Math.min(r.value, N);
      const ids = Array.from({ length: N }, (_, i) => i);
      const tick = Math.floor(f.time / 1.4);

      const seat = (p: Vec, who: number | null, o: { gold?: boolean; wide?: number } = {}): void => {
        const w = (o.wide ?? BOX) / 2;
        g.polygon(
          [
            { x: p.x - w, y: p.y - 0.62 },
            { x: p.x + w, y: p.y - 0.62 },
            { x: p.x + w, y: p.y + 0.62 },
            { x: p.x - w, y: p.y + 0.62 },
          ],
          { color: o.gold ? GOLD : C.dim, fill: tint(o.gold ? GOLD : C.ink, 0.06), width: o.gold ? 2.5 : 1.5 },
        );
        if (who === null) return;
        g.point({ x: p.x, y: p.y + 0.12 }, { color: COLORS[who], r: 9 });
        g.label({ x: p.x, y: p.y - 0.36 }, PEOPLE[who], { color: COLORS[who], size: 13, bold: true });
      };

      const factors = (spots: Vec[], values: string[]): void => {
        spots.forEach((p, i) => {
          g.label({ x: p.x, y: p.y - 1.15 }, values[i], { color: C.ink, size: 18, bold: true, alpha: f.at(f.step) });
          if (i > 0) g.label({ x: (p.x + spots[i - 1].x) / 2, y: p.y - 1.15 }, "×", { color: C.dim, size: 16, bold: true, alpha: f.at(f.step) });
        });
      };

      // The queue of everyone, along the top.
      const queue = (dimmed: (i: number) => boolean): void => {
        places(N, 3.7).forEach((p, i) => {
          g.point(p, { color: COLORS[i], r: 8, alpha: dimmed(i) ? 0.3 : 1 });
          g.label(p, PEOPLE[i], { color: COLORS[i], size: 12, bold: true, dy: -18, alpha: dimmed(i) ? 0.3 : 1 });
        });
      };

      if (f.step === 0 || f.step === 1) {
        const count = f.step === 0 ? N : R;
        const total = arrangements(N, count);
        const order = ordering(ids, (tick * 7919) % factorial(N)).slice(0, count);
        queue((i) => order.includes(i));
        const spots = places(count, 1.2);
        spots.forEach((p, i) => seat(p, order[i]));
        factors(spots, spots.map((_, i) => String(N - i)));
        const name = f.step === 0 ? `${N}! = ${total} orders` : `${N}!/${N - count}! = ${total} orders`;
        g.label({ x: 0, y: -1.5 }, name, { color: GOLD, size: 20, bold: true });
        return;
      }

      if (f.step === 2) {
        const total = 2 * factorial(N - 2);
        const k = tick % total;
        const flip = k % 2 === 1;
        const middle = ordering(ids.slice(2), Math.floor(k / 2));
        const order = [flip ? 1 : 0, ...middle, flip ? 0 : 1];
        queue(() => true);
        const spots = places(N, 1.2);
        spots.forEach((p, i) => seat(p, order[i], { gold: i === 0 || i === N - 1 }));
        factors(spots, spots.map((_, i) => (i === 0 ? "2" : i === N - 1 ? "1" : String(N - 1 - i))));
        g.label({ x: 0, y: -1.5 }, `2 × ${N - 2}! = ${total} rows`, { color: GOLD, size: 20, bold: true });
        return;
      }

      // Ann and Ben glued into one block, lined up with the others.
      const total = 2 * factorial(N - 1);
      const k = tick % total;
      const flip = k % 2 === 1;
      const units = ordering([-1, ...ids.slice(2)], Math.floor(k / 2));
      queue(() => true);
      const unitWidth = (u: number): number => (u === -1 ? 2 * BOX + 0.1 : BOX);
      const widths = units.map(unitWidth);
      const span = widths.reduce((t, w) => t + w, 0) + 0.25 * (units.length - 1);
      let x = -span / 2;
      const spots: Vec[] = [];
      units.forEach((u, i) => {
        const w = widths[i];
        const p = { x: x + w / 2, y: 1.2 };
        spots.push(p);
        if (u === -1) {
          seat(p, null, { gold: true, wide: w });
          const pair = flip ? [1, 0] : [0, 1];
          pair.forEach((who, j) => {
            const q = { x: p.x + (j - 0.5) * (BOX * 0.95), y: p.y };
            g.point({ x: q.x, y: q.y + 0.12 }, { color: COLORS[who], r: 9 });
            g.label({ x: q.x, y: q.y - 0.36 }, PEOPLE[who], { color: COLORS[who], size: 13, bold: true });
          });
        } else {
          seat(p, u);
        }
        x += w + 0.25;
      });
      factors(spots, spots.map((_, i) => String(N - 1 - i)));
      g.label({ x: 0, y: -1.5 }, `2 × ${N - 1}! = ${total} rows`, { color: GOLD, size: 20, bold: true });
    },

    readout(f) {
      const N = n.value;
      const R = Math.min(r.value, N);
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Orders", tex: `${N}! = ${factorial(N)}`, tone: "good" });
      else if (f.step === 1)
        rows.push({ label: "Orders", tex: `\\frac{${N}!}{(${N} - ${R})!} = \\frac{${factorial(N)}}{${factorial(N - R)}} = ${arrangements(N, R)}`, tone: "good" });
      else if (f.step === 2) rows.push({ label: "At the ends", tex: `2 \\cdot (${N} - 2)! = ${2 * factorial(N - 2)}`, tone: "good" });
      else rows.push({ label: "Together", tex: `2 \\cdot (${N} - 1)! = ${2 * factorial(N - 1)}`, tone: "good" });
      if (f.step >= 2) rows.push({ label: "All rows", tex: `${N}! = ${factorial(N)}`, tone: "dim" });
      return rows;
    },

    likes: [
      {
        title: "Picking teams in the playground",
        text: "The first captain's pick has the whole class to choose from, the next pick one fewer, and the last child left has no choice at all. The choices shrink by one each turn, which is all a factorial is.",
      },
      {
        title: "A couple at the cinema",
        text: "A couple who want to sit side by side can be treated as one wide guest when the row is planned, then swapped left for right at the end. That is the glued block, and the swap is the factor of 2.",
      },
    ],

    uses: [
      {
        title: "Medals in a final",
        text: "With 8 runners in a final, gold can go to any of 8, silver to any of the 7 left and bronze to any of the 6 after that, so there are $8 \\cdot 7 \\cdot 6 = \\frac{8!}{5!} = 336$ ways the podium can look. Betting on the exact top three is hard for this reason.",
        tags: ["sport"],
        image: {
          src: podiumOrdersImage,
          caption: "8 runners can fill gold, silver and bronze in 8 × 7 × 6 = 336 ways.",
          alt: "A three-step podium with 8, 7 and 6 written on the gold, silver and bronze steps, and the line 8 × 7 × 6 = 336.",
        },
      },
      {
        title: "Shuffling a deck",
        text: "A deck of 52 cards can be ordered in $52! \\approx 8 \\times 10^{67}$ ways, a number with 68 digits. It is so large that a well-shuffled deck is almost certainly in an order no deck has ever been in before, which is what makes shuffling fair.",
        tags: ["game-design"],
        image: {
          src: cardDeckOrdersImage,
          caption: "52 cards can be ordered in 52 × 51 × … × 1 = 52! ≈ 8 × 10⁶⁷ ways.",
          alt: "A fan of playing cards above the product 52 × 51 × 50 × … × 1, with 52! ≈ 8 × 10⁶⁷ in gold.",
        },
      },
    ],
  };
});
