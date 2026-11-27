// The floor function. ⌊x⌋ is the greatest integer not more than x: round
// down, which for negative numbers means away from zero. Its graph is a
// staircase whose every step is closed at its left end and open at its
// right, since ⌊x⌋ = n exactly when n ≤ x < n + 1. The ceiling ⌈x⌉ rounds
// up, and the fractional part {x} = x − ⌊x⌋ is what rounding down throws
// away, a sawtooth between 0 and 1.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes } from "../kit/algebra.ts";
import { num } from "../kit/coordinates.ts";
import { at, curve, endDot, GRAPH, shown, WINDOW } from "../kit/functions.ts";
import { lesson, type Readout } from "../scene.ts";
import parkingStartedHourImage from "../../images/parking-started-hour.svg";
import leapYearFloorCountImage from "../../images/leap-year-floor-count.svg";

const GOLD = C.gold;
const CEIL = C.violet;
const FRAC = C.cyan;

/** Round to a tenth, so the slider's decimals sit exactly on whole numbers. */
const tidy = (x: number): number => Math.round(x * 10) / 10;

export default lesson((s) => {
  const xs = s.slider({ label: "x =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -3.5, max: 3.5, value: 2.7, step: 0.1, format: (v) => num(v) });

  return {
    steps: [
      {
        title: "Round down",
        text: "The floor $\\lfloor x \\rfloor$ is the greatest integer that is not more than $x$. For a positive number it drops the decimals: $\\lfloor 3.7 \\rfloor = 3$. For a negative one it still rounds down the number line, away from zero: $\\lfloor -3.7 \\rfloor = -4$, not $-3$. An integer is its own floor: $\\lfloor 5 \\rfloor = 5$.",
      },
      {
        title: "A staircase",
        text: "$\\lfloor x \\rfloor = n$ exactly when $n \\le x < n + 1$, so the graph is flat on each interval and jumps up 1 at each integer. Every step is closed at its left end (filled dot) and open at its right (open dot): $\\lfloor 2 \\rfloor = 2$, but $\\lfloor 1.99 \\rfloor = 1$. So solving $\\lfloor x \\rfloor = 3$ gives a whole interval, $3 \\le x < 4$.",
      },
      {
        title: "The ceiling",
        text: "The ceiling $\\lceil x \\rceil$ is the least integer that is not less than $x$: round up, so $\\lceil 3.2 \\rceil = 4$ and $\\lceil -3.7 \\rceil = -3$. Its steps are open on the left and closed on the right. Rounding $-x$ down and changing the sign rounds $x$ up: $\\lceil x \\rceil = -\\lfloor -x \\rfloor$.",
      },
      {
        title: "The fractional part",
        text: "What rounding down throws away is the fractional part $\\{x\\} = x - \\lfloor x \\rfloor$, so $x = \\lfloor x \\rfloor + \\{x\\}$ with $0 \\le \\{x\\} < 1$. It climbs from 0 towards 1 and drops back at each integer, a sawtooth: $\\{3.7\\} = 0.7$ but $\\{-3.7\\} = -3.7 - (-4) = 0.3$. Adding an integer $n$ leaves it alone, so $\\lfloor x + n \\rfloor = \\lfloor x \\rfloor + n$.",
      },
    ],

    draw(g, f) {
      axes(g, GRAPH, { xName: "x", yName: "y" });
      const x = tidy(xs.value);
      const n = Math.floor(x);

      // Faint guide y = x, which the floor never rises above.
      curve(g, (t) => t, { color: C.dim, width: 1.5, dash: [6, 6] });

      const floorAlpha = f.step === 3 ? 0.45 : 1;
      for (let k = Math.floor(WINDOW.xmin); k <= Math.ceil(WINDOW.xmax); k++) {
        if (!shown(0, k)) continue;
        const [x0, x1] = [Math.max(k, WINDOW.xmin), Math.min(k + 1, WINDOW.xmax)];
        if (x1 <= x0) continue;
        g.segment(at(x0, k), at(x1, k), { color: g.accent, width: 3.5, alpha: floorAlpha });
        if (f.step >= 1) {
          endDot(g, k, k, true, g.accent, floorAlpha);
          endDot(g, k + 1, k, false, g.accent, floorAlpha);
        }
        if (f.step === 2 && shown(0, k + 1)) {
          g.segment(at(x0, k + 1), at(x1, k + 1), { color: CEIL, width: 2.5, dash: [8, 5] });
          endDot(g, k, k + 1, false, CEIL);
          endDot(g, k + 1, k + 1, true, CEIL);
        }
      }
      if (f.step === 3) curve(g, (t) => t - Math.floor(t), { color: FRAC, width: 3, jump: 0.5 });

      // The probe: x on the axis, and what each function makes of it.
      g.point(at(x, 0), { color: GOLD, r: 6 });
      g.label(at(x, 0), num(x), { color: GOLD, size: 14, bold: true, dy: 18 });
      if (f.step === 3) {
        const fr = tidy(x - n);
        g.segment(at(x, 0), at(x, fr), { color: FRAC, width: 2, dash: [4, 4] });
        g.point(at(x, fr), { color: FRAC, r: 7 });
        g.label(at(x, fr), `{${num(x)}} = ${num(fr)}`, { color: FRAC, size: 14, bold: true, dx: 12, dy: 16, align: "left" });
        return;
      }
      if (shown(x, n)) {
        g.segment(at(x, 0), at(x, n), { color: GOLD, width: 2, dash: [4, 4] });
        g.point(at(x, n), { color: GOLD, r: 7 });
        g.label(at(x, n), `⌊${num(x)}⌋ = ${num(n)}`, { color: GOLD, size: 14, bold: true, dx: 12, dy: n >= 0 ? 16 : -16, align: "left" });
      }
      if (f.step === 2) {
        const up = Math.ceil(x);
        if (shown(x, up)) {
          g.point(at(x, up), { color: CEIL, r: 7 });
          g.label(at(x, up), `⌈${num(x)}⌉ = ${num(up)}`, { color: CEIL, size: 14, bold: true, dx: -12, dy: 16, align: "right" });
        }
      }
    },

    readout(f) {
      const x = tidy(xs.value);
      const n = Math.floor(x);
      const rows: Readout[] = [{ label: "Floor", tex: `\\lfloor ${fmt(x)} \\rfloor = ${n}`, tone: "good" }];
      if (f.step === 1) rows.push({ label: "Its step", tex: `${n} \\le x < ${n + 1}` });
      if (f.step === 2) {
        rows.push({ label: "Ceiling", tex: `\\lceil ${fmt(x)} \\rceil = ${Math.ceil(x)}` });
        rows.push({ label: "Check", tex: `-\\lfloor ${fmt(-x)} \\rfloor = -(${Math.floor(-x)}) = ${-Math.floor(-x) + 0}` });
      }
      if (f.step === 3) {
        rows.push({ label: "Fractional part", tex: `\\{${fmt(x)}\\} = ${fmt(x)} - ${n < 0 ? `(${n})` : n} = ${fmt(tidy(x - n))}` });
      }
      return rows;
    },

    likes: [
      {
        title: "Your age in years",
        text: "Someone who has lived 9.8 years says they are 9, not 10: age is counted in completed years, the floor of the time since birth. They stay 9 right up to the moment of their tenth birthday, and then jump to 10, just as a step of the staircase ends with an open dot.",
      },
      {
        title: "Floors of a building",
        text: "Standing at a height of 7.4 m in a building with 3 m storeys, you are on floor $\\lfloor 7.4 \\div 3 \\rfloor = 2$ counting the ground floor as 0. Every height on a storey gives the same floor number, which is why the graph is flat along each step.",
      },
    ],

    uses: [
      {
        title: "Paying for every started hour",
        text: "A car park that charges 3 dollars for each hour or part of an hour charges $3\\lceil t \\rceil$ dollars for $t$ hours. Two hours and ten minutes is $t \\approx 2.17$, and $\\lceil 2.17 \\rceil = 3$, so it costs 9 dollars, as much as a full three hours.",
        tags: ["travel", "money"],
        image: {
          src: parkingStartedHourImage,
          caption: "Charging 3 dollars for every started hour is 3⌈t⌉: a stay of 2 h 10 min costs as much as 3 hours, 9 dollars.",
          alt: "A parking ticket reading 2 h 10 min and 9 dollars beside a staircase graph of cost against hours, with steps at 3, 6, 9 and 12 dollars and a gold point on the third step.",
        },
      },
      {
        title: "Counting leap years",
        text: "In the Gregorian calendar a year is a leap year if 4 divides it, except century years, unless 400 divides them. So the leap years from 1 to $y$ number $\\lfloor y/4 \\rfloor - \\lfloor y/100 \\rfloor + \\lfloor y/400 \\rfloor$. Calendar software uses this to count days between dates: up to 2024 it gives $506 - 20 + 5 = 491$.",
        tags: ["computing", "astronomy"],
        image: {
          src: leapYearFloorCountImage,
          caption: "The leap years from 1 to 2024 number ⌊2024/4⌋ − ⌊2024/100⌋ + ⌊2024/400⌋ = 506 − 20 + 5 = 491.",
          alt: "A calendar page for 29 February beside the sum ⌊2024/4⌋ − ⌊2024/100⌋ + ⌊2024/400⌋ worked out as 506 − 20 + 5 = 491.",
        },
      },
    ],
  };
});
