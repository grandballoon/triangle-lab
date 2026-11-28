// Convincing but wrong. Three arguments that look sound and are not: a
// pattern (regions of a circle cut by chords go 1, 2, 4, 8, 16, then 31), a
// picture (four pieces rearranged seem to lose a square, because neither
// "triangle" is one), and a line of algebra that quietly divides by zero.
// Each shows why every step of a proof must be checked.

import { C, tint } from "../draw.ts";
import { polar, TAU, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import polyaConjectureCountImage from "../../images/polya-conjecture-count.svg";
import bomberSurvivorHolesImage from "../../images/bomber-survivor-holes.svg";

const CHORD = C.cyan;
const GUESS = C.dim;
const TRUE = C.gold;
const BAD = C.red;

const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};
/** Regions of a circle cut by every chord between n points, no three chords meeting inside. */
const regions = (n: number): number => choose(n, 4) + choose(n, 2) + 1;

// The four pieces, in grid units, in each arrangement of the 13 by 5 "triangle".
type Piece = { color: string; a: [number, number][]; b: [number, number][] };
const PIECES: Piece[] = [
  { color: C.red, a: [[0, 0], [8, 0], [8, 3]], b: [[5, 2], [13, 2], [13, 5]] },
  { color: C.blue, a: [[8, 3], [13, 3], [13, 5]], b: [[0, 0], [5, 0], [5, 2]] },
  { color: C.orange, a: [[8, 0], [13, 0], [13, 1], [10, 1], [10, 2], [8, 2]], b: [[5, 0], [10, 0], [10, 1], [7, 1], [7, 2], [5, 2]] },
  { color: C.green, a: [[10, 1], [13, 1], [13, 3], [8, 3], [8, 2], [10, 2]], b: [[10, 0], [13, 0], [13, 2], [8, 2], [8, 1], [10, 1]] },
];

export default lesson((s) => {
  const n = s.slider({ label: "points on the circle:", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 7, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "A pattern that breaks",
        text: "Put $n$ points on a circle and join every pair by a chord. One point leaves 1 region, then 2, 4, 8 and 16. Doubling seems certain, and the guess for six points is 32. It is 31. The true count is $\\binom{n}{4} + \\binom{n}{2} + 1$, which only matches $2^{n-1}$ up to five points. A pattern is a reason to look for a proof, not a proof.",
      },
      {
        title: "A square goes missing",
        text: "Four pieces fill a 13 by 5 triangle. Rearrange them inside the same outline and a 1 by 1 hole appears. The areas add to $12 + 5 + 7 + 8 = 32$ either way, so where did the square go? The picture is convincing, and that is the problem: it hides an assumption.",
      },
      {
        title: "The assumption",
        text: "Neither shape is a triangle. The red slope is $\\frac{3}{8} = 0.375$ and the blue is $\\frac{2}{5} = 0.4$, so the long side bends: inward in the first shape, outward in the second. A true triangle would have area $\\frac{13 \\times 5}{2} = 32.5$; the two outlines differ by a thin sliver of area 1, which is exactly the hole.",
      },
      {
        title: "A step that is not allowed",
        text: "Let $a = b$. Then $a^2 = ab$, so $a^2 - b^2 = ab - b^2$, and $(a + b)(a - b) = b(a - b)$. Cancel $a - b$: $a + b = b$, so $2b = b$ and $2 = 1$. Every line looks routine, but cancelling $a - b$ divides by zero, since $a - b = 0$. One bad step spoils the whole proof, which is why each one must be checked.",
      },
    ],

    draw(g, f) {
      if (f.step === 0) {
        const N = n.value;
        const O: Vec = { x: -4, y: 0.7 };
        const r = 3.1;
        const pts = Array.from({ length: N }, (_, i) => {
          const t = (i * TAU) / N + 0.5 + 0.22 * Math.sin(i * 2.3 + 1);
          return polar(O, r, t);
        });
        g.circle(O, r, { color: C.ink, fill: tint(CHORD, 0.08), width: 2.5 });
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) g.segment(pts[i], pts[j], { color: CHORD, width: 2, alpha: f.at(0) });
        for (const p of pts) g.point(p, { color: TRUE, r: 6 });
        g.label({ x: O.x, y: O.y + r + 0.45 }, `${N} point${N === 1 ? "" : "s"}: ${regions(N)} region${regions(N) === 1 ? "" : "s"}`, { color: TRUE, size: 17, bold: true });

        // The table: what doubling predicts against the truth.
        const x = [1.2, 3.4, 5.8];
        g.label({ x: x[0], y: 4.0 }, "points", { color: C.dim, size: 14, bold: true });
        g.label({ x: x[1], y: 4.0 }, "2ⁿ⁻¹", { color: GUESS, size: 14, bold: true });
        g.label({ x: x[2], y: 4.0 }, "regions", { color: TRUE, size: 14, bold: true });
        for (let k = 1; k <= 7; k++) {
          const y = 4.0 - k * 0.78;
          const lit = k === N;
          const wrong = 2 ** (k - 1) !== regions(k);
          g.label({ x: x[0], y }, String(k), { color: lit ? C.ink : C.dim, size: 16, bold: true });
          g.label({ x: x[1], y }, String(2 ** (k - 1)), { color: GUESS, size: 16, bold: true });
          g.label({ x: x[2], y }, String(regions(k)), { color: wrong ? BAD : TRUE, size: 16, bold: true });
          if (lit) g.polygon([{ x: 0.5, y: y - 0.32 }, { x: 6.8, y: y - 0.32 }, { x: 6.8, y: y + 0.32 }, { x: 0.5, y: y + 0.32 }], { color: TRUE, width: 1.5 });
        }
        return;
      }

      if (f.step <= 2) {
        const u = 0.54;
        const origins: Vec[] = [
          { x: -7.4, y: -0.6 },
          { x: 0.4, y: -0.6 },
        ];
        origins.forEach((o, side) => {
          const at = ([x, y]: [number, number]): Vec => ({ x: o.x + x * u, y: o.y + y * u });
          for (let x = 0; x <= 13; x++) g.segment(at([x, 0]), at([x, 5]), { color: C.faint, width: 1 });
          for (let y = 0; y <= 5; y++) g.segment(at([0, y]), at([13, y]), { color: C.faint, width: 1 });
          for (const p of PIECES) {
            const pts = (side === 0 ? p.a : p.b).map(at);
            g.polygon(pts, { color: p.color, fill: tint(p.color, 0.4), width: 2 });
          }
          if (side === 1) {
            g.polygon([at([7, 1]), at([8, 1]), at([8, 2]), at([7, 2])], { color: TRUE, fill: tint(TRUE, 0.5 * f.at(1)), width: 3 });
            g.arrow(at([3.6, 3.6]), at([7.3, 1.7]), { color: TRUE, width: 2, alpha: f.at(1) });
            g.label(at([3.4, 3.6]), "hole", { color: TRUE, size: 14, bold: true, align: "right", alpha: f.at(1) });
          }
          if (f.step === 2) {
            g.segment(at([0, 0]), at([13, 5]), { color: C.ink, width: 2, dash: [6, 5], alpha: f.at(2) });
            const corner = side === 0 ? at([8, 3]) : at([5, 2]);
            g.circle(corner, 0.22, { color: TRUE, width: 2.5, alpha: f.at(2) });
            g.label(corner, side === 0 ? "bends in" : "bends out", { color: TRUE, size: 13, bold: true, dx: side === 0 ? -6 : 6, dy: 18, align: side === 0 ? "right" : "left", alpha: f.at(2) });
          }
          g.label({ x: o.x + 6.5 * u, y: o.y - 0.5 }, side === 0 ? "12 + 5 + 7 + 8 = 32" : "the same pieces, and a hole", { color: C.dim, size: 14, bold: true });
        });
        if (f.step === 2) {
          g.label({ x: 0, y: 3.9 }, "red slope 3/8 = 0.375   blue slope 2/5 = 0.4", { color: C.ink, size: 16, bold: true, alpha: f.at(2) });
          g.label({ x: 0, y: -2.3 }, "neither outline is a triangle: they differ by area 1", { color: TRUE, size: 15, bold: true, alpha: f.at(2) });
        } else {
          g.label({ x: 0, y: 3.9 }, "two 13 by 5 triangles?", { color: C.ink, size: 17, bold: true });
        }
        return;
      }

      const lines: [string, string][] = [
        ["a = b", C.ink],
        ["a² = ab", C.ink],
        ["a² − b² = ab − b²", C.ink],
        ["(a + b)(a − b) = b(a − b)", C.ink],
        ["a + b = b        ÷ (a − b), and a − b = 0", BAD],
        ["2b = b", C.dim],
        ["2 = 1", C.dim],
      ];
      lines.forEach(([text, color], i) => {
        const alpha = Math.min(1, f.at(3) * lines.length - i + 1);
        g.label({ x: -5.6, y: 3.8 - i * 0.85 }, text, { color, size: 18, bold: true, align: "left", alpha });
      });
    },

    readout(f) {
      const N = n.value;
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Guess", tex: `2^{${N} - 1} = ${2 ** (N - 1)}`, tone: "dim" });
        rows.push({ label: "Truth", tex: `\\binom{${N}}{4} + \\binom{${N}}{2} + 1 = ${regions(N)}`, tone: regions(N) === 2 ** (N - 1) ? "good" : "warn" });
      } else if (f.step <= 2) {
        rows.push({ label: "Pieces", tex: "12 + 5 + 7 + 8 = 32" });
        if (f.step === 2) rows.push({ label: "Slopes", tex: "\\tfrac{3}{8} \\ne \\tfrac{2}{5}", tone: "warn" });
      } else {
        rows.push({ label: "Bad step", tex: "a - b = 0, \\text{ so dividing by it is not allowed}", tone: "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "A magic trick",
        text: "A good trick looks impossible because it hides one move. The audience follows every step they see; the step they do not see is where it happens. A false proof works the same way.",
      },
      {
        title: "A drawing that tricks the eye",
        text: "Two lines can look different lengths because of the arrows on their ends, and a ruler shows they are equal. A picture suggests; a measurement or a proof decides.",
      },
    ],

    uses: [
      {
        title: "A conjecture checked to millions",
        text: "Pólya guessed that, up to any number, at least half the numbers have an odd count of prime factors (counted with repeats). Checks up to millions agreed. It is false, and the first number where it fails is 906,150,257. Computer searches that find no exceptions are evidence, but only a proof covers every case.",
        tags: ["computing"],
        image: {
          src: polyaConjectureCountImage,
          caption: "Pólya's guess holds for every number tried up to 906,150,256 and fails at 906,150,257.",
          alt: "A line graph that stays below zero for a long stretch, then pokes just above the axis at the far right, at a gold point marked 906,150,257.",
        },
      },
      {
        title: "Armour where the holes are",
        text: "In the Second World War, planes came back with bullet holes mostly in the wings and body, and the obvious argument was to armour those places. The statistician Abraham Wald saw the hidden assumption: these were the planes that survived. Planes hit in the engines did not return, so the engines were the places that needed armour.",
        tags: ["machines", "travel"],
        image: {
          src: bomberSurvivorHolesImage,
          caption: "Holes on returning planes show where a plane can be hit and survive; the clean engines were where hits were fatal.",
          alt: "The outline of a four-engine plane seen from above, with dots for bullet holes scattered over the wings and body and none on the engines, which are outlined in gold.",
        },
      },
    ],
  };
});
