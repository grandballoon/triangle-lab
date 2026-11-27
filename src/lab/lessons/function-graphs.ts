// Graphing a function. The graph of f is every point (x, f(x)): one point
// above or below each input, joined into a curve. A vertical line x = a
// meets it at height f(a); a curve that some vertical line meets twice, like
// a circle, gives two heights for one input and is not the graph of a
// function. The graph's shadow on the x-axis is the domain, on the y-axis
// the range.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes } from "../kit/algebra.ts";
import { num } from "../kit/coordinates.ts";
import { at, curve, GRAPH, INPUT, OUTPUT, shown, WINDOW, type Fn } from "../kit/functions.ts";
import { lesson, type Readout } from "../scene.ts";
import heartTraceTimeImage from "../../images/heart-trace-time.svg";
import tideChartReadingImage from "../../images/tide-chart-reading.svg";

const GOLD = C.gold;
const BAD = C.red;

const CURVES = ["x²/2 − 2", "√(x + 4)", "(x³ − 9x)/6", "circle"] as const;
type Curve = (typeof CURVES)[number];

/** The upper half of the circle x² + y² = 9; the lower half is its negative. */
const R = 3;
const upper: Fn = (x) => (Math.abs(x) <= R ? Math.sqrt(R * R - x * x) : NaN);

interface CurveInfo {
  /** The heights over x: none, one, or two for the circle. */
  heights: (x: number) => number[];
  tex: string;
  domain: string;
  range: string;
  /** The ends of the domain and range in the window, for the shadows on the axes. */
  xs: [number, number];
  ys: [number, number];
}

const INFO: Record<Curve, CurveInfo> = {
  "x²/2 − 2": { heights: (x) => [(x * x) / 2 - 2], tex: "\\tfrac{1}{2}x^2 - 2", domain: "\\text{all real } x", range: "y \\ge -2", xs: [WINDOW.xmin, WINDOW.xmax], ys: [-2, WINDOW.ymax] },
  "√(x + 4)": { heights: (x) => (x >= -4 ? [Math.sqrt(x + 4)] : []), tex: "\\sqrt{x + 4}", domain: "x \\ge -4", range: "y \\ge 0", xs: [-4, WINDOW.xmax], ys: [0, WINDOW.ymax] },
  "(x³ − 9x)/6": { heights: (x) => [(x ** 3 - 9 * x) / 6], tex: "\\tfrac{1}{6}(x^3 - 9x)", domain: "\\text{all real } x", range: "\\text{all real } y", xs: [WINDOW.xmin, WINDOW.xmax], ys: [WINDOW.ymin, WINDOW.ymax] },
  circle: { heights: (x) => (Math.abs(x) < R ? [upper(x), -upper(x)] : Math.abs(x) === R ? [0] : []), tex: "x^2 + y^2 = 9", domain: "-3 \\le x \\le 3", range: "-3 \\le y \\le 3", xs: [-R, R], ys: [-R, R] },
};

export default lesson((s) => {
  const which = s.choice("Curve", CURVES, "x²/2 − 2");
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -6, max: 6, value: 2, step: 0.25, format: (v) => num(v, 2) });

  return {
    steps: [
      {
        title: "A point for every input",
        text: "The graph of a function $f$ is the set of all points $(x, f(x))$: above each input $x$, at height $f(x)$. For $f(x) = \\tfrac{1}{2}x^2 - 2$, the inputs $-2, 0, 2$ give the points $(-2, 0)$, $(0, -2)$ and $(2, 0)$. Plot every input, not only whole numbers, and the points join into a curve.",
      },
      {
        title: "Reading a value off the graph",
        text: "Slide the line $x = a$. It meets the graph at the point $(a, f(a))$, so the height where it crosses is the output for input $a$. Reading across to the $y$-axis gives $f(a)$; at $a = 2$, $f(2) = 0$.",
      },
      {
        title: "The vertical line test",
        text: "A curve is the graph of a function of $x$ exactly when no vertical line meets it more than once: two crossings would mean two outputs for one input. Pick the circle $x^2 + y^2 = 9$. The line $x = a$ crosses it at $y = \\pm\\sqrt{9 - a^2}$, twice whenever $-3 < a < 3$, so the circle fails.",
      },
      {
        title: "Domain and range as shadows",
        text: "Shine a light down onto the $x$-axis and the graph's shadow is the domain; shine it sideways onto the $y$-axis and the shadow is the range. Pick $\\sqrt{x + 4}$: its graph starts at $(-4, 0)$ and rises for ever, so its domain is $x \\ge -4$ and its range $y \\ge 0$.",
      },
    ],

    draw(g, f) {
      const info = INFO[which.value];
      axes(g, GRAPH, { xName: "x", yName: "y" });

      // The shadows on the axes.
      const shade = f.at(3);
      if (shade > 0) {
        const [x0, x1] = info.xs;
        const [y0, y1] = info.ys;
        g.segment(at(x0, 0), at(x1, 0), { color: INPUT, width: 9, alpha: 0.55 * shade });
        g.segment(at(0, y0), at(0, y1), { color: OUTPUT, width: 9, alpha: 0.55 * shade });
        if (x0 > WINDOW.xmin) g.point(at(x0, 0), { color: INPUT, r: 6, alpha: shade });
        if (y0 > WINDOW.ymin) g.point(at(0, y0), { color: OUTPUT, r: 6, alpha: shade });
        if (which.value === "circle") {
          g.point(at(x1, 0), { color: INPUT, r: 6, alpha: shade });
          g.point(at(0, y1), { color: OUTPUT, r: 6, alpha: shade });
        }
        g.label(at(WINDOW.xmax, 0), "domain", { color: INPUT, size: 14, bold: true, dx: -4, dy: 16, align: "right", alpha: shade });
        g.label(at(0, WINDOW.ymax), "range", { color: OUTPUT, size: 14, bold: true, dx: -10, dy: -6, align: "right", alpha: shade });
      }

      // The curve, drawn in from the plotted points at the first step.
      const grow = f.step === 0 ? Math.min(1, f.at(0) * 1.4) : 1;
      if (which.value === "circle") g.circle(at(0, 0), R, { color: g.accent, width: 3, alpha: grow });
      else curve(g, (x) => info.heights(x)[0] ?? NaN, { color: g.accent, width: 3, alpha: grow });
      if (f.step === 0) {
        for (let x = -7; x <= 7; x++) {
          for (const y of info.heights(x)) if (shown(x, y)) g.point(at(x, y), { color: GOLD, r: 5 });
        }
        return;
      }

      // The vertical line x = a and where it meets the graph.
      const A = a.value;
      const hits = info.heights(A).filter((y) => shown(A, y));
      const twice = hits.length > 1;
      const color = twice ? BAD : GOLD;
      g.segment(at(A, WINDOW.ymin), at(A, WINDOW.ymax), { color, width: 2, dash: [7, 6] });
      g.label(at(A, WINDOW.ymin), `x = ${num(A, 2)}`, { color, size: 14, bold: true, dy: -12 });
      for (const y of hits) {
        g.segment(at(A, y), at(0, y), { color: OUTPUT, width: 2, dash: [3, 5] });
        g.point(at(A, y), { color, r: 7 });
        g.label(at(A, y), `(${num(A, 2)}, ${num(y, 2)})`, { color, size: 14, bold: true, dx: A >= 0 ? 12 : -12, dy: 14, align: A >= 0 ? "left" : "right" });
      }
      if (twice) g.label(at(A, WINDOW.ymax), "two outputs", { color: BAD, size: 15, bold: true, dx: A >= 0 ? 10 : -10, dy: -10, align: A >= 0 ? "left" : "right" });
      if (hits.length === 0 && info.heights(A).length === 0) {
        g.label(at(A, 1.5), "no point here", { color: C.dim, size: 14, bold: true, dx: A >= 0 ? 10 : -10, align: A >= 0 ? "left" : "right" });
      }
    },

    readout(f) {
      const info = INFO[which.value];
      const rows: Readout[] = [{ label: which.value === "circle" ? "Curve" : "Function", tex: which.value === "circle" ? info.tex : `f(x) = ${info.tex}` }];
      if (f.step >= 1) {
        const A = a.value;
        const hs = info.heights(A);
        if (hs.length === 0) rows.push({ label: "At x = a", tex: `${fmt(A, 2)} \\text{ is not in the domain}`, tone: "dim" });
        else if (hs.length > 1) rows.push({ label: "At x = a", tex: `y = \\pm\\sqrt{9 - ${fmt(A * A, 3)}} = \\pm ${fmt(hs[0], 2)}`, tone: "warn" });
        else rows.push({ label: "At x = a", tex: which.value === "circle" ? `y = ${fmt(hs[0], 2)}` : `f(${fmt(A, 2)}) = ${fmt(hs[0], 2)}`, tone: "good" });
      }
      if (f.step >= 2) {
        rows.push(which.value === "circle" ? { label: "Vertical line test", tex: "\\text{fails: not a function}", tone: "warn" } : { label: "Vertical line test", tex: "\\text{passes}", tone: "good" });
      }
      if (f.step >= 3) {
        rows.push({ label: "Domain", tex: info.domain });
        rows.push({ label: "Range", tex: info.range });
      }
      return rows;
    },

    likes: [
      {
        title: "A diary of the temperature",
        text: "Write down the temperature at every moment of a day and you have one reading for each time: a function of time. Its graph can rise and fall as it likes, but it can never show two temperatures at the same moment.",
      },
      {
        title: "A shadow on the floor",
        text: "Hold a bent wire under a lamp and its shadow on the floor shows how far it reaches from side to side, whatever its wiggles. The domain of a graph is that shadow on the $x$-axis, and the range is its shadow on a wall, the $y$-axis.",
      },
    ],

    uses: [
      {
        title: "A heart monitor trace",
        text: "A heart monitor plots the voltage across the chest against time, one reading for each instant, so the trace is the graph of a function of time and passes the vertical line test. A nurse reads the height at a moment straight off it, and the time between peaks gives the heart rate: peaks 0.8 seconds apart are $60 \\div 0.8 = 75$ beats a minute.",
        tags: ["health"],
        image: {
          src: heartTraceTimeImage,
          caption: "A heart trace has one voltage at each instant; peaks 0.8 s apart mean 60 ÷ 0.8 = 75 beats a minute.",
          alt: "A heart monitor trace on a grid with sharp peaks, a gold vertical line crossing it once, and a bracket marking 0.8 s between two peaks above the text 75 beats a minute.",
        },
      },
      {
        title: "Reading a tide chart",
        text: "A tide chart graphs the water's height against the time of day. To know whether a boat will clear a sandbar at 3 pm, a skipper runs up from 3 pm to the curve and across to the height scale: one time, one height, because the height is a function of time.",
        tags: ["navigation", "nature"],
        image: {
          src: tideChartReadingImage,
          caption: "A tide chart is the graph of height against time: running up from 3 pm to the curve and across reads a height of 3.2 m.",
          alt: "A smooth tide curve over a day from midnight to midnight, with a gold dashed line up from 3 pm to the curve and across to 3.2 m on the height axis.",
        },
      },
    ],
  };
});
