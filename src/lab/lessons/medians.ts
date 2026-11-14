// The median of a triangle: a knob slides along the base AB and locks onto
// its midpoint M, and the segment CM is the median from C. Then the edge case:
// in an isosceles triangle, the median from the apex meets the base square on.

import { C as COLOR } from "../draw.ts";
import { angleAt, dist, fmt, mid, triangleArea } from "../geo.ts";
import { degTex } from "../kit/circle-angles.ts";
import { baseKnob, CAPTION_AT, overMidpoint, stageTriangle } from "../kit/triangle-stage.ts";
import { lesson, type Readout } from "../scene.ts";

const TERMS = ["median", "isosceles apex"] as const;

const CAPTION: Record<(typeof TERMS)[number], string> = {
  median: "Median: a segment from a corner to the midpoint of the opposite side.",
  "isosceles apex": "Isosceles: the median from the apex meets the base at right angles.",
};

export default lesson((s) => {
  const term = s.terms("Term", TERMS);
  const isosceles = (): boolean => term.value === "isosceles apex";
  const t = stageTriangle(s, (p, base) => (isosceles() ? overMidpoint(p, base) : p));
  const M = baseKnob(s, t, () => mid(t.A, t.B), 0.3, 0.6);

  const settle = (): void => {
    t.C.set(t.C);
    M.follow();
  };

  return {
    steps: [
      {
        title: "Corner to midpoint",
        text: "Drag the knob along $AB$ toward its middle, and it locks onto the midpoint $M$. The segment $CM$ is a median: it joins a corner to the midpoint of the opposite side. It also cuts the triangle into two pieces of equal area, since both have half of $AB$ as a base and the same height up to $C$. Drag the corners and the median stays on the midpoint.",
      },
      {
        title: "From the apex of an isosceles triangle",
        text: "Now $C$ is held over the middle of $AB$, so $CA = CB$ and the triangle is isosceles. Lock the knob on the midpoint again. The median from the apex $C$ meets the base at a right angle, and splits the triangle into two mirror-image halves. Drag $C$ up and down and it stays square.",
      },
    ],

    likes: [
      {
        title: "Cutting a sandwich fairly",
        text: "Cut a triangular sandwich from one corner to the middle of the opposite crust and the two pieces hold the same amount of sandwich. Each piece has half the crust as its base and the same height up to the corner, so their areas match even though their shapes do not. That cut is a median.",
      },
    ],

    uses: [
      {
        title: "Sharing a triangular field",
        text: "Two farmers share a triangular field equally. A fence from one corner to the midpoint of the far side, a median, splits it into two pieces of equal area, because both pieces have half that side as a base and the same height up to the corner. Laying it out takes only a tape measure, to find the midpoint, and no angles at all.",
      },
    ],

    draw(g) {
      settle();
      const { A, B, C } = t;
      const locked = M.locked();
      const hot = g.accent;
      if (locked) {
        g.polygon([A, M.knob, C], { fill: "rgba(255, 255, 255, 0.07)", stroke: null });
        g.polygon([M.knob, B, C], { fill: "rgba(255, 255, 255, 0.03)", stroke: null });
      }
      g.polygon([A, B, C], { color: COLOR.dim, width: 2.5 });
      g.segment(C, M.knob, locked ? { color: hot, width: 4 } : { color: COLOR.dim, width: 2, dash: [6, 6] });
      if (locked) {
        g.ticks(A, M.knob, 1, { color: hot });
        g.ticks(M.knob, B, 1, { color: hot });
        g.label(M.knob, "M", { color: hot, dy: -20 });
      }
      if (isosceles()) {
        g.ticks(C, A, 2, { color: COLOR.dim });
        g.ticks(C, B, 2, { color: COLOR.dim });
        if (locked) g.angle(C, M.knob, B, { color: hot, r: 18 });
      }
      g.label(CAPTION_AT, CAPTION[term.value], { size: 16 });
    },

    readout() {
      settle();
      const { A, B, C } = t;
      const locked = M.locked();
      const tone = locked ? "good" : "dim";
      const rows: Readout[] = [
        { label: "Halves of the base", tex: `${fmt(dist(A, M.knob), 2)} \\text{ and } ${fmt(dist(M.knob, B), 2)}`, tone },
        { label: "Areas either side", tex: `${fmt(triangleArea(A, M.knob, C), 2)} \\text{ and } ${fmt(triangleArea(M.knob, B, C), 2)}`, tone },
      ];
      if (isosceles()) rows.push({ label: "Where the median meets the base", tex: `\\angle CMB = ${degTex(angleAt(C, M.knob, B))}`, tone });
      return rows;
    },
  };
});
