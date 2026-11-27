// Mean, median, mode and range. Seven values sit as dots on a number line,
// and each can be dragged. The mean is the balance point of the dots, the
// median the middle one once they are in order, the mode the tallest stack,
// and the range the spread from least to greatest. An outlier drags the mean
// along with it but barely moves the median.

import { C, tint } from "../draw.ts";
import { clamp, fmt, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import medianHomePricesImage from "../../images/median-home-prices.svg";
import shoeSizeModeImage from "../../images/shoe-size-mode.svg";

const DOT = C.cyan;
const MEAN = C.gold;
const MEDIAN = C.pink;
const MODE = C.violet;
const RANGE = C.green;

const LINE_Y = -1.2;
const X0 = -6.6;
const PER = 1.1;
const MAX = 12;
const RISE = 0.55;
const START = [2, 3, 3, 4, 5, 7, 11];

const xOf = (v: number): number => X0 + v * PER;
const valueOf = (x: number): number => clamp(Math.round((x - X0) / PER), 0, MAX);

export default lesson((s) => {
  const dots = START.map((v) =>
    s.point(xOf(v), LINE_Y + 0.45, { hidden: true, constrain: (p) => ({ x: xOf(valueOf(p.x)), y: LINE_Y + 0.45 }) }),
  );
  const values = (): number[] => dots.map((d) => valueOf(d.x));

  const stats = () => {
    const v = values();
    const sorted = [...v].sort((a, b) => a - b);
    const sum = v.reduce((a, b) => a + b, 0);
    const mean = sum / v.length;
    const median = sorted[(sorted.length - 1) / 2];
    const counts = new Map<number, number>();
    for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
    const top = Math.max(...counts.values());
    const modes = [...counts].filter(([, c]) => c === top).map(([x]) => x).sort((a, b) => a - b);
    return { v, sorted, sum, mean, median, modes, top, min: sorted[0], max: sorted[sorted.length - 1] };
  };

  return {
    steps: [
      {
        title: "The mean balances",
        text: "The mean is the sum divided by how many values there are. For $2, 3, 3, 4, 5, 7, 11$ it is $\\frac{35}{7} = 5$. It is the balance point of the dots: the distances of the values below 5 add to $3 + 2 + 2 + 1 = 8$, the same as those above, $2 + 6 = 8$. Drag any dot and the balance point moves.",
      },
      {
        title: "The median is in the middle",
        text: "Put the values in order and the median is the middle one: the 4th of 7, here 4. Half the values are at or below it and half at or above. With an even number of values there are two middle ones, and the median is their mean.",
      },
      {
        title: "Mode and range",
        text: "The mode is the value that occurs most often, the tallest stack: here 3, which occurs twice. A list can have more than one mode. The range measures spread: the greatest value minus the least, $11 - 2 = 9$.",
      },
      {
        title: "An outlier pulls the mean",
        text: "The 11 sits far from the rest. Drag it to 4 and the mean falls from 5 to $\\frac{28}{7} = 4$, while the median stays at 4. Drag it to 12 instead and the mean rises, yet the median does not move: one extreme value shifts the mean, but not the middle of the list.",
      },
    ],

    draw(g, f) {
      const st = stats();

      // The number line.
      g.segment({ x: xOf(0) - 0.4, y: LINE_Y }, { x: xOf(MAX) + 0.4, y: LINE_Y }, { color: C.dim, width: 2 });
      for (let v = 0; v <= MAX; v++) {
        g.segment({ x: xOf(v), y: LINE_Y - 0.12 }, { x: xOf(v), y: LINE_Y + 0.12 }, { color: C.dim, width: 1.5 });
        g.label({ x: xOf(v), y: LINE_Y }, String(v), { color: C.dim, size: 12, dy: -18 });
      }

      // Stack equal values, the dragged dot on top.
      const order = dots.map((_, i) => i).sort((i, j) => Number(dots[i].grabbed) - Number(dots[j].grabbed));
      const seen = new Map<number, number>();
      for (const i of order) {
        const v = st.v[i];
        const k = seen.get(v) ?? 0;
        seen.set(v, k + 1);
        dots[i].y = LINE_Y + 0.45 + k * RISE;
      }
      for (const d of dots) {
        const v = valueOf(d.x);
        const isMode = f.step === 2 && st.top > 1 && st.modes.includes(v);
        const isMedian = f.step === 1 && v === st.median;
        const color = isMode ? MODE : isMedian ? MEDIAN : DOT;
        g.circle(d, 0.24, { color, fill: tint(color, d.grabbed || d.hover ? 0.9 : 0.6), width: 2 });
      }

      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: -7.2, y: 4.2 - row * 0.7 }, text, { color, size: 16, bold: true, align: "left", alpha });
      };

      const fulcrum = (x: number, alpha: number): void => {
        const tip: Vec = { x, y: LINE_Y - 0.02 };
        g.polygon([tip, { x: x - 0.32, y: LINE_Y - 0.62 }, { x: x + 0.32, y: LINE_Y - 0.62 }], { color: MEAN, fill: tint(MEAN, 0.5), width: 2, alpha });
        g.label({ x, y: LINE_Y - 0.62 }, `mean ${fmt(st.mean, 2)}`, { color: MEAN, size: 14, bold: true, dy: -14, alpha });
      };

      if (f.step === 0) {
        fulcrum(xOf(st.mean), f.at(0));
        const below = st.v.filter((x) => x < st.mean).map((x) => st.mean - x);
        const above = st.v.filter((x) => x > st.mean).map((x) => x - st.mean);
        const total = (xs: number[]): string => fmt(xs.reduce((a, b) => a + b, 0), 2);
        note(0, `sum ${st.sum} ÷ 7 = ${fmt(st.mean, 2)}`, MEAN);
        note(1, `distance below the mean: ${total(below)}`, C.ink, f.at(0));
        note(2, `distance above the mean: ${total(above)}`, C.ink, f.at(0));
        return;
      }

      if (f.step === 1) {
        const x = xOf(st.median);
        g.segment({ x, y: LINE_Y - 0.5 }, { x, y: 2.9 }, { color: MEDIAN, width: 2, dash: [5, 5], alpha: f.at(1) });
        g.label({ x, y: LINE_Y - 0.5 }, `median ${st.median}`, { color: MEDIAN, size: 14, bold: true, dy: -14, alpha: f.at(1) });
        g.label({ x: -7.2, y: 4.2 }, "in order:", { color: C.dim, size: 16, bold: true, align: "left" });
        st.sorted.forEach((v, i) => {
          g.label({ x: -4.6 + i * 1.0, y: 4.2 }, String(v), { color: i === 3 ? MEDIAN : C.ink, size: 18, bold: true, alpha: i === 3 ? 1 : 0.85 });
        });
        note(1, "3 values below, 3 above", C.dim, f.at(1));
        return;
      }

      if (f.step === 2) {
        const y = LINE_Y - 1.1;
        const [a, b] = [xOf(st.min), xOf(st.max)];
        if (b > a) {
          g.arrow({ x: (a + b) / 2, y }, { x: a, y }, { color: RANGE, width: 2, alpha: f.at(2) });
          g.arrow({ x: (a + b) / 2, y }, { x: b, y }, { color: RANGE, width: 2, alpha: f.at(2) });
        }
        g.label({ x: (a + b) / 2, y }, `range ${st.max} − ${st.min} = ${st.max - st.min}`, { color: RANGE, size: 14, bold: true, dy: -16, alpha: f.at(2) });
        const modeText = st.top === 1 ? "every value occurs once: no mode" : `mode ${st.modes.join(" and ")} (${st.top} times)`;
        note(0, modeText, MODE);
        return;
      }

      fulcrum(xOf(st.mean), 1);
      const x = xOf(st.median);
      g.segment({ x, y: LINE_Y - 0.5 }, { x, y: 2.9 }, { color: MEDIAN, width: 2, dash: [5, 5] });
      g.label({ x, y: 2.9 }, `median ${st.median}`, { color: MEDIAN, size: 14, bold: true, dy: 12 });
      note(0, `mean ${fmt(st.mean, 2)}`, MEAN);
      note(1, `median ${st.median}`, MEDIAN);
      note(2, `mean − median = ${fmt(st.mean - st.median, 2)}`, C.dim, f.at(3));
    },

    readout(f) {
      const st = stats();
      const rows: Readout[] = [];
      const plus = st.v.join(" + ");
      rows.push({ label: "Mean", tex: `\\frac{${plus}}{7} = \\frac{${st.sum}}{7} = ${fmt(st.mean, 2)}`, tone: f.step === 0 ? "good" : "plain" });
      if (f.step >= 1) rows.push({ label: "Median", tex: `${st.median}`, tone: f.step === 1 ? "good" : "plain" });
      if (f.step === 2) {
        rows.push({ label: "Mode", tex: st.top === 1 ? "\\text{none}" : st.modes.join(",\\ "), tone: "good" });
        rows.push({ label: "Range", tex: `${st.max} - ${st.min} = ${st.max - st.min}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Splitting a bill evenly",
        text: "When friends who ordered different amounts split the bill evenly, each pays the mean: the total divided by the number of people. Those who ordered less pay over and those who ordered more pay under, and the two differences cancel.",
      },
      {
        title: "The middle of a line-up",
        text: "Line people up from shortest to tallest and the one standing in the middle has the median height. Swap the tallest for someone a metre taller and the middle person stays the same.",
      },
    ],

    uses: [
      {
        title: "Typical house prices",
        text: "Reports of house prices usually give the median rather than the mean. On a street of houses worth 200, 220, 240, 250 and 260 thousand, one mansion worth 2000 thousand lifts the mean from 234 to about 528 thousand, more than any ordinary house, while the median only moves from 240 to 245 thousand.",
        tags: ["money", "home"],
        image: {
          src: medianHomePricesImage,
          caption: "Six house prices in thousands: 200, 220, 240, 250, 260 and 2000. The mean is about 528, the median 245.",
          alt: "Six bars for house prices in thousands, five short ones from 200 to 260 and one tall bar of 2000, with a gold line at the median 245 crossing the short bars and a grey dashed line at the mean 528 above all but the tallest.",
        },
      },
      {
        title: "Stocking the commonest size",
        text: "A shoe shop deciding which size to order most of wants the mode, not the mean. If a week's sales were sizes 6, 7, 7, 8, 8, 8, 9 and 10, size 8 sold most often; the mean, 7.875, is not a size anyone wears.",
        tags: ["trade-tricks", "money"],
        image: {
          src: shoeSizeModeImage,
          caption: "A week's sales of sizes 6, 7, 7, 8, 8, 8, 9 and 10: size 8 is the mode, sold three times.",
          alt: "Stacks of shoe boxes over sizes 6 to 10, one box at 6, two at 7, three at 8 in gold, one at 9 and one at 10, labelled mode 8, with the mean 7.875 marked below.",
        },
      },
    ],
  };
});
