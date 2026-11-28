// Overcounting and choosing. Counting ordered lists of r people from n counts
// each group once for every one of its r! orders, so dividing by r! counts the
// groups: n choose r. Choosing who is in is choosing who is out, and the same
// divide-the-overcount idea counts rows of things where some are alike.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { arrangements, choose, factorial, ordering, subsets } from "../kit/counting.ts";
import { lesson, type Readout } from "../scene.ts";
import pizzaToppingsChooseImage from "../../images/pizza-toppings-choose.svg";
import lotterySixOfFortyNineImage from "../../images/lottery-six-of-49.svg";

const PEOPLE = ["Ann", "Ben", "Cal", "Dee", "Eve", "Fay", "Gus", "Hal"];
const COLORS = [C.gold, C.cyan, C.pink, C.green, C.violet, C.orange, C.blue, C.red];
const GOLD = C.gold;
/** The other flags' colours, after the red ones. */
const FLAGS = [C.cyan, C.green, C.violet, C.orange, C.blue, C.pink, C.ink];

export default lesson((s) => {
  const n = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 8, value: 5, step: 1 });
  const r = s.slider({ label: "r =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 8, value: 3, step: 1 });

  return {
    steps: [
      {
        title: "Count in order first",
        text: "To choose a committee of 3 from 5 people, first count as if order mattered: $5 \\cdot 4 \\cdot 3 = 60$ ordered lists. But the list Ann, Ben, Cal makes the same committee as Cal, Ann, Ben, so 60 counts every committee more than once.",
      },
      {
        title: "Divide out the overcount",
        text: "Each committee of $r$ turns up in the lists once for each of its $r!$ orders, 6 times for a committee of 3. So there are $\\frac{60}{6} = 10$ committees. In general the number of ways to choose $r$ things from $n$, when order does not matter, is $\\binom{n}{r} = \\frac{n!}{r!(n-r)!}$, read $n$ choose $r$.",
      },
      {
        title: "Who is left out",
        text: "Choosing the 3 who serve is the same as choosing the 2 who do not, so $\\binom{5}{3} = \\binom{5}{2} = 10$, and in general $\\binom{n}{r} = \\binom{n}{n-r}$. Counting the same thing another way is a check on the answer, and sometimes the easier count.",
      },
      {
        title: "Things that are alike",
        text: "Line up $n$ flags, $r$ of them identical red ones and the rest all different. Treating the reds as different gives $n!$ rows, but each row is then counted $r!$ times, once for each way of shuffling the reds among their places. So there are $\\frac{n!}{r!}$ rows: 5 flags with 3 red make $\\frac{120}{6} = 20$. The letters of LEVEL make $\\frac{5!}{2! \\cdot 2!} = 30$ words the same way.",
      },
    ],

    draw(g, f) {
      const N = n.value;
      const R = Math.min(r.value, N);
      const ids = Array.from({ length: N }, (_, i) => i);
      const tick = Math.floor(f.time / 1.4);
      const dot = (p: Vec, who: number, rad = 7, alpha = 1): void => g.point(p, { color: COLORS[who], r: rad, alpha });

      // Everyone, along the top.
      const crowd = (picked: (i: number) => boolean, y = 3.9): void => {
        ids.forEach((i) => {
          const p = { x: (i - (N - 1) / 2) * 1.35, y };
          if (picked(i)) g.circle(p, 0.42, { color: GOLD, width: 2.5 });
          dot(p, i, 9, picked(i) ? 1 : 0.35);
          g.label(p, PEOPLE[i], { color: COLORS[i], size: 12, bold: true, dy: -22, alpha: picked(i) ? 1 : 0.35 });
        });
      };

      if (f.step === 0 || f.step === 1) {
        // Committees as columns, each column listing its orders as rows of dots.
        const groups = subsets(ids, R);
        const orders = factorial(R);
        const shownOrders = Math.min(orders, 6);
        const pitch = 0.3;
        const colWidth = R * pitch + 0.45;
        const shownGroups = Math.min(groups.length, Math.floor(15 / colWidth));
        const left = -(shownGroups * colWidth) / 2;
        const lit = tick % shownGroups;
        crowd((i) => f.step === 1 && groups[lit].includes(i));
        groups.slice(0, shownGroups).forEach((group, c) => {
          const x = left + c * colWidth + 0.22;
          const sorted = f.step === 1;
          const listed = Array.from({ length: shownOrders }, (_, k) => ordering(group, k));
          // Every order of a committee is one ordered list; in step 2 one committee's orders are boxed together.
          listed.forEach((order, k) => {
            const y = 2.2 - k * 0.5;
            order.forEach((who, j) => dot({ x: x + (j + 0.5) * pitch, y }, who, 5, sorted || k === 0 ? 1 : 0.55));
          });
          if (sorted && c === lit) {
            const top = 2.5;
            const bottom = 2.2 - (shownOrders - 1) * 0.5 - 0.3;
            g.polygon(
              [
                { x: x - 0.1, y: top },
                { x: x + R * pitch + 0.1, y: top },
                { x: x + R * pitch + 0.1, y: bottom },
                { x: x - 0.1, y: bottom },
              ],
              { color: GOLD, fill: tint(GOLD, 0.12), width: 2, alpha: f.at(1) },
            );
          }
        });
        const more = groups.length > shownGroups || orders > shownOrders ? "  (some not shown)" : "";
        const total = arrangements(N, R);
        if (f.step === 0) {
          g.label({ x: 0, y: -1.3 }, `${N}!/${N - R}! = ${total} ordered lists${more}`, { color: C.ink, size: 17, bold: true });
          g.label({ x: 0, y: -2.2 }, `each committee appears ${orders} times`, { color: GOLD, size: 17, bold: true, alpha: f.at(0) });
        } else {
          g.label({ x: 0, y: -1.3 }, `${total} lists ÷ ${R}! orders each${more}`, { color: C.ink, size: 17, bold: true });
          g.label({ x: 0, y: -2.2 }, `= ${choose(N, R)} committees`, { color: GOLD, size: 20, bold: true, alpha: f.at(1) });
        }
        return;
      }

      if (f.step === 2) {
        const groups = subsets(ids, R);
        const group = groups[tick % groups.length];
        crowd((i) => group.includes(i), 2.4);
        g.label({ x: -3.6, y: 0.6 }, `in: choose ${R}`, { color: GOLD, size: 17, bold: true });
        g.label({ x: 3.6, y: 0.6 }, `out: choose ${N - R}`, { color: C.dim, size: 17, bold: true });
        g.label({ x: 0, y: -0.6 }, `C(${N}, ${R}) = C(${N}, ${N - R}) = ${choose(N, R)}`, { color: GOLD, size: 20, bold: true, alpha: f.at(2) });
        g.label({ x: 0, y: -1.5 }, "each choice of who is in is a choice of who is out", { color: C.dim, size: 14, bold: true });
        return;
      }

      // Flags: R alike red ones and the rest all different.
      const total = factorial(N) / factorial(R);
      const rows = subsets(ids, R);
      const idx = tick % total;
      const where = rows[idx % rows.length];
      const rest = ordering(
        Array.from({ length: N - R }, (_, i) => i),
        Math.floor(idx / rows.length),
      );
      let next = 0;
      const step = Math.min(1.5, 13 / N);
      for (let i = 0; i < N; i++) {
        const x = (i - (N - 1) / 2) * step;
        const red = where.includes(i);
        const color = red ? C.red : FLAGS[rest[next++] ?? 0];
        g.segment({ x: x - 0.35, y: 0.2 }, { x: x - 0.35, y: 2.6 }, { color: C.dim, width: 2 });
        g.polygon(
          [
            { x: x - 0.35, y: 2.6 },
            { x: x + 0.45, y: 2.3 },
            { x: x - 0.35, y: 2.0 },
          ],
          { color, fill: tint(color, 0.7), width: 2 },
        );
      }
      g.label({ x: 0, y: -0.6 }, `${N}! ÷ ${R}! = ${total} rows of flags`, { color: GOLD, size: 20, bold: true });
      g.label({ x: 0, y: -1.5 }, `${R} red flags are alike: each row counted ${factorial(R)} times`, { color: C.dim, size: 14, bold: true });
    },

    readout(f) {
      const N = n.value;
      const R = Math.min(r.value, N);
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Ordered lists", tex: `\\frac{${N}!}{${N - R}!} = ${arrangements(N, R)}` });
      if (f.step <= 1) rows.push({ label: "Committees", tex: `\\binom{${N}}{${R}} = \\frac{${N}!}{${R}! \\, ${N - R}!} = ${choose(N, R)}`, tone: "good" });
      if (f.step === 2) rows.push({ label: "In or out", tex: `\\binom{${N}}{${R}} = \\binom{${N}}{${N - R}} = ${choose(N, R)}`, tone: "good" });
      if (f.step === 3) rows.push({ label: "Rows", tex: `\\frac{${N}!}{${R}!} = \\frac{${factorial(N)}}{${factorial(R)}} = ${factorial(N) / factorial(R)}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "A hand of cards",
        text: "A hand of cards is the same hand however the cards were dealt to you. Counting deals counts each hand once for every order it could have arrived in, so the number of hands is the number of deals divided by that.",
      },
      {
        title: "Counting legs to count sheep",
        text: "Counting the legs in a field and dividing by 4 gives the sheep: every sheep was counted exactly 4 times. Dividing out an overcount works whenever each thing is counted the same number of times.",
      },
    ],

    uses: [
      {
        title: "Choosing pizza toppings",
        text: "A pizzeria offering 8 toppings, three to a pizza, can make $\\binom{8}{3} = \\frac{8 \\cdot 7 \\cdot 6}{3 \\cdot 2 \\cdot 1} = 56$ different pizzas: the 336 ordered picks divided by the 6 orders of each set of three. Pepperoni, onion and olive in any order is still one pizza.",
        tags: ["home"],
        image: {
          src: pizzaToppingsChooseImage,
          caption: "Three toppings from eight: 8 × 7 × 6 ordered picks, divided by 3! = 6, make 56 different pizzas.",
          alt: "A pizza with three gold toppings above a row of eight topping dots, and the line 8 × 7 × 6 ÷ 6 = 56.",
        },
      },
      {
        title: "The odds of a lottery",
        text: "A lottery that draws 6 numbers from 49 has $\\binom{49}{6} = 13{,}983{,}816$ possible draws, since the order of the balls does not matter. One ticket wins the jackpot about once in 14 million draws, which is the count that sets the prize.",
        tags: ["money"],
        image: {
          src: lotterySixOfFortyNineImage,
          caption: "Six numbers from 49, in any order: 49 choose 6 = 13 983 816 possible draws.",
          alt: "Six lottery balls numbered 3, 11, 19, 26, 38 and 44 above the line 49 choose 6 = 13 983 816.",
        },
      },
    ],
  };
});
