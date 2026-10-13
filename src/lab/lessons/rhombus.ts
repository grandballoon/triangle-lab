// A rhombus is four equal rods hinged at the corners. Equal sides alone force
// a parallelogram (SSS across one diagonal), whose diagonals then turn out to
// be perpendicular bisectors of each other (SSS again). The four congruent
// right triangles they cut give the area ½·d₁·d₂ and tie the side to the
// half-diagonals by Pythagoras.

import { C, tint } from "../draw.ts";
import { add, angleAt, angleOf, clamp, dist, fmt, mid, polar, polygonArea, sub, toDeg, toRad, vec, type Vec } from "../geo.ts";
import { GLASS, same } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const A = vec(-4.3, 0);
const MIN_SIDE = 2.6;
const MAX_SIDE = 4.2;
// B swings below the horizontal through A and D above it, each kept off the
// horizontal and the vertical so the rhombus can neither fold flat nor leave the stage.
const NEAR = toRad(12);
const FAR = toRad(70);

const D1 = C.gold;
const D2 = C.blue;

export default lesson((s) => {
  const B = s.point(A.x + 3.4 * Math.cos(toRad(-28)), 3.4 * Math.sin(toRad(-28)), { label: "B" });
  const D = s.point(A.x + 3.4 * Math.cos(toRad(46)), 3.4 * Math.sin(toRad(46)), { label: "D" });

  const side = (): number => dist(A, B);
  const tilt = (p: Vec, from: number, to: number): number => clamp(angleOf(sub(p, A)), from, to);
  // Dragging B sets the common side length; D keeps its direction and follows.
  B.constrain = (p) => {
    const r = clamp(dist(p, A), MIN_SIDE, MAX_SIDE);
    const d = polar(A, r, tilt(D, NEAR, FAR));
    D.x = d.x;
    D.y = d.y;
    return polar(A, r, tilt(p, -FAR, -NEAR));
  };
  D.constrain = (p) => polar(A, side(), tilt(p, NEAR, FAR));

  const measure = () => {
    const Cc = sub(add(B, D), A);
    const E = mid(A, Cc);
    return { Cc, E, s: side(), d1: dist(A, Cc), d2: dist(B, D) };
  };

  return {
    steps: [
      {
        title: "Four equal rods",
        text: "A rhombus has four equal sides. Swing $B$ and $D$ about the hinge at $A$ (pull $B$ outward to lengthen every side) and watch the diagonals: how do they cross, and where?",
      },
      {
        title: "Equal sides force parallels",
        text: "Draw $BD$. Triangles $ABD$ and $CDB$ have three pairs of equal sides, so they are congruent (SSS). Then $\\angle ABD = \\angle CDB$ and $\\angle ADB = \\angle CBD$: alternate angles, so $AB \\parallel DC$ and $AD \\parallel BC$.",
      },
      {
        title: "So the diagonals bisect",
        text: "A rhombus is therefore a parallelogram, and a parallelogram's diagonals bisect each other. With $E$ the crossing point: $AE = EC$ and $BE = ED$.",
      },
      {
        title: "And they are perpendicular",
        text: "Triangles $ABE$ and $CBE$ have $AB = CB$, $AE = CE$ and share $BE$: congruent by SSS. So $\\angle AEB = \\angle CEB$, and since the two make a straight line, each is $90^\\circ$.",
      },
      {
        title: "Area and side",
        text: "That leaves four congruent right triangles with legs $\\tfrac12 d_1$ and $\\tfrac12 d_2$, so the area is $4 \\cdot \\tfrac12 \\cdot \\tfrac12 d_1 \\cdot \\tfrac12 d_2 = \\tfrac12 d_1 d_2$. Each hypotenuse is a side: $s^2 = (\\tfrac12 d_1)^2 + (\\tfrac12 d_2)^2$.",
      },
    ],

    draw(g, f) {
      const { Cc, E } = measure();
      const sides: [Vec, Vec][] = [[A, B], [B, Cc], [Cc, D], [D, A]];

      g.polygon([A, B, Cc, D], { fill: GLASS, stroke: null });

      if (f.at(1) > 0) {
        const a = f.at(1) * (1 - f.at(3));
        g.polygon([A, B, D], { fill: tint(C.pink, 0.16), stroke: null, alpha: a });
        g.polygon([Cc, D, B], { fill: tint(C.violet, 0.16), stroke: null, alpha: a });
        g.angle(A, B, D, { color: C.pink, fill: true, r: 30, alpha: a });
        g.angle(Cc, D, B, { color: C.pink, fill: true, r: 30, alpha: a });
        g.angle(A, D, B, { color: C.green, fill: true, r: 30, arcs: 2, alpha: a });
        g.angle(Cc, B, D, { color: C.green, fill: true, r: 30, arcs: 2, alpha: a });
        g.chevrons(A, B, 1, { color: C.pink, alpha: a });
        g.chevrons(D, Cc, 1, { color: C.pink, alpha: a });
        g.chevrons(A, D, 2, { color: C.green, alpha: a });
        g.chevrons(B, Cc, 2, { color: C.green, alpha: a });
      }
      if (f.at(3) > 0) {
        const a = f.at(3) * (1 - f.at(4));
        g.polygon([A, B, E], { fill: tint(C.pink, 0.22), stroke: null, alpha: a });
        g.polygon([Cc, B, E], { fill: tint(C.violet, 0.22), stroke: null, alpha: a });
      }
      if (f.at(4) > 0) {
        const a = f.at(4);
        [A, B, Cc, D].forEach((p, i, all) => {
          g.polygon([p, all[(i + 1) % 4], E], {
            fill: tint(i % 2 ? C.violet : C.pink, 0.2),
            stroke: null,
            alpha: a,
          });
        });
        g.along(A, E, "½d₁", { color: D1, alpha: a, offset: -15 });
        g.along(E, B, "½d₂", { color: D2, alpha: a, offset: -18 });
        g.along(A, B, "s", { color: g.accent, alpha: a, offset: -16 });
      }

      const bold = (n: number): number => (f.step >= n ? 3.5 : 2);
      g.segment(A, Cc, { color: D1, width: bold(2), dash: f.step >= 2 ? [] : [7, 6] });
      g.segment(B, D, { color: D2, width: bold(1), dash: f.step >= 1 ? [] : [7, 6] });
      g.angle(B, E, Cc, { r: 16, width: 2 });
      if (f.at(2) > 0) {
        const a = f.at(2);
        g.ticks(A, E, 2, { color: D1, alpha: a });
        g.ticks(E, Cc, 2, { color: D1, alpha: a });
        g.ticks(B, E, 3, { color: D2, alpha: a });
        g.ticks(E, D, 3, { color: D2, alpha: a });
        g.point(E, { alpha: a });
        g.label(E, "E", { dx: -14, dy: 16, alpha: a });
      }

      for (const [p, q] of sides) {
        g.segment(p, q, { color: g.accent, width: 4 });
        g.ticks(p, q, 1, { color: g.accent });
      }
      g.point(A, { color: g.accent });
      g.label(A, "A", { color: g.accent, dx: -16, bold: true });
      g.point(Cc, { color: g.accent });
      g.label(Cc, "C", { color: g.accent, dx: 16, bold: true });
    },

    readout() {
      const { Cc, E, s: sideLength, d1, d2 } = measure();
      const crossing = toDeg(angleAt(A, E, B));
      const fromHalves = Math.hypot(d1 / 2, d2 / 2);
      return [
        { label: "Side", tex: `s = ${fmt(sideLength, 2)}` },
        { label: "Diagonals", tex: `d_1 = AC = ${fmt(d1, 2)},\\quad d_2 = BD = ${fmt(d2, 2)}` },
        {
          label: "Where they cross",
          tex: `\\angle AEB = ${fmt(crossing)}^\\circ`,
          tone: same(crossing, 90) ? "good" : "warn",
        },
        {
          label: "Half the product",
          tex: `\\tfrac12 d_1 d_2 = \\tfrac12 \\cdot ${fmt(d1, 2)} \\cdot ${fmt(d2, 2)} = ${fmt((d1 * d2) / 2)}`,
        },
        { label: "Area, measured", tex: `[ABCD] = ${fmt(polygonArea([A, B, Cc, D]))}`, tone: "good" },
        {
          label: "Side from the half-diagonals",
          tex: `\\sqrt{${fmt(d1 / 2, 2)}^2 + ${fmt(d2 / 2, 2)}^2} = ${fmt(fromHalves, 2)}`,
          tone: same(fromHalves, sideLength) ? "good" : "warn",
        },
      ];
    },
  };
});
