// Join the midpoints of the sides of any quadrilateral and a parallelogram
// appears. Each of its sides is a midsegment of a triangle cut off by a
// diagonal, so it is parallel to that diagonal and half as long. Perpendicular
// diagonals therefore make it a rectangle, and its area is always half the
// quadrilateral's.

import { C, tint } from "../draw.ts";
import { angleAt, centroid, dist, fmt, lineLine, mid, perp, polygonArea, project, add, sub, toDeg, type Vec } from "../geo.ts";
import { freeQuad, GLASS, isConvexQuad, same } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const AC = C.gold;
const BD = C.blue;
const TURN = C.pink;
// A dragged corner clicks into place when the diagonals are this close to perpendicular.
const SNAP = 0.15;

export default lesson((s) => {
  const Q = freeQuad(
    s,
    [
      { x: -5.2, y: -3.2 },
      { x: 4.6, y: -3.6 },
      { x: 5.8, y: 2.2 },
      { x: -2.6, y: 3.6 },
    ],
    {
      labels: ["A", "B", "C", "D"],
      // Convex, so that the four corner triangles of the area step lie inside.
      ok: isConvexQuad,
      // The spot on the perpendicular from the opposite corner to the other diagonal.
      snap: (i, p) => {
        const opposite = Q[(i + 2) % 4];
        const across = sub(Q[(i + 1) % 4], Q[(i + 3) % 4]);
        const foot = project(p, opposite, add(opposite, perp(across)));
        return dist(p, foot) < SNAP ? foot : p;
      },
    },
  );
  const [A, B, Cc, D] = Q;

  const measure = () => {
    const [E, F, G, H] = [mid(A, B), mid(B, Cc), mid(Cc, D), mid(D, A)];
    const X = lineLine(A, Cc, B, D) ?? centroid(Q);
    const crossing = angleAt(Cc, X, D);
    return { E, F, G, H, X, crossing, right: same(crossing, Math.PI / 2) };
  };

  return {
    steps: [
      {
        title: "Join the midpoints",
        text: "$E$, $F$, $G$, $H$ are the midpoints of the sides. Drag the corners into any convex quadrilateral you like, however lopsided, and watch the inner figure: its opposite sides stay parallel and equal.",
      },
      {
        title: "A midsegment",
        text: "Draw diagonal $AC$. In triangle $ABC$, $EF$ joins the midpoints of two sides, so it is parallel to the third side and half as long: $EF \\parallel AC$ and $EF = \\tfrac12 AC$.",
      },
      {
        title: "And another",
        text: "Triangle $ACD$ gives the same for $HG$: parallel to $AC$ and half of it. So $EF$ and $HG$ are parallel and equal, which makes $EFGH$ a parallelogram.",
      },
      {
        title: "The other diagonal",
        text: "Likewise $FG$ and $EH$ are parallel to $BD$ and half of it. The sides of $EFGH$ run along the two diagonals' directions, so its angle at $E$ equals the angle between them. Make the diagonals perpendicular: a rectangle.",
      },
      {
        title: "Half the area",
        text: "Triangle $EBF$ is a half-scale copy of $ABC$: a quarter of its area. With $HDG$ and $ACD$, the gold corners total $\\tfrac14[ABCD]$; so do the blue ones, using $BD$. Half is cut away, and half remains.",
      },
    ],

    draw(g, f) {
      const { E, F, G, H, X, right } = measure();
      const inner = [E, F, G, H];

      g.polygon(Q, { fill: GLASS, color: C.dim, width: 2.5 });

      if (f.at(4) > 0) {
        const a = f.at(4);
        g.polygon([E, B, F], { fill: tint(AC, 0.3), stroke: null, alpha: a });
        g.polygon([H, D, G], { fill: tint(AC, 0.3), stroke: null, alpha: a });
        g.polygon([H, A, E], { fill: tint(BD, 0.3), stroke: null, alpha: a });
        g.polygon([F, Cc, G], { fill: tint(BD, 0.3), stroke: null, alpha: a });
      }
      const halves = f.at(1) * (1 - f.at(3));
      if (halves > 0) {
        g.polygon([A, B, Cc], { fill: tint(AC, 0.1), stroke: null, alpha: halves });
        if (f.at(2) > 0) g.polygon([A, Cc, D], { fill: tint(AC, 0.1), stroke: null, alpha: f.at(2) * halves });
      }

      g.polygon(inner, { fill: tint(g.accent, 0.14), color: g.accent, width: 3.5 });

      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(A, Cc, { color: AC, width: 2.5, dash: [8, 6], alpha: a });
        g.chevrons(A, Cc, 1, { color: AC, alpha: a });
        g.segment(E, F, { color: AC, width: 4.5, alpha: a });
        g.chevrons(E, F, 1, { color: AC, alpha: a });
      }
      if (f.at(2) > 0) {
        g.segment(H, G, { color: AC, width: 4.5, alpha: f.at(2) });
        g.chevrons(H, G, 1, { color: AC, alpha: f.at(2) });
      }
      if (f.at(3) > 0) {
        const a = f.at(3);
        g.segment(B, D, { color: BD, width: 2.5, dash: [8, 6], alpha: a });
        g.chevrons(B, D, 2, { color: BD, alpha: a });
        for (const [p, q] of [[F, G], [E, H]] as const) {
          g.segment(p, q, { color: BD, width: 4.5, alpha: a });
          g.chevrons(p, q, 2, { color: BD, alpha: a });
        }
        // EF runs along XC and EH along XD, so these two angles are equal.
        g.angle(Cc, X, D, { color: TURN, fill: true, r: 22, label: !right, alpha: a });
        g.angle(F, E, H, { color: TURN, fill: true, r: 22, label: !right, alpha: a });
      }

      const sides: [Vec, Vec, Vec][] = [[A, E, B], [B, F, Cc], [Cc, G, D], [D, H, A]];
      sides.forEach(([p, m, q], i) => {
        g.ticks(p, m, i + 1, { color: C.dim, width: 1.5 });
        g.ticks(m, q, i + 1, { color: C.dim, width: 1.5 });
        g.point(m, { color: g.accent });
      });
      const away = centroid(Q);
      for (const [p, name] of [[E, "E"], [F, "F"], [G, "G"], [H, "H"]] as const) {
        const out = sub(p, away);
        const l = Math.hypot(out.x, out.y) || 1;
        g.label(p, name, { color: g.accent, dx: (out.x / l) * 17, dy: (out.y / l) * 17, bold: true });
      }

      if (right && f.step === 3) g.label({ x: 0, y: 4.6 }, "rectangle", { color: TURN, size: 20, bold: true });
    },

    readout() {
      const { E, F, G, H, crossing, right } = measure();
      const outer = polygonArea(Q);
      const innerArea = polygonArea([E, F, G, H]);
      return [
        {
          label: "Along AC",
          tex: `EF = ${fmt(dist(E, F), 2)},\\; HG = ${fmt(dist(H, G), 2)},\\; \\tfrac12 AC = ${fmt(dist(A, Cc) / 2, 2)}`,
          tone: "good",
        },
        {
          label: "Along BD",
          tex: `FG = ${fmt(dist(F, G), 2)},\\; EH = ${fmt(dist(E, H), 2)},\\; \\tfrac12 BD = ${fmt(dist(B, D) / 2, 2)}`,
          tone: "good",
        },
        {
          label: "Angle between the diagonals",
          tex: `${fmt(toDeg(crossing))}^\\circ = \\angle FEH = ${fmt(toDeg(angleAt(F, E, H)))}^\\circ`,
          tone: right ? "good" : "plain",
        },
        { label: "Inner figure", tex: right ? "\\text{rectangle}" : "\\text{parallelogram}", tone: right ? "good" : "plain" },
        { label: "Areas", tex: `[ABCD] = ${fmt(outer)},\\quad [EFGH] = ${fmt(innerArea)}` },
        {
          label: "Ratio",
          tex: `\\frac{[EFGH]}{[ABCD]} = ${fmt(outer > 1e-9 ? innerArea / outer : 0, 3)}`,
          tone: "good",
        },
      ];
    },
  };
});
