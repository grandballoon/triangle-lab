// Infinite geometric series. Shade half a square, then half of what is left,
// and so on: the shaded part is 1 − (1/2)ⁿ, and the piece left over shrinks
// to nothing, so 1/2 + 1/4 + 1/8 + ⋯ = 1. In general rⁿ → 0 when |r| < 1, and
// a + ar + ar² + ⋯ = a/(1 − r).

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { num } from "../kit/sequences.ts";
import { lesson, type Readout } from "../scene.ts";
import ballBounceTotalImage from "../../images/ball-bounce-total.svg";
import doseLevelSettlesImage from "../../images/dose-level-settles.svg";

const SHADE = C.cyan;
const LEFT = C.red;
const GOLD = C.gold;
const SIDE = 6;
const O: Vec = { x: -7.2, y: -2.6 };

const rect = (x0: number, y0: number, x1: number, y1: number): Vec[] => [
  { x: O.x + x0, y: O.y + y0 },
  { x: O.x + x1, y: O.y + y0 },
  { x: O.x + x1, y: O.y + y1 },
  { x: O.x + x0, y: O.y + y1 },
];

export default lesson((s) => {
  const count = s.slider({ label: "terms:", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 12, value: 4, step: 1 });
  const ratio = s.slider({ label: "r =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -0.9, max: 1.1, value: 0.5, step: 0.1, format: (v) => num(v, 1) });

  return {
    steps: [
      {
        title: "Halves of halves",
        text: "Shade half a square of area 1, then half of what is left, then half of that. After $n$ pieces the shaded area is $\\frac{1}{2} + \\frac{1}{4} + \\cdots + \\frac{1}{2^n}$, and the geometric series formula makes it $1 - \\frac{1}{2^n}$: after four pieces, $\\frac{15}{16}$.",
      },
      {
        title: "What is left",
        text: "The unshaded piece is always the last one shaded, $\\frac{1}{2^n}$, and it can be made as small as you like. The sum never passes 1, but it comes as close to 1 as you please, so we say the infinite series adds to 1: $\\frac{1}{2} + \\frac{1}{4} + \\frac{1}{8} + \\cdots = 1$.",
      },
      {
        title: "Any ratio between −1 and 1",
        text: "The first $n$ terms of $a + ar + ar^2 + \\cdots$ add to $\\frac{a(1 - r^n)}{1 - r}$. When $-1 < r < 1$, $r^n$ shrinks to 0, and the sums close in on $\\frac{a}{1 - r}$, from one side or, for negative $r$, from both in turn. When $|r| \\ge 1$ the terms do not shrink and the series has no sum.",
      },
      {
        title: "Repeating decimals",
        text: "A repeating decimal is an infinite geometric series: $0.333\\ldots = \\frac{3}{10} + \\frac{3}{100} + \\cdots = \\frac{3/10}{1 - 1/10} = \\frac{1}{3}$, and $0.999\\ldots = \\frac{9/10}{1 - 1/10} = 1$. The square shows $\\frac{1}{4} + \\frac{1}{16} + \\cdots = \\frac{1/4}{1 - 1/4} = \\frac{1}{3}$: one of every three equal squares in each L.",
      },
    ],

    draw(g, f) {
      const n = count.value;
      const r = ratio.value;
      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: 0.2, y: 3.2 - row * 0.9 }, text, { color, size: 18, bold: true, align: "left", alpha });
      };

      if (f.step <= 1) {
        g.polygon(rect(0, 0, SIDE, SIDE), { color: C.ink, width: 2 });
        let [x0, y0, x1, y1] = [0, 0, SIDE, SIDE];
        for (let k = 1; k <= n; k++) {
          let piece: Vec[];
          if (k % 2) {
            const xm = (x0 + x1) / 2;
            piece = rect(x0, y0, xm, y1);
            x0 = xm;
          } else {
            const ym = (y0 + y1) / 2;
            piece = rect(x0, ym, x1, y1);
            y1 = ym;
          }
          const alpha = f.step === 0 ? Math.min(1, f.at(0) * n - k + 1.5) : 1;
          g.polygon(piece, { color: SHADE, fill: tint(SHADE, 0.12 + 0.5 * (k % 2 ? 1 : 0.6)), width: 1.5, alpha });
          const c = { x: (piece[0].x + piece[2].x) / 2, y: (piece[0].y + piece[2].y) / 2 };
          if (k <= 5) g.label(c, `1/${2 ** k}`, { color: C.ink, size: 16 - k, bold: true, alpha });
        }
        if (f.step === 1) {
          g.polygon(rect(x0, y0, x1, y1), { color: LEFT, fill: tint(LEFT, 0.45), width: 2.5 });
          g.label({ x: O.x + SIDE, y: O.y + y0 }, `left: 1/${2 ** n}`, { color: LEFT, size: 14, bold: true, dx: 8, dy: 10, align: "left" });
        }
        note(0, `shaded: 1 − 1/${2 ** n}`, C.ink);
        note(1, `= ${num(1 - 2 ** -n, 6)}`, SHADE);
        if (f.step === 1) note(2, "sum to infinity: 1", GOLD, f.at(1));
        return;
      }

      if (f.step === 2) {
        // Partial sums against the number of terms.
        const N = Math.max(n, 2);
        const sums = Array.from({ length: N }, (_, k) => (r === 1 ? k + 1 : (1 - r ** (k + 1)) / (1 - r)));
        const converges = Math.abs(r) < 1 - 1e-9;
        const limit = 1 / (1 - r);
        const vals = [0, ...sums, ...(converges ? [limit] : [])];
        const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
        const uy = 5.6 / Math.max(hi - lo, 1);
        const ux = 12.4 / 12;
        const at = (k: number, v: number): Vec => ({ x: -6.4 + k * ux, y: -2.4 + (v - lo) * uy });
        g.segment(at(0, 0), at(12.4, 0), { color: C.dim, width: 1.5 });
        g.segment(at(0, lo), at(0, hi), { color: C.dim, width: 1.5 });
        g.label(at(0, 0), "0", { color: C.dim, size: 12, dx: -10 });
        g.label(at(12.4, 0), "terms", { color: C.dim, size: 12, dy: -14, align: "right" });
        if (converges) {
          g.segment(at(0, limit), at(12.4, limit), { color: GOLD, width: 2, dash: [6, 5] });
          g.label(at(12.4, limit), `a/(1 − r) = ${num(limit)}`, { color: GOLD, size: 14, bold: true, dy: 12, align: "right" });
        }
        sums.forEach((v, k) => {
          const alpha = Math.min(1, f.at(2) * N - k + 1.5);
          if (k > 0) g.segment(at(k, sums[k - 1]), at(k + 1, v), { color: SHADE, width: 1.5, alpha: alpha * 0.6 });
          g.point(at(k + 1, v), { color: SHADE, r: 5, alpha });
        });
        g.label({ x: -6.2, y: 4.2 }, converges ? `a = 1, r = ${num(r, 1)}: the sums close in` : `r = ${num(r, 1)}: no sum, the terms do not shrink`, { color: converges ? C.ink : C.red, size: 16, bold: true, align: "left" });
        return;
      }

      // Quarters: an L of three equal squares at each layer, one of them shaded.
      g.polygon(rect(0, 0, SIDE, SIDE), { color: C.ink, width: 2 });
      let [x0, y0, size] = [0, 0, SIDE];
      const layers = Math.min(n, 6);
      for (let k = 1; k <= layers; k++) {
        const h = size / 2;
        const alpha = Math.min(1, f.at(3) * layers - k + 1.5);
        g.polygon(rect(x0, y0, x0 + h, y0 + h), { color: GOLD, fill: tint(GOLD, 0.45), width: 1.5, alpha });
        g.polygon(rect(x0 + h, y0, x0 + size, y0 + h), { color: C.dim, fill: tint(C.violet, 0.18), width: 1.5, alpha });
        g.polygon(rect(x0, y0 + h, x0 + h, y0 + size), { color: C.dim, fill: tint(C.violet, 0.18), width: 1.5, alpha });
        if (k <= 3) g.label({ x: O.x + x0 + h / 2, y: O.y + y0 + h / 2 }, `1/${4 ** k}`, { color: C.ink, size: 16 - 2 * k, bold: true, alpha });
        [x0, y0, size] = [x0 + h, y0 + h, h];
      }
      const shaded = (1 - 4 ** -layers) / 3;
      note(0, `${layers} layer${layers > 1 ? "s" : ""}: ${num(shaded, 5)}`, C.ink);
      note(1, "¼ + ¹⁄₁₆ + ¹⁄₆₄ + ⋯ = ⅓", GOLD, f.at(3));
      note(2, "0.333… = ⅓,  0.999… = 1", C.ink, f.at(3));
    },

    readout(f) {
      const n = count.value;
      const r = ratio.value;
      const rows: Readout[] = [];
      if (f.step <= 1) {
        rows.push({ label: "Shaded", tex: `\\frac{1}{2} + \\cdots + \\frac{1}{2^{${n}}} = 1 - \\frac{1}{${2 ** n}}`, tone: "good" });
        if (f.step === 1) rows.push({ label: "Infinite series", tex: "\\frac{1}{2} + \\frac{1}{4} + \\frac{1}{8} + \\cdots = 1", tone: "good" });
      } else if (f.step === 2) {
        rows.push(
          Math.abs(r) < 1 - 1e-9
            ? { label: "Sum to infinity", tex: `\\frac{1}{1 - (${num(r, 1)})} = ${num(1 / (1 - r))}`.replace(/−/g, "-"), tone: "good" }
            : { label: "No sum", tex: `|r| = ${num(Math.abs(r), 1)} \\ge 1`, tone: "warn" },
        );
      } else {
        rows.push({ label: "Quarters", tex: "\\frac{1/4}{1 - 1/4} = \\frac{1}{3}", tone: "good" });
        rows.push({ label: "Repeating decimal", tex: "0.\\overline{9} = \\frac{9/10}{1 - 1/10} = 1" });
      }
      return rows;
    },

    likes: [
      {
        title: "Walking halfway to the wall",
        text: "Walk half the way to a wall, then half the rest, then half again. You never take a last step, yet the steps add up to exactly the distance to the wall: each one is half of what was left.",
      },
      {
        title: "Sharing a cake by quarters",
        text: "Cut a cake in quarters and give one each to three friends, keeping the fourth. Cut that in quarters and do it again, and again. Each friend ends up with a third of the cake: $\\frac{1}{4} + \\frac{1}{16} + \\cdots = \\frac{1}{3}$.",
      },
    ],

    uses: [
      {
        title: "A bouncing ball",
        text: "A ball dropped from 2 m bounces back to three quarters of its height each time. It falls 2 m, then goes up and down $1.5 + 1.125 + \\cdots$ metres twice over, so it travels $2 + 2 \\cdot \\frac{1.5}{1 - 0.75} = 2 + 12 = 14$ m in all before it comes to rest, though it bounces forever in the sums.",
        tags: ["sport", "nature"],
        image: {
          src: ballBounceTotalImage,
          caption: "Dropped from 2 m and bouncing to three quarters of each height, a ball travels 2 + 2 × 1.5 ÷ (1 − 0.75) = 14 m in all.",
          alt: "The path of a ball bouncing to lower and lower heights, 2 m, 1.5 m, 1.125 m and less, with its first fall in gold, beside the line 2 + 2 × 1.5 ÷ 0.25 = 14 m.",
        },
      },
      {
        title: "A daily dose",
        text: "Someone takes 100 mg of a medicine each morning, and by the next morning half of what was in the body is gone. Just after the $n$th dose there is $100(1 + \\frac{1}{2} + \\cdots + \\frac{1}{2^{n-1}})$ mg, which climbs toward $\\frac{100}{1 - 1/2} = 200$ mg and settles there. Doctors call this the steady state.",
        tags: ["health"],
        image: {
          src: doseLevelSettlesImage,
          caption: "100 mg a day with half gone each day builds up toward 100 ÷ (1 − ½) = 200 mg.",
          alt: "A saw-tooth graph of the amount of medicine in the body, jumping up by 100 mg each day and halving before the next dose, its peaks 100, 150, 175 and 187.5 mg climbing toward a gold dashed line at 200 mg.",
        },
      },
    ],
  };
});
