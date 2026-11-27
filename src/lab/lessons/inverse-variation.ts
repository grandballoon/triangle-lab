// Inverse variation. Rectangles of one fixed area k: the width x and height
// y trade off, xy = k, so doubling one halves the other, and the corners
// trace the hyperbola y = k/x. Direct variation keeps a ratio; inverse
// variation keeps a product.

import { C, tint } from "../draw.ts";
import { clamp, type Vec } from "../geo.ts";
import { axes, onStage, plot, type Graph } from "../kit/algebra.ts";
import { box, texNum } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import gearTeethTurnsImage from "../../images/gear-teeth-turns.svg";
import stringLengthPitchImage from "../../images/string-length-pitch.svg";

const RECT = C.cyan;
const GHOST = C.pink;
const CURVE = C.gold;
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 1 } };

/** A foot on the x-axis, at a whole or half unit from ½ to 12. */
const onAxis = (p: Vec): Vec => ({ x: GRAPH.origin.x + clamp(Math.round((p.x - GRAPH.origin.x) * 2) / 2, 0.5, 12), y: GRAPH.origin.y });

export default lesson((s) => {
  const k = s.slider({ label: "k =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 4, max: 24, value: 12, step: 1 });
  const foot = s.point(GRAPH.origin.x + 3, GRAPH.origin.y, { label: "x", color: RECT, constrain: onAxis });

  return {
    steps: [
      {
        title: "Same area, different shapes",
        text: "Every rectangle here has the same area $k$: its width $x$ times its height $y$ is always $xy = k$. Drag $x$ and watch the height answer: widen the rectangle and it must get shorter. We say $y$ varies inversely as $x$, or $y = \\frac{k}{x}$.",
      },
      {
        title: "Double one, halve the other",
        text: "The dashed rectangle is twice as wide, so to keep the area it is half as tall. Tripling $x$ divides $y$ by 3. Where direct variation multiplies both by the same number, inverse variation multiplies one by the reciprocal: $\\frac{y_2}{y_1} = \\frac{x_1}{x_2}$.",
      },
      {
        title: "The graph is a hyperbola",
        text: "The rectangle's far corner traces the curve $y = \\frac{k}{x}$, a hyperbola. It never meets the axes: as $x$ shrinks toward 0 the height grows without bound, and as $x$ grows the height shrinks toward 0 but never gets there.",
      },
      {
        title: "Product, not ratio",
        text: "Direct variation keeps the ratio $\\frac{y}{x}$ fixed; inverse variation keeps the product $xy$. If 6 painters take 10 days, the job is $6 \\cdot 10 = 60$ painter-days, so 15 painters take $\\frac{60}{15} = 4$ days. The dashed line through the corner shows the direct variation that would wrongly keep the ratio instead.",
      },
    ],

    draw(g, f) {
      const at = (x: number, y: number): Vec => onStage(GRAPH, { x, y });
      const x = foot.x - GRAPH.origin.x;
      const y = k.value / x;
      axes(g, GRAPH, { positive: true });

      if (f.step >= 2) plot(g, GRAPH, (t) => k.value / t, { color: CURVE, width: 3, from: 0.05, alpha: f.step === 2 ? f.at(2) : 1 });
      if (f.step === 3) plot(g, GRAPH, (t) => (y / x) * t, { color: C.dim, width: 2, dash: [6, 6], from: 0 });

      if (f.step === 1) {
        box(g, at(0, 0), at(2 * x, y / 2), { color: GHOST, fill: tint(GHOST, 0.1), width: 2, dash: [6, 5], alpha: f.at(1) });
        g.label(at(Math.min(2 * x, 10), Math.min(y / 2, 7)), `${texNum(2 * x)} × ${texNum(y / 2)}`, { color: GHOST, size: 14, bold: true, dx: 8, dy: 8, align: "left", alpha: f.at(1) });
      }
      box(g, at(0, 0), at(x, y), { color: RECT, fill: tint(RECT, 0.16), width: 2.5 });
      g.point(at(x, y), { color: RECT, r: 6 });
      // Kept on the stage when the rectangle runs off its top or right.
      g.label(at(Math.min(x, 10), Math.min(y, 7.5)), `${texNum(x)} × ${texNum(y)} = ${k.value}`, { color: RECT, size: 15, bold: true, dx: 10, dy: 10, align: "left" });
    },

    readout(f) {
      const x = foot.x - GRAPH.origin.x;
      const y = k.value / x;
      const rows: Readout[] = [{ label: "Area", tex: `x \\cdot y = ${texNum(x)} \\times ${texNum(y, 3)} = ${k.value}`, tone: "good" }];
      if (f.step === 0) {
        rows.push({ label: "Height", tex: `y = \\frac{k}{x} = \\frac{${k.value}}{${texNum(x)}} = ${texNum(y, 3)}` });
      } else if (f.step === 1) {
        rows.push({ label: "Twice as wide", tex: `${texNum(2 * x)} \\times ${texNum(y / 2, 3)} = ${k.value}` });
        rows.push({ label: "Reciprocal", tex: `\\frac{y_2}{y_1} = \\frac12 = \\frac{x_1}{x_2}` });
      } else if (f.step === 2) {
        rows.push({ label: "The curve", tex: `y = \\frac{${k.value}}{x}` });
        rows.push({ label: "Near the axes", tex: `x = 0.5:\\ y = ${texNum(k.value / 0.5)},\\quad x = 12:\\ y = ${texNum(k.value / 12, 3)}` });
      } else {
        rows.push({ label: "Kept", tex: `xy = ${k.value}` });
        rows.push({ label: "Changes", tex: `\\frac{y}{x} = ${texNum(y / x, 3)}`, tone: "dim" });
      }
      return rows;
    },

    likes: [
      {
        title: "Sharing a pizza",
        text: "One pizza among 2 people is half each; among 4 people, a quarter each. The more people, the smaller the slice, and the number of people times the size of a slice is always one whole pizza.",
      },
      {
        title: "Driving a fixed distance",
        text: "A 120-mile drive takes 3 hours at 40 mph and 2 hours at 60 mph. Speed times time is always the distance, 120, so the time varies inversely as the speed: go 1.5 times as fast and the trip takes $\\frac{1}{1.5}$ as long.",
      },
    ],

    uses: [
      {
        title: "Gears",
        text: "When two gears mesh, the same number of teeth pass the meeting point each second, so teeth times turns per minute is the same for both. A 12-tooth gear driving a 36-tooth gear turns three times as fast: the speed varies inversely as the number of teeth. This is how a bicycle's gears trade speed for force.",
        tags: ["machines"],
        image: {
          src: gearTeethTurnsImage,
          caption: "A 12-tooth gear driving a 36-tooth gear turns three times for each turn of the big one: teeth × turns is the same for both.",
          alt: "A small red gear meshed with a grey-blue gear three times its size, the big one labelled 36 teeth and 1 turn and the small one 12 teeth and 3 turns, with gold arrows turning in opposite directions and the line 12 × 3 = 36 × 1.",
        },
      },
      {
        title: "A string's pitch",
        text: "A plucked string's frequency varies inversely as its vibrating length, for a fixed tension and thickness. Pressing a guitar string at the twelfth fret halves its length and doubles its frequency, raising the note an octave; a third of the length gives three times the frequency.",
        tags: ["music"],
        image: {
          src: stringLengthPitchImage,
          caption: "Halving a string's vibrating length doubles its frequency: pressing at the twelfth fret raises a note an octave.",
          alt: "A guitar seen from above with a fingertip pressing one string at the twelfth fret: a dimension line above marks the full length from nut to bridge, and a gold one below marks the half from the twelfth fret to the bridge, labelled ½ length and × 2 frequency.",
        },
      },
    ],
  };
});
