// Simplifying a square root with an area model. A square of area n has side
// √n. When n = k²·m, the square cuts into a k-by-k grid of squares of area m,
// each with side √m, so its side is k of them laid end to end: √n = k√m.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import pipeOffset45Image from "../../images/pipe-offset-45-travel.svg";
import squareFrameBraceImage from "../../images/square-frame-brace.svg";

const SIDE = 5.6;
const CORNER = { x: -5.4, y: -2.7 };
const CELL = C.cyan;

/** n as k²·m with k as large as it can be, so m has no square factor. */
export function squareFactor(n: number): { k: number; m: number } {
  for (let k = Math.floor(Math.sqrt(n)); k >= 1; k--) {
    if (n % (k * k) === 0) return { k, m: n / (k * k) };
  }
  return { k: 1, m: n };
}

/** √n in simplest form, as TeX. */
export function simplestTex(n: number): string {
  const { k, m } = squareFactor(n);
  if (m === 1) return String(k);
  return k === 1 ? `\\sqrt{${m}}` : `${k}\\sqrt{${m}}`;
}

export default lesson((s) => {
  const area = s.slider({ label: "n =", at: { x: -6, y: -4.3 }, width: 10, min: 2, max: 100, value: 72, step: 1 });

  return {
    steps: [
      {
        title: "A square's side is a root",
        text: "A square of area $n$ has side $\\sqrt{n}$, since side times side is the area. For $n = 72$ the side is $\\sqrt{72} \\approx 8.49$, which is hard to say much about as it stands.",
      },
      {
        title: "Cut it into equal squares",
        text: "Look for the largest perfect square that divides $n$: $72 = 36 \\cdot 2 = 6^2 \\cdot 2$. Then the big square cuts into a $6 \\times 6$ grid of small squares, each of area 2.",
      },
      {
        title: "Count along the side",
        text: "Each small square has side $\\sqrt2$, and six of them line up along the big square's side. So $\\sqrt{72} = 6\\sqrt2$. In general $\\sqrt{k^2 m} = k\\sqrt{m}$, which is the rule $\\sqrt{ab} = \\sqrt{a}\\sqrt{b}$ with $a = k^2$.",
      },
      {
        title: "Simplest form",
        text: "A root is in simplest form when what is left under it has no square factor but 1. $\\sqrt{30}$ is already simplest, since $30 = 2 \\cdot 3 \\cdot 5$. Using a smaller square first works too, only slower: $\\sqrt{72} = 2\\sqrt{18} = 2 \\cdot 3\\sqrt2$.",
      },
    ],

    draw(g, f) {
      const n = area.value;
      const { k, m } = squareFactor(n);
      const cell = SIDE / k;
      const outline = { color: C.ink, width: 3 };
      const corners = [
        CORNER,
        { x: CORNER.x + SIDE, y: CORNER.y },
        { x: CORNER.x + SIDE, y: CORNER.y + SIDE },
        { x: CORNER.x, y: CORNER.y + SIDE },
      ];

      g.polygon(corners, { ...outline, fill: tint(CELL, 0.08) });
      g.label({ x: CORNER.x + SIDE / 2, y: CORNER.y + SIDE / 2 }, `area ${n}`, {
        color: C.ink,
        size: 18,
        bold: true,
        dy: -6,
        alpha: f.step === 0 ? 1 : 0,
      });

      if (f.step >= 1) {
        const alpha = f.at(1);
        for (let i = 1; i < k; i++) {
          g.segment({ x: CORNER.x + i * cell, y: CORNER.y }, { x: CORNER.x + i * cell, y: CORNER.y + SIDE }, { color: CELL, width: 1.5, alpha });
          g.segment({ x: CORNER.x, y: CORNER.y + i * cell }, { x: CORNER.x + SIDE, y: CORNER.y + i * cell }, { color: CELL, width: 1.5, alpha });
        }
        if (k <= 7) {
          for (let i = 0; i < k; i++) {
            for (let j = 0; j < k; j++) {
              g.label({ x: CORNER.x + (i + 0.5) * cell, y: CORNER.y + (j + 0.5) * cell }, String(m), {
                color: C.ink,
                size: k <= 4 ? 16 : 12,
                dy: -5,
                alpha,
              });
            }
          }
        }
      }

      // The side, as one root and, from step 2, as k small sides.
      const below = CORNER.y - 0.45;
      if (f.step >= 2) {
        for (let i = 0; i < k; i++) {
          const a = { x: CORNER.x + i * cell + 0.06, y: below };
          const b = { x: CORNER.x + (i + 1) * cell - 0.06, y: below };
          g.segment(a, b, { color: C.gold, width: 4, alpha: f.at(2) });
        }
      } else {
        g.segment({ x: CORNER.x, y: below }, { x: CORNER.x + SIDE, y: below }, { color: C.gold, width: 4 });
      }
      g.label({ x: CORNER.x - 0.4, y: CORNER.y + SIDE / 2 }, `√${n}`, { color: C.gold, size: 16, bold: true, align: "right", dy: -6 });

      // The factoring, beside the square.
      const right = CORNER.x + SIDE + 0.8;
      g.label({ x: right, y: 2.4 }, `${n} = ${k}² × ${m}`, { color: C.ink, size: 18, bold: true, align: "left", alpha: f.step >= 1 ? 1 : 0 });
      g.label({ x: right, y: 1.2 }, k === 1 ? "no square factor" : `${k} × ${k} grid of ${m}s`, {
        color: C.dim,
        size: 15,
        align: "left",
        alpha: f.step >= 1 ? 1 : 0,
      });
      if (f.step >= 2) {
        const simple = m === 1 ? String(k) : k === 1 ? `√${m}` : `${k}√${m}`;
        g.label({ x: right, y: -0.4 }, `√${n} = ${simple}`, { color: C.gold, size: 20, bold: true, align: "left", alpha: f.at(2) });
      }
    },

    readout(f) {
      const n = area.value;
      const { k, m } = squareFactor(n);
      const rows: Readout[] = [{ label: "The side", tex: `\\sqrt{${n}} \\approx ${fmt(Math.sqrt(n), 3)}` }];
      if (f.step >= 1) rows.push({ label: "Largest square factor", tex: `${n} = ${k * k} \\cdot ${m} = ${k}^2 \\cdot ${m}` });
      if (f.step >= 2) {
        rows.push({
          label: "Simplified",
          tex: m === 1 ? `\\sqrt{${n}} = ${k}` : k === 1 ? `\\sqrt{${n}}\\ \\text{is already simplest}` : `\\sqrt{${n}} = \\sqrt{${k}^2}\\sqrt{${m}} = ${simplestTex(n)}`,
          tone: "good",
        });
        if (k > 1 && m > 1) rows.push({ label: "Check", tex: `${k} \\times ${fmt(Math.sqrt(m), 4)} \\approx ${fmt(k * Math.sqrt(m), 3)}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Packing a crate",
        text: "To say how long a row of boxes is, you count the boxes and multiply by one box's length. A root in simplest form is said the same way: $6\\sqrt2$ is six lengths of $\\sqrt2$ in a row, which says far more about it than $\\sqrt{72}$ does.",
      },
      {
        title: "Taking out pairs",
        text: "Write $72 = 2 \\cdot 2 \\cdot 2 \\cdot 3 \\cdot 3$ and pull out each matched pair of factors: one pair of 2s and one of 3s come out as a single 2 and a single 3, and the odd 2 stays under the root. That gives $2 \\cdot 3 \\sqrt2 = 6\\sqrt2$, the same as the grid.",
      },
    ],

    uses: [
      {
        title: "Bracing a square frame",
        text: "The diagonal of a square with side $s$ is $\\sqrt{s^2 + s^2} = \\sqrt{2s^2} = s\\sqrt2$. A brace across a 12-foot square frame is $\\sqrt{288} = 12\\sqrt2 \\approx 16.97$ feet, about 16 feet $11\\tfrac58$ inches. If the measured diagonal is longer or shorter, the frame is out of square.",
        tags: ["carpentry", "building", "trade-tricks"],
        image: {
          src: squareFrameBraceImage,
          caption: "A diagonal brace across a 12-foot square frame is √288 = 12√2 feet long, about 16 feet 11⅝ inches.",
          alt: "A square timber frame with a diagonal brace, two sides marked 12 ft and the brace marked 12√2.",
        },
      },
      {
        title: "A 45° pipe offset",
        text: "When a pipe jogs sideways with two 45° fittings, the slanted run between them is the diagonal of a square whose side is the offset. Plumbers multiply the offset by 1.414 to get the travel: an offset of 10 inches needs $10\\sqrt2 \\approx 14.1$ inches of travel. The 1.414 is $\\sqrt2$.",
        tags: ["plumbing", "trade-tricks"],
        image: {
          src: pipeOffset45Image,
          caption: "Plumbers find the travel of a 45° offset by multiplying the offset by 1.414: the travel is the diagonal of a square, o√2.",
          alt: "Two parallel pipes joined by a slanted 45° run with round fittings at the bends, the offset between them marked o by a gold dashed line and the slanted travel marked o√2.",
        },
      },
    ],
  };
});
