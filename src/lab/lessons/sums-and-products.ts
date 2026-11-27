// Sums and products. Knowing only s = x + y and p = xy is enough for any
// symmetric expression in x and y, without finding x and y. A square of
// side s holds x², y² and two rectangles p, so x² + y² = s² − 2p; x and y
// are the roots of t² − st + p; and the power sums follow a recurrence.

import { C, tint } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import frameDiagonalCheckImage from "../../images/frame-diagonal-check.svg";
import goldenPowersWholeImage from "../../images/golden-powers-whole.svg";

const X2 = C.cyan;
const Y2 = C.pink;
const P = C.violet;
const GOLD = C.gold;

/** xⁿ + yⁿ for n = 0 … count − 1, from e₀ = 2, e₁ = s and eₙ = s·eₙ₋₁ − p·eₙ₋₂. */
function powerSums(s: number, p: number, count: number): number[] {
  const e = [2, s];
  while (e.length < count) e.push(s * e[e.length - 1] - p * e[e.length - 2]);
  return e.slice(0, count);
}

export default lesson((sc) => {
  const s = sc.slider({ label: "x + y =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -4, max: 8, value: 7, step: 0.5, format: (v) => fmt(v) });
  const p = sc.slider({ label: "xy =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -4, max: 16, value: 12, step: 0.5, format: (v) => fmt(v) });

  return {
    steps: [
      {
        title: "Sum of squares",
        text: "Suppose all you know is $x + y = s$ and $xy = p$. A square of side $s$ splits into $x^2$, $y^2$ and two $x \\times y$ rectangles, so $s^2 = x^2 + y^2 + 2p$, and $x^2 + y^2 = s^2 - 2p$. With $s = 7$ and $p = 12$, $x^2 + y^2 = 49 - 24 = 25$, found without finding $x$ and $y$ (they are 3 and 4).",
      },
      {
        title: "The numbers themselves",
        text: "Since $(t - x)(t - y) = t^2 - st + p$, the numbers $x$ and $y$ are the roots of that quadratic: the parabola crosses the axis at them, symmetric about $\\frac{s}{2}$. When $s^2 < 4p$ it misses the axis, $x$ and $y$ are complex, and yet $x^2 + y^2 = s^2 - 2p$ still holds.",
      },
      {
        title: "Higher powers",
        text: "Multiply $x^{n-1} + y^{n-1}$ by $x + y$ and the cross terms come to $xy(x^{n-2} + y^{n-2})$. So each power sum is $s$ times the last minus $p$ times the one before: $x^n + y^n = s(x^{n-1} + y^{n-1}) - p(x^{n-2} + y^{n-2})$, starting from 2 and $s$. Fractions work too: $\\frac{1}{x} + \\frac{1}{y} = \\frac{s}{p}$.",
      },
    ],

    draw(g, f) {
      const [S, Q] = [s.value, p.value];
      const disc = S * S - 4 * Q;
      const real = disc >= 0;
      const r = real ? Math.sqrt(disc) : 0;
      const [x, y] = [(S + r) / 2, (S - r) / 2];

      const note = (row: number, text: string, color: string, alpha = 1, size = 18): void => {
        g.label({ x: 1.4, y: 2.8 - row * 0.9 }, text, { color, size, bold: true, align: "left", alpha });
      };

      if (f.step === 0) {
        if (real && y > 0) {
          const u = 6.4 / S;
          const O: Vec = { x: -6.8, y: -2.8 };
          const at = (a: number, b: number): Vec => ({ x: O.x + a * u, y: O.y + b * u });
          const piece = (a0: number, b0: number, a1: number, b1: number, color: string, name: string): void => {
            g.polygon([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)], { color, fill: tint(color, 0.25), width: 2 });
            if ((a1 - a0) * u > 0.8 && (b1 - b0) * u > 0.5) g.label(at((a0 + a1) / 2, (b0 + b1) / 2), name, { color, size: 16, bold: true });
          };
          piece(0, 0, x, x, X2, "x²");
          piece(x, x, S, S, Y2, "y²");
          piece(x, 0, S, x, P, "xy");
          piece(0, x, x, S, P, "xy");
          g.label(at(S / 2, 0), `s = ${fmt(S)}`, { color: C.dim, size: 14, bold: true, dy: -18 });
        } else {
          g.label({ x: -3.6, y: 0.4 }, real ? "x or y is not positive:" : "x and y are not real:", { color: C.red, size: 16, bold: true });
          g.label({ x: -3.6, y: -0.4 }, "no picture, but the algebra still holds", { color: C.red, size: 14, bold: true });
        }
        note(0, `s² = ${fmt(S * S)}`, C.ink);
        note(1, `2p = ${fmt(2 * Q)}`, P);
        note(2, `x² + y² = ${fmt(S * S - 2 * Q)}`, GOLD, f.at(0));
        return;
      }

      if (f.step === 1) {
        const lo = Math.min(-1, S / 2 - 4.5);
        const hi = lo + 9;
        const ux = 1.4;
        const O: Vec = { x: -7 - lo * ux, y: -0.4 };
        const top = Math.max(4, Math.abs(Q - (S * S) / 4) + 1);
        const uy = 3.4 / top;
        const at = (t: number, v: number): Vec => ({ x: O.x + t * ux, y: O.y + v * uy });
        g.segment(at(lo, 0), at(hi, 0), { color: C.dim, width: 1.5 });
        g.segment({ x: O.x, y: -3.6 }, { x: O.x, y: 3.6 }, { color: C.dim, width: 1.5 });
        for (let k = Math.ceil(lo); k <= hi; k++) if (k !== 0) g.label(at(k, 0), String(k), { color: C.dim, size: 11, dy: -16 });
        const pts: Vec[] = [];
        for (let i = 0; i <= 160; i++) {
          const t = lo + ((hi - lo) * i) / 160;
          const v = t * t - S * t + Q;
          if (Math.abs(v * uy) < 3.8) pts.push(at(t, v));
        }
        g.path(pts, { color: C.cyan, width: 2.5 });
        g.segment(at(S / 2, -3.3 / uy), at(S / 2, 3.3 / uy), { color: C.dim, width: 1, dash: [4, 4] });
        if (real) {
          for (const [t, name, side] of [[x, "x", 1], [y, "y", -1]] as const) {
            g.point(at(t, 0), { color: GOLD, r: 6, alpha: f.at(1) });
            g.label(at(t, 0), `${name} = ${fmt(t, 2)}`, { color: GOLD, size: 14, bold: true, dx: 8 * side, dy: 14, align: side > 0 ? "left" : "right", alpha: f.at(1) });
          }
        }
        g.label({ x: -3.2, y: 4.1 }, `t² − ${fmt(S)}t + ${fmt(Q)}`.replace("+ -", "− ").replace("− -", "+ "), { color: C.cyan, size: 17, bold: true });
        return;
      }

      // The ladder of power sums.
      const e = powerSums(S, Q, 9);
      e.forEach((v, n) => {
        const col = n < 5 ? 0 : 1;
        const row = n < 5 ? n : n - 5;
        const how = n === 0 ? "start" : n === 1 ? "= s" : `= ${fmt(S)}·${fmt(e[n - 1], 2)} − ${fmt(Q)}·${fmt(e[n - 2], 2)}`;
        const alpha = Math.min(1, f.at(2) * 9 - n + 1.5);
        g.label({ x: -7.2 + col * 7.6, y: 3.9 - row * 1.1 }, `x${sup(n)} + y${sup(n)} = ${fmt(v, 2)}`, { color: n === 2 ? GOLD : C.ink, size: 16, bold: true, align: "left", alpha });
        g.label({ x: -7.2 + col * 7.6, y: 3.9 - row * 1.1 }, how, { color: C.dim, size: 12, dy: -16, align: "left", alpha });
      });
    },

    readout(f) {
      const [S, Q] = [s.value, p.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Sum of squares", tex: `x^2 + y^2 = ${fmt(S)}^2 - 2 \\cdot ${fmt(Q)} = ${fmt(S * S - 2 * Q)}`, tone: "good" });
      } else if (f.step === 1) {
        const disc = S * S - 4 * Q;
        rows.push({ label: "Roots", tex: `x, y = \\frac{${fmt(S)} \\pm \\sqrt{${fmt(disc)}}}{2}`, tone: disc >= 0 ? "good" : "warn" });
      } else {
        rows.push({ label: "Cubes", tex: `x^3 + y^3 = s^3 - 3ps = ${fmt(S ** 3 - 3 * Q * S, 2)}`, tone: "good" });
        rows.push(Q === 0 ? { label: "Reciprocals", tex: "xy = 0: \\text{undefined}", tone: "warn" } : { label: "Reciprocals", tex: `\\frac{1}{x} + \\frac{1}{y} = \\frac{s}{p} = ${fmt(S / Q, 3)}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Two dice, sum and product",
        text: "Told only that two dice sum to 7 and multiply to 12, you know they show 3 and 4, but you can say their squares add to 25 before working that out. Sum and product pin the pair down, apart from which is which.",
      },
      {
        title: "A rectangle's measurements",
        text: "Half a rectangle's perimeter is the sum of its sides, and its area is their product. Every other measurement that treats length and width alike, such as the diagonal, follows from those two.",
      },
    ],

    uses: [
      {
        title: "Checking a frame by its diagonal",
        text: "A builder wants a rectangular frame with sides adding to 7 m and an area of 12 m². Its diagonal must be $\\sqrt{x^2 + y^2} = \\sqrt{7^2 - 2 \\cdot 12} = 5$ m, so a tape across the corners checks the frame is square and the right size, without working out that the sides are 3 m and 4 m.",
        tags: ["carpentry", "building"],
        image: {
          src: frameDiagonalCheckImage,
          caption: "Sides adding to 7 m with area 12 m² have a diagonal of √(7² − 2 × 12) = √25 = 5 m, without finding the sides first.",
          alt: "A wooden frame 4 m by 3 m with a gold tape across the corners reading 5 m, beside the lines x + y = 7, xy = 12, x² + y² = 49 − 24 = 25 and diagonal 5 m.",
        },
      },
      {
        title: "Powers of the golden ratio",
        text: "The golden ratio $\\varphi = \\frac{1 + \\sqrt{5}}{2}$ and its partner $\\frac{1 - \\sqrt{5}}{2}$ add to 1 and multiply to $-1$. Their power sums go $2, 1, 3, 4, 7, 11, \\ldots$, each the sum of the two before, so they are always whole numbers. The partner's powers shrink fast, which is why $\\varphi^{10} \\approx 122.99$ is so close to 123.",
        tags: ["art"],
        image: {
          src: goldenPowersWholeImage,
          caption: "The golden ratio φ ≈ 1.618 and its partner −1/φ add to 1 and multiply to −1, so φ¹⁰ + (−1/φ)¹⁰ is the whole number 123, and φ¹⁰ ≈ 122.99.",
          alt: "A golden rectangle cut into a spiral of squares with a gold spiral through them, beside φ ≈ 1.618 and φ¹⁰ ≈ 122.99, and the numbers 2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123 with the line φ¹⁰ + (−1/φ)¹⁰ = 123.",
        },
      },
    ],
  };
});
