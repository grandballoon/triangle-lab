// Viviani's theorem: from any point inside an equilateral triangle, the three
// perpendicular distances to the sides add up to the altitude. Joining the
// point to the vertices cuts the triangle into three triangles on bases of
// length s, and comparing areas gives d₁ + d₂ + d₃ = h. With h = s√3/2 from
// the 30-60-90 half, the area is s²√3/4.

import { C, tint } from "../draw.ts";
import { centroid, closestOnSegment, cross, dist, fmt, lerp, mid, project, sub, triangleArea, vec, type Vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const BASE_Y = -3.3;
const CENTER_X = -1.6;
const STACK_X = 5;
const ALTITUDE_X = 6.2;
const HALF_ROOT3 = Math.sqrt(3) / 2;
// How far the point is kept from the sides, so no distance shrinks to nothing.
const INSET = 0.35;

const TO_AB = C.gold;
const TO_BC = C.blue;
const TO_CA = C.pink;

export default lesson((s) => {
  const side = s.slider({ label: "s =", at: vec(-7.6, -4.3), width: 3.4, min: 5, max: 8, value: 7, step: 0.5, format: (v) => fmt(v) });

  /** Vertices A, B, C counter-clockwise, with AB as the base. */
  function triangle(): [Vec, Vec, Vec] {
    const half = side.value / 2;
    return [vec(CENTER_X - half, BASE_Y), vec(CENTER_X + half, BASE_Y), vec(CENTER_X, BASE_Y + side.value * HALF_ROOT3)];
  }

  const P = s.point(-0.6, -1.2, {
    label: "P",
    constrain: (p) => {
      const corners = triangle();
      const g = centroid(corners);
      const inradius = side.value * HALF_ROOT3 / 3;
      const [a, b, c] = corners.map((v) => lerp(g, v, (inradius - INSET) / inradius));
      const inside = cross(sub(b, a), sub(p, a)) >= 0 && cross(sub(c, b), sub(p, b)) >= 0 && cross(sub(a, c), sub(p, c)) >= 0;
      if (inside) return p;
      return [closestOnSegment(p, a, b), closestOnSegment(p, b, c), closestOnSegment(p, c, a)].reduce((best, q) =>
        dist(q, p) < dist(best, p) ? q : best,
      );
    },
  });

  function figure() {
    P.set(P); // the triangle may have shrunk around the point
    const [A, B, K] = triangle();
    const feet = [project(P, A, B), project(P, B, K), project(P, K, A)];
    return { A, B, K, feet, d: feet.map((foot) => dist(P, foot)), h: side.value * HALF_ROOT3 };
  }

  return {
    steps: [
      {
        title: "Three distances",
        text: "Drag $P$ anywhere inside the equilateral triangle. Its perpendicular distances to the three sides are stacked end to end on the right, beside the altitude. Each one changes. Does the stack?",
      },
      {
        title: "Cut into three triangles",
        text: "Join $P$ to the three vertices. The big triangle splits into three smaller ones. Each has a side of the big triangle, of length $s$, as its base, and one of the distances as its height.",
      },
      {
        title: "Compare areas",
        text: "The three pieces fill the whole triangle, whose area is $\\tfrac12 s h$ for altitude $h$. So $\\tfrac12 s d_1 + \\tfrac12 s d_2 + \\tfrac12 s d_3 = \\tfrac12 s h$.",
      },
      {
        title: "Cancel the common factor",
        text: "Every term carries the same $\\tfrac12 s$, because all three sides are equal. Divide it out: $d_1 + d_2 + d_3 = h$, wherever $P$ is.",
      },
      {
        title: "The altitude and the area",
        text: "The altitude cuts the triangle into two 30-60-90 triangles with hypotenuse $s$ and short leg $\\tfrac{s}{2}$, so $h = \\tfrac{\\sqrt3}{2}s$. The area is $\\tfrac12 s h = \\tfrac{\\sqrt3}{4}s^2$.",
      },
    ],

    draw(g, f) {
      const { A, B, K, feet, d, h } = figure();
      const colors = [TO_AB, TO_BC, TO_CA];
      const sides: [Vec, Vec][] = [[A, B], [B, K], [K, A]];

      g.polygon([A, B, K], { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(1) > 0) {
        const a = f.at(1);
        sides.forEach(([u, v], i) => g.polygon([P, u, v], { fill: tint(colors[i], 0.16), stroke: null, alpha: a }));
        for (const v of [A, B, K]) g.segment(P, v, { color: C.ink, width: 2, dash: [5, 5], alpha: a });
      }
      if (f.at(2) > 0) {
        sides.forEach(([u, v], i) => g.along(u, v, "s", { color: colors[i], offset: -15, alpha: f.at(2) }));
      }
      if (f.at(4) > 0) {
        const a = f.at(4);
        const foot = mid(A, B);
        g.segment(K, foot, { color: g.accent, width: 2.5, dash: [8, 6], alpha: a });
        g.angle(K, foot, B, { color: g.accent, r: 15, width: 2, alpha: a });
        g.along(foot, K, "h", { color: g.accent, offset: 14, alpha: a });
        g.along(A, foot, "s/2", { color: g.accent, offset: 15, alpha: a });
        g.angle(B, A, K, { color: g.accent, r: 30, label: "60°", alpha: a });
      }

      feet.forEach((foot, i) => {
        const [u] = sides[i];
        g.segment(P, foot, { color: colors[i], width: 3.5 });
        g.angle(P, foot, u, { color: colors[i], r: 13, width: 2 });
        g.along(P, foot, `d${"₁₂₃"[i]}`, { color: colors[i], offset: 14 });
      });

      // The three distances stood end to end, beside the altitude.
      const top = BASE_Y + h;
      g.segment(vec(CENTER_X, top), vec(ALTITUDE_X + 0.5, top), { color: C.faint, width: 1.5, dash: [4, 6] });
      g.segment(vec(STACK_X - 0.5, BASE_Y), vec(ALTITUDE_X + 0.5, BASE_Y), { color: C.dim, width: 2 });
      let y = BASE_Y;
      d.forEach((length, i) => {
        g.segment(vec(STACK_X, y), vec(STACK_X, y + length), { color: colors[i], width: 9 });
        g.label(vec(STACK_X, y + length / 2), `d${"₁₂₃"[i]}`, { color: colors[i], dx: -22, size: 14 });
        y += length;
      });
      g.segment(vec(ALTITUDE_X, BASE_Y), vec(ALTITUDE_X, top), { color: g.accent, width: 9 });
      g.label(vec(ALTITUDE_X, BASE_Y + h / 2), "h", { color: g.accent, dx: 20, size: 14 });

      g.label(A, "A", { dx: -13, dy: -11 });
      g.label(B, "B", { dx: 13, dy: -11 });
      g.label(K, "C", { dy: 16 });
    },

    readout() {
      const { A, B, K, d, h } = figure();
      const sum = d[0] + d[1] + d[2];
      const pieces = triangleArea(P, A, B) + triangleArea(P, B, K) + triangleArea(P, K, A);
      const sv = side.value;
      return [
        { label: "The three distances", tex: `${fmt(d[0], 2)} + ${fmt(d[1], 2)} + ${fmt(d[2], 2)} = ${fmt(sum, 2)}` },
        { label: "The altitude", tex: `h = \\tfrac{\\sqrt3}{2}s = \\tfrac{\\sqrt3}{2}(${fmt(sv)}) = ${fmt(h, 2)}`, tone: "good" },
        { label: "Area, as three pieces", tex: `\\tfrac12 s(d_1 + d_2 + d_3) = ${fmt(pieces, 2)}` },
        { label: "Area, from the side", tex: `\\tfrac{\\sqrt3}{4}s^2 = \\tfrac{\\sqrt3}{4}(${fmt(sv)})^2 = ${fmt((Math.sqrt(3) / 4) * sv * sv, 2)}`, tone: "good" },
      ];
    },
  };
});
