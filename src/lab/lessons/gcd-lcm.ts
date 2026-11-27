// Common factors and multiples. The divisors two numbers share, the
// greatest of them found by cutting an a × b rectangle into squares
// (Euclid's algorithm), the multiples they share, and both read off the
// prime factorizations, which shows gcd × lcm = ab.

import { C, tint } from "../draw.ts";
import { divisors, euclid, factorize, gcd, lcm } from "../kit/integers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import gearLcmMeetingImage from "../../images/gear-lcm-meeting.svg";
import squareTilesGcdImage from "../../images/square-tiles-gcd.svg";

const A = C.cyan;
const B = C.pink;
const BOTH = C.gold;
const TOP = 24;
/** The colours the rounds of squares in Euclid's rectangle take in turn. */
const ROUNDS = [C.blue, C.violet, C.green, C.orange, C.cyan, C.pink];

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: TOP, value: 12, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: TOP, value: 18, step: 1 });

  return {
    steps: [
      {
        title: "Common divisors",
        text: "List the divisors of $a$ and of $b$ and see which they share. For 12 and 18 the common divisors are 1, 2, 3 and 6, and the greatest of them is the greatest common divisor, $\\gcd(12, 18) = 6$. Every common divisor divides the gcd. When the gcd is 1, $a$ and $b$ are relatively prime.",
      },
      {
        title: "Euclid's algorithm",
        text: "Cut the largest squares you can from an $a \\times b$ rectangle, then from what is left, and so on. The last, smallest squares fit exactly, and their side is $\\gcd(a, b)$, since any length that measures both sides measures every cut. In numbers: $18 = 1 \\cdot 12 + 6$ and $12 = 2 \\cdot 6 + 0$, so the gcd is 6. Each step swaps a pair for a smaller pair with the same gcd.",
      },
      {
        title: "Common multiples",
        text: "Mark the multiples of $a$ above the line and of $b$ below it. They first meet at the least common multiple, $\\operatorname{lcm}(12, 18) = 36$, and then at every multiple of it. Adding $\\frac{1}{12} + \\frac{1}{18}$ uses it: $\\frac{3}{36} + \\frac{2}{36} = \\frac{5}{36}$.",
      },
      {
        title: "Both from the primes",
        text: "Put each number's prime factors in its circle, the shared ones in the middle. The gcd is the product of the middle, the primes both have; the lcm is the product of everything, each prime as often as the number with more of it. Since every factor is counted once in each, $\\gcd(a, b) \\cdot \\operatorname{lcm}(a, b) = ab$.",
      },
    ],

    draw(g, f) {
      const [x, y] = [a.value, b.value];
      if (f.step === 0) {
        const rows: [number, number, string, string][] = [
          [x, 2.8, A, `divisors of ${x}`],
          [y, 1.3, B, `divisors of ${y}`],
          [0, -0.2, BOTH, "common divisors"],
        ];
        const step = 0.58;
        const x0 = -6.9;
        const common = divisors(gcd(x, y));
        for (const [n, row, color, name] of rows) {
          g.label({ x: x0, y: row + 0.3 }, name, { color, size: 13, bold: true, dy: 12, align: "left" });
          for (let d = 1; d <= TOP; d++) {
            const on = n === 0 ? common.includes(d) : n % d === 0;
            const lo = { x: x0 + (d - 1) * step, y: row - 0.25 };
            const hi = { x: lo.x + step - 0.08, y: row + 0.25 };
            box(g, lo, hi, { color: on ? color : C.faint, fill: on ? tint(color, 0.3) : undefined, width: n === 0 && d === gcd(x, y) ? 3 : 1 });
            g.label({ x: (lo.x + hi.x) / 2, y: row }, String(d), { color: on ? C.ink : C.faint, size: 11, bold: on });
          }
        }
        return;
      }

      if (f.step === 1) {
        const [W, H] = [Math.max(x, y), Math.min(x, y)];
        const sc = Math.min(13 / W, 6.0 / H);
        const origin = { x: -6.5, y: -2.5 };
        const put = (u: number, v: number) => ({ x: origin.x + u * sc, y: origin.y + v * sc });
        let [u, v, w, h] = [0, 0, W, H];
        let round = 0;
        const last = gcd(x, y);
        const alpha = f.at(1);
        while (w > 0 && h > 0) {
          const side = Math.min(w, h);
          const k = Math.floor(Math.max(w, h) / side);
          const color = side === last ? BOTH : ROUNDS[round % ROUNDS.length];
          for (let i = 0; i < k; i++) {
            const lo = w >= h ? put(u + i * side, v) : put(u, v + i * side);
            box(g, lo, { x: lo.x + side * sc, y: lo.y + side * sc }, { color, fill: tint(color, 0.22), width: 2, alpha });
            if (side * sc > 0.9) g.label({ x: lo.x + (side * sc) / 2, y: lo.y + (side * sc) / 2 }, String(side), { color, size: 13, bold: true, alpha });
          }
          if (w >= h) {
            u += k * side;
            w -= k * side;
          } else {
            v += k * side;
            h -= k * side;
          }
          round++;
        }
        box(g, put(0, 0), put(W, H), { color: C.ink, width: 2.5 });
        g.label(put(W / 2, 0), String(W), { color: C.dim, size: 13, dy: -18 });
        g.label(put(0, H / 2), String(H), { color: C.dim, size: 13, dx: -10, align: "right" });
        return;
      }

      if (f.step === 2) {
        const L = lcm(x, y);
        const end = L * 1.25;
        const per = 14 / end;
        const at = (n: number) => ({ x: -7 + n * per, y: 0.3 });
        g.segment(at(0), at(end), { color: C.dim, width: 2 });
        g.label(at(0), "0", { color: C.dim, size: 12, dy: -20 });
        for (const [n, color, up] of [[x, A, true], [y, B, false]] as const) {
          for (let m = n; m <= end; m += n) {
            const p = at(m);
            g.segment(p, { x: p.x, y: p.y + (up ? 0.9 : -0.9) }, { color: m % L === 0 ? BOTH : color, width: m % L === 0 ? 3 : 2 });
            if ((14 / (end / n) > 0.55 || m === n) && !(up && m === L)) g.label({ x: p.x, y: p.y + (up ? 0.9 : -0.9) }, String(m), { color: m % L === 0 ? BOTH : color, size: 12, bold: m % L === 0, dy: up ? 12 : -20 });
          }
        }
        g.point(at(L), { color: BOTH, r: 7, alpha: f.at(2) });
        g.label(at(L), `lcm = ${L}`, { color: BOTH, size: 16, bold: true, dy: 70, alpha: f.at(2) });
        g.label({ x: -7, y: 1.2 }, `multiples of ${x}`, { color: A, size: 13, bold: true, dy: 22, align: "left" });
        g.label({ x: -7, y: -0.6 }, `multiples of ${y}`, { color: B, size: 13, bold: true, dy: -30, align: "left" });
        return;
      }

      // A Venn diagram of prime factors.
      const left = { x: -1.7, y: 0.6 };
      const right = { x: 1.7, y: 0.6 };
      const R = 3;
      g.circle(left, R, { color: A, width: 2.5, fill: tint(A, 0.08) });
      g.circle(right, R, { color: B, width: 2.5, fill: tint(B, 0.08) });
      g.label({ x: left.x - 1.4, y: left.y + R }, String(x), { color: A, size: 18, bold: true, dy: 8 });
      g.label({ x: right.x + 1.4, y: right.y + R }, String(y), { color: B, size: 18, bold: true, dy: 8 });
      const [only, shared, other] = split(x, y);
      const column = (cx: number, list: number[], color: string): void => {
        const gap = Math.min(0.75, 4.4 / Math.max(1, list.length));
        list.forEach((p, i) => g.label({ x: cx, y: left.y + ((list.length - 1) / 2 - i) * gap }, String(p), { color, size: 18, bold: true }));
      };
      column(-3.1, only, A);
      column(0, shared, BOTH);
      column(3.1, other, B);
      const G = gcd(x, y);
      g.label({ x: 0, y: -2.9 }, `gcd = ${shared.length ? shared.join(" × ") + (shared.length > 1 ? ` = ${G}` : "") : "1"}    lcm = ${lcm(x, y)}`, { color: BOTH, size: 15, bold: true, alpha: f.at(3) });
    },

    readout(f) {
      const [x, y] = [a.value, b.value];
      const G = gcd(x, y);
      const L = lcm(x, y);
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Common divisors", tex: divisors(G).join(", ") });
        rows.push({ label: "Greatest", tex: `\\gcd(${x}, ${y}) = ${G}`, tone: "good" });
      } else if (f.step === 1) {
        const lines = euclid(x, y).map(([m, n, q, r]) => `${m} = ${q} \\cdot ${n} + ${r}`);
        rows.push({ label: "Euclid", tex: lines.slice(0, 4).join(",\\quad ") + (lines.length > 4 ? ",\\ \\ldots" : "") });
        rows.push({ label: "Last nonzero remainder", tex: `\\gcd(${x}, ${y}) = ${G}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Least common multiple", tex: `\\operatorname{lcm}(${x}, ${y}) = ${L} = ${L / x} \\cdot ${x} = ${L / y} \\cdot ${y}`, tone: "good" });
      } else {
        rows.push({ label: "Factorizations", tex: `${x} = ${texList(x)},\\quad ${y} = ${texList(y)}` });
        rows.push({ label: "gcd × lcm", tex: `${G} \\cdot ${L} = ${G * L} = ${x} \\cdot ${y}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Two runners on a track",
        text: "One runner laps a track every 12 minutes and another every 18. Starting together, they next cross the line together after 36 minutes, the first multiple of both: the first runner on lap 3, the second on lap 2.",
      },
      {
        title: "Cutting ribbon into equal pieces",
        text: "Ribbons 12 m and 18 m long can both be cut, with no waste, into pieces 1, 2, 3 or 6 metres long. The longest piece that works for both is 6 m, their greatest common divisor.",
      },
    ],

    uses: [
      {
        title: "Gears that wear evenly",
        text: "When a 12-tooth gear drives an 18-tooth gear, a given pair of teeth meets again only after $\\operatorname{lcm}(12, 18) = 36$ teeth have passed. Gear makers often choose tooth counts with no common factor, such as 12 and 17, so the lcm is the whole product, 204, and every tooth meets every other, spreading the wear.",
        tags: ["machines"],
        image: {
          src: gearLcmMeetingImage,
          caption: "Gears with 12 and 18 teeth bring the same two teeth together again after 36 teeth have passed: the least common multiple of 12 and 18.",
          alt: "Two meshed gears of 12 and 18 teeth, each with one gold marked tooth touching the other's, beside the lines 12 × 3 = 36, 18 × 2 = 36 and lcm(12, 18) = 36.",
        },
      },
      {
        title: "Square tiles for a floor",
        text: "To cover a 120 cm by 84 cm floor with equal square tiles and no cutting, the side must divide both lengths. The largest that does is $\\gcd(120, 84) = 12$ cm, making a grid of $10 \\times 7 = 70$ tiles; smaller common divisors, such as 6 cm, work too but need four times as many.",
        tags: ["building", "home"],
        image: {
          src: squareTilesGcdImage,
          caption: "The largest square tile that exactly covers a 120 cm by 84 cm floor is 12 cm, the greatest common divisor: 10 tiles by 7.",
          alt: "A floor 120 cm by 84 cm covered by a 10 by 7 grid of square tiles, one corner tile gold and marked 12 cm, with the lines gcd(120, 84) = 12 cm and 10 × 7 tiles.",
        },
      },
    ],
  };
});

/** The prime factors of a and b, split into a's alone, both, and b's alone, each with repeats. */
function split(a: number, b: number): [number[], number[], number[]] {
  const fa = new Map(a > 1 ? factorize(a) : []);
  const fb = new Map(b > 1 ? factorize(b) : []);
  const primes = [...new Set([...fa.keys(), ...fb.keys()])].sort((p, q) => p - q);
  const only: number[] = [];
  const shared: number[] = [];
  const other: number[] = [];
  for (const p of primes) {
    const [ea, eb] = [fa.get(p) ?? 0, fb.get(p) ?? 0];
    const both = Math.min(ea, eb);
    for (let i = 0; i < both; i++) shared.push(p);
    for (let i = both; i < ea; i++) only.push(p);
    for (let i = both; i < eb; i++) other.push(p);
  }
  return [only, shared, other];
}

/** n as a product of its primes with repeats, for TeX: 2 \cdot 2 \cdot 3. */
function texList(n: number): string {
  if (n === 1) return "1";
  return factorize(n)
    .flatMap(([p, e]) => Array<number>(e).fill(p))
    .join(" \\cdot ");
}
