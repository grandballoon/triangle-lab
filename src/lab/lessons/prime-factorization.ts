// Primes and factorization. n dots go into columns of w with nothing left
// over exactly when w divides n; a prime is a number whose dots only make
// the one-column rectangle. The sieve finds the primes up to 100, and a
// factor tree splits any n into primes, always the same ones.

import { C, tint } from "../draw.ts";
import { clamp } from "../geo.ts";
import { divisors, factorize, isPrime, smallestFactor, texFactors } from "../kit/integers.ts";
import { sup } from "../kit/powers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import cicadaPrimeCyclesImage from "../../images/cicada-prime-cycles.svg";
import padlockTwoPrimesImage from "../../images/padlock-two-primes.svg";

const DOT = C.cyan;
const LEFT = C.red;
const PRIME = C.gold;
/** The colour each sieving prime crosses its multiples out in. */
const SIEVE: [number, string][] = [
  [2, C.blue],
  [3, C.pink],
  [5, C.green],
  [7, C.orange],
];

export default lesson((s) => {
  const n = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 100, value: 12, step: 1 });
  const w = s.slider({ label: "columns of", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 12, value: 3, step: 1 });

  return {
    steps: [
      {
        title: "Rectangles of dots",
        text: "Try to stand $n$ dots in columns of $w$. They make a rectangle, with nothing left over, exactly when $w$ divides $n$. So each rectangle is a factor pair: 12 dots make $1 \\times 12$, $2 \\times 6$ and $3 \\times 4$, and the divisors of 12 are $1, 2, 3, 4, 6, 12$.",
      },
      {
        title: "Primes",
        text: "A prime is a whole number with exactly two divisors, 1 and itself: its dots make only the one-column rectangle. 2, 3, 5, 7, 11 and 13 are prime; 1 is not, having only one divisor. A number above 1 that is not prime is composite, and it has a divisor no bigger than its square root.",
      },
      {
        title: "The sieve",
        text: "To find the primes up to 100, cross out the multiples of 2 after 2, then of 3, of 5 and of 7. That is enough, since a composite number up to 100 has a factor no bigger than $\\sqrt{100} = 10$. The numbers left, in gold, are the 25 primes below 100.",
      },
      {
        title: "Factor trees",
        text: "Split $n$ into two factors, and keep splitting until every branch ends in a prime. However you split, the same primes come out: every number above 1 is a product of primes in exactly one way, apart from their order. This is the fundamental theorem of arithmetic, and the prime factorization is how a number is built.",
      },
    ],

    draw(g, f) {
      const N = n.value;
      if (f.step <= 1) {
        const W = w.value;
        const cols = Math.ceil(N / W);
        const sx = Math.min(0.55, 14 / cols);
        const sy = Math.min(0.55, 6.6 / W);
        const r = clamp(Math.min(sx, sy) * 14, 2.5, 7);
        const x0 = -((cols - 1) * sx) / 2;
        const y0 = -2.6;
        const short = N % W !== 0;
        for (let i = 0; i < N; i++) {
          const [col, row] = [Math.floor(i / W), i % W];
          const color = short && col === cols - 1 ? LEFT : f.step === 1 && isPrime(N) ? PRIME : DOT;
          g.point({ x: x0 + col * sx, y: y0 + row * sy }, { color, r });
        }
        const text = short ? `${N} = ${Math.floor(N / W)} × ${W} + ${N % W}` : `${N} = ${cols} × ${W}`;
        g.label({ x: 0, y: y0 + (W - 1) * sy }, text, { color: short ? LEFT : DOT, size: 16, bold: true, dy: 26 });
        return;
      }

      if (f.step === 2) {
        const cell = 0.7;
        const [x0, y0] = [-3.5, 3.7];
        const shown = f.at(2);
        for (let v = 1; v <= 100; v++) {
          const [col, row] = [(v - 1) % 10, Math.floor((v - 1) / 10)];
          const a = { x: x0 + col * cell, y: y0 - (row + 1) * cell };
          const b = { x: a.x + cell, y: a.y + cell };
          const centre = { x: a.x + cell / 2, y: a.y + cell / 2 };
          // Each prime's turn comes a quarter of the way further through the step.
          const k = SIEVE.findIndex(([p]) => v !== p && v % p === 0 && smallestFactor(v) === p);
          const crossed = k >= 0 && shown > (k + 1) / (SIEVE.length + 1);
          const prime = isPrime(v) && shown > 0.95;
          const color = crossed ? SIEVE[k][1] : prime ? PRIME : C.faint;
          box(g, a, b, { color: C.faint, fill: crossed ? tint(SIEVE[k][1], 0.18) : prime ? tint(PRIME, 0.3) : undefined, width: 1 });
          g.label(centre, String(v), { color: crossed ? tint(SIEVE[k][1], 0.7) : prime ? PRIME : C.ink, size: 11, bold: prime });
          if (crossed) g.segment({ x: a.x + 0.12, y: a.y + 0.12 }, { x: b.x - 0.12, y: b.y - 0.12 }, { color, width: 1.5 });
          if (v === N) box(g, a, b, { color: C.ink, width: 3 });
        }
        SIEVE.forEach(([p, color], i) => {
          g.label({ x: 4.4, y: 3.0 - i * 0.7 }, `multiples of ${p}`, { color, size: 13, bold: true, align: "left", alpha: shown > (i + 1) / (SIEVE.length + 1) ? 1 : 0.25 });
        });
        g.label({ x: 4.4, y: 3.0 - SIEVE.length * 0.7 }, "primes", { color: PRIME, size: 13, bold: true, align: "left", alpha: shown > 0.95 ? 1 : 0.25 });
        return;
      }

      // A factor tree: split off the smallest prime each time.
      let m = N;
      let at = { x: -5, y: 3.8 };
      const dx = 1.1;
      const dy = 1.1;
      while (true) {
        const prime = isPrime(m);
        g.point(at, { color: prime ? PRIME : C.ink, r: prime ? 7 : 5 });
        g.label(at, String(m), { color: prime ? PRIME : C.ink, size: 16, bold: true, dy: 12 });
        if (prime) break;
        const p = smallestFactor(m);
        const leaf = { x: at.x - dx, y: at.y - dy };
        const next = { x: at.x + dx, y: at.y - dy };
        g.segment(at, leaf, { color: C.dim, width: 2 });
        g.segment(at, next, { color: C.dim, width: 2 });
        g.point(leaf, { color: PRIME, r: 7 });
        g.label(leaf, String(p), { color: PRIME, size: 16, bold: true, dy: -22 });
        m /= p;
        at = next;
      }
      g.label({ x: 2.6, y: 3.8 }, `${N} = ${factorize(N).map(([p, e]) => (e === 1 ? `${p}` : `${p}${sup(e)}`)).join(" · ")}`, { color: PRIME, size: 18, bold: true, align: "left" });
    },

    readout(f) {
      const N = n.value;
      const ds = divisors(N);
      const rows: Readout[] = [];
      if (f.step === 0) {
        const pairs = ds.filter((d) => d * d <= N).map((d) => `${d} \\times ${N / d}`);
        rows.push({ label: "Factor pairs", tex: pairs.join(",\\ ") });
        rows.push({ label: "Divisors", tex: ds.join(", ") });
      } else if (f.step === 1) {
        rows.push({ label: "Divisors", tex: ds.join(", ") });
        rows.push(isPrime(N) ? { label: "Prime", tex: `${N} \\text{ has exactly two divisors}`, tone: "good" } : { label: "Composite", tex: `${N} = ${smallestFactor(N)} \\times ${N / smallestFactor(N)}`, tone: "warn" });
      } else if (f.step === 2) {
        rows.push(isPrime(N) ? { label: "n is prime", tex: `${N}`, tone: "good" } : { label: "Crossed out as a multiple of", tex: `${smallestFactor(N)}`, tone: "dim" });
        rows.push({ label: "Primes below 100", tex: "25" });
      } else {
        rows.push({ label: "Prime factorization", tex: `${N} = ${texFactors(N)}`, tone: "good" });
        rows.push({ label: "Number of divisors", tex: `${ds.length}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Arranging a class into teams",
        text: "Twenty-four pupils split evenly into teams of 2, 3, 4, 6, 8 or 12. Twenty-three pupils cannot be split into equal teams at all, unless everyone plays alone or all together: 23 is prime.",
      },
      {
        title: "Building with bricks of one kind",
        text: "A toy model built only from bricks you cannot break apart has one parts list, however you assemble it. Primes are those unbreakable bricks of multiplication, and the factorization is the parts list.",
      },
    ],

    uses: [
      {
        title: "Periodical cicadas",
        text: "Some cicadas spend 13 or 17 years underground and then come out all at once. One idea for why: a predator on a 2-, 3- or 4-year cycle rarely lines up with a prime cycle, and a 13-year brood and a 17-year brood come out together only every $13 \\times 17 = 221$ years.",
        tags: ["nature"],
        image: {
          src: cicadaPrimeCyclesImage,
          caption: "Cicadas that come out every 13 years and every 17 years appear together only once every 221 years, since 13 and 17 are prime.",
          alt: "Two cicadas labelled every 13 years and every 17 years above a timeline with marks every 13 and every 17 years, the first shared mark at 221 in gold, and the line 13 × 17 = 221 years.",
        },
      },
      {
        title: "Locks made of primes",
        text: "Much internet encryption, such as RSA, rests on a lopsided fact: multiplying two large primes is quick, but finding them again from their product is very slow. With small numbers, $61 \\times 53 = 3233$ is easy to work out, but recovering 61 and 53 from 3233 takes trial and error; with primes hundreds of digits long, it takes longer than anyone has.",
        tags: ["computing"],
        image: {
          src: padlockTwoPrimesImage,
          caption: "Multiplying two primes is quick, 61 × 53 = 3233, but finding them again from 3233 alone is slow: the idea behind RSA encryption.",
          alt: "A red padlock marked 3233 beside two gold keys marked 61 and 53, with the line 61 × 53 = 3233.",
        },
      },
    ],
  };
});

