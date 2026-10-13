// The vocabulary of a circle. One point sets the radius, two more ride the
// circle, and a row of chips picks which part to light up and define: radius,
// diameter, chord, secant, tangent, arc, sector or circular segment.

import { C, tint } from "../draw.ts";
import { add, angleOf, dist, fmt, inRing, onCircle, perp, polar, sub, TAU, toDeg, vec, wrapAngle } from "../geo.ts";
import { arcPoints, onCircleClearOf } from "../kit/circles.ts";
import { lesson } from "../scene.ts";

const O = vec(0, 0.7);
const R_MIN = 1.8;
const R_MAX = 3.2;
const MIN_ARC = 0.3; // radians kept between P and Q, so the chord never vanishes
const CAPTION_AT = vec(0, -3.6);

const PARTS = ["radius", "diameter", "chord", "secant", "tangent", "arc", "sector", "segment"] as const;

const CAPTION: Record<(typeof PARTS)[number], string> = {
  radius: "Radius: a segment from the centre to the circle.",
  diameter: "Diameter: a chord through the centre. It is two radii end to end.",
  chord: "Chord: a segment joining two points of the circle.",
  secant: "Secant: a line that cuts through the circle, crossing it twice.",
  tangent: "Tangent: a line that touches the circle at exactly one point.",
  arc: "Arc: a piece of the circle. P and Q split it into a minor and a major arc.",
  sector: "Sector: the slice between two radii and the arc they cut off.",
  segment: "Circular segment: the region between a chord and its arc.",
};

export default lesson((s) => {
  const A = s.point(O.x + 2.5, O.y + 0.9, { label: "A", constrain: inRing(O, R_MIN, R_MAX) });
  const radius = (): number => dist(O, A);
  const P = s.point(O.x - 2, O.y + 1.8, { label: "P", color: C.ink, constrain: onCircle(O, radius) });
  const Q = s.point(O.x - 0.5, O.y - 2.6, {
    label: "Q",
    color: C.ink,
    constrain: onCircleClearOf(O, radius, () => [angleOf(sub(P, O))], MIN_ARC),
  });
  const part = s.choice("Part", PARTS);

  /** Bring P and Q back onto the circle after A has changed its size. */
  const settle = (): void => {
    P.set(P);
    Q.set(Q);
  };

  /** The shorter arc between P and Q, as a counter-clockwise sweep. */
  const minorArc = (): { from: number; sweep: number } => {
    const from = angleOf(sub(P, O));
    const sweep = wrapAngle(angleOf(sub(Q, O)) - from);
    return sweep <= Math.PI ? { from, sweep } : { from: from + sweep, sweep: TAU - sweep };
  };

  return {
    steps: [
      {
        title: "Name the parts",
        text: "Pick a part above, then drag $A$ to resize the circle and $P$, $Q$ to slide round it. Each part keeps its definition wherever the points go.",
      },
    ],

    draw(g) {
      settle();
      const r = radius();
      const { from, sweep } = minorArc();
      const to = from + sweep;
      const hot = g.accent;
      const wash = tint(hot, 0.3);

      g.circle(O, r, { color: C.dim, width: 2.5 });
      g.segment(O, A, { color: C.faint, width: 2 });
      g.segment(P, Q, { color: C.faint, width: 2 });

      switch (part.value) {
        case "radius":
          g.segment(O, A, { color: hot, width: 4 });
          g.along(O, A, `r = ${fmt(r, 2)}`, { color: hot });
          break;
        case "diameter": {
          const A2 = sub(add(O, O), A);
          g.segment(A, A2, { color: hot, width: 4 });
          g.ticks(O, A, 1, { color: hot });
          g.ticks(O, A2, 1, { color: hot });
          g.along(A2, O, `d = 2r = ${fmt(2 * r, 2)}`, { color: hot, offset: 20 });
          g.point(A2, { color: hot });
          break;
        }
        case "chord":
          g.segment(P, Q, { color: hot, width: 4 });
          g.along(P, Q, `PQ = ${fmt(dist(P, Q), 2)}`, { color: hot });
          break;
        case "secant":
          g.line(P, Q, { color: hot, width: 4 });
          break;
        case "tangent":
          g.line(P, add(P, perp(sub(P, O))), { color: hot, width: 4 });
          break;
        case "arc":
          g.arc(O, r, to, from + TAU, { color: C.violet, width: 5 });
          g.arc(O, r, from, to, { color: hot, width: 5 });
          g.label(polar(O, r + g.px(22), from + sweep / 2), "minor", { color: hot });
          g.label(polar(O, r + g.px(22), from + sweep / 2 + Math.PI), "major", { color: C.violet });
          break;
        case "sector":
          g.sector(O, r, from, to, { color: hot, fill: wash });
          break;
        case "segment":
          g.polygon(arcPoints(O, r, from, to), { color: hot, fill: wash });
          break;
      }

      g.point(O, { label: "O" });
      g.label(CAPTION_AT, CAPTION[part.value], { size: 16 });
    },

    readout() {
      settle();
      const r = radius();
      const minor = toDeg(minorArc().sweep);
      return [
        { label: "Radius", tex: `r = OA = ${fmt(r, 2)}` },
        { label: "Diameter", tex: `d = 2r = 2(${fmt(r, 2)}) = ${fmt(2 * r, 2)}`, tone: "good" },
        { label: "A chord is never longer than a diameter", tex: `PQ = ${fmt(dist(P, Q), 2)} \\le ${fmt(2 * r, 2)}` },
        {
          label: "Minor arc + major arc",
          tex: `${fmt(minor)}^\\circ + ${fmt(360 - minor)}^\\circ = 360^\\circ`,
        },
      ];
    },
  };
});
