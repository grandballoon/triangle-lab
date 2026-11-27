// The two tangent segments from a point outside a circle are equal, and the
// line from the point to the centre bisects the angle between them. Radii to
// the points of contact meet the tangents at right angles, so the two right
// triangles share a hypotenuse and have equal legs: they are congruent.

import { C, tint } from "../draw.ts";
import { angleAt, both, dist, fmt, inBox, inRing, lerp, polar, vec } from "../geo.ts";
import { degTex, farArc, nameOutside } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";
import centreFinderDowelImage from "../../images/centre-finder-dowel.svg";
import curveJoiningRoadsImage from "../../images/curve-joining-roads.svg";
import pipeBendTangentsImage from "../../images/pipe-bend-tangents.svg";

const O = vec(2.3, 0);
const R = 3;

const RADIUS = C.gold;
const AUX = C.violet;
const HALF = C.blue;

export default lesson((s) => {
  // The ring keeps P outside the circle; its inner edge lies inside the box.
  const P = s.point(-5.8, 1, { label: "P", constrain: both(inRing(O, R + 0.9, 30), inBox(-7.5, 7.5, -4.6, 4.6)) });

  const measure = () => {
    const arc = farArc(P, O, R);
    const S = polar(O, R, arc.from);
    const T = polar(O, R, arc.from + arc.span);
    return { S, T, d: dist(P, O), ps: dist(P, S), pt: dist(P, T) };
  };

  return {
    steps: [
      {
        title: "Two tangents from one point",
        text: "Drag $P$ around the circle. Two lines from it just touch the circle, at $S$ and $T$. Watch the two tangent lengths, and the two angles they make with the line to the centre.",
      },
      {
        title: "Radii to the points of contact",
        text: "Draw $OS$ and $OT$. A radius meets the tangent at its point of contact at a right angle, so triangles $POS$ and $POT$ are right triangles.",
      },
      {
        title: "Congruent right triangles",
        text: "They share the hypotenuse $PO$, and their legs $OS$ and $OT$ are both radii. Right triangles with equal hypotenuse and leg are congruent, so $PS = PT$ and $\\angle SPO = \\angle TPO$: the line $PO$ bisects the angle.",
      },
      {
        title: "The power of the point agrees",
        text: "Along the line through the centre, $PA \\cdot PB = (d - r)(d + r) = d^2 - r^2$, and the square of either tangent equals that same product. So $PS = PT$ once more.",
      },
    ],

    draw(g, f) {
      const { S, T, d } = measure();

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(2) > 0) {
        g.polygon([P, O, S], { fill: tint(AUX, 0.16), stroke: null, alpha: f.at(2) });
        g.polygon([P, O, T], { fill: tint(HALF, 0.16), stroke: null, alpha: f.at(2) });
      }
      g.segment(P, O, { color: AUX, width: 2, dash: [7, 6] });
      if (f.at(3) > 0) {
        const A = lerp(P, O, (d - R) / d);
        const B = lerp(P, O, (d + R) / d);
        g.segment(P, B, { color: AUX, width: 2.5, alpha: f.at(3) });
        g.point(A, { color: AUX, label: "A", alpha: f.at(3) });
        g.point(B, { color: AUX, label: "B", alpha: f.at(3) });
      }
      if (f.at(1) > 0) {
        for (const touch of [S, T]) {
          g.segment(O, touch, { color: RADIUS, alpha: f.at(1) });
          g.angle(O, touch, P, { color: RADIUS, r: 20, alpha: f.at(1) });
          g.ticks(O, touch, 2, { color: RADIUS, alpha: f.at(1) });
        }
      }

      for (const touch of [S, T]) {
        g.ray(P, touch, { color: C.dim, width: 1.5 });
        g.segment(P, touch, { color: g.accent, width: 4 });
        g.ticks(P, touch, 1, { color: g.accent });
        g.point(touch, { color: g.accent });
      }
      g.angle(S, P, O, { color: HALF, fill: true, r: 50, label: true });
      g.angle(O, P, T, { color: HALF, fill: true, r: 50, label: true });

      g.point(O, { color: C.ink, label: "O" });
      nameOutside(g, O, S, "S", { push: 18 });
      nameOutside(g, O, T, "T", { push: 18 });
    },

    readout(f) {
      const { S, T, d, ps, pt } = measure();
      const rows: Readout[] = [
        { label: "Tangent lengths", tex: `PS = ${fmt(ps, 2)},\\quad PT = ${fmt(pt, 2)}`, tone: "good" },
        {
          label: "Angles with the line to the centre",
          tex: `\\angle SPO = ${degTex(angleAt(S, P, O))},\\quad \\angle TPO = ${degTex(angleAt(T, P, O))}`,
          tone: "good",
        },
        { label: "Distance to the centre, radius", tex: `d = ${fmt(d, 2)},\\quad r = ${fmt(R, 2)}` },
      ];
      if (f.step >= 3) {
        rows.push(
          {
            label: "Through the centre",
            tex: `(d - r)(d + r) = (${fmt(d - R, 2)})(${fmt(d + R, 2)}) = ${fmt((d - R) * (d + R), 2)}`,
          },
          { label: "Tangent, squared", tex: `PS^2 = (${fmt(ps, 2)})^2 = ${fmt(ps * ps, 2)}`, tone: "good" },
        );
      }
      return rows;
    },

    likes: [
      {
        title: "Looking at a round tower",
        text: "Stand in a field facing a round tower. Your lines of sight to its two edges just graze it, at $S$ and $T$, and by symmetry each edge is the same distance from you. Look straight at the middle of the tower and your gaze runs through its centre, splitting the angle between the two edges evenly.",
      },
      {
        title: "Folding the drawing in half",
        text: "Fold the drawing along the line $PO$. The circle lands on itself, since every point of it is $r$ from $O$, and the tangent through $S$ lands on the tangent through $T$. Folding stretches nothing, so $PS = PT$ and the two angles at $P$ match: that is what the congruent triangles say.",
      },
    ],

    uses: [
      {
        title: "Joining two straight roads with a curve",
        text: "Where two straight roads or railway lines meet at an angle, engineers join them with a circular curve that touches each one. The points where the curve begins and ends are the points of contact of two tangents from the corner, so they are the same distance back along each straight. Surveyors work out that distance once, measure it back from the corner along both roads, and start and end the curve there.",
        tags: ["travel", "building"],
        image: {
          src: curveJoiningRoadsImage,
          caption: "Two straight roads joined by a circular curve: the curve starts and ends the same distance back from the corner along each road.",
          alt: "A road bending in a circular curve between two straights, with dashed lines continuing the straights to their corner, equal tick marks on each, and dashed radii meeting the road at right angles.",
        },
      },
      {
        title: "Finding the centre of a round bar",
        text: "A woodworker's centre finder is a V with a straight blade along the line that bisects it. Push a dowel or a round bar into the V and it touches both arms equally far from the tip, so the blade runs through its centre. Scribe a line along the blade, turn the bar a quarter turn, scribe again, and the centre is where the two lines cross.",
        tags: ["carpentry", "trade-tricks"],
        image: {
          src: centreFinderDowelImage,
          caption: "A woodworker's centre finder: a round bar touches both arms of the V equally far from its tip, so the blade crosses its centre.",
          alt: "The end of a round wooden bar sitting in a V-shaped tool, touching both arms at marked points with equal ticks, a steel blade up the middle, and two dashed scribed lines crossing at its centre.",
        },
      },
      {
        title: "Bending pipe round a corner",
        text: "When copper pipe or electrical conduit is bent through $90^\\circ$, the bend is an arc that touches both straight runs. The two tangents from the corner, where the runs' centre lines would meet, to the ends of the bend are equal, each the bend's radius $R$: with $R = 100$ mm, the bend starts $100$ mm before the corner on each run. The arc is $\\tfrac{\\pi}{2} \\cdot 100 \\approx 157$ mm against $200$ mm for the two tangents, so the pipe is about $43$ mm shorter than its two legs measured to the corner; electricians call this the gain.",
        tags: ["plumbing", "electrical", "trade-tricks"],
        image: {
          src: pipeBendTangentsImage,
          caption: "A copper pipe bent round a corner: the bend starts and ends one radius, 100 mm, from where the straight runs would meet.",
          alt: "A copper pipe held by two clips, running along above the floor and then bending up a wall in a quarter circle. Dashed gold lines continue both straight runs to the corner they would meet at, each marked 100, with gold dots at the corner and at both ends of the bend.",
        },
      },
    ],
  };
});
