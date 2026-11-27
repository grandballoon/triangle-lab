// Square roots of a complex number. Writing the root as x + yi and squaring
// gives two real equations, x² − y² = a and 2xy = b, which the length
// x² + y² = |w| makes easy to solve. On the plane, the two roots have half
// w's angle (and half plus a half turn), and the square root of its length.

import { C } from "../draw.ts";
import { angleOf, both, fmt, inBox, snapToGrid, toDeg, TAU } from "../geo.ts";
import { cx, norm, plane, roots, size, texCx, texTerm, textCx, times, vector } from "../kit/complex.ts";
import { lesson, type Readout } from "../scene.ts";
import carSuspensionBounceImage from "../../images/car-suspension-bounce.svg";
import mandelbrotOutlineImage from "../../images/mandelbrot-outline.svg";

const W = C.pink;
const ROOT = C.cyan;
const OTHER = C.violet;

/** A number for TeX, as an exact root where it is one. */
function exact(v: number): string {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  const sq = v * v;
  if (Math.abs(sq - Math.round(sq)) < 1e-9) return `${v < 0 ? "-" : ""}\\sqrt{${Math.round(sq)}}`;
  return fmt(v, 3);
}

export default lesson((s) => {
  const w = s.point(3, 4, { label: "w", color: W, constrain: both(snapToGrid(1), inBox(-6, 6, -4, 4)) });

  return {
    steps: [
      {
        title: "Two equations from one",
        text: "To find $\\sqrt{w}$ for $w = a + bi$, look for $x + yi$ with $(x + yi)^2 = w$. Squaring gives $x^2 - y^2 + 2xyi$, and two complex numbers are equal only when both parts are, so $x^2 - y^2 = a$ and $2xy = b$.",
      },
      {
        title: "Solve them",
        text: "The length helps: $|x + yi|^2 = |w|$, so $x^2 + y^2 = \\sqrt{a^2 + b^2}$. Adding and subtracting this and $x^2 - y^2 = a$ gives $x^2$ and $y^2$, and $2xy = b$ fixes the signs. For $w = 3 + 4i$, $x^2 + y^2 = 5$ and $x^2 - y^2 = 3$, so $x^2 = 4$, $y^2 = 1$: the root is $2 + i$.",
      },
      {
        title: "Two roots, half the angle",
        text: "Every nonzero $w$ has exactly two square roots, $r$ and $-r$, opposite each other. Since lengths multiply and angles add, $r$ has length $\\sqrt{|w|}$ and half of $w$'s angle. Drag $w$ once round 0: the roots go only half way round, and swap places.",
      },
    ],

    draw(g, f) {
      plane(g);
      const ww = cx(w.x, w.y);
      const [r1, r2] = roots(ww);

      vector(g, ww, { color: W, label: `w = ${textCx(ww)}` });
      if (f.step >= 1) {
        vector(g, r1, { color: ROOT, label: textCx(r1), alpha: f.at(1) });
      }
      if (f.step >= 2) {
        vector(g, r2, { color: OTHER, label: textCx(r2) });
        if (size(ww) > 1e-9) {
          const a = ((angleOf(ww) % TAU) + TAU) % TAU;
          const half = ((angleOf(r1) % TAU) + TAU) % TAU;
          g.arc({ x: 0, y: 0 }, 1.6, 0, a, { color: W, width: 2 });
          g.arc({ x: 0, y: 0 }, 1.1, 0, half, { color: ROOT, width: 2.5 });
          g.circle({ x: 0, y: 0 }, size(r1), { color: C.faint, width: 1.5, dash: [3, 5] });
        }
      }
    },

    readout(f) {
      const ww = cx(w.x, w.y);
      const [a, b] = [w.x, w.y];
      const [r1, r2] = roots(ww);
      const rows: Readout[] = [
        { label: "Want", tex: `(x + yi)^2 = ${texCx(ww)}` },
        { label: "Real and imaginary parts", tex: `x^2 - y^2 = ${a},\\quad 2xy = ${b}` },
      ];
      if (f.step >= 1) {
        const len = Math.sqrt(norm(ww));
        rows.push({ label: "From the length", tex: `x^2 + y^2 = \\sqrt{${texTerm(a)}^2 + ${texTerm(b)}^2} = ${exact(len)}` });
        rows.push({ label: "So", tex: `x^2 = ${fmt((len + a) / 2, 3)},\\quad y^2 = ${fmt((len - a) / 2, 3)}` });
        rows.push({ label: "A root", tex: `x + yi = ${exact(r1.x)} ${r1.y < 0 ? "-" : "+"} ${exact(Math.abs(r1.y))}i`, tone: "good" });
        rows.push({ label: "Check", tex: `(${texCx(r1, 3)})^2 = ${texCx(times(r1, r1), 3)}` });
      }
      if (f.step >= 2) {
        rows.push({ label: "The other", tex: `-(${texCx(r1, 3)}) = ${texCx(r2, 3)}` });
        if (size(ww) > 1e-9) {
          rows.push({ label: "Angles", tex: `\\tfrac12 \\times ${fmt(toDeg(((angleOf(ww) % TAU) + TAU) % TAU), 1)}^\\circ = ${fmt(toDeg(((angleOf(r1) % TAU) + TAU) % TAU), 1)}^\\circ` });
        }
      }
      return rows;
    },

    likes: [
      {
        title: "Halving a journey round a roundabout",
        text: "If going twice round part of a roundabout brings you to a certain exit, then once is half that turn. But a full lap brings you back where you began, so half a lap more also works when doubled. That is why there are two square roots, half a turn apart.",
      },
      {
        title: "Guess and check",
        text: "Finding $\\sqrt{-5 + 12i}$ is like finding two numbers from their product and difference of squares. Try $x = 2$, $y = 3$: $2^2 - 3^2 = -5$ and $2 \\cdot 2 \\cdot 3 = 12$. So $\\sqrt{-5 + 12i} = 2 + 3i$, as guessing a factor pair solves a puzzle about whole numbers.",
      },
    ],

    uses: [
      {
        title: "The Mandelbrot set",
        text: "Pick a complex number $c$, start from $z = 0$, and keep replacing $z$ by $z^2 + c$. For $c = -1$ the values go $0, -1, 0, -1, \\ldots$ forever; for $c = 1$ they go $0, 1, 2, 5, 26, \\ldots$ off to infinity. The numbers $c$ that stay bounded make the Mandelbrot set, whose famous pictures are drawn by testing each pixel this way.",
        tags: ["art", "computing"],
        image: {
          src: mandelbrotOutlineImage,
          caption: "The Mandelbrot set: the numbers c for which repeating z → z² + c, starting from 0, never runs off to infinity.",
          alt: "The dark heart-shaped main body and round side bulb of the Mandelbrot set outlined in blue on a pair of axes, with the thin line out to −2 and the cusp marked 1/4.",
        },
      },
      {
        title: "A bouncing car",
        text: "A car's springs and shock absorbers obey an equation whose behaviour is set by the roots of a quadratic. If the shocks are worn, say $r^2 + 2r + 5 = 0$, the roots are complex: $r = -1 \\pm \\sqrt{-4} = -1 \\pm 2i$. The real part, $-1$, says how fast the bounce dies away, and the imaginary part, 2, how fast the car swings up and down.",
        tags: ["machines", "travel"],
        image: {
          src: carSuspensionBounceImage,
          caption: "A car on worn shock absorbers bounces: its motion solves an equation with complex roots like −1 ± 2i, a swing that slowly dies away.",
          alt: "A car above a road with a gold wave trailing behind it that shrinks with each swing.",
        },
      },
    ],
  };
});
