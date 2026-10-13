// Four semicircles drawn inward on the sides of a square overlap in four
// leaves. Together the semicircles cover the square, covering each leaf twice
// and everything else once, so the leaves are four semicircles minus the square.

import { C, tint } from "../draw.ts";
import { fmt, lerp, polar, vec, type Vec } from "../geo.ts";
import { agree, outline, tracedArea, type Arc } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0.5);
const QUARTER = Math.PI / 2;
const SEMICIRCLES = [C.gold, C.blue, C.pink, C.cyan];

export default lesson((s) => {
  const side = s.slider({ label: "s =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 3, max: 6.4, value: 5.2, step: 0.2 });

  const figure = () => {
    const r = side.value / 2;
    // Side j has its midpoint in direction j·90° − 90°; its semicircle opens toward O.
    const centers = [0, 1, 2, 3].map((j) => polar(O, r, (j - 1) * QUARTER));
    const corners = [0, 1, 2, 3].map((j) => polar(O, r * Math.SQRT2, (j - 1.5) * QUARTER));
    // Leaf j runs from O to corner j, between the arcs of the two sides that meet there.
    const leaves: Arc[][] = [0, 1, 2, 3].map((j) => [
      [centers[j], r, (j + 1) * QUARTER, (j + 2) * QUARTER],
      [centers[(j + 3) % 4], r, (j - 1) * QUARTER, j * QUARTER],
    ]);
    return { r, centers, corners, leaves };
  };

  return {
    steps: [
      {
        title: "Four leaves",
        text: "Slide $s$ to resize the square. On each side sits a semicircle, drawn inward with that side as its diameter. Where two semicircles overlap they make a leaf. How much area do the four leaves have?",
      },
      {
        title: "The simple pieces",
        text: "A leaf has no formula of its own, but the pieces around it do: a square of side $s$, and four semicircles of radius $\\frac{s}{2}$, each with area $\\tfrac12 \\pi \\left(\\frac{s}{2}\\right)^2$.",
      },
      {
        title: "Count the layers",
        text: "Lay all four semicircles down. They cover the whole square and nothing outside it. Every point of a leaf is under two semicircles; every other point is under just one.",
      },
      {
        title: "Remove one layer",
        text: "So the four semicircles add up to the square plus the leaves a second time. Taking one square away leaves the leaves: $4 \\cdot \\tfrac12\\pi\\left(\\frac{s}{2}\\right)^2 - s^2 = \\left(\\frac{\\pi}{2} - 1\\right)s^2$.",
      },
    ],

    draw(g, f) {
      const { r, centers, corners, leaves } = figure();

      // The leaves step back while the semicircles are laid down, then return.
      const leafAlpha = 1 - 0.75 * (f.at(1) - f.at(3));
      if (f.at(1) > 0) {
        centers.forEach((c, j) => {
          const from = j * QUARTER;
          g.sector(c, r, from, from + Math.PI, { fill: tint(SEMICIRCLES[j], 0.26), stroke: null, alpha: f.at(1) });
        });
      }
      for (const leaf of leaves) g.polygon(outline(leaf), { fill: tint(g.accent, 0.5), stroke: null, alpha: leafAlpha });

      centers.forEach((c, j) => {
        const from = j * QUARTER;
        g.arc(c, r, from, from + Math.PI, { color: f.step >= 1 ? SEMICIRCLES[j] : g.accent, width: 2.5 });
      });
      g.polygon(corners, {});
      g.along(corners[0], corners[1], `s = ${fmt(side.value)}`, { offset: -16 });

      if (f.at(1) > 0) {
        const a = f.at(1) - f.at(2);
        g.segment(centers[0], O, { color: SEMICIRCLES[0], width: 2, dash: [6, 5], alpha: a });
        g.point(centers[0], { color: SEMICIRCLES[0], r: 3.5, alpha: a });
        g.label(lerp(centers[0], O, 0.5), `s/2 = ${fmt(r)}`, { color: SEMICIRCLES[0], size: 14, align: "left", dx: 8, alpha: a });
      }
      if (f.at(2) > 0) {
        const layers = (p: Vec, text: string): void => g.label(p, text, { size: 16, bold: true, alpha: f.at(2) });
        for (let j = 0; j < 4; j++) {
          layers(lerp(O, corners[j], 0.5), "×2");
          layers(lerp(O, centers[j], 0.62), "×1");
        }
      }
    },

    readout() {
      const { r, leaves } = figure();
      const v = side.value;
      const semicircle = (Math.PI * r * r) / 2;
      const square = v * v;
      const leavesByLayers = 4 * semicircle - square;
      const formula = (Math.PI / 2 - 1) * v * v;
      const traced = leaves.reduce((sum, leaf) => sum + tracedArea(leaf), 0);
      const tone = agree(leavesByLayers, traced) && agree(formula, traced) ? "good" : "warn";
      return [
        { label: "One semicircle", tex: `\\tfrac12 \\pi (${fmt(r)})^2 = ${fmt(semicircle, 2)}` },
        { label: "Four semicircles", tex: `4 \\cdot ${fmt(semicircle, 2)} = ${fmt(4 * semicircle, 2)}` },
        { label: "Square", tex: `s^2 = ${fmt(v)}^2 = ${fmt(square, 2)}` },
        { label: "Semicircles minus square", tex: `${fmt(4 * semicircle, 2)} - ${fmt(square, 2)} = ${fmt(leavesByLayers, 2)}`, tone },
        { label: "As a formula", tex: `\\left(\\tfrac{\\pi}{2} - 1\\right)s^2 = ${fmt(formula, 2)}`, tone },
        { label: "Leaves, measured by tracing their edges", tex: `${fmt(traced, 2)}`, tone },
      ];
    },
  };
});
