// Sequences and means. Fill k terms in between a and b and the sequence is
// arithmetic if the gaps are equal, geometric if the ratios are. With one term
// between, it is the arithmetic mean (a + b)/2 or the geometric mean √(ab),
// and a semicircle on a + b shows that the second is never the larger.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { num } from "../kit/sequences.ts";
import { lesson, type Readout } from "../scene.ts";
import octaveGeometricMeanImage from "../../images/octave-geometric-mean.svg";
import fStopRatioStepsImage from "../../images/f-stop-ratio-steps.svg";

const ARITH = C.cyan;
const GEO = C.orange;
const GOLD = C.gold;

export default lesson((s) => {
  const lo = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 1, max: 16, value: 2, step: 1 });
  const hi = s.slider({ label: "b =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 1, max: 32, value: 18, step: 1 });
  const between = s.slider({ label: "terms between:", at: { x: 0, y: -4.3 }, width: 2.8, min: 1, max: 5, value: 1, step: 1 });

  return {
    steps: [
      {
        title: "Arithmetic means",
        text: "To fit $k$ terms between $a$ and $b$ in an arithmetic sequence, cut the gap $b - a$ into $k + 1$ equal steps, $d = \\frac{b - a}{k + 1}$. With one term between it is the arithmetic mean $\\frac{a + b}{2}$, the average. So $x, y, z$ are in arithmetic sequence exactly when $y = \\frac{x + z}{2}$, and each term of an arithmetic sequence is the mean of its neighbours.",
      },
      {
        title: "Geometric means",
        text: "For a geometric sequence the steps are equal ratios: $k + 1$ of them multiply $a$ up to $b$, so $r = \\left(\\frac{b}{a}\\right)^{1/(k+1)}$. With one term between it is the geometric mean $\\sqrt{ab}$: between 2 and 18 comes 6, since $2 \\cdot 3 = 6$ and $6 \\cdot 3 = 18$. Positive $x, y, z$ are in geometric sequence exactly when $y^2 = xz$.",
      },
      {
        title: "Which is bigger",
        text: "Stand $a$ and $b$ end to end as the diameter of a semicircle. Its radius is $\\frac{a + b}{2}$. The half-chord standing up where they meet is $\\sqrt{ab}$, because it is the altitude to the hypotenuse of a right triangle, and its square is $ab$. It can never be longer than a radius, so $\\sqrt{ab} \\le \\frac{a + b}{2}$, equal only when $a = b$.",
      },
    ],

    draw(g, f) {
      const [a, b, k] = [lo.value, hi.value, between.value];
      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: -7.2, y: 4.3 - row * 0.75 }, text, { color, size: 17, bold: true, align: "left", alpha });
      };

      if (f.step <= 1) {
        const top = Math.max(a, b);
        const u = 14 / top;
        const x = (v: number): number => -7 + v * u;
        const line = (y: number, values: number[], color: string, alpha: number): void => {
          g.segment({ x: -7, y }, { x: 7, y }, { color: C.dim, width: 1.5, alpha });
          g.label({ x: -7, y }, "0", { color: C.dim, size: 11, dy: -13, alpha });
          values.forEach((v, i) => {
            const p: Vec = { x: x(v), y };
            const end = i === 0 || i === values.length - 1;
            g.point(p, { color: end ? C.ink : color, r: end ? 6 : 5, alpha });
            g.label(p, num(v, 2), { color: end ? C.ink : color, size: 12, bold: true, dy: i % 2 ? -16 : 16, alpha });
            if (i > 0) g.segment({ x: x(values[i - 1]), y: y + 0.12 }, { x: p.x, y: y + 0.12 }, { color, width: 3, alpha: alpha * 0.5 });
          });
        };
        const d = (b - a) / (k + 1);
        const arith = Array.from({ length: k + 2 }, (_, i) => a + i * d);
        const r = (b / a) ** (1 / (k + 1));
        const geo = Array.from({ length: k + 2 }, (_, i) => a * r ** i);
        line(1.2, arith, ARITH, f.step === 0 ? 1 : 0.5);
        g.label({ x: 7, y: 1.2 }, "arithmetic", { color: ARITH, size: 13, bold: true, dy: 30, align: "right", alpha: f.step === 0 ? 1 : 0.5 });
        if (f.step === 1) {
          line(-1.4, geo, GEO, f.at(1));
          g.label({ x: 7, y: -1.4 }, "geometric", { color: GEO, size: 13, bold: true, dy: 30, align: "right", alpha: f.at(1) });
        }
        if (f.step === 0) {
          note(0, `d = (${b} − ${a}) ÷ ${k + 1} = ${num(d)}`, ARITH);
          if (k === 1) note(1, `mean: (${a} + ${b}) ÷ 2 = ${num((a + b) / 2)}`, GOLD, f.at(0));
        } else {
          note(0, `r = (${b} ÷ ${a})^(1/${k + 1}) = ${num(r)}`, GEO);
          if (k === 1) note(1, `mean: √(${a} × ${b}) = ${num(Math.sqrt(a * b))}`, GOLD, f.at(1));
        }
        return;
      }

      // The semicircle on a + b.
      const u = 10.8 / (a + b);
      const O: Vec = { x: -5.4, y: -2.6 };
      const R = ((a + b) / 2) * u;
      const centre: Vec = { x: O.x + R, y: O.y };
      const foot: Vec = { x: O.x + a * u, y: O.y };
      const h = Math.sqrt(a * b) * u;
      const apex: Vec = { x: foot.x, y: O.y + h };
      const arcPts: Vec[] = Array.from({ length: 81 }, (_, i) => ({ x: centre.x + R * Math.cos((Math.PI * i) / 80), y: centre.y + R * Math.sin((Math.PI * i) / 80) }));
      g.path(arcPts, { color: C.ink, width: 2 });
      g.segment(O, { x: O.x + (a + b) * u, y: O.y }, { color: C.ink, width: 2 });
      g.label({ x: (O.x + foot.x) / 2, y: O.y }, `a = ${a}`, { color: C.dim, size: 14, bold: true, dy: -14 });
      g.label({ x: (foot.x + O.x + (a + b) * u) / 2, y: O.y }, `b = ${b}`, { color: C.dim, size: 14, bold: true, dy: -14 });
      g.polygon([O, apex, { x: O.x + (a + b) * u, y: O.y }], { color: C.dim, fill: tint(C.violet, 0.08), width: 1, alpha: f.at(2) });
      g.segment(centre, { x: centre.x, y: centre.y + R }, { color: ARITH, width: 3 });
      g.label({ x: centre.x, y: centre.y + R / 2 }, `(a + b)/2 = ${num((a + b) / 2, 2)}`, { color: ARITH, size: 14, bold: true, dx: a <= b ? 8 : -8, align: a <= b ? "left" : "right" });
      g.segment(foot, apex, { color: GEO, width: 3 });
      g.label({ x: foot.x, y: foot.y + h / 2 }, `√(ab) = ${num(Math.sqrt(a * b), 2)}`, { color: GEO, size: 14, bold: true, dx: a <= b ? -8 : 8, align: a <= b ? "right" : "left" });
      g.point(apex, { color: GOLD, r: 5 });
      note(0, a === b ? "a = b: the two means are equal" : `√(ab) < (a + b)/2`, GOLD, f.at(2));
      note(1, `difference: ${num((a + b) / 2 - Math.sqrt(a * b), 3)}`, C.ink);
    },

    readout(f) {
      const [a, b, k] = [lo.value, hi.value, between.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Common difference", tex: `d = \\frac{${b} - ${a}}{${k + 1}} = ${num((b - a) / (k + 1)).replace("−", "-")}`, tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Common ratio", tex: `r = \\left(\\frac{${b}}{${a}}\\right)^{1/${k + 1}} = ${num((b / a) ** (1 / (k + 1)))}`, tone: "good" });
      } else {
        rows.push({ label: "AM–GM", tex: `\\sqrt{${a} \\cdot ${b}} = ${num(Math.sqrt(a * b), 3)} \\le ${num((a + b) / 2, 3)} = \\frac{${a} + ${b}}{2}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Meeting halfway",
        text: "Two friends 18 km apart who walk toward each other at the same speed meet at the arithmetic mean of their positions. Splitting a price difference down the middle is the same average.",
      },
      {
        title: "Growth that compounds",
        text: "A town that grows from 2000 to 18 000 people in two decades, by the same factor each decade, had 6000 at the halfway mark, the geometric mean, not the 10 000 halfway between.",
      },
    ],

    uses: [
      {
        title: "Notes between octaves",
        text: "Each A on a piano is twice the frequency of the A below it. The 11 notes between are geometric means, so the 12 equal steps from 220 Hz to 440 Hz are each a ratio of $2^{1/12} \\approx 1.0595$. The note in the middle, six steps up, is $\\sqrt{220 \\cdot 440} \\approx 311.1$ Hz, not the arithmetic mean 330 Hz.",
        tags: ["music"],
        image: {
          src: octaveGeometricMeanImage,
          caption: "Halfway up the octave from 220 Hz to 440 Hz, six equal steps of 2^(1/12), is √(220 × 440) ≈ 311.1 Hz.",
          alt: "A piano keyboard of one octave with the A keys marked 220 Hz and 440 Hz and the key six steps up from the lower A in gold, marked 311.1 Hz, beside the line √(220 × 440) ≈ 311.1.",
        },
      },
      {
        title: "Camera stops",
        text: "Each full stop on a camera lens lets in half the light of the one before, and the f-numbers 1, 1.4, 2, 2.8, 4, 5.6, … go up by a ratio of $\\sqrt{2}$. So each is the geometric mean of its neighbours: 2.8 is about $\\sqrt{2 \\cdot 4} \\approx 2.83$.",
        tags: ["light", "art"],
        image: {
          src: fStopRatioStepsImage,
          caption: "Camera f-numbers go up by √2 each stop, so 2.8 ≈ √(2 × 4) is the geometric mean of its neighbours.",
          alt: "A row of lens openings shrinking from left to right, labelled f/1.4, f/2, f/2.8, f/4 and f/5.6, the f/2.8 opening in gold, beside the line √(2 × 4) ≈ 2.83.",
        },
      },
    ],
  };
});
