// Number bases. Group n beads into bundles of b, bundles of bundles, and
// so on: the counts in each place are the digits of n in base b. Repeated
// division by b finds them from the right, multiplying back by powers of b
// recovers n, and base 2 is the case computers use.

import { C, tint } from "../draw.ts";
import { clamp } from "../geo.ts";
import { digits } from "../kit/integers.ts";
import { sup } from "../kit/powers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import byteSwitchesImage from "../../images/byte-switches.svg";
import stopwatchBaseSixtyImage from "../../images/stopwatch-base-sixty.svg";

const DIGIT = C.gold;
const PLACE = [C.cyan, C.green, C.violet, C.pink, C.orange, C.blue, C.red, C.cyan];

export default lesson((s) => {
  const n = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 200, value: 13, step: 1 });
  const b = s.slider({ label: "base", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 2, max: 10, value: 2, step: 1 });

  return {
    steps: [
      {
        title: "Counting in groups",
        text: "Bundle $n$ beads in groups of $b$, then bundle the bundles in groups of $b$, and so on. Each place holds fewer than $b$ of its kind, else it could bundle again, so the counts are digits from 0 to $b - 1$. Read left to right, they write $n$ in base $b$: in base 2, $13 = 1101_2$, one 8, one 4, no 2 and one 1.",
      },
      {
        title: "Converting by repeated division",
        text: "Divide $n$ by $b$: the remainder is the ones digit, and the quotient counts the bundles. Divide that by $b$ for the next digit, and carry on until the quotient is 0. The digits come out right to left: $13 = 6 \\cdot 2 + 1$, $6 = 3 \\cdot 2 + 0$, $3 = 1 \\cdot 2 + 1$, $1 = 0 \\cdot 2 + 1$, so $13 = 1101_2$.",
      },
      {
        title: "Back to base ten",
        text: "Each place is worth a power of the base: $1, b, b^2, b^3$ and so on from the right. Multiply each digit by its place value and add. So $1101_2 = 1 \\cdot 8 + 1 \\cdot 4 + 0 \\cdot 2 + 1 \\cdot 1 = 13$, and $243_5 = 2 \\cdot 25 + 4 \\cdot 5 + 3 = 73$. Our usual numbers are the case $b = 10$.",
      },
      {
        title: "Binary",
        text: "In base 2 every digit is 0 or 1, off or on, which is why computers count this way. Each place doubles the one to its right. Eight binary digits, a byte, run from $0$ to $11111111_2 = 255 = 2^8 - 1$, one less than the next place.",
      },
    ],

    draw(g, f) {
      const [N, B] = [n.value, b.value];
      const ds = digits(N, B);
      const k = ds.length;

      if (f.step === 0) {
        // Place-value columns, highest on the left, each with its beads.
        const colW = Math.min(2.2, 14 / k);
        const x0 = -(k * colW) / 2;
        const r = clamp(colW * 4, 3, 7);
        ds.forEach((d, i) => {
          const place = k - 1 - i;
          const color = PLACE[place % PLACE.length];
          const lo = { x: x0 + i * colW + 0.08, y: -1.8 };
          const hi = { x: lo.x + colW - 0.16, y: 1.4 };
          box(g, lo, hi, { color: tint(color, 0.6), fill: tint(color, 0.06), width: 1.5 });
          g.label({ x: (lo.x + hi.x) / 2, y: hi.y }, place === 0 ? "1s" : `${B}${sup(place)}s`, { color, size: 13, bold: true, dy: 12 });
          const per = 3;
          for (let j = 0; j < d; j++) {
            const [cx, cy] = [j % per, Math.floor(j / per)];
            g.point({ x: (lo.x + hi.x) / 2 + (cx - 1) * Math.min(0.5, colW / 3.4), y: lo.y + 0.45 + cy * 0.55 }, { color, r });
          }
          g.label({ x: (lo.x + hi.x) / 2, y: lo.y }, String(d), { color: DIGIT, size: 22, bold: true, dy: -26 });
        });
        return;
      }

      if (f.step === 1) {
        // The ladder of divisions, digits peeling off on the right.
        let m = N;
        const rows: [number, number, number][] = [];
        do {
          rows.push([m, Math.floor(m / B), m % B]);
          m = Math.floor(m / B);
        } while (m > 0);
        const gap = Math.min(0.9, 7.4 / rows.length);
        rows.forEach(([v, q, r], i) => {
          const y = 3.6 - i * gap;
          const alpha = clamp(f.at(1) * rows.length - i + 0.5, 0.15, 1);
          g.label({ x: -1, y }, `${v} = ${q} × ${B} + `, { color: C.ink, size: 17, align: "right", alpha });
          g.label({ x: -0.8, y }, String(r), { color: DIGIT, size: 19, bold: true, align: "left", alpha });
          g.label({ x: 0.4, y }, i === 0 ? "ones digit" : `${B}${sup(i)}s digit`, { color: C.dim, size: 13, align: "left", alpha });
        });
        g.arrow({ x: 4.4, y: 3.6 - (rows.length - 1) * gap }, { x: 4.4, y: 3.6 }, { color: DIGIT, width: 2 });
        g.label({ x: 4.7, y: 3.6 - ((rows.length - 1) * gap) / 2 }, "read upward", { color: DIGIT, size: 13, bold: true, align: "left" });
        return;
      }

      // Steps 2 and 3: a row of digit cells with place values beneath.
      const cells = f.step === 3 ? Math.max(8, k) : k;
      const show = f.step === 3 ? digits(N, 2) : ds;
      const base = f.step === 3 ? 2 : B;
      const padded = [...Array<number>(cells - show.length).fill(0), ...show];
      const cw = Math.min(1.6, 14 / cells);
      const x0 = -(cells * cw) / 2;
      let total = 0;
      padded.forEach((d, i) => {
        const place = cells - 1 - i;
        const value = base ** place;
        total += d * value;
        const lo = { x: x0 + i * cw + 0.06, y: 0.6 };
        const hi = { x: lo.x + cw - 0.12, y: 0.6 + Math.min(1.4, cw) };
        const on = d > 0;
        const color = f.step === 3 ? (on ? DIGIT : C.faint) : PLACE[place % PLACE.length];
        box(g, lo, hi, { color, fill: on ? tint(color, 0.25) : undefined, width: 2 });
        g.label({ x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 }, String(d), { color: on ? C.ink : C.faint, size: 22, bold: true });
        g.label({ x: (lo.x + hi.x) / 2, y: lo.y }, String(value), { color: on ? color : C.faint, size: cw < 1.2 ? 11 : 13, bold: on, dy: -18 });
        if (f.step === 2) g.label({ x: (lo.x + hi.x) / 2, y: hi.y }, place === 0 ? "1" : `${base}${sup(place)}`, { color: C.dim, size: 12, dy: 12 });
      });
      g.label({ x: 0, y: -1.6 }, `= ${total}`, { color: DIGIT, size: 22, bold: true, alpha: f.at(f.step) });
      if (f.step === 3 && N > 255) g.label({ x: 0, y: -2.5 }, "more than one byte", { color: C.red, size: 14, bold: true });
    },

    readout(f) {
      const [N, B] = [n.value, b.value];
      const ds = digits(N, B);
      const written = `${ds.join("")}_{${B}}`;
      const rows: Readout[] = [];
      if (f.step === 0 || f.step === 1) {
        rows.push({ label: `In base ${B}`, tex: `${N} = ${written}`, tone: "good" });
        rows.push({ label: "Digits allowed", tex: B === 2 ? "0, 1" : `0, 1, \\ldots, ${B - 1}` });
      } else if (f.step === 2) {
        const terms = ds.map((d, i) => `${d} \\cdot ${B}^{${ds.length - 1 - i}}`).join(" + ");
        rows.push({ label: "Place values", tex: `${written} = ${terms}` });
        rows.push({ label: "In base ten", tex: `${N}`, tone: "good" });
      } else {
        rows.push({ label: "Binary", tex: `${N} = ${digits(N, 2).join("")}_{2}`, tone: "good" });
        rows.push({ label: "Bits needed", tex: `${digits(N, 2).length}`, tone: N > 255 ? "warn" : "plain" });
      }
      return rows;
    },

    likes: [
      {
        title: "An odometer",
        text: "A car's mileage counter rolls each wheel from 9 back to 0 and nudges the next wheel on by one. That carry is the bundling of ten into one of the next place; an odometer with wheels marked 0 to 4 would count in base 5.",
      },
      {
        title: "Eggs, dozens and gross",
        text: "Counting eggs by the dozen and by the gross, 144, is counting in base 12: 150 eggs are 1 gross, 0 dozen and 6 eggs, so they write $106_{12}$.",
      },
    ],

    uses: [
      {
        title: "Bits and bytes",
        text: "A computer stores numbers as rows of switches, each off or on. Eight of them, a byte, hold a binary number from 0 to 255: the switches 01001101 stand for $64 + 8 + 4 + 1 = 77$. Programmers often write bytes in base 16, two hexadecimal digits each, using A to F for ten to fifteen.",
        tags: ["computing"],
        image: {
          src: byteSwitchesImage,
          caption: "Eight switches set to 01001101 make the binary number 64 + 8 + 4 + 1 = 77.",
          alt: "Eight toggle switches set to 0 1 0 0 1 1 0 1, with the place values 128 down to 1 above them, the on ones in gold, and the sum 64 + 8 + 4 + 1 = 77.",
        },
      },
      {
        title: "Hours, minutes and seconds",
        text: "Time is counted in base 60 above the second: 60 seconds make a minute and 60 minutes an hour. So 3725 seconds is $3725 = 1 \\cdot 3600 + 2 \\cdot 60 + 5$, which a stopwatch shows as 1:02:05. Angles are measured the same way, in degrees, minutes and seconds of arc.",
        tags: ["sport"],
        image: {
          src: stopwatchBaseSixtyImage,
          caption: "3725 seconds on a stopwatch reads 1:02:05, the number 3725 written in base 60.",
          alt: "A stopwatch reading 1:02:05 beside the line 3725 s = 1 × 3600 + 2 × 60 + 5.",
        },
      },
    ],
  };
});
