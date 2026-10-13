// The angle between a tangent and a chord through the point of contact is
// half the arc the chord cuts off, and so equals any inscribed angle standing
// on that arc.
//
// The proof avoids assuming what it proves. First, every other point of the
// tangent lies outside the circle, so the point of contact is the nearest
// point of the line to the centre and the radius to it is perpendicular.
// Then the diameter through the point of contact makes a right triangle with
// the chord (an angle in a semicircle), and two angles that are both
// complements of the same angle are equal. B is held to the half of the circle
// where the tangent–chord angle is acute, which is the case the diameter
// argument covers; the last step gets the obtuse angle on the other side as
// its supplement.

import { C } from "../draw.ts";
import { angleAt, dist, fmt, lerp, onSegment, polar, toRad, vec, wrapAngle } from "../geo.ts";
import { arcTex, bearing, clampToArc, degTex, nameOutside } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.6);
const R = 3.5;
const GAP = 0.3;
const DOWN = -Math.PI / 2;
const T = polar(O, R, DOWN);
const D = polar(O, R, -DOWN);
// The tangent at T, with S marking the side the chord leans toward.
const LEFT_END = vec(-7.2, T.y);
const RIGHT_END = vec(7.2, T.y);
const S = vec(6.4, T.y);

const ARC = C.gold;
const AUX = C.violet;
const COMPLEMENT = C.green;
const OTHER = C.blue;

export default lesson((s) => {
  const b0 = polar(O, R, toRad(20));
  const p0 = polar(O, R, toRad(150));
  // B stays on the right half, so arc TB is under 180° and ∠STB is acute.
  const B = s.point(b0.x, b0.y, {
    constrain: (p) => polar(O, R, clampToArc(bearing(O, p), DOWN + GAP, Math.PI - 2 * GAP)),
  });
  // P stays on the rest of the circle, between B and T.
  const P = s.point(p0.x, p0.y, {
    constrain: (p) => {
      const from = bearing(O, B) + GAP;
      return polar(O, R, clampToArc(bearing(O, p), from, DOWN + 2 * Math.PI - GAP - from));
    },
  });
  const X = s.point(-4.6, T.y, { label: "X", color: C.red, constrain: onSegment(LEFT_END, RIGHT_END) });

  const measure = () => {
    P.set(P); // B may have moved past it
    return {
      arc: wrapAngle(bearing(O, B) - DOWN),
      theta: angleAt(S, T, B),
      inscribed: angleAt(T, P, B),
    };
  };

  return {
    steps: [
      {
        title: "A tangent and a chord",
        text: "The line touches the circle at $T$. Drag $B$ to swing the chord $TB$, and drag $P$ round the far arc. Compare the angle between tangent and chord with the angle at $P$.",
      },
      {
        title: "Radius meets tangent squarely",
        text: "Slide $X$ along the tangent. Every point of it except $T$ lies outside the circle, so $OX > OT$. $T$ is the nearest point of the line to $O$, and the shortest path to a line is the perpendicular: $OT \\perp TS$.",
      },
      {
        title: "A diameter through T",
        text: "Extend $TO$ to the diameter $TD$ and join $DB$. The angle at $B$ is inscribed in a semicircle, so it is a right angle, and the other two angles of triangle $TBD$ add to $90^\\circ$.",
      },
      {
        title: "Two complements",
        text: "$\\angle BTD$ and $\\angle D$ add to $90^\\circ$. But $\\angle BTD$ and $\\angle STB$ also add to $90^\\circ$, because the diameter is perpendicular to the tangent. So $\\angle STB = \\angle D$.",
      },
      {
        title: "Half the arc",
        text: "$\\angle D$ is inscribed on arc $TB$, so it is half that arc, and so is $\\angle STB$. The angle at $P$ stands on the same arc: tangent–chord angle and inscribed angle are equal.",
      },
      {
        title: "The other side",
        text: "On the other side of the chord the tangent makes the supplement, $180^\\circ - \\angle STB$. That is half of $360^\\circ$ minus arc $TB$: half of the arc on its own side, the same rule again.",
      },
    ],

    draw(g, f) {
      const m = measure();
      X.hidden = f.step < 1;
      X.enabled = !X.hidden;
      // The diameter construction steps aside for the last step.
      const scaffold = (n: number): number => f.at(n) * (1 - f.at(5));

      g.circle(O, R, { color: C.dim, width: 2 });
      g.arc(O, R, DOWN, DOWN + m.arc, { color: ARC, width: 6 });
      g.segment(LEFT_END, RIGHT_END, { width: 2.5 });

      if (f.at(5) > 0) {
        g.arc(O, R, DOWN + m.arc, DOWN + 2 * Math.PI, { color: OTHER, width: 6, alpha: f.at(5) });
        g.angle(B, T, LEFT_END, { color: OTHER, fill: true, r: 30, label: true, alpha: f.at(5) });
      }
      if (f.at(1) > 0) {
        const rim = lerp(O, X, R / Math.max(dist(O, X), R));
        g.segment(O, T, { color: AUX, width: 2.5, alpha: f.at(1) });
        g.angle(O, T, S, { color: AUX, r: 22, alpha: f.at(1) });
        g.segment(O, rim, { color: AUX, width: 2, dash: [6, 5], alpha: f.at(1) });
        g.segment(rim, X, { color: C.red, width: 2.5, alpha: f.at(1) });
      }
      if (scaffold(2) > 0) {
        const alpha = scaffold(2);
        g.segment(O, D, { color: AUX, width: 2.5, alpha });
        g.segment(D, B, { color: AUX, width: 2.5, alpha });
        g.angle(T, B, D, { color: AUX, r: 22, alpha });
        g.angle(B, T, D, { color: COMPLEMENT, fill: true, r: 54, label: true, alpha });
        g.point(D, { color: AUX, alpha });
        nameOutside(g, O, D, "D", { color: AUX, push: 18, alpha });
      }
      if (scaffold(3) > 0) {
        g.angle(T, D, B, { color: g.accent, fill: true, r: 40, label: true, alpha: scaffold(3) });
      }

      g.segment(P, T, { color: C.dim, width: 2 });
      g.segment(P, B, { color: C.dim, width: 2 });
      g.segment(T, B, { color: g.accent, width: 4 });
      g.angle(S, T, B, { color: g.accent, fill: true, r: 40, label: true });
      g.angle(T, P, B, { color: g.accent, fill: true, r: 40, label: true });

      g.point(O, { color: C.ink, label: "O" });
      g.point(T, { color: C.ink });
      g.label(T, "T", { bold: true, dy: -20 });
      g.label(S, "S", { color: C.dim, dy: -18 });
      nameOutside(g, O, B, "B");
      nameOutside(g, O, P, "P");
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        { label: "Arc cut off by the chord", tex: `${arcTex("TB")} = ${degTex(m.arc)}` },
        { label: "Tangent–chord angle", tex: `\\angle STB = ${degTex(m.theta)}` },
        { label: "Inscribed angle on the arc", tex: `\\angle TPB = ${degTex(m.inscribed)}` },
        { label: "Half the arc", tex: `\\tfrac12\\,${arcTex("TB")} = ${degTex(m.arc / 2)}`, tone: "good" },
      ];
      if (f.step === 1) {
        rows.push({
          label: "T is nearest to O",
          tex: `OX = ${fmt(dist(O, X), 2)} \\ge OT = ${fmt(R, 2)}`,
        });
      }
      if (f.step === 2 || f.step === 3) {
        const atT = angleAt(B, T, D);
        const atD = angleAt(T, D, B);
        rows.push({
          label: "Right triangle TBD",
          tex: `\\angle BTD + \\angle D = ${degTex(atT)} + ${degTex(atD)} = ${degTex(atT + atD)}`,
        });
      }
      if (f.step === 3) {
        rows.push({
          label: "Diameter ⟂ tangent",
          tex: `\\angle BTD + \\angle STB = ${degTex(angleAt(B, T, D) + m.theta)}`,
        });
      }
      if (f.step === 5) {
        rows.push(
          { label: "Angle on the other side", tex: `180^\\circ - ${degTex(m.theta)} = ${degTex(Math.PI - m.theta)}` },
          {
            label: "Half the other arc",
            tex: `\\tfrac12(360^\\circ - ${degTex(m.arc)}) = ${degTex(Math.PI - m.arc / 2)}`,
            tone: "good",
          },
        );
      }
      return rows;
    },
  };
});
