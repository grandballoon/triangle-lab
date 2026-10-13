// Four ways to recognise a right triangle, all watching the same triangle:
// the two smaller angles are complementary; the squares on the two shorter
// sides add up to the square on the longest; the median to the longest side
// is half of it; the third vertex lies on the circle with that side as
// diameter. They all light up together, or not at all.

import { C, tint } from "../draw.ts";
import {
  add, angleAt, both, dist, fmt, inBox, lerp, onCircle, perp, project, sub, toDeg,
  type Constraint, type Vec,
} from "../geo.ts";
import { labelAway, sq } from "../kit/triangles-measure.ts";
import { lesson, type Handle, type Readout } from "../scene.ts";

const SNAP = 0.2; // stage units within which a corner clicks into a right angle
const RIGHT_TOLERANCE = 0.05; // degrees; snapped corners are exact, this absorbs rounding

const YES = C.green;
const FIRST = C.gold; // the angles at the two ends of the longest side
const SECOND = C.blue;
const MEDIAN = C.pink;

const CORNERS = [
  { name: "A", x: -1, y: 2.7, box: inBox(-4.5, 4.5, 0.6, 3.4) },
  { name: "B", x: 4, y: -2.2, box: inBox(1, 5, -3.4, -1.4) },
  { name: "C", x: -4, y: -2.2, box: inBox(-5, -1, -3.4, -1.4) },
];

/**
 * Pull a corner onto the nearest place that makes the triangle right-angled:
 * the circle on the other two corners as diameter (right angle here), or the
 * perpendicular to their side at either of them (right angle there).
 */
function snapRight(p1: Vec, p2: Vec): Constraint {
  return (p) => {
    const across = add(p1, perp(sub(p2, p1)));
    const targets = [
      onCircle(lerp(p1, p2, 0.5), dist(p1, p2) / 2)(p),
      project(p, p1, across),
      project(p, p2, add(p2, sub(across, p1))),
    ];
    const best = targets.reduce((a, b) => (dist(a, p) <= dist(b, p) ? a : b));
    return dist(best, p) < SNAP ? best : p;
  };
}

export default lesson((s) => {
  // A above, B lower right, C lower left: the boxes cannot overlap or line up,
  // so the triangle never flattens. Each corner snaps against the other two,
  // once they exist.
  const corners: Handle[] = [];
  CORNERS.forEach(({ name, x, y, box }, i) => {
    const snap: Constraint = (p) =>
      corners.length < 3 ? p : snapRight(corners[(i + 1) % 3], corners[(i + 2) % 3])(p);
    corners.push(s.point(x, y, { label: name, constrain: both(box, snap) }));
  });
  const names = CORNERS.map((c) => c.name);

  /** Sort the triangle around its longest side PQ; R is the corner opposite. */
  const read = () => {
    const opposite = corners.map((_, i) => dist(corners[(i + 1) % 3], corners[(i + 2) % 3]));
    const k = opposite.indexOf(Math.max(...opposite));
    const [r, p, q] = [k, (k + 1) % 3, (k + 2) % 3];
    const [R, P, Q] = [corners[r], corners[p], corners[q]];
    const M = lerp(P, Q, 0.5);
    const largest = toDeg(angleAt(P, R, Q));
    return {
      R, P, Q, M,
      nameR: names[r], nameP: names[p], nameQ: names[q],
      long: opposite[r], sideP: opposite[p], sideQ: opposite[q],
      largest,
      atP: toDeg(angleAt(R, P, Q)),
      atQ: toDeg(angleAt(R, Q, P)),
      median: dist(R, M),
      right: Math.abs(largest - 90) < RIGHT_TOLERANCE,
    };
  };

  return {
    steps: [
      {
        title: "Hunt for a right angle",
        text: "Drag the corners; one clicks into place whenever an angle reaches $90^\\circ$. The thick side is the longest, and a right angle can only sit opposite it. The next steps add four tests that each detect it.",
      },
      {
        title: "Complementary partners",
        text: "The three angles total $180^\\circ$. So the largest is $90^\\circ$ exactly when the other two add up to $90^\\circ$ — that is, when they are complementary.",
      },
      {
        title: "Pythagoras, backwards",
        text: "Square the two shorter sides and add. In an acute triangle the sum beats the square of the longest side, in an obtuse one it falls short. They agree only for a right triangle.",
      },
      {
        title: "A median half as long",
        text: "Join the far corner to the midpoint $M$ of the longest side. If that median is half the side, $M$ is equally far from all three corners. The two isosceles triangles this makes force the far angle to equal the other two together: $90^\\circ$.",
      },
      {
        title: "On the circle",
        text: "The same fact as a picture: draw the circle with the longest side as diameter. The third corner lies on it exactly when its angle is right. Outside the circle the angle is acute; inside, obtuse.",
      },
    ],

    draw(g, f) {
      const { R, P, Q, M, long, right, largest } = read();
      const verdict = right ? YES : C.ink;

      if (f.at(4) > 0) {
        g.circle(M, long / 2, {
          color: right ? YES : C.dim, width: 2, dash: right ? [] : [7, 6],
          fill: right ? tint(YES, 0.07) : undefined, alpha: f.at(4),
        });
      }
      g.polygon([R, P, Q], { fill: "rgba(255, 255, 255, 0.05)", color: C.ink });
      g.segment(P, Q, { color: g.accent, width: 5 });
      g.angle(P, R, Q, { color: verdict, fill: true, r: 30, square: right, label: `${fmt(largest)}°` });

      if (f.at(1) > 0) {
        g.angle(R, P, Q, { color: FIRST, fill: true, r: 34, label: true, alpha: f.at(1) });
        g.angle(R, Q, P, { color: SECOND, fill: true, r: 34, label: true, alpha: f.at(1) });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        g.segment(R, M, { color: MEDIAN, dash: right ? [] : [7, 5], alpha });
        g.ticks(P, M, 2, { alpha });
        g.ticks(M, Q, 2, { alpha });
        if (right) g.ticks(R, M, 2, { color: MEDIAN, alpha });
        g.point(M, { color: MEDIAN, alpha });
        labelAway(g, M, "M", R, { color: MEDIAN, alpha });
      }

      const kind = right ? "right triangle" : largest < 90 ? "acute triangle" : "obtuse triangle";
      g.label({ x: 0, y: 4.5 }, kind, { color: right ? YES : C.dim, size: 20, bold: true });
    },

    readout(f) {
      const { nameR, nameP, nameQ, long, sideP, sideQ, largest, atP, atQ, median, right } = read();
      const tone = right ? "good" : "warn";
      const side = (x: string, y: string): string => [x, y].sort().join("");
      const longName = side(nameP, nameQ);
      const rows: Readout[] = [
        {
          label: "Largest angle",
          tex: `\\angle ${nameR} = ${fmt(largest)}^\\circ`,
          tone: right ? "good" : "plain",
        },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Other two angles",
          tex: `\\angle ${nameP} + \\angle ${nameQ} = ${fmt(atP)}^\\circ + ${fmt(atQ)}^\\circ = ${fmt(atP + atQ)}^\\circ`,
          tone,
        });
      }
      if (f.step >= 2) {
        // sideP is the side opposite P, so it joins R and Q; likewise sideQ.
        rows.push({
          label: "Squares of the sides",
          tex: `${side(nameR, nameQ)}^2 + ${side(nameR, nameP)}^2 = ${fmt(sq(sideP) + sq(sideQ))},\\quad ${longName}^2 = ${fmt(sq(long))}`,
          tone,
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: `Median to $${longName}$`,
          tex: `${nameR}M = ${fmt(median, 2)},\\quad \\tfrac12 ${longName} = ${fmt(long / 2, 2)}`,
          tone,
        });
      }
      if (f.step >= 4) {
        const place = right ? "on" : largest < 90 ? "outside" : "inside";
        rows.push({
          label: `Circle on diameter $${longName}$`,
          tex: `${nameR} \\text{ is ${place} the circle}`,
          tone,
        });
      }
      return rows;
    },
  };
});
