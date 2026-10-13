// The lune on an isosceles right triangle: the crescent between the semicircle
// on the hypotenuse and the quarter circle centred at the right angle has
// exactly the triangle's area. Triangle plus semicircle minus quarter circle
// leaves the lune, and the semicircle and quarter circle are equal.

import { C, tint } from "../draw.ts";
import { clamp, fmt, vec } from "../geo.ts";
import { agree, outline, tracedArea, type Arc } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

const HYPOTENUSE_Y = 0.3;
const M = vec(0, HYPOTENUSE_Y); // midpoint of AB, centre of the semicircle

const TRIANGLE = C.blue;
const SEMICIRCLE = C.gold;
const QUARTER = C.pink;
const ERASED = "rgba(6, 10, 16, 0.72)";

export default lesson((s) => {
  // B sets the size; A mirrors it, and C hangs below so that ∠C is a right angle.
  const B = s.point(2.9, HYPOTENUSE_Y, { label: "B", constrain: (p) => vec(clamp(p.x, 1.6, 3.6), HYPOTENUSE_Y) });

  const figure = () => {
    const half = B.x; // AB / 2, the semicircle's radius
    const leg = half * Math.SQRT2; // CA = CB, the quarter circle's radius
    const A = vec(-half, HYPOTENUSE_Y);
    const K = vec(0, HYPOTENUSE_Y - half); // the right-angle corner C
    // Out along the semicircle from B to A, back along the quarter circle.
    const lune: Arc[] = [[M, half, 0, Math.PI], [K, leg, (3 * Math.PI) / 4, Math.PI / 4]];
    return { half, leg, A, K, lune };
  };

  return {
    steps: [
      {
        title: "A crescent and a triangle",
        text: "Drag $B$ to resize. The crescent is bounded by a semicircle on $AB$ and by a quarter circle centred at the right angle $C$. Compare its area with the triangle's.",
      },
      {
        title: "Three simple pieces",
        text: "With legs $a$: the triangle $T$ has area $\\tfrac12 a^2$; the quarter circle $Q$, centre $C$ and radius $a$, has $\\tfrac14 \\pi a^2$; the semicircle $S$ on $AB = a\\sqrt2$ has radius $\\frac{a}{\\sqrt2}$.",
      },
      {
        title: "Add",
        text: "Put the triangle and the semicircle together. They meet only along $AB$, so the combined shape — two legs and the big arc — has area $T + S$.",
      },
      {
        title: "Subtract",
        text: "The quarter circle lies entirely inside that shape, and removing it leaves exactly the crescent. So the crescent's area is $T + S - Q$.",
      },
      {
        title: "The curves cancel",
        text: "$S = \\tfrac12 \\pi \\left(\\frac{a}{\\sqrt2}\\right)^2 = \\tfrac14 \\pi a^2 = Q$. The two round pieces cancel, leaving the crescent equal to $T = \\tfrac12 a^2$ — a curved region with no $\\pi$ in its area.",
      },
    ],

    draw(g, f) {
      const { half, leg, A, K, lune } = figure();
      const crescent = outline(lune);

      // The finished crescent shows at the start and again at the end.
      const result = 1 - f.at(1) + f.at(4);
      const pieces = f.at(2) - f.at(4);
      const removed = f.at(3) - f.at(4);

      if (pieces > 0) {
        g.polygon([A, B, K], { fill: tint(TRIANGLE, 0.35), stroke: null, alpha: pieces });
        g.sector(M, half, 0, Math.PI, { fill: tint(SEMICIRCLE, 0.35), stroke: null, alpha: pieces });
      }
      if (removed > 0) {
        g.sector(K, leg, Math.PI / 4, (3 * Math.PI) / 4, { fill: ERASED, stroke: null, alpha: removed });
      }
      if (result > 0) g.polygon(crescent, { fill: tint(g.accent, 0.45), stroke: null, alpha: result });
      if (f.at(4) > 0) g.polygon([A, B, K], { fill: tint(g.accent, 0.45), stroke: null, alpha: f.at(4) });

      const named = f.at(1);
      g.polygon([A, B, K], { color: named > 0 ? TRIANGLE : C.ink });
      g.arc(M, half, 0, Math.PI, { color: named > 0 ? SEMICIRCLE : g.accent });
      g.arc(K, leg, Math.PI / 4, (3 * Math.PI) / 4, { color: named > 0 ? QUARTER : g.accent });
      g.angle(A, K, B, { r: 16, width: 2 });

      if (named > 0) {
        g.along(K, B, `a = ${fmt(leg, 2)}`, { color: TRIANGLE, offset: -18, alpha: named });
        g.label(vec(0, HYPOTENUSE_Y - half * 0.45), "T", { color: TRIANGLE, size: 20, bold: true, alpha: named });
        g.label(vec(0, HYPOTENUSE_Y + half), "S", { color: SEMICIRCLE, size: 20, bold: true, dy: 20, alpha: named });
        g.label(vec(0, HYPOTENUSE_Y + (leg - half) / 2), "Q", { color: QUARTER, size: 20, bold: true, alpha: named });
      }

      g.point(A, { r: 4 });
      g.point(K, { r: 4 });
      g.point(M, { r: 3 });
      g.label(A, "A", { dx: -16, dy: -4, bold: true });
      g.label(K, "C", { dy: -18, bold: true });
    },

    readout() {
      const { half, leg, lune } = figure();
      const triangle = (leg * leg) / 2;
      const semicircle = (Math.PI * half * half) / 2;
      const quarter = (Math.PI * leg * leg) / 4;
      const combined = triangle + semicircle - quarter;
      const traced = tracedArea(lune);
      const tone = agree(combined, traced) && agree(traced, triangle) ? "good" : "warn";
      return [
        { label: "Leg and hypotenuse", tex: `a = ${fmt(leg, 2)},\\quad AB = a\\sqrt2 = ${fmt(2 * half, 2)}` },
        { label: "Triangle", tex: `T = \\tfrac12 a^2 = ${fmt(triangle, 2)}`, tone },
        { label: "Semicircle on AB", tex: `S = \\tfrac12 \\pi (${fmt(half, 2)})^2 = ${fmt(semicircle, 2)}` },
        { label: "Quarter circle about C", tex: `Q = \\tfrac14 \\pi (${fmt(leg, 2)})^2 = ${fmt(quarter, 2)}` },
        { label: "Add and subtract", tex: `T + S - Q = ${fmt(combined, 2)}`, tone },
        { label: "Crescent, measured by tracing its edge", tex: `${fmt(traced, 2)}`, tone },
      ];
    },
  };
});
