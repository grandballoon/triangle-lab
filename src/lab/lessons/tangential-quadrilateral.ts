// A quadrilateral with an inscribed circle has equal sums of opposite sides:
// AB + CD = BC + DA. The quadrilateral is built from four draggable points of
// contact — its sides are the tangents there — so it always has an incircle.
// Each corner sends two equal tangents to the circle, and each pair of
// opposite sides uses one tangent from every corner.

import { C } from "../draw.ts";
import { dist, fmt, polar, toRad, vec, wrapAngle, type Vec } from "../geo.ts";
import { bearing, nameOutside, ring } from "../kit/circle-angles.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0.1);
const R = 2.1;
const MIN_GAP = 0.5;
// Neighbouring points of contact under 120° apart keep every corner on the stage.
const MAX_GAP = toRad(120);

// One colour per corner: its two tangent lengths w, x, y, z.
const CORNERS = [
  { name: "A", length: "w", color: C.gold },
  { name: "B", length: "x", color: C.blue },
  { name: "C", length: "y", color: C.pink },
  { name: "D", length: "z", color: C.green },
] as const;

export default lesson((s) => {
  // Points of contact on sides AB, BC, CD, DA, counter-clockwise.
  const touch = ring(s, O, R, [toRad(250), toRad(340), toRad(80), toRad(170)], MIN_GAP, MAX_GAP);

  /** Corner i (A, B, C, D) lies where the tangents at contacts i − 1 and i meet. */
  const corners = (): Vec[] =>
    touch.map((next, i) => {
      const from = bearing(O, touch[(i + 3) % 4]);
      const gap = wrapAngle(bearing(O, next) - from);
      return polar(O, R / Math.cos(gap / 2), from + gap / 2);
    });

  const sides = (v: readonly Vec[]) => ({
    ab: dist(v[0], v[1]),
    bc: dist(v[1], v[2]),
    cd: dist(v[2], v[3]),
    da: dist(v[3], v[0]),
  });

  return {
    steps: [
      {
        title: "Four sides around a circle",
        text: "Drag the four points where the sides touch the circle. The quadrilateral changes shape but always hugs the circle. Compare $AB + CD$ with $BC + DA$.",
      },
      {
        title: "Equal tangents at each corner",
        text: "Two tangents from one point to a circle are equal. So each corner owns a matching pair of pieces: $w$ at $A$, $x$ at $B$, $y$ at $C$, $z$ at $D$.",
      },
      {
        title: "One pair of opposite sides",
        text: "Each side is made of two pieces from its two ends. $AB = w + x$ and $CD = y + z$, so $AB + CD = w + x + y + z$.",
      },
      {
        title: "The other pair",
        text: "$BC = x + y$ and $DA = z + w$, so $BC + DA$ is the same four pieces again. Hence $AB + CD = BC + DA$ for every quadrilateral with an inscribed circle.",
      },
    ],

    draw(g, f) {
      const v = corners();

      g.polygon(v, { fill: "rgba(255, 255, 255, 0.05)", stroke: null });
      g.circle(O, R, { color: g.accent, width: 2.5 });
      CORNERS.forEach((corner, i) => {
        // The corner's two tangents run to the contacts before and after it.
        for (const [contact, outside] of [[touch[(i + 3) % 4], 1], [touch[i], -1]] as const) {
          g.segment(v[i], contact, { color: corner.color, width: 5 });
          if (f.at(1) > 0) {
            g.ticks(v[i], contact, i + 1, { color: C.ink, alpha: f.at(1) });
            g.along(v[i], contact, corner.length, { color: corner.color, offset: outside * 16, alpha: f.at(1) });
          }
        }
        g.point(v[i], { color: corner.color });
        nameOutside(g, O, v[i], corner.name, { push: 18 });
      });

      const sum = (i: number, text: string, alpha: number): void => {
        if (alpha > 0) g.along(v[i], v[(i + 1) % 4], text, { offset: -40, bold: true, alpha });
      };
      sum(0, "w + x", f.at(2));
      sum(2, "y + z", f.at(2));
      sum(1, "x + y", f.at(3));
      sum(3, "z + w", f.at(3));
    },

    readout() {
      const v = corners();
      const { ab, bc, cd, da } = sides(v);
      const lengths = v.map((corner, i) => dist(corner, touch[i]));
      return [
        {
          label: "One pair of opposite sides",
          tex: `AB + CD = ${fmt(ab, 2)} + ${fmt(cd, 2)} = ${fmt(ab + cd, 2)}`,
          tone: "good",
        },
        { label: "The other pair", tex: `BC + DA = ${fmt(bc, 2)} + ${fmt(da, 2)} = ${fmt(bc + da, 2)}`, tone: "good" },
        { label: "Tangent lengths", tex: `w, x, y, z = ${lengths.map((l) => fmt(l)).join(",\\ ")}` },
        {
          label: "All four together",
          tex: `w + x + y + z = ${fmt(lengths.reduce((a, b) => a + b, 0), 2)}`,
          tone: "good",
        },
      ];
    },
  };
});
