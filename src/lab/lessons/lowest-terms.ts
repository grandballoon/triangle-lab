// Lowest terms. Put the fraction p/q at the lattice point (q, p): equal
// fractions lie on one line through the origin, and lowest terms is the
// first lattice point that line meets. Adding two of those points gives the
// mediant, whose line always lies between theirs.

import { C, tint } from "../draw.ts";
import { gcd } from "../kit/integers.ts";
import { fmt, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import fifthRatioStringsImage from "../../images/fifth-ratio-strings.svg";
import gearRatioLowestImage from "../../images/gear-ratio-lowest.svg";

const ONE = C.cyan;
const TWO = C.pink;
const MID = C.gold;
const O: Vec = { x: -7.2, y: -2.8 };
const SIDE = 7.2;

export default lesson((s) => {
  const p = s.slider({ label: "p =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 0, max: 12, value: 6, step: 1 });
  const q = s.slider({ label: "q =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 1, max: 12, value: 9, step: 1 });
  const r = s.slider({ label: "r =", at: { x: 0, y: -4.3 }, width: 2.8, min: 0, max: 12, value: 1, step: 1 });
  const t = s.slider({ label: "s =", at: { x: 3.8, y: -4.3 }, width: 2.8, min: 1, max: 12, value: 4, step: 1 });

  return {
    steps: [
      {
        title: "Fractions are directions",
        text: "Put the fraction $\\frac{p}{q}$ at the point $q$ across and $p$ up. The line from the origin through it has slope $\\frac{p}{q}$, and every fraction equal to it, such as $\\frac{2p}{2q}$ and $\\frac{3p}{3q}$, sits on the same line. Equal fractions are one direction, written many ways.",
      },
      {
        title: "Lowest terms",
        text: "The first lattice point the line meets after the origin is the fraction in lowest terms. You reach it by dividing $p$ and $q$ by their greatest common divisor: $\\frac{6}{9} = \\frac{6 \\div 3}{9 \\div 3} = \\frac{2}{3}$. A fraction is in lowest terms exactly when $\\gcd(p, q) = 1$, and then no lattice point lies between it and the origin.",
      },
      {
        title: "Comparing, and the mediant",
        text: "Set $r$ and $s$ for a second fraction $\\frac{r}{s}$. The steeper line is the bigger fraction, and $\\frac{p}{q} < \\frac{r}{s}$ exactly when $ps < qr$. Adding the two points gives $\\frac{p + r}{q + s}$, the mediant: the diagonal of their parallelogram, so its line always lies between the two.",
      },
    ],

    draw(g, f) {
      const [P, Q, R, S] = [p.value, q.value, r.value, t.value];
      const both = f.step === 2;
      const n = both ? Math.max(12, P + R, Q + S) : 12;
      const u = SIDE / n;
      const at = (x: number, y: number): Vec => ({ x: O.x + x * u, y: O.y + y * u });

      g.segment(at(0, 0), at(n, 0), { color: C.dim, width: 1.5 });
      g.segment(at(0, 0), at(0, n), { color: C.dim, width: 1.5 });
      for (let x = 0; x <= n; x++) for (let y = 0; y <= n; y++) g.point(at(x, y), { color: C.faint, r: n > 12 ? 2 : 3 });
      const tick = n > 12 ? 4 : 3;
      for (let k = tick; k <= n; k += tick) {
        g.label(at(k, 0), String(k), { color: C.dim, size: 11, dy: -14 });
        g.label(at(0, k), String(k), { color: C.dim, size: 11, dx: -8, align: "right" });
      }
      g.label(at(n, 0), "q", { color: C.dim, size: 13, bold: true, dx: 10, align: "left" });
      g.label(at(0, n), "p", { color: C.dim, size: 13, bold: true, dy: 12 });

      /** The ray through (x, y), clipped to the grid, with its lattice points. */
      const ray = (x: number, y: number, color: string, alpha = 1, marks = true): void => {
        const k = n / Math.max(x, y);
        g.segment(at(0, 0), at(x * k, y * k), { color, width: 2, alpha });
        if (!marks) return;
        const d = gcd(x, y) || 1;
        const [a, b] = [x / d, y / d];
        for (let m = 1; m * Math.max(a, b) <= n; m++) g.point(at(a * m, b * m), { color, r: 5, alpha });
      };

      if (!both) {
        ray(Q, P, ONE);
        const d = gcd(P, Q) || Q;
        const [a, b] = [Q / d, P / d];
        g.point(at(Q, P), { color: ONE, r: 8 });
        g.label(at(Q, P), `${P}/${Q}`, { color: ONE, size: 15, bold: true, dx: 10, dy: 10, align: "left" });
        if (f.step === 1) {
          g.point(at(a, b), { color: MID, r: 8, alpha: f.at(1) });
          if (d > 1) g.label(at(a, b), `${b}/${a}`, { color: MID, size: 15, bold: true, dx: 10, dy: -12, align: "left", alpha: f.at(1) });
        }
        const lines: [string, string][] =
          f.step === 0
            ? [[`${P}/${Q}`, ONE], ...[2, 3].map((m): [string, string] => [`= ${P * m}/${Q * m}`, C.ink]), [`slope ${fmt(P / Q, 3)}`, C.dim]]
            : [[`gcd(${P}, ${Q}) = ${d}`, C.ink], [`${P}/${Q} = ${b}/${a}`, MID], [d === 1 ? "already in lowest terms" : `divide both by ${d}`, C.dim]];
        lines.forEach(([text, color], i) => g.label({ x: 1.6, y: 3.2 - i * 0.9 }, text, { color, size: 18, bold: true, align: "left" }));
        return;
      }

      // Two fractions and their mediant, the diagonal of their parallelogram.
      const sum = { x: Q + S, y: P + R };
      const spread = f.at(2);
      g.polygon([at(0, 0), at(Q, P), at(sum.x, sum.y), at(S, R)], { color: MID, fill: tint(MID, 0.08), width: 1, dash: [4, 4], alpha: spread });
      ray(Q, P, ONE, 1, false);
      ray(S, R, TWO, 1, false);
      ray(sum.x, sum.y, MID, spread, false);
      g.point(at(Q, P), { color: ONE, r: 7 });
      g.point(at(S, R), { color: TWO, r: 7 });
      g.point(at(sum.x, sum.y), { color: MID, r: 7, alpha: spread });
      g.label(at(Q, P), `${P}/${Q}`, { color: ONE, size: 15, bold: true, dx: 10, dy: -10, align: "left" });
      g.label(at(S, R), `${R}/${S}`, { color: TWO, size: 15, bold: true, dx: 10, dy: -10, align: "left" });
      g.label(at(sum.x, sum.y), `${sum.y}/${sum.x}`, { color: MID, size: 15, bold: true, dx: 10, dy: -10, align: "left", alpha: spread });

      const [ps, qr] = [P * S, Q * R];
      const cmp = ps < qr ? "<" : ps > qr ? ">" : "=";
      const [lo, hi] = ps <= qr ? [`${P}/${Q}`, `${R}/${S}`] : [`${R}/${S}`, `${P}/${Q}`];
      const lines: [string, string][] = [
        [`${P}·${S} = ${ps} ${cmp} ${qr} = ${Q}·${R}`, C.ink],
        [`so ${P}/${Q} ${cmp} ${R}/${S}`, C.ink],
        [cmp === "=" ? `mediant ${sum.y}/${sum.x}, the same` : `${lo} < ${sum.y}/${sum.x} < ${hi}`, MID],
      ];
      lines.forEach(([text, color], i) => g.label({ x: 1.6, y: 3.2 - i * 0.9 }, text, { color, size: 17, bold: true, align: "left", alpha: i === 2 ? spread : 1 }));
    },

    readout(f) {
      const [P, Q, R, S] = [p.value, q.value, r.value, t.value];
      const d = gcd(P, Q) || Q;
      const rows: Readout[] = [];
      if (f.step < 2) {
        rows.push({ label: "Lowest terms", tex: `\\frac{${P}}{${Q}} = \\frac{${P} \\div ${d}}{${Q} \\div ${d}} = \\frac{${P / d}}{${Q / d}}`, tone: "good" });
        rows.push({ label: "Decimal", tex: `\\frac{${P}}{${Q}} \\approx ${fmt(P / Q, 4)}`, tone: "dim" });
      } else {
        const between = (P + R) / (Q + S);
        rows.push({ label: "Cross-multiply", tex: `${P} \\cdot ${S} = ${P * S},\\quad ${Q} \\cdot ${R} = ${Q * R}` });
        rows.push({ label: "Mediant", tex: `\\frac{${P} + ${R}}{${Q} + ${S}} = \\frac{${P + R}}{${Q + S}} \\approx ${fmt(between, 4)}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Scaling a recipe",
        text: "A recipe for 6 that uses 4 eggs is the same recipe as one for 3 with 2 eggs: $\\frac{4}{6} = \\frac{2}{3}$ egg per person. Lowest terms is the smallest batch you can make without cutting an egg.",
      },
      {
        title: "Screen shapes",
        text: "A screen 1920 pixels wide and 1080 tall has $\\gcd(1920, 1080) = 120$, so its shape is $\\frac{1920}{1080} = \\frac{16}{9}$. Every 16:9 screen, whatever its size, lies on the same line through the origin.",
      },
    ],

    uses: [
      {
        title: "Gear ratios",
        text: "A 24-tooth gear driving a 36-tooth gear turns it at $\\frac{24}{36} = \\frac{2}{3}$ of its speed, since $\\gcd(24, 36) = 12$. The lowest terms also say how often the same teeth meet again: every 3 turns of the small gear, which is 2 turns of the large one.",
        tags: ["machines"],
        image: {
          src: gearRatioLowestImage,
          caption: "A 24-tooth gear driving a 36-tooth gear: 24 : 36 = 2 : 3, after dividing both by their greatest common divisor 12.",
          alt: "Two meshed gears, a grey one marked 24 teeth and a larger tan one marked 36 teeth, beside the lines 24 : 36 and = 2 : 3 in gold, with ÷ gcd 12 below.",
        },
      },
      {
        title: "Musical intervals",
        text: "Two notes sound sweet together when their frequencies make a fraction with small numbers in lowest terms. A string at 660 Hz against one at 440 Hz is $\\frac{660}{440} = \\frac{3}{2}$, the fifth; $\\frac{2}{1}$ is the octave and $\\frac{5}{4}$ the major third.",
        tags: ["music"],
        image: {
          src: fifthRatioStringsImage,
          caption: "Strings at 660 Hz and 440 Hz make the ratio 660/440 = 3/2, the musical fifth.",
          alt: "Two vibrating strings with shaded wave shapes, a 2-unit string labelled 660 Hz above a 3-unit string labelled 440 Hz, each with a unit ruler beneath, and the line 660/440 = 3/2 in gold.",
        },
      },
    ],
  };
});
