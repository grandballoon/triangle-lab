// The interior angles of an n-gon sum to 180°(n − 2). The diagonals from one
// vertex cut the polygon into n − 2 triangles, and the triangles' angles are
// exactly the polygon's angles, cut into pieces.

import { C, tint } from "../draw.ts";
import { fmt, toDeg, vec } from "../geo.ts";
import { convexPolygon, interiorAngles, pieceColor } from "../kit/polygons.ts";
import { lesson, type Readout } from "../scene.ts";

const MAX_SIDES = 12;

export default lesson((s) => {
  const sides = s.slider({ label: "n =", at: vec(-7.4, -4.3), width: 4.5, min: 3, max: MAX_SIDES, value: 6, step: 1 });
  const polygon = convexPolygon(s, {
    max: MAX_SIDES,
    sides: () => sides.value,
    center: vec(0, 0.6),
    radius: 3.6,
    box: [-7.5, 7.5, -3.4, 4.5],
    first: { label: "A", color: C.gold },
  });

  return {
    steps: [
      {
        title: "Many angles, one sum",
        text: "Drag any corner and slide $n$. The polygon stays convex, its angles shift about, yet their sum in the panel depends only on the number of sides.",
      },
      {
        title: "Fan out from one vertex",
        text: "From $A$ draw a diagonal to every vertex that is not a neighbour: $n - 3$ diagonals. They slice the polygon into $n - 2$ triangles.",
      },
      {
        title: "Add up the triangles",
        text: "Each triangle's angles sum to $180^\\circ$. Every one of those angles is a piece of a polygon angle, and the pieces use each polygon angle up exactly. So the interior angles sum to $180^\\circ(n - 2)$.",
      },
    ],

    draw(g, f) {
      const pts = polygon.corners();
      const n = pts.length;
      const A = pts[0];

      g.polygon(pts, { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(1) > 0) {
        for (let k = 1; k < n - 1; k++) {
          g.polygon([A, pts[k], pts[k + 1]], { fill: tint(pieceColor(k - 1), 0.2), stroke: null, alpha: f.at(1) });
        }
        for (let k = 2; k < n - 1; k++) g.segment(A, pts[k], { color: C.gold, width: 2.5, alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        for (let k = 1; k < n - 1; k++) {
          const mark = { color: pieceColor(k - 1), r: 24, width: 2, fill: true, square: false, alpha: f.at(2) };
          g.angle(pts[k], A, pts[k + 1], { ...mark, r: 38 });
          g.angle(A, pts[k], pts[k + 1], mark);
          g.angle(A, pts[k + 1], pts[k], mark);
        }
      }
      if (f.step === 0) {
        pts.forEach((p, i) => {
          g.angle(pts[(i + n - 1) % n], p, pts[(i + 1) % n], { color: g.accent, r: 24, fill: true, label: true });
        });
      }
    },

    readout(f) {
      const pts = polygon.corners();
      const n = pts.length;
      const sum = interiorAngles(pts).reduce((a, b) => a + toDeg(b), 0);
      const rows: Readout[] = [{ label: "Sides", tex: `n = ${n}` }];
      if (f.step >= 1) {
        rows.push(
          { label: "Diagonals from A", tex: `n - 3 = ${n - 3}` },
          { label: "Triangles", tex: `n - 2 = ${n - 2}` },
        );
      }
      rows.push(
        { label: "Angles, measured and added", tex: `${fmt(sum)}^\\circ`, tone: "good" },
        { label: "Formula", tex: `180^\\circ(n - 2) = 180^\\circ \\cdot ${n - 2} = ${180 * (n - 2)}^\\circ`, tone: "good" },
      );
      return rows;
    },
  };
});
