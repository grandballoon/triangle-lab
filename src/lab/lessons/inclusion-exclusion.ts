// Counting with two circles. Adding |A| and |B| counts the overlap twice, so
// |A ∪ B| = |A| + |B| − |A ∩ B|. The sliders set how many elements sit in
// each region of the Venn diagram; the same count then gives the number in
// neither set, or the overlap from the union.

import { C, tint } from "../draw.ts";
import { lesson, type Readout } from "../scene.ts";
import { region, spot, VENN2 } from "../kit/venn.ts";
import multiplesTwoOrThreeImage from "../../images/multiples-two-or-three.svg";
import travelGroupLanguagesImage from "../../images/travel-group-languages.svg";

const GOLD = C.gold;
const A_COL = C.cyan;
const B_COL = C.pink;
const { box: BOX, discs: DISCS } = VENN2;

export default lesson((s) => {
  const slider = (label: string, x: number, value: number) =>
    s.slider({ label, at: { x, y: -4.3 }, width: 2.8, min: 0, max: 20, value, step: 1 });
  const onlyA = slider("A only", -7.6, 13);
  const both = slider("both", -3.8, 5);
  const onlyB = slider("B only", 0, 7);
  const neither = slider("neither", 3.8, 5);

  const counts = () => {
    const [a, ab, b, n] = [onlyA.value, both.value, onlyB.value, neither.value];
    return { a, ab, b, n, A: a + ab, B: ab + b, union: a + ab + b, U: a + ab + b + n };
  };

  return {
    steps: [
      {
        title: "Counting the union",
        text: "In a class of 30, 18 play soccer ($A$) and 12 play chess ($B$), and 5 do both. Adding $|A| + |B| = 30$ counts those 5 twice, once in each circle, so take them off once: $|A \\cup B| = |A| + |B| - |A \\cap B| = 18 + 12 - 5 = 25$. The sliders set how many sit in each region of the diagram.",
      },
      {
        title: "Counting neither",
        text: "Everyone in the universe is in $A \\cup B$ or outside it, so the number in neither set is $|U| - |A \\cup B|$. In the class, $30 - 25 = 5$ students play neither game. The region outside both circles is the complement $(A \\cup B)^c$.",
      },
      {
        title: "Finding the overlap",
        text: "The same equation, rearranged, finds the overlap from the union: $|A \\cap B| = |A| + |B| - |A \\cup B| = 18 + 12 - 25 = 5$. If the overlap is empty the sets are disjoint and the sizes simply add: $|A \\cup B| = |A| + |B|$. Set 'both' to 0 to see it.",
      },
    ],

    draw(g, f) {
      const k = counts();
      const [dA, dB] = DISCS;
      g.polygon(
        [
          { x: BOX.x0, y: BOX.y0 },
          { x: BOX.x1, y: BOX.y0 },
          { x: BOX.x1, y: BOX.y1 },
          { x: BOX.x0, y: BOX.y1 },
        ],
        { color: C.dim, width: 1.5 },
      );
      const lit = f.step === 1 ? [false, false] : f.step === 2 ? [true, true] : null;
      if (lit) g.polygon(region(DISCS, lit, BOX), { color: GOLD, fill: tint(GOLD, 0.3 * f.at(f.step)), stroke: null });
      // Each circle tinted on its own, so the overlap, counted twice, shows darker.
      const wash = f.step === 0 ? 0.2 : 0.08;
      g.circle(dA.c, dA.r, { color: A_COL, fill: tint(A_COL, wash), width: 2.5 });
      g.circle(dB.c, dB.r, { color: B_COL, fill: tint(B_COL, wash), width: 2.5 });
      g.label({ x: -6.3, y: 3.0 }, `A: ${k.A}`, { color: A_COL, size: 18, bold: true });
      g.label({ x: -0.4, y: 3.0 }, `B: ${k.B}`, { color: B_COL, size: 18, bold: true });
      g.label({ x: BOX.x0, y: BOX.y1 }, `U: ${k.U}`, { color: C.dim, size: 16, bold: true, dx: 4, dy: 14, align: "left" });
      const at = (m: boolean[]) => spot(DISCS, m, BOX);
      g.label(at([true, false]), String(k.a), { color: C.ink, size: 24, bold: true });
      g.label(at([true, true]), String(k.ab), { color: f.step === 2 ? GOLD : C.ink, size: 24, bold: true });
      g.label(at([false, true]), String(k.b), { color: C.ink, size: 24, bold: true });
      g.label({ x: -3.35, y: -2.35 }, `neither: ${k.n}`, { color: f.step === 1 ? GOLD : C.dim, size: 16, bold: true });

      const line = (row: number, text: string, color: string, size = 18, alpha = 1): void => {
        g.label({ x: 1.6, y: 3.3 - row * 0.9 }, text, { color, size, bold: true, align: "left", alpha });
      };
      if (f.step === 0) {
        line(0, `|A| = ${k.a} + ${k.ab} = ${k.A}`, A_COL);
        line(1, `|B| = ${k.ab} + ${k.b} = ${k.B}`, B_COL);
        line(2, `|A| + |B| = ${k.A + k.B}`, C.ink);
        line(2.7, `counts the ${k.ab} in both twice`, C.dim, 14);
        line(4, `|A ∪ B| = ${k.A + k.B} − ${k.ab} = ${k.union}`, GOLD, 20, f.at(0));
        return;
      }
      if (f.step === 1) {
        line(0, `|U| = ${k.U}`, C.ink);
        line(1, `|A ∪ B| = ${k.union}`, C.ink);
        line(2.3, `neither = ${k.U} − ${k.union} = ${k.n}`, GOLD, 20, f.at(1));
        return;
      }
      line(0, `|A| + |B| = ${k.A + k.B}`, C.ink);
      line(1, `|A ∪ B| = ${k.union}`, C.ink);
      line(2.3, `|A ∩ B| = ${k.A + k.B} − ${k.union} = ${k.ab}`, GOLD, 20, f.at(2));
      if (k.ab === 0) line(3.5, "disjoint: the sizes just add", GOLD, 16, f.at(2));
    },

    readout(f) {
      const k = counts();
      const rows: Readout[] = [
        { label: "Union", tex: `|A \\cup B| = ${k.A} + ${k.B} - ${k.ab} = ${k.union}`, tone: "good" },
      ];
      if (f.step >= 1) rows.push({ label: "Neither", tex: `|(A \\cup B)^c| = ${k.U} - ${k.union} = ${k.n}` });
      if (f.step >= 2) rows.push({ label: "Overlap", tex: `|A \\cap B| = ${k.A} + ${k.B} - ${k.union} = ${k.ab}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "Counting hands",
        text: "Ask who has a sister, then who has a brother, and add the hands: anyone with both raised a hand twice. Subtract the people who raised both and you have the number with at least one.",
      },
      {
        title: "Two overlapping rugs",
        text: "Two rugs that overlap cover less floor than their areas added, because the overlap is counted under both. Covered floor is rug one plus rug two minus the overlap, exactly the shape of $|A| + |B| - |A \\cap B|$.",
      },
    ],

    uses: [
      {
        title: "Multiples of 2 or 3",
        text: "From 1 to 100 there are 50 multiples of 2 and 33 multiples of 3, and the numbers counted twice are the 16 multiples of 6. So $50 + 33 - 16 = 67$ numbers are divisible by 2 or 3, and the other 33 are divisible by neither, without checking a single one by hand.",
        tags: ["trade-tricks", "computing"],
        image: {
          src: multiplesTwoOrThreeImage,
          caption: "From 1 to 100: 50 multiples of 2, 33 of 3, 16 of both, so 50 + 33 − 16 = 67 are divisible by 2 or 3.",
          alt: "Two overlapping circles labelled multiples of 2 and multiples of 3 with counts 34, 16 and 17 in the regions and 33 outside, beside the line 50 + 33 − 16 = 67.",
        },
      },
      {
        title: "Languages on a tour",
        text: "A tour group of 40 has 25 French speakers and 18 Spanish speakers, 7 of whom speak both. Then $25 + 18 - 7 = 36$ speak at least one, so the guide knows 4 people will need everything in a third language.",
        tags: ["travel"],
        image: {
          src: travelGroupLanguagesImage,
          caption: "25 French and 18 Spanish speakers with 7 who speak both make 36; in a group of 40, 4 speak neither.",
          alt: "A Venn diagram inside a box labelled group of 40, with French only 18, both 7, Spanish only 11, and 4 outside both circles in gold.",
        },
      },
    ],
  };
});
