// The difference of squares. Cut a b × b corner out of an a × a square and
// the L that is left slides into an (a + b) × (a − b) rectangle. That turns
// products into differences of squares for mental arithmetic, factors
// x² − 9, and shows the odd numbers stacking up into squares.

import { C, tint } from "../draw.ts";
import { rotateAbout, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import pictureFrameMatImage from "../../images/picture-frame-mat.svg";
import pipeWallCrossSectionImage from "../../images/pipe-wall-cross-section.svg";

const KEEP = C.cyan;
const MOVE = C.violet;
const GONE = C.red;
const GOLD = C.gold;
const O: Vec = { x: -7, y: -2.8 };

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 7, value: 5, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 6, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "Cut out a corner",
        text: "Take a square of side $a$ and cut a square of side $b$ out of its corner. What is left, an L shape, has area $a^2 - b^2$. Cut the L along the dashed line into a wide piece, $a$ by $a - b$, and a narrow one, $a - b$ by $b$.",
      },
      {
        title: "Slide the strip",
        text: "Turn the narrow piece and stand it at the end of the wide one. They make a rectangle $a + b$ long and $a - b$ tall, with no area gained or lost. So $a^2 - b^2 = (a + b)(a - b)$: a difference of squares always factors.",
      },
      {
        title: "Products as differences",
        text: "Two numbers the same distance either side of a round number multiply as a difference of squares: $47 \\cdot 53 = (50 - 3)(50 + 3) = 2500 - 9 = 2491$. Going the other way, $x^2 - 9 = (x + 3)(x - 3)$, so its roots are $\\pm 3$, and $x^4 - 1 = (x^2 + 1)(x + 1)(x - 1)$.",
      },
      {
        title: "Odd numbers make squares",
        text: "One square less another one smaller is $(n + 1)^2 - n^2 = (n + 1) + n = 2n + 1$, an odd number. So each L-shaped layer in the figure holds the next odd number, and the first $a$ odd numbers add up to a square: $1 + 3 + 5 + \\cdots + (2a - 1) = a^2$.",
      },
    ],

    draw(g, f) {
      const [x, y0] = [a.value, b.value];
      const y = Math.min(y0, x - 1);
      const u = Math.min(6.6 / x, 7.4 / (x + y));
      const at = (p: number, q: number): Vec => ({ x: O.x + p * u, y: O.y + q * u });
      const rect = (p0: number, q0: number, p1: number, q1: number): Vec[] => [at(p0, q0), at(p1, q0), at(p1, q1), at(p0, q1)];
      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: 0.8, y: 2.2 - row * 0.9 }, text, { color, size: 18, bold: true, align: "left", alpha });
      };

      if (f.step === 3) {
        // Nested squares 1, 2, …, a, each new layer an L of 2k − 1 cells.
        const v = Math.min(6.6 / x, 0.9);
        const cell = (p: number, q: number): Vec[] => [0, 1].flatMap((i) => [0, 1].map((j) => ({ x: O.x + (p + (i ^ j)) * v, y: O.y + (q + i) * v })));
        for (let k = 1; k <= x; k++) {
          const color = k % 2 ? KEEP : C.orange;
          const alpha = Math.min(1, f.at(3) * x - k + 1.5);
          for (let i = 0; i < k; i++) {
            for (const [p, q] of i === k - 1 ? [[i, k - 1]] : [[i, k - 1], [k - 1, i]]) {
              g.polygon(cell(p, q), { color, fill: tint(color, 0.4), width: 1.5, alpha });
            }
          }
          g.label({ x: O.x + (k - 0.5) * v, y: O.y + (k - 0.5) * v }, String(2 * k - 1), { color: C.ink, size: 13, bold: true, alpha });
        }
        const odds = Array.from({ length: x }, (_, i) => 2 * i + 1);
        note(0, `${odds.join(" + ")} = ${x}²`, GOLD);
        note(1, `(n + 1)² − n² = 2n + 1`, C.ink);
        return;
      }

      const slide = f.step === 0 ? 0 : f.at(1);
      const h = x - y;
      // The wide piece stays put.
      g.polygon(rect(0, 0, x, h), { color: KEEP, fill: tint(KEEP, 0.25), width: 2 });
      // The corner that is cut away, shown only before the slide.
      g.polygon(rect(h, h, x, x), { color: GONE, width: 2, dash: [6, 5], alpha: 1 - slide });
      if (slide < 0.5) g.label(at(h + y / 2, h + y / 2), "b²", { color: GONE, size: 16, bold: true, alpha: 1 - 2 * slide });
      // The narrow piece, turned a quarter turn about the centre that carries
      // it from on top of the wide piece to its far end.
      const from = { x: h / 2, y: h + y / 2 };
      const to = { x: x + y / 2, y: h / 2 };
      // For a −90° turn, the centre c solves (I − R)c = to − R·from, where R(p, q) = (q, −p).
      const rhs = { x: to.x - from.y, y: to.y + from.x };
      const centre = at((rhs.x + rhs.y) / 2, (rhs.y - rhs.x) / 2);
      const moved = rect(0, h, h, x).map((p) => rotateAbout(p, centre, (-Math.PI / 2) * slide));
      g.polygon(moved, { color: MOVE, fill: tint(MOVE, 0.25), width: 2 });
      if (f.step === 0) g.segment(at(0, h), at(h, h), { color: C.ink, width: 2, dash: [5, 5] });

      if (slide < 0.05) {
        g.label(at(x / 2, 0), "a", { color: C.dim, size: 15, bold: true, dy: -18 });
        g.label(at(0, x / 2), "a", { color: C.dim, size: 15, bold: true, dx: -12, align: "right" });
        g.label(at(h + y / 2, x), "b", { color: GONE, size: 15, bold: true, dy: 12 });
      } else if (slide > 0.95) {
        g.label(at((x + y) / 2, 0), "a + b", { color: GOLD, size: 15, bold: true, dy: -18 });
        g.label(at(0, h / 2), "a − b", { color: GOLD, size: 15, bold: true, dx: -12, align: "right" });
      }

      if (f.step === 0) {
        note(0, "a² − b²", C.ink);
        note(1, `${x}² − ${y}² = ${x * x - y * y}`, KEEP);
      } else if (f.step === 1) {
        note(0, "a² − b² = (a + b)(a − b)", C.ink);
        note(1, `${x * x - y * y} = ${x + y} × ${x - y}`, GOLD, slide);
      } else {
        const [m, d] = [10 * x, y];
        note(0, `${m - d} × ${m + d}`, C.ink);
        note(1, `= ${m}² − ${d}²`, C.ink);
        note(2, `= ${m * m} − ${d * d} = ${m * m - d * d}`, GOLD, f.at(2));
      }
      if (y0 >= x) g.label({ x: 0.8, y: -1.6 }, `b must be less than a: using b = ${y}`, { color: C.red, size: 14, bold: true, align: "left" });
    },

    readout(f) {
      const x = a.value;
      const y = Math.min(b.value, x - 1);
      const rows: Readout[] = [];
      if (f.step <= 1) {
        rows.push({ label: "Difference of squares", tex: `${x}^2 - ${y}^2 = ${x * x - y * y} = ${x + y} \\cdot ${x - y}`, tone: "good" });
      } else if (f.step === 2) {
        const m = 10 * x;
        rows.push({ label: "Mental product", tex: `${m - y} \\cdot ${m + y} = ${m}^2 - ${y}^2 = ${m * m - y * y}`, tone: "good" });
        rows.push({ label: "Factoring", tex: `x^2 - ${y * y} = (x + ${y})(x - ${y})` });
      } else {
        rows.push({ label: "Odd numbers", tex: `${Array.from({ length: x }, (_, i) => 2 * i + 1).join(" + ")} = ${x * x}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Trading a square for a rectangle",
        text: "A square field 50 m on a side and a rectangle 53 m by 47 m have the same perimeter, but the rectangle is 9 m² smaller, $50^2 - 3^2$. Of all rectangles with a given perimeter, the square holds the most.",
      },
      {
        title: "A hollow square of soldiers",
        text: "A marching band stands in a 12 by 12 square with an 8 by 8 space empty in the middle. Rather than count the edge, take $144 - 64 = (12 + 8)(12 - 8) = 80$ players.",
      },
    ],

    uses: [
      {
        title: "The area of a frame",
        text: "A square frame 30 cm across with a 24 cm opening uses $30^2 - 24^2$ square centimetres of wood. Factoring makes it easy: $(30 + 24)(30 - 24) = 54 \\cdot 6 = 324$ cm², the same as one long strip 54 cm by 6 cm, which is how a framer might cut it.",
        tags: ["carpentry", "art"],
        image: {
          src: pictureFrameMatImage,
          caption: "A frame 30 cm square with a 24 cm opening has area 30² − 24² = (30 + 24)(30 − 24) = 54 × 6 = 324 cm².",
          alt: "A square gold picture frame, outer side 30 cm, around a 24 cm opening holding a picture of hills and a moon, beside the lines 30² − 24² = (30 + 24)(30 − 24) = 54 × 6 = 324 cm².",
        },
      },
      {
        title: "The wall of a pipe",
        text: "The metal in a pipe's cross-section is a ring, the outer circle less the inner: $\\pi R^2 - \\pi r^2 = \\pi(R + r)(R - r)$. For radii 5 cm and 4 cm that is $\\pi \\cdot 9 \\cdot 1 = 9\\pi \\approx 28.3$ cm², the wall thickness times the sum of the radii.",
        tags: ["plumbing"],
        image: {
          src: pipeWallCrossSectionImage,
          caption: "A pipe of outer radius 5 cm and inner radius 4 cm has a wall of area π(5² − 4²) = π(5 + 4)(5 − 4) = 9π ≈ 28.3 cm².",
          alt: "The cross-section of a pipe, a gold ring with radii 5 cm to the outer edge and 4 cm to the inner, beside the lines π(5² − 4²) = π(5 + 4)(5 − 4) = 9π ≈ 28.3 cm².",
        },
      },
    ],
  };
});
