// The lens where two circles overlap is two circular segments back to back on
// the common chord. Each segment is a sector minus a triangle, so its area is
// ½R²(θ − sin θ). The total is checked by slicing the lens into thin strips.

import { C, tint } from "../draw.ts";
import { add, angleOf, clamp, dist, fmt, normalize, perp, polar, scale, sub, vec, type Vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const O1 = vec(-2, 0.6);
// O₂ may swing this far (radians) either side of horizontal from O₁.
const SWING = 0.4;
const MARGIN = 0.25;

const ONE = C.gold;
const TWO = C.blue;

const ARC_SAMPLES = 28;
const STRIPS_SHOWN = 28;
const STRIPS_SUMMED = 2000;

function arcPoints(center: Vec, r: number, from: number, to: number): Vec[] {
  return Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => polar(center, r, from + ((to - from) * i) / ARC_SAMPLES));
}

export default lesson((s) => {
  const first = s.slider({ label: "R₁ =", at: vec(-7.6, -4.3), width: 3.4, min: 1.2, max: 2.2, value: 2.1, step: 0.1, format: (v) => fmt(v) });
  const second = s.slider({ label: "R₂ =", at: vec(-3.2, -4.3), width: 3.4, min: 1.2, max: 2.2, value: 1.7, step: 0.1, format: (v) => fmt(v) });

  // The circles must cross (d < R₁ + R₂), and the common chord must pass
  // between the centres (d² > |R₁² − R₂²|) so that each segment is smaller
  // than a half disc and really is "sector minus triangle".
  const O2 = s.point(0.8, 1, {
    label: "O₂",
    constrain: (p) => {
      const R1 = first.value;
      const R2 = second.value;
      const off = sub(p, O1);
      const d = clamp(dist(p, O1), Math.sqrt(Math.abs(R1 * R1 - R2 * R2)) + MARGIN, R1 + R2 - MARGIN);
      return polar(O1, d, clamp(angleOf(off), -SWING, SWING));
    },
  });

  function figure() {
    O2.set(O2); // the radii may have changed what the constraint allows
    const R1 = first.value;
    const R2 = second.value;
    const d = dist(O1, O2);
    // Distance from O₁ to the chord, along the line of centres.
    const a = (d * d + R1 * R1 - R2 * R2) / (2 * d);
    const half1 = Math.acos(clamp(a / R1, -1, 1));
    const half2 = Math.acos(clamp((d - a) / R2, -1, 1));
    const dir = angleOf(sub(O2, O1));
    const theta1 = 2 * half1;
    const theta2 = 2 * half2;
    return {
      R1,
      R2,
      d,
      dir,
      half1,
      half2,
      theta1,
      theta2,
      P: polar(O1, R1, dir + half1),
      Q: polar(O1, R1, dir - half1),
      segment1: 0.5 * R1 * R1 * (theta1 - Math.sin(theta1)),
      segment2: 0.5 * R2 * R2 * (theta2 - Math.sin(theta2)),
    };
  }

  /** Half the lens's width across the line of centres, `x` along it from O₁. */
  const halfWidth = (x: number, R1: number, R2: number, d: number): number =>
    Math.sqrt(Math.max(0, Math.min(R1 * R1 - x * x, R2 * R2 - (x - d) * (x - d))));

  /** The lens's area by the midpoint rule: no sectors, no angles. */
  function stripArea(R1: number, R2: number, d: number): number {
    const from = d - R2;
    const dx = (R1 - from) / STRIPS_SUMMED;
    let sum = 0;
    for (let i = 0; i < STRIPS_SUMMED; i++) sum += 2 * halfWidth(from + (i + 0.5) * dx, R1, R2, d) * dx;
    return sum;
  }

  return {
    steps: [
      {
        title: "Two circles overlap",
        text: "Drag $O_2$ and slide the radii. The shaded lens is the region inside both circles. Its edge is two arcs, so no single area formula fits it. How could you cut it into pieces you can measure?",
      },
      {
        title: "Cut along the common chord",
        text: "The circles cross at $P$ and $Q$. Chord $PQ$ belongs to both circles, and it cuts the lens into two circular segments, each one bounded by the chord and an arc of one circle.",
      },
      {
        title: "A sector minus a triangle",
        text: "The gold segment is sector $O_1PQ$ with triangle $O_1PQ$ removed. With central angle $\\theta_1$ in radians, the sector is $\\tfrac12 R_1^2\\theta_1$ and the triangle is $\\tfrac12 R_1^2\\sin\\theta_1$, leaving $\\tfrac12 R_1^2(\\theta_1 - \\sin\\theta_1)$.",
      },
      {
        title: "The other segment",
        text: "The blue segment comes from the second circle the same way: sector $O_2PQ$ minus triangle $O_2PQ$, which is $\\tfrac12 R_2^2(\\theta_2 - \\sin\\theta_2)$. The lens is the sum of the two segments.",
      },
      {
        title: "Check by slicing",
        text: "For an independent check, slice the lens into thin strips across the line of centres and add up their areas. With thousands of strips the total in the panel matches the formula.",
      },
    ],

    draw(g, f) {
      const { R1, R2, d, dir, half1, half2, P, Q } = figure();
      const arc1 = arcPoints(O1, R1, dir - half1, dir + half1); // Q round to P, bulging toward O₂
      const arc2 = arcPoints(O2, R2, dir + Math.PI - half2, dir + Math.PI + half2); // P round to Q

      g.circle(O1, R1, { color: ONE, width: 2.5, fill: tint(ONE, 0.05) });
      g.circle(O2, R2, { color: TWO, width: 2.5, fill: tint(TWO, 0.05) });
      g.polygon([...arc1, ...arc2], { fill: tint(g.accent, 0.3), color: g.accent, width: 3 });

      if (f.at(2) > 0) {
        const a = f.at(2);
        g.sector(O1, R1, dir - half1, dir + half1, { fill: tint(ONE, 0.14), stroke: null, alpha: a });
        g.polygon(arc1, { fill: tint(ONE, 0.45), stroke: null, alpha: a });
        g.path([P, O1, Q], { color: ONE, width: 2.5, alpha: a });
        g.angleMark(O1, dir - half1, dir + half1, { color: ONE, r: 24, label: "θ₁", square: false, alpha: a });
      }
      if (f.at(3) > 0) {
        const a = f.at(3);
        g.sector(O2, R2, dir + Math.PI - half2, dir + Math.PI + half2, { fill: tint(TWO, 0.14), stroke: null, alpha: a });
        g.polygon(arc2, { fill: tint(TWO, 0.45), stroke: null, alpha: a });
        g.path([P, O2, Q], { color: TWO, width: 2.5, alpha: a });
        g.angleMark(O2, dir + Math.PI - half2, dir + Math.PI + half2, { color: TWO, r: 24, label: "θ₂", square: false, alpha: a });
      }
      if (f.at(4) > 0) {
        const u = normalize(sub(O2, O1));
        const n = perp(u);
        const from = d - R2;
        const dx = (R1 - from) / STRIPS_SHOWN;
        for (let i = 0; i < STRIPS_SHOWN; i++) {
          const h = halfWidth(from + (i + 0.5) * dx, R1, R2, d);
          const left = add(O1, scale(u, from + i * dx));
          const right = add(O1, scale(u, from + (i + 1) * dx));
          g.polygon(
            [add(left, scale(n, h)), add(right, scale(n, h)), sub(right, scale(n, h)), sub(left, scale(n, h))],
            { color: C.ink, width: 1, fill: tint(C.ink, 0.12), alpha: f.at(4) },
          );
        }
      }
      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(P, Q, { color: C.ink, width: 3, alpha: a });
        g.point(P, { alpha: a });
        g.point(Q, { alpha: a });
        g.label(P, "P", { dy: 18, alpha: a });
        g.label(Q, "Q", { dy: -18, alpha: a });
      }

      g.point(O1, { color: ONE });
      g.label(O1, "O₁", { color: ONE, dx: -16, dy: -14 });
    },

    readout() {
      const { R1, R2, d, theta1, theta2, segment1, segment2 } = figure();
      const lens = segment1 + segment2;
      const strips = stripArea(R1, R2, d);
      return [
        { label: "Central angles, in radians", tex: `\\theta_1 = ${fmt(theta1, 2)},\\quad \\theta_2 = ${fmt(theta2, 2)}` },
        { label: "Gold segment", tex: `\\tfrac12 R_1^2(\\theta_1 - \\sin\\theta_1) = ${fmt(segment1, 2)}` },
        { label: "Blue segment", tex: `\\tfrac12 R_2^2(\\theta_2 - \\sin\\theta_2) = ${fmt(segment2, 2)}` },
        { label: "Lens, by the formula", tex: `\\text{gold} + \\text{blue} = ${fmt(lens, 2)}` },
        {
          label: "Lens, by adding strips",
          tex: `\\text{area} \\approx ${fmt(strips, 2)}`,
          tone: Math.abs(strips - lens) < 0.01 ? "good" : "warn",
        },
      ];
    },
  };
});
