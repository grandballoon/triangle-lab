// An angle chase. Four equal links zigzag between the sides of an angle at B:
// BQ = QP = PA = AC, with Q and A on one side, P and C on the other. If
// triangle ABC is isosceles (BA = BC), how big is the angle at B?
//
// Writing b for the angle at B, isosceles triangles and exterior angles give
// b at P, 2b at Q and A, and 3b at P and C. BA = BC then makes the angle at A
// equal to 3b as well, so b + 3b + 3b = 180° and b = 180°/7.
//
// The k-th point of such a zigzag lies at distance d·sin(kb)/sin(b) from B
// (d the link length), which is how the figure is built for any b.

import { C, tint } from "../draw.ts";
import { angleAt, dist, fmt, mix, polar, toDeg, toRad, vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const B = vec(-7, 0.3);
const LONGER_LEG = 12.6;
const ANSWER = Math.PI / 7;
// Below 30° the links reach outward in order (Q before A, P before C).
const MIN_DEG = 18;
const MAX_DEG = 29;
/** The slider settles on the exact answer when it comes this close. */
const MAGNET = toRad(0.25);

const LINK = C.gold;
const ONE = C.blue;
const TWO = C.green;
const THREE = C.pink;

export default lesson((s) => {
  const apex = s.slider({
    label: "angle at B",
    at: vec(-7.4, -4.3),
    width: 5,
    min: MIN_DEG,
    max: MAX_DEG,
    value: 21,
    format: () => "",
  });

  const figure = (settle: number) => {
    const chosen = toRad(apex.value);
    const picked = Math.abs(chosen - ANSWER) < MAGNET ? ANSWER : chosen;
    const b = mix(picked, ANSWER, settle);
    const link = (LONGER_LEG * Math.sin(b)) / Math.max(Math.sin(3 * b), Math.sin(4 * b));
    const at = (k: number) => polar(B, (link * Math.sin(k * b)) / Math.sin(b), k % 2 ? b / 2 : -b / 2);
    return { b, Q: at(1), P: at(2), A: at(3), Cc: at(4) };
  };

  return {
    steps: [
      {
        title: "The puzzle",
        text: "Four equal gold links zigzag out from $B$: $BQ = QP = PA = AC$. Slide the angle at $B$ until triangle $ABC$ is isosceles, with $BA = BC$. Exactly what angle does that take? Step on to chase it.",
      },
      {
        title: "Isosceles triangle",
        text: "Call the angle at $B$ simply $b$. Since $QB = QP$, triangle $BQP$ is isosceles and its base angles match: $\\angle QPB = b$.",
      },
      {
        title: "Exterior angle",
        text: "$\\angle AQP$ is an exterior angle of triangle $BQP$, so it equals the sum of the two far interior angles: $\\angle AQP = b + b = 2b$.",
      },
      {
        title: "Isosceles triangle again",
        text: "$PQ = PA$ makes triangle $QPA$ isosceles, so the angle at $A$ copies the one at $Q$: $\\angle PAQ = 2b$.",
      },
      {
        title: "Exterior angle again",
        text: "$\\angle APC$ is an exterior angle of triangle $ABP$, whose far interior angles are $b$ at $B$ and $2b$ at $A$: $\\angle APC = b + 2b = 3b$.",
      },
      {
        title: "One more isosceles triangle",
        text: "$AP = AC$ makes triangle $PAC$ isosceles, so the angle at $C$ copies the one at $P$: $\\angle ACB = 3b$. All of this holds wherever the slider is.",
      },
      {
        title: "Angles of a triangle",
        text: "Now use $BA = BC$: the base angles of triangle $ABC$ match, so $\\angle BAC = 3b$ too. Its three angles give $b + 3b + 3b = 180^\\circ$, so $b = \\tfrac{180^\\circ}{7} \\approx 25.7^\\circ$ — the figure settles there.",
      },
    ],

    draw(g, f) {
      const { Q, P, A, Cc } = figure(f.at(6));
      // The slider has nothing to say once the last step fixes the angle.
      apex.knob.enabled = f.step < 6;
      const now = (n: number): number => (f.step === n ? f.at(n) : 0);

      g.polygon([B, Q, P], { fill: tint(ONE, 0.2), stroke: null, alpha: now(1) + now(2) });
      g.polygon([Q, P, A], { fill: tint(TWO, 0.2), stroke: null, alpha: now(3) });
      g.polygon([B, P, A], { fill: tint(THREE, 0.14), stroke: null, alpha: now(4) });
      g.polygon([P, A, Cc], { fill: tint(THREE, 0.2), stroke: null, alpha: now(5) });
      g.polygon([B, A, Cc], { fill: tint(g.accent, 0.12), stroke: null, alpha: f.step === 0 ? 1 : now(6) });

      g.segment(B, A);
      g.segment(B, Cc);
      for (const [p, q] of [[B, Q], [Q, P], [P, A], [A, Cc]]) {
        g.segment(p, q, { color: LINK, width: 4 });
        g.ticks(p, q, 1, { color: LINK });
      }

      g.angle(A, B, Cc, { color: ONE, r: 64, label: f.step === 0 ? "?" : "b" });
      if (f.at(1) > 0) g.angle(Q, P, B, { color: ONE, r: 34, label: "b", alpha: f.at(1) });
      if (f.at(2) > 0) g.angle(A, Q, P, { color: TWO, r: 26, label: "2b", alpha: f.at(2) });
      if (f.at(3) > 0) g.angle(Q, A, P, { color: TWO, r: 30, label: "2b", alpha: f.at(3) });
      if (f.at(4) > 0) g.angle(A, P, Cc, { color: THREE, r: 24, label: "3b", alpha: f.at(4) });
      if (f.at(5) > 0) g.angle(A, Cc, P, { color: THREE, r: 24, label: "3b", alpha: f.at(5) });
      if (f.at(6) > 0) g.angle(B, A, Cc, { color: THREE, r: 52, label: "3b", alpha: f.at(6) });

      g.point(B, { label: "B" });
      g.point(Q, { label: "Q" });
      g.point(A, { label: "A" });
      g.label(P, "P", { dx: 4, dy: -20 });
      g.point(P);
      g.label(Cc, "C", { dx: 12, dy: -16 });
      g.point(Cc);
    },

    readout(f) {
      const { b, Q, P, A, Cc } = figure(f.at(6));
      const deg = (a: number): string => `${fmt(toDeg(a), 1)}^\\circ`;
      const isosceles = Math.abs(dist(B, A) - dist(B, Cc)) < 1e-6;
      const rows: Readout[] = [
        {
          label: isosceles ? "Legs — isosceles" : "Legs — not isosceles yet",
          tex: `BA = ${fmt(dist(B, A), 2)},\\quad BC = ${fmt(dist(B, Cc), 2)}`,
          tone: isosceles ? "good" : "warn",
        },
      ];
      if (f.step >= 1) rows.push({ label: "At P", tex: `\\angle QPB = b = ${deg(angleAt(Q, P, B))}` });
      if (f.step >= 2) rows.push({ label: "At Q (and at A)", tex: `\\angle AQP = 2b = ${deg(angleAt(A, Q, P))}` });
      if (f.step >= 4) rows.push({ label: "At P (and at C)", tex: `\\angle APC = 3b = ${deg(angleAt(A, P, Cc))}` });
      if (f.step >= 6) {
        const solved = Math.abs(7 * b - Math.PI) < 1e-9;
        rows.push(
          { label: "At A, matching C", tex: `\\angle BAC = 3b = ${deg(angleAt(B, A, Cc))}`, tone: solved ? "good" : "plain" },
          { label: "Triangle ABC", tex: `b + 3b + 3b = 7b = ${deg(7 * b)}`, tone: solved ? "good" : "warn" },
        );
      }
      return rows;
    },
  };
});
