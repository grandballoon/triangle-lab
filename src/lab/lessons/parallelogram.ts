// What two pairs of parallel sides force: equal opposite sides, equal opposite
// angles, supplementary neighbours, and diagonals that bisect each other. One
// diagonal and the alternate angles it makes with the parallels give two
// ASA-congruent triangles, and everything else follows.

import { C, tint } from "../draw.ts";
import { add, angleAt, clamp, dist, fmt, lineLine, mid, normalize, scale, sub, toDeg, vec, type Vec } from "../geo.ts";
import { GLASS, same } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const A = vec(-5, -3);
const RIGHT = 7.3;
const LEFT = -7.3;
const MIN_BASE = 2;
// D stays left of this, which keeps the angle at A from closing up.
const D_MAX = 0.5;
const TOP_MIN = -0.8;
const TOP_MAX = 3.8;

const FIRST = C.gold;
const SECOND = C.blue;
const THIRD = C.cyan;
const OPPOSITE = C.green;
const NEIGHBOUR = C.orange;

export default lesson((s) => {
  const B = s.point(2.2, A.y, { label: "B" });
  const D = s.point(-3.2, 2.6, { label: "D" });
  // C = B + D − A must stay on the stage, which ties the two handles together.
  B.constrain = (p) => vec(clamp(p.x, A.x + MIN_BASE, Math.min(RIGHT, RIGHT - (D.x - A.x))), A.y);
  D.constrain = (p) =>
    vec(clamp(p.x, LEFT, Math.min(D_MAX, RIGHT - (B.x - A.x))), clamp(p.y, TOP_MIN, TOP_MAX));

  const corner = (): Vec => sub(add(B, D), A);

  return {
    steps: [
      {
        title: "Two pairs of parallels",
        text: "A parallelogram is a quadrilateral whose opposite sides are parallel — nothing more. Drag $B$ and $D$ to reshape it, and watch what the panel says about its sides, angles and diagonals.",
      },
      {
        title: "A diagonal and alternate angles",
        text: "Draw $AC$. It crosses the parallels $AB$ and $DC$, so $\\angle CAB = \\angle ACD$. It also crosses the parallels $BC$ and $AD$, so $\\angle BCA = \\angle DAC$.",
      },
      {
        title: "Congruent halves",
        text: "Triangles $ABC$ and $CDA$ share $AC$ and have equal angles at both of its ends, so they are congruent (ASA). Matching parts: $AB = CD$, $BC = DA$ and $\\angle B = \\angle D$.",
      },
      {
        title: "The other angles",
        text: "$\\angle A$ and $\\angle C$ are each a gold angle plus a blue one, so they are equal. Extending $AB$ past $B$ copies $\\angle A$ there (corresponding angles), next to $\\angle B$ on a straight line: $\\angle A + \\angle B = 180^\\circ$.",
      },
      {
        title: "Diagonals bisect each other",
        text: "Add $BD$, meeting $AC$ at $E$. Triangles $ABE$ and $CDE$ have $AB = CD$ with equal alternate angles at both ends, so they are congruent (ASA): $AE = EC$ and $BE = ED$.",
      },
    ],

    draw(g, f) {
      const Cc = corner();
      const E = lineLine(A, Cc, B, D) ?? mid(A, Cc);
      const early = 1 - f.at(4);

      g.polygon([A, B, Cc, D], { fill: GLASS, color: g.accent });
      g.chevrons(A, B, 1, { color: g.accent });
      g.chevrons(D, Cc, 1, { color: g.accent });
      g.chevrons(A, D, 2, { color: g.accent });
      g.chevrons(B, Cc, 2, { color: g.accent });

      if (f.at(2) > 0) {
        const a = f.at(2) * early;
        g.polygon([A, B, Cc], { fill: tint(C.pink, 0.16), stroke: null, alpha: a });
        g.polygon([Cc, D, A], { fill: tint(C.violet, 0.16), stroke: null, alpha: a });
        g.ticks(A, B, 1, { alpha: f.at(2) });
        g.ticks(Cc, D, 1, { alpha: f.at(2) });
        g.ticks(B, Cc, 2, { alpha: f.at(2) });
        g.ticks(D, A, 2, { alpha: f.at(2) });
        g.angle(A, B, Cc, { color: OPPOSITE, fill: true, r: 24, alpha: f.at(2) });
        g.angle(Cc, D, A, { color: OPPOSITE, fill: true, r: 24, alpha: f.at(2) });
      }

      if (f.at(4) > 0) {
        const a = f.at(4);
        g.polygon([A, B, E], { fill: tint(C.pink, 0.2), stroke: null, alpha: a });
        g.polygon([Cc, D, E], { fill: tint(C.violet, 0.2), stroke: null, alpha: a });
        g.segment(B, D, { color: C.ink, width: 2.5, alpha: a });
        g.angle(A, B, E, { color: THIRD, r: 38, alpha: a });
        g.angle(Cc, D, E, { color: THIRD, r: 38, alpha: a });
        g.ticks(A, E, 1, { color: FIRST, alpha: a });
        g.ticks(E, Cc, 1, { color: FIRST, alpha: a });
        g.ticks(B, E, 2, { color: THIRD, alpha: a });
        g.ticks(E, D, 2, { color: THIRD, alpha: a });
        g.point(E, { alpha: a });
        g.label(E, "E", { dy: 20, alpha: a });
      }

      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(A, Cc, { color: C.ink, width: 2.5, alpha: a });
        g.angle(B, A, Cc, { color: FIRST, fill: true, r: 44, alpha: a });
        g.angle(D, Cc, A, { color: FIRST, fill: true, r: 44, alpha: a });
        g.angle(Cc, A, D, { color: SECOND, fill: true, r: 34, arcs: 2, alpha: a * early });
        g.angle(A, Cc, B, { color: SECOND, fill: true, r: 34, arcs: 2, alpha: a * early });
      }

      // Step 3: the angle at A reappears outside B, beside the angle at B.
      const beside = f.at(3) * early;
      if (beside > 0) {
        const beyond = add(B, scale(normalize(sub(B, A)), 1.4));
        g.segment(B, beyond, { color: C.dim, width: 2, dash: [6, 5], alpha: beside });
        g.angle(beyond, B, Cc, { color: NEIGHBOUR, fill: true, r: 24, alpha: beside });
        g.angle(B, A, D, { color: NEIGHBOUR, r: 56, alpha: beside });
      }

      g.point(A, { color: g.accent });
      g.label(A, "A", { color: g.accent, dx: -14, dy: -14, bold: true });
      g.point(Cc, { color: g.accent });
      g.label(Cc, "C", { color: g.accent, dx: 14, dy: 14, bold: true });
    },

    readout() {
      const Cc = corner();
      const E = lineLine(A, Cc, B, D) ?? mid(A, Cc);
      const angleA = toDeg(angleAt(B, A, D));
      const angleB = toDeg(angleAt(A, B, Cc));
      const angleC = toDeg(angleAt(B, Cc, D));
      const angleD = toDeg(angleAt(Cc, D, A));
      // One value when the two agree, both when they do not.
      const matched = (left: string, right: string, x: number, y: number, unit = ""): string =>
        same(x, y)
          ? `${left} = ${right} = ${fmt(x)}${unit}`
          : `${left} = ${fmt(x)}${unit} \\ne ${right} = ${fmt(y)}${unit}`;
      return [
        {
          label: "Opposite sides",
          tex: `${matched("AB", "CD", dist(A, B), dist(Cc, D))},\\quad ${matched("BC", "DA", dist(B, Cc), dist(D, A))}`,
          tone: "good",
        },
        {
          label: "Opposite angles",
          tex: matched("\\angle A", "\\angle C", angleA, angleC, "^\\circ"),
          tone: "good",
        },
        { tex: matched("\\angle B", "\\angle D", angleB, angleD, "^\\circ"), tone: "good" },
        {
          label: "Neighbouring angles",
          tex: `\\angle A + \\angle B = ${fmt(angleA + angleB)}^\\circ`,
          tone: "good",
        },
        {
          label: "Diagonals cut at E",
          tex: `${matched("AE", "EC", dist(A, E), dist(E, Cc))},\\quad ${matched("BE", "ED", dist(B, E), dist(E, D))}`,
          tone: "good",
        },
      ];
    },
  };
});
