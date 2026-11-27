// Squaring a sum, as an area. A square of side a + b splits into a², two
// a × b strips and b². Taking the strips off a square of side a leaves
// (a − b)², which counts the corner twice and has to add it back. Four
// strips round a small square give (a + b)² − (a − b)² = 4ab.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import punnettSquareAllelesImage from "../../images/punnett-square-alleles.svg";
import squaresEndingFiveImage from "../../images/squares-ending-five.svg";

const A2 = C.cyan;
const AB = C.violet;
const B2 = C.gold;
const O: Vec = { x: -6.8, y: -2.8 };
/** The longest side, in stage units, the figure may take. */
const ROOM = 6.4;

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 6, value: 4, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 4, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "The square of a sum",
        text: "A square of side $a + b$ cuts into a square $a^2$, a square $b^2$, and two strips $a$ by $b$. So $(a + b)^2 = a^2 + 2ab + b^2$. The middle term is the one people forget: $(a + b)^2$ is not $a^2 + b^2$, and the two strips are the difference.",
      },
      {
        title: "The square of a difference",
        text: "Start from a square of side $a$ and cut a strip $b$ wide off the top and another off the side. The two strips overlap in a $b \\times b$ corner, which has been taken away twice, so add it back once: $(a - b)^2 = a^2 - 2ab + b^2$. It is the same formula with $-b$ for $b$.",
      },
      {
        title: "Squaring in your head",
        text: "Split a number into an easy part and a small part. $51^2 = (50 + 1)^2 = 2500 + 100 + 1 = 2601$, and $49^2 = (50 - 1)^2 = 2500 - 100 + 1 = 2401$. The figure shows $(10a + b)^2$ with the pieces worked out, not drawn to scale.",
      },
      {
        title: "Four strips round a square",
        text: "Lay four $a \\times b$ strips round a square of side $a - b$, like a pinwheel. Together they fill a square of side $a + b$. So $(a + b)^2 - (a - b)^2 = 4ab$: two numbers' product is a quarter of the difference between the squares of their sum and their difference.",
      },
    ],

    draw(g, f) {
      const [x, y] = [a.value, b.value];
      const u = ROOM / (x + y);
      const at = (p: number, q: number): Vec => ({ x: O.x + p * u, y: O.y + q * u });
      const piece = (p0: number, q0: number, p1: number, q1: number, color: string, name: string, alpha = 1, fill = 0.25): void => {
        if (p1 - p0 <= 0 || q1 - q0 <= 0) return;
        g.polygon([at(p0, q0), at(p1, q0), at(p1, q1), at(p0, q1)], { color, fill: tint(color, fill), width: 2, alpha });
        if ((p1 - p0) * u > 0.9 && (q1 - q0) * u > 0.6) g.label(at((p0 + p1) / 2, (q0 + q1) / 2), name, { color, size: 16, bold: true, alpha });
      };
      const side = (p0: number, p1: number, text: string, q: number, below = true): void => {
        g.label(at((p0 + p1) / 2, q), text, { color: C.dim, size: 14, bold: true, dy: below ? -18 : 12 });
      };
      const left = (q0: number, q1: number, text: string): void => {
        g.label(at(0, (q0 + q1) / 2), text, { color: C.dim, size: 14, bold: true, dx: -10, align: "right" });
      };

      if (f.step === 0 || f.step === 2) {
        const big = f.step === 2;
        const [X, Y] = [10 * x, y];
        piece(0, 0, x, x, A2, big ? `${X * X}` : "a²");
        piece(x, 0, x + y, x, AB, big ? `${X * Y}` : "ab");
        piece(0, x, x, x + y, AB, big ? `${X * Y}` : "ab");
        piece(x, x, x + y, x + y, B2, big ? `${Y * Y}` : "b²");
        side(0, x, big ? String(X) : "a", 0);
        side(x, x + y, big ? String(Y) : "b", 0);
        left(0, x, big ? String(X) : "a");
        left(x, x + y, big ? String(Y) : "b");
        const sum = big ? `${X + Y}² = ${X * X} + ${2 * X * Y} + ${Y * Y} = ${(X + Y) ** 2}` : "(a + b)² = a² + 2ab + b²";
        g.label({ x: 1.2, y: 1.2 }, sum, { color: C.ink, size: big ? 17 : 19, bold: true, align: "left", alpha: f.at(f.step) });
        if (big) g.label({ x: 1.2, y: 0.3 }, "not to scale", { color: C.dim, size: 13, align: "left" });
        return;
      }

      if (f.step === 1) {
        if (x <= y) {
          piece(0, 0, x, x, A2, "a²");
          g.label({ x: 1.2, y: 1.2 }, "make a bigger than b", { color: C.red, size: 17, bold: true, align: "left" });
          return;
        }
        const t = f.at(1);
        g.polygon([at(0, 0), at(x, 0), at(x, x), at(0, x)], { color: A2, width: 2 });
        piece(0, 0, x - y, x - y, A2, "(a − b)²", 1, 0.3);
        piece(0, x - y, x, x, AB, "", t, 0.2);
        piece(x - y, 0, x, x, AB, "", t, 0.2);
        piece(x - y, x - y, x, x, B2, "b²", t, 0.45);
        g.label(at((x - y) / 2, x - y / 2), "ab", { color: AB, size: 15, bold: true, alpha: t });
        g.label(at(x - y / 2, (x - y) / 2), "ab", { color: AB, size: 15, bold: true, alpha: t });
        side(0, x - y, "a − b", 0);
        side(x - y, x, "b", 0);
        left(0, x, "a");
        g.label({ x: 1.2, y: 1.2 }, "(a − b)² = a² − 2ab + b²", { color: C.ink, size: 19, bold: true, align: "left" });
        g.label({ x: 1.2, y: 0.3 }, "the corner b² was taken off twice", { color: B2, size: 14, bold: true, align: "left", alpha: t });
        return;
      }

      // The pinwheel: four a × b strips round a square of side |a − b|.
      const n = x + y;
      const t = f.at(3);
      piece(0, 0, x, y, AB, "ab", t);
      piece(x, 0, n, x, AB, "ab", t);
      piece(y, x, n, n, AB, "ab", t);
      piece(0, y, y, n, AB, "ab", t);
      const [lo, hi] = [Math.min(x, y), Math.max(x, y)];
      piece(lo, lo, hi, hi, B2, "", 1, 0.4);
      g.polygon([at(0, 0), at(n, 0), at(n, n), at(0, n)], { color: C.ink, width: 2.5 });
      side(0, x, "a", 0);
      side(x, n, "b", 0);
      g.label({ x: 1.2, y: 1.2 }, "(a + b)² − (a − b)² = 4ab", { color: C.ink, size: 19, bold: true, align: "left" });
      if (x === y) g.label({ x: 1.2, y: 0.3 }, "a = b: the middle square vanishes", { color: B2, size: 14, bold: true, align: "left" });
    },

    readout(f) {
      const [x, y] = [a.value, b.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Square of the sum", tex: `(${x} + ${y})^2 = ${x * x} + ${2 * x * y} + ${y * y} = ${(x + y) ** 2}`, tone: "good" });
        rows.push({ label: "Not just the squares", tex: `${x}^2 + ${y}^2 = ${x * x + y * y} \\ne ${(x + y) ** 2}`, tone: "warn" });
      } else if (f.step === 1) {
        rows.push({ label: "Square of the difference", tex: `(${x} - ${y})^2 = ${x * x} - ${2 * x * y} + ${y * y} = ${(x - y) ** 2}`, tone: x > y ? "good" : "plain" });
      } else if (f.step === 2) {
        const X = 10 * x;
        rows.push({ label: "Up", tex: `${X + y}^2 = ${X * X} + ${2 * X * y} + ${y * y} = ${(X + y) ** 2}`, tone: "good" });
        rows.push({ label: "Down", tex: `${X - y}^2 = ${X * X} - ${2 * X * y} + ${y * y} = ${(X - y) ** 2}` });
      } else {
        rows.push({ label: "Pinwheel", tex: `${(x + y) ** 2} - ${(x - y) ** 2} = ${4 * x * y} = 4 \\cdot ${x} \\cdot ${y}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Widening a square patio",
        text: "Add a 1 m border along two sides of a 4 m square patio and it becomes 5 m square: 16 m² grows to 25 m². The new 9 m² is two 4 by 1 strips and a 1 by 1 corner, $2 \\cdot 4 + 1$, not just the 1 m² you might guess.",
      },
      {
        title: "A bigger order",
        text: "Ten boxes of ten cost 100 dollars at a dollar each. Eleven boxes of eleven make $11^2 = 121$: the original 100, a strip of 10 for the extra box, a strip of 10 for the extra item in each old box, and 1 for the extra item in the new box.",
      },
    ],

    uses: [
      {
        title: "Squaring numbers that end in 5",
        text: "To square a number ending in 5, multiply its tens digit by one more than itself and write 25 after: $35^2$ is $3 \\cdot 4 = 12$, then 25, so 1225. It works because $(10n + 5)^2 = 100n^2 + 100n + 25 = 100\\,n(n + 1) + 25$.",
        tags: ["trade-tricks"],
        image: {
          src: squaresEndingFiveImage,
          caption: "35² = (30 + 5)² = 900 + 300 + 25 = 1225; the shortcut multiplies 3 × 4 = 12 and writes 25 after it.",
          alt: "A 35 by 35 square split into a 30 by 30 square (900), two 30 by 5 strips (150 each) and a gold 5 by 5 corner (25), beside the lines (30 + 5)² = 900 + 300 + 25, 3 × 4 = 12 and 35² = 1225.",
        },
      },
      {
        title: "Gene frequencies",
        text: "If a gene comes in two versions with shares $p$ and $q$ of a population, $p + q = 1$, then with random mating the shares of the three pairings are the pieces of $(p + q)^2 = p^2 + 2pq + q^2$. With $p = 0.7$, 49% carry two of the first version, 42% one of each and 9% two of the second. Geneticists call this the Hardy–Weinberg principle.",
        tags: ["nature", "health"],
        image: {
          src: punnettSquareAllelesImage,
          caption: "With allele frequencies p = 0.7 and q = 0.3, a Punnett square gives (p + q)² = 0.49 + 0.42 + 0.09 = 1.",
          alt: "A square split 0.7 and 0.3 along each side into cells pp 0.49, two gold pq cells of 0.21 and qq 0.09, beside the line (p + q)² = 0.49 + 0.42 + 0.09 = 1.",
        },
      },
    ],
  };
});
