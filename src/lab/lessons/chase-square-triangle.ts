// An angle chase. Equilateral triangle ABE stands on side AB of square ABCD,
// outside it. AE = AB = AD makes triangle AED isosceles with apex
// 90° + 60° = 150°, so ∠AED = 15° and ∠BED = 60° − 15° = 45°.
//
// With the triangle folded inside the square the apex is 90° − 60° = 30°, so
// ∠AED = 75°, and now EA lies between ED and EB: ∠BED = 60° + 75° = 135°.

import { C, tint } from "../draw.ts";
import { add, angleAt, angleOf, dist, fmt, inRing, mid, polar, scale, sub, toDeg, vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.1);
const MIN_HALF_DIAGONAL = 1.5;
// E reaches (1 + √3)/√2 ≈ 1.93 half-diagonals from O when outside, and stays
// inside the square otherwise, so the square may be larger then.
const MAX_OUTSIDE = 2.2;
const MAX_INSIDE = 3.2;
const QUARTER = Math.PI / 2;

const EQUAL = C.gold;
const SIXTY = C.blue;
const APEX = C.pink;
const BASE = C.green;
const TARGET = C.orange;

export default lesson((s) => {
  const inside = s.toggle("Triangle inside the square");
  const D = s.point(O.x - 1.4, O.y + 1.4, {
    label: "D",
    constrain: inRing(O, MIN_HALF_DIAGONAL, () => (inside.on ? MAX_INSIDE : MAX_OUTSIDE)),
  });

  const figure = () => {
    D.set(D); // the allowed size changes with the toggle
    const half = dist(O, D);
    const turn = angleOf(sub(D, O));
    const [A, B, Cc] = [1, 2, 3].map((k) => polar(O, half, turn + k * QUARTER));
    const M = mid(A, B);
    const height = (dist(A, B) * Math.sqrt(3)) / 2;
    const outward = scale(sub(M, O), 1 / dist(M, O));
    const E = add(M, scale(outward, inside.on ? -height : height));
    return { A, B, Cc, E };
  };

  return {
    steps: [
      {
        title: "The puzzle",
        text: "Equilateral triangle $ABE$ sits on side $AB$ of square $ABCD$. Drag $D$ to turn and resize the figure. How big are $\\angle AED$ and $\\angle BED$? Then flip the triangle inside the square and chase again.",
      },
      {
        title: "Equilateral triangle",
        text: "All three sides of triangle $ABE$ are equal and all three angles are $60^\\circ$. In particular $AE = AB$ and $\\angle EAB = \\angle AEB = 60^\\circ$.",
      },
      {
        title: "Square",
        text: "In the square $AD = AB$ and $\\angle DAB = 90^\\circ$. So $AE = AD$, and the angle between them is $\\angle EAD = 90^\\circ + 60^\\circ = 150^\\circ$ (triangle inside: $90^\\circ - 60^\\circ = 30^\\circ$).",
      },
      {
        title: "Isosceles triangle",
        text: "Triangle $AED$ has $AE = AD$, so its base angles are equal and share what the apex leaves: $\\angle AED = \\tfrac12(180^\\circ - 150^\\circ) = 15^\\circ$ (inside: $\\tfrac12(180^\\circ - 30^\\circ) = 75^\\circ$).",
      },
      {
        title: "Angles side by side",
        text: "Outside, $ED$ runs between $EA$ and $EB$, so $\\angle BED = 60^\\circ - 15^\\circ = 45^\\circ$. Inside, $EA$ runs between $ED$ and $EB$, so $\\angle BED = 60^\\circ + 75^\\circ = 135^\\circ$.",
      },
    ],

    draw(g, f) {
      const { A, B, Cc, E } = figure();
      const square = [A, B, Cc, D];

      g.polygon(square, { fill: "rgba(255, 255, 255, 0.05)" });
      g.polygon([A, B, E], { fill: tint(SIXTY, f.step === 1 ? 0.25 : 0.1), color: C.ink });
      if (f.at(3) > 0) g.polygon([A, E, D], { fill: tint(APEX, 0.2), stroke: null, alpha: f.at(3) });
      g.segment(E, D, { color: g.accent });
      if (f.at(4) > 0) g.segment(E, B, { color: TARGET, width: 4, alpha: f.at(4) });

      square.forEach((p, i) => g.ticks(p, square[(i + 1) % 4], 1, { color: EQUAL }));
      g.ticks(A, E, 1, { color: EQUAL });
      g.ticks(B, E, 1, { color: EQUAL });
      if (f.at(2) > 0) {
        g.segment(A, E, { color: EQUAL, width: 4.5, alpha: f.at(2) });
        g.segment(A, D, { color: EQUAL, width: 4.5, alpha: f.at(2) });
      }

      if (f.at(1) > 0) {
        g.angle(E, A, B, { color: SIXTY, r: 30, label: true, alpha: f.at(1) });
        g.angle(A, E, B, { color: SIXTY, r: 30, label: f.step < 3, alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        g.angle(D, A, B, { color: C.ink, r: 18, width: 2, alpha: f.at(2) });
        g.angle(E, A, D, { color: APEX, r: 46, label: true, alpha: f.at(2) });
      }
      if (f.at(3) > 0) {
        g.angle(A, E, D, { color: BASE, r: 50, label: f.step === 3, fill: true, alpha: f.at(3) });
        g.angle(A, D, E, { color: BASE, r: 50, label: true, fill: true, alpha: f.at(3) });
      }
      if (f.at(4) > 0) g.angle(B, E, D, { color: TARGET, r: 68, label: true, alpha: f.at(4) });

      g.point(A, { label: "A" });
      g.point(B, { label: "B" });
      g.point(Cc, { label: "C" });
      g.point(E, { label: "E" });
    },

    readout(f) {
      const { A, B, E } = figure();
      const measured = (a: number): string => `measured ${fmt(toDeg(a))}°`;
      const apex = inside.on ? 30 : 150;
      const base = (180 - apex) / 2;
      const target = inside.on ? 60 + base : 60 - base;
      const matches = (a: number, degrees: number): "good" | "warn" => (Math.abs(toDeg(a) - degrees) < 1e-6 ? "good" : "warn");
      const rows: Readout[] = [
        { label: "Equal lengths", tex: `AB = AD = AE = ${fmt(dist(A, B), 2)}` },
      ];
      if (f.step >= 1) {
        rows.push({
          label: `Equilateral, ${measured(angleAt(A, E, B))}`,
          tex: "\\angle EAB = \\angle AEB = 60^\\circ",
          tone: matches(angleAt(A, E, B), 60),
        });
      }
      if (f.step >= 2) {
        rows.push({
          label: `Apex, ${measured(angleAt(E, A, D))}`,
          tex: `\\angle EAD = 90^\\circ ${inside.on ? "-" : "+"} 60^\\circ = ${apex}^\\circ`,
          tone: matches(angleAt(E, A, D), apex),
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: `Base angle, ${measured(angleAt(A, E, D))}`,
          tex: `\\angle AED = \\tfrac12(180^\\circ - ${apex}^\\circ) = ${base}^\\circ`,
          tone: matches(angleAt(A, E, D), base),
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: `Answer, ${measured(angleAt(B, E, D))}`,
          tex: `\\angle BED = 60^\\circ ${inside.on ? "+" : "-"} ${base}^\\circ = ${target}^\\circ`,
          tone: matches(angleAt(B, E, D), target),
        });
      }
      return rows;
    },
  };
});
