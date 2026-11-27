// The multiplication principle. Choices made in stages, where each first
// choice leaves the same number of second choices, multiply: a tree of
// shirts and trousers ends in a × b leaves, the cells of an a by b grid.
// Each further stage multiplies again; a choice of one thing or another adds.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import licencePlateCountImage from "../../images/licence-plate-count.svg";
import dialLockCombinationsImage from "../../images/dial-lock-combinations.svg";

const SHIRT = C.cyan;
const TROUSERS = C.pink;
const HAT = C.violet;
const GOLD = C.gold;

/** The x of each level of the tree: the root, shirts, trousers, hats. */
const LEVEL_X = [-6.8, -3.8, -0.8, 2.2];
const TOP = 3.7;
const BOTTOM = -2.6;

export default lesson((s) => {
  const a = s.slider({ label: "shirts", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 1, max: 4, value: 3, step: 1 });
  const b = s.slider({ label: "trousers", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 1, max: 4, value: 2, step: 1 });
  const c = s.slider({ label: "hats", at: { x: 0, y: -4.3 }, width: 2.8, min: 1, max: 3, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "A tree of choices",
        text: "An outfit is chosen in stages: first a shirt, then trousers. Each of the $a$ shirts branches into the same $b$ pairs of trousers, so the tree ends in $a \\times b$ leaves, one for each outfit. With 3 shirts and 2 pairs of trousers there are $3 \\times 2 = 6$ outfits.",
      },
      {
        title: "A grid of pairs",
        text: "Put the shirts down the side and the trousers along the top, and each outfit is one cell of an $a$ by $b$ grid. When every first choice leaves the same number of second choices, the counts multiply. This is the multiplication principle.",
      },
      {
        title: "More stages",
        text: "Add a hat and every leaf of the tree sprouts $c$ new branches, so there are $a \\times b \\times c$ outfits: 3 shirts, 2 pairs of trousers and 2 hats make 12. However many stages there are, multiply the number of options at each, as long as that number does not depend on the earlier choices.",
      },
      {
        title: "And multiplies, or adds",
        text: "Picking a shirt and a pair of trousers multiplies, $a \\times b$. Picking one garment, a shirt or a pair of trousers, adds, $a + b$, since each pick is one or the other and never both. From 4 starters and 5 mains there are $4 \\times 5 = 20$ two-course meals, but only $4 + 5 = 9$ single dishes.",
      },
    ],

    draw(g, f) {
      const [A, B, H] = [a.value, b.value, c.value];

      if (f.step === 0 || f.step === 2) {
        // Leaves spread evenly down the stage; each parent sits at the middle of its children.
        const counts = f.step === 0 ? [A, B] : [A, B, H];
        const colors = [SHIRT, TROUSERS, HAT];
        const names = ["shirt", "trousers", "hat"];
        const leaves = counts.reduce((p, q) => p * q, 1);
        const gap = (TOP - BOTTOM) / leaves;
        let level: Vec[] = Array.from({ length: leaves }, (_, i) => ({ x: LEVEL_X[counts.length], y: TOP - gap * (i + 0.5) }));
        const levels: Vec[][] = [level];
        for (let d = counts.length - 1; d >= 0; d--) {
          const k = counts[d];
          level = Array.from({ length: level.length / k }, (_, i) => {
            const kids = level.slice(i * k, i * k + k);
            return { x: LEVEL_X[d], y: kids.reduce((t, p) => t + p.y, 0) / k };
          });
          levels.unshift(level);
        }
        for (let d = 0; d < counts.length; d++) {
          const k = counts[d];
          const fresh = f.step === 2 && d === 2 ? f.at(2) : 1;
          levels[d].forEach((p, i) => {
            for (let j = 0; j < k; j++) g.segment(p, levels[d + 1][i * k + j], { color: colors[d], width: 2, alpha: fresh });
          });
          g.label({ x: LEVEL_X[d + 1], y: 4.4 }, names[d], { color: colors[d], size: 14, bold: true, alpha: fresh });
        }
        levels.forEach((pts, d) => {
          const r = d === 0 ? 6 : Math.max(2.5, Math.min(6, gap * 14));
          const color = d === 0 ? C.ink : colors[d - 1];
          for (const p of pts) g.point(p, { color: d === counts.length ? GOLD : color, r });
        });
        const product = counts.join(" × ");
        g.label({ x: LEVEL_X[counts.length] + 1.2, y: 0.6 }, `${product} =`, { color: C.ink, size: 18, bold: true, align: "left" });
        g.label({ x: LEVEL_X[counts.length] + 1.2, y: -0.3 }, `${leaves} outfits`, { color: GOLD, size: 20, bold: true, align: "left" });
        return;
      }

      if (f.step === 1) {
        const size = Math.min(1.25, 5.6 / Math.max(A, B));
        const x0 = -2 - (B * size) / 2;
        const y0 = 2.9;
        for (let j = 0; j < B; j++) {
          g.point({ x: x0 + (j + 0.5) * size, y: y0 + 0.55 }, { color: TROUSERS, r: 6 });
          g.label({ x: x0 + (j + 0.5) * size, y: y0 + 0.55 }, `${j + 1}`, { color: TROUSERS, size: 13, bold: true, dy: 14 });
        }
        for (let i = 0; i < A; i++) {
          g.point({ x: x0 - 0.55, y: y0 - (i + 0.5) * size }, { color: SHIRT, r: 6 });
          g.label({ x: x0 - 0.55, y: y0 - (i + 0.5) * size }, `${i + 1}`, { color: SHIRT, size: 13, bold: true, dx: -16 });
        }
        for (let i = 0; i < A; i++) {
          for (let j = 0; j < B; j++) {
            const n = i * B + j;
            const show = Math.min(1, Math.max(0, f.at(1) * A * B - n + 1));
            const p = { x: x0 + j * size, y: y0 - i * size };
            g.polygon([p, { x: p.x + size, y: p.y }, { x: p.x + size, y: p.y - size }, { x: p.x, y: p.y - size }], {
              color: GOLD,
              fill: tint(GOLD, 0.14),
              width: 2,
              alpha: show,
            });
            g.label({ x: p.x + size / 2, y: p.y - size / 2 }, `${i + 1}, ${j + 1}`, { color: C.ink, size: 13, bold: true, alpha: show });
          }
        }
        g.label({ x: x0 + (B * size) / 2, y: y0 + 1.25 }, "trousers", { color: TROUSERS, size: 14, bold: true });
        g.label({ x: x0 - 1.2, y: y0 - (A * size) / 2 }, "shirts", { color: SHIRT, size: 14, bold: true, align: "right" });
        g.label({ x: 4.2, y: 0.6 }, `${A} rows × ${B} columns`, { color: C.ink, size: 17, bold: true });
        g.label({ x: 4.2, y: -0.3 }, `= ${A * B} outfits`, { color: GOLD, size: 20, bold: true });
        return;
      }

      // And against or: a grid of pairs beside a single row of garments.
      const size = Math.min(0.8, 4.4 / Math.max(A, B));
      const x0 = -6.6;
      const y0 = 2.6;
      for (let i = 0; i < A; i++) {
        for (let j = 0; j < B; j++) {
          const p = { x: x0 + j * size, y: y0 - i * size };
          g.polygon([p, { x: p.x + size, y: p.y }, { x: p.x + size, y: p.y - size }, { x: p.x, y: p.y - size }], {
            color: GOLD,
            fill: tint(GOLD, 0.14),
            width: 2,
          });
          g.point({ x: p.x + size * 0.35, y: p.y - size / 2 }, { color: SHIRT, r: 4 });
          g.point({ x: p.x + size * 0.65, y: p.y - size / 2 }, { color: TROUSERS, r: 4 });
        }
      }
      g.label({ x: x0 + (B * size) / 2, y: y0 + 0.6 }, "a shirt and trousers", { color: C.ink, size: 14, bold: true });
      g.label({ x: x0 + (B * size) / 2, y: y0 - A * size - 0.6 }, `${A} × ${B} = ${A * B}`, { color: GOLD, size: 20, bold: true });

      const items = A + B;
      const step = Math.min(0.8, 6.4 / items);
      const left = 2.6 - ((items - 1) * step) / 2;
      for (let i = 0; i < items; i++) {
        const color = i < A ? SHIRT : TROUSERS;
        g.point({ x: left + i * step, y: 1.4 }, { color, r: 8, alpha: f.at(3) });
      }
      g.label({ x: 2.6, y: 2.6 }, "a shirt or trousers", { color: C.ink, size: 14, bold: true, alpha: f.at(3) });
      g.label({ x: 2.6, y: 0.2 }, `${A} + ${B} = ${items}`, { color: GOLD, size: 20, bold: true, alpha: f.at(3) });
    },

    readout(f) {
      const [A, B, H] = [a.value, b.value, c.value];
      const rows: Readout[] = [];
      if (f.step === 2) {
        rows.push({ label: "Outfits", tex: `a \\times b \\times c = ${A} \\times ${B} \\times ${H} = ${A * B * H}`, tone: "good" });
      } else if (f.step === 3) {
        rows.push({ label: "And", tex: `a \\times b = ${A * B}`, tone: "good" });
        rows.push({ label: "Or", tex: `a + b = ${A + B}` });
      } else {
        rows.push({ label: "Outfits", tex: `a \\times b = ${A} \\times ${B} = ${A * B}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Ordering at a sandwich counter",
        text: "Pick a bread, then a filling, then a sauce. Whatever bread you chose, the same fillings are on offer, so the number of different sandwiches is the three menu lengths multiplied, which is why a short menu can promise so many combinations.",
      },
      {
        title: "Getting dressed in the dark",
        text: "Grabbing a sock from one drawer and a shirt from another is two separate choices. Every sock goes with every shirt, so each new shirt in the wardrobe adds a whole row of outfits, not just one.",
      },
    ],

    uses: [
      {
        title: "How many licence plates",
        text: "A plate of three letters then three digits is filled in six stages, with 26 choices for each letter and 10 for each digit. So there are $26^3 \\times 10^3 = 17{,}576{,}000$ possible plates, enough for a large region; a fourth digit would make ten times as many.",
        tags: ["travel"],
        image: {
          src: licencePlateCountImage,
          caption: "Three letters and three digits make 26 × 26 × 26 × 10 × 10 × 10 = 17 576 000 plates.",
          alt: "A licence plate reading ABC 123, with 26 under each letter and 10 under each digit, multiplied out to 17 576 000.",
        },
      },
      {
        title: "Dials on a lock",
        text: "A luggage lock with three dials of digits 0 to 9 has $10 \\times 10 \\times 10 = 1000$ settings, from 000 to 999. A thief trying one a second would need under 17 minutes to try them all, which is why a fourth dial, making 10,000, is worth having.",
        tags: ["home", "trade-tricks"],
        image: {
          src: dialLockCombinationsImage,
          caption: "Three dials of ten digits each give 10 × 10 × 10 = 1000 settings, from 000 to 999.",
          alt: "A lock with three number dials showing 4, 7 and 2, each labelled 10 choices, and the line 10 × 10 × 10 = 1000.",
        },
      },
    ],
  };
});
