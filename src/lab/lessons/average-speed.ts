// The average speed of a round trip. Graphing the total distance driven
// against time, the trip out and the trip back are two straight pieces, and
// the average speed is the slope of the chord from start to finish. Averaging
// the two speeds instead would finish too soon: the slow leg lasts longer, so
// it counts for more. The distance itself cancels out.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes, onStage, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";

const OUT = C.cyan;
const BACK = C.orange;
const TRUE = C.gold;
/** Hours across, 40 miles up per stage unit. */
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 40 } };

export default lesson((s) => {
  const out = s.slider({ label: "out:", format: (v) => `${v} mph`, at: { x: -7.6, y: -4.3 }, width: 3.4, min: 20, max: 80, value: 40, step: 5 });
  const back = s.slider({ label: "back:", format: (v) => `${v} mph`, at: { x: -2.4, y: -4.3 }, width: 3.4, min: 20, max: 80, value: 20, step: 5 });
  const far = s.slider({ label: "D =", format: (v) => `${v} mi`, at: { x: 2.8, y: -4.3 }, width: 3.4, min: 20, max: 120, value: 40, step: 10 });

  const legs = (): { t1: number; t2: number; D: number } => {
    const D = far.value;
    return { t1: D / out.value, t2: D / back.value, D };
  };
  const average = (): number => 2 / (1 / out.value + 1 / back.value);

  return {
    steps: [
      {
        title: "There and back",
        text: "Drive $D$ miles out and the same $D$ back. At $40$ mph the $40$ miles out take $1$ hour; at $20$ mph the way back takes $2$. The graph adds up the miles driven, so each leg is a line as steep as its speed.",
      },
      {
        title: "Total distance over total time",
        text: "Average speed is the whole distance divided by the whole time: $\\frac{80}{3} = 26\\tfrac23$ mph here. On the graph it is the slope of the gold chord from the start to the finish.",
      },
      {
        title: "Not the average of the speeds",
        text: "Averaging $40$ and $20$ gives $30$, the dashed line, and it reaches $80$ miles too soon. The trip spends twice as long at the slow speed, so the slow speed weighs twice as much.",
      },
      {
        title: "The distance cancels",
        text: "Move $D$: the graph stretches, the average does not change. Total time is $\\frac{D}{r_1} + \\frac{D}{r_2}$, so the average is $\\frac{2D}{D/r_1 + D/r_2} = \\frac{2}{1/r_1 + 1/r_2}$, and $D$ is gone.",
      },
    ],

    draw(g, f) {
      const { t1, t2, D } = legs();
      const at = (t: number, d: number) => onStage(GRAPH, { x: t, y: d });
      const end = at(t1 + t2, 2 * D);

      axes(g, GRAPH, { positive: true, xName: "hours", yName: "miles driven" });
      g.path([at(0, 0), at(t1, D)], { color: OUT });
      g.path([at(t1, D), at(t1 + t2, 2 * D)], { color: BACK });
      g.point(at(t1, D), { color: C.ink, r: 5 });
      g.label(at(t1, D), "turn round", { color: C.dim, size: 12, dx: -10, dy: 14, align: "right" });
      g.point(end, { color: TRUE, r: 6 });

      if (f.at(1) > 0) {
        g.segment(at(0, 0), end, { color: TRUE, width: 3, alpha: f.at(1) });
        g.label(end, `${fmt(average(), 2)} mph`, { color: TRUE, size: 15, bold: true, dx: 12, dy: -18, align: "left", alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        const naive = (out.value + back.value) / 2;
        const done = (2 * D) / naive;
        g.path([at(0, 0), at(done, 2 * D)], { color: C.ink, width: 2, dash: [8, 6], alpha: f.at(2) });
        const early = t1 + t2 - done;
        if (early > 0.005) g.segment(at(done, 2 * D), end, { color: C.red, width: 2, alpha: f.at(2) });
        const verdict = early > 0.005 ? `finishes ${fmt(early, 2)} h early` : "is right only when the speeds match";
        g.label(at(done, 2 * D), `${fmt(naive, 1)} mph ${verdict}`, {
          color: C.red,
          size: 13,
          dx: -10,
          dy: 18,
          align: "right",
          alpha: f.at(2),
        });
      }
    },

    readout(f) {
      const { t1, t2, D } = legs();
      const [r1, r2] = [out.value, back.value];
      const rows: Readout[] = [
        { label: "Time out", tex: `\\frac{${D}}{${r1}} = ${fmt(t1, 2)}\\ \\text{h}` },
        { label: "Time back", tex: `\\frac{${D}}{${r2}} = ${fmt(t2, 2)}\\ \\text{h}` },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Average speed",
          tex: `\\frac{2 \\cdot ${D}}{${fmt(t1, 2)} + ${fmt(t2, 2)}} = ${fmt(average(), 2)}\\ \\text{mph}`,
          tone: "good",
        });
      }
      if (f.step >= 2) {
        rows.push({
          label: "Average of the speeds",
          tex: `\\frac{${r1} + ${r2}}{2} = ${fmt((r1 + r2) / 2, 2)}\\ \\text{mph}`,
          tone: r1 === r2 ? "good" : "warn",
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Without D",
          tex: `\\frac{2}{1/${r1} + 1/${r2}} = ${fmt(average(), 2)}\\ \\text{mph}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
