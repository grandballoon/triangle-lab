// The Pythagorean theorem by dissection. Four copies of a right triangle fit
// inside the square on its hypotenuse and leave a small square of side |a − b|
// in the middle, so c² = 4·(ab/2) + (a − b)² = a² + b².

import { C, tint } from "../draw.ts";
import { add, angleOf, centroid, clamp, dist, fmt, lerp, perp, polar, scale, sub } from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

// The right-angle corner of the triangle the learner shapes.
const CORNER = { x: -7, y: -2.6 };
const SQUARE_CENTRE = { x: 2.9, y: 0.3 };
const MIN_LEG = 1;
const MAX_LEG = 4;

const LEG_A = C.gold;
const LEG_B = C.cyan;
const HOLE = C.pink;

export default lesson((s) => {
  const B = s.point(CORNER.x + 3.6, CORNER.y, {
    label: "B",
    color: LEG_A,
    constrain: (p) => ({ x: clamp(p.x, CORNER.x + MIN_LEG, CORNER.x + MAX_LEG), y: CORNER.y }),
  });
  const A = s.point(CORNER.x, CORNER.y + 2, {
    label: "A",
    color: LEG_B,
    constrain: (p) => ({ x: CORNER.x, y: clamp(p.y, CORNER.y + MIN_LEG, CORNER.y + MAX_LEG) }),
  });

  const legs = (): { a: number; b: number; c: number } => ({
    a: B.x - CORNER.x,
    b: A.y - CORNER.y,
    c: dist(A, B),
  });

  return {
    steps: [
      {
        title: "A square on the hypotenuse",
        text: "Drag $A$ and $B$ to change the legs $a$ and $b$. The square on the right has the hypotenuse $c$ as its side, so its area is $c^2$. How does that compare with $a^2 + b^2$?",
      },
      {
        title: "Four copies",
        text: "Four copies of the triangle fit inside the square, each with its hypotenuse along one side. They meet cleanly at the corners because the two acute angles of the triangle add up to $90^\\circ$.",
      },
      {
        title: "The hole in the middle",
        text: "Along each inner line, the long leg of one copy runs beside the short leg of the next and overshoots it by $|a - b|$. Those four leftovers meet at right angles: the hole is a square of side $|a - b|$.",
      },
      {
        title: "Add the pieces",
        text: "The big square is four triangles plus the hole: $c^2 = 4 \\cdot \\tfrac12 ab + (a - b)^2 = 2ab + a^2 - 2ab + b^2 = a^2 + b^2$.",
      },
    ],

    draw(g, f) {
      const { a, b, c } = legs();

      // The learner's triangle.
      g.polygon([CORNER, B, A], { fill: tint(C.blue, 0.25), stroke: null });
      g.segment(CORNER, B, { color: LEG_A });
      g.segment(CORNER, A, { color: LEG_B });
      g.segment(A, B, { color: g.accent });
      g.angle(B, CORNER, A, { r: 16, width: 2 });
      g.along(CORNER, B, "a", { color: LEG_A, offset: -16 });
      g.along(CORNER, A, "b", { color: LEG_B, offset: 16 });
      g.along(A, B, "c", { color: g.accent, offset: -16 });

      // The square on c, counter-clockwise from its lower-left corner.
      const half = c / 2;
      const corners = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half },
      ].map((p) => add(SQUARE_CENTRE, p));

      // Copy i has its hypotenuse on the side from corner i to corner i + 1
      // and its right angle inside, a from the first corner and b from the second.
      const rightAngles = corners.map((from, i) => {
        const u = scale(sub(corners[(i + 1) % 4], from), 1 / c);
        return add(from, add(scale(u, (a * a) / c), scale(perp(u), (a * b) / c)));
      });

      if (f.at(2) > 0) g.polygon(rightAngles, { fill: tint(HOLE, 0.4), stroke: null, alpha: f.at(2) });

      if (f.at(1) > 0) {
        const t = f.at(1);
        rightAngles.forEach((target, i) => {
          // Slide and turn the learner's triangle into its place.
          const turn = angleOf(sub(corners[i], target)) * t;
          const corner = lerp(CORNER, target, t);
          const endOfA = polar(corner, a, turn);
          const endOfB = polar(corner, b, turn + Math.PI / 2);
          const copy = [corner, endOfA, endOfB];
          g.polygon(copy, { fill: tint(C.blue, 0.25), color: C.ink, width: 2, alpha: t });
          if (i === 0) {
            g.along(corner, endOfA, "a", { color: LEG_A, alpha: t, offset: 14 });
            g.along(corner, endOfB, "b", { color: LEG_B, alpha: t, offset: -14 });
          }
          if (f.at(3) > 0) g.label(centroid(copy), "½ab", { size: 13, alpha: f.at(3) });
        });
      }

      g.polygon(corners, { color: g.accent });
      g.along(corners[0], corners[1], "c", { color: g.accent, offset: -16 });
      g.label(SQUARE_CENTRE, "c²", { color: g.accent, size: 22, bold: true, alpha: 1 - f.at(1) });

      if (f.at(2) > 0) {
        const difference = a >= b ? "a − b" : "b − a";
        g.polygon(rightAngles, { color: HOLE, width: 2.5, alpha: f.at(2) });
        if (Math.abs(a - b) > 0.5) {
          g.along(rightAngles[0], rightAngles[1], difference, { color: HOLE, alpha: f.at(2), offset: -14, size: 13 });
        }
      }
    },

    readout() {
      const { a, b, c } = legs();
      const triangles = 4 * ((a * b) / 2);
      const hole = (a - b) ** 2;
      const square = c * c;
      const pieces = holds(agree(triangles + hole, square));
      return [
        { label: "Sides", tex: `a = ${fmt(a, 2)},\\ b = ${fmt(b, 2)},\\ c = ${fmt(c, 2)}` },
        { label: "Four triangles", tex: `4 \\cdot \\tfrac12 ab = ${fmt(triangles, 2)}` },
        { label: "The hole", tex: `(a - b)^2 = ${fmt(hole, 2)}` },
        { label: "Pieces together", tex: `2ab + (a - b)^2 = ${fmt(triangles + hole, 2)}`, tone: pieces },
        { label: "Square on the hypotenuse", tex: `c^2 = ${fmt(square, 2)}`, tone: pieces },
        {
          label: "Squares on the legs",
          tex: `a^2 + b^2 = ${fmt(a * a, 2)} + ${fmt(b * b, 2)} = ${fmt(a * a + b * b, 2)}`,
          tone: holds(agree(a * a + b * b, square)),
        },
      ];
    },
  };
});
