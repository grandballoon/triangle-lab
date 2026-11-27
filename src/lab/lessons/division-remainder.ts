// Division with remainder. Lay a dots out in columns of b: q full columns
// and r left over, so a = qb + r with 0 ≤ r < b. Each full column is a hop of
// b along the number line, b divides a when nothing is left over, and the
// numbers that leave the same remainder sit exactly b apart.

import { C } from "../draw.ts";
import { clamp } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import eggCartonsRemainderImage from "../../images/egg-cartons-remainder.svg";
import wallTilesRemainderImage from "../../images/wall-tiles-remainder.svg";

const FULL = C.cyan;
const LEFT = C.red;
const HOP = C.gold;
const SAME = C.pink;
const TOP = 60;
const X0 = -7;
/** Stage units per unit along the number line. */
const PER = 14 / TOP;
const LINE_Y = -2.4;
const DOTS_Y = -1.4;

const at = (v: number): { x: number; y: number } => ({ x: X0 + v * PER, y: LINE_Y });

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: TOP, value: 23, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 12, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "Hops of b",
        text: "Lay $a$ dots out in columns of $b$. Each full column is one hop of $b$ along the number line, so the hops land on the multiples of $b$: $0, b, 2b, 3b, \\ldots$ When $a$ is one of them, $b$ divides $a$, written $b \\mid a$: then $a = qb$ for a whole number $q$.",
      },
      {
        title: "Quotient and remainder",
        text: "Usually the last column is short. Then $a = qb + r$, where the quotient $q$ counts the full columns and the remainder $r$ counts the dots left over, with $0 \\le r < b$. For $a = 23$ and $b = 5$, $23 = 4 \\cdot 5 + 3$. There is only one such $q$ and $r$: one more full column would need more dots than are left.",
      },
      {
        title: "Remainders repeat",
        text: "The pink marks are the numbers that leave the same remainder as $a$: $r, r + b, r + 2b, \\ldots$ They sit exactly $b$ apart, so two numbers leave the same remainder exactly when their difference is a multiple of $b$. This is the idea behind clock arithmetic.",
      },
    ],

    draw(g, f) {
      const [A, B] = [a.value, b.value];
      const q = Math.floor(A / B);
      const r = A - q * B;

      // The number line.
      g.segment(at(0), at(TOP), { color: C.dim, width: 2 });
      for (let v = 0; v <= TOP; v++) {
        const big = v % 10 === 0;
        g.segment({ x: at(v).x, y: LINE_Y - (big ? 0.18 : 0.08) }, { x: at(v).x, y: LINE_Y + (big ? 0.18 : 0.08) }, { color: C.dim, width: big ? 2 : 1 });
        if (big) g.label(at(v), String(v), { color: C.dim, size: 12, dy: -20 });
      }
      if (f.step === 2) {
        for (let v = r; v <= TOP; v += B) g.point(at(v), { color: SAME, r: 4.5, alpha: f.at(2) });
      }
      for (let v = 0; v <= TOP; v += B) {
        g.segment({ x: at(v).x, y: LINE_Y - 0.25 }, { x: at(v).x, y: LINE_Y + 0.25 }, { color: HOP, width: 2 });
      }
      for (let k = 0; k < q; k++) {
        g.arc({ x: at((k + 0.5) * B).x, y: LINE_Y }, (B * PER) / 2, 0, Math.PI, { color: HOP, width: 2 });
      }
      if (f.step >= 1 && r > 0) {
        g.segment({ x: at(q * B).x, y: LINE_Y + 0.35 }, { x: at(A).x, y: LINE_Y + 0.35 }, { color: LEFT, width: 4, alpha: f.at(1) });
      }
      g.point(at(A), { color: C.ink, r: 5 });
      g.label(at(A), `a = ${A}`, { color: C.ink, size: 14, bold: true, dy: -38 });

      // The dots, column k standing over the hop from kb to (k + 1)b.
      const sy = Math.min(0.5, 5.6 / B);
      const radius = clamp(B * PER * 14, 2.5, 6);
      for (let i = 0; i < A; i++) {
        const [col, row] = [Math.floor(i / B), i % B];
        const inFull = col < q;
        const x = inFull ? at((col + 0.5) * B).x : at(q * B + 0.5 * r).x;
        const color = inFull ? FULL : f.step >= 1 ? LEFT : FULL;
        g.point({ x, y: DOTS_Y + row * sy }, { color, r: radius });
      }
      const top = DOTS_Y + (B - 1) * sy;
      g.label({ x: at((q * B) / 2).x, y: top }, q === 1 ? "1 column of b" : `${q} columns of ${B}`, { color: FULL, size: 14, bold: true, dy: 22 });
      if (f.step >= 1 && r > 0) {
        g.label({ x: at(q * B + r / 2).x, y: DOTS_Y + (r - 1) * sy }, `${r} left`, { color: LEFT, size: 14, bold: true, dx: 8, dy: 18, align: "left", alpha: f.at(1) });
      }
    },

    readout(f) {
      const [A, B] = [a.value, b.value];
      const q = Math.floor(A / B);
      const r = A - q * B;
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Multiples of b", tex: `${B}, ${2 * B}, ${3 * B}, \\ldots` });
        rows.push(r === 0 ? { label: "Divides", tex: `${B} \\mid ${A}:\\quad ${A} = ${q} \\cdot ${B}`, tone: "good" } : { label: "Does not divide", tex: `${B} \\nmid ${A}`, tone: "warn" });
      } else if (f.step === 1) {
        rows.push({ label: "Division", tex: `${A} = ${q} \\cdot ${B} + ${r}`, tone: "good" });
        rows.push({ label: "Quotient, remainder", tex: `q = ${q},\\quad r = ${r},\\quad 0 \\le ${r} < ${B}` });
      } else {
        const same: number[] = [];
        for (let v = r; v <= TOP && same.length < 6; v += B) same.push(v);
        rows.push({ label: "Same remainder as a", tex: `${same.join(", ")}${r + 6 * B <= TOP ? ", \\ldots" : ""}` });
        rows.push({ label: "Differences", tex: `${A} - ${r} = ${A - r} = ${q} \\cdot ${B}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Dealing cards",
        text: "Deal 23 cards round 5 players and each gets 4, with 3 cards left in your hand. The rounds of dealing are the quotient and the leftover cards the remainder, which is always fewer than the number of players: with 5 or more left you could deal another round.",
      },
      {
        title: "Making change",
        text: "Paying 47 cents in dimes as far as they go takes 4 dimes, with 7 cents still owed: $47 = 4 \\cdot 10 + 7$. The remainder is what the bigger coin cannot cover.",
      },
    ],

    uses: [
      {
        title: "Packing eggs",
        text: "A farm packs eggs in cartons of 12. Fifty eggs fill $\\lfloor 50 / 12 \\rfloor = 4$ cartons with 2 eggs over, since $50 = 4 \\cdot 12 + 2$. Shops and warehouses reckon this way all day: full boxes from the quotient, loose items from the remainder.",
        tags: ["home"],
        image: {
          src: eggCartonsRemainderImage,
          caption: "50 eggs fill 4 cartons of 12 with 2 left over: 50 = 4 × 12 + 2.",
          alt: "Four full egg cartons of twelve in a row, each labelled 12, with two loose eggs beside them marked 2 left in gold and the line 50 = 4 × 12 + 2.",
        },
      },
      {
        title: "Tiling a wall",
        text: "Along a 100 cm wall, 12 cm tiles fit 8 times with 4 cm to spare: $100 = 8 \\cdot 12 + 4$. A tiler often splits the remainder between the two ends, cutting two 2 cm slivers, or better, starts from the middle so the cut pieces come out wider.",
        tags: ["building", "trade-tricks"],
        image: {
          src: wallTilesRemainderImage,
          caption: "A 100 cm wall takes 8 whole 12 cm tiles, leaving a 4 cm gap to cut a piece for: 100 = 8 × 12 + 4.",
          alt: "A wall 100 cm wide with a row of eight numbered square tiles along its base, the first marked 12 cm and the 4 cm gap at the end in gold, above the line 100 = 8 × 12 + 4.",
        },
      },
    ],
  };
});
