// Completing the rectangle. xy + ax + by is a rectangle with two strips
// along it, one corner short of the rectangle (x + b)(y + a). Adding the
// corner ab to both sides turns xy + ax + by = c into a product equal to a
// number, and the whole-number solutions come from its factor pairs.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { divisors } from "../kit/integers.ts";
import { lesson, type Readout } from "../scene.ts";
import lensWholeDistancesImage from "../../images/lens-whole-distances.svg";
import parallelResistorsImage from "../../images/parallel-resistors.svg";

const XY = C.cyan;
const AX = C.violet;
const BY = C.pink;
const CORNER = C.gold;
/** The lengths x and y are drawn, in stage units. */
const [X, Y] = [4.4, 2.8];
/** Stage units per unit of a and b. */
const PER = 0.6;

/** The whole-number solutions x, y ≥ 1 of (x + b)(y + a) = n. */
function solutions(a: number, b: number, n: number): [number, number][] {
  return divisors(n)
    .map((d): [number, number] => [d - b, n / d - a])
    .filter(([x, y]) => x >= 1 && y >= 1);
}

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 1, max: 5, value: 2, step: 1 });
  const b = s.slider({ label: "b =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 1, max: 5, value: 3, step: 1 });
  const c = s.slider({ label: "c =", at: { x: 0, y: -4.3 }, width: 2.8, min: 1, max: 40, value: 30, step: 1 });

  return {
    steps: [
      {
        title: "A rectangle and two strips",
        text: "Draw $xy$ as an $x$ by $y$ rectangle. Then $ax$ is a strip $a$ tall along its top and $by$ a strip $b$ wide down its side. Together, $xy + ax + by$ is a larger rectangle with one corner missing, $b$ by $a$.",
      },
      {
        title: "Add the corner",
        text: "Put in the corner, area $ab$, and the shape is a whole rectangle $(x + b)$ by $(y + a)$. So $xy + ax + by + ab = (x + b)(y + a)$. To solve $xy + ax + by = c$, add $ab$ to both sides: $(x + b)(y + a) = c + ab$. Grouping says the same thing: $x(y + a) + b(y + a)$.",
      },
      {
        title: "Whole-number solutions",
        text: "If $x$ and $y$ must be whole numbers, so are $x + b$ and $y + a$, and they multiply to $c + ab$. So each factor pair of $c + ab$ gives a solution. For $xy + 2x + 3y = 30$, $(x + 3)(y + 2) = 36$, and the pairs $4 \\cdot 9$, $6 \\cdot 6$, $9 \\cdot 4$ and $12 \\cdot 3$ give $(1, 7)$, $(3, 4)$, $(6, 2)$ and $(9, 1)$.",
      },
    ],

    draw(g, f) {
      const [A, B, N] = [a.value, b.value, c.value + a.value * b.value];

      if (f.step <= 1) {
        const O: Vec = { x: -6.6, y: -2.3 };
        const [ha, wb] = [A * PER, B * PER];
        const rect = (x0: number, y0: number, x1: number, y1: number): Vec[] => [
          { x: O.x + x0, y: O.y + y0 },
          { x: O.x + x1, y: O.y + y0 },
          { x: O.x + x1, y: O.y + y1 },
          { x: O.x + x0, y: O.y + y1 },
        ];
        const mid = (x0: number, y0: number, x1: number, y1: number): Vec => ({ x: O.x + (x0 + x1) / 2, y: O.y + (y0 + y1) / 2 });
        g.polygon(rect(0, 0, X, Y), { color: XY, fill: tint(XY, 0.22), width: 2 });
        g.polygon(rect(0, Y, X, Y + ha), { color: AX, fill: tint(AX, 0.25), width: 2 });
        g.polygon(rect(X, 0, X + wb, Y), { color: BY, fill: tint(BY, 0.25), width: 2 });
        const t = f.step === 1 ? f.at(1) : 0;
        g.polygon(rect(X, Y, X + wb, Y + ha), { color: CORNER, fill: tint(CORNER, 0.4 * t), width: 2, dash: t > 0.5 ? undefined : [5, 4] });
        g.label(mid(0, 0, X, Y), "xy", { color: XY, size: 18, bold: true });
        g.label(mid(0, Y, X, Y + ha), "ax", { color: AX, size: 16, bold: true });
        g.label(mid(X, 0, X + wb, Y), "by", { color: BY, size: 16, bold: true });
        g.label(mid(X, Y, X + wb, Y + ha), "ab", { color: CORNER, size: 15, bold: true, alpha: Math.max(0.35, t) });
        g.label({ x: O.x + X / 2, y: O.y }, "x", { color: C.dim, size: 15, bold: true, dy: -18 });
        g.label({ x: O.x + X + wb / 2, y: O.y }, "b", { color: C.dim, size: 15, bold: true, dy: -18 });
        g.label({ x: O.x, y: O.y + Y / 2 }, "y", { color: C.dim, size: 15, bold: true, dx: -12, align: "right" });
        g.label({ x: O.x, y: O.y + Y + ha / 2 }, "a", { color: C.dim, size: 15, bold: true, dx: -12, align: "right" });
        if (t > 0.9) g.segment({ x: O.x, y: O.y + Y + ha + 0.25 }, { x: O.x + X + wb, y: O.y + Y + ha + 0.25 }, { color: CORNER, width: 2 });
        if (t > 0.9) g.label({ x: O.x + (X + wb) / 2, y: O.y + Y + ha + 0.25 }, "x + b", { color: CORNER, size: 14, bold: true, dy: 12 });

        const lines: [string, string][] =
          f.step === 0
            ? [[`xy + ${A}x + ${B}y = ${c.value}`, C.ink], ["one corner short", C.dim]]
            : [[`xy + ${A}x + ${B}y + ${A * B} = ${c.value} + ${A * B}`, C.ink], [`(x + ${B})(y + ${A}) = ${N}`, CORNER]];
        lines.forEach(([text, color], i) => g.label({ x: 1.0, y: 2.0 - i * 0.9 }, text, { color, size: 18, bold: true, align: "left", alpha: i === 1 ? Math.max(f.at(f.step), 0.3) : 1 }));
        return;
      }

      // The curve (x + b)(y + a) = N in the positive quadrant, with its
      // whole-number points.
      const sols = solutions(A, B, N);
      const xmax = Math.max(4, N / (A + 1) - B + 1);
      const ymax = Math.max(4, N / (B + 1) - A + 1);
      const O: Vec = { x: -6.6, y: -2.8 };
      const ux = 8.2 / xmax;
      const uy = 6.3 / ymax;
      const P = (x: number, y: number): Vec => ({ x: O.x + x * ux, y: O.y + y * uy });
      g.arrow(P(0, 0), { x: O.x + 8.6, y: O.y }, { color: C.dim, width: 1.5 });
      g.arrow(P(0, 0), { x: O.x, y: O.y + 6.7 }, { color: C.dim, width: 1.5 });
      g.label({ x: O.x + 8.6, y: O.y }, "x", { color: C.dim, size: 14, bold: true, dy: -16 });
      g.label({ x: O.x, y: O.y + 6.7 }, "y", { color: C.dim, size: 14, bold: true, dx: -12, align: "right" });
      const every = (top: number): number => (top > 24 ? 10 : top > 12 ? 5 : top > 6 ? 2 : 1);
      for (let k = every(xmax); k <= xmax; k += every(xmax)) g.label(P(k, 0), String(k), { color: C.dim, size: 11, dy: -16 });
      for (let k = every(ymax); k <= ymax; k += every(ymax)) g.label(P(0, k), String(k), { color: C.dim, size: 11, dx: -8, align: "right" });
      const pts: Vec[] = [];
      for (let i = 0; i <= 200; i++) {
        const x = (xmax * i) / 200;
        const y = N / (x + B) - A;
        if (y >= 0 && y <= ymax) pts.push(P(x, y));
      }
      g.path(pts, { color: C.cyan, width: 2.5 });
      sols.forEach(([x, y], i) => {
        const alpha = Math.min(1, f.at(2) * sols.length * 1.2 - i + 1);
        g.point(P(x, y), { color: CORNER, r: 6, alpha });
        g.label(P(x, y), `(${x}, ${y})`, { color: CORNER, size: 13, bold: true, dx: 8, dy: 8, align: "left", alpha });
      });
      const pairs = divisors(N)
        .filter((d) => d - B >= 1 && N / d - A >= 1)
        .map((d) => `${d} × ${N / d}`);
      g.label({ x: 2.6, y: 3.6 }, `(x + ${B})(y + ${A}) = ${N}`, { color: C.ink, size: 17, bold: true, align: "left" });
      g.label({ x: 2.6, y: 2.8 }, sols.length ? `${sols.length} whole-number solution${sols.length === 1 ? "" : "s"}` : "no whole-number solutions", { color: sols.length ? CORNER : C.red, size: 15, bold: true, align: "left" });
      pairs.slice(0, 8).forEach((p, i) => g.label({ x: 2.6, y: 2.0 - i * 0.55 }, p, { color: C.dim, size: 13, align: "left" }));
    },

    readout(f) {
      const [A, B, N] = [a.value, b.value, c.value + a.value * b.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Equation", tex: `xy + ${A}x + ${B}y = ${c.value}` });
      } else if (f.step === 1) {
        rows.push({ label: "Add the corner", tex: `(x + ${B})(y + ${A}) = ${c.value} + ${A * B} = ${N}`, tone: "good" });
      } else {
        const sols = solutions(A, B, N);
        rows.push({ label: "Solutions", tex: sols.length ? sols.map(([x, y]) => `(${x}, ${y})`).join(",\\ ") : "\\text{none}", tone: sols.length ? "good" : "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "Adding a border",
        text: "A photo $x$ by $y$ with a 2 cm border on every side needs a mount $(x + 4)(y + 4)$. Asking which whole-centimetre photos fit a mount of a set area is asking for factor pairs, just as here.",
      },
      {
        title: "Factoring by grouping",
        text: "The same move factors expressions like $pq + 3p + 5q + 15$: group as $p(q + 3) + 5(q + 3) = (p + 5)(q + 3)$. When the constant is missing, add it, and add it to the other side too.",
      },
    ],

    uses: [
      {
        title: "Lens distances",
        text: "A lens of focal length $f$ makes a sharp image at distance $v$ of an object at distance $u$ when $\\frac{1}{u} + \\frac{1}{v} = \\frac{1}{f}$. Clearing fractions gives $uv - fu - fv = 0$, and completing the rectangle gives Newton's form, $(u - f)(v - f) = f^2$. With $f = 6$ cm, the object 10 cm away gives $4(v - 6) = 36$, so the image is 15 cm behind.",
        tags: ["light"],
        image: {
          src: lensWholeDistancesImage,
          caption: "For a lens of focal length 6 cm, 1/u + 1/v = 1/6 becomes (u − 6)(v − 6) = 36; an object 10 cm away gives a sharp image 15 cm behind.",
          alt: "A convex lens with a candle 10 cm in front and its upside-down image 15 cm behind, gold rays between them, focal points marked 6 cm either side, and the lines 1/10 + 1/15 = 1/6 and (10 − 6)(15 − 6) = 36.",
        },
      },
      {
        title: "Resistors in parallel",
        text: "Two resistors side by side act as one of resistance $R$ with $\\frac{1}{R_1} + \\frac{1}{R_2} = \\frac{1}{R}$, the same shape as the lens equation, so $(R_1 - R)(R_2 - R) = R^2$. To make 4 ohms from two whole-ohm resistors, factor 16: 5 and 20 ohms, 6 and 12, or 8 and 8.",
        tags: ["electrical"],
        image: {
          src: parallelResistorsImage,
          caption: "Two resistors in parallel make 4 ohms when (R₁ − 4)(R₂ − 4) = 16: 6 and 12 ohms work, as do 5 and 20, and 8 and 8.",
          alt: "A circuit with resistors of 6 Ω and 12 Ω on parallel branches equal to a single gold 4 Ω resistor, with the line (6 − 4)(12 − 4) = 16 and a note that 5 and 20, or 8 and 8, also work.",
        },
      },
    ],
  };
});
