// The perimeter of a triangle, defined by walking it: a knob starts at A and
// is dragged round the edge, past B and C and home to A, and the edge it has
// covered lights up as it goes. Once round, the distance walked is the
// perimeter, p = a + b + c.

import { C as COLOR } from "../draw.ts";
import { fmt } from "../geo.ts";
import { perimeterOf, walkedPath } from "../kit/triangle-parts.ts";
import { CAPTION_AT, edgeWalker, labelSides, stageTriangle } from "../kit/triangle-stage.ts";
import { lesson } from "../scene.ts";

export default lesson((s) => {
  s.terms("Term", ["perimeter"]);
  const t = stageTriangle(s);
  const walk = edgeWalker(s, t);

  return {
    steps: [
      {
        title: "Walk all the way round",
        text: "Drag the knob from $A$ along the edge, past $B$ and $C$ and back to $A$. The edge you have walked lights up, one side at a time. Once you are home, the distance walked is the perimeter, $p = a + b + c$. Drag the corners to try another triangle.",
      },
    ],

    likes: [
      {
        title: "Walking round the block",
        text: "Walk once round a triangular block and back to your front door, and the distance on your step counter is the perimeter: each street's length added on as you finish it. Your total only ever grows, one side at a time, exactly like the distance walked here.",
      },
    ],

    uses: [
      {
        title: "Buying fencing",
        text: "A triangular corner plot has sides of $9$, $12$ and $15$ metres. Fencing it all the way round takes $9 + 12 + 15 = 36$ metres of fence, which is what you would order before allowing a little extra for posts and offcuts.",
      },
      {
        title: "Binding the edge of a quilt",
        text: "Quilters finish a quilt by sewing a strip of fabric, the binding, all the way round its edge. To know how long a strip to cut, they add up the lengths of every side, the perimeter, and then add some extra for turning the corners and joining the ends.",
      },
    ],

    draw(g) {
      walk.follow();
      const corners = t.corners();
      const home = walk.walked() === 1;
      g.polygon(corners, { color: COLOR.dim, width: 2.5, fill: "rgba(255, 255, 255, 0.04)" });
      g.path(walkedPath(corners, walk.walked() * perimeterOf(corners)), { color: g.accent, width: 5 });
      labelSides(g, corners, (name, length) => `${name} = ${fmt(length, 2)}`, home ? g.accent : COLOR.dim);
      g.label(CAPTION_AT, "Perimeter: the distance all the way round, p = a + b + c.", { size: 16 });
    },

    readout() {
      const corners = t.corners();
      const p = perimeterOf(corners);
      const home = walk.walked() === 1;
      return [
        { label: "Walked so far", tex: `${fmt(walk.walked() * p, 2)}` },
        { label: "Perimeter", tex: `p = a + b + c = ${fmt(p, 2)}`, tone: home ? "good" : "dim" },
      ];
    },
  };
});
