// Proof by contradiction: Euclid's proof that there are infinitely many
// primes. Suppose the primes were only those in a finite list. Multiply them
// all and add one: the new number leaves remainder 1 on division by every
// listed prime, yet it has some prime factor, and that factor cannot be on
// the list. The supposition is impossible, so no finite list holds them all.

import { C, tint } from "../draw.ts";
import { factorize } from "../kit/integers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import primeRecordDigitsImage from "../../images/prime-record-digits.svg";
import keyPrimesNeverRunOutImage from "../../images/key-primes-never-run-out.svg";

const LIST = C.cyan;
const NEW = C.gold;
const BAD = C.red;
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19];

/** 2 · 3 · 5 · … up to the k-th prime, and that product plus one. */
function euclid(k: number): { list: number[]; product: number; n: number } {
  const list = PRIMES.slice(0, k);
  const product = list.reduce((a, b) => a * b, 1);
  return { list, product, n: product + 1 };
}

/** A whole number with commas between groups of three digits. */
const grouped = (v: number): string => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default lesson((s) => {
  const k = s.slider({ label: "primes on the list:", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 8, value: 6, step: 1 });

  return {
    steps: [
      {
        title: "Suppose the opposite",
        text: "To prove there are infinitely many primes, suppose there are not. Then every prime is on some finite list $p_1, p_2, \\ldots, p_k$. A proof by contradiction takes the opposite of what it wants, follows it carefully, and shows that it leads to something impossible.",
      },
      {
        title: "Multiply and add one",
        text: "Build one number from the whole list: $N = p_1 p_2 \\cdots p_k + 1$. With the six primes up to 13, $N = 30030 + 1 = 30031$. Nothing about $N$ depends on the list being short or long; it can always be built.",
      },
      {
        title: "No listed prime divides it",
        text: "Each prime on the list divides the product $p_1 p_2 \\cdots p_k$, so dividing $N$ by it leaves remainder 1. So none of $p_1, \\ldots, p_k$ divides $N$.",
      },
      {
        title: "The contradiction",
        text: "$N$ is bigger than 1, so it has a prime factor, perhaps $N$ itself. That prime is not on the list, which was supposed to hold every prime. The supposition is impossible, so there are infinitely many primes. $N$ need not be prime: $30031 = 59 \\times 509$, and both factors are new.",
      },
    ],

    draw(g, f) {
      const { list, product, n } = euclid(k.value);
      const factors = factorize(n).map(([p]) => p);

      // The supposed list of every prime, as chips.
      const w = 0.95;
      const x0 = -(list.length * w) / 2;
      g.label({ x: 0, y: 4.3 }, "“every prime there is”", { color: C.dim, size: 14, bold: true });
      list.forEach((p, i) => {
        const a = { x: x0 + i * w + 0.06, y: 2.9 };
        const crossed = f.step >= 3 ? f.at(3) : 0;
        box(g, a, { x: a.x + w - 0.12, y: 3.8 }, { color: LIST, fill: tint(LIST, 0.2), width: 2 });
        g.label({ x: a.x + (w - 0.12) / 2, y: 3.35 }, String(p), { color: LIST, size: 17, bold: true });
        if (i < list.length - 1) g.label({ x: a.x + w - 0.06, y: 3.35 }, "·", { color: C.dim, size: 16, bold: true, alpha: f.at(1) });
        if (crossed > 0 && i === 0) {
          g.segment({ x: x0 - 0.1, y: 2.8 }, { x: x0 + list.length * w + 0.1, y: 3.9 }, { color: BAD, width: 3, alpha: crossed });
        }
      });

      // N = product + 1.
      const shownN = f.at(1);
      g.label({ x: 0, y: 2.2 }, `N = ${grouped(product)} + 1 = ${grouped(n)}`, { color: NEW, size: 20, bold: true, alpha: shownN });

      // Each listed prime leaves remainder 1.
      if (f.step >= 2) {
        const cols = list.length > 4 ? 2 : 1;
        const per = Math.ceil(list.length / cols);
        list.forEach((p, i) => {
          const [col, row] = [Math.floor(i / per), i % per];
          const x = cols === 1 ? -2.6 : -6.6 + col * 6.8;
          const q = Math.floor(n / p);
          const alpha = Math.min(1, f.at(2) * list.length - i + 1);
          g.label({ x, y: 1.2 - row * 0.62 }, `${grouped(n)} = ${p} × ${grouped(q)} + 1`, { color: LIST, size: 15, bold: true, align: "left", alpha });
        });
      }

      // A prime factor of N, and it is new.
      if (f.step >= 3) {
        const text = factors.length === 1 ? `${grouped(n)} is itself prime` : `${grouped(n)} = ${factors.map(grouped).join(" × ")}`;
        g.label({ x: 0, y: -1.9 }, text, { color: NEW, size: 19, bold: true, alpha: f.at(3) });
        g.label({ x: 0, y: -2.6 }, `${factors.length === 1 ? "a prime" : "primes"} missing from the list`, { color: BAD, size: 15, bold: true, alpha: f.at(3) });
      }
    },

    readout(f) {
      const { list, product, n } = euclid(k.value);
      const rows: Readout[] = [{ label: "Supposed list", tex: list.join(", ") }];
      if (f.step >= 1) rows.push({ label: "Built", tex: `N = ${list.join(" \\cdot ")} + 1 = ${product} + 1 = ${n}` });
      if (f.step >= 2) rows.push({ label: "Remainders", tex: `N \\bmod p_i = 1 \\text{ for every } i`, tone: "good" });
      if (f.step >= 3) {
        const fs = factorize(n).map(([p]) => p);
        rows.push({ label: "New prime", tex: fs.length === 1 ? `${n} \\text{ is prime}` : `${n} = ${fs.join(" \\times ")}`, tone: "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "Ruling out a suspect",
        text: "A detective supposes the butler did it and follows that through: then he was in the kitchen at nine, but he was seen in town at nine. The supposition leads to the impossible, so the butler is ruled out. That is a proof by contradiction.",
      },
      {
        title: "A full guest list",
        text: "Someone claims their list has every guest. You find a person at the party, provably not on the list. One counterexample sinks the claim, and Euclid's recipe makes one for any list anyone writes.",
      },
    ],

    uses: [
      {
        title: "Record primes",
        text: "People search for ever larger primes, and the record keeps moving: in 2024 the largest known prime was $2^{136279841} - 1$, with over 41 million digits. Euclid's proof says the search can never come to an end, since there is always a bigger prime than any yet found.",
        tags: ["computing"],
        image: {
          src: primeRecordDigitsImage,
          caption: "The largest prime known in 2024, 2 to the power 136,279,841 minus 1, has 41,024,320 digits; Euclid's proof says there is always a larger one.",
          alt: "A long strip of digits fading off to the right, under the expression 2^136279841 − 1 and the label 41,024,320 digits, with a gold arrow pointing beyond the strip labelled always another.",
        },
      },
      {
        title: "Keys that never run out",
        text: "Encryption on the web builds its keys from large primes picked at random, a fresh pair for each key, so the primes must never run out. Because there are infinitely many, there are always more of a given size than anyone could use: about 1 in every 700 numbers of 300 digits is prime.",
        tags: ["computing"],
        image: {
          src: keyPrimesNeverRunOutImage,
          caption: "Each new key needs fresh large primes, and since there are infinitely many, the supply never runs out.",
          alt: "A row of padlocks, each labelled with a pair of primes p and q, and a gold padlock at the end marked with a new pair, beside the words infinitely many primes.",
        },
      },
    ],
  };
});
