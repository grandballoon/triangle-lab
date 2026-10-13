// An n × n × n cube is painted on the outside and sawn into unit blocks. How
// many blocks carry three, two, one or no painted faces? The blocks are sorted
// by where they sit — corner, edge, face, inside — and the four counts fill
// the cube exactly.

import { C, tint } from "../draw.ts";
import { lesson, type Readout } from "../scene.ts";
import { Orbit, p3, type P3 } from "../solid.ts";
import { boxFaces, facesViewer } from "../kit/solids.ts";

const SIZE = 3.6; // edge of the assembled cube on the stage
const SPREAD = 0.9; // extra spacing between blocks when fully pulled apart
const BARE = "#2b3646"; // a sawn, unpainted face

const CLASSES = ["all", "3 painted", "2 painted", "1 painted", "0 painted"] as const;

interface Block {
  centre: P3;
  /** Which of the faces ±x, ±y, ±z lie on the outside of the big cube. */
  painted: boolean[];
  count: number;
}

function blocks(n: number, apart: number): Block[] {
  const unit = SIZE / n;
  const pitch = unit * (1 + SPREAD * apart);
  const place = (i: number): number => (i - (n - 1) / 2) * pitch;
  const list: Block[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const painted = [i === n - 1, i === 0, j === n - 1, j === 0, k === n - 1, k === 0];
        list.push({ centre: p3(place(i), place(j), place(k)), painted, count: painted.filter(Boolean).length });
      }
    }
  }
  return list;
}

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.62, 0.42, { x: 0, y: 0.5 }));
  const size = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 2, max: 6, value: 4, step: 1 });
  const apart = s.slider({
    label: "pull apart",
    at: { x: -3.2, y: -4.3 },
    width: 3.4,
    min: 0,
    max: 1,
    value: 0,
    format: (v) => `${Math.round(v * 100)}%`,
  });
  const highlight = s.choice("Show blocks with", CLASSES);

  return {
    steps: [
      {
        title: "Paint it, then cut it",
        text: "A cube of edge $n$ is painted all over and sawn into $n^3$ unit blocks. Choose $n$, pull the blocks apart, and use the chips to pick out the blocks with 3, 2, 1 or 0 painted faces. Can you predict each count?",
      },
      {
        title: "Corners, edges, faces",
        text: "Three painted faces: only the $8$ corners. Two: blocks along an edge but not at its ends, $n - 2$ on each of $12$ edges. One: blocks inside a face, an $(n-2) \\times (n-2)$ square on each of $6$ faces.",
      },
      {
        title: "Peel off the shell",
        text: "Strip away every block that touches the outside and a smaller cube of edge $n - 2$ is left, with no paint at all: $(n-2)^3$ blocks. Together the four counts must account for all $n^3$ blocks.",
      },
    ],

    draw(g) {
      const n = size.value;
      const half = SIZE / n / 2;
      const chosen = CLASSES.indexOf(highlight.value);
      const wanted = chosen === 0 ? null : 4 - chosen;
      const paint = g.accent;

      const ordered = blocks(n, apart.value)
        .map((block) => ({ block, depth: cam.project(block.centre).depth }))
        .sort((a, b) => a.depth - b.depth);

      for (const { block } of ordered) {
        const lit = wanted === null || block.count === wanted;
        boxFaces(block.centre, half).forEach((pts, i) => {
          if (!facesViewer(cam, pts)) return;
          const flat = pts.map((p) => cam.project(p));
          if (lit) {
            g.polygon(flat, { fill: block.painted[i] ? paint : BARE, stroke: "#0b1118", width: 1.5 });
          } else {
            g.polygon(flat, { fill: tint(C.ink, 0.025), stroke: C.faint, width: 1 });
          }
        });
      }
    },

    readout() {
      const n = size.value;
      const m = n - 2;
      const tally = [0, 0, 0, 0];
      for (const block of blocks(n, 0)) tally[block.count]++;
      const formula = [m ** 3, 6 * m * m, 12 * m, 8];
      const chosen = CLASSES.indexOf(highlight.value);
      const tone = (count: number): Readout["tone"] => (chosen !== 0 && 4 - chosen !== count ? "dim" : "plain");
      const total = tally[0] + tally[1] + tally[2] + tally[3];
      return [
        { label: "Three painted faces (corners)", tex: `8`, tone: tone(3) },
        { label: "Two (edges)", tex: `12(n-2) = 12 \\cdot ${m} = ${formula[2]}`, tone: tone(2) },
        { label: "One (faces)", tex: `6(n-2)^2 = 6 \\cdot ${m}^2 = ${formula[1]}`, tone: tone(1) },
        { label: "None (inside)", tex: `(n-2)^3 = ${m}^3 = ${formula[0]}`, tone: tone(0) },
        {
          label: "Counted block by block",
          tex: `${tally[3]} + ${tally[2]} + ${tally[1]} + ${tally[0]} = ${total} = ${n}^3`,
          tone: total === n ** 3 && formula.every((v, i) => v === tally[i]) ? "good" : "warn",
        },
      ];
    },
  };
});
