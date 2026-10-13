// A belt around two wheels: two common tangents and the arcs between them.
// Sliding the small radius along the tangent makes a right triangle on the
// line of centres with hypotenuse d and leg R − r (open belt) or R + r
// (crossed belt); it gives both the tangent length and the angles of the arcs.

import { C, tint } from "../draw.ts";
import { dist, fmt, onSegment, polar, TAU, toDeg, vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const AXIS_Y = 0.7;
const O1 = vec(-3.9, AXIS_Y);
// The closest the centres come is still more than the largest R + r, so both
// kinds of tangent always exist; and R > r always, so R − r is a real leg.
const D_MIN = 4.2;
const D_MAX = 9;

const BIG = C.gold;
const SMALL = C.blue;
const LEG = C.pink;

export default lesson((s) => {
  const big = s.slider({ label: "R =", at: vec(-7.6, -4.3), width: 3.4, min: 1.4, max: 2.6, value: 2.2, step: 0.1, format: (v) => fmt(v) });
  const small = s.slider({ label: "r =", at: vec(-3.2, -4.3), width: 3.4, min: 0.4, max: 1.2, value: 0.9, step: 0.1, format: (v) => fmt(v) });
  const O2 = s.point(2.6, AXIS_Y, {
    label: "O₂",
    constrain: onSegment(vec(O1.x + D_MIN, AXIS_Y), vec(O1.x + D_MAX, AXIS_Y)),
  });
  const belt = s.choice("Belt", ["open", "crossed"] as const);

  function figure() {
    const R = big.value;
    const r = small.value;
    const d = O2.x - O1.x;
    const crossed = belt.value === "crossed";
    const leg = crossed ? R + r : R - r;
    // The radii to a tangent's two ends are parallel, both tilted α off the
    // line of centres; on a crossed belt they point opposite ways.
    const alpha = Math.acos(leg / d);
    const flip = crossed ? Math.PI : 0;
    return {
      R,
      r,
      d,
      crossed,
      leg,
      alpha,
      tangent: Math.sqrt(d * d - leg * leg),
      T1: polar(O1, R, alpha),
      T2: polar(O2, r, alpha + flip),
      U1: polar(O1, R, -alpha),
      U2: polar(O2, r, -alpha - flip),
      // Where the tangent, slid to end at O₂, meets line O₁T₁.
      H: polar(O1, leg, alpha),
      bigArc: TAU - 2 * alpha,
      smallArc: crossed ? TAU - 2 * alpha : 2 * alpha,
    };
  }

  return {
    steps: [
      {
        title: "A belt on two wheels",
        text: "Drag $O_2$ and the sliders to change the spacing and the two radii. The belt is two straight tangents joined by two arcs. Try the crossed belt too. How long is each straight piece?",
      },
      {
        title: "Centres and radii",
        text: "Join the centres, a distance $d$ apart, and draw the radii to the ends $T_1$, $T_2$ of one tangent. A tangent is perpendicular to the radius at its point of contact, so both radii are perpendicular to the same line and therefore parallel.",
      },
      {
        title: "Slide the tangent",
        text: "Through $O_2$ draw a parallel to the tangent, meeting line $O_1T_1$ at $H$. Then $HT_1T_2O_2$ is a rectangle, so $HO_2 = T_1T_2$ and $HT_1 = r$. That leaves $O_1H = R - r$ for the open belt, $R + r$ for the crossed one.",
      },
      {
        title: "Pythagoras",
        text: "Triangle $O_1HO_2$ has a right angle at $H$ and hypotenuse $d$. So the tangent length is $t = \\sqrt{d^2 - (R - r)^2}$ for the open belt and $t = \\sqrt{d^2 - (R + r)^2}$ for the crossed belt.",
      },
      {
        title: "The arcs",
        text: "In that triangle $\\cos\\alpha = O_1H / d$. By symmetry the belt is off the big wheel for $2\\alpha$, so it hugs $2\\pi - 2\\alpha$ of it. On the small wheel it hugs $2\\alpha$ when open and $2\\pi - 2\\alpha$ when crossed.",
      },
      {
        title: "The whole belt",
        text: "An arc of angle $\\theta$ radians on a circle of radius $\\rho$ has length $\\rho\\theta$. Add the two arcs to the two tangents and you have the belt's length, from nothing but $d$, $R$ and $r$.",
      },
    ],

    draw(g, f) {
      const { R, r, crossed, alpha, tangent, T1, T2, U1, U2, H, smallArc } = figure();
      const legText = crossed ? "R + r" : "R − r";

      g.circle(O1, R, { color: C.dim, width: 2, fill: tint(BIG, 0.08) });
      g.circle(O2, r, { color: C.dim, width: 2, fill: tint(SMALL, 0.08) });

      if (f.at(2) > 0) {
        g.polygon([O1, H, O2], { fill: tint(LEG, 0.16), stroke: null, alpha: f.at(2) });
      }
      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(O1, O2, { color: C.ink, width: 2, dash: [7, 6], alpha: a });
        g.along(O1, O2, "d", { offset: -14, alpha: a });
        g.segment(O1, T1, { color: BIG, alpha: a });
        g.segment(O2, T2, { color: SMALL, alpha: a });
        g.angle(O1, T1, T2, { color: C.ink, r: 15, width: 2, alpha: a });
        g.angle(O2, T2, T1, { color: C.ink, r: 15, width: 2, alpha: a });
        g.label(T1, "T₁", { dx: -4, dy: 18, alpha: a });
        g.label(T2, "T₂", { dx: crossed ? -4 : 6, dy: crossed ? -18 : 18, alpha: a });
      }
      if (f.at(2) > 0) {
        const a = f.at(2);
        g.segment(H, O2, { color: g.accent, width: 2.5, dash: [8, 6], alpha: a });
        g.chevrons(H, O2, 1, { color: g.accent, alpha: a });
        g.chevrons(T1, T2, 1, { color: C.ink, alpha: a });
        g.segment(O1, H, { color: LEG, width: 4, alpha: a });
        g.segment(H, T1, { color: SMALL, width: 4, alpha: a });
        g.ticks(H, T1, 1, { color: SMALL, alpha: a });
        g.ticks(O2, T2, 1, { color: SMALL, alpha: a });
        g.angle(O1, H, O2, { color: C.ink, r: 15, width: 2, alpha: a });
        g.along(O1, H, legText, { color: LEG, offset: 18, alpha: a });
        g.point(H, { color: LEG, alpha: a });
        g.label(H, "H", { color: LEG, dx: 14, dy: crossed ? 14 : -2, alpha: a });
      }
      if (f.at(3) > 0) {
        g.along(H, O2, `t = ${fmt(tangent, 2)}`, { color: g.accent, offset: -16, alpha: f.at(3) });
      }
      if (f.at(4) > 0) {
        const a = f.at(4);
        g.angleMark(O1, 0, alpha, { color: LEG, fill: true, r: 30, label: "α", square: false, alpha: a });
        g.angleMark(O1, alpha, TAU - alpha, { color: BIG, r: 14, width: 2, square: false, alpha: a });
        g.label(vec(O1.x - R, AXIS_Y), "2π − 2α", { color: BIG, dx: 40, size: 14, alpha: a });
        const from = crossed ? Math.PI + alpha : -alpha;
        g.angleMark(O2, from, from + smallArc, { color: SMALL, r: 12, width: 2, square: false, alpha: a });
        g.label(vec(O2.x + r, AXIS_Y), crossed ? "2π − 2α" : "2α", { color: SMALL, dx: 14, size: 14, align: "left", alpha: a });
      }

      // The belt itself, on top.
      const beltStyle = { color: g.accent, width: 4 };
      g.segment(T1, T2, beltStyle);
      g.segment(U1, U2, beltStyle);
      g.arc(O1, R, alpha, TAU - alpha, beltStyle);
      const from = crossed ? Math.PI + alpha : -alpha;
      g.arc(O2, r, from, from + smallArc, beltStyle);

      g.point(O1, { color: C.ink });
      g.label(O1, "O₁", { dx: -4, dy: -16 });
      if (f.step === 0) {
        g.along(T1, T2, `t = ${fmt(tangent, 2)}`, { color: g.accent, offset: 16 });
      }
    },

    readout() {
      const { R, r, d, crossed, alpha, tangent, T1, T2, bigArc, smallArc } = figure();
      const sign = crossed ? "+" : "-";
      const arcs = R * bigArc + r * smallArc;
      const smallTex = crossed ? "r(2\\pi - 2\\alpha)" : "r(2\\alpha)";
      return [
        { label: "Spacing and radii", tex: `d = ${fmt(d, 2)},\\; R = ${fmt(R)},\\; r = ${fmt(r)}` },
        {
          label: "Tangent from the right triangle",
          tex: `t = \\sqrt{d^2 - (R ${sign} r)^2} = ${fmt(tangent, 2)}`,
        },
        { label: "Measured on the figure", tex: `T_1T_2 = ${fmt(dist(T1, T2), 2)}`, tone: "good" },
        {
          label: "Angle at the big centre",
          tex: `\\alpha = \\cos^{-1}\\tfrac{R ${sign} r}{d} = ${fmt(toDeg(alpha))}^\\circ = ${fmt(alpha, 2)}\\text{ rad}`,
        },
        { label: "The two arcs", tex: `R(2\\pi - 2\\alpha) + ${smallTex} = ${fmt(arcs, 2)}` },
        { label: "Belt length", tex: `2t + \\text{arcs} = ${fmt(2 * tangent + arcs, 2)}` },
      ];
    },
  };
});
