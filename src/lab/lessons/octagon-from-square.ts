// Areas by subtraction. Warm-up: a ring is a big disc minus a small one. Then
// a regular octagon of side s is a square with four isosceles right corners
// cut off — legs s/√2, square side s(1 + √2), area 2(1 + √2)s².

import { C, tint } from "../draw.ts";
import { dist, fmt, inRing, polygonArea, TAU, vec, type Vec } from "../geo.ts";
import { agree, outline } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

const RING_CENTER = vec(-5.2, 0.5);
const OCTAGON_CENTER = vec(2.7, 0.5);

const CUT = C.red; // what is taken away
const LEG = C.gold;

const DASH = [6, 5];

export default lesson((s) => {
  // The two radii have separate ranges, so the ring can never close up.
  const inner = s.point(RING_CENTER.x + 0.8, RING_CENTER.y - 0.6, { label: "r", constrain: inRing(RING_CENTER, 0.5, 1.3) });
  const outer = s.point(RING_CENTER.x + 1.5, RING_CENTER.y + 1.5, { label: "R", constrain: inRing(RING_CENTER, 1.7, 2.5) });
  const side = s.slider({ label: "s =", at: { x: 0.7, y: -4.3 }, width: 4, min: 1, max: 2.6, value: 2, step: 0.1 });

  /** The octagon and the square it is cut from, counter-clockwise from bottom-left. */
  function octagon(): { leg: number; half: number; square: Vec[]; corners: Vec[][]; vertices: Vec[] } {
    const leg = side.value / Math.SQRT2;
    const half = side.value / 2 + leg;
    const at = (x: number, y: number): Vec => vec(OCTAGON_CENTER.x + x, OCTAGON_CENTER.y + y);
    const square = [at(-half, -half), at(half, -half), at(half, half), at(-half, half)];
    const inset = half - leg;
    const vertices = [
      at(-inset, -half), at(inset, -half), at(half, -inset), at(half, inset),
      at(inset, half), at(-inset, half), at(-half, inset), at(-half, -inset),
    ];
    // Each corner triangle: the square's corner, then the octagon vertices either side of it.
    const corners = square.map((corner, i) => [corner, vertices[(2 * i + 7) % 8], vertices[2 * i]]);
    return { leg, half, square, corners, vertices };
  }

  return {
    steps: [
      {
        title: "A ring is a difference",
        text: "No formula gives the area of a ring directly — but it is a disc of radius $R$ with a disc of radius $r$ removed. Drag the two radii and watch $\\pi R^2 - \\pi r^2$.",
      },
      {
        title: "An octagon in a square",
        text: "The same trick finds a regular octagon of side $s$. Slide $s$. Fit a square around the octagon: four of its sides lie along the square, and the square's corners stick out as four triangles.",
      },
      {
        title: "The corners",
        text: "Each interior angle of the octagon is $135^\\circ$, so each corner triangle has two $45^\\circ$ angles: an isosceles right triangle with hypotenuse $s$. Its legs are $s/\\sqrt2$.",
      },
      {
        title: "The square",
        text: "A side of the square is a leg, a side of the octagon, and another leg: $\\frac{s}{\\sqrt2} + s + \\frac{s}{\\sqrt2} = s(1 + \\sqrt2)$.",
      },
      {
        title: "Subtract",
        text: "Each corner has area $\\tfrac12 \\cdot \\frac{s}{\\sqrt2} \\cdot \\frac{s}{\\sqrt2} = \\frac{s^2}{4}$, so the four remove $s^2$. Octagon $= s^2(1+\\sqrt2)^2 - s^2 = 2(1+\\sqrt2)\\,s^2$.",
      },
    ],

    draw(g, f) {
      // The ring leads at first, then steps back for the octagon.
      const ringAlpha = 1 - 0.6 * f.at(1);
      const octagonAlpha = 0.4 + 0.6 * f.at(1);

      const r = dist(inner, RING_CENTER);
      const R = dist(outer, RING_CENTER);
      // Outer circle one way and inner circle the other: the fill leaves a hole.
      const ring = outline([[RING_CENTER, R, 0, TAU], [RING_CENTER, r, TAU, 0]], 96);
      g.polygon(ring, { fill: tint(g.accent, 0.35), stroke: null, alpha: ringAlpha });
      g.circle(RING_CENTER, R, { color: g.accent, alpha: ringAlpha });
      g.circle(RING_CENTER, r, { color: CUT, alpha: ringAlpha });
      g.segment(RING_CENTER, outer, { color: g.accent, width: 2, alpha: ringAlpha });
      g.segment(RING_CENTER, inner, { color: CUT, width: 2, alpha: ringAlpha });
      g.point(RING_CENTER, { r: 3.5, alpha: ringAlpha });
      g.label(vec(RING_CENTER.x, RING_CENTER.y - R), `ring ${fmt(Math.PI * (R * R - r * r), 2)}`, {
        color: g.accent,
        bold: true,
        dy: -20,
        alpha: ringAlpha,
      });

      const { half, square, corners, vertices } = octagon();
      if (f.at(1) > 0) {
        const strength = 0.14 + 0.2 * f.at(4);
        for (const corner of corners) {
          g.polygon(corner, { fill: tint(CUT, strength), color: CUT, width: 1.5, dash: DASH, alpha: f.at(1) });
        }
      }
      g.polygon(vertices, { fill: tint(g.accent, 0.3), color: g.accent, alpha: octagonAlpha });
      g.along(vertices[0], vertices[1], `s = ${fmt(side.value)}`, { color: g.accent, offset: -16, alpha: octagonAlpha });
      g.label(OCTAGON_CENTER, `octagon ${fmt(polygonArea(vertices), 2)}`, { color: g.accent, bold: true, alpha: octagonAlpha });

      if (f.at(2) > 0) {
        // The top-right corner, read as a right triangle on the hypotenuse s.
        const a = f.at(2);
        const [corner, p, q] = corners[2];
        g.angle(p, corner, q, { color: LEG, r: 12, width: 1.5, alpha: a });
        g.segment(p, q, { color: g.accent, width: 4, alpha: a });
        g.segment(corner, p, { color: LEG, width: 4, alpha: a });
        g.segment(corner, q, { color: LEG, width: 4, alpha: a });
        g.along(p, corner, "s/√2", { color: LEG, offset: -18, alpha: a });
        g.along(corner, q, "s/√2", { color: LEG, offset: -18, alpha: a });
        g.along(p, q, "s", { color: g.accent, offset: 14, alpha: a });
      }
      if (f.at(3) > 0) {
        const a = f.at(3);
        const [left, right] = square;
        g.segment(left, vertices[0], { color: LEG, width: 4, alpha: a });
        g.segment(vertices[0], vertices[1], { color: g.accent, width: 4, alpha: a });
        g.segment(vertices[1], right, { color: LEG, width: 4, alpha: a });
        g.along(left, vertices[0], "s/√2", { color: LEG, offset: -16, alpha: a });
        g.along(vertices[1], right, "s/√2", { color: LEG, offset: -16, alpha: a });
        g.segment(square[3], square[2], { color: C.ink, width: 2, alpha: a });
        g.along(square[3], square[2], `s(1 + √2) = ${fmt(2 * half, 2)}`, { color: C.ink, offset: 16, alpha: a });
      }
    },

    readout(f) {
      if (f.step === 0) {
        const r = dist(inner, RING_CENTER);
        const R = dist(outer, RING_CENTER);
        const big = Math.PI * R * R;
        const small = Math.PI * r * r;
        return [
          { label: "Outer disc", tex: `\\pi R^2 = \\pi (${fmt(R, 2)})^2 = ${fmt(big, 2)}` },
          { label: "Inner disc", tex: `\\pi r^2 = \\pi (${fmt(r, 2)})^2 = ${fmt(small, 2)}` },
          { label: "Ring", tex: `\\pi R^2 - \\pi r^2 = ${fmt(big - small, 2)}`, tone: "good" },
        ];
      }
      const { leg, half, vertices } = octagon();
      const v = side.value;
      const whole = (2 * half) ** 2;
      const cut = 4 * ((leg * leg) / 2);
      const formula = 2 * (1 + Math.SQRT2) * v * v;
      const measured = polygonArea(vertices);
      const tone = agree(whole - cut, formula) && agree(formula, measured) ? "good" : "warn";
      return [
        { label: "Leg of a corner", tex: `\\frac{s}{\\sqrt2} = \\frac{${fmt(v)}}{\\sqrt2} = ${fmt(leg, 3)}` },
        { label: "Square", tex: `\\bigl(s(1 + \\sqrt2)\\bigr)^2 = ${fmt(2 * half, 3)}^2 = ${fmt(whole, 2)}` },
        { label: "Four corners", tex: `4 \\cdot \\tfrac12 (${fmt(leg, 3)})^2 = ${fmt(cut, 2)}` },
        { label: "Square minus corners", tex: `${fmt(whole, 2)} - ${fmt(cut, 2)} = ${fmt(whole - cut, 2)}`, tone },
        { label: "As a formula", tex: `2(1 + \\sqrt2)s^2 = ${fmt(formula, 2)}`, tone },
        { label: "Octagon, measured from its corners", tex: `${fmt(measured, 2)}`, tone },
      ];
    },
  };
});
