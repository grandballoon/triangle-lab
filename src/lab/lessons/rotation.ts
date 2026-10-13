// A rotation swings every point about a centre O through the same angle θ,
// keeping its distance from O. The learner drags the centre, the triangle and
// the image vertex A′ round its circle. The last two steps prove that three
// points on a line stay on a line, by two pairs of SAS-congruent triangles
// that share the vertex O.

import { C, tint, type Draw } from "../draw.ts";
import {
  angleAt,
  angleOf,
  clamp,
  dist,
  dot,
  fmt,
  inBox,
  lerp,
  lineLine,
  rotateAbout,
  sub,
  TAU,
  toDeg,
  toRad,
  vec,
  wrapAngle,
  type Vec,
} from "../geo.ts";
import {
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  ORIGINAL,
  testTriangle,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const NEAR = C.gold; // the triangles on A's side of P, and the angle ∠OPA
const FAR = C.pink; // the triangles on B's side of P, and the angle ∠OPB
const START_ANGLE = toRad(70);
/** Below this the turn is too small to mark. */
const SMALL_ANGLE = toRad(1);
const STAGE_REACH = { x: 8.5, y: 5.2 };

/** An angle wrapped into (−π, π]: positive counter-clockwise. */
function signedAngle(a: number): number {
  const w = wrapAngle(a);
  return w > Math.PI ? w - TAU : w;
}

export default lesson((s) => {
  // The centre keeps to the left of the triangle, so no vertex can sit on it.
  const O = s.point(-1.5, -2.5, { label: "O", constrain: inBox(-7, 0, -4.3, 3) });
  const [A, B, K] = testTriangle(s, [vec(2, -3.5), vec(4.5, -0.5), vec(1.5, -0.5)], inBox(1, 7.5, -4.3, 3.5));

  // A′ rides the circle through A about O; where it sits on it is the angle.
  let theta = START_ANGLE;
  const start = rotateAbout(A, O, theta);
  const turned = s.point(start.x, start.y, {
    label: "A′",
    color: IMAGE,
    constrain: (p) => {
      theta = signedAngle(angleOf(sub(p, O)) - angleOf(sub(A, O)));
      return rotateAbout(A, O, theta);
    },
  });

  // P rides the side AB, strictly between its ends.
  let along = 0.45;
  const P = s.point(0, 0, {
    label: "P",
    color: C.ink,
    constrain: (p) => {
      const ab = sub(B, A);
      along = clamp(dot(sub(p, A), ab) / dot(ab, ab), 0.25, 0.75);
      return lerp(A, B, along);
    },
  });

  const turn = (p: Vec): Vec => rotateAbout(p, O, theta);
  const original = (): Triple => [A, B, K];
  const where = (): Vec => lerp(A, B, along);

  /** The arc from direction `from`, swept by the signed angle `by`. */
  const sweep = (from: number, by: number): [number, number] => (by >= 0 ? [from, from + by] : [from + by, from]);

  return {
    steps: [
      {
        title: "Turn about a point",
        text: "Drag $A'$ round its circle to set the angle $\\theta$, and drag the centre $O$ and the triangle. The whole figure swings about $O$ like a rigid frame.",
      },
      {
        title: "Same distance, same angle",
        text: "Every point stays as far from $O$ as it was and sweeps the same angle: $OB = OB'$ and $\\angle BOB' = \\theta$, and likewise for $A$ and $C$. Only $O$ itself stays put.",
      },
      {
        title: "Lengths survive, directions turn",
        text: "The image is congruent to the original: $A'B' = AB$. Every direction has turned by $\\theta$, so a line and its image cross at exactly the angle of rotation.",
      },
      {
        title: "Do lines stay lines?",
        text: "Put $P$ on $AB$. Both arms of $\\angle AOP$ turn by $\\theta$, so $\\angle A'OP' = \\angle AOP$; with $OA' = OA$ and $OP' = OP$, SAS gives $\\triangle A'OP' \\cong \\triangle AOP$. Likewise $\\triangle B'OP' \\cong \\triangle BOP$.",
      },
      {
        title: "Still a straight line",
        text: "Congruent triangles give $\\angle OP'A' = \\angle OPA$ and $\\angle OP'B' = \\angle OPB$. At $P$ those two angles make a straight line, so they add to $180^\\circ$ at $P'$ too: $A'$, $P'$, $B'$ are collinear.",
      },
    ],

    draw(g, f) {
      turned.set(turn(A));
      P.enabled = f.step >= 3;
      P.hidden = !P.enabled;
      P.set(where());

      const src = original();
      const img = mapTriple(src, turn);
      const Q = turn(P);
      const marked = Math.abs(theta) > SMALL_ANGLE;
      const exploring = 1 - f.at(3); // the marks of steps 1–2 make way for the proof

      /** A point's two equal spokes and the arc it travels along. */
      const spokes = (p: Vec, q: Vec, ticks: number, alpha: number): void => {
        if (alpha <= 0) return;
        g.arc(O, dist(O, p), ...sweep(angleOf(sub(p, O)), theta), { color: C.dim, width: 1.5, dash: [4, 5], alpha });
        g.segment(O, p, { color: ORIGINAL, width: 2, alpha });
        g.segment(O, q, { color: IMAGE, width: 2, alpha });
        g.ticks(O, p, ticks, { color: ORIGINAL, alpha });
        g.ticks(O, q, ticks, { color: IMAGE, alpha });
      };
      /** The angle a point sweeps at the centre. */
      const swept = (p: Vec, r: number, alpha: number, label?: string): void => {
        if (alpha <= 0 || !marked) return;
        g.angleMark(O, ...sweep(angleOf(sub(p, O)), theta), {
          color: g.accent,
          fill: true,
          r,
          label,
          alpha,
          square: false,
        });
      };

      if (f.at(3) > 0) {
        const alpha = f.at(3);
        const wedge = (a: Vec, b: Vec, color: string): void =>
          g.polygon([O, a, b], { fill: tint(color, 0.2), stroke: null, alpha });
        wedge(A, P, NEAR);
        wedge(img[0], Q, NEAR);
        wedge(B, P, FAR);
        wedge(img[1], Q, FAR);
      }

      drawFigure(g, src, ORIGINAL);
      drawImage(g, img, ["", "B′", "C′"]);

      spokes(A, img[0], 1, 1);
      spokes(B, img[1], 2, f.at(1));
      spokes(K, img[2], 3, f.at(1) * exploring);
      spokes(P, Q, 3, f.at(3));
      swept(A, 30, 1, `θ = ${fmt(toDeg(theta), 0)}°`);
      swept(B, 42, f.at(1) * exploring);
      swept(K, 54, f.at(1) * exploring);

      if (f.step === 2) lineAndImage(g, A, B, img[0], img[1], theta, f.at(2));

      if (f.at(3) > 0) {
        const alpha = f.at(3);
        g.angle(A, O, P, { color: C.green, arcs: 2, r: 52, alpha });
        g.angle(img[0], O, Q, { color: C.green, arcs: 2, r: 52, alpha });
        g.point(Q, { color: C.ink, alpha });
        g.label(Q, "P′", { bold: true, dx: 16, dy: 16, alpha });
      }
      if (f.at(4) > 0) {
        const alpha = f.at(4);
        g.angle(O, P, A, { color: NEAR, fill: true, r: 22, alpha });
        g.angle(O, Q, img[0], { color: NEAR, fill: true, r: 22, alpha });
        g.angle(O, P, B, { color: FAR, fill: true, arcs: 2, r: 22, alpha });
        g.angle(O, Q, img[1], { color: FAR, fill: true, arcs: 2, r: 22, alpha });
      }
    },

    readout(f) {
      const src = original();
      const img = mapTriple(src, turn);
      const way =
        Math.abs(theta) <= SMALL_ANGLE ? "" : theta > 0 ? "\\ \\text{counter-clockwise}" : "\\ \\text{clockwise}";
      const rows: Readout[] = [
        { label: "Angle of rotation", tex: `\\theta = ${fmt(Math.abs(toDeg(theta)), 0)}^\\circ${way}` },
      ];
      const deg = (a: Vec, v: Vec, b: Vec, digits = 0): string => `${fmt(toDeg(angleAt(a, v, b)), digits)}^\\circ`;

      if (f.step < 3) {
        rows.push(
          {
            label: "Distance from the centre",
            tex: `OB = ${fmt(dist(O, B), 2)}, \\quad OB' = ${fmt(dist(O, img[1]), 2)}`,
            tone: "good",
          },
          { label: "Angle swept by B", tex: `\\angle BOB' = ${deg(B, O, img[1])}`, tone: "good" },
          {
            label: "A side and its image",
            tex: `AB = ${fmt(dist(A, B), 2)}, \\quad A'B' = ${fmt(dist(img[0], img[1]), 2)}`,
            tone: "good",
          },
        );
        if (f.step === 2) {
          const between = angleAt(sub(B, A), vec(0, 0), sub(img[1], img[0]));
          rows.push({
            label: "Angle between $AB$ and $A'B'$",
            tex: `${fmt(toDeg(between), 0)}^\\circ = \\theta`,
            tone: "good",
          });
        }
        return rows;
      }

      const where2 = where();
      const Q = turn(where2);
      rows.push(
        {
          label: "Angles at the centre",
          tex: `\\angle AOP = ${deg(A, O, where2)}, \\quad \\angle A'OP' = ${deg(img[0], O, Q)}`,
          tone: "good",
        },
        {
          label: "Sides around them",
          tex: `OP = ${fmt(dist(O, where2), 2)}, \\quad OP' = ${fmt(dist(O, Q), 2)}`,
          tone: "good",
        },
      );
      if (f.step >= 4) {
        const sum = (a: Vec, v: Vec, b: Vec): string =>
          `${deg(O, v, a, 1)} + ${deg(O, v, b, 1)} = ${fmt(toDeg(angleAt(O, v, a) + angleAt(O, v, b)), 1)}^\\circ`;
        rows.push(
          { label: "$\\angle OPA + \\angle OPB$", tex: sum(A, where2, B), tone: "good" },
          { label: "$\\angle OP'A' + \\angle OP'B'$", tex: sum(img[0], Q, img[1]), tone: "good" },
        );
      }
      return rows;
    },
  };
});

/**
 * The whole lines through a side and through its image, with the angle from
 * one to the other marked where they cross — if they cross on the stage.
 */
function lineAndImage(g: Draw, a: Vec, b: Vec, a2: Vec, b2: Vec, theta: number, alpha: number): void {
  g.line(a, b, { color: ORIGINAL, width: 1.5, alpha });
  g.line(a2, b2, { color: IMAGE, width: 1.5, alpha });
  const X = lineLine(a, b, a2, b2);
  if (!X || Math.abs(X.x) > STAGE_REACH.x || Math.abs(X.y) > STAGE_REACH.y) return;
  const from = angleOf(sub(b, a));
  const [lo, hi] = theta >= 0 ? [from, from + theta] : [from + theta, from];
  g.angleMark(X, lo, hi, { color: g.accent, fill: true, r: 30, label: "θ", alpha, square: false });
  g.point(X, { color: g.accent, alpha });
}
