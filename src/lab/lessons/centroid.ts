// The centroid: the three medians of a triangle meet at one point, G, which
// lies two thirds of the way down each median from its corner.

import { C as COLOR } from "../draw.ts";
import { centroid, dist, fmt, mid, type Vec } from "../geo.ts";
import { CAPTION_AT, stageTriangle } from "../kit/triangle-stage.ts";
import { lesson, type Readout } from "../scene.ts";

export default lesson((s) => {
  s.terms("Term", ["centroid"]);
  const t = stageTriangle(s);

  /** Each corner with the midpoint of the side opposite it. */
  const medians = (): [name: string, corner: Vec, foot: Vec][] => {
    const { A, B, C } = t;
    return [
      ["A", A, mid(B, C)],
      ["B", B, mid(C, A)],
      ["C", C, mid(A, B)],
    ];
  };

  return {
    steps: [
      {
        title: "Where the medians meet",
        text: "Here are all three medians, each from a corner to the midpoint of the opposite side. However you drag the corners, they cross at a single point, the centroid $G$. It sits two thirds of the way down each median from its corner, so each median is cut in the ratio $2 : 1$. $G$ is also the triangle's balance point.",
      },
    ],

    likes: [
      {
        title: "Balancing a tray on one finger",
        text: "A flat cardboard triangle balances on the edge of a ruler laid along any median, because the two sides of that line hold equal area. The three balance lines cross at one point, the centroid $G$, and the triangle balances flat on a fingertip placed there. This only works while the card is the same thickness all over; a lopsided weight moves the balance point.",
      },
    ],

    uses: [
      {
        title: "Finding a triangle's centre in a game",
        text: "Game engines and graphics programs often need a single point to stand for a triangle, for example to place a label or to sort triangles by distance. They use the centroid, which is simply the average of the three corners. For corners $(0, 0)$, $(6, 0)$ and $(0, 9)$, the centroid is $\\left(\\frac{0 + 6 + 0}{3}, \\frac{0 + 0 + 9}{3}\\right) = (2, 3)$.",
      },
      {
        title: "Hanging a triangular sign level",
        text: "A flat triangular sign or a piece of a hanging mobile, made of one even material, has its centre of mass at the centroid. Hang it from a pivot at that point and it stays balanced whichever way it is turned, with no corner dipping down. To find that point on a cut-out, you only need to draw two medians and mark where they cross.",
      },
    ],

    draw(g) {
      const { A, B, C } = t;
      const G = centroid([A, B, C]);
      const hot = g.accent;
      g.polygon([A, B, C], { color: COLOR.dim, width: 2.5, fill: "rgba(255, 255, 255, 0.04)" });
      medians().forEach(([, corner, foot], i) => {
        const count = (i + 1) as 1 | 2 | 3;
        const [p, q] = i === 0 ? [B, C] : i === 1 ? [C, A] : [A, B];
        g.ticks(p, foot, count, { color: COLOR.dim });
        g.ticks(foot, q, count, { color: COLOR.dim });
        g.segment(corner, G, { color: hot, width: 3.5 });
        g.segment(G, foot, { color: hot, width: 3.5, alpha: 0.45 });
        g.point(foot, { color: COLOR.dim, r: 3.5 });
      });
      g.point(G, { color: COLOR.gold, r: 7, label: "G" });
      g.label(CAPTION_AT, "Centroid: where the three medians meet, two thirds of the way down each.", { size: 16 });
    },

    readout() {
      const G = centroid([t.A, t.B, t.C]);
      return medians().map(([name, corner, foot]): Readout => ({
        label: `Median from ${name}`,
        tex: `${name}G = ${fmt(dist(corner, G), 2)} = 2 \\times ${fmt(dist(G, foot), 2)}`,
        tone: "good",
      }));
    },
  };
});
