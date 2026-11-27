// Σ notation. The index k steps from the bottom number to the top one, and
// each value of k gives a term; Σ adds them. The lesson steps k along a row
// of cards with a running total, then shows the rules that let a sum be split
// up, the closed forms worth knowing, and moving the index.

import { C, tint } from "../draw.ts";
import { num } from "../kit/sequences.ts";
import { lesson, type Readout } from "../scene.ts";
import crateLayersPyramidImage from "../../images/crate-layers-pyramid.svg";
import monthlyRainfallTotalImage from "../../images/monthly-rainfall-total.svg";

const CARD = C.cyan;
const GOLD = C.gold;

const TERMS = ["k", "2k − 1", "k²", "2ᵏ"] as const;
type Term = (typeof TERMS)[number];

const value = (t: Term, k: number): number => (t === "k" ? k : t === "2k − 1" ? 2 * k - 1 : t === "k²" ? k * k : 2 ** k);
const tex = (t: Term): string => (t === "k" ? "k" : t === "2k − 1" ? "(2k - 1)" : t === "k²" ? "k^2" : "2^k");

/** The closed form of the sum of the term from k = 1 (k = 0 for 2ᵏ) to n. */
const closed = (t: Term, n: number): number =>
  t === "k" ? (n * (n + 1)) / 2 : t === "2k − 1" ? n * n : t === "k²" ? (n * (n + 1) * (2 * n + 1)) / 6 : 2 ** (n + 1) - 1;
const closedText = (t: Term): string => (t === "k" ? "n(n + 1)/2" : t === "2k − 1" ? "n²" : t === "k²" ? "n(n + 1)(2n + 1)/6" : "2ⁿ⁺¹ − 1");
const closedFrom = (t: Term): number => (t === "2ᵏ" ? 0 : 1);

export default lesson((s) => {
  const term = s.choice("Term", TERMS, "k²");
  const lower = s.slider({ label: "from k =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 5, value: 1, step: 1 });
  const upper = s.slider({ label: "to", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 10, value: 5, step: 1 });

  const ks = (): number[] => {
    const out: number[] = [];
    for (let k = lower.value; k <= upper.value; k++) out.push(k);
    return out;
  };

  return {
    steps: [
      {
        title: "Reading the sign",
        text: "$\\sum_{k=1}^{5} k^2$ says: let $k$ run through the whole numbers from 1 up to 5, work out $k^2$ for each, and add. So it is $1 + 4 + 9 + 16 + 25 = 55$. From $k = m$ to $k = n$ there are $n - m + 1$ terms, and a sum whose top is below its bottom has no terms and is 0.",
      },
      {
        title: "Splitting a sum",
        text: "Because adding can be done in any order, a sum splits term by term and constants come out: $\\sum (a_k + b_k) = \\sum a_k + \\sum b_k$ and $\\sum c\\,a_k = c \\sum a_k$. Adding the constant $c$ once for each of $n$ terms gives $\\sum_{k=1}^{n} c = cn$. So $\\sum_{k=1}^{4} (3k + 2) = 3 \\cdot 10 + 4 \\cdot 2 = 38$.",
      },
      {
        title: "Sums worth knowing",
        text: "From earlier lessons, $\\sum_{k=1}^{n} k = \\frac{n(n + 1)}{2}$, $\\sum_{k=1}^{n} (2k - 1) = n^2$ and $\\sum_{k=0}^{n} 2^k = 2^{n+1} - 1$. One more is worth learning: $\\sum_{k=1}^{n} k^2 = \\frac{n(n + 1)(2n + 1)}{6}$, so $1 + 4 + \\cdots + 100 = \\frac{10 \\cdot 11 \\cdot 21}{6} = 385$.",
      },
      {
        title: "Moving the index",
        text: "A sum that starts partway is a whole sum less its start: $\\sum_{k=m}^{n} a_k = \\sum_{k=1}^{n} a_k - \\sum_{k=1}^{m-1} a_k$, so $\\sum_{k=4}^{6} k^2 = 91 - 14 = 77$. The letter is only a counter: putting $j = k - 1$ turns $\\sum_{k=1}^{n} 2^{k-1}$ into $\\sum_{j=0}^{n-1} 2^j$, the same terms.",
      },
    ],

    draw(g, f) {
      const t = term.value;
      const list = ks();
      const [m, n] = [lower.value, upper.value];
      const vals = list.map((k) => value(t, k));
      const total = vals.reduce((p, q) => p + q, 0);

      // The sign itself.
      g.label({ x: -6.6, y: 3.0 }, "Σ", { color: C.ink, size: 64, bold: true });
      g.label({ x: -6.6, y: 4.35 }, String(n), { color: GOLD, size: 16, bold: true });
      g.label({ x: -6.6, y: 1.7 }, `k = ${m}`, { color: GOLD, size: 16, bold: true });
      g.label({ x: -5.7, y: 3.0 }, t, { color: CARD, size: 28, bold: true, align: "left" });

      // One card per value of k, with the running total under it.
      const slots = Math.max(list.length, 6);
      const w = Math.min(1.5, 14.4 / slots);
      const size = w * 0.8;
      const x0 = -7.2 + w / 2;
      const shown = f.step === 0 ? f.at(0) * (list.length + 0.5) : list.length + 1;
      let running = 0;
      list.forEach((k, i) => {
        const alpha = Math.max(0, Math.min(1, shown - i));
        running += vals[i];
        const c = { x: x0 + i * w, y: 0.2 };
        const h = size / 2;
        g.polygon([{ x: c.x - h, y: c.y - h }, { x: c.x + h, y: c.y - h }, { x: c.x + h, y: c.y + h }, { x: c.x - h, y: c.y + h }], { color: CARD, fill: tint(CARD, 0.22), width: 2, alpha });
        g.label(c, num(vals[i]), { color: C.ink, size: 15, bold: true, alpha });
        g.label({ x: c.x, y: c.y + h }, `k=${k}`, { color: C.dim, size: 12, bold: true, dy: 11, alpha });
        g.label({ x: c.x, y: c.y - h }, num(running), { color: GOLD, size: 13, bold: true, dy: -12, alpha });
      });
      if (list.length === 0) g.label({ x: 0, y: 0.2 }, "no terms: the sum is 0", { color: C.red, size: 16, bold: true });
      g.label({ x: -7.2, y: -1.15 }, "running total", { color: C.dim, size: 12, bold: true, align: "left", dy: -6 });

      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: -7.2, y: -1.9 - row * 0.7 }, text, { color, size: 17, bold: true, align: "left", alpha });
      };
      const count = Math.max(0, n - m + 1);
      const shownSum = list.length > 6 ? `${vals.slice(0, 4).map((v) => num(v)).join(" + ")} + … + ${num(vals[vals.length - 1])}` : vals.map((v) => num(v)).join(" + ");
      if (f.step === 0) {
        g.label({ x: -1.6, y: 3.0 }, `= ${list.length ? shownSum : "0"} = ${num(total)}`, { color: C.ink, size: 18, bold: true, align: "left", alpha: f.at(0) });
        note(0, `${count} term${count === 1 ? "" : "s"}: ${n} − ${m} + 1`, C.ink);
      } else if (f.step === 1) {
        g.label({ x: -1.6, y: 3.0 }, `= ${num(total)}`, { color: C.ink, size: 18, bold: true, align: "left" });
        note(0, `Σ 3(${t}) + 2 = 3 × ${num(total)} + ${count} × 2 = ${num(3 * total + 2 * count)}`, GOLD, f.at(1));
      } else if (f.step === 2) {
        const from = closedFrom(t);
        g.label({ x: -1.6, y: 3.0 }, `= ${num(total)}`, { color: C.ink, size: 18, bold: true, align: "left" });
        note(0, `from k = ${from}: Σ ${t} = ${closedText(t)}`, C.ink);
        note(1, m === from ? `n = ${n}: ${num(closed(t, n))}, as counted` : `set k from ${from} to compare: ${num(closed(t, n))}`, m === from ? GOLD : C.dim, f.at(2));
      } else {
        const from = closedFrom(t);
        g.label({ x: -1.6, y: 3.0 }, `= ${num(total)}`, { color: C.ink, size: 18, bold: true, align: "left" });
        if (m < from) {
          note(0, `start at k = ${from} or more to split off the start`, C.dim);
        } else {
          const [whole, start] = [closed(t, n), closed(t, m - 1)];
          note(0, `(k = ${from} to ${n}) − (k = ${from} to ${m - 1})`, C.ink);
          note(1, `= ${num(whole)} − ${num(start)} = ${num(whole - start)}`, n >= m ? GOLD : C.dim, f.at(3));
        }
      }
    },

    readout(f) {
      const t = term.value;
      const [m, n] = [lower.value, upper.value];
      const list = ks();
      const total = list.reduce((p, k) => p + value(t, k), 0);
      const rows: Readout[] = [{ label: "Sum", tex: `\\sum_{k=${m}}^{${n}} ${tex(t)} = ${total}`, tone: "good" }];
      if (f.step === 1) rows.push({ label: "Split", tex: `\\sum_{k=${m}}^{${n}} \\big(3${tex(t)} + 2\\big) = 3 \\cdot ${total} + 2 \\cdot ${list.length} = ${3 * total + 2 * list.length}` });
      if (f.step === 2) rows.push({ label: "Closed form", tex: `\\sum_{k=${closedFrom(t)}}^{${n}} ${tex(t)} = ${closed(t, n)}` });
      return rows;
    },

    likes: [
      {
        title: "A loop in a program",
        text: "Σ reads like a counting loop: start a total at 0, let k run from the bottom value to the top, and add the term each time round. The sign is just a short way to write the loop.",
      },
      {
        title: "Totting up a shopping list",
        text: "A receipt lists item 1, item 2, and so on, with a total at the bottom. Writing the total as the sum of the price of item k, from k = 1 to the number of items, says the same thing in one line.",
      },
    ],

    uses: [
      {
        title: "Crates stacked as a pyramid",
        text: "A stack of crates with 1 on top, then a 2 by 2 layer, then 3 by 3, down to a 5 by 5 base holds $\\sum_{k=1}^{5} k^2 = \\frac{5 \\cdot 6 \\cdot 11}{6} = 55$ crates. A warehouse with a 10 by 10 base would hold 385.",
        tags: ["building"],
        image: {
          src: crateLayersPyramidImage,
          caption: "Square layers of 1, 4, 9, 16 and 25 crates hold 5 × 6 × 11 ÷ 6 = 55 crates in all.",
          alt: "A stepped pyramid of crates seen from the side, five layers from 1 on top to 5 across at the base, the base layer in gold, beside the line Σ k² from k = 1 to 5 = 55.",
        },
      },
      {
        title: "A year of rainfall",
        text: "A gardener notes the rain each month, $r_1$ for January up to $r_{12}$ for December. The year's rain is $\\sum_{k=1}^{12} r_k$, and the summer months alone are $\\sum_{k=6}^{8} r_k$: the bounds pick out which terms to add.",
        tags: ["gardening", "nature"],
        image: {
          src: monthlyRainfallTotalImage,
          caption: "Twelve months of rain add to a year's total; the bounds k = 6 to 8 pick out June to August.",
          alt: "Twelve bars of monthly rainfall in millimetres, the June, July and August bars in gold adding to 135 mm, beside the year's total of 600 mm.",
        },
      },
    ],
  };
});
