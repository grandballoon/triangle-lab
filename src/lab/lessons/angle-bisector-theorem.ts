// The Angle Bisector Theorem: the bisector from A cuts BC in the ratio of the
// sides it runs between, BX : XC = AB : AC. The proof extends the bisector to
// meet the line through B parallel to AC, which makes an isosceles triangle
// (BE = AB) and a pair of similar triangles (AXC and EXB).

import { C, tint } from "../draw.ts";
import { add, dist, fmt, lerp, lineLine, normalize, onSegment, sub, toRad, vec } from "../geo.ts";
import { inSector, labelAway, ratio } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const B = vec(-3.5, 0.2);

const NEAR_B = C.gold; // AB, and everything the proof shows equal or proportional to it
const NEAR_C = C.blue; // AC and the piece of BC beside it
const HALF = C.pink; // the bisector and the equal half-angles
const CROSS = C.violet; // the vertical angles at X

export default lesson((s) => {
  // A stays within reach of B, because BE = AB has to fit below the triangle.
  const A = s.point(-1.6, 3.9, { label: "A", constrain: inSector(B, 2.4, 4.3, toRad(25), toRad(135)) });
  const P = s.point(5.2, 0.2, { label: "C", constrain: onSegment(vec(1.5, 0.2), vec(7, 0.2)) });

  const figure = () => {
    const along = add(normalize(sub(B, A)), normalize(sub(P, A)));
    const X = lineLine(A, add(A, along), B, P) ?? lerp(B, P, 0.5);
    // E: where the bisector meets the parallel to AC through B.
    const E = lineLine(A, X, B, add(B, sub(P, A))) ?? X;
    return { X, E };
  };

  return {
    steps: [
      {
        title: "Where the bisector lands",
        text: "$AX$ cuts the angle at $A$ into two equal halves. Drag $A$ or $C$ and compare how $X$ divides $BC$ with the two sides at $A$: watch $\\frac{BX}{XC}$ against $\\frac{AB}{AC}$.",
      },
      {
        title: "Add a parallel",
        text: "Ratios of lengths call for similar triangles, and parallels make them. Draw the line through $B$ parallel to $AC$, and extend the bisector until it meets that line at $E$.",
      },
      {
        title: "An isosceles triangle",
        text: "$AE$ crosses the parallels, so the alternate interior angles $\\angle CAE$ and $\\angle AEB$ are equal. But $\\angle CAE = \\angle EAB$, the two halves. Triangle $ABE$ therefore has equal angles at $A$ and $E$, and $BE = AB$.",
      },
      {
        title: "Two similar triangles",
        text: "Triangles $AXC$ and $EXB$ have equal angles at $A$ and $E$, and equal vertical angles at $X$. By AA they are similar.",
      },
      {
        title: "Read off the ratio",
        text: "Matching sides give $\\dfrac{BX}{XC} = \\dfrac{BE}{AC}$. Replace $BE$ by its equal $AB$: $\\dfrac{BX}{XC} = \\dfrac{AB}{AC}$.",
      },
    ],

    draw(g, f) {
      const { X, E } = figure();

      if (f.at(3) > 0) {
        g.polygon([A, X, P], { fill: tint(NEAR_C, 0.16), stroke: null, alpha: f.at(3) });
        g.polygon([E, X, B], { fill: tint(NEAR_B, 0.16), stroke: null, alpha: f.at(3) });
      }
      if (f.at(1) > 0) {
        g.line(B, E, { color: C.dim, width: 2, dash: [8, 6], alpha: f.at(1) });
        g.chevrons(A, P, 1, { color: C.ink, alpha: f.at(1) });
        g.chevrons(E, B, 1, { color: C.ink, alpha: f.at(1) });
        g.segment(X, E, { color: HALF, width: 2.5, dash: [7, 5], alpha: f.at(1) });
        g.point(E, { color: C.ink, alpha: f.at(1) });
        labelAway(g, E, "E", A, { alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        g.segment(B, E, { color: NEAR_B, alpha: f.at(2) });
        g.ticks(B, E, 1, { color: NEAR_B, alpha: f.at(2) });
        g.ticks(A, B, 1, { color: NEAR_B, alpha: f.at(2) });
        g.angle(A, E, B, { color: HALF, fill: true, r: 34, alpha: f.at(2) });
      }
      if (f.at(3) > 0) {
        g.angle(A, X, P, { color: CROSS, r: 18, arcs: 2, width: 2, alpha: f.at(3) });
        g.angle(E, X, B, { color: CROSS, r: 18, arcs: 2, width: 2, alpha: f.at(3) });
      }

      g.segment(A, B, { color: NEAR_B });
      g.segment(A, P, { color: NEAR_C });
      g.segment(B, X, { color: NEAR_B, width: 5 });
      g.segment(X, P, { color: NEAR_C, width: 5 });
      g.segment(A, X, { color: HALF });
      g.angle(B, A, X, { color: HALF, fill: true, r: 34 });
      g.angle(X, A, P, { color: HALF, fill: true, r: 34 });

      g.point(B, { r: 4 });
      g.point(X, { color: HALF });
      g.label(B, "B", { dx: -16, dy: 6, bold: true });
      // Tuck X's name under the base, on the side the extended bisector leaves free.
      labelAway(g, X, "X", add(X, vec(E.x >= X.x ? 1 : -1, 1)), { color: HALF });
    },

    readout(f) {
      const { X, E } = figure();
      const ab = dist(A, B);
      const ac = dist(A, P);
      const bx = dist(B, X);
      const xc = dist(X, P);
      const be = dist(B, E);
      const rows: Readout[] = [
        { label: "Sides at $A$", tex: `AB = ${fmt(ab, 2)},\\quad AC = ${fmt(ac, 2)}` },
        { label: "Pieces of $BC$", tex: `BX = ${fmt(bx, 2)},\\quad XC = ${fmt(xc, 2)}` },
        {
          label: "The theorem",
          tex: `\\frac{BX}{XC} = ${fmt(ratio(bx, xc), 2)},\\qquad \\frac{AB}{AC} = ${fmt(ratio(ab, ac), 2)}`,
          tone: "good",
        },
      ];
      if (f.step >= 2) {
        rows.push({ label: "Isosceles $ABE$", tex: `BE = ${fmt(be, 2)} = AB`, tone: "good" });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Similar triangles",
          tex: `\\frac{BX}{XC} = ${fmt(ratio(bx, xc), 2)},\\qquad \\frac{BE}{AC} = ${fmt(ratio(be, ac), 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
