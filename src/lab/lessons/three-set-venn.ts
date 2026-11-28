// Three circles. Seven regions inside, one outside; pick a region and set its
// count. Inclusion–exclusion for three sets adds the sizes, takes off the
// pairwise overlaps and adds back the triple overlap, and each region ends up
// counted exactly once.

import { C, tint } from "../draw.ts";
import { lesson, type Readout } from "../scene.ts";
import { region, spot, VENN3 } from "../kit/venn.ts";
import multiplesTwoThreeFiveImage from "../../images/multiples-two-three-five.svg";
import spotlightsOverlapImage from "../../images/rgb-spotlights-overlap.svg";

const GOLD = C.gold;
const COLS = [C.cyan, C.pink, C.green] as const;
const NAMES = ["A", "B", "C"] as const;
const { box: BOX, discs: DISCS } = VENN3;

const REGIONS = ["A only", "B only", "C only", "A and B only", "A and C only", "B and C only", "all three"] as const;
/** Which circles each region lies inside, in REGIONS order. */
const MARKS: boolean[][] = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
  [true, true, false],
  [true, false, true],
  [false, true, true],
  [true, true, true],
];

export default lesson((s) => {
  const pick = s.choice("Region", REGIONS);
  const count = s.slider({ label: "count", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 15, value: 8, step: 1 });
  const neither = s.slider({ label: "neither", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 15, value: 9, step: 1 });

  // One slider edits whichever region is picked: it takes that region's count when the pick changes.
  const counts = [8, 6, 7, 3, 2, 4, 1];
  let editing: string = pick.value;
  const sync = (): void => {
    const i = REGIONS.indexOf(pick.value);
    if (pick.value !== editing) {
      editing = pick.value;
      count.value = counts[i];
    } else counts[i] = count.value;
  };

  const totals = () => {
    sync();
    const sum = (test: (m: boolean[]) => boolean): number => MARKS.reduce((t, m, i) => t + (test(m) ? counts[i] : 0), 0);
    const size = [0, 1, 2].map((j) => sum((m) => m[j]));
    const pair = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => sum((m) => m[i] && m[j]));
    const triple = counts[6];
    const union = sum(() => true);
    return { size, pair, triple, union, U: union + neither.value };
  };

  return {
    steps: [
      {
        title: "Seven regions",
        text: "Three overlapping circles cut the universe into eight regions: seven inside, one outside all three. Each element sits in exactly one. The size of a set is the sum of its four regions: with the counts shown, $|A| = 8 + 3 + 2 + 1 = 14$. Pick a region and drag its count.",
      },
      {
        title: "Add, subtract, add back",
        text: "For three sets, $|A \\cup B \\cup C| = |A| + |B| + |C| - |A \\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|$. With the starting counts that is $14 + 14 + 14 - 4 - 3 - 5 + 1 = 31$, the same as the seven regions added up, $8 + 6 + 7 + 3 + 2 + 4 + 1 = 31$.",
      },
      {
        title: "Why every region counts once",
        text: "An element in exactly one set is added once. One in exactly two sets is added twice and taken off once, by its one pair: $2 - 1 = 1$. One in all three is added 3 times, taken off 3 times, once for each pair, and added back once: $3 - 3 + 1 = 1$. Without that last term the centre would not be counted at all.",
      },
      {
        title: "Filling in from the middle",
        text: "A problem usually gives the sizes and overlaps, not the regions. Fill the diagram from the centre out: the centre is $|A \\cap B \\cap C|$, each 'two only' region is its pair's overlap minus the centre, such as $|A \\cap B| - |A \\cap B \\cap C| = 4 - 1 = 3$, and each 'one only' region is what is left of its circle, $14 - 3 - 2 - 1 = 8$.",
      },
    ],

    draw(g, f) {
      const t = totals();
      g.polygon(
        [
          { x: BOX.x0, y: BOX.y0 },
          { x: BOX.x1, y: BOX.y0 },
          { x: BOX.x1, y: BOX.y1 },
          { x: BOX.x0, y: BOX.y1 },
        ],
        { color: C.dim, width: 1.5 },
      );
      const chosen = REGIONS.indexOf(pick.value);
      g.polygon(region(DISCS, MARKS[chosen], BOX), { color: GOLD, fill: tint(GOLD, 0.3), stroke: null });
      DISCS.forEach((d, j) => g.circle(d.c, d.r, { color: COLS[j], fill: tint(COLS[j], 0.06), width: 2.5 }));
      const tags = [{ x: -6.6, y: 3.2 }, { x: -0.4, y: 3.2 }, { x: -6.0, y: -2.3 }];
      tags.forEach((p, j) => g.label(p, `${NAMES[j]}: ${t.size[j]}`, { color: COLS[j], size: 17, bold: true }));
      g.label({ x: -0.3, y: -2.35 }, `neither: ${neither.value}`, { color: C.dim, size: 14, bold: true, align: "right" });

      // Step 2 writes how often each region is counted instead of its count.
      const tally = (m: boolean[]): string => (["", "1", "2 − 1", "3 − 3 + 1"] as const)[m.filter(Boolean).length];
      MARKS.forEach((m, i) => {
        const p = spot(DISCS, m, BOX);
        const text = f.step === 2 ? tally(m) : String(counts[i]);
        g.label(p, text, { color: i === chosen ? GOLD : C.ink, size: f.step === 2 && i === 6 ? 13 : 20, bold: true });
      });

      const line = (row: number, text: string, color: string, size = 17, alpha = 1): void => {
        g.label({ x: 1.3, y: 3.4 - row * 0.85 }, text, { color, size, bold: true, align: "left", alpha });
      };
      const [ab, ac, bc] = t.pair;
      if (f.step === 0) {
        line(0, `${pick.value}: ${counts[chosen]}`, GOLD, 20);
        NAMES.forEach((n, j) => {
          const parts = MARKS.map((m, i) => (m[j] ? counts[i] : null)).filter((v) => v !== null);
          line(1.4 + j, `|${n}| = ${parts.join(" + ")} = ${t.size[j]}`, COLS[j], 16, f.at(0));
        });
        return;
      }
      if (f.step === 1) {
        line(0, `|A| + |B| + |C| = ${t.size[0] + t.size[1] + t.size[2]}`, C.ink, 16);
        line(1, `− pairs: ${ab} + ${ac} + ${bc} = ${ab + ac + bc}`, C.ink, 16);
        line(2, `+ all three: ${t.triple}`, C.ink, 16);
        line(3.4, `|A ∪ B ∪ C| = ${t.union}`, GOLD, 20, f.at(1));
        line(4.4, `|U| = ${t.U}`, C.dim, 16, f.at(1));
        return;
      }
      if (f.step === 2) {
        line(0, "times each region is counted:", C.dim, 15);
        line(1, "in one set: 1", C.ink, 16);
        line(2, "in two: 2 − 1 = 1", C.ink, 16);
        line(3, "in three: 3 − 3 + 1 = 1", GOLD, 16, f.at(2));
        return;
      }
      line(0, `centre = ${t.triple}`, C.ink, 16);
      line(1, `A and B only = ${ab} − ${t.triple} = ${ab - t.triple}`, C.ink, 16);
      line(2, `A only = ${t.size[0]} − ${ab - t.triple} − ${ac - t.triple} − ${t.triple}`, C.ink, 16);
      line(2.8, `= ${counts[0]}`, GOLD, 18, f.at(3));
    },

    readout(f) {
      const t = totals();
      const [ab, ac, bc] = t.pair;
      const [a, b, c] = t.size;
      const rows: Readout[] = [{ label: "Sizes", tex: `|A| = ${a},\\ |B| = ${b},\\ |C| = ${c}` }];
      if (f.step >= 1) {
        rows.push({ label: "Overlaps", tex: `|A \\cap B| = ${ab},\\ |A \\cap C| = ${ac},\\ |B \\cap C| = ${bc},\\ |A \\cap B \\cap C| = ${t.triple}` });
        rows.push({ label: "Union", tex: `|A \\cup B \\cup C| = ${a + b + c} - ${ab + ac + bc} + ${t.triple} = ${t.union}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Three clubs at one school",
        text: "Counting students in the chess, drama or music club by adding the three rosters counts anyone in two clubs twice and anyone in all three three times. Taking off each shared pair fixes the doubles but removes the triple members entirely, so they are added back once.",
      },
      {
        title: "Correcting a correction",
        text: "Like fixing an overcharge and then noticing the refund was too big: each step repairs the one before. Subtracting pairs over-corrects for the centre, and adding the triple overlap back is the final adjustment.",
      },
    ],

    uses: [
      {
        title: "Three coloured spotlights",
        text: "Red, green and blue spotlights overlapping on a stage make the seven regions of a three-set Venn diagram, each with its own colour: red and green make yellow, green and blue cyan, red and blue magenta, and the centre, lit by all three, is white. A lighting designer reads the stage like the diagram.",
        tags: ["light", "art"],
        image: {
          src: spotlightsOverlapImage,
          caption: "Three spotlights light seven regions: one colour, two mixed, or all three together, which makes white.",
          alt: "Red, green and blue circles of light overlapping on a dark stage, with yellow, cyan and magenta where two overlap and a white centre outlined in gold.",
        },
      },
      {
        title: "Multiples of 2, 3 or 5",
        text: "From 1 to 100 there are 50 multiples of 2, 33 of 3 and 20 of 5; 16 of 6, 10 of 10 and 6 of 15; and 3 of 30. So $50 + 33 + 20 - 16 - 10 - 6 + 3 = 74$ numbers have one of those as a factor, and 26 have none of them.",
        tags: ["trade-tricks", "computing"],
        image: {
          src: multiplesTwoThreeFiveImage,
          caption: "From 1 to 100: 50 + 33 + 20 − 16 − 10 − 6 + 3 = 74 numbers are multiples of 2, 3 or 5.",
          alt: "Three overlapping circles for multiples of 2, 3 and 5 with 27, 14 and 7 in the one-set regions, 13, 7 and 3 in the two-set regions, 3 in the centre and 26 outside, beside the sum 50 + 33 + 20 − 16 − 10 − 6 + 3 = 74.",
        },
      },
    ],
  };
});
