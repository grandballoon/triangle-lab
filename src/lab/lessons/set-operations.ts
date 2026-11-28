// Operations on sets, shaded on a Venn diagram. With U = {1, …, 12}, A the
// even numbers and B the multiples of 3, every number sits in one of four
// regions; union, intersection, complement and difference are each a choice
// of regions to shade, and De Morgan's laws say which regions a complement
// keeps.

import { C, tint, type Draw } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { patterns, region, VENN2 } from "../kit/venn.ts";
import lightFilterIntersectionImage from "../../images/light-filter-intersection.svg";
import meetingFreeTimesImage from "../../images/meeting-free-times.svg";

const GOLD = C.gold;
const A_COL = C.cyan;
const B_COL = C.pink;

const OPS = ["A ∪ B", "A ∩ B", "Aᶜ", "A − B", "B − A", "(A ∪ B)ᶜ"] as const;
type Op = (typeof OPS)[number];

interface Info {
  keeps: (a: boolean, b: boolean) => boolean;
  tex: string;
  /** The complement, rewritten by De Morgan's laws, as text and TeX. */
  not: [string, string];
}

const INFO: Record<Op, Info> = {
  "A ∪ B": { keeps: (a, b) => a || b, tex: "A \\cup B", not: ["Aᶜ ∩ Bᶜ", "A^c \\cap B^c"] },
  "A ∩ B": { keeps: (a, b) => a && b, tex: "A \\cap B", not: ["Aᶜ ∪ Bᶜ", "A^c \\cup B^c"] },
  "Aᶜ": { keeps: (a) => !a, tex: "A^c", not: ["A", "A"] },
  "A − B": { keeps: (a, b) => a && !b, tex: "A - B", not: ["Aᶜ ∪ B", "A^c \\cup B"] },
  "B − A": { keeps: (a, b) => b && !a, tex: "B - A", not: ["A ∪ Bᶜ", "A \\cup B^c"] },
  "(A ∪ B)ᶜ": { keeps: (a, b) => !(a || b), tex: "(A \\cup B)^c", not: ["A ∪ B", "A \\cup B"] },
};

const U = Array.from({ length: 12 }, (_, i) => i + 1);
const inA = (x: number): boolean => x % 2 === 0;
const inB = (x: number): boolean => x % 3 === 0;

// The diagram at full size; a smaller copy is the same picture scaled about the origin.
const { box: BOX, discs: DISCS } = VENN2;

/** Where each number sits: four regions, a few spots each. */
const SPOTS: Record<string, Vec[]> = {
  "10": [{ x: -5.9, y: 1.75 }, { x: -6.1, y: 0.85 }, { x: -6.1, y: -0.05 }, { x: -5.9, y: -0.95 }],
  "11": [{ x: -3.35, y: 0.95 }, { x: -3.35, y: -0.15 }],
  "01": [{ x: -0.8, y: 0.95 }, { x: -0.8, y: -0.15 }],
  "00": [{ x: -7.15, y: 3.25 }, { x: 0.45, y: 3.25 }, { x: -7.15, y: -2.3 }, { x: 0.45, y: -2.3 }],
};
const key = (a: boolean, b: boolean): string => `${a ? 1 : 0}${b ? 1 : 0}`;

const shaded = (op: Op): number[] => U.filter((x) => INFO[op].keeps(inA(x), inB(x)));
const braces = (xs: number[]): string => (xs.length ? `{${xs.join(", ")}}` : "∅");

/** The Venn diagram, scaled by `k` about `at`, with the regions `keeps` picks shaded gold. */
function venn(g: Draw, keeps: (a: boolean, b: boolean) => boolean, at: Vec, k: number, alpha: number, numbers: boolean): void {
  const map = (p: Vec): Vec => ({ x: at.x + p.x * k, y: at.y + p.y * k });
  for (const m of patterns(2)) {
    if (!keeps(m[0], m[1])) continue;
    g.polygon(region(DISCS, m, BOX).map(map), { color: GOLD, fill: tint(GOLD, 0.3 * alpha), stroke: null });
  }
  const box = [
    { x: BOX.x0, y: BOX.y0 },
    { x: BOX.x1, y: BOX.y0 },
    { x: BOX.x1, y: BOX.y1 },
    { x: BOX.x0, y: BOX.y1 },
  ].map(map);
  g.polygon(box, { color: C.dim, width: 1.5 });
  g.circle(map(DISCS[0].c), DISCS[0].r * k, { color: A_COL, width: 2.5 });
  g.circle(map(DISCS[1].c), DISCS[1].r * k, { color: B_COL, width: 2.5 });
  const size = Math.round(18 * Math.sqrt(k));
  g.label(map({ x: -6.3, y: 3.0 }), "A", { color: A_COL, size, bold: true });
  g.label(map({ x: -0.4, y: 3.0 }), "B", { color: B_COL, size, bold: true });
  g.label(map({ x: BOX.x0, y: BOX.y1 }), "U", { color: C.dim, size: size - 2, bold: true, dx: 4, dy: 14, align: "left" });
  if (!numbers) return;
  const used: Record<string, number> = {};
  for (const x of U) {
    const id = key(inA(x), inB(x));
    const spot = SPOTS[id][(used[id] = (used[id] ?? -1) + 1)];
    const lit = keeps(inA(x), inB(x));
    g.label(map(spot), String(x), { color: lit ? GOLD : C.ink, size: 17, bold: true });
  }
}

export default lesson((s) => {
  const op = s.choice("Shade", OPS);

  return {
    steps: [
      {
        title: "Union and intersection",
        text: "Let $U = \\{1, 2, \\ldots, 12\\}$, $A$ the even numbers and $B$ the multiples of 3. The union $A \\cup B$ holds everything in $A$ or $B$ or both: $\\{2, 3, 4, 6, 8, 9, 10, 12\\}$. The intersection $A \\cap B$ holds only what is in both: $\\{6, 12\\}$. In the diagram each is a choice of regions; pick one to shade it.",
      },
      {
        title: "Complement",
        text: "The complement $A^c$ is everything in the universe that is not in $A$: here the odd numbers $\\{1, 3, 5, 7, 9, 11\\}$, shaded outside circle $A$. It depends on the universe, and $|A^c| = |U| - |A| = 12 - 6 = 6$. Taking the complement twice gives back the set: $(A^c)^c = A$.",
      },
      {
        title: "Difference",
        text: "The difference $A - B$ holds what is in $A$ but not in $B$, so $A - B = A \\cap B^c = \\{2, 4, 8, 10\\}$. Order matters: $B - A = \\{3, 9\\}$. Two sets with no elements in common, $A \\cap B = \\emptyset$, are called disjoint; the crescents $A - B$ and $B - A$ are disjoint.",
      },
      {
        title: "De Morgan's laws",
        text: "The complement of a union is the intersection of the complements, and the other way round: $(A \\cup B)^c = A^c \\cap B^c$ and $(A \\cap B)^c = A^c \\cup B^c$. Not in $A$ or $B$ means not in $A$ and not in $B$. The small diagram shades the complement of whatever you pick.",
      },
    ],

    draw(g, f) {
      const info = INFO[op.value];
      venn(g, info.keeps, { x: 0, y: 0 }, 1, 1, true);

      const line = (y: number, text: string, color: string, size = 17, alpha = 1): void => {
        g.label({ x: 1.6, y }, text, { color, size, bold: true, align: "left", alpha });
      };
      if (f.step < 3) {
        line(3.3, "A = {2, 4, 6, 8, 10, 12}", A_COL, 16);
        line(2.5, "B = {3, 6, 9, 12}", B_COL, 16);
        line(1.2, op.value, GOLD, 22);
        line(0.4, `= ${braces(shaded(op.value))}`, GOLD, 16);
        const note: Record<number, string> = { 0: "∪: in A or B   ∩: in both", 1: "ᶜ: in U but not in the set", 2: "A − B: in A, not in B" };
        line(-1.0, note[f.step], C.dim, 14, f.at(f.step));
        return;
      }
      // The complement of the shaded set, small, with its De Morgan form.
      venn(g, (a, b) => !info.keeps(a, b), { x: 4.85, y: 2.05 }, 0.38, f.at(3), false);
      line(0.2, `(${op.value})ᶜ`, GOLD, 20, f.at(3));
      line(-0.6, `= ${info.not[0]}`, GOLD, 20, f.at(3));
      line(-1.6, `= ${braces(U.filter((x) => !info.keeps(inA(x), inB(x))))}`, C.ink, 15, f.at(3));
    },

    readout(f) {
      const info = INFO[op.value];
      const list = shaded(op.value);
      const rows: Readout[] = [
        { label: "Shaded", tex: `${info.tex} = ${list.length ? `\\{${list.join(", ")}\\}` : "\\emptyset"}`, tone: "good" },
        { label: "Size", tex: `|${info.tex}| = ${list.length}` },
      ];
      if (f.step === 3) rows.push({ label: "De Morgan", tex: `(${info.tex})^c = ${info.not[1]}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "Two playlists",
        text: "Merge two playlists without duplicates and you get their union; the songs on both are their intersection. The songs on yours that are not on your friend's are the difference, and it is not the same list as theirs minus yours.",
      },
      {
        title: "'Or' and 'and' on a menu",
        text: "A menu marked 'vegetarian or gluten-free' offers more dishes than one marked 'vegetarian and gluten-free'. 'Or' widens the choice like a union, 'and' narrows it like an intersection, and 'not spicy' is a complement.",
      },
    ],

    uses: [
      {
        title: "Stacking colour filters",
        text: "A yellow filter passes red and green light and a cyan filter passes green and blue. Light through both must pass each, so the stack passes the intersection $\\{\\text{red}, \\text{green}\\} \\cap \\{\\text{green}, \\text{blue}\\} = \\{\\text{green}\\}$, and a white lamp seen through them looks green.",
        tags: ["light", "art"],
        image: {
          src: lightFilterIntersectionImage,
          caption: "Yellow passes {red, green}, cyan passes {green, blue}; together they pass only their intersection, {green}.",
          alt: "White light passing through a yellow filter and then a cyan filter, with red, green and blue rays; only the green ray, drawn in gold outline, comes out of both.",
        },
      },
      {
        title: "Finding a meeting time",
        text: "If one person is free at 9, 10, 11 and 2 o'clock and another at 10, 11, 3 and 4, a meeting must be in the intersection, 10 or 11. The union is every hour at least one of them could make, and the first person's free hours minus the second's are 9 and 2.",
        tags: ["home"],
        image: {
          src: meetingFreeTimesImage,
          caption: "Two people's free hours overlap at 10 and 11: the intersection is when both can meet.",
          alt: "Two rows of hourly slots from 9 to 4 with each person's free hours filled; the columns for 10 and 11, free in both rows, are outlined in gold.",
        },
      },
    ],
  };
});
