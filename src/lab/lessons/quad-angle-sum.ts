// The interior angles of any quadrilateral sum to 360°. A diagonal cuts it
// into two triangles whose six angles are exactly the quadrilateral's four —
// and in a dented (concave) quadrilateral the diagonal from the reflex corner
// is the one that stays inside, so the same cut still works.

import { C, tint } from "../draw.ts";
import { fmt, toDeg } from "../geo.ts";
import { corners, freeQuad, GLASS, isSimpleQuad } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const NAMES = ["A", "B", "C", "D"] as const;
const FIRST = C.gold;
const SECOND = C.blue;

export default lesson((s) => {
  const Q = freeQuad(
    s,
    [
      { x: -4.6, y: -3 },
      { x: 4.8, y: -2.4 },
      { x: 3, y: 3.2 },
      { x: -3.4, y: 2.2 },
    ],
    { labels: NAMES, ok: isSimpleQuad },
  );

  /** Index of the reflex corner, or -1 when the quadrilateral is convex. */
  const reflex = (): number => corners(Q).findIndex((c) => c.sweep > Math.PI);

  // The diagonal from a reflex corner is the one that stays inside; in a
  // convex quadrilateral either would do, and we take AC.
  const cutFrom = (): number => Math.max(reflex(), 0) % 2;

  return {
    steps: [
      {
        title: "Four angles, one sum",
        text: "Drag any corner. The four angles change freely, but watch their sum in the panel. Push one corner inward to dent the shape and see whether the sum survives.",
      },
      {
        title: "Cut along a diagonal",
        text: "Join two opposite corners. The diagonal splits the quadrilateral into a gold triangle and a blue triangle with nothing left over.",
      },
      {
        title: "Two triangles",
        text: "Each triangle's angles sum to $180^\\circ$. At the ends of the diagonal a gold and a blue angle together make up one corner, so the four corners total $180^\\circ + 180^\\circ = 360^\\circ$.",
      },
      {
        title: "A dented quadrilateral",
        text: "Push a corner inward until its angle passes $180^\\circ$: a reflex angle, and the shape is concave. The diagonal from that corner still lies inside, so the same cut still gives two triangles and $360^\\circ$.",
      },
    ],

    draw(g, f) {
      const k = cutFrom();
      const [P, U, R, V] = [Q[k], Q[k + 1], Q[k + 2], Q[(k + 3) % 4]];

      g.polygon(Q, { fill: GLASS });

      if (f.at(1) > 0) {
        g.polygon([P, U, R], { fill: tint(FIRST, 0.14), stroke: null, alpha: f.at(1) });
        g.polygon([P, R, V], { fill: tint(SECOND, 0.14), stroke: null, alpha: f.at(1) });
        g.segment(P, R, { width: 2.5, dash: [8, 6], alpha: f.at(1) });
      }

      const whole = 1 - f.at(2);
      if (whole > 0) {
        for (const [i, c] of corners(Q).entries()) {
          g.angleMark(Q[i], c.from, c.from + c.sweep, {
            color: g.accent,
            fill: true,
            r: 30,
            label: true,
            square: false,
            alpha: whole,
          });
        }
      }
      if (f.at(2) > 0) {
        const piece = { fill: true, r: 30, alpha: f.at(2) };
        g.angle(U, P, R, { ...piece, color: FIRST });
        g.angle(P, U, R, { ...piece, color: FIRST });
        g.angle(P, R, U, { ...piece, color: FIRST });
        g.angle(R, P, V, { ...piece, color: SECOND });
        g.angle(P, V, R, { ...piece, color: SECOND });
        g.angle(V, R, P, { ...piece, color: SECOND });
      }
    },

    readout(f) {
      const deg = corners(Q).map((c) => toDeg(c.sweep));
      const dent = reflex();
      const pair = (i: number, j: number): string =>
        `\\angle ${NAMES[i]} = ${fmt(deg[i])}^\\circ,\\quad \\angle ${NAMES[j]} = ${fmt(deg[j])}^\\circ`;
      return [
        { label: "Angles", tex: pair(0, 1) },
        { tex: pair(2, 3) },
        {
          label: "Sum",
          tex: `\\angle A + \\angle B + \\angle C + \\angle D = ${fmt(deg[0] + deg[1] + deg[2] + deg[3])}^\\circ`,
          tone: "good",
        },
        ...(f.step >= 2
          ? [{ label: "Two triangles", tex: "180^\\circ + 180^\\circ = 360^\\circ", tone: "good" as const }]
          : []),
        {
          label: "Shape",
          tex: dent < 0 ? "\\text{convex}" : `\\text{concave: } \\angle ${NAMES[dent]} > 180^\\circ`,
        },
      ];
    },
  };
});
