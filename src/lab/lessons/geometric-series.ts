// Geometric sequences and series. Each term is the last times a fixed ratio
// r. Multiply the whole sum S by r and it is the same terms moved one place
// along, so S − rS cancels everything but the first term and the one past the
// last: S = a(1 − rⁿ)/(1 − r).

import { C, tint, type Draw } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { listText, num, sequence, sub } from "../kit/sequences.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import yearlyDepositsGrowthImage from "../../images/yearly-deposits-growth.svg";
import byteAllOnesImage from "../../images/byte-all-ones.svg";

const S_ROW = C.cyan;
const R_ROW = C.orange;
const GOLD = C.gold;

/** One term on a card; struck through once it has cancelled. */
function card(g: Draw, c: Vec, size: number, value: number, color: string, alpha: number, struck = false): void {
  const h = size / 2;
  g.polygon(
    [{ x: c.x - h, y: c.y - h }, { x: c.x + h, y: c.y - h }, { x: c.x + h, y: c.y + h }, { x: c.x - h, y: c.y + h }],
    { color, fill: tint(color, struck ? 0.06 : 0.22), width: 2, alpha: alpha * (struck ? 0.45 : 1) },
  );
  const text = num(value);
  g.label(c, text, { color: struck ? C.dim : C.ink, size: Math.min(16, Math.max(11, 34 * size / Math.max(3, text.length))), bold: true, alpha });
  if (struck) g.segment({ x: c.x - h, y: c.y - h }, { x: c.x + h, y: c.y + h }, { color: C.red, width: 2, alpha });
}

export default lesson((s) => {
  const first = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 1, max: 5, value: 1, step: 1 });
  const ratio = s.slider({ label: "r =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: -3, max: 3, value: 2, step: 0.5 });
  const count = s.slider({ label: "n =", at: { x: 0, y: -4.3 }, width: 2.8, min: 2, max: 7, value: 5, step: 1 });

  return {
    steps: [
      {
        title: "Equal ratios",
        text: "A geometric sequence is multiplied by the same number each time: $a, ar, ar^2, \\ldots$, with common ratio $r$. The $n$th term has been multiplied $n - 1$ times, so it is $ar^{n-1}$. In $3, 6, 12, 24, \\ldots$ the ratio is 2 and the 10th term is $3 \\cdot 2^9 = 1536$.",
      },
      {
        title: "Multiply by r",
        text: "Call the sum $S = a + ar + \\cdots + ar^{n-1}$. Multiplying every term by $r$ gives $rS = ar + ar^2 + \\cdots + ar^n$: the same terms, each moved one place along, with $a$ gone from the front and $ar^n$ new at the end.",
      },
      {
        title: "Subtract",
        text: "Take $rS$ from $S$ and every term the two share cancels, leaving $S - rS = a - ar^n$. So when $r \\ne 1$, $S = \\frac{a(1 - r^n)}{1 - r}$. Doubling from 1 ten times, $1 + 2 + 4 + \\cdots + 512 = \\frac{1 - 2^{10}}{1 - 2} = 1023$. When $r = 1$ every term is $a$ and $S = na$.",
      },
      {
        title: "Any ratio",
        text: "Nothing in the cancelling needed $r$ to be a whole number or positive. With $r = -2$, $1 - 2 + 4 - 8 + 16 = \\frac{1 - (-2)^5}{1 - (-2)} = \\frac{33}{3} = 11$. With $r = \\frac{1}{2}$, $1 + \\frac{1}{2} + \\frac{1}{4} + \\frac{1}{8} = \\frac{1 - \\frac{1}{16}}{\\frac{1}{2}} = \\frac{15}{8}$, just short of 2.",
      },
    ],

    draw(g, f) {
      const [a, r, n] = [first.value, ratio.value, count.value];
      const terms = sequence(a, (t) => t * r, n + 1);
      const w = Math.min(1.7, 14.4 / (n + 1));
      const size = w * 0.82;
      const x0 = -7.2 + w / 2;
      const yS = 2.6;
      const yR = 0.9;
      const S = terms.slice(0, n).reduce((p, q) => p + q, 0);

      g.label({ x: x0 - w / 2, y: yS + size / 2 }, "S", { color: S_ROW, size: 16, bold: true, dy: 14, align: "left" });

      // S: the first n terms.
      for (let k = 0; k < n; k++) {
        const alpha = f.step === 0 ? Math.min(1, f.at(0) * n - k + 1) : 1;
        const struck = f.step >= 2 && k > 0 && r !== 1;
        card(g, { x: x0 + k * w, y: yS }, size, terms[k], S_ROW, alpha, struck && f.at(2) > 0.5);
        if (f.step === 0 && k > 0) {
          g.label({ x: x0 + (k - 0.5) * w, y: yS + size / 2 }, `×${num(r)}`, { color: GOLD, size: 12, bold: true, dy: 10, alpha });
        }
      }

      if (f.step >= 1) {
        // rS: the same terms times r, slid one place along and down a row.
        const t = f.step === 1 ? f.at(1) : 1;
        g.label({ x: x0 - w / 2, y: yR + size / 2 }, "rS", { color: R_ROW, size: 16, bold: true, dy: 14, align: "left", alpha: t });
        for (let k = 1; k <= n; k++) {
          const struck = f.step >= 2 && k < n && r !== 1;
          const c = { x: x0 + (k - 1 + t) * w, y: yS + (yR - yS) * t };
          card(g, c, size, terms[k], R_ROW, Math.min(1, t * 2), struck && f.at(2) > 0.5);
        }
      }

      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: -7.2, y: -0.5 - row * 0.8 }, text, { color, size: 18, bold: true, align: "left", alpha });
      };
      if (f.step === 0) {
        note(0, `a, ar, ar², … with a = ${num(a)}, r = ${num(r)}`, C.ink);
        note(1, `a${sub(n)} = ar${sup(n - 1)} = ${num(a)} × ${r < 0 ? `(${num(r)})` : num(r)}${sup(n - 1)} = ${num(terms[n - 1])}`, GOLD, f.at(0));
      } else if (f.step === 1) {
        note(0, `S = ${listText(terms.slice(0, n), 5, " + ")}`, S_ROW);
        note(1, `rS = ${listText(terms.slice(1), 5, " + ")}`, R_ROW, f.at(1));
      } else if (r === 1) {
        note(0, `r = 1: every term is ${num(a)}, nothing to cancel`, C.red);
        note(1, `S = na = ${n} × ${num(a)} = ${num(n * a)}`, GOLD);
      } else {
        note(0, `S − rS = ${num(a)} − ${num(terms[n])}`, C.ink);
        note(1, `S = (${num(a)} − ${num(terms[n])}) ÷ (1 − ${num(r)}) = ${num(S)}`, GOLD, f.at(2));
      }
    },

    readout(f) {
      const [a, r, n] = [first.value, ratio.value, count.value];
      const rt = r < 0 ? `(${num(r)})` : num(r);
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "nth term", tex: `a r^{${n - 1}} = ${a} \\cdot ${rt}^{${n - 1}} = ${num(a * r ** (n - 1))}`.replace(/−/g, "-"), tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Times r", tex: `rS = ar + ar^2 + \\cdots + ar^{${n}}` });
      } else if (r === 1) {
        rows.push({ label: "Ratio 1", tex: `S = na = ${n * a}`, tone: "warn" });
      } else {
        const S = (a * (1 - r ** n)) / (1 - r);
        rows.push({ label: "Geometric series", tex: `S = \\frac{${a}(1 - ${rt}^{${n}})}{1 - ${rt}} = ${num(S)}`.replace(/−/g, "-"), tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "A rumour passed on",
        text: "One person tells three friends, each of them tells three more, and so on. After five rounds of telling, $1 + 3 + 9 + 27 + 81 + 243 = \\frac{3^6 - 1}{3 - 1} = 364$ people know, and the last round alone is about two thirds of them.",
      },
      {
        title: "Folding a sheet in half",
        text: "Each fold doubles the layers: 1, 2, 4, 8, … After seven folds there are 128 layers, and the creases made along the way, one for each layer folded, number $1 + 2 + \\cdots + 64 = 127$, one fewer than the layers.",
      },
    ],

    uses: [
      {
        title: "Saving every year",
        text: "Put 1000 dollars into an account paying 5% a year, every year for 10 years. The first deposit grows for 9 more years and the last for none, so the balance is $1000(1 + 1.05 + \\cdots + 1.05^9) = 1000 \\cdot \\frac{1.05^{10} - 1}{0.05} \\approx 12\\,578$ dollars, of which 10 000 was paid in.",
        tags: ["money"],
        image: {
          src: yearlyDepositsGrowthImage,
          caption: "Ten yearly deposits of 1000 dollars at 5% grow to 1000 × (1.05¹⁰ − 1) ÷ 0.05 ≈ 12 578 dollars.",
          alt: "Ten bars for ten yearly deposits, each taller than the one after it as it has grown longer, the oldest bar in gold reading 1551 dollars and the newest 1000 dollars, beside the total of about 12 578 dollars.",
        },
      },
      {
        title: "The largest byte",
        text: "A byte is eight bits worth $1, 2, 4, \\ldots, 128$. With every bit set it holds $1 + 2 + \\cdots + 128 = 2^8 - 1 = 255$, which is why a byte counts from 0 to 255 and why a colour channel tops out at 255.",
        tags: ["computing"],
        image: {
          src: byteAllOnesImage,
          caption: "Eight bits all set are worth 1 + 2 + 4 + … + 128 = 2⁸ − 1 = 255.",
          alt: "Eight boxes each holding the digit 1, labelled 128, 64, 32, 16, 8, 4, 2 and 1, with the total 255 in gold beneath and the line 2⁸ − 1 = 255.",
        },
      },
    ],
  };
});
