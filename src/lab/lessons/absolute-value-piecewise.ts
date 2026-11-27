// Absolute value and functions in pieces. |x| is the distance from x to 0,
// so it is never negative; written out it is x for x ≥ 0 and −x for x < 0,
// two straight pieces meeting at a corner. |x − c| is the distance from x to
// c, the same V moved to c. Any function can be defined in pieces like this,
// a different rule on each interval, with a filled dot where a piece
// includes its end and an open one where it stops just short.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes } from "../kit/algebra.ts";
import { num } from "../kit/coordinates.ts";
import { at, curve, endDot, GRAPH, shown, WINDOW, type Fn } from "../kit/functions.ts";
import { lesson, type Readout } from "../scene.ts";
import shaftCaliperToleranceImage from "../../images/shaft-caliper-tolerance.svg";
import tieredPowerBillImage from "../../images/tiered-power-bill.svg";

const GOLD = C.gold;
const LEFT = C.violet;
const RIGHT = C.cyan;
const THIRD = C.orange;

/** The piecewise function of the last step: x + 4, then x²/2, then 3 − x. */
const piece: Fn = (x) => (x < -2 ? x + 4 : x < 2 ? (x * x) / 2 : 3 - x);
const pieceName = (x: number): string => (x < -2 ? "x + 4" : x < 2 ? "x²/2" : "3 − x");

export default lesson((s) => {
  const xs = s.slider({ label: "x =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -6, max: 6, value: -3, step: 0.5, format: (v) => num(v) });
  const cs = s.slider({ label: "c =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -4, max: 4, value: 2, step: 0.5, format: (v) => num(v) });

  return {
    steps: [
      {
        title: "Distance from zero",
        text: "The absolute value $|x|$ is the distance from $x$ to $0$ on the number line, so it is never negative: $|3| = 3$ and $|-3| = 3$. Its graph $y = |x|$ is a V with its corner at the origin. It is even, since $x$ and $-x$ are the same distance from $0$.",
      },
      {
        title: "Two pieces",
        text: "Written without the bars, $|x| = x$ when $x \\ge 0$ and $|x| = -x$ when $x < 0$: on the left, $-x$ makes a negative input positive. So the V is two straight pieces, the line $y = -x$ to the left of $0$ and $y = x$ to the right, joined at the corner.",
      },
      {
        title: "Distance between two numbers",
        text: "$|x - c|$ is the distance from $x$ to $c$, so its graph is the same V with its corner moved to $c$. Solving $|x - 2| = 3$ asks which numbers are 3 from 2: $x = 5$ and $x = -1$. The equation $|x - c| = d$ has two solutions $c \\pm d$ when $d > 0$, one when $d = 0$, none when $d < 0$.",
      },
      {
        title: "A function in pieces",
        text: "A piecewise function uses a different rule on each interval. Here $f(x) = x + 4$ for $x < -2$, $\\tfrac{1}{2}x^2$ for $-2 \\le x < 2$, and $3 - x$ for $x \\ge 2$. To find $f(x)$, first find which interval $x$ is in. A filled dot shows a piece includes its end, an open dot that it stops short: $f(2) = 3 - 2 = 1$, not $2$.",
      },
    ],

    draw(g, f) {
      axes(g, GRAPH, { xName: "x", yName: "y" });
      const x = xs.value;

      if (f.step === 3) {
        curve(g, (t) => t + 4, { color: LEFT, width: 3, to: -2 });
        curve(g, (t) => (t * t) / 2, { color: RIGHT, width: 3, from: -2, to: 2 });
        curve(g, (t) => 3 - t, { color: THIRD, width: 3, from: 2 });
        endDot(g, -2, 2, true, RIGHT);
        endDot(g, 2, 2, false, RIGHT);
        endDot(g, 2, 1, true, THIRD);
        const y = piece(x);
        if (shown(x, y)) {
          g.segment(at(x, 0), at(x, y), { color: GOLD, width: 2, dash: [4, 4] });
          g.point(at(x, y), { color: GOLD, r: 7 });
          g.label(at(x, y), `f(${num(x)}) = ${num(y, 2)}`, { color: GOLD, size: 14, bold: true, dx: 12, dy: 16, align: "left" });
        }
        g.label({ x: -7.4, y: 4.4 }, "x + 4", { color: LEFT, size: 15, bold: true, align: "left" });
        g.label({ x: -5.6, y: 4.4 }, "x²/2", { color: RIGHT, size: 15, bold: true, align: "left" });
        g.label({ x: -4.1, y: 4.4 }, "3 − x", { color: THIRD, size: 15, bold: true, align: "left" });
        return;
      }

      const c = f.step === 2 ? cs.value : 0;
      const abs: Fn = (t) => Math.abs(t - c);
      if (f.step === 0) {
        curve(g, abs, { color: g.accent, width: 3 });
      } else {
        curve(g, abs, { color: LEFT, width: 3, to: c });
        curve(g, abs, { color: RIGHT, width: 3, from: c });
        g.label(at(c - 2.6, 3.4), c === 0 ? "y = −x" : `y = ${num(c)} − x`, { color: LEFT, size: 15, bold: true, alpha: f.at(1) });
        g.label(at(c + 2.6, 3.4), c === 0 ? "y = x" : `y = x − ${num(c)}`.replace("− −", "+ "), { color: RIGHT, size: 15, bold: true, alpha: f.at(1) });
      }
      g.point(at(c, 0), { color: C.ink, r: 5 });

      // The distance from x to c, along the axis and up to the graph.
      const d = Math.abs(x - c);
      g.segment(at(c, 0), at(x, 0), { color: GOLD, width: 6, alpha: 0.7 });
      if (shown(x, d)) {
        g.segment(at(x, 0), at(x, d), { color: GOLD, width: 2, dash: [4, 4] });
        g.point(at(x, d), { color: GOLD, r: 7 });
        const name = c === 0 ? `|${num(x)}|` : `|${num(x)} − ${num(c)}|`.replace("− −", "+ ");
        g.label(at(x, d), `${name} = ${num(d)}`, { color: GOLD, size: 14, bold: true, dx: x >= c ? 12 : -12, dy: 14, align: x >= c ? "left" : "right" });
      }
      if (f.step === 2) {
        // The two solutions of |x − c| = 3.
        const sols = [c - 3, c + 3];
        g.segment(at(WINDOW.xmin, 3), at(WINDOW.xmax, 3), { color: C.dim, width: 1.5, dash: [6, 6] });
        g.label(at(WINDOW.xmax, 3), "y = 3", { color: C.dim, size: 13, dx: -4, dy: 12, align: "right" });
        for (const t of sols) if (shown(t, 3)) g.circle(at(t, 3), g.px(9), { color: C.ink, width: 2 });
      }
    },

    readout(f) {
      const x = xs.value;
      if (f.step === 3) {
        return [
          { label: "Which piece", tex: `x = ${fmt(x)} \\Rightarrow f(x) = ${pieceName(x).replace("x²/2", "\\tfrac{1}{2}x^2").replace("−", "-")}` },
          { label: "Value", tex: `f(${fmt(x)}) = ${fmt(piece(x), 3)}`, tone: "good" },
        ];
      }
      const c = f.step === 2 ? cs.value : 0;
      const inside = c === 0 ? `${fmt(x)}` : `${fmt(x)} - ${c < 0 ? `(${fmt(c)})` : fmt(c)}`;
      const rows: Readout[] = [{ label: "Distance", tex: `|${inside}| = ${fmt(Math.abs(x - c))}`, tone: "good" }];
      if (f.step === 1) rows.push({ label: "Piece", tex: x >= 0 ? `x \\ge 0: \\ |x| = x = ${fmt(x)}` : `x < 0: \\ |x| = -x = -(${fmt(x)}) = ${fmt(-x)}` });
      if (f.step === 2) rows.push({ label: "Solve", tex: `|x - ${c < 0 ? `(${fmt(c)})` : fmt(c)}| = 3 \\iff x = ${fmt(c - 3)} \\text{ or } x = ${fmt(c + 3)}` });
      return rows;
    },

    likes: [
      {
        title: "Kilometres to the next town",
        text: "A road sign gives the distance to the next town, never a negative one, whether the town lies ahead or behind. Distance forgets direction, and $|x - c|$ is the distance between $x$ and $c$ whichever is larger.",
      },
      {
        title: "Ticket prices by age",
        text: "A cinema might charge a child's price under 12, an adult's price from 12 up to 65, and a senior's price from 65. That is a piecewise rule: you first find which band your age is in, then read the price, and the edges say which band a twelve-year-old belongs to.",
      },
    ],

    uses: [
      {
        title: "Tolerance on a machined part",
        text: "A drawing that asks for a shaft 25 mm across, give or take 0.1 mm, sets the rule $|d - 25| \\le 0.1$ on the measured diameter $d$. A shaft of 25.06 mm is 0.06 mm off and passes; one of 24.85 mm is 0.15 mm off and is rejected, whichever side of 25 it falls.",
        tags: ["machines", "trade-tricks"],
        image: {
          src: shaftCaliperToleranceImage,
          caption: "A 25 mm shaft with tolerance 0.1 mm must satisfy |d − 25| ≤ 0.1: anything from 24.9 to 25.1 mm passes.",
          alt: "A shaft held in a caliper, above a number line from 24.8 to 25.2 with the band from 24.9 to 25.1 in gold, a pass mark at 25.06 and a reject mark at 24.85.",
        },
      },
      {
        title: "A tiered electricity bill",
        text: "Some electricity tariffs charge 10 cents a kilowatt-hour for the first 500 kWh in a month and 15 cents for each one after that. The bill is a piecewise function of use: $0.10u$ dollars for $u \\le 500$ and $50 + 0.15(u - 500)$ dollars above. Using 700 kWh costs $50 + 0.15 \\cdot 200 = 80$ dollars.",
        tags: ["money", "home", "electrical"],
        image: {
          src: tieredPowerBillImage,
          caption: "At 10 cents per kWh up to 500 kWh and 15 cents after, the bill bends upward at 500: 700 kWh costs 50 + 30 = 80 dollars.",
          alt: "A graph of the monthly bill against kWh used, a line rising gently to 50 dollars at 500 kWh and then more steeply, with a gold point at 700 kWh and 80 dollars.",
        },
      },
    ],
  };
});
