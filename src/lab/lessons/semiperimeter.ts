// The semiperimeter of a triangle, defined by walking half of it: a knob
// starts at A and is dragged round the edge to a gold mark halfway round,
// where it catches. The distance walked is the semiperimeter, s = p / 2.

import { C as COLOR } from "../draw.ts";
import { fmt } from "../geo.ts";
import { edgeAt, perimeterOf, walkedPath } from "../kit/triangle-parts.ts";
import { CAPTION_AT, edgeWalker, labelSides, stageTriangle } from "../kit/triangle-stage.ts";
import { lesson } from "../scene.ts";

const HALF = 0.5;

export default lesson((s) => {
  s.terms("Term", ["semiperimeter"]);
  const t = stageTriangle(s);
  const walk = edgeWalker(s, t, [HALF]);

  return {
    steps: [
      {
        title: "Walk halfway round",
        text: "Drag the knob from $A$ along the edge until it catches on the gold mark, halfway round. The distance walked is the semiperimeter, $s$: half of the perimeter, $s = \\frac{a + b + c}{2}$. Drag the corners and the mark moves to stay halfway.",
      },
    ],

    likes: [
      {
        title: "Meeting a friend halfway round",
        text: "You and a friend start at the same corner of a triangular block and walk round it in opposite directions at the same pace. You meet exactly halfway round, so each of you has walked the semiperimeter $s$, and together you have covered the whole perimeter $p = 2s$.",
      },
    ],

    uses: [
      {
        title: "Area from three sides",
        text: "Heron's formula finds a triangle's area from its sides alone, using the semiperimeter: $\\text{Area} = \\sqrt{s(s - a)(s - b)(s - c)}$. For a plot with sides $9$, $12$ and $15$ metres, $s = 18$ and the area is $\\sqrt{18 \\cdot 9 \\cdot 6 \\cdot 3} = 54$ square metres. Surveyors can use this to find the area of a plot from three tape measurements, with no angles needed.",
      },
    ],

    draw(g) {
      walk.follow();
      const corners = t.corners();
      const p = perimeterOf(corners);
      const there = walk.walked() === HALF;
      g.polygon(corners, { color: COLOR.dim, width: 2.5, fill: "rgba(255, 255, 255, 0.04)" });
      g.path(walkedPath(corners, Math.min(walk.walked(), HALF) * p), { color: g.accent, width: 5 });
      labelSides(g, corners, (name, length) => `${name} = ${fmt(length, 2)}`);
      g.point(edgeAt(corners, HALF * p), { color: COLOR.gold, r: there ? 9 : 6, label: "halfway" });
      g.label(CAPTION_AT, "Semiperimeter: half the distance round, s = (a + b + c) / 2.", { size: 16 });
    },

    readout() {
      const p = perimeterOf(t.corners());
      const there = walk.walked() === HALF;
      return [
        { label: "Walked so far", tex: `${fmt(walk.walked() * p, 2)}` },
        { label: "Semiperimeter", tex: `s = \\frac{a + b + c}{2} = \\frac{${fmt(p, 2)}}{2} = ${fmt(p / 2, 2)}`, tone: there ? "good" : "dim" },
      ];
    },
  };
});
