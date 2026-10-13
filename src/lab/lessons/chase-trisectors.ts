// An angle chase. In quadrilateral ABCD the angles at B and C are given and
// the angles at A and D are each trisected, into thirds x and y. The
// trisectors nearest AD meet at E, the next pair at F.
//
// The quadrilateral's angles give 3x + 3y = 360° − ∠B − ∠C. Triangle AED has
// angles x and y on AD, so ∠AED = 180° − (x + y); triangle AFD has 2x and 2y,
// so ∠AFD = 180° − 2(x + y). Neither depends on where A and D sit.

import { C, tint } from "../draw.ts";
import {
  angleAt, angleOf, clamp, cross, dist, fmt, lineLine, onSegment, polar, sub, toDeg, toRad, vec, type Vec,
} from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const B = vec(-2.5, 3.4);
const Cc = vec(2.5, 3.4);
// With both given angles at least 80°, sides BA and CD this short cannot
// cross, so the quadrilateral is always convex.
const MIN_SIDE = 3.5;
const MAX_SIDE = 6.6;
const MIN_GIVEN = 80;
const MAX_GIVEN = 130;

const THIRD_A = C.gold;
const THIRD_D = C.blue;
const NEAR = C.pink;
const FAR = C.green;
const WHOLE = C.orange;

export default lesson((s) => {
  const degrees = (v: number): string => `${v}°`;
  const givenB = s.slider({
    label: "∠B =", at: vec(-7.4, -4.3), width: 4, min: MIN_GIVEN, max: MAX_GIVEN, value: 110, step: 1, format: degrees,
  });
  const givenC = s.slider({
    label: "∠C =", at: vec(3.4, -4.3), width: 4, min: MIN_GIVEN, max: MAX_GIVEN, value: 100, step: 1, format: degrees,
  });
  // Directions of sides BA and CD, fixed by the given angles.
  const towardA = (): number => -toRad(givenB.value);
  const towardD = (): number => Math.PI + toRad(givenC.value);
  const rail = (from: Vec, direction: () => number) =>
    onSegment(() => polar(from, MIN_SIDE, direction()), () => polar(from, MAX_SIDE, direction()));

  const startA = polar(B, 5.4, towardA());
  const startD = polar(Cc, 5.4, towardD());
  const A = s.point(startA.x, startA.y, { label: "A", constrain: rail(B, towardA) });
  const D = s.point(startD.x, startD.y, { label: "D", constrain: rail(Cc, towardD) });

  // When a slider turns a side, carry its endpoint round at the same length.
  const follow = (h: Vec, from: Vec, direction: number): void => {
    const p = polar(from, clamp(dist(from, h), MIN_SIDE, MAX_SIDE), direction);
    h.x = p.x;
    h.y = p.y;
  };

  const figure = () => {
    follow(A, B, towardA());
    follow(D, Cc, towardD());
    const x = angleAt(D, A, B) / 3;
    const y = angleAt(A, D, Cc) / 3;
    // Trisectors are counted from side AD, turning toward AB and toward DC.
    const turnA = Math.sign(cross(sub(D, A), sub(B, A))) * x;
    const turnD = Math.sign(cross(sub(A, D), sub(Cc, D))) * y;
    const fromA = (k: number): Vec => polar(A, 1, angleOf(sub(D, A)) + k * turnA);
    const fromD = (k: number): Vec => polar(D, 1, angleOf(sub(A, D)) + k * turnD);
    return {
      x,
      y,
      fromA,
      fromD,
      E: lineLine(A, fromA(1), D, fromD(1)),
      F: lineLine(A, fromA(2), D, fromD(2)),
    };
  };

  return {
    steps: [
      {
        title: "The puzzle",
        text: "The sliders fix the angles at $B$ and $C$. The angles at $A$ and $D$ are each cut into three equal parts, and matching cuts meet at $E$ and $F$. Drag $A$ and $D$: those two angles refuse to change. Why?",
      },
      {
        title: "Angles of a quadrilateral",
        text: "The four angles of $ABCD$ sum to $360^\\circ$, so the two we were not told are known together: $\\angle A + \\angle D = 360^\\circ - \\angle B - \\angle C$.",
      },
      {
        title: "Trisected angles",
        text: "Call each third at $A$ $x$ and each third at $D$ $y$. Then $\\angle A = 3x$ and $\\angle D = 3y$, so $x + y$ is a third of that sum — even though $x$ and $y$ separately are unknown.",
      },
      {
        title: "Angles of a triangle",
        text: "Triangle $AED$ has angle $x$ at $A$ and angle $y$ at $D$. Its angles sum to $180^\\circ$, so $\\angle AED = 180^\\circ - (x + y)$.",
      },
      {
        title: "Angles of a triangle, again",
        text: "Triangle $AFD$ has two thirds at each end: $2x$ at $A$ and $2y$ at $D$. So $\\angle AFD = 180^\\circ - 2(x + y)$. Only $\\angle B$ and $\\angle C$ ever mattered.",
      },
    ],

    draw(g, f) {
      const { fromA, fromD, E, F } = figure();
      if (!E || !F) return;

      g.polygon([A, B, Cc, D], { fill: "rgba(255, 255, 255, 0.05)" });
      if (f.at(3) > 0) g.polygon([A, E, D], { fill: tint(NEAR, 0.22), stroke: null, alpha: f.at(3) });
      if (f.at(4) > 0) g.polygon([A, F, D], { fill: tint(FAR, 0.14), stroke: null, alpha: f.at(4) });

      g.path([A, F, D], { color: FAR, width: 2.5 });
      g.path([A, E, D], { color: NEAR, width: 2.5 });

      g.angle(A, B, Cc, { color: C.ink, r: 24, label: true, square: false });
      g.angle(B, Cc, D, { color: C.ink, r: 24, label: true, square: false });
      if (f.at(1) > 0) {
        g.angle(D, A, B, { color: WHOLE, r: 58, width: 3, square: false, alpha: f.at(1) });
        g.angle(A, D, Cc, { color: WHOLE, r: 58, width: 3, square: false, alpha: f.at(1) });
      }
      for (let k = 0; k < 3; k++) {
        const named = f.step >= 2;
        g.angle(fromA(k), A, fromA(k + 1), { color: THIRD_A, r: 36, width: 2, square: false, label: named && "x" });
        g.angle(fromD(k), D, fromD(k + 1), { color: THIRD_D, r: 36, width: 2, square: false, label: named && "y" });
      }
      g.angle(A, E, D, { color: NEAR, r: 22, fill: true, label: true, square: false });
      g.angle(A, F, D, { color: FAR, r: 22, fill: true, label: true, square: false });

      g.point(B, { label: "B" });
      g.point(Cc, { label: "C" });
      g.label(E, "E", { color: NEAR, dy: 16, bold: true });
      g.label(F, "F", { color: FAR, dy: 16, bold: true });
    },

    readout(f) {
      const { x, y, E, F } = figure();
      if (!E || !F) return [];
      const b = givenB.value;
      const c = givenC.value;
      const rest = 360 - b - c;
      const third = rest / 3;
      const agrees = (a: number, degreesExpected: number): "good" | "warn" =>
        Math.abs(toDeg(a) - degreesExpected) < 1e-6 ? "good" : "warn";
      const rows: Readout[] = [
        { label: "Free to change", tex: `\\angle A = ${fmt(toDeg(3 * x))}^\\circ,\\quad \\angle D = ${fmt(toDeg(3 * y))}^\\circ` },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "∠A + ∠D",
          tex: `360^\\circ - ${b}^\\circ - ${c}^\\circ = ${rest}^\\circ`,
          tone: agrees(3 * x + 3 * y, rest),
        });
      }
      if (f.step >= 2) rows.push({ label: "One third of each", tex: `x + y = \\tfrac{${rest}^\\circ}{3} = ${fmt(third)}^\\circ` });
      if (f.step >= 3) {
        rows.push({
          label: `At E, measured ${fmt(toDeg(angleAt(A, E, D)))}°`,
          tex: `180^\\circ - ${fmt(third)}^\\circ = ${fmt(180 - third)}^\\circ`,
          tone: agrees(angleAt(A, E, D), 180 - third),
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: `At F, measured ${fmt(toDeg(angleAt(A, F, D)))}°`,
          tex: `180^\\circ - 2(${fmt(third)}^\\circ) = ${fmt(180 - 2 * third)}^\\circ`,
          tone: agrees(angleAt(A, F, D), 180 - 2 * third),
        });
      }
      return rows;
    },
  };
});
