// Direct variation. Apples at k dollars a pound: x pounds cost y = kx, so
// doubling the weight doubles the price, the ratio y/x is always k, and the
// graph is a line through the origin. A fixed fee breaks all three. Two
// weights on one line solve a proportion without finding k.

import { C, tint } from "../draw.ts";
import { clamp, type Vec } from "../geo.ts";
import { axes, onStage, plot, type Graph } from "../kit/algebra.ts";
import { cents, texMoney, texNum } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import deliScalePriceImage from "../../images/deli-scale-price.svg";
import springStretchWeightImage from "../../images/spring-stretch-weight.svg";

const ONE = C.cyan;
const TWO = C.pink;
const LINE = C.gold;
const FEE = C.orange;
/** The fixed fee of step 3, in dollars. */
const FEE_DOLLARS = 4;
/** Pounds across, four dollars up per stage unit. */
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 4 } };

/** A foot on the pounds axis, at a whole or half pound from ½ to 10. */
const onAxis = (p: Vec): Vec => ({ x: GRAPH.origin.x + clamp(Math.round((p.x - GRAPH.origin.x) * 2) / 2, 0.5, 10), y: GRAPH.origin.y });

export default lesson((s) => {
  const k = s.slider({ label: "k =", format: (v) => `$${cents(v)} a pound`, at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0.5, max: 3, value: 1.5, step: 0.25 });
  const x1 = s.point(GRAPH.origin.x + 3, GRAPH.origin.y, { label: "x₁", color: ONE, constrain: onAxis });
  const x2 = s.point(GRAPH.origin.x + 6, GRAPH.origin.y, { label: "x₂", color: TWO, constrain: onAxis });

  const pounds = (h: Vec): number => h.x - GRAPH.origin.x;

  return {
    steps: [
      {
        title: "Double the weight, double the price",
        text: "Apples cost $k$ dollars a pound, so $x$ pounds cost $y = kx$ dollars. Buy twice as much and you pay twice as much; three times as much, three times. We say $y$ varies directly as $x$, or is proportional to it, and call $k$ the constant of proportionality. Drag $x_1$ and $x_2$.",
      },
      {
        title: "The ratio never changes",
        text: "Divide by $x$: $\\frac{y}{x} = k$ at every point of the graph. The triangles from 0 to each point are similar, so they have the same slope, and that slope is $k$, the price of one pound.",
      },
      {
        title: "A line through the origin",
        text: "The graph of $y = kx$ is a straight line through 0, because 0 pounds cost nothing. The dashed line adds a fixed fee: $y = kx + 4$ is still a line, but it misses 0, its ratio $\\frac{y}{x}$ changes from point to point, and doubling $x$ no longer doubles $y$.",
      },
      {
        title: "Solving with a proportion",
        text: "If 3 pounds cost $\\text{\\textdollar}4.50$, what do 8 pounds cost? Both pairs have the same ratio, so $\\frac{4.50}{3} = \\frac{y}{8}$ and $y = 8 \\cdot 1.50 = 12$. You never need $k$ itself: $y_2 = y_1 \\cdot \\frac{x_2}{x_1}$, the old price scaled by how much more you buy.",
      },
    ],

    draw(g, f) {
      const at = (x: number, y: number): Vec => onStage(GRAPH, { x, y });
      const price = (x: number): number => k.value * x;
      axes(g, GRAPH, { positive: true, xName: "pounds", yName: "dollars" });

      if (f.step === 2) {
        plot(g, GRAPH, (x) => price(x) + FEE_DOLLARS, { color: FEE, width: 2.5, dash: [7, 6], from: 0, alpha: f.at(2) });
        g.point(at(0, FEE_DOLLARS), { color: FEE, r: 5, alpha: f.at(2) });
        g.label(at(0, FEE_DOLLARS), "$4 fee", { color: FEE, size: 13, bold: true, dx: 10, dy: 8, align: "left", alpha: f.at(2) });
      }
      plot(g, GRAPH, price, { color: LINE, width: 3, from: 0 });

      for (const [h, color] of [[x1, ONE], [x2, TWO]] as const) {
        const x = pounds(h);
        const p = at(x, price(x));
        if (f.step === 1) {
          g.polygon([at(0, 0), at(x, 0), p], { color, fill: tint(color, 0.12), width: 1.5 });
        } else {
          g.segment(h, p, { color, width: 1.5, dash: [4, 5] });
        }
        g.point(p, { color, r: 6 });
        g.label(p, `$${cents(price(x))}`, { color, size: 14, bold: true, dx: -10, dy: 6, align: "right" });
        if (f.step === 2) {
          const q = at(x, price(x) + FEE_DOLLARS);
          g.point(q, { color: FEE, r: 4, alpha: f.at(2) });
        }
      }
    },

    readout(f) {
      const [a, b] = [pounds(x1), pounds(x2)];
      const [ya, yb] = [k.value * a, k.value * b];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Prices", tex: `y_1 = ${texNum(k.value)} \\cdot ${texNum(a)} = ${texMoney(ya)},\\quad y_2 = ${texNum(k.value)} \\cdot ${texNum(b)} = ${texMoney(yb)}` });
        rows.push({ label: "Times as much", tex: `\\frac{x_2}{x_1} = ${texNum(b / a, 3)},\\quad \\frac{y_2}{y_1} = ${texNum(yb / ya, 3)}`, tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Ratios", tex: `\\frac{y_1}{x_1} = \\frac{${texNum(ya)}}{${texNum(a)}} = ${texNum(ya / a)},\\quad \\frac{y_2}{x_2} = \\frac{${texNum(yb)}}{${texNum(b)}} = ${texNum(yb / b)}` });
        rows.push({ label: "Constant", tex: `k = ${texNum(k.value)}`, tone: "good" });
      } else if (f.step === 2) {
        const [fa, fb] = [ya + FEE_DOLLARS, yb + FEE_DOLLARS];
        rows.push({ label: "Without the fee", tex: `\\frac{y}{x} = ${texNum(k.value)} \\text{ at both}`, tone: "good" });
        rows.push({
          label: "With the fee",
          tex: `\\frac{${texNum(fa)}}{${texNum(a)}} \\approx ${texNum(fa / a)},\\quad \\frac{${texNum(fb)}}{${texNum(b)}} \\approx ${texNum(fb / b)}`,
          tone: a === b ? "plain" : "warn",
        });
      } else {
        rows.push({ label: "Same ratio", tex: `\\frac{y_1}{x_1} = \\frac{y_2}{x_2}` });
        rows.push({ label: "So", tex: `y_2 = y_1 \\cdot \\frac{x_2}{x_1} = ${texNum(ya)} \\cdot \\frac{${texNum(b)}}{${texNum(a)}} = ${texMoney(yb)}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Filling a bucket from a tap",
        text: "A tap pours water at a steady rate, so leaving it on twice as long gives twice as much water. Litres are proportional to seconds, and the constant is the rate in litres per second. Ten seconds for 2 litres means 25 seconds for 5.",
      },
      {
        title: "Copies at a print shop",
        text: "At 10 cents a page, 30 pages cost $\\text{\\textdollar}3$ and 60 pages $\\text{\\textdollar}6$. If the shop also charges $\\text{\\textdollar}1$ to start the job, 30 pages cost $\\text{\\textdollar}4$ and 60 cost $\\text{\\textdollar}7$: no longer double. The fee is what stops the cost being proportional.",
      },
    ],

    uses: [
      {
        title: "Paying by the pound",
        text: "A deli scale multiplies the weight by the price per pound, so its total is proportional to the weight. At $\\text{\\textdollar}3$ a pound, 2 pounds cost $\\text{\\textdollar}6$ and 4 pounds $\\text{\\textdollar}12$. If 1.5 pounds rang up at $\\text{\\textdollar}6.75$, then 2 pounds cost $6.75 \\cdot \\frac{2}{1.5} = \\text{\\textdollar}9$.",
        tags: ["money", "home"],
        image: {
          src: deliScalePriceImage,
          caption: "At 3 dollars a pound, the price is always 3 times the weight: 2 lb costs 6 dollars and 4 lb costs 12.",
          alt: "A deli scale with a heap of cherries on its pan and a display reading 2.00 lb and $6.00, beside a hanging price tag reading $3 per lb and the lines 2 lb → $6 and 4 lb → $12.",
        },
      },
      {
        title: "Springs and weights",
        text: "A spring stretches in proportion to the force pulling it, as long as it is not overstretched: this is Hooke's law. If one weight stretches a spring 2 cm, three weights stretch it 6 cm. Spring scales use this to turn a stretch into a reading.",
        tags: ["machines"],
        image: {
          src: springStretchWeightImage,
          caption: "A spring stretches in proportion to the weight hung on it: one weight stretches it 2 cm, two weights 4 cm, three weights 6 cm.",
          alt: "Three identical springs hanging from a bar, holding one, two and three red weights, with gold dashed lines from their bottoms to a centimetre ruler at 2, 4 and 6 cm below a grey line marking the unstretched length.",
        },
      },
    ],
  };
});
