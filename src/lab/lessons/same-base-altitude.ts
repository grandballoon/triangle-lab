// Area is half of base times altitude, so triangles with one of the two in
// common have areas in the ratio of the other. A point sliding along the base
// splits a triangle in the ratio of the pieces; an apex sliding along a
// parallel to the base keeps the area fixed; raising the parallel scales it.

import { C, tint } from "../draw.ts";
import { centroid, clamp, dist, fmt, triangleArea, vec } from "../geo.ts";
import { agree } from "../kit/areas.ts";
import { lesson, type Readout } from "../scene.ts";

const BASE_Y = -2.6;
const B = vec(-5, BASE_Y);
const K = vec(5, BASE_Y); // the corner labelled C

// A fixed triangle on the same base, to compare altitudes against.
const REFERENCE_HEIGHT = 2.5;
const P = vec(-3.4, BASE_Y + REFERENCE_HEIGHT);

const LEFT = C.blue;
const RIGHT = C.pink;
const HEIGHT = C.gold;
const REFERENCE = C.violet;

export default lesson((s) => {
  const altitude = s.slider({ label: "h =", at: { x: -7.6, y: -4.3 }, width: 4, min: 1.5, max: 6.4, value: 5, step: 0.1 });
  const D = s.point(-1, BASE_Y, {
    label: "D",
    constrain: (p) => vec(clamp(p.x, B.x + 1, K.x - 1), BASE_Y),
  });
  // A rides the line parallel to the base at the slider's height.
  const A = s.point(1.6, BASE_Y + altitude.value, {
    label: "A",
    constrain: (p) => vec(clamp(p.x, -6.5, 6.5), BASE_Y + altitude.value),
  });

  /** A, put back on its line after the slider has moved the line. */
  const apex = () => {
    A.set(A);
    return A;
  };

  return {
    steps: [
      {
        title: "Split it, slide it",
        text: "Drag $D$ along the base to split the triangle, slide $A$ along the dashed line parallel to the base, and change $h$ to lift that line. Watch which moves change the areas.",
      },
      {
        title: "Same altitude",
        text: "Triangles $ABD$ and $ADC$ share the altitude $h$ from $A$. Their areas are $\\tfrac12 \\cdot BD \\cdot h$ and $\\tfrac12 \\cdot DC \\cdot h$, so the areas are in the ratio $BD : DC$ of their bases.",
      },
      {
        title: "Same base, same altitude",
        text: "Slide $A$ along its line. Every point of a line parallel to $BC$ is the same distance $h$ from it, so $[ABC] = \\tfrac12 \\cdot BC \\cdot h$ never changes, however lopsided the triangle becomes.",
      },
      {
        title: "Same base",
        text: "Triangle $PBC$ stands on the same base with altitude $h_0$. With the base in common the areas are in the ratio of the altitudes: $[ABC] : [PBC] = h : h_0$. Change $h$ and check.",
      },
    ],

    draw(g, f) {
      const a = apex();
      const foot = vec(a.x, BASE_Y);

      g.polygon([a, B, D], { fill: tint(LEFT, 0.25), stroke: null });
      g.polygon([a, D, K], { fill: tint(RIGHT, 0.25), stroke: null });
      g.polygon([a, B, K], {});
      g.segment(a, D, { width: 2.5 });
      g.segment(B, D, { color: LEFT, width: 4 });
      g.segment(D, K, { color: RIGHT, width: 4 });
      g.along(B, D, `BD = ${fmt(dist(B, D))}`, { color: LEFT, offset: -16 });
      g.along(D, K, `DC = ${fmt(dist(D, K))}`, { color: RIGHT, offset: -16 });
      g.label(centroid([a, B, D]), fmt(triangleArea(a, B, D)), { color: LEFT, bold: true });
      g.label(centroid([a, D, K]), fmt(triangleArea(a, D, K)), { color: RIGHT, bold: true });
      g.label(B, "B", { dx: -16, dy: -4, bold: true });
      g.label(K, "C", { dx: 16, dy: -4, bold: true });

      // The line A slides along, parallel to the base.
      const rail = { color: f.step === 2 ? g.accent : C.dim, width: 2, dash: [8, 6] };
      g.line(a, vec(a.x + 1, a.y), rail);
      g.chevrons(vec(5.6, a.y), vec(7, a.y), 1, { color: rail.color });
      g.chevrons(vec(5.6, BASE_Y), vec(7, BASE_Y), 1, { color: rail.color });
      g.segment(K, vec(7.6, BASE_Y), { color: C.dim, width: 2, dash: [8, 6] });
      g.segment(vec(-7.6, BASE_Y), B, { color: C.dim, width: 2, dash: [8, 6] });

      if (f.at(1) > 0) {
        g.segment(a, foot, { color: HEIGHT, width: 2.5, dash: [6, 5], alpha: f.at(1) });
        g.angle(a, foot, vec(foot.x + 1, BASE_Y), { color: HEIGHT, r: 14, width: 2, alpha: f.at(1) });
        g.label(vec(a.x, BASE_Y + altitude.value * 0.62), `h = ${fmt(altitude.value)}`, {
          color: HEIGHT,
          size: 14,
          align: "left",
          dx: 8,
          alpha: f.at(1),
        });
      }
      if (f.at(3) > 0) {
        const pFoot = vec(P.x, BASE_Y);
        g.polygon([P, B, K], { color: REFERENCE, width: 2, dash: [3, 6], alpha: f.at(3) });
        g.segment(P, pFoot, { color: REFERENCE, width: 2, dash: [6, 5], alpha: f.at(3) });
        g.point(P, { color: REFERENCE, alpha: f.at(3) });
        g.label(P, "P", { color: REFERENCE, dx: -14, dy: 12, bold: true, alpha: f.at(3) });
        g.label(vec(P.x, BASE_Y + REFERENCE_HEIGHT / 2), `h₀ = ${fmt(REFERENCE_HEIGHT)}`, {
          color: REFERENCE,
          size: 14,
          align: "right",
          dx: -8,
          alpha: f.at(3),
        });
      }
    },

    readout(f) {
      const a = apex();
      const h = altitude.value;
      const bd = dist(B, D);
      const dc = dist(D, K);
      const left = triangleArea(a, B, D);
      const right = triangleArea(a, D, K);
      const whole = triangleArea(a, B, K);
      const split = agree(left / right, bd / dc) ? "good" : "warn";
      const rows: Readout[] = [
        { label: "Pieces of the base", tex: `BD = ${fmt(bd)},\\quad DC = ${fmt(dc)}` },
        { label: "Areas on them", tex: `[ABD] = ${fmt(left, 2)},\\quad [ADC] = ${fmt(right, 2)}` },
        { label: "Ratio of areas", tex: `\\frac{[ABD]}{[ADC]} = ${fmt(left / right, 3)}`, tone: split },
        { label: "Ratio of bases", tex: `\\frac{BD}{DC} = ${fmt(bd / dc, 3)}`, tone: split },
        {
          label: "Whole triangle",
          tex: `[ABC] = \\tfrac12 (${fmt(dist(B, K))})(${fmt(h)}) = ${fmt(whole, 2)}`,
        },
      ];
      if (f.step < 3) return rows;
      const reference = triangleArea(P, B, K);
      return [
        ...rows,
        {
          label: "Against triangle PBC",
          tex: `\\frac{[ABC]}{[PBC]} = ${fmt(whole / reference, 3)},\\quad \\frac{h}{h_0} = ${fmt(h / REFERENCE_HEIGHT, 3)}`,
          tone: agree(whole / reference, h / REFERENCE_HEIGHT) ? "good" : "warn",
        },
      ];
    },
  };
});
