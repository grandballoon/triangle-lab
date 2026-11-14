// The vocabulary of a circle, one part at a time. Each step names one part,
// lights it on a circle of its own, and defines it under the figure; the row
// of names above the figure goes to a part's step. Only the points a part is
// made from are on show for it: A sets the radius, P and Q ride the circle
// where two points of it are needed, and V where the inscribed angle needs a
// third.

import { C, tint } from "../draw.ts";
import { add, angleAt, angleOf, dist, fmt, inRing, onCircle, perp, polar, sub, TAU, toDeg, vec, wrapAngle } from "../geo.ts";
import { arcPoints, onCircleClearOf } from "../kit/circles.ts";
import { lesson, type Handle, type Readout } from "../scene.ts";

const O = vec(0, 0.7);
const R_MIN = 1.8;
const R_MAX = 3.2;
const MIN_ARC = 0.3; // radians kept between P, Q and V, so no part shrinks to nothing
const CAPTION_AT = vec(0, -3.6);

const PARTS = [
  "radius",
  "diameter",
  "circumference",
  "area",
  "chord",
  "secant",
  "tangent",
  "arc",
  "sector",
  "segment",
  "central angle",
  "inscribed angle",
] as const;
type Part = (typeof PARTS)[number];

/** Each part's definition, captioned under the figure. */
const CAPTION: Record<Part, string> = {
  radius: "Radius: a segment from the centre to the circle.",
  diameter: "Diameter: a chord through the centre. It is two radii end to end.",
  circumference: "Circumference: the distance all the way round the circle, 2πr.",
  area: "Area: the space the circle encloses, πr².",
  chord: "Chord: a segment joining two points of the circle.",
  secant: "Secant: a line that cuts through the circle, crossing it twice.",
  tangent: "Tangent: a line that touches the circle at exactly one point.",
  arc: "Arc: a piece of the circle between two of its points.",
  sector: "Sector: the slice between two radii and the arc they cut off.",
  segment: "Circular segment: the region between a chord and its arc.",
  "central angle": "Central angle: an angle with its vertex at the centre, between two radii.",
  "inscribed angle": "Inscribed angle: an angle with its vertex on the circle, between two chords.",
};

/** The draggable points each part is made from. */
const POINTS: Record<Part, readonly ("A" | "P" | "Q" | "V")[]> = {
  radius: ["A"],
  diameter: ["A"],
  circumference: ["A"],
  area: ["A"],
  chord: ["P", "Q"],
  secant: ["P", "Q"],
  tangent: ["P"],
  arc: ["P", "Q"],
  sector: ["P", "Q"],
  segment: ["P", "Q"],
  "central angle": ["P", "Q"],
  "inscribed angle": ["P", "Q", "V"],
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
  const V = s.point(O.x + 2.4, O.y - 1.2, {
    label: "V",
    color: C.ink,
    constrain: onCircleClearOf(O, radius, () => [angleOf(sub(P, O)), angleOf(sub(Q, O))], MIN_ARC),
  });
  const part = s.terms("Part", PARTS);
  const handles: Record<"A" | "P" | "Q" | "V", Handle> = { A, P, Q, V };

  /** Bring P, Q and V back onto the circle after A has changed its size, and show only the part's own points. */
  const settle = (): void => {
    P.set(P);
    Q.set(Q);
    V.set(V);
    for (const [name, h] of Object.entries(handles)) {
      const used = POINTS[part.value].includes(name as "A");
      h.hidden = !used;
      h.enabled = used;
    }
  };

  /** The shorter arc between P and Q, as a counter-clockwise sweep. */
  const minorArc = (): { from: number; sweep: number } => {
    const from = angleOf(sub(P, O));
    const sweep = wrapAngle(angleOf(sub(Q, O)) - from);
    return sweep <= Math.PI ? { from, sweep } : { from: from + sweep, sweep: TAU - sweep };
  };

  return {
    // One a part, in the order of PARTS.
    steps: [
      {
        title: "Radius",
        text: "Drag $A$ to grow or shrink the circle. Every point of the circle is the same distance from the centre $O$, and that distance is the radius $r$.",
      },
      {
        title: "Diameter",
        text: "Drag $A$ round the circle. The diameter through it always passes through $O$, and is always $2r$ long.",
      },
      {
        title: "Circumference",
        text: "Drag $A$ to resize the circle and watch the distance round it change. It is always $\\pi$ times the diameter.",
      },
      {
        title: "Area",
        text: "Drag $A$ to resize the circle. The space inside it grows with the square of the radius.",
      },
      {
        title: "Chord",
        text: "Drag $P$ and $Q$ round the circle. The segment joining them is a chord, and it is never longer than a diameter.",
      },
      {
        title: "Secant",
        text: "Drag $P$ and $Q$. The line through them runs on past the circle both ways, crossing it at exactly those two points.",
      },
      {
        title: "Tangent",
        text: "Drag $P$ round the circle. The tangent there touches the circle at $P$ alone, and stands at a right angle to the radius $OP$.",
      },
      {
        title: "Arc",
        text: "Drag $P$ and $Q$. They split the circle into two arcs: the shorter minor arc and the longer major arc.",
      },
      {
        title: "Sector",
        text: "Drag $P$ and $Q$. The radii to them and the minor arc between them close off a slice of the circle.",
      },
      {
        title: "Circular segment",
        text: "Drag $P$ and $Q$. The chord between them trims off a region of the circle on the side of the minor arc.",
      },
      {
        title: "Central angle",
        text: "Drag $P$ and $Q$. The angle $POQ$ has its vertex at the centre, and opens onto the minor arc $PQ$.",
      },
      {
        title: "Inscribed angle",
        text: "Drag $V$ round the circle, and $P$ and $Q$. The angle $PVQ$ has its vertex on the circle itself, and opens onto the arc $PQ$ across from it.",
      },
    ],

    likes: [
      {
        title: "A bicycle wheel",
        text: "The hub is the centre and every spoke is a radius, all the same length, which is exactly what keeps the rim round. Two spokes lined up straight across the hub make a diameter, so a diameter is two radii end to end. The road under the tyre is a tangent: it touches the rim at one point and nowhere else.",
      },
      {
        title: "Cutting a round cake",
        text: "A cut from the middle to the edge is a radius, and two such cuts free a slice: a sector, with a curved strip of icing along its edge that is an arc. One straight cut that misses the middle is a chord, and the thin sliver it trims off the side is a circular segment.",
      },
    ],

    uses: [
      {
        title: "Marking out a round flower bed",
        text: "Gardeners mark a round bed with a peg in the ground and a string tied to it. Walking round with the string held tight, every mark they make is one radius from the peg, so the outline is a circle. A $1.5$ metre string gives a bed $3$ metres across, its diameter.",
      },
      {
        title: "Sizing a pizza",
        text: "A $30$ cm pizza is measured straight across through the middle: that is its diameter, so the radius from the centre to the crust is $15$ cm. Each slice cut from the middle is a sector, and its crust is an arc.",
      },
      {
        title: "Running a belt round two wheels",
        text: "On a bike's chain or an engine's fan belt, the belt wraps part way round each wheel and runs straight between them. Each straight run leaves a wheel along a tangent, and the part lying on a wheel is an arc. To find the length of belt needed, mechanics add the straight tangent runs to those arcs.",
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
        case "circumference":
          g.circle(O, r, { color: hot, width: 5 });
          g.segment(O, A, { color: C.faint, width: 2 });
          g.label(polar(O, r + g.px(26), Math.PI / 2), `C = ${fmt(TAU * r, 2)}`, { color: hot });
          break;
        case "area":
          g.circle(O, r, { color: hot, width: 3, fill: wash });
          g.segment(O, A, { color: C.faint, width: 2 });
          g.label(polar(O, r / 2, -Math.PI / 2), `A = ${fmt(Math.PI * r * r, 2)}`, { color: hot });
          break;
        case "chord":
          g.segment(P, Q, { color: hot, width: 4 });
          g.along(P, Q, `PQ = ${fmt(dist(P, Q), 2)}`, { color: hot });
          break;
        case "secant":
          g.line(P, Q, { color: hot, width: 4 });
          break;
        case "tangent":
          g.segment(O, P, { color: C.faint, width: 2 });
          g.line(P, add(P, perp(sub(P, O))), { color: hot, width: 4 });
          g.angle(O, P, add(P, perp(sub(P, O))), { color: hot });
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
        case "central angle":
          g.segment(O, P, { color: hot, width: 4 });
          g.segment(O, Q, { color: hot, width: 4 });
          g.arc(O, r, from, to, { color: hot, width: 5 });
          g.angle(P, O, Q, { color: hot });
          break;
        case "inscribed angle": {
          g.segment(V, P, { color: hot, width: 4 });
          g.segment(V, Q, { color: hot, width: 4 });
          g.angle(P, V, Q, { color: hot });
          // The arc the angle opens onto: the one not holding V.
          const vAt = wrapAngle(angleOf(sub(V, O)) - from);
          const vOnMinor = vAt >= 0 && vAt <= sweep;
          if (vOnMinor) g.arc(O, r, to, from + TAU, { color: hot, width: 5 });
          else g.arc(O, r, from, to, { color: hot, width: 5 });
          break;
        }
      }

      g.point(O, { label: "O" });
      g.label(CAPTION_AT, CAPTION[part.value], { size: 16 });
    },

    readout() {
      settle();
      const r = radius();
      const minor = toDeg(minorArc().sweep);
      const rows: Record<Part, Readout[]> = {
        radius: [{ label: "Radius", tex: `r = OA = ${fmt(r, 2)}` }],
        diameter: [{ label: "Diameter", tex: `d = 2r = 2(${fmt(r, 2)}) = ${fmt(2 * r, 2)}`, tone: "good" }],
        circumference: [{ label: "Circumference", tex: `C = 2\\pi r = 2\\pi(${fmt(r, 2)}) = ${fmt(TAU * r, 2)}`, tone: "good" }],
        area: [{ label: "Area", tex: `A = \\pi r^2 = \\pi(${fmt(r, 2)})^2 = ${fmt(Math.PI * r * r, 2)}`, tone: "good" }],
        chord: [{ label: "A chord is never longer than a diameter", tex: `PQ = ${fmt(dist(P, Q), 2)} \\le ${fmt(2 * r, 2)}` }],
        secant: [],
        tangent: [{ label: "The tangent meets the radius square on", tex: `OP \\perp \\text{tangent}`, tone: "good" }],
        arc: [{ label: "Minor arc + major arc", tex: `${fmt(minor)}^\\circ + ${fmt(360 - minor)}^\\circ = 360^\\circ` }],
        sector: [{ label: "The sector's angle at O", tex: `${fmt(minor)}^\\circ` }],
        segment: [{ label: "Its chord", tex: `PQ = ${fmt(dist(P, Q), 2)}` }],
        "central angle": [{ label: "Central angle", tex: `\\angle POQ = ${fmt(minor)}^\\circ` }],
        "inscribed angle": [{ label: "Inscribed angle", tex: `\\angle PVQ = ${fmt(toDeg(angleAt(P, V, Q)))}^\\circ` }],
      };
      return rows[part.value];
    },
  };
});
