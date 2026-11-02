// A circle of radius r with three more circles of radius r centred at equally
// spaced points on it. Neighbouring outer circles overlap in a leaf running
// from the centre to the rim. A chord splits each leaf into two circular
// segments, and each segment is a 60° sector minus an equilateral triangle.

import { C, tint } from "../draw.ts";
import { fmt, polar, toRad, vec } from "../geo.ts";
import { agree, outline, tracedArea, type Arc } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

const O = vec(0, -0.2);
const SIXTH = Math.PI / 3; // 60°
/** Directions of the three leaf tips; the outer centres sit 60° either side. */
const TIPS = [270, 30, 150].map(toRad);

const CHORD = C.gold;
const TRIANGLE = C.blue;
const SECTOR = C.pink;

export default lesson((s) => {
  const radius = s.slider({ label: "r =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1.2, max: 2.2, value: 2, step: 0.1 });

  const figure = () => {
    const r = radius.value;
    const centers = TIPS.map((tip) => polar(O, r, tip + SIXTH));
    const tips = TIPS.map((tip) => polar(O, r, tip));
    // Each leaf: from O out to the tip along one circle, back along the other.
    const leaves: Arc[][] = TIPS.map((tip) => [
      [polar(O, r, tip + SIXTH), r, tip + 4 * SIXTH, tip + 5 * SIXTH],
      [polar(O, r, tip - SIXTH), r, tip + SIXTH, tip + 2 * SIXTH],
    ]);
    return { r, centers, tips, leaves };
  };

  return {
    steps: [
      {
        title: "Three leaves",
        text: "Slide $r$. Three circles of radius $r$ are centred at equally spaced points of a fourth, so all of them pass through its centre $O$. Each leaf is where two outer circles overlap. What is their total area?",
      },
      {
        title: "Halve a leaf",
        text: "The circles alone cannot be added and subtracted into a leaf, so add a line: the chord $OT$ from the centre to the leaf's tip. It splits the leaf into two equal circular segments.",
      },
      {
        title: "An equilateral triangle",
        text: "Draw radii from $P$, the centre of one outer circle, to $O$ and $T$. Then $PO = PT = r$, and $OT = r$ too, because $T$ lies on the central circle. Triangle $POT$ is equilateral.",
      },
      {
        title: "Sector minus triangle",
        text: "So the sector $POT$ spans $60^\\circ$, a sixth of its circle: $\\tfrac16 \\pi r^2$. Removing the triangle, $\\frac{\\sqrt3}{4} r^2$, leaves the segment.",
      },
      {
        title: "Six segments",
        text: "Three leaves are six such segments: $6\\left(\\tfrac16 \\pi r^2 - \\frac{\\sqrt3}{4} r^2\\right) = \\left(\\pi - \\frac{3\\sqrt3}{2}\\right) r^2$.",
      },
    ],

    likes: [
      {
        title: "Trimming the crust off a slice",
        text: "A slice of round pie is a sector. Cut straight across between the two ends of its crust and you split it into a triangle and a curved strip of crust. The strip is the segment, the slice minus the triangle, which is how this lesson finds it.",
      },
      {
        title: "Two overlapping coasters",
        text: "Lay two round coasters so they overlap, and put a ruler across the two points where their edges cross. The overlap splits into two caps, each one cut off a coaster by that straight line. That is the chord $OT$: it turns a leaf, which has no formula, into two segments, which do.",
      },
    ],
    uses: [
      {
        title: "How much water is in a pipe?",
        text: "Water lying in a horizontal pipe fills a circular segment of its cross-section, and engineers find its area as sector minus triangle. In a pipe of radius 10 cm, a water surface that spans $60^\\circ$ at the centre gives $100\\left(\\frac{\\pi}{6} - \\frac{\\sqrt3}{4}\\right) \\approx 9.1$ square centimetres, from water only about 1.3 cm deep. The same sum, with other angles, gives the depth charts for fuel tanks lying on their side.",
      },
      {
        title: "Glass for an arched window",
        text: "A segmental arch, common over doors and windows, is a circular segment sitting on a straight top. The glass it needs is the sector of the arch's circle minus the triangle under the chord: for a $60^\\circ$ arch of radius 1 m, $\\frac{\\pi}{6} - \\frac{\\sqrt3}{4} \\approx 0.09$ square metres.",
      },
    ],

    draw(g, f) {
      const { r, centers, tips, leaves } = figure();
      const [P] = centers;
      const [T] = tips;
      const tip = TIPS[0];

      for (const leaf of leaves) g.polygon(outline(leaf), { fill: tint(g.accent, 0.45), stroke: null });

      if (f.at(3) > 0) {
        const a = f.at(3) - f.at(4);
        g.sector(P, r, tip + 4 * SIXTH, tip + 5 * SIXTH, { fill: tint(SECTOR, 0.4), color: SECTOR, width: 2, alpha: a });
      }
      if (f.at(2) > 0) {
        const a = f.at(2) - f.at(4);
        g.polygon([P, O, T], { fill: tint(TRIANGLE, 0.35), color: TRIANGLE, width: 2.5, alpha: a });
        g.ticks(P, O, 1, { color: TRIANGLE, alpha: a });
        g.ticks(P, T, 1, { color: TRIANGLE, alpha: a });
        g.ticks(O, T, 1, { color: TRIANGLE, alpha: a });
        g.angle(O, P, T, { color: f.step >= 3 ? SECTOR : TRIANGLE, r: 24, label: "60°", alpha: a });
      }

      g.circle(O, r, { color: g.accent, width: 2.5 });
      for (const c of centers) {
        g.circle(c, r, { color: C.dim, width: 2 });
        g.point(c, { color: C.dim, r: 3.5 });
      }
      g.point(O, { r: 4 });
      g.label(O, "O", { dx: -4, dy: 18, bold: true });

      if (f.at(1) > 0) {
        g.segment(O, T, { color: CHORD, alpha: f.at(1) });
        g.along(O, T, `r = ${fmt(r)}`, { color: CHORD, offset: -18, align: "right", alpha: f.at(1) });
        g.point(T, { color: CHORD, alpha: f.at(1) });
        g.label(T, "T", { color: CHORD, dy: -18, bold: true, alpha: f.at(1) });
      }
      if (f.at(2) > 0) g.label(P, "P", { color: TRIANGLE, dx: 16, dy: -4, bold: true, alpha: f.at(2) });
      if (f.at(4) > 0) {
        for (const other of tips.slice(1)) g.segment(O, other, { color: CHORD, alpha: f.at(4) });
      }
    },

    readout() {
      const { r, leaves } = figure();
      const sector = (Math.PI * r * r) / 6;
      const triangle = (Math.sqrt(3) / 4) * r * r;
      const segment = sector - triangle;
      const formula = (Math.PI - (3 * Math.sqrt(3)) / 2) * r * r;
      const traced = leaves.reduce((sum, leaf) => sum + tracedArea(leaf), 0);
      const tone = agree(6 * segment, traced) && agree(formula, traced) ? "good" : "warn";
      return [
        { label: "Sector of 60°", tex: `\\tfrac16 \\pi (${fmt(r)})^2 = ${fmt(sector, 3)}` },
        { label: "Equilateral triangle", tex: `\\tfrac{\\sqrt3}{4} (${fmt(r)})^2 = ${fmt(triangle, 3)}` },
        { label: "One segment", tex: `${fmt(sector, 3)} - ${fmt(triangle, 3)} = ${fmt(segment, 3)}` },
        { label: "Six segments", tex: `6 \\cdot ${fmt(segment, 3)} = ${fmt(6 * segment, 2)}`, tone },
        { label: "As a formula", tex: `\\left(\\pi - \\tfrac{3\\sqrt3}{2}\\right) r^2 = ${fmt(formula, 2)}`, tone },
        { label: "Leaves, measured by tracing their edges", tex: `${fmt(traced, 2)}`, tone },
      ];
    },
  };
});
