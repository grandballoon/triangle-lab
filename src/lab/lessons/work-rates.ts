// Work problems. A pipe that fills a pool in 5 hours fills 1/5 of it each
// hour, so the part filled grows along a straight line of slope 1/5. Two
// pipes at once climb at the sum of their rates, and the pool is full when
// the combined line reaches 1: rate × time = work, the same equation as rate ×
// time = distance.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes, onStage, type Graph } from "../kit/algebra.ts";
import { texRatio } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const PIPE_A = C.cyan;
const PIPE_B = C.orange;
const BOTH = C.gold;
/** Hours across; a whole pool is five stage units up. */
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 0.2 } };
const LAST_HOUR = 14.4;

export default lesson((s) => {
  const a = s.slider({ label: "A alone:", format: (v) => `${v} h`, at: { x: -7.6, y: -4.3 }, width: 4, min: 1, max: 12, value: 5, step: 1 });
  const b = s.slider({ label: "B alone:", format: (v) => `${v} h`, at: { x: -1.6, y: -4.3 }, width: 4, min: 1, max: 12, value: 4, step: 1 });

  /** Hours to fill the pool with both pipes open. */
  const together = (): number => (a.value * b.value) / (a.value + b.value);

  return {
    steps: [
      {
        title: "A rate is a part per hour",
        text: "Pipe A fills the pool alone in $a$ hours, so each hour it fills $\\frac{1}{a}$ of it. The part filled grows along a straight line of slope $\\frac{1}{a}$, and reaches $1$, a full pool, after $a$ hours. Pipe B is the same with $b$.",
      },
      {
        title: "Rates add",
        text: "Open both. Each hour the pool gains A's part and B's part, so the gold line climbs at $\\frac{1}{a} + \\frac{1}{b}$ an hour, steeper than either alone.",
      },
      {
        title: "Full means one",
        text: "After $t$ hours together the part filled is $t\\left(\\frac{1}{a} + \\frac{1}{b}\\right)$. The pool is full when that equals $1$, so $t = \\frac{1}{1/a + 1/b} = \\frac{ab}{a + b}$: sooner than either pipe alone, but not twice as fast unless they match.",
      },
      {
        title: "Working backwards",
        text: "Often the time together is given and a rate is missing. Rates still add, so the missing one is a difference: $\\frac{1}{b} = \\frac{1}{t} - \\frac{1}{a}$. This is rate × time = distance again, with work in place of distance.",
      },
    ],

    draw(g, f) {
      const at = (t: number, part: number) => onStage(GRAPH, { x: t, y: part });
      const rateA = 1 / a.value;
      const rateB = 1 / b.value;
      const both = together();

      axes(g, GRAPH, { positive: true, xName: "hours", yName: "part of the pool filled" });
      g.segment(at(0, 1), at(LAST_HOUR, 1), { color: C.ink, width: 1.5, dash: [8, 6] });
      g.label(at(LAST_HOUR, 1), "full", { color: C.ink, size: 13, dy: 14, align: "right" });

      const climb = (rate: number, color: string, alpha = 1): void => {
        const top = Math.min(LAST_HOUR, 1.9 / rate);
        g.path([at(0, 0), at(top, rate * top)], { color, alpha });
      };
      climb(rateB, PIPE_B);
      climb(rateA, PIPE_A);
      // Each finishing time is marked on the full line, its caption above it
      // (A, then B a row higher) or, for both together, below it.
      const full = (t: number, color: string, text: string, dy: number, alpha = 1): void => {
        g.segment(at(t, 1), at(t, 0), { color, width: 1.5, dash: [4, 5], alpha });
        g.point(at(t, 1), { color, r: 6, alpha });
        g.label(at(t, 1), text, { color, size: 13, dy, alpha });
      };
      full(a.value, PIPE_A, `A: ${a.value} h`, 18);
      if (b.value !== a.value) full(b.value, PIPE_B, `B: ${b.value} h`, 36);
      if (f.at(1) > 0) {
        climb(rateA + rateB, BOTH, f.at(1));
        if (f.at(2) > 0) full(both, BOTH, `both: ${fmt(both, 2)} h`, -18, f.at(2));
      }
    },

    readout(f) {
      const [A, B] = [a.value, b.value];
      const rows: Readout[] = [
        { label: "A's rate", tex: `\\frac{1}{${A}}\\ \\text{of the pool an hour}` },
        { label: "B's rate", tex: `\\frac{1}{${B}}\\ \\text{of the pool an hour}` },
      ];
      if (f.step >= 1) {
        rows.push({ label: "Together", tex: `\\frac{1}{${A}} + \\frac{1}{${B}} = ${texRatio(A + B, A * B)}\\ \\text{an hour}` });
      }
      if (f.step >= 2) {
        rows.push({
          label: "Full",
          tex: `t \\cdot ${texRatio(A + B, A * B)} = 1 \\;\\Rightarrow\\; t = ${texRatio(A * B, A + B)} \\approx ${fmt(together(), 2)}\\ \\text{h}`,
          tone: "good",
        });
      }
      if (f.step >= 3) {
        const t = texRatio(A * B, A + B);
        rows.push({
          label: "B's time from the others",
          tex: `\\frac{1}{b} = \\frac{1}{${t}} - \\frac{1}{${A}} = \\frac{1}{${B}}`,
          tone: "good",
        });
      }
      return rows;
    },

    uses: [
      {
        title: "Mowing with a friend",
        text: "You can mow the lawn in 60 minutes and a friend can in 90. Together you mow $\\tfrac{1}{60} + \\tfrac{1}{90} = \\tfrac{1}{36}$ of it a minute, so it takes 36 minutes.",
      },
      {
        title: "A rain barrel with a leak",
        text: "A downpipe fills a rain barrel in 2 hours, but a loose tap at the bottom would empty it in 6. Rates still add, with the leak's counted against: $\\tfrac12 - \\tfrac16 = \\tfrac13$ of the barrel an hour, so it fills in 3 hours.",
      },
      {
        title: "Sharing a print job",
        text: "One printer takes 30 minutes for a big job and an older one takes 45. Splitting the job between them, they finish in $\\frac{30 \\cdot 45}{30 + 45} = 18$ minutes.",
      },
    ],
  };
});
