// The trivial inequality. The square of any real number is at least 0, and
// is 0 only for 0 itself. So a sum of squares is 0 only when each square is;
// (a − b)² ≥ 0 multiplies out to a² + b² ≥ 2ab; and completing the square
// writes a quadratic as a square plus a constant, which is its least value.

import { C, tint } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { plot, onStage, texQuadratic, type Graph } from "../kit/algebra.ts";
import { texShiftSquared } from "../kit/coordinates.ts";
import { num } from "../kit/inequalities.ts";
import { lesson, type Readout } from "../scene.ts";
import squaredErrorsCancelImage from "../../images/squared-errors-cancel.svg";
import fuelCheapestSpeedImage from "../../images/fuel-cheapest-speed.svg";

const SA = C.cyan;
const SB = C.pink;
const AB = C.violet;
const GOLD = C.gold;
const GRAPH: Graph = { origin: { x: 0, y: -0.8 }, unit: { x: 1, y: 2.5 } };
/** Bars: value v ends at stage x = ZERO + v · BAR. */
const ZERO = -4;
const BAR = 0.45;
const bx = (v: number): number => clamp(ZERO + v * BAR, -7.8, 7.6);

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -3.5, max: 3.5, value: 3, step: 0.5, format: (v) => num(v) });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -3.5, max: 3.5, value: 2, step: 0.5, format: (v) => num(v) });

  return {
    steps: [
      {
        title: "Squares are never negative",
        text: "For every real number $x$, $x^2 \\ge 0$: a positive times a positive is positive, a negative times a negative is positive too, and $0^2 = 0$. Equality holds only when $x = 0$. This is the trivial inequality. Slide $a$ along the graph of $y = x^2$: the point never goes below the axis.",
      },
      {
        title: "A sum of squares",
        text: "Squares cannot cancel each other, since none is negative. So $a^2 + b^2 \\ge 0$, and $a^2 + b^2 = 0$ only when $a = 0$ and $b = 0$. That solves equations no other way could: $(x - 1)^2 + (y + 2)^2 = 0$ forces $x = 1$ and $y = -2$.",
      },
      {
        title: "Squaring a difference",
        text: "Apply it to $a - b$: $(a - b)^2 \\ge 0$ multiplies out to $a^2 - 2ab + b^2 \\ge 0$, so $a^2 + b^2 \\ge 2ab$ for any real $a$ and $b$. The gap between the two sides is exactly $(a - b)^2$, so they are equal only when $a = b$. With $3$ and $2$: $13 \\ge 12$, a gap of $1$.",
      },
      {
        title: "The least value of a quadratic",
        text: "Completing the square writes $x^2 - 6x + 11$ as $(x - 3)^2 + 2$. The square is at least $0$, so the whole is at least $2$, reached only at $x = 3$: the vertex. Here the curve is $y = (x - a)^2 + b$, whose least value is $b$ at $x = a$.",
      },
    ],

    draw(g, f) {
      const [A, B] = [a.value, b.value];

      if (f.step === 0 || f.step === 3) {
        const shift = f.step === 3 ? A : 0;
        const lift = f.step === 3 ? B : 0;
        g.segment(onStage(GRAPH, { x: -7.6, y: 0 }), onStage(GRAPH, { x: 7.6, y: 0 }), { color: C.dim, width: 2 });
        g.segment({ x: 0, y: -2.8 }, { x: 0, y: 4.8 }, { color: C.dim, width: 2 });
        for (let v = -7; v <= 7; v++) if (v) g.label(onStage(GRAPH, { x: v, y: 0 }), String(v).replace("-", "−"), { color: C.dim, size: 11, dy: -14 });
        plot(g, GRAPH, (x) => (x - shift) ** 2 + lift, { color: g.accent, width: 3 });
        if (f.step === 0) {
          const p = onStage(GRAPH, { x: A, y: A * A });
          g.segment(onStage(GRAPH, { x: A, y: 0 }), p, { color: GOLD, width: 3 });
          g.point(p, { color: GOLD, r: 6 });
          g.label(p, `${num(A)}² = ${num(A * A, 2)}`, { color: GOLD, size: 16, bold: true, dx: A >= 0 ? 12 : -12, align: A >= 0 ? "left" : "right" });
          g.label({ x: 0, y: -2.4 }, A === 0 ? "x² = 0 only at x = 0" : "x² > 0", { color: C.ink, size: 15, bold: true, dx: 10, align: "left" });
        } else {
          const t = f.at(3);
          const v = onStage(GRAPH, { x: A, y: B });
          g.segment(onStage(GRAPH, { x: -7.6, y: B }), onStage(GRAPH, { x: 7.6, y: B }), { color: GOLD, width: 2, dash: [8, 6], alpha: t });
          g.point(v, { color: GOLD, r: 6 });
          g.label(v, `least value ${num(B)} at x = ${num(A)}`, { color: GOLD, size: 15, bold: true, dy: -22, alpha: t });
        }
        return;
      }

      // Bars measured from a common zero.
      const bar = (from: number, to: number, y: number, color: string, alpha = 1): void => {
        const [x0, x1] = [bx(from), bx(to)];
        if (Math.abs(x1 - x0) < 1e-6) return;
        g.polygon([{ x: x0, y: y - 0.35 }, { x: x1, y: y - 0.35 }, { x: x1, y: y + 0.35 }, { x: x0, y: y + 0.35 }], { color, fill: tint(color, 0.3), width: 2, alpha });
      };
      g.segment({ x: ZERO, y: -2.6 }, { x: ZERO, y: 4.2 }, { color: C.dim, width: 2 });
      g.label({ x: ZERO, y: -2.6 }, "0", { color: C.dim, size: 13, dy: -12 });
      const [a2, b2] = [A * A, B * B];

      if (f.step === 1) {
        bar(0, a2, 2.6, SA);
        bar(a2, a2 + b2, 2.6, SB);
        g.label({ x: ZERO, y: 3.3 }, `a² + b² = ${num(a2, 2)} + ${num(b2, 2)} = ${num(a2 + b2, 2)}`, { color: C.ink, size: 16, bold: true, align: "left", dy: 4 });
        const zero = a2 + b2 === 0;
        g.label({ x: 0, y: 0.6 }, zero ? "a = b = 0: the only way to get 0" : "≥ 0, and 0 only if a = b = 0", { color: zero ? GOLD : C.dim, size: 15, bold: true, alpha: f.at(1) });
        return;
      }

      // Step 2: a² + b² against 2ab, the gap (a − b)².
      const t = f.at(2);
      bar(0, a2, 2.6, SA);
      bar(a2, a2 + b2, 2.6, SB);
      bar(0, 2 * A * B, 0.4, AB);
      bar(2 * A * B, a2 + b2, 0.4, GOLD, t);
      g.label({ x: ZERO, y: 3.3 }, `a² + b² = ${num(a2 + b2, 2)}`, { color: C.ink, size: 16, bold: true, align: "left", dy: 4 });
      g.label({ x: ZERO, y: 1.1 }, `2ab = ${num(2 * A * B, 2)}`, { color: AB, size: 16, bold: true, align: "left", dy: 4 });
      const gap = (A - B) ** 2;
      g.label({ x: 0, y: -1.2 }, `gap (a − b)² = ${num(gap, 2)}${gap === 0 ? ": equal" : ""}`, { color: GOLD, size: 16, bold: true, alpha: t });
    },

    readout(f) {
      const [A, B] = [a.value, b.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Trivial inequality", tex: `${fmt(A)}^2 = ${fmt(A * A, 2)} ${A === 0 ? "= 0" : "> 0"}`, tone: "good" });
      } else if (f.step === 1) {
        const total = A * A + B * B;
        rows.push({ label: "Sum of squares", tex: `a^2 + b^2 = ${fmt(total, 2)} ${total === 0 ? "= 0" : "> 0"}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Expand", tex: `(a - b)^2 = a^2 - 2ab + b^2 = ${fmt((A - B) ** 2, 2)} \\ge 0` });
        rows.push({ label: A === B ? "Equal, since a = b" : "So", tex: `a^2 + b^2 = ${fmt(A * A + B * B, 2)} \\ge ${fmt(2 * A * B, 2)} = 2ab`, tone: "good" });
      } else {
        const sq = texShiftSquared("x", A);
        rows.push({ label: "Multiplied out", tex: `y = ${texQuadratic(1, -2 * A, A * A + B)}` });
        rows.push({ label: "Completed square", tex: `y = ${sq} ${B < 0 ? "-" : "+"} ${fmt(Math.abs(B))} \\ge ${fmt(B)}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Debts cannot hide in a square",
        text: "Add up gains and losses and a loss can cancel a gain, leaving 0. Square each one first and every entry becomes a gain, so the total is 0 only if every entry was 0. Squares keep track of size and throw away direction.",
      },
      {
        title: "The bottom of a bowl",
        text: "A marble dropped into a round bowl rolls to the lowest point and stays there. Writing a quadratic as $(x - a)^2 + b$ is finding the bottom of its bowl: $b$ is the lowest height, at $x = a$, because the square can only add to it.",
      },
    ],

    uses: [
      {
        title: "Why errors are squared",
        text: "Two measurements that are 2 too high and 2 too low have errors adding to $2 + (-2) = 0$, as if both were right. Their squares add to $4 + 4 = 8$. A sum of squared errors is $0$ only when every error is $0$, which is why fitting a line or model to data makes the sum of squares as small as it can.",
        tags: ["computing"],
        image: {
          src: squaredErrorsCancelImage,
          caption: "Errors of +2 and −2 add to 0 and hide both mistakes; their squares add to 4 + 4 = 8.",
          alt: "Two data points above and below a line by 2, with the sums 2 + (−2) = 0 and 2² + (−2)² = 8, the squares drawn as boxes on the gaps and the 8 in gold.",
        },
      },
      {
        title: "The cheapest speed",
        text: "Suppose a car's fuel use at $v$ km/h is $0.002v^2 - 0.32v + 18.8$ litres per 100 km. Completing the square gives $0.002(v - 80)^2 + 6$, which is at least 6, and equals 6 only at 80 km/h. Driving at 50 or at 110 km/h both cost $0.002 \\cdot 900 + 6 = 7.8$ litres.",
        tags: ["travel"],
        image: {
          src: fuelCheapestSpeedImage,
          caption: "Fuel use 0.002(v − 80)² + 6 litres per 100 km is least, 6 litres, at 80 km/h.",
          alt: "A bowl-shaped curve of fuel use against speed from 40 to 120 km/h, its lowest point in gold at 80 km/h and 6 litres, with 7.8 marked at 50 and 110.",
        },
      },
    ],
  };
});
