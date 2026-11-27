// Sums and differences of cubes. Take a b-cube out of the corner of an
// a-cube and the rest splits into three slabs, each a − b thick, with faces
// a², ab and b². So a³ − b³ = (a − b)(a² + ab + b²), and putting −b for b
// gives a³ + b³ = (a + b)(a² − ab + b²).

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import coolerWallVolumeImage from "../../images/cooler-wall-volume.svg";
import repeatedDigits1001Image from "../../images/repeated-digits-1001.svg";

const SLABS = [C.cyan, C.violet, C.pink];
const GONE = C.gold;
/** cos 30°, for the isometric view. */
const ISO = Math.sqrt(3) / 2;

type Box = { lo: [number, number, number]; hi: [number, number, number] };

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 6, value: 4, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 5, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "A cube with a corner gone",
        text: "Take a cube of side $a$ and cut a cube of side $b$ out of its top corner. What is left has volume $a^3 - b^3$. To find a factor, cut it into pieces that all share one measurement.",
      },
      {
        title: "Three slabs",
        text: "Slice it into three slabs, each $a - b$ thick: a bottom slab $a$ by $a$, a back slab $a$ by $b$, and a small slab $b$ by $b$. Their volumes are $(a - b)a^2$, $(a - b)ab$ and $(a - b)b^2$, so $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$.",
      },
      {
        title: "Sums of cubes",
        text: "Put $-b$ for $b$: since $(-b)^3 = -b^3$, $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$. A sum of cubes factors, though a sum of squares does not. For example $10^3 + 1 = 1001 = 11 \\cdot 91$, and $x^3 - 1 = (x - 1)(x^2 + x + 1)$.",
      },
    ],

    draw(g, f) {
      const x = a.value;
      const y = Math.min(b.value, x - 1);
      const h = x - y;
      const u = 2.9 / x;
      const base: Vec = { x: -3.2, y: 0.5 };
      // x runs to the right and forward, z to the left and forward, y up.
      const put = (p: number, q: number, r: number, shift: Vec): Vec => ({
        x: base.x + shift.x + ISO * (p - r) * u,
        y: base.y + shift.y + (q - 0.5 * (p + r)) * u,
      });
      const cuboid = ({ lo, hi }: Box, color: string, shift: Vec, o: { alpha?: number; dash?: number[]; fill?: number } = {}): void => {
        const [x0, y0, z0] = lo;
        const [x1, y1, z1] = hi;
        if (x1 <= x0 || y1 <= y0 || z1 <= z0) return;
        const P = (p: number, q: number, r: number): Vec => put(p, q, r, shift);
        const faces: [Vec[], number][] = [
          [[P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], 0.4],
          [[P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], 0.25],
          [[P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], 0.15],
        ];
        for (const [pts, shade] of faces) {
          g.polygon(pts, { color, fill: o.dash ? undefined : tint(color, o.fill ?? shade), width: 2, alpha: o.alpha, dash: o.dash });
        }
      };

      const apart = f.step === 0 ? 0 : f.step === 1 ? f.at(1) : 1;
      const slabs: Box[] = [
        { lo: [0, 0, 0], hi: [x, h, x] },
        { lo: [0, h, 0], hi: [h, x, x] },
        { lo: [h, h, 0], hi: [x, x, h] },
      ];
      const shifts: Vec[] = [
        { x: 0, y: -0.7 * apart },
        { x: -0.9 * apart, y: 0.35 * apart },
        { x: 0.9 * apart, y: 0.35 * apart },
      ];
      slabs.forEach((box, i) => cuboid(box, SLABS[i], shifts[i]));
      if (f.step === 0) cuboid({ lo: [h, h, h], hi: [x, x, x] }, GONE, { x: 0, y: 0 }, { dash: [5, 4] });

      // Each slab's face, labelled once the slabs part.
      const names = ["a²", "ab", "b²"];
      const centres: [number, number, number][] = [
        [x / 2, h, x / 2],
        [h / 2, x, x / 2],
        [(h + x) / 2, x, h / 2],
      ];
      if (f.step >= 1) {
        centres.forEach(([p, q, r], i) => g.label(put(p, q, r, shifts[i]), names[i], { color: SLABS[i], size: 16, bold: true, alpha: apart }));
      }
      g.label(put(x, 0, x / 2, shifts[0]), "a − b", { color: C.dim, size: 13, bold: true, dx: 34, dy: 4, align: "left", alpha: f.step >= 1 ? apart : 0 });

      const lines: [string, string][] =
        f.step === 0
          ? [["a³ − b³", C.ink], [`${x}³ − ${y}³ = ${x ** 3 - y ** 3}`, C.ink]]
          : f.step === 1
            ? [["a³ − b³", C.ink], ["= (a − b)(a² + ab + b²)", C.ink], [`= ${h} × (${x * x} + ${x * y} + ${y * y})`, GONE]]
            : [["a³ + b³", C.ink], ["= (a + b)(a² − ab + b²)", C.ink], [`${x ** 3 + y ** 3} = ${x + y} × ${x * x - x * y + y * y}`, GONE]];
      lines.forEach(([text, color], i) => g.label({ x: 1.6, y: 2.4 - i * 0.9 }, text, { color, size: 18, bold: true, align: "left", alpha: i === lines.length - 1 ? f.at(f.step) : 1 }));
      if (b.value >= x) g.label({ x: 1.6, y: -1.6 }, `b must be less than a: using b = ${y}`, { color: C.red, size: 14, bold: true, align: "left" });
    },

    readout(f) {
      const x = a.value;
      const y = Math.min(b.value, x - 1);
      const rows: Readout[] = [];
      if (f.step <= 1) {
        rows.push({ label: "Slab volumes", tex: `${x - y} \\cdot ${x * x} + ${x - y} \\cdot ${x * y} + ${x - y} \\cdot ${y * y} = ${x ** 3 - y ** 3}` });
        rows.push({ label: "Difference of cubes", tex: `${x}^3 - ${y}^3 = ${x - y} \\cdot ${x * x + x * y + y * y}`, tone: "good" });
      } else {
        rows.push({ label: "Sum of cubes", tex: `${x}^3 + ${y}^3 = ${x ** 3 + y ** 3} = ${x + y} \\cdot ${x * x - x * y + y * y}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Peeling an onion of cubes",
        text: "A 4 × 4 × 4 block of sugar cubes with a 3 × 3 × 3 block inside has $64 - 27 = 37$ cubes in its outer shell on three sides, and $(4 - 3)(16 + 12 + 9) = 37$ counts them as three slabs one cube thick.",
      },
      {
        title: "Not like squares",
        text: "A sum of two squares, $a^2 + b^2$, never splits into real linear factors; a sum of two cubes always does. Odd powers behave like cubes: $a^5 + b^5$ has the factor $a + b$ too.",
      },
    ],

    uses: [
      {
        title: "The walls of a cooler",
        text: "A cube-shaped cooler 50 cm on a side with a 40 cm space inside has walls of volume $50^3 - 40^3$. Factored, that is $10 \\cdot (2500 + 2000 + 1600) = 61\\,000$ cm³ of foam, more than half the inside's 64 000 cm³: thick walls on a small box cost a lot of material.",
        tags: ["home"],
        image: {
          src: coolerWallVolumeImage,
          caption: "A cooler 50 cm on a side with a 40 cm space inside has walls of 50³ − 40³ = 10 × (2500 + 2000 + 1600) = 61 000 cm³.",
          alt: "A cube-shaped cooler 50 cm on a side with its lid open, a gold rim of 5 cm walls round a 40 cm opening, beside the lines 50³ − 40³ = 10 × 6100 = 61 000 cm³.",
        },
      },
      {
        title: "Numbers that repeat",
        text: "Any six-digit number made of three digits written twice, such as 123123, is that three-digit number times 1001. And $1001 = 10^3 + 1 = (10 + 1)(100 - 10 + 1) = 11 \\cdot 91 = 7 \\cdot 11 \\cdot 13$, so every such number is divisible by 7, 11 and 13, a favourite party trick.",
        tags: ["trade-tricks"],
        image: {
          src: repeatedDigits1001Image,
          caption: "Any number written abcabc is abc × 1001, and 1001 = 10³ + 1 = 7 × 11 × 13, so 123123 is divisible by 7, 11 and 13.",
          alt: "The number 123123, the second 123 in gold, above the lines 123 × 1001 and 1001 = 10³ + 1 = 7 × 11 × 13, with 7, 11 and 13 in gold.",
        },
      },
    ],
  };
});
