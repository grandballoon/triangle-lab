// The area of a parallelogram is base × height. Sliding the top side along
// its own line changes the slant but not the area; cutting the overhanging
// triangle off one end and moving it to the other makes a rectangle with the
// same base and height. The height is a side times the sine of an angle, and
// the four triangles around the crossing of the diagonals give a third formula.

import { C, tint } from "../draw.ts";
import { add, angleAt, clamp, dist, fmt, mid, toDeg, vec, type Vec } from "../geo.ts";
import { GLASS } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const A = vec(-2.5, -3.2);
const MIN_BASE = 2.5;
const MAX_BASE = 4.8;
const TOP_MIN = -0.8;
const TOP_MAX = 3.6;

const BASE = C.blue;
const HEIGHT = C.green;
const SIDE = C.gold;
const CUT = C.pink;
const THETA = C.violet;

export default lesson((s) => {
  const B = s.point(1.7, A.y, { label: "B" });
  const D = s.point(-0.4, 2.2, { label: "D" });
  // The top side may overhang the base by at most the base's own length, so a
  // single cut is always enough to square the parallelogram up.
  B.constrain = (p) => vec(clamp(p.x, A.x + Math.max(MIN_BASE, Math.abs(D.x - A.x)), A.x + MAX_BASE), A.y);
  D.constrain = (p) => {
    const b = B.x - A.x;
    return vec(clamp(p.x, A.x - b, A.x + b), clamp(p.y, TOP_MIN, TOP_MAX));
  };

  const measure = () => {
    const b = B.x - A.x;
    const Cc = vec(D.x + b, D.y);
    const E = mid(A, Cc);
    const side = dist(B, Cc);
    const angleB = angleAt(A, B, Cc);
    const d1 = dist(A, Cc);
    const d2 = dist(B, D);
    const theta = angleAt(A, E, B);
    return { b, Cc, E, side, angleB, d1, d2, theta, h: D.y - A.y };
  };

  return {
    steps: [
      {
        title: "Slide the top",
        text: "Drag $D$ sideways: the top side slides along its dashed line and the parallelogram leans, yet the area in the panel does not move. Only raising $D$, or dragging $B$ to change the base, alters it.",
      },
      {
        title: "Cut off the overhang",
        text: "Drop a perpendicular from a top corner straight down onto the base. It slices a right triangle off one end, and its length is the height $h$ of the parallelogram.",
      },
      {
        title: "Move it across",
        text: "Slide that triangle along the base by exactly the base length $b$. It fits the other end, because opposite sides are equal and parallel. The result is a $b \\times h$ rectangle, so the area is $bh$.",
      },
      {
        title: "Height from a side and an angle",
        text: "Let $a = BC$. The altitude from $C$ is a leg of a right triangle with hypotenuse $a$, whose angle at $B$ is $\\angle B$ or its supplement — the same sine either way. So $h = a\\sin B$, and the area is $ab\\sin B$.",
      },
      {
        title: "From the diagonals",
        text: "The diagonals bisect each other at $E$ and cross at angle $\\theta$. Each of the four triangles has sides $\\tfrac12 d_1$ and $\\tfrac12 d_2$ about an angle whose sine is $\\sin\\theta$: area $\\tfrac18 d_1 d_2\\sin\\theta$ each, $\\tfrac12 d_1 d_2\\sin\\theta$ in all.",
      },
    ],

    draw(g, f) {
      const { b, Cc, E } = measure();
      const leansRight = D.x >= A.x;
      const shift = (p: Vec, by: number): Vec => add(p, vec(by, 0));

      // The line the top side slides along.
      g.line(D, Cc, { color: C.faint, width: 2, dash: [8, 6] });

      g.polygon([A, B, Cc, D], { fill: tint(g.accent, 0.1), color: g.accent });
      g.segment(A, B, { color: BASE, width: 4 });
      g.along(A, B, "b", { color: BASE, offset: -16 });

      // Steps 1–2: the triangle under the overhanging side, and its trip to the other end.
      const cut = f.at(1) * (1 - f.at(3));
      if (cut > 0) {
        const corner = leansRight ? A : B;
        const top = leansRight ? D : Cc;
        const foot = vec(top.x, A.y);
        const triangle = [corner, foot, top];
        const travel = (leansRight ? b : -b) * f.at(2);
        g.segment(top, foot, { color: HEIGHT, width: 2.5, dash: [6, 5], alpha: cut });
        g.angle(top, foot, leansRight ? B : A, { color: HEIGHT, r: 14, width: 2, alpha: cut });
        g.along(foot, top, "h", { color: HEIGHT, alpha: cut, offset: leansRight ? -14 : 14 });
        if (f.at(2) > 0) {
          g.polygon(triangle, { stroke: C.dim, width: 1.5, dash: [4, 4], alpha: cut });
          g.polygon([vec(D.x, A.y), vec(Cc.x, A.y), Cc, D], {
            fill: GLASS,
            stroke: C.ink,
            width: 2.5,
            alpha: f.at(2) * cut,
          });
        }
        g.polygon(
          triangle.map((p) => shift(p, travel)),
          { fill: tint(CUT, 0.3), stroke: CUT, width: 2, alpha: cut },
        );
      }

      // Step 3: the right triangle on side BC that turns a side into the height.
      const sine = f.at(3) * (1 - f.at(4));
      if (sine > 0) {
        const foot = vec(Cc.x, A.y);
        g.polygon([B, foot, Cc], { fill: tint(SIDE, 0.16), stroke: null, alpha: sine });
        g.segment(B, foot, { color: C.dim, width: 2, dash: [6, 5], alpha: sine });
        g.segment(Cc, foot, { color: HEIGHT, width: 2.5, dash: [6, 5], alpha: sine });
        g.angle(Cc, foot, B, { color: HEIGHT, r: 14, width: 2, alpha: sine });
        g.along(foot, Cc, "h", { color: HEIGHT, alpha: sine, offset: -14 });
        g.segment(B, Cc, { color: SIDE, width: 4, alpha: sine });
        g.along(B, Cc, "a", { color: SIDE, alpha: sine, offset: leansRight ? 16 : -16 });
        g.angle(A, B, Cc, { color: SIDE, fill: true, r: 28, label: "B", alpha: sine });
      }

      if (f.at(4) > 0) {
        const a = f.at(4);
        g.polygon([A, B, E], { fill: tint(THETA, 0.22), stroke: null, alpha: a });
        g.polygon([Cc, D, E], { fill: tint(THETA, 0.22), stroke: null, alpha: a });
        g.polygon([B, Cc, E], { fill: tint(SIDE, 0.14), stroke: null, alpha: a });
        g.polygon([D, A, E], { fill: tint(SIDE, 0.14), stroke: null, alpha: a });
        g.segment(A, Cc, { color: C.ink, width: 2.5, alpha: a });
        g.segment(B, D, { color: C.ink, width: 2.5, alpha: a });
        g.ticks(A, E, 1, { alpha: a });
        g.ticks(E, Cc, 1, { alpha: a });
        g.ticks(B, E, 2, { alpha: a });
        g.ticks(E, D, 2, { alpha: a });
        g.angle(A, E, B, { color: THETA, fill: true, r: 26, label: "θ", alpha: a });
        g.point(E, { alpha: a });
        g.label(E, "E", { dy: 20, alpha: a });
      }

      g.point(A, { color: g.accent });
      g.label(A, "A", { color: g.accent, dx: -14, dy: -14, bold: true });
      g.point(Cc, { color: g.accent });
      g.label(Cc, "C", { color: g.accent, dx: 14, dy: 14, bold: true });
    },

    readout() {
      const m = measure();
      const area = m.b * m.h;
      return [
        { label: "Base and height", tex: `b = ${fmt(m.b)},\\quad h = ${fmt(m.h)}` },
        { label: "Base × height", tex: `bh = ${fmt(m.b)} \\cdot ${fmt(m.h)} = ${fmt(area)}`, tone: "good" },
        {
          label: "Two sides and their angle",
          tex: `ab\\sin B = ${fmt(m.side)} \\cdot ${fmt(m.b)} \\cdot \\sin ${fmt(toDeg(m.angleB), 0)}^\\circ = ${fmt(m.side * m.b * Math.sin(m.angleB))}`,
          tone: "good",
        },
        {
          label: "Diagonals",
          tex: `d_1 = ${fmt(m.d1)},\\quad d_2 = ${fmt(m.d2)},\\quad \\theta = ${fmt(toDeg(m.theta), 0)}^\\circ`,
        },
        {
          label: "From the diagonals",
          tex: `\\tfrac12 d_1 d_2 \\sin\\theta = ${fmt((m.d1 * m.d2 * Math.sin(m.theta)) / 2)}`,
          tone: "good",
        },
      ];
    },
  };
});
