// Joining the midpoints of a triangle's sides makes a triangle similar to the
// original with every side halved, so it holds a quarter of the area — and the
// three corner triangles left over are congruent to it.

import { C, tint } from "../draw.ts";
import { dist, fmt, mid, triangleArea } from "../geo.ts";
import { agree, looseTriangle } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

// Each side shares a colour with the midsegment parallel to it.
const SIDE_A = C.gold; // BC and EF
const SIDE_B = C.blue; // CA and FD
const SIDE_C = C.pink; // AB and DE

export default lesson((s) => {
  const [A, B, P] = looseTriangle(s);

  const midpoints = () => ({ D: mid(B, P), E: mid(P, A), F: mid(A, B) });

  return {
    steps: [
      {
        title: "Join the midpoints",
        text: "Drag any corner. $D$, $E$ and $F$ are the midpoints of the sides. Watch the area of triangle $DEF$ beside the area of the whole triangle.",
      },
      {
        title: "One corner at a time",
        text: "Triangles $AFE$ and $ABC$ share the angle at $A$, and $AF = \\tfrac12 AB$, $AE = \\tfrac12 AC$. By SAS similarity $AFE \\sim ABC$ with ratio $\\tfrac12$, so $EF = \\tfrac12 BC$.",
      },
      {
        title: "Three halved sides",
        text: "The same argument at $B$ and at $C$ gives $FD = \\tfrac12 CA$ and $DE = \\tfrac12 AB$. All three sides of $DEF$ are half the matching sides of $ABC$, so $DEF \\sim ABC$ by SSS, with $k = \\tfrac12$.",
      },
      {
        title: "A quarter of the area",
        text: "Similar figures with ratio $k$ have areas in ratio $k^2$. Here $k = \\tfrac12$, so $[DEF] = \\tfrac14 [ABC]$.",
      },
      {
        title: "Four matching pieces",
        text: "Each corner triangle also has sides $\\tfrac12 BC$, $\\tfrac12 CA$, $\\tfrac12 AB$, so all four small triangles are congruent by SSS. Four equal pieces fill $ABC$ — a quarter each.",
      },
    ],

    draw(g, f) {
      const { D, E, F } = midpoints();

      g.polygon([A, B, P], { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(4) > 0) {
        g.polygon([A, F, E], { fill: tint(SIDE_A, 0.3), stroke: null, alpha: f.at(4) });
        g.polygon([F, B, D], { fill: tint(SIDE_B, 0.3), stroke: null, alpha: f.at(4) });
        g.polygon([E, D, P], { fill: tint(SIDE_C, 0.3), stroke: null, alpha: f.at(4) });
      }
      g.polygon([D, E, F], { fill: tint(g.accent, 0.3), color: g.accent });

      if (f.at(1) > 0) {
        const a = f.at(1);
        // The corner triangle fades back out once the argument moves on.
        g.polygon([A, F, E], { fill: tint(SIDE_A, 0.28), stroke: null, alpha: a - f.at(2) });
        g.angle(F, A, E, { color: C.ink, fill: true, r: 30, alpha: a });
        g.ticks(A, F, 1, { color: SIDE_C, alpha: a });
        g.ticks(F, B, 1, { color: SIDE_C, alpha: a });
        g.ticks(A, E, 2, { color: SIDE_B, alpha: a });
        g.ticks(E, P, 2, { color: SIDE_B, alpha: a });
        g.segment(E, F, { color: SIDE_A, alpha: a });
        g.segment(B, P, { color: SIDE_A, alpha: a });
        g.along(F, E, fmt(dist(E, F), 2), { color: SIDE_A, offset: -14, alpha: a });
        g.along(B, P, fmt(dist(B, P), 2), { color: SIDE_A, offset: -18, alpha: a });
      }
      if (f.at(2) > 0) {
        const a = f.at(2);
        g.ticks(B, D, 3, { color: SIDE_A, alpha: a });
        g.ticks(D, P, 3, { color: SIDE_A, alpha: a });
        g.segment(F, D, { color: SIDE_B, alpha: a });
        g.segment(P, A, { color: SIDE_B, alpha: a });
        g.segment(D, E, { color: SIDE_C, alpha: a });
        g.segment(A, B, { color: SIDE_C, alpha: a });
        g.along(D, F, fmt(dist(F, D), 2), { color: SIDE_B, offset: -14, alpha: a });
        g.along(P, A, fmt(dist(P, A), 2), { color: SIDE_B, offset: -18, alpha: a });
        g.along(E, D, fmt(dist(D, E), 2), { color: SIDE_C, offset: -14, alpha: a });
        g.along(A, B, fmt(dist(A, B), 2), { color: SIDE_C, offset: -18, alpha: a });
      }

      g.point(D, { label: "D", color: g.accent });
      g.point(E, { label: "E", color: g.accent });
      g.point(F, { label: "F", color: g.accent });
    },

    readout() {
      const { D, E, F } = midpoints();
      const whole = triangleArea(A, B, P);
      const inner = triangleArea(D, E, F);
      const corners = [triangleArea(A, F, E), triangleArea(F, B, D), triangleArea(E, D, P)];
      const congruent = corners.every((c) => agree(c, inner));
      return [
        {
          label: "Midsegment and side",
          tex: `EF = ${fmt(dist(E, F), 2)},\\quad \\tfrac12 BC = ${fmt(dist(B, P) / 2, 2)}`,
        },
        { tex: `FD = ${fmt(dist(F, D), 2)},\\quad \\tfrac12 CA = ${fmt(dist(P, A) / 2, 2)}` },
        { tex: `DE = ${fmt(dist(D, E), 2)},\\quad \\tfrac12 AB = ${fmt(dist(A, B) / 2, 2)}` },
        { label: "Whole triangle", tex: `[ABC] = ${fmt(whole, 2)}` },
        {
          label: "Midpoint triangle",
          tex: `[DEF] = ${fmt(inner, 2)},\\quad \\tfrac14 [ABC] = ${fmt(whole / 4, 2)}`,
          tone: agree(inner, whole / 4) ? "good" : "warn",
        },
        {
          label: "Corner triangles",
          tex: `[AFE] = [FBD] = [EDC] = ${fmt(corners[0], 2)}`,
          tone: congruent ? "good" : "warn",
        },
      ];
    },
  };
});
