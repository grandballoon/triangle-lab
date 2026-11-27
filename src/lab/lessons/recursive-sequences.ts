// Sequences given by a rule. aₙ₊₁ = m·aₙ + c covers arithmetic sequences
// (m = 1) and geometric ones (c = 0); Fibonacci reaches two terms back. A
// cobweb between y = mx + c and y = x shows the terms settling on the fixed
// point L = c/(1 − m) when |m| < 1, and the gap to L is a geometric sequence.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { listText, num, sequence, sub } from "../kit/sequences.ts";
import { lesson, type Readout } from "../scene.ts";
import pondStockSettlesImage from "../../images/pond-stock-settles.svg";
import stairClimbWaysImage from "../../images/stair-climb-ways.svg";

const DOTS = C.cyan;
const LINE = C.violet;
const GOLD = C.gold;
const COUNT = 10;

export default lesson((s) => {
  const start = s.slider({ label: "a₁ =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: -4, max: 8, value: 1, step: 0.5, format: (v) => num(v, 1) });
  const mult = s.slider({ label: "m =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: -1.5, max: 2, value: 0.5, step: 0.1, format: (v) => num(v, 1) });
  const add = s.slider({ label: "c =", at: { x: 0, y: -4.3 }, width: 2.8, min: -4, max: 4, value: 2, step: 0.5, format: (v) => num(v, 1) });

  return {
    steps: [
      {
        title: "Terms by rule",
        text: "A sequence is a list $a_1, a_2, a_3, \\ldots$ in order. An explicit formula gives $a_n$ from $n$; a recursive one gives each term from the ones before, with a start. Here $a_{n+1} = m a_n + c$: with $m = 1$ it adds $c$ each time, an arithmetic sequence; with $c = 0$ it multiplies by $m$, a geometric one.",
      },
      {
        title: "Two terms back",
        text: "A rule may reach further back. The Fibonacci numbers start $F_1 = F_2 = 1$ and go on by $F_{n+1} = F_n + F_{n-1}$: $1, 1, 2, 3, 5, 8, 13, 21, \\ldots$ Each over the one before, $\\frac{F_{n+1}}{F_n}$, closes in on the golden ratio $\\varphi = \\frac{1 + \\sqrt{5}}{2} \\approx 1.618$, the root of $x^2 = x + 1$.",
      },
      {
        title: "Settling down",
        text: "Draw $y = mx + c$ and $y = x$. From $a_1$, go up to the line to read $a_2$, across to $y = x$ to make it the next input, and up again: a cobweb. If the terms settle, they settle where the lines cross, at the fixed point $L = mL + c$, so $L = \\frac{c}{1 - m}$. With $m = \\frac{1}{2}$ and $c = 2$, $L = 4$.",
      },
      {
        title: "A formula from the rule",
        text: "Take $L = mL + c$ from $a_{n+1} = m a_n + c$ and $c$ drops out: $a_{n+1} - L = m(a_n - L)$. The gap to $L$ is a geometric sequence, so $a_n = L + m^{n-1}(a_1 - L)$, an explicit formula. The terms settle on $L$ exactly when $-1 < m < 1$, and they hop from side to side of it when $m$ is negative.",
      },
    ],

    draw(g, f) {
      const [a1, m, c] = [start.value, mult.value, add.value];
      const terms = sequence(a1, (t) => m * t + c, COUNT);
      const fixed = Math.abs(1 - m) > 1e-9 ? c / (1 - m) : null;
      const note = (row: number, text: string, color: string, alpha = 1, x = -7.2, y = 4.3): void => {
        g.label({ x, y: y - row * 0.75 }, text, { color, size: 17, bold: true, align: "left", alpha });
      };

      if (f.step === 1) {
        const fib = [1, 1];
        while (fib.length < 12) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
        const w = 14.4 / 12;
        fib.forEach((v, i) => {
          const alpha = Math.min(1, f.at(1) * 12 - i + 1.5);
          const p = { x: -7.2 + w * (i + 0.5), y: 1.6 };
          const h = w * 0.4;
          g.polygon([{ x: p.x - h, y: p.y - h }, { x: p.x + h, y: p.y - h }, { x: p.x + h, y: p.y + h }, { x: p.x - h, y: p.y + h }], { color: DOTS, fill: tint(DOTS, 0.22), width: 2, alpha });
          g.label(p, String(v), { color: C.ink, size: 15, bold: true, alpha });
          g.label({ x: p.x, y: p.y + h }, `F${sub(i + 1)}`, { color: C.dim, size: 12, bold: true, dy: 11, alpha });
          if (i >= 1) {
            const q = v / fib[i - 1];
            g.label({ x: p.x, y: -0.6 }, num(q, 3), { color: Math.abs(q - 1.618) < 0.01 ? GOLD : C.ink, size: 13, bold: true, alpha });
          }
        });
        g.label({ x: -7.2, y: -0.6 }, "÷", { color: C.dim, size: 16, bold: true, align: "left" });
        note(0, "Fₙ₊₁ = Fₙ + Fₙ₋₁", C.ink);
        note(1, "ratios → φ = (1 + √5)/2 ≈ 1.618", GOLD, f.at(1));
        return;
      }

      if (f.step === 2) {
        // Cobweb between y = mx + c and y = x.
        const shown = terms.slice(0, 8);
        const pts = [...shown, ...(fixed !== null ? [fixed] : []), 0];
        let [lo, hi] = [Math.min(...pts), Math.max(...pts)];
        const pad = Math.max((hi - lo) * 0.15, 1);
        [lo, hi] = [lo - pad, hi + pad];
        const u = 6.4 / (hi - lo);
        const at = (x: number, y: number): Vec => ({ x: -1.6 + (x - (lo + hi) / 2) * u, y: 0.6 + (y - (lo + hi) / 2) * u });
        g.segment(at(lo, 0), at(hi, 0), { color: C.dim, width: 1.5 });
        g.segment(at(0, lo), at(0, hi), { color: C.dim, width: 1.5 });
        g.segment(at(lo, lo), at(hi, hi), { color: C.dim, width: 2 });
        g.label(at(hi, hi), "y = x", { color: C.dim, size: 13, bold: true, dx: 6, align: "left" });
        g.segment(at(lo, m * lo + c), at(hi, m * hi + c), { color: LINE, width: 2.5 });
        const yEnd = m * hi + c;
        g.label(at(hi, Math.max(lo, Math.min(hi, yEnd))), "y = mx + c", { color: LINE, size: 13, bold: true, dx: 6, dy: -12, align: "left" });
        const web: Vec[] = [at(shown[0], 0)];
        for (let i = 0; i + 1 < shown.length; i++) web.push(at(shown[i], shown[i + 1]), at(shown[i + 1], shown[i + 1]));
        const k = Math.max(2, Math.round(f.at(2) * web.length));
        g.path(web.slice(0, k), { color: GOLD, width: 2 });
        g.point(at(shown[0], 0), { color: DOTS, r: 5, label: "a₁" });
        if (fixed !== null) g.point(at(fixed, fixed), { color: C.ink, r: 5, label: `L = ${num(fixed, 2)}` });
        note(0, `aₙ₊₁ = ${num(m, 1)}aₙ + ${num(c, 1)}`.replace("+ −", "− "), C.ink, 1, 2.6, 0.4);
        note(1, fixed === null ? "m = 1: the lines never cross" : `L = c/(1 − m) = ${num(fixed, 3)}`, fixed === null ? C.red : GOLD, 1, 2.6, 0.4);
        return;
      }

      // Terms plotted against n.
      const vals = [...terms, 0, ...(f.step === 3 && fixed !== null ? [fixed] : [])];
      const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
      const uy = 5.0 / Math.max(hi - lo, 1e-6);
      const ux = 1.3;
      const at = (n: number, v: number): Vec => ({ x: -7.2 + n * ux, y: -2.6 + (v - lo) * uy });
      g.segment(at(0.5, 0), at(COUNT + 0.5, 0), { color: C.dim, width: 1.5 });
      for (let n = 1; n <= COUNT; n++) g.label(at(n, 0), String(n), { color: C.dim, size: 11, dy: -13 });
      if (f.step === 3 && fixed !== null) {
        g.segment(at(0.5, fixed), at(COUNT + 0.5, fixed), { color: GOLD, width: 2, dash: [6, 5] });
        g.label(at(COUNT + 0.5, fixed), "L", { color: GOLD, size: 15, bold: true, dx: 8, align: "left" });
        terms.forEach((v, i) => g.segment(at(i + 1, fixed), at(i + 1, v), { color: GOLD, width: 2, alpha: f.at(3) * 0.8 }));
      }
      terms.forEach((v, i) => {
        const alpha = f.step === 0 ? Math.min(1, f.at(0) * COUNT - i + 1.5) : 1;
        if (i > 0) g.segment(at(i, terms[i - 1]), at(i + 1, v), { color: DOTS, width: 1.5, alpha: alpha * 0.4 });
        g.point(at(i + 1, v), { color: DOTS, r: 5, alpha });
      });
      if (f.step === 0) {
        note(0, `aₙ₊₁ = ${num(m, 1)}aₙ + ${num(c, 1)}`.replace("+ −", "− "), C.ink);
        note(1, listText(terms, 6), DOTS, f.at(0));
        const kind = Math.abs(m - 1) < 1e-9 ? `arithmetic, d = ${num(c, 1)}` : Math.abs(c) < 1e-9 ? `geometric, r = ${num(m, 1)}` : "neither arithmetic nor geometric";
        note(2, kind, GOLD, f.at(0));
      } else {
        note(0, fixed === null ? "m = 1: no fixed point" : `aₙ = L + mⁿ⁻¹(a₁ − L), L = ${num(fixed, 3)}`, fixed === null ? C.red : C.ink);
        note(1, Math.abs(m) < 1 - 1e-9 ? "|m| < 1: the gaps shrink to 0" : "|m| ≥ 1: the gaps do not shrink", Math.abs(m) < 1 - 1e-9 ? GOLD : C.red, f.at(3));
      }
    },

    readout(f) {
      const [a1, m, c] = [start.value, mult.value, add.value];
      const terms = sequence(a1, (t) => m * t + c, COUNT);
      const t = (v: number): string => num(v, 3).replace("−", "-");
      const rows: Readout[] = [];
      if (f.step === 1) {
        rows.push({ label: "Golden ratio", tex: "\\frac{F_{12}}{F_{11}} = \\frac{144}{89} \\approx 1.618", tone: "good" });
      } else if (f.step === 0) {
        rows.push({ label: "Tenth term", tex: `a_{10} = ${t(terms[9])}`, tone: "good" });
      } else if (Math.abs(1 - m) < 1e-9) {
        rows.push({ label: "Fixed point", tex: "m = 1: \\text{none unless } c = 0", tone: "warn" });
      } else {
        const L = c / (1 - m);
        rows.push({ label: "Fixed point", tex: `L = \\frac{${t(c)}}{1 - (${t(m)})} = ${t(L)}`, tone: "good" });
        if (f.step === 3) rows.push({ label: "Explicit", tex: `a_{10} = ${t(L)} + (${t(m)})^{9}(${t(a1)} - ${t(L)}) = ${t(terms[9])}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Directions from where you are",
        text: "\"Walk to the next corner, then the next\" is a recursive rule: each step starts from where the last one ended. A street address is explicit: it says where to go without the steps in between.",
      },
      {
        title: "A thermostat",
        text: "Each minute a heater closes part of the gap between the room and the setting. The gap shrinks by the same fraction each time, so the temperature creeps toward the setting and settles there, like the terms closing in on their fixed point.",
      },
    ],

    uses: [
      {
        title: "Stocking a pond",
        text: "Each year 80% of a pond's fish survive and 100 young fish are added: $p_{n+1} = 0.8p_n + 100$. Whatever the start, the stock heads for $L = \\frac{100}{1 - 0.8} = 500$ fish. Starting from 100, the gap of 400 shrinks to $400 \\cdot 0.8^{9} \\approx 54$ by the tenth year.",
        tags: ["nature"],
        image: {
          src: pondStockSettlesImage,
          caption: "With 80% surviving and 100 added each year, a pond's stock settles at 100 ÷ (1 − 0.8) = 500 fish.",
          alt: "A graph of a pond's fish stock over ten years, the dots rising from 100 through 180, 244 and 295 toward a gold dashed line at 500, beside the rule p next = 0.8p + 100.",
        },
      },
      {
        title: "Climbing stairs",
        text: "Going up stairs one or two at a time, the last move onto step $n$ is from step $n - 1$ or step $n - 2$. So the ways $w_n$ to climb $n$ steps satisfy $w_n = w_{n-1} + w_{n-2}$, from $w_1 = 1$ and $w_2 = 2$: $1, 2, 3, 5, 8, \\ldots$, and a flight of 10 steps can be climbed 89 ways.",
        tags: ["building", "home"],
        image: {
          src: stairClimbWaysImage,
          caption: "Climbing 1 or 2 steps at a time, the ways up follow 1, 2, 3, 5, 8, 13, 21, 34, 55, 89: each the sum of the two before.",
          alt: "A flight of ten stairs with the number of ways to reach each step written on it, 1, 2, 3, 5, 8, 13, 21, 34, 55 and 89 in gold on the top step.",
        },
      },
    ],
  };
});
