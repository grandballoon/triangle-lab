// Complementary counting. To count the rolls of two dice with at least one
// top face, casework adds the two lines of the grid and takes off the corner
// they share; counting the rolls with no top face and subtracting from the
// total is one product and one subtraction, and it scales to any number of dice.

import { C, tint } from "../draw.ts";
import { texBig } from "../kit/counting.ts";
import { sup } from "../kit/powers.ts";
import { lesson, type Readout } from "../scene.ts";
import passwordAtLeastDigitImage from "../../images/password-at-least-digit.svg";
import fourRollsSixImage from "../../images/four-rolls-six.svg";

const WANT = C.gold;
const NONE = C.blue;
const FIRST = C.cyan;
const SECOND = C.pink;

export default lesson((s) => {
  const n = s.slider({ label: "faces", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 8, value: 6, step: 1 });
  const k = s.slider({ label: "dice", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 5, value: 3, step: 1 });

  return {
    steps: [
      {
        title: "Count it directly",
        text: "Roll two ordinary dice. How many of the $6 \\times 6 = 36$ outcomes show at least one six? Six outcomes have a six on the first die and six have one on the second, but the double six is in both, so there are $6 + 6 - 1 = 11$. Counting directly means splitting into cases and watching for overlaps.",
      },
      {
        title: "Count the rest",
        text: "Instead count the outcomes with no six at all: $5 \\times 5 = 25$, one easy product. Every other outcome has at least one six, so there are $36 - 25 = 11$. When the cases you want are messy and the ones you do not want are simple, count those and subtract: wanted equals total minus unwanted.",
      },
      {
        title: "More dice",
        text: "With $k$ dice of $n$ faces there are $n^k$ outcomes, and $(n-1)^k$ of them miss the top face on every die. So $n^k - (n-1)^k$ show it at least once. For three ordinary dice that is $216 - 125 = 91$; casework would need every way the sixes can overlap, but the complement is one subtraction.",
      },
    ],

    draw(g, f) {
      const N = n.value;
      const K = k.value;

      if (f.step <= 1) {
        const size = Math.min(0.78, 6.2 / N);
        const x0 = -6.6;
        const y0 = 3.4;
        for (let i = 0; i < N; i++) {
          g.label({ x: x0 + (i + 0.5) * size, y: y0 + 0.35 }, String(i + 1), { color: FIRST, size: 13, bold: true });
          g.label({ x: x0 - 0.3, y: y0 - (i + 0.5) * size }, String(i + 1), { color: SECOND, size: 13, bold: true, align: "right" });
        }
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const top = i === N - 1 || j === N - 1;
            const both = i === N - 1 && j === N - 1;
            const p = { x: x0 + i * size, y: y0 - j * size };
            let color: string = C.dim;
            let fill = tint(C.ink, 0.04);
            if (f.step === 0 && top) {
              color = both ? WANT : i === N - 1 ? FIRST : SECOND;
              fill = tint(color, both ? 0.5 : 0.25);
            }
            if (f.step === 1) {
              color = top ? WANT : NONE;
              fill = tint(color, top ? 0.3 : 0.18 * f.at(1));
            }
            g.polygon([p, { x: p.x + size, y: p.y }, { x: p.x + size, y: p.y - size }, { x: p.x, y: p.y - size }], {
              color,
              fill,
              width: 1.5,
            });
          }
        }
        g.label({ x: x0 + (N * size) / 2, y: y0 + 0.85 }, "first die", { color: FIRST, size: 13, bold: true });
        const tx = 3.4;
        if (f.step === 0) {
          g.label({ x: tx, y: 2.4 }, `first die shows ${N}: ${N}`, { color: FIRST, size: 17, bold: true });
          g.label({ x: tx, y: 1.5 }, `second die shows ${N}: ${N}`, { color: SECOND, size: 17, bold: true });
          g.label({ x: tx, y: 0.6 }, "both, counted twice: − 1", { color: WANT, size: 17, bold: true });
          g.label({ x: tx, y: -0.6 }, `${N} + ${N} − 1 = ${2 * N - 1}`, { color: WANT, size: 21, bold: true, alpha: f.at(0) });
        } else {
          g.label({ x: tx, y: 2.4 }, `all outcomes: ${N}² = ${N * N}`, { color: C.ink, size: 17, bold: true });
          g.label({ x: tx, y: 1.5 }, `no ${N}: ${N - 1}² = ${(N - 1) ** 2}`, { color: NONE, size: 17, bold: true });
          g.label({ x: tx, y: -0.6 }, `${N * N} − ${(N - 1) ** 2} = ${2 * N - 1}`, { color: WANT, size: 21, bold: true, alpha: f.at(1) });
        }
        return;
      }

      // A bar for all n^k outcomes, split into those that miss the top face and the rest.
      const total = N ** K;
      const none = (N - 1) ** K;
      const x0 = -6.4;
      const w = 12.8;
      const split = x0 + (w * none) / total;
      const bar = (from: number, to: number, color: string, alpha: number): void =>
        g.polygon(
          [
            { x: from, y: 1.6 },
            { x: to, y: 1.6 },
            { x: to, y: 0.4 },
            { x: from, y: 0.4 },
          ],
          { color, fill: tint(color, 0.3), width: 2, alpha },
        );
      bar(x0, split, NONE, 1);
      bar(split, x0 + w, WANT, f.at(2));
      g.label({ x: 0, y: 3.2 }, `${K} dice of ${N} faces: ${N}${sup(K)} = ${total} outcomes`, { color: C.ink, size: 18, bold: true });
      g.label({ x: (x0 + split) / 2, y: 1.0 }, `no ${N}: ${none}`, { color: C.ink, size: 15, bold: true });
      g.label({ x: 0, y: -0.6 }, `at least one ${N}: ${total} − ${none} = ${total - none}`, { color: WANT, size: 20, bold: true, alpha: f.at(2) });
      g.label({ x: 0, y: -1.5 }, `that is ${((100 * (total - none)) / total).toFixed(1)}% of all rolls`, { color: C.dim, size: 15, bold: true });
    },

    readout(f) {
      const N = n.value;
      const K = k.value;
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Casework", tex: `${N} + ${N} - 1 = ${2 * N - 1}`, tone: "good" });
      else if (f.step === 1) rows.push({ label: "Complement", tex: `${N}^2 - ${N - 1}^2 = ${N * N} - ${(N - 1) ** 2} = ${2 * N - 1}`, tone: "good" });
      else
        rows.push({
          label: "At least one",
          tex: `${N}^{${K}} - ${N - 1}^{${K}} = ${texBig(N ** K)} - ${texBig((N - 1) ** K)} = ${texBig(N ** K - (N - 1) ** K)}`,
          tone: "good",
        });
      return rows;
    },

    likes: [
      {
        title: "Who is missing from class",
        text: "A teacher with 30 pupils does not count the ones who came in; she counts the 2 empty desks and says 28 are here. Counting the few you do not want and subtracting is quicker than counting the many you do.",
      },
      {
        title: "Every room but one",
        text: "Asked how many rooms in a house are not the kitchen, nobody lists them; they take the kitchen off the total. Complementary counting is the same move when the thing left out is easier to count than what is left.",
      },
    ],

    uses: [
      {
        title: "Passwords that need a digit",
        text: "Six characters from 26 lower-case letters and 10 digits give $36^6 = 2{,}176{,}782{,}336$ passwords. Those with no digit at all number $26^6 = 308{,}915{,}776$, so $36^6 - 26^6 = 1{,}867{,}866{,}560$ contain at least one digit. A rule demanding a digit removes only about one password in seven.",
        tags: ["computing"],
        image: {
          src: passwordAtLeastDigitImage,
          caption: "Six characters from 36: 36⁶ − 26⁶ = 1 867 866 560 passwords have at least one digit, about six in seven.",
          alt: "Six password boxes, one showing a gold digit, above a bar split into a small part, letters only, 26⁶, and a large gold part, at least one digit.",
        },
      },
      {
        title: "A gambler's bet on four rolls",
        text: "An old gamblers' bet was that a six would turn up in four rolls of a die. Of the $6^4 = 1296$ ways the rolls can go, $5^4 = 625$ have no six, so $1296 - 625 = 671$ have one, just over half. The bet wins slightly more often than it loses, a margin that casework would struggle to show.",
        tags: ["game-design"],
        image: {
          src: fourRollsSixImage,
          caption: "Four rolls of a die: 6⁴ − 5⁴ = 1296 − 625 = 671 of the 1296 outcomes include a six, just over half.",
          alt: "Four dice, the third showing six in gold, beside a bar split at the halfway mark into 625 with no six and 671 with a six.",
        },
      },
    ],
  };
});
