// Area = r·s, inradius times semiperimeter. Joining the incentre to the three
// vertices cuts the triangle into three triangles whose bases are the sides
// a, b, c and whose heights are all r. Read backwards the formula finds an
// inradius: r = Area / s, e.g. r = 3 for the 8-15-17 right triangle.

import { C, tint } from "../draw.ts";
import { dist, distToLine, fmt, inBox, incenter, lerp, project, triangleArea, vec } from "../geo.ts";
import { labelAway, ratio } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

// Lengths are reported in units of half a stage unit, so that an 8-15-17
// triangle fits on the stage.
const PER_STAGE_UNIT = 2;

const ON_A = C.gold; // the piece standing on side a = BC
const ON_B = C.blue; // … on side b = CA
const ON_C = C.pink; // … on side c = AB

export default lesson((s) => {
  // A above, B lower right, C lower left: the boxes are disjoint and A's lies
  // above the others, so the triangle keeps its orientation and never flattens.
  const A = s.point(-1.5, 3.4, { label: "A", constrain: inBox(-6, 6, 0.8, 4.2) });
  const B = s.point(4.5, -2.6, { label: "B", constrain: inBox(1, 7, -4, -1.4) });
  const P = s.point(-5, -2.2, { label: "C", constrain: inBox(-7, -1, -4, -1.4) });
  s.button("8-15-17 triangle", () => {
    P.set(vec(-3.75, -2.2));
    B.set(vec(3.75, -2.2));
    A.set(vec(-3.75, 1.8));
  });

  const measure = () => {
    const I = incenter(A, B, P);
    const a = dist(B, P) * PER_STAGE_UNIT;
    const b = dist(P, A) * PER_STAGE_UNIT;
    const c = dist(A, B) * PER_STAGE_UNIT;
    return {
      I, a, b, c,
      s: (a + b + c) / 2,
      r: distToLine(I, B, P) * PER_STAGE_UNIT,
      area: triangleArea(A, B, P) * PER_STAGE_UNIT ** 2,
    };
  };

  return {
    steps: [
      {
        title: "The circle inside",
        text: "Drag the corners. The inscribed circle touches all three sides; its centre $I$ is the incentre and its radius is $r$. With $s$ half the perimeter, compare $rs$ with the area in the panel.",
      },
      {
        title: "Radii to the sides",
        text: "Draw the radius to each point where the circle touches a side. A radius meets its tangent at a right angle, so $I$ stands at height exactly $r$ above every side.",
      },
      {
        title: "Three triangles",
        text: "Join $I$ to the corners. The triangle falls into three pieces whose bases are the sides $a$, $b$, $c$ — and, by the previous step, each piece has height $r$.",
      },
      {
        title: "Add them up",
        text: "The area is $\\frac12 ra + \\frac12 rb + \\frac12 rc = r \\cdot \\frac{a + b + c}{2} = rs$.",
      },
      {
        title: "Run it backwards",
        text: "Sides and area give the inradius: $r = \\text{Area}/s$. Press “8-15-17 triangle”: $8^2 + 15^2 = 17^2$, so it is right-angled with area $\\frac12 \\cdot 8 \\cdot 15 = 60$. Then $s = 20$ and $r = 3$.",
      },
    ],

    draw(g, f) {
      const { I, r } = measure();
      const pieces = [
        { p: B, q: P, name: "a", color: ON_A },
        { p: P, q: A, name: "b", color: ON_B },
        { p: A, q: B, name: "c", color: ON_C },
      ];

      if (f.at(2) > 0) {
        for (const { p, q, color } of pieces) g.polygon([p, q, I], { fill: tint(color, 0.2), stroke: null, alpha: f.at(2) });
        for (const v of [A, B, P]) g.segment(I, v, { color: C.ink, width: 2, alpha: f.at(2) });
      }
      g.circle(I, r / PER_STAGE_UNIT, { color: g.accent, width: 2.5, fill: f.step < 2 ? tint(g.accent, 0.1) : undefined });
      for (const { p, q, name, color } of pieces) {
        g.segment(p, q, { color, width: 4 });
        labelAway(g, lerp(p, q, 0.5), name, I, { color, px: 17, bold: false, size: 16 });
      }
      if (f.at(1) > 0) {
        for (const { p, q, color } of pieces) {
          const touch = project(I, p, q);
          g.segment(I, touch, { color, width: 2.5, dash: [6, 4], alpha: f.at(1) });
          g.angle(I, touch, p, { color, r: 11, width: 2, alpha: f.at(1) });
          g.along(I, touch, "r", { color, offset: 11, size: 14, alpha: f.at(1) });
        }
      }
      g.point(I, { color: g.accent });
      g.label(I, "I", { color: g.accent, dy: 16, bold: true });
    },

    readout(f) {
      const { a, b, c, s: semi, r, area } = measure();
      const rows: Readout[] = [
        { label: "Semiperimeter", tex: `s = \\tfrac12(${fmt(a)} + ${fmt(b)} + ${fmt(c)}) = ${fmt(semi, 2)}` },
        { label: "Inradius, measured", tex: `r = ${fmt(r, 2)}` },
      ];
      if (f.step >= 2) {
        rows.push({
          label: "Pieces $\\frac12 ra + \\frac12 rb + \\frac12 rc$",
          tex: `${fmt((r * a) / 2)} + ${fmt((r * b) / 2)} + ${fmt((r * c) / 2)} = ${fmt((r * (a + b + c)) / 2)}`,
          tone: "good",
        });
      }
      rows.push({
        label: "Inradius times semiperimeter",
        tex: `rs = (${fmt(r, 2)})(${fmt(semi, 2)}) = ${fmt(r * semi)},\\quad [ABC] = ${fmt(area)}`,
        tone: "good",
      });
      if (f.step >= 4) {
        rows.push({
          label: "Backwards",
          tex: `r = \\frac{[ABC]}{s} = \\frac{${fmt(area)}}{${fmt(semi, 2)}} = ${fmt(ratio(area, semi), 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
