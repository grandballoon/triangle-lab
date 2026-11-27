// Absolute value inequalities. |x − a| is the distance between x and a on the
// number line, so |x − a| < b asks for the numbers less than b from a, an
// interval centred on a, and |x − a| > b for those farther away, two rays.
// On the graph, the V of y = |x − a| dips under the line y = b exactly over
// that interval. Any |mx − n| ≤ b is first divided through to a distance.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { plot, onStage, type Graph } from "../kit/algebra.ts";
import { endpoint, num, numberLine, onLine, shade, type NumberLine } from "../kit/inequalities.ts";
import { lesson, type Readout } from "../scene.ts";
import shaftToleranceGaugeImage from "../../images/shaft-tolerance-gauge.svg";
import thermostatDeadbandImage from "../../images/thermostat-deadband.svg";

const A = C.cyan;
const X = C.pink;
const B = C.violet;
const GOLD = C.gold;
const GRAPH: Graph = { origin: { x: 0, y: -1.6 }, unit: { x: 1, y: 1 } };
const AXIS: NumberLine = { y: -1.6, from: -7, to: 7, unit: 1 };

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -4, max: 4, value: 3, step: 0.5, format: (v) => num(v) });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 5, value: 2, step: 0.5, format: (v) => num(v) });
  const x = s.point(0, AXIS.y, { label: "x", color: X, constrain: (p) => ({ x: clamp(Math.round(p.x * 2) / 2, -7, 7), y: AXIS.y }) });

  return {
    steps: [
      {
        title: "Absolute value is distance",
        text: "$|x|$ is the distance from $x$ to $0$, so $|x - a|$ is the distance between $x$ and $a$ on the number line. Drag $x$: both $|5 - 3|$ and $|1 - 3|$ are $2$, one on each side of $3$. The graph of $y = |x - a|$ is a V with its point at $a$.",
      },
      {
        title: "Closer than b",
        text: "$|x - a| < b$ says $x$ is less than $b$ away from $a$, so it lies between $a - b$ and $a + b$: the inequality is the same as $-b < x - a < b$. For example $|x - 3| < 2$ exactly when $1 < x < 5$. On the graph, the V is under the line $y = b$ there. If $b \\le 0$ there are no solutions.",
      },
      {
        title: "Farther than b",
        text: "$|x - a| > b$ says $x$ is more than $b$ away from $a$, on one side or the other: $x < a - b$ or $x > a + b$. Its solutions are two rays pointing apart. For example $|x - 3| \\ge 2$ when $x \\le 1$ or $x \\ge 5$, with the ends kept because of the $\\ge$.",
      },
      {
        title: "Make it a distance first",
        text: "To solve $|2x - 6| \\le 4$, write it as $2|x - 3| \\le 4$ and divide by $2$: $|x - 3| \\le 2$, so $1 \\le x \\le 5$. Or unpack it directly: $-4 \\le 2x - 6 \\le 4$, add 6 to get $2 \\le 2x \\le 10$, and halve: $1 \\le x \\le 5$.",
      },
    ],

    draw(g, f) {
      const [Av, Bv, xv] = [a.value, b.value, Math.round(x.x * 2) / 2];
      const d = Math.abs(xv - Av);
      numberLine(g, AXIS, { every: 1 });
      plot(g, GRAPH, (t) => Math.abs(t - Av), { color: A, width: 2.5, alpha: f.step === 0 ? 0.35 + 0.65 * f.at(0) : 1 });

      if (f.step >= 1) {
        const t = f.step === 1 || f.step === 2 ? f.at(f.step) : 1;
        const closed = f.step === 3;
        const lo = Av - Bv;
        const hi = Av + Bv;
        g.segment(onStage(GRAPH, { x: -7.4, y: Bv }), onStage(GRAPH, { x: 7.4, y: Bv }), { color: B, width: 2, dash: [8, 6] });
        g.label(onStage(GRAPH, { x: 7.4, y: Bv }), `y = ${num(Bv)}`, { color: B, size: 14, bold: true, dy: 14, align: "right" });
        if (f.step === 2) {
          shade(g, AXIS, -Infinity, lo, GOLD, t);
          shade(g, AXIS, hi, Infinity, GOLD, t);
          // The arms of the V above the line.
          plot(g, GRAPH, (u) => Math.abs(u - Av), { color: GOLD, width: 4, to: lo, alpha: t });
          plot(g, GRAPH, (u) => Math.abs(u - Av), { color: GOLD, width: 4, from: hi, alpha: t });
        } else if (Bv > 0) {
          shade(g, AXIS, lo, hi, GOLD, t);
          plot(g, GRAPH, (u) => Math.abs(u - Av), { color: GOLD, width: 4, from: lo, to: hi, alpha: t });
        }
        if (Bv > 0 || f.step === 2) {
          endpoint(g, AXIS, lo, closed, GOLD, t);
          endpoint(g, AXIS, hi, closed, GOLD, t);
          g.label(onLine(AXIS, lo), num(lo), { color: GOLD, size: 14, bold: true, dy: 18, alpha: t });
          g.label(onLine(AXIS, hi), num(hi), { color: GOLD, size: 14, bold: true, dy: 18, alpha: t });
        }
        const rel = f.step === 1 ? "<" : f.step === 2 ? ">" : "≤";
        const text = f.step === 3 ? `|2x − ${num(2 * Av)}| ≤ ${num(2 * Bv)}`.replace("− −", "+ ") : `|x − ${num(Av)}| ${rel} ${num(Bv)}`.replace("− −", "+ ");
        g.label({ x: -7.6, y: 4.4 }, text, { color: C.ink, size: 18, bold: true, align: "left" });
        if (f.step === 3) g.label({ x: -7.6, y: 3.6 }, `|x − ${num(Av)}| ≤ ${num(Bv)}`.replace("− −", "+ "), { color: GOLD, size: 16, bold: true, align: "left", alpha: f.at(3) });
      }

      // The point a, the dragged x, and the distance between them.
      g.point(onLine(AXIS, Av), { color: A, r: 6 });
      g.label(onLine(AXIS, Av), "a", { color: A, size: 15, bold: true, dy: -34 });
      const top = onStage(GRAPH, { x: xv, y: d });
      g.segment(onLine(AXIS, xv), top, { color: X, width: 1.5, dash: [4, 4] });
      g.point(top, { color: X, r: 5 });
      if (d > 0) {
        const y = AXIS.y - 0.95;
        g.arrow({ x: (Av + xv) / 2, y }, { x: xv, y }, { color: X, width: 2 });
        g.arrow({ x: (Av + xv) / 2, y }, { x: Av, y }, { color: X, width: 2 });
        g.label({ x: (Av + xv) / 2, y }, num(d), { color: X, size: 14, bold: true, dy: -16 });
      }
    },

    readout(f) {
      const [Av, Bv, xv] = [a.value, b.value, Math.round(x.x * 2) / 2];
      const d = Math.abs(xv - Av);
      const minus = (v: number): string => (v < 0 ? `+ ${fmt(-v)}` : `- ${fmt(v)}`);
      const rows: Readout[] = [{ label: "Distance from x to a", tex: `|${fmt(xv)} ${minus(Av)}| = ${fmt(d)}` }];
      if (f.step === 1) {
        rows.push({ label: "Same as", tex: `|x ${minus(Av)}| < ${fmt(Bv)} \\iff ${fmt(Av - Bv)} < x < ${fmt(Av + Bv)}`, tone: Bv > 0 ? "good" : "warn" });
        rows.push({ label: d < Bv ? "x is a solution" : "x is not a solution", tex: `${fmt(d)} ${d < Bv ? "<" : "\\ge"} ${fmt(Bv)}`, tone: d < Bv ? "good" : "warn" });
      } else if (f.step === 2) {
        rows.push({ label: "Same as", tex: `x < ${fmt(Av - Bv)} \\text{ or } x > ${fmt(Av + Bv)}`, tone: "good" });
        rows.push({ label: d > Bv ? "x is a solution" : "x is not a solution", tex: `${fmt(d)} ${d > Bv ? ">" : "\\le"} ${fmt(Bv)}`, tone: d > Bv ? "good" : "warn" });
      } else if (f.step === 3) {
        rows.push({ label: "Unpack", tex: `-${fmt(2 * Bv)} \\le 2x ${minus(2 * Av)} \\le ${fmt(2 * Bv)}` });
        rows.push({ label: "Solve", tex: `${fmt(Av - Bv)} \\le x \\le ${fmt(Av + Bv)}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Within walking distance",
        text: "\"Within 2 km of the station\" picks out a stretch of road reaching 2 km either way from it. \"More than 2 km away\" is everything else, off in both directions. Neither cares which side you are on, only how far.",
      },
      {
        title: "Guess the number",
        text: "In a guessing game where any guess within 3 of the secret number wins, a secret of 10 makes every guess from 7 to 13 a winner: $|g - 10| \\le 3$.",
      },
    ],

    uses: [
      {
        title: "Machining to a tolerance",
        text: "A shaft drawn as 25 mm with a tolerance of 0.05 mm passes inspection when $|d - 25| \\le 0.05$. That is $24.95 \\le d \\le 25.05$, so a gauge with a go end and a no-go end at those sizes checks it in one push.",
        tags: ["machines", "trade-tricks"],
        image: {
          src: shaftToleranceGaugeImage,
          caption: "A 25 mm shaft with a 0.05 mm tolerance passes when |d − 25| ≤ 0.05, that is from 24.95 to 25.05 mm.",
          alt: "A steel shaft beside a number line from 24.90 to 25.10 with a gold band from 24.95 to 25.05 around a centre mark at 25, and the line |d − 25| ≤ 0.05.",
        },
      },
      {
        title: "A thermostat that rests",
        text: "Set to 20 °C with a margin of 1 degree, a heat pump does nothing while $|T - 20| \\le 1$ and runs when $|T - 20| > 1$: heating below 19 °C and cooling above 21 °C. The band keeps it from switching on and off every few seconds.",
        tags: ["home", "electrical"],
        image: {
          src: thermostatDeadbandImage,
          caption: "A thermostat set to 20 °C with a margin of 1 degree acts when |T − 20| > 1: below 19 °C or above 21 °C.",
          alt: "A thermometer scale from 16 to 24 °C, with the band from 19 to 21 marked idle and gold arrows running down from 19 marked heat and up from 21 marked cool.",
        },
      },
    ],
  };
});
