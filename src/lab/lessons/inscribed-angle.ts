// An inscribed angle is half the central angle standing on the same arc. The
// proof draws the diameter through the vertex: each side of it holds an
// isosceles triangle of two radii, whose exterior angle at the centre is twice
// its base angle. The two halves add when the diameter runs inside the angle
// and subtract when it runs outside, so the result holds wherever the vertex
// is dragged — and every vertex on the same side sees the same angle.

import { C } from "../draw.ts";
import { angleAt, fmtDeg, polar, TAU, toRad, vec, wrapAngle } from "../geo.ts";
import { arcTex, bearing, degTex, nameOutside, ring } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.2);
const R = 3.8;
const GAP = 0.3;
// Where along the vertex's arc the comparison vertices of the last step sit.
const GHOSTS = [0.22, 0.78];

const ARC = C.gold;
const LEFT = C.green;
const RIGHT = C.pink;
const AUX = C.violet;

export default lesson((s) => {
  // Counter-clockwise order A, B, P: the angle at P stands on the arc from A round to B.
  const [A, B, P] = ring(s, O, R, [toRad(215), toRad(325), toRad(100)], GAP);

  const measure = () => {
    const a = bearing(O, A);
    const b = bearing(O, B);
    const arc = wrapAngle(b - a);
    const D = polar(O, R, bearing(O, P) + Math.PI);
    return {
      a,
      b,
      arc,
      D,
      alpha: angleAt(A, P, D),
      beta: angleAt(B, P, D),
      // Whether the diameter PD passes between PA and PB.
      between: wrapAngle(bearing(O, D) - a) < arc,
      inscribed: angleAt(A, P, B),
    };
  };

  return {
    steps: [
      {
        title: "An angle on an arc",
        text: "Drag $P$ around the circle, then move $A$ and $B$ to change the arc. Compare the angle at $P$ with the angle at the centre $O$ that stands on the same arc.",
      },
      {
        title: "A diameter through P",
        text: "Draw the diameter $PD$. It splits the picture in two, and each part holds a triangle made of two radii: $AOP$ on one side, $BOP$ on the other.",
      },
      {
        title: "First isosceles triangle",
        text: "$OA = OP$, so triangle $AOP$ has equal base angles $\\alpha$. Its exterior angle at $O$ is the sum of the two far angles: $\\angle AOD = 2\\alpha$.",
      },
      {
        title: "Second isosceles triangle",
        text: "The other side works the same way. $OB = OP$ gives equal angles $\\beta$, and the exterior angle is $\\angle BOD = 2\\beta$.",
      },
      {
        title: "Add or subtract",
        text: "If the diameter runs between $PA$ and $PB$, add: $\\angle APB = \\alpha + \\beta$ and $\\angle AOB = 2\\alpha + 2\\beta$. If it runs outside, subtract in both instead. Either way the inscribed angle is half the arc.",
      },
      {
        title: "Same arc, same angle",
        text: "The answer never mentioned where $P$ is. Every angle inscribed on this side stands on the same arc, so all of them are equal. Drag $P$ and compare it with the others.",
      },
    ],

    draw(g, f) {
      const m = measure();
      // The proof's scaffolding clears away for the last step.
      const fade = 1 - f.at(5);
      const scaffold = (n: number): number => f.at(n) * fade;
      const numbers = f.step < 2 || f.step === 5;

      g.circle(O, R, { color: C.dim, width: 2 });
      g.arc(O, R, m.a, m.a + m.arc, { color: ARC, width: 6 });
      g.segment(O, A, { color: ARC, width: 2.5 });
      g.segment(O, B, { color: ARC, width: 2.5 });
      g.angleMark(O, m.a, m.a + m.arc, {
        color: ARC,
        fill: true,
        r: 26,
        label: numbers ? fmtDeg(m.arc, 1) : undefined,
      });

      if (f.at(5) > 0) {
        for (const t of GHOSTS) {
          const Q = polar(O, R, m.b + t * (TAU - m.arc));
          g.segment(Q, A, { color: C.dim, width: 1.5, alpha: f.at(5) });
          g.segment(Q, B, { color: C.dim, width: 1.5, alpha: f.at(5) });
          g.angle(A, Q, B, {
            color: g.accent,
            r: 30,
                label: fmtDeg(angleAt(A, Q, B), 1),
            alpha: f.at(5),
          });
          g.point(Q, { color: g.accent, r: 3.5, alpha: f.at(5) });
        }
      }

      if (scaffold(1) > 0) {
        g.segment(P, m.D, { color: AUX, width: 2, dash: [7, 6], alpha: scaffold(1) });
        g.point(m.D, { color: AUX, alpha: scaffold(1) });
        nameOutside(g, O, m.D, "D", { color: AUX, push: 18, alpha: scaffold(1) });
      }
      if (scaffold(2) > 0) {
        const alpha = scaffold(2);
        g.ticks(O, A, 1, { color: LEFT, alpha });
        g.ticks(O, P, 1, { color: LEFT, alpha });
        g.angle(A, P, O, { color: LEFT, r: 54, label: "α", alpha });
        g.angle(P, A, O, { color: LEFT, r: 30, label: "α", alpha });
        g.angle(A, O, m.D, { color: LEFT, r: 40, label: "2α", alpha });
      }
      if (scaffold(3) > 0) {
        const alpha = scaffold(3);
        g.ticks(O, B, 1, { color: RIGHT, alpha });
        g.angle(B, P, O, { color: RIGHT, r: 64, label: "β", alpha });
        g.angle(P, B, O, { color: RIGHT, r: 30, label: "β", alpha });
        g.angle(B, O, m.D, { color: RIGHT, r: 48, label: "2β", alpha });
      }

      g.segment(P, A);
      g.segment(P, B);
      g.angle(A, P, B, {
        color: g.accent,
        fill: true,
        r: 36,
        label: numbers ? fmtDeg(m.inscribed, 1) : undefined,
      });
      g.point(O, { color: C.ink, label: "O" });
      nameOutside(g, O, A, "A");
      nameOutside(g, O, B, "B");
      nameOutside(g, O, P, "P");
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        { label: "Arc, read at the centre", tex: `${arcTex("AB")} = \\angle AOB = ${degTex(m.arc)}` },
        { label: "Inscribed angle", tex: `\\angle APB = ${degTex(m.inscribed)}` },
      ];
      if (f.step >= 2) {
        rows.push({
          label: "Triangle AOP",
          tex: `\\angle AOD = 2\\alpha = 2(${degTex(m.alpha)}) = ${degTex(2 * m.alpha)}`,
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Triangle BOP",
          tex: `\\angle BOD = 2\\beta = 2(${degTex(m.beta)}) = ${degTex(2 * m.beta)}`,
        });
      }
      if (f.step >= 4) {
        const [big, small] = m.alpha >= m.beta ? ["\\alpha", "\\beta"] : ["\\beta", "\\alpha"];
        rows.push(
          m.between
            ? { label: "Diameter inside the angle: add", tex: `\\alpha + \\beta = ${degTex(m.alpha + m.beta)}` }
            : {
                label: "Diameter outside the angle: subtract",
                tex: `${big} - ${small} = ${degTex(Math.abs(m.alpha - m.beta))}`,
              },
        );
      }
      rows.push({ label: "Half the arc", tex: `\\tfrac12\\,${arcTex("AB")} = ${degTex(m.arc / 2)}`, tone: "good" });
      return rows;
    },
  };
});
