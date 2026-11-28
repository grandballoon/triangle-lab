// Sets and membership. A rule picks out some of the numbers 1 to N: those
// are the elements of a set S. The lesson writes S three ways — by
// membership (x ∈ S), by listing its elements, and by set-builder notation —
// and ends with the empty set and the size |S|.

import { C, tint } from "../draw.ts";
import { lesson, type Readout } from "../scene.ts";
import { divisors, isPrime } from "../kit/integers.ts";
import musicScaleSetImage from "../../images/music-scale-pitch-set.svg";
import shopFilterSetImage from "../../images/shop-filter-set-builder.svg";

const GOLD = C.gold;

const RULES = ["even", "odd", "prime", "square", "divides 24", "x² = 2"] as const;
type Rule = (typeof RULES)[number];

const TEST: Record<Rule, (x: number) => boolean> = {
  even: (x) => x % 2 === 0,
  odd: (x) => x % 2 === 1,
  prime: isPrime,
  square: (x) => Number.isInteger(Math.sqrt(x)),
  "divides 24": (x) => divisors(24).includes(x),
  "x² = 2": (x) => x * x === 2,
};

/** The condition as set-builder notation writes it, in plain text and in TeX. */
const SAYS: Record<Rule, [string, string]> = {
  even: ["x is even", "x \\text{ is even}"],
  odd: ["x is odd", "x \\text{ is odd}"],
  prime: ["x is prime", "x \\text{ is prime}"],
  square: ["x is a perfect square", "x \\text{ is a perfect square}"],
  "divides 24": ["x divides 24", "x \\mid 24"],
  "x² = 2": ["x² = 2", "x^2 = 2"],
};

/** A list in braces, cut short after `most` entries. */
const roster = (xs: number[], most: number, dots: string): string =>
  xs.length === 0 ? "∅" : `{${xs.slice(0, most).join(", ")}${xs.length > most ? `, ${dots}` : ""}}`;

export default lesson((s) => {
  const size = s.slider({ label: "U = {1, …, N}, N =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 10, max: 30, value: 20, step: 1 });
  const rule = s.choice("Rule", RULES);

  const members = (): number[] => {
    const out: number[] = [];
    for (let x = 1; x <= size.value; x++) if (TEST[rule.value](x)) out.push(x);
    return out;
  };

  return {
    steps: [
      {
        title: "A set and its elements",
        text: "A set is a collection of distinct objects, called its elements. Here the objects are the whole numbers from 1 to $N$, and a rule picks some of them out to make a set $S$. We write $x \\in S$ when $x$ is an element of $S$ and $x \\notin S$ when it is not. With $S$ the even numbers up to 20, $6 \\in S$ and $7 \\notin S$. Every object is either in a set or not; there is no halfway.",
      },
      {
        title: "Listing the elements",
        text: "A small set can be written by listing its elements between braces: $S = \\{2, 4, 6, \\ldots, 20\\}$. A set is only its elements, so order and repeats do not matter: $\\{1, 2, 3\\}$, $\\{3, 1, 2\\}$ and $\\{1, 1, 2, 3\\}$ are the same set. Two sets are equal when they have exactly the same elements.",
      },
      {
        title: "Set-builder notation",
        text: "A rule can stand in for the list. $S = \\{x \\in U \\mid x \\text{ is even}\\}$ is read 'the set of $x$ in $U$ such that $x$ is even'. Before the bar is where $x$ comes from, here the universe $U = \\{1, 2, \\ldots, N\\}$; after it is the condition $x$ must meet. Change $N$ and the list changes, but the rule stays the same.",
      },
      {
        title: "Size, and the empty set",
        text: "The number of elements of a finite set is its size $|S|$: the 10 even numbers up to 20 give $|S| = 10$. A rule that nothing meets still makes a set, the empty set $\\emptyset = \\{\\}$, with $|\\emptyset| = 0$. No whole number has $x^2 = 2$, so $\\{x \\in U \\mid x^2 = 2\\} = \\emptyset$ for every $N$.",
      },
    ],

    draw(g, f) {
      const N = size.value;
      const inS = members();
      const pass = TEST[rule.value];

      // The universe: the numbers 1 to N in a box, members in gold.
      g.polygon(
        [
          { x: -7.7, y: -2.7 },
          { x: -1.0, y: -2.7 },
          { x: -1.0, y: 3.8 },
          { x: -7.7, y: 3.8 },
        ],
        { color: C.dim, width: 1.5 },
      );
      g.label({ x: -7.4, y: 3.4 }, "U", { color: C.dim, size: 16, bold: true, align: "left" });
      for (let x = 1; x <= N; x++) {
        const col = (x - 1) % 6;
        const row = Math.floor((x - 1) / 6);
        const at = { x: -6.95 + col * 1.05, y: 2.75 - row * 1.15 };
        const yes = pass(x);
        g.circle(at, 0.42, { color: yes ? GOLD : C.faint, fill: yes ? tint(GOLD, 0.22) : undefined, width: yes ? 2 : 1 });
        g.label(at, String(x), { color: yes ? GOLD : C.dim, size: 15, bold: true });
      }

      const line = (row: number, text: string, color: string, size = 17, alpha = 1): void => {
        g.label({ x: -0.2, y: 3.4 - row * 0.95 }, text, { color, size, bold: true, align: "left", alpha });
      };
      const [plain] = SAYS[rule.value];
      const outside = Array.from({ length: N }, (_, i) => i + 1).find((x) => !pass(x));

      if (f.step === 0) {
        line(0, "S = the numbers in U", C.ink, 17);
        line(0.7, `where ${plain}`, C.ink, 17);
        if (inS.length > 0) line(2, `${inS[Math.min(2, inS.length - 1)]} ∈ S`, GOLD, 22, f.at(0));
        if (outside !== undefined) line(3, `${outside} ∉ S`, C.dim, 22, f.at(0));
        return;
      }
      if (f.step === 1) {
        line(0, `S = ${roster(inS, 8, "…")}`, GOLD, 17);
        line(1.3, "{1, 2, 3} = {3, 1, 2}", C.ink, 17, f.at(1));
        line(2.1, "= {1, 1, 2, 3}", C.ink, 17, f.at(1));
        line(3.1, "order and repeats don't matter", C.dim, 14, f.at(1));
        return;
      }
      if (f.step === 2) {
        line(0, `S = {x ∈ U | ${plain}}`, GOLD, 18);
        line(1.1, "the set of x in U", C.dim, 15, f.at(2));
        line(1.8, `such that ${plain}`, C.dim, 15, f.at(2));
        line(3, `= ${roster(inS, 8, "…")}`, C.ink, 16, f.at(2));
        return;
      }
      line(0, `|U| = ${N}`, C.ink, 18);
      line(1, `|S| = ${inS.length}`, GOLD, 22);
      if (inS.length === 0) line(2.2, "S = ∅, the empty set", GOLD, 18, f.at(3));
    },

    readout(f) {
      const inS = members();
      const [, tex] = SAYS[rule.value];
      const list = inS.length === 0 ? "\\emptyset" : `\\{${inS.slice(0, 10).join(", ")}${inS.length > 10 ? ", \\ldots" : ""}\\}`;
      const rows: Readout[] = [{ label: "Rule", tex: `S = \\{x \\in U \\mid ${tex}\\}` }];
      if (f.step >= 1) rows.push({ label: "Listed", tex: `S = ${list}`, tone: "good" });
      if (f.step >= 3) rows.push({ label: "Size", tex: `|S| = ${inS.length}`, tone: inS.length === 0 ? "warn" : "good" });
      return rows;
    },

    likes: [
      {
        title: "A guest list",
        text: "A guest list is a set: each person is on it or not, writing a name twice does not invite them twice, and the order of the names changes nothing. 'Everyone in the class' is the same list given by a rule instead of by names.",
      },
      {
        title: "Sorting the laundry",
        text: "'Everything that is white' picks some clothes out of the basket. Each item either meets the rule or it does not, and if nothing in the basket is white the pile is empty, but it is still a pile you can talk about.",
      },
    ],

    uses: [
      {
        title: "Filters in an online shop",
        text: "Ticking 'in stock' and 'under 20 dollars' in a shop's filters asks for the set $\\{x \\in \\text{catalogue} \\mid x \\text{ in stock and price} < 20\\}$. The shop never lists the products by hand; it checks the rule against each one, and a rule nothing meets returns the empty set: 'no results'.",
        tags: ["computing", "money"],
        image: {
          src: shopFilterSetImage,
          caption: "A shop filter is set-builder notation: keep each product x in the catalogue that meets the rule.",
          alt: "Six product cards with prices; the three in stock under 20 dollars are outlined in gold, beside the line {x ∈ catalogue | in stock, price < 20}.",
        },
      },
      {
        title: "A scale is a set of notes",
        text: "The C major scale is the set $\\{C, D, E, F, G, A, B\\}$, seven of the twelve pitch classes. Played up or down, or with notes repeated, it is the same set, and a note either belongs to the key or it does not: $F \\in$ C major, while $F\\sharp \\notin$ C major.",
        tags: ["music"],
        image: {
          src: musicScaleSetImage,
          caption: "C major is a set of seven of the twelve pitch classes: F is in it, F♯ is not.",
          alt: "A piano octave of twelve keys with the seven white keys C, D, E, F, G, A, B marked as members of C major and F♯ marked not a member, beside C major = {C, D, E, F, G, A, B}.",
        },
      },
    ],
  };
});
