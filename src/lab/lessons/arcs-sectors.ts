// Arcs, sectors and circular segments. An arc has a measure (its central
// angle θ) and a length (rθ, the same fraction of the circumference that θ is
// of a full turn). The sector is that fraction of the disc, ½r²θ, and the
// circular segment is the sector with triangle AOB taken off — or put on, once
// the arc passes a half turn.

import { C, tint } from "../draw.ts";
import { angleOf, clamp, fmt, onSegment, polar, sub, TAU, toDeg, vec, wrapAngle } from "../geo.ts";
import { arcPoints } from "../kit/circles.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0.4);
const R_MIN = 1.6;
const R_MAX = 3.5;
const MIN_ARC = 0.2; // radians: the arc is never empty and never the whole circle
const SECTOR = C.gold;
const TRIANGLE = C.blue;
const SEGMENT = C.pink;

export default lesson((s) => {
  const A = s.point(O.x + 2.8, O.y, {
    label: "A",
    constrain: onSegment(vec(O.x + R_MIN, O.y), vec(O.x + R_MAX, O.y)),
  });
  const radius = (): number => A.x - O.x;
  const B = s.point(O.x - 1, O.y + 2.6, {
    label: "B",
    constrain: (p) => polar(O, radius(), clamp(wrapAngle(angleOf(sub(p, O))), MIN_ARC, TAU - MIN_ARC)),
  });

  /** Radius and central angle, with B brought back onto the resized circle. */
  const figure = () => {
    B.set(B);
    const r = radius();
    const theta = wrapAngle(angleOf(sub(B, O)));
    const sector = (r * r * theta) / 2;
    const triangle = (r * r * Math.abs(Math.sin(theta))) / 2;
    const minor = theta <= Math.PI;
    return { r, theta, minor, sector, triangle, segment: minor ? sector - triangle : sector + triangle };
  };

  return {
    steps: [
      {
        title: "Measure and length",
        text: "Drag $B$ round the circle and $A$ in and out. The arc's measure is its central angle $\\theta$, which ignores the radius; the arc's length grows with both.",
      },
      {
        title: "Arc length",
        text: "The arc is the fraction $\\frac{\\theta}{2\\pi}$ of the whole circumference $2\\pi r$, so its length is $r\\theta$ with $\\theta$ in radians. At one radian the arc is exactly as long as the radius.",
      },
      {
        title: "Sector area",
        text: "The sector is the same fraction of the whole disc: $\\frac{\\theta}{2\\pi} \\cdot \\pi r^2 = \\tfrac12 r^2\\theta$.",
      },
      {
        title: "Circular segment",
        text: "Cut triangle $AOB$ off the sector and the piece between chord and arc remains: sector minus triangle. Past a half turn the triangle is added instead.",
      },
    ],

    draw(g, f) {
      const { r, theta } = figure();

      g.circle(O, r, { color: C.faint, width: 2 });

      if (f.at(2) > 0) {
        g.sector(O, r, 0, theta, { fill: tint(SECTOR, 0.3), stroke: null, alpha: f.at(2) * (1 - f.at(3)) });
      }
      if (f.at(3) > 0) {
        g.polygon(arcPoints(O, r, 0, theta), { fill: tint(SEGMENT, 0.4), stroke: null, alpha: f.at(3) });
        g.polygon([O, A, B], { fill: tint(TRIANGLE, 0.4), stroke: null, alpha: f.at(3) });
        g.segment(A, B, { color: C.ink, width: 2, alpha: f.at(3) });
      }

      g.segment(O, A, { color: C.ink });
      g.segment(O, B, { color: C.ink });
      g.along(O, A, `r = ${fmt(r, 2)}`, { offset: -16 });
      g.arc(O, r, 0, theta, { color: g.accent, width: 5 });
      g.label(polar(O, r + g.px(24), theta / 2), fmt(r * theta, 2), { color: g.accent });
      g.angleMark(O, 0, theta, { color: SECTOR, r: 30, label: `${fmt(toDeg(theta))}°`, square: false });
      g.point(O, { label: "O" });
    },

    readout() {
      const { r, theta, minor, sector, triangle, segment } = figure();
      const deg = toDeg(theta);
      return [
        { label: "Arc measure", tex: `\\theta = ${fmt(deg)}^\\circ = ${fmt(theta, 2)} \\text{ rad}` },
        { label: "Arc length", tex: `r\\theta = (${fmt(r, 2)})(${fmt(theta, 2)}) = ${fmt(r * theta, 2)}` },
        {
          label: "As a fraction of the circumference",
          tex: `\\tfrac{${fmt(deg)}^\\circ}{360^\\circ} \\cdot 2\\pi r = ${fmt((deg / 360) * TAU * r, 2)}`,
          tone: "good",
        },
        { label: "Sector", tex: `\\tfrac12 r^2\\theta = ${fmt(sector, 2)}` },
        {
          label: "Triangle AOB",
          tex: `\\tfrac12 r^2 ${minor ? "\\sin\\theta" : "|\\sin\\theta|"} = ${fmt(triangle, 2)}`,
        },
        {
          label: minor ? "Segment = sector − triangle" : "Segment = sector + triangle",
          tex: `${fmt(sector, 2)} ${minor ? "-" : "+"} ${fmt(triangle, 2)} = ${fmt(segment, 2)}`,
        },
      ];
    },
  };
});
