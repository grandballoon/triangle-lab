// Quadratic inequalities. Whether x² + bx + c is positive or negative at x
// is whether the parabola is above or below the axis there, and it can only
// change sides at a root. An upward parabola is negative strictly between
// its two roots and positive outside them; a sign chart of the factors gives
// the same answer without a graph; and with no real roots the expression
// keeps one sign for every x.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { plot, onStage, texQuadratic, type Graph } from "../kit/algebra.ts";
import { texShiftSquared } from "../kit/coordinates.ts";
import { endpoint, num, numberLine, shade, type NumberLine } from "../kit/inequalities.ts";
import { lesson, type Readout } from "../scene.ts";
import ballAboveFifteenImage from "../../images/ball-above-fifteen.svg";
import stoppingWithinFortyImage from "../../images/stopping-within-forty.svg";

const GOLD = C.gold;
const ABOVE = C.green;
const BELOW = C.red;
const GRAPH: Graph = { origin: { x: 0, y: 0.4 }, unit: { x: 1, y: 2 } };
const AXIS: NumberLine = { y: 0.4, from: -7, to: 7, unit: 1 };
const SIGNS = ["< 0", "> 0", "≤ 0", "≥ 0"] as const;
type Sign = (typeof SIGNS)[number];

/** The solution set of (x − h)² + k compared with 0, as runs [lo, hi] with closed ends or not. */
function solutions(h: number, k: number, sign: Sign): { lo: number; hi: number; closed: boolean }[] {
  const strict = sign === "< 0" || sign === "> 0";
  const below = sign === "< 0" || sign === "≤ 0";
  if (k > 0) return below ? [] : [{ lo: -Infinity, hi: Infinity, closed: false }];
  if (k === 0) {
    if (below) return strict ? [] : [{ lo: h, hi: h, closed: true }];
    return strict ? [{ lo: -Infinity, hi: h, closed: false }, { lo: h, hi: Infinity, closed: false }] : [{ lo: -Infinity, hi: Infinity, closed: false }];
  }
  const r = Math.sqrt(-k);
  if (below) return [{ lo: h - r, hi: h + r, closed: !strict }];
  return [{ lo: -Infinity, hi: h - r, closed: !strict }, { lo: h + r, hi: Infinity, closed: !strict }];
}

/** The solution set in LaTeX. */
function texSet(h: number, k: number, sign: Sign): string {
  const runs = solutions(h, k, sign);
  if (runs.length === 0) return "\\text{no } x";
  const r = (v: number): string => fmt(v, 2);
  const parts = runs.map(({ lo, hi, closed }) => {
    const lt = closed ? "\\le" : "<";
    const gt = closed ? "\\ge" : ">";
    if (lo === -Infinity && hi === Infinity) return "\\text{every } x";
    if (lo === hi) return `x = ${r(lo)}`;
    if (lo === -Infinity) return `x ${lt} ${r(hi)}`;
    if (hi === Infinity) return `x ${gt} ${r(lo)}`;
    return `${r(lo)} ${lt} x ${lt} ${r(hi)}`;
  });
  return parts.join(" \\text{ or } ");
}

export default lesson((s) => {
  const sign = s.choice("Solve", SIGNS);
  const h = s.slider({ label: "h =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -3, max: 3, value: 1, step: 0.5, format: (v) => num(v) });
  const k = s.slider({ label: "k =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -4, max: 2, value: -4, step: 0.25, format: (v) => num(v, 2) });

  return {
    steps: [
      {
        title: "Above the axis or below",
        text: "The parabola $y = (x - h)^2 + k$ starts as $y = x^2 - 2x - 3$. Where it is above the $x$-axis the expression is positive; where it is below, negative. So solving $x^2 - 2x - 3 < 0$ means finding the $x$ where the curve is under the axis, and it can only cross from one side to the other at a root.",
      },
      {
        title: "Between the roots",
        text: "$x^2 - 2x - 3 = (x + 1)(x - 3)$ has roots $-1$ and $3$. An upward parabola dips below the axis only between its roots, so $x^2 - 2x - 3 < 0$ exactly when $-1 < x < 3$, and $x^2 - 2x - 3 > 0$ when $x < -1$ or $x > 3$. With $\\le$ or $\\ge$ the roots themselves are kept. Switch the sign to see each.",
      },
      {
        title: "A sign chart",
        text: "The same answer without a graph: a product of two factors is negative when exactly one of them is. Left of $-1$, both $x + 1$ and $x - 3$ are negative; between the roots only $x - 3$ is; right of $3$, neither is. So the signs of $(x + 1)(x - 3)$ run $+, -, +$.",
      },
      {
        title: "No roots, one sign",
        text: "Raise the vertex with $k$. When the parabola misses the axis it stays on one side, so $x^2 - 2x + 5 = (x - 1)^2 + 4$ is positive for every $x$: $x^2 - 2x + 5 > 0$ always holds and $x^2 - 2x + 5 < 0$ never does. At $k = 0$ it only touches the axis, and $(x - 1)^2 \\le 0$ holds at $x = 1$ alone.",
      },
    ],

    draw(g, f) {
      const [H, K, S] = [h.value, k.value, sign.value];
      const fn = (x: number): number => (x - H) ** 2 + K;
      const roots = K < 0 ? [H - Math.sqrt(-K), H + Math.sqrt(-K)] : K === 0 ? [H] : [];
      const chart = f.step === 2;
      const curve = chart ? 0.25 : 1;

      numberLine(g, AXIS, { every: 1 });
      // The curve, green above the axis and red below.
      if (K < 0) {
        plot(g, GRAPH, fn, { color: ABOVE, width: 3, alpha: curve, to: roots[0] });
        plot(g, GRAPH, fn, { color: BELOW, width: 3, alpha: curve, from: roots[0], to: roots[1] });
        plot(g, GRAPH, fn, { color: ABOVE, width: 3, alpha: curve, from: roots[1] });
      } else plot(g, GRAPH, fn, { color: ABOVE, width: 3, alpha: curve });
      g.point(onStage(GRAPH, { x: H, y: K }), { color: C.ink, r: 4, alpha: curve });

      if (f.step >= 1) {
        const t = f.step === 1 ? f.at(1) : 1;
        for (const run of solutions(H, K, S)) {
          if (run.lo === run.hi) {
            endpoint(g, AXIS, run.lo, true, GOLD, t);
            continue;
          }
          shade(g, AXIS, run.lo, run.hi, GOLD, t);
          if (Number.isFinite(run.lo)) endpoint(g, AXIS, run.lo, run.closed, GOLD, t);
          if (Number.isFinite(run.hi)) endpoint(g, AXIS, run.hi, run.closed, GOLD, t);
        }
        g.label({ x: -7.6, y: 4.4 }, `(x − ${num(H)})² + ${num(K, 2)} ${S}`.replace("− −", "+ ").replace("+ −", "− "), { color: C.ink, size: 18, bold: true, align: "left" });
      }
      for (const r of roots) g.label({ x: r, y: AXIS.y }, num(r, 2), { color: C.ink, size: 13, bold: true, dy: 16 });

      if (chart) {
        // Rows of signs: each factor, then their product.
        const t = f.at(2);
        const edges = [-7.4, ...roots, 7.4];
        const rows: { name: string; at: (x: number) => number }[] =
          roots.length === 2
            ? [
                { name: `x − ${num(roots[0], 2)}`.replace("− −", "+ "), at: (x) => x - roots[0] },
                { name: `x − ${num(roots[1], 2)}`.replace("− −", "+ "), at: (x) => x - roots[1] },
                { name: "product", at: fn },
              ]
            : [{ name: roots.length ? `(x − ${num(H)})²`.replace("− −", "+ ") : "(x − h)² + k", at: fn }];
        rows.forEach((row, i) => {
          const y = 3.6 - i * 0.9;
          g.label({ x: -7.6, y }, row.name, { color: i === rows.length - 1 ? GOLD : C.ink, size: 14, bold: true, align: "left", alpha: t });
          for (let j = 0; j + 1 < edges.length; j++) {
            const mid = (Math.max(edges[j], -4.2) + edges[j + 1]) / 2;
            if (edges[j + 1] <= -4.2) continue;
            const v = row.at((edges[j] + edges[j + 1]) / 2);
            g.label({ x: mid, y }, v > 0 ? "+" : "−", { color: v > 0 ? ABOVE : BELOW, size: 22, bold: true, alpha: t });
          }
        });
        for (const r of roots) g.segment({ x: r, y: AXIS.y }, { x: r, y: 4.1 }, { color: C.dim, width: 1, dash: [4, 4], alpha: t });
      }
    },

    readout(f) {
      const [H, K, S] = [h.value, k.value, sign.value];
      const rows: Readout[] = [
        { label: "Vertex form", tex: `y = ${texShiftSquared("x", H)}${K === 0 ? "" : K > 0 ? ` + ${fmt(K, 2)}` : ` - ${fmt(-K, 2)}`}` },
        { label: "Multiplied out", tex: `y = ${texQuadratic(1, -2 * H, H * H + K)}` },
      ];
      if (K < 0) {
        const r = Math.sqrt(-K);
        const fac = (v: number): string => (Math.abs(v) < 1e-9 ? "x" : `(x ${v > 0 ? "-" : "+"} ${fmt(Math.abs(v), 2)})`);
        rows.push({ label: "Roots", tex: `y = ${fac(H - r)}${fac(H + r)}` });
      } else {
        rows.push({ label: K === 0 ? "One double root" : "No real roots", tex: K === 0 ? `x = ${fmt(H)}` : `y \\ge ${fmt(K, 2)} > 0`, tone: "dim" });
      }
      if (f.step >= 1) rows.push({ label: `Solution of y ${S}`, tex: texSet(H, K, S), tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "A road over hills and dips",
        text: "A road that runs over a hill and down into a valley is above sea level until it crosses that level, and below it until it crosses back. To know which stretches are under water you only need the crossing points, and which side the road is on between them.",
      },
      {
        title: "Two switches in a row",
        text: "Each factor is like a switch that is either up or down, flipping at its own root. Their product is negative when exactly one is down. Walking along the line past each root flips one switch, so the sign of the product changes at every crossing.",
      },
    ],

    uses: [
      {
        title: "How long a ball stays high",
        text: "A ball thrown straight up at 20 m/s is $h = 20t - 5t^2$ metres up after $t$ seconds. It is above 15 m when $20t - 5t^2 > 15$, that is $t^2 - 4t + 3 < 0$, or $(t - 1)(t - 3) < 0$. That holds between the roots: from 1 second to 3 seconds.",
        tags: ["sport"],
        image: {
          src: ballAboveFifteenImage,
          caption: "A ball thrown up at 20 m/s is above 15 m when (t − 1)(t − 3) < 0, between 1 and 3 seconds.",
          alt: "The height of a thrown ball plotted against time as a parabola, with a dashed line at 15 m and the arc above it in gold between t = 1 and t = 3.",
        },
      },
      {
        title: "Fast enough to stop in time",
        text: "Take a driver who reacts in 1 second and a car that brakes at 10 m/s². At $v$ m/s it covers $v$ metres before braking and $\\frac{v^2}{20}$ while braking. To stop within 40 m, $v + \\frac{v^2}{20} \\le 40$, which is $v^2 + 20v - 800 \\le 0$, or $(v + 40)(v - 20) \\le 0$. Speeds are positive, so $v \\le 20$ m/s, which is 72 km/h.",
        tags: ["travel"],
        image: {
          src: stoppingWithinFortyImage,
          caption: "Reaction distance v plus braking distance v²/20 is at most 40 m when (v + 40)(v − 20) ≤ 0: up to 20 m/s, or 72 km/h.",
          alt: "A car on a road with a 40 m mark ahead, split into a reaction stretch of 20 m and a braking stretch of 20 m, with v ≤ 20 m/s in gold.",
        },
      },
    ],
  };
});
