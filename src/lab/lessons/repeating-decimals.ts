// Repeating decimals. Long division of p by q only ever leaves remainders
// 0 to q − 1, so either a remainder is 0 and the decimal stops, or one comes
// back and the digits cycle from there. Multiplying by a power of 10 and
// subtracting turns any repeating decimal back into a fraction, and the
// decimal stops exactly when q, in lowest terms, has no primes but 2 and 5.

import { C, tint } from "../draw.ts";
import { factorize, gcd } from "../kit/integers.ts";
import { sup } from "../kit/powers.ts";
import type { Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import cyclic142857Image from "../../images/cyclic-142857.svg";
import splitBillThirdsImage from "../../images/split-bill-thirds.svg";

const PRE = C.cyan;
const LOOP = C.gold;
const STOP = C.green;
const REP = C.violet;
const LIMIT = 30;

type Expansion = { whole: number; digits: number[]; rems: number[]; start: number };

/** p/q in decimal: the whole part, the digits after the point, the remainder
 * before each digit, and where the repeating block starts (−1 if it stops). */
export function expand(p: number, q: number): Expansion {
  const digits: number[] = [];
  const rems: number[] = [];
  const seen = new Map<number, number>();
  let rem = p % q;
  while (rem !== 0 && !seen.has(rem)) {
    seen.set(rem, rems.length);
    rems.push(rem);
    digits.push(Math.floor((10 * rem) / q));
    rem = (10 * rem) % q;
  }
  return { whole: Math.floor(p / q), digits, rems, start: rem === 0 ? -1 : seen.get(rem)! };
}

/** The decimal as text, with the repeating block in brackets. */
const written = (e: Expansion): string => {
  if (e.digits.length === 0) return String(e.whole);
  if (e.start < 0) return `${e.whole}.${e.digits.join("")}`;
  return `${e.whole}.${e.digits.slice(0, e.start).join("")}(${e.digits.slice(e.start).join("")})`;
};

/** The decimal run out to n places, for showing the repeat. */
const runOut = (p: number, q: number, n: number): string => {
  let rem = p % q;
  let out = `${Math.floor(p / q)}.`;
  for (let i = 0; i < n; i++) {
    out += Math.floor((10 * rem) / q);
    rem = (10 * rem) % q;
  }
  return out;
};

const bigGcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : bigGcd(b, a % b));

export default lesson((s) => {
  const p = s.slider({ label: "p =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 40, value: 3, step: 1 });
  const q = s.slider({ label: "q =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 2, max: LIMIT, value: 7, step: 1 });

  return {
    steps: [
      {
        title: "Long division",
        text: "To write $\\frac{p}{q}$ as a decimal, divide: each step multiplies the remainder by 10, takes out as many $q$'s as fit, and writes that count as the next digit. For $\\frac{3}{7}$: 30 holds four 7s with 2 over, 20 holds two with 6 over, and so on.",
      },
      {
        title: "Remainders must repeat",
        text: "Every remainder is one of $0, 1, \\ldots, q - 1$. If one is 0 the division stops. If not, within $q - 1$ steps some remainder comes back, and from then on every step repeats. So the decimal of a fraction always stops or repeats, with a block at most $q - 1$ digits long.",
      },
      {
        title: "Back to a fraction",
        text: "Any repeating decimal is a fraction. For $x = 0.\\overline{27}$, $100x = 27.\\overline{27}$; subtracting, $99x = 27$, so $x = \\frac{27}{99} = \\frac{3}{11}$. Shift by one power of 10 for each repeating digit, subtract to cancel the endless tail, and divide. So the rationals are exactly the decimals that stop or repeat.",
      },
      {
        title: "Which decimals stop",
        text: "A stopping decimal is a fraction over a power of 10, and $10^n = 2^n 5^n$. So $\\frac{p}{q}$ in lowest terms stops exactly when $q$ has no prime factors but 2 and 5: $\\frac{3}{8} = \\frac{375}{1000} = 0.375$, but $\\frac{1}{3}$, $\\frac{1}{6}$ and $\\frac{1}{7}$ repeat forever.",
      },
    ],

    draw(g, f) {
      const [P, Q] = [p.value, q.value];
      const e = expand(P, Q);
      const loops = e.start >= 0;
      const tone = (i: number): string => (!loops ? STOP : i >= e.start ? LOOP : PRE);
      const head = (text: string, y = 4.1, color: string = C.ink): void => g.label({ x: 1.6, y }, text, { color, size: 18, bold: true, align: "left" });

      if (f.step === 0) {
        const shown = Math.min(e.rems.length + (loops ? 1 : 0), 9);
        for (let i = 0; i < shown; i++) {
          const rem = i < e.rems.length ? e.rems[i] : e.rems[e.start];
          const d = Math.floor((10 * rem) / Q);
          const next = (10 * rem) % Q;
          const y = 3.9 - i * 0.78;
          const alpha = Math.min(1, f.at(0) * shown - i + 1);
          const back = i >= e.rems.length;
          g.label({ x: -7.4, y }, `${rem} × 10 = ${10 * rem}`, { color: C.dim, size: 15, bold: true, align: "left", alpha });
          g.label({ x: -3.6, y }, `= ${d} × ${Q} + ${next}`, { color: C.ink, size: 15, bold: true, align: "left", alpha });
          g.label({ x: -0.6, y }, back ? "again" : String(d), { color: back ? LOOP : tone(i), size: 17, bold: true, align: "left", alpha });
        }
        head(`${P}/${Q} = ${written(e)}`);
        head(loops ? "brackets mark the repeat" : "remainder 0: it stops", 3.2, C.dim);
        return;
      }

      if (f.step === 1) {
        const centre: Vec = { x: -3.4, y: 0.7 };
        const R = 3.0;
        const spot = (k: number): Vec => ({ x: centre.x + R * Math.sin((k / Q) * 2 * Math.PI), y: centre.y + R * Math.cos((k / Q) * 2 * Math.PI) });
        for (let k = 0; k < Q; k++) {
          const used = e.rems.indexOf(k);
          const color = k === 0 ? C.red : used >= 0 ? tone(used) : C.faint;
          g.point(spot(k), { color, r: used >= 0 || k === 0 ? 6 : 4 });
          const out = { x: centre.x + (R + 0.42) * Math.sin((k / Q) * 2 * Math.PI), y: centre.y + (R + 0.42) * Math.cos((k / Q) * 2 * Math.PI) };
          g.label(out, String(k), { color: used >= 0 || k === 0 ? color : C.dim, size: Q > 20 ? 10 : 12, bold: used >= 0 });
        }
        const path = [...e.rems, loops ? e.rems[e.start] : 0];
        const steps = path.length - 1;
        for (let i = 0; i < steps; i++) {
          const alpha = Math.min(1, f.at(1) * steps - i + 1);
          g.arrow(spot(path[i]), spot(path[i + 1]), { color: i + 1 === steps && loops ? LOOP : tone(i), width: 2, alpha });
        }
        head(`${Q} possible remainders`);
        head(loops ? `remainder ${e.rems[e.start]} comes back` : "remainder 0 is reached", 3.2, loops ? LOOP : STOP);
        head(loops ? `repeat of ${e.digits.length - e.start} digits` : `stops after ${e.digits.length} digits`, 2.3, C.dim);
        return;
      }

      if (f.step === 2) {
        const m = loops ? e.start : e.digits.length;
        const k = loops ? e.digits.length - e.start : 0;
        const pre = e.digits.slice(0, m).join("");
        const rep = e.digits.slice(m).join("");
        const lines: [string, string][] = [];
        const x = runOut(P, Q, Math.min(m + 2 * k, 16)) + (loops ? "…" : "");
        lines.push([`x = ${x}`, C.ink]);
        if (!loops) {
          const den = 10n ** BigInt(m);
          const num = BigInt(`${e.whole}${pre}`);
          lines.push([`10${sup(m)}x = ${num}`, C.ink]);
          lines.push([`x = ${num}/${den}`, C.ink]);
        } else {
          const n1 = BigInt(`${e.whole}${pre}`);
          const n2 = BigInt(`${e.whole}${pre}${rep}`);
          const den = 10n ** BigInt(m + k) - 10n ** BigInt(m);
          const tail = `${rep}${rep}`.slice(0, Math.min(k * 2, 12)) + "…";
          lines.push([`10${sup(m + k)}x = ${n2}.${tail}`, C.ink]);
          if (m > 0) lines.push([`10${sup(m)}x = ${n1}.${tail}`, C.ink]);
          lines.push([`${den}x = ${n2 - n1}`, LOOP]);
          lines.push([`x = ${n2 - n1}/${den}`, C.ink]);
        }
        const d = gcd(P, Q);
        lines.push([`= ${P / d}/${Q / d}`, LOOP]);
        lines.forEach(([text, color], i) => {
          const alpha = i === 0 ? 1 : Math.min(1, f.at(2) * lines.length - i + 1);
          g.label({ x: -7.4, y: 3.8 - i * 0.95 }, text, { color, size: 19, bold: true, align: "left", alpha });
        });
        return;
      }

      // Which denominators stop: a grid of 2 … 30, coloured by kind.
      const cols = 6;
      const size = 1.0;
      for (let n = 2; n <= LIMIT; n++) {
        const i = n - 2;
        const c = { x: -7.2 + (i % cols) * (size + 0.15), y: 3.6 - Math.floor(i / cols) * (size + 0.15) };
        const stops = factorize(n).every(([pr]) => pr === 2 || pr === 5);
        const color = stops ? STOP : REP;
        const here = n === Q / gcd(P, Q);
        g.polygon([{ x: c.x, y: c.y }, { x: c.x + size, y: c.y }, { x: c.x + size, y: c.y - size }, { x: c.x, y: c.y - size }], { color: here ? C.gold : color, fill: tint(color, here ? 0.5 : 0.2), width: here ? 3 : 1.5 });
        g.label({ x: c.x + size / 2, y: c.y - 0.38 }, `1/${n}`, { color: C.ink, size: 13, bold: true });
        const ex = expand(1, n);
        g.label({ x: c.x + size / 2, y: c.y - 0.75 }, ex.start < 0 ? `${ex.digits.length} dp` : `↻ ${ex.digits.length - ex.start}`, { color, size: 11, bold: true });
      }
      const d = gcd(P, Q);
      const low = Q / d;
      const fs = factorize(low);
      const stops = fs.every(([pr]) => pr === 2 || pr === 5);
      const text = fs.map(([pr, k]) => `${pr}${k > 1 ? sup(k) : ""}`).join(" × ") || "1";
      head(d > 1 ? `${P}/${Q} = ${P / d}/${low}` : `${P}/${Q}, in lowest terms`, 4.1);
      head(fs.length === 1 && fs[0][1] === 1 ? `${low} is prime` : `${low} = ${text}`, 3.2, stops ? STOP : REP);
      head(stops ? "only 2s and 5s: it stops" : "another prime: it repeats", 2.3, stops ? STOP : REP);
      head(`= ${written(e)}`, 1.4, C.gold);
      g.label({ x: 1.6, y: 0.5 }, "green stops, violet repeats", { color: C.dim, size: 12, align: "left" });
      g.label({ x: 1.6, y: 0.05 }, "dp: decimal places; ↻: repeat length", { color: C.dim, size: 12, align: "left" });
    },

    readout(f) {
      const [P, Q] = [p.value, q.value];
      const e = expand(P, Q);
      const d = gcd(P, Q);
      const tex =
        e.digits.length === 0
          ? `${e.whole}`
          : e.start < 0
            ? `${e.whole}.${e.digits.join("")}`
            : `${e.whole}.${e.digits.slice(0, e.start).join("")}\\overline{${e.digits.slice(e.start).join("")}}`;
      const rows: Readout[] = [{ label: e.start < 0 ? "Stops" : "Repeats", tex: `\\frac{${P}}{${Q}} = ${tex}`, tone: "good" }];
      if (f.step === 3) {
        const low = Q / d;
        const fs = factorize(low);
        rows.push({ label: "Denominator in lowest terms", tex: `${low} = ${fs.map(([pr, k]) => (k > 1 ? `${pr}^{${k}}` : `${pr}`)).join(" \\cdot ") || "1"}`, tone: "dim" });
      } else if (e.start >= 0) {
        rows.push({ label: "Repeat length", tex: `${e.digits.length - e.start} \\le q - 1 = ${Q - 1}`, tone: "dim" });
      }
      return rows;
    },

    likes: [
      {
        title: "A clock hand coming round",
        text: "A hand that jumps the same way each tick on a dial of $q$ marks must land on a mark it has already visited within $q$ ticks, and from then on it retraces its path. Long division is that hand, and the remainders are the marks.",
      },
      {
        title: "Ninths",
        text: "Dividing by 9 shows the pattern most plainly: $\\frac{1}{9} = 0.111\\ldots$, $\\frac{4}{9} = 0.444\\ldots$, and $\\frac{9}{9} = 0.999\\ldots$, which is exactly 1. A repeating decimal and a stopping one can name the same number.",
      },
    ],

    uses: [
      {
        title: "The cyclic number 142857",
        text: "One seventh is $0.\\overline{142857}$, and since dividing by 7 can leave every remainder 1 to 6, the multiples $\\frac{2}{7}, \\frac{3}{7}, \\ldots$ start the same cycle at a different place. So $142857 \\times 2 = 285714$ and $142857 \\times 3 = 428571$ are the same six digits turned round, a classic number trick.",
        tags: ["trade-tricks"],
        image: {
          src: cyclic142857Image,
          caption: "One seventh is 0.142857 repeating, so 142857 × 2 = 285714 and 142857 × 3 = 428571: the same digits, cycled round.",
          alt: "The six digits 1 4 2 8 5 7 in gold discs round a circle with clockwise arrows, beside the lines 1/7 = 0.142857142857…, 142857 × 2 = 285714 and 142857 × 3 = 428571, and the note same digits, rotated.",
        },
      },
      {
        title: "Splitting a bill three ways",
        text: "A bill of 100 dollars shared by three is $33.\\overline{3}$ dollars each, which no amount of cents can pay exactly, because 3 is not a factor of any power of 10. Paying 33.33 each leaves one cent over, so someone pays 33.34.",
        tags: ["money"],
        image: {
          src: splitBillThirdsImage,
          caption: "A 100 dollar bill split three ways is 33.33 repeating each; paying 33.33 each leaves one cent over.",
          alt: "Under the heading 100 dollars ÷ 3, three equal piles of notes and coins each labelled 33.33, and past a dashed divider one gold coin labelled 1¢ left, above the line 1/3 = 0.333….",
        },
      },
    ],
  };
});
