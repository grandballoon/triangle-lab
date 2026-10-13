// The equation of a line. Starting from the y-intercept (0, b) and climbing m
// for every unit across gives y = mx + b; setting one variable to zero finds
// the intercepts; clearing fractions gives the standard form Ax + By = C; and
// any two points of the line recover the same m and b.

import { C } from "../draw.ts";
import { clamp, fmt, type Vec } from "../geo.ts";
import {
  clipLine,
  lattice,
  num,
  pair,
  par,
  plane,
  riseRun,
  settle,
  texRatio,
  texSum,
} from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const INTERCEPT = C.cyan;
const SECOND = C.gold;
/** Q keeps at least this far from P in x, so the two always give a slope. */
const GAP = 1;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** `y = \tfrac12 x + 1` from a whole-number rise, run and intercept. */
function slopeInterceptTex(rise: number, run: number, b: number): string {
  if (rise === 0) return `y = ${fmt(b)}`;
  const m = texRatio(rise, run);
  const mx = m === "1" ? "x" : m === "-1" ? "-x" : `${m}x`;
  return b === 0 ? `y = ${mx}` : `y = ${mx} ${b < 0 ? "-" : "+"} ${fmt(Math.abs(b))}`;
}

/** The same for a canvas label: "y = (1/2)x + 1". */
function slopeInterceptText(rise: number, run: number, b: number): string {
  if (rise === 0) return `y = ${num(b)}`;
  const k = gcd(Math.abs(rise), Math.abs(run));
  const top = Math.abs(rise) / k;
  const bottom = Math.abs(run) / k;
  const sign = rise * run < 0 ? "−" : "";
  const m = bottom === 1 ? (top === 1 ? sign : `${sign}${top}`) : `${sign}(${top}/${bottom})`;
  return b === 0 ? `y = ${m}x` : `y = ${m}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
}

/** Whole numbers A, B, C with Ax + By = C, no common factor, and A ≥ 0. */
function standardForm(rise: number, run: number, b: number): { A: number; B: number; C: number } {
  // rise·x − run·y = −run·b holds at (0, b) and at (run, b + rise).
  const k = gcd(gcd(Math.abs(rise), Math.abs(run)), Math.abs(run * b));
  const flip = rise < 0 || (rise === 0 && run > 0) ? -1 : 1;
  // Adding 0 turns a −0 into 0.
  return { A: (flip * rise) / k + 0, B: (-flip * run) / k + 0, C: (-flip * run * b) / k + 0 };
}

export default lesson((s) => {
  const Y0 = s.point(0, 1, {
    label: "b",
    color: INTERCEPT,
    constrain: (p) => ({ x: 0, y: clamp(Math.round(p.y), -4, 4) }),
  });
  // P stays off the y-axis, so the line is never vertical.
  const P = s.point(4, 3, {
    label: "P",
    constrain: (p) => {
      const q = lattice(p);
      return q.x === 0 ? { x: p.x < 0 ? -1 : 1, y: q.y } : q;
    },
  });
  const slope = (): number => (P.y - Y0.y) / P.x;
  const Q = s.point(-4, -1, {
    label: "Q",
    color: SECOND,
    constrain: (p): Vec => {
      const ends = clipLine(Y0, P);
      if (!ends) return p;
      let x = clamp(p.x, Math.min(ends[0].x, ends[1].x), Math.max(ends[0].x, ends[1].x));
      // The side of P nearer the y-axis is always on the visible line.
      if (Math.abs(x - P.x) < GAP) x = P.x + (P.x > 0 ? -GAP : GAP);
      return { x, y: slope() * x + Y0.y };
    },
  });

  return {
    steps: [
      {
        title: "Start at b, climb at m",
        text: "Drag the intercept $b$ up and down and move $P$. From $(0, b)$, every step of $1$ to the right lifts the line by the slope $m$, so after $x$ steps the height is $y = mx + b$.",
      },
      {
        title: "Where it crosses the axes",
        text: "On the $y$-axis $x = 0$, which leaves $y = b$: the $y$-intercept. On the $x$-axis $y = 0$, so solve $0 = mx + b$ for the $x$-intercept. A horizontal line never reaches the $x$-axis.",
      },
      {
        title: "Standard form",
        text: "Multiply through by the slope's denominator and gather $x$ and $y$ on one side. The same line reads $Ax + By = C$ with whole numbers, $A \\ge 0$. Its slope is $-A/B$.",
      },
      {
        title: "Through two given points",
        text: "Slide $Q$ along the line. Any two points give the equation: their rise over run is $m$, and putting one of them into $y = mx + b$ gives $b = y - mx$. Both come out the same every time.",
      },
    ],

    draw(g, f) {
      settle(Q);
      Q.hidden = f.step < 3;
      Q.enabled = f.step >= 3;
      const rise = P.y - Y0.y;
      const run = P.x;

      plane(g);
      g.line(Y0, P, { color: g.accent });
      riseRun(g, Y0, P, { alpha: 1 - f.at(3) });
      g.label({ x: -7.7, y: 4.5 }, slopeInterceptText(rise, run, Y0.y), {
        color: g.accent,
        size: 20,
        bold: true,
        align: "left",
      });

      if (f.at(1) > 0) {
        g.label(Y0, pair(Y0), { color: INTERCEPT, dx: -18, dy: -18, align: "right", alpha: f.at(1) });
        if (rise !== 0) {
          const crossing = { x: (-Y0.y * run) / rise, y: 0 };
          if (Math.abs(crossing.x) <= 7.6) {
            g.point(crossing, { color: INTERCEPT, r: 6, alpha: f.at(1) });
            g.label(crossing, pair(crossing, 2), { color: INTERCEPT, dx: 14, dy: -30, align: "left", alpha: f.at(1) });
          }
        }
      }
      if (f.at(2) > 0) {
        const { A, B, C: c } = standardForm(rise, run, Y0.y);
        // With A = 0 the form reduces to y = C; B is never 0.
        const size = Math.abs(B) === 1 ? "" : String(Math.abs(B));
        const xs = A === 0 ? "" : `${A === 1 ? "" : A}x ${B < 0 ? "−" : "+"} `;
        const text = `${xs}${size}y = ${num(c)}`;
        g.label({ x: -7.7, y: 3.9 }, text, { color: C.ink, size: 16, align: "left", alpha: f.at(2) });
      }
      if (f.at(3) > 0) riseRun(g, P, Q, { alpha: f.at(3) });
    },

    readout(f) {
      const b = Y0.y;
      const rise = P.y - b;
      const run = P.x;
      const { A, B, C: c } = standardForm(rise, run, b);
      const slopeRow: Readout = {
        label: "Slope",
        tex: `m = \\frac{${fmt(P.y)} - ${par(b)}}{${fmt(P.x)} - 0} = ${texRatio(rise, run)}`,
      };
      const equation: Readout = { label: "Slope–intercept form", tex: slopeInterceptTex(rise, run, b) };
      const standard: Readout = {
        label: "Standard form",
        tex: `${texSum([[A, "x"], [B, "y"]], 0)} = ${c}`,
      };
      if (f.step === 0) return [slopeRow, equation];
      if (f.step < 3) {
        const rows: Readout[] = [
          slopeRow,
          equation,
          { label: "y-intercept", tex: `x = 0:\\quad y = ${fmt(b)}` },
          rise === 0
            ? {
                label: "x-intercept",
                tex: b === 0 ? "\\text{the line is the } x\\text{-axis}" : "\\text{none: the line is horizontal}",
                tone: "dim",
              }
            : { label: "x-intercept", tex: `y = 0:\\quad x = -\\frac{b}{m} = ${texRatio(-b * run, rise)}` },
        ];
        return f.step === 2 ? [...rows, standard] : rows;
      }
      const m = (Q.y - P.y) / (Q.x - P.x);
      return [
        equation,
        standard,
        {
          label: "Slope from P and Q",
          tex: `\\frac{${fmt(Q.y, 2)} - ${par(P.y)}}{${fmt(Q.x, 2)} - ${par(P.x)}} = ${fmt(m, 2)}`,
          tone: "good",
        },
        {
          label: "Intercept from P",
          tex: `y - mx = ${fmt(P.y)} - (${fmt(m, 2)})(${fmt(P.x)}) = ${fmt(P.y - m * P.x, 2)}`,
          tone: "good",
        },
      ];
    },
  };
});
