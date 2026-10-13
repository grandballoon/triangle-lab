// The power of a point, in one picture. P can be anywhere — inside, on or
// outside the circle — and A spins a line through it. The product PA·PB never
// depends on the line: it is always |d² − r²|, where d is the distance from P
// to the centre. The line through the centre shows which constant it is, and
// one special line (the tangent outside, the halved chord inside) shows it as
// a perfect square.

import { C } from "../draw.ts";
import {
  add,
  dist,
  dot,
  fmt,
  inBox,
  normalize,
  onCircle,
  perp,
  polar,
  scale,
  sub,
  toRad,
  vec,
  type Vec,
} from "../geo.ts";
import { farArc, nameOutside } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0.4, 0.1);
const R = 2.9;
// Within this distance of the circle, P counts as being on it.
const ON_CIRCLE = 0.04;

const FIRST = C.gold; // PA
const SECOND = C.blue; // PB
const CENTRAL = C.violet;
const SPECIAL = C.green;

export default lesson((s) => {
  const P = s.point(1.6, 0.9, { label: "P", constrain: inBox(-7.5, 7.5, -4.6, 4.6) });
  const a0 = polar(O, R, toRad(155));
  const A = s.point(a0.x, a0.y, { color: FIRST, constrain: onCircle(O, R) });

  const measure = () => {
    // The line through A toward P meets the circle again at B (at A itself if it is tangent).
    const u = normalize(sub(P, A));
    const B = sub(A, scale(u, 2 * dot(sub(A, O), u)));
    const d = dist(P, O);
    const out: Vec = d < 1e-9 ? vec(1, 0) : normalize(sub(P, O));
    return {
      u,
      B,
      d,
      out,
      pa: dist(P, A),
      pb: dist(P, B),
      // Distances from P along the line through the centre.
      pm: Math.abs(d - R),
      pn: d + R,
      power: d * d - R * R,
      where: Math.abs(d - R) < ON_CIRCLE ? "on" : d < R ? "inside" : "outside",
    };
  };

  return {
    steps: [
      {
        title: "One point, any line",
        text: "Drag $A$ round the circle to spin the line through $P$; it meets the circle again at $B$. Watch $PA \\cdot PB$. Then drag $P$ somewhere else — inside, outside, onto the circle — and spin again.",
      },
      {
        title: "Why it never changes",
        text: "Add the line through $P$ and the centre, meeting the circle at $M$ and $N$. Inside, two crossing chords have equal products; outside, two secants do. Either way $PA \\cdot PB = PM \\cdot PN$.",
      },
      {
        title: "Which number it is",
        text: "On that central line the distances are easy. With $d = OP$, they are $|d - r|$ and $d + r$, so every line through $P$ gives $PA \\cdot PB = |d^2 - r^2|$.",
      },
      {
        title: "The line that makes a square",
        text: "Outside, the tangent has $A$ and $B$ merged, so $PT^2 = d^2 - r^2$. Inside, the chord perpendicular to $OP$ is halved at $P$, so its half $h$ has $h^2 = r^2 - d^2$. On the circle the product is zero.",
      },
    ],

    draw(g, f) {
      const m = measure();
      const { B } = m;

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(1) > 0) {
        const M = add(O, scale(m.out, R));
        const N = sub(O, scale(m.out, R));
        g.line(N, M, { color: CENTRAL, width: 1.5, dash: [7, 6], alpha: f.at(1) });
        g.point(M, { color: CENTRAL, alpha: f.at(1) });
        g.point(N, { color: CENTRAL, alpha: f.at(1) });
        nameOutside(g, O, M, "M", { color: CENTRAL, push: 18, alpha: f.at(1) });
        nameOutside(g, O, N, "N", { color: CENTRAL, push: 18, alpha: f.at(1) });
      }
      if (f.at(3) > 0 && m.where === "outside") {
        const T = polar(O, R, farArc(P, O, R).from);
        g.segment(P, T, { color: SPECIAL, alpha: f.at(3) });
        g.segment(O, T, { color: SPECIAL, width: 1.5, alpha: f.at(3) });
        g.angle(O, T, P, { color: SPECIAL, r: 16, alpha: f.at(3) });
        g.point(T, { color: SPECIAL, alpha: f.at(3) });
        nameOutside(g, O, T, "T", { color: SPECIAL, push: 18, alpha: f.at(3) });
      }
      if (f.at(3) > 0 && m.where === "inside") {
        const half = scale(perp(m.out), Math.sqrt(Math.max(0, -m.power)));
        g.segment(sub(P, half), add(P, half), { color: SPECIAL, alpha: f.at(3) });
        g.ticks(P, add(P, half), 2, { color: SPECIAL, alpha: f.at(3) });
        g.ticks(P, sub(P, half), 2, { color: SPECIAL, alpha: f.at(3) });
        g.along(P, add(P, half), "h", { color: SPECIAL, alpha: f.at(3) });
      }

      if (m.pa > 1e-6) g.line(A, add(A, m.u), { color: C.dim, width: 1.5 });
      g.segment(P, B, { color: SECOND, width: 5 });
      g.segment(P, A, { color: FIRST, width: 5 });
      g.along(P, A, fmt(m.pa), { color: FIRST });
      g.along(P, B, fmt(m.pb), { color: SECOND, offset: -16 });

      g.point(O, { color: C.ink, label: "O" });
      g.point(B, { color: SECOND });
      nameOutside(g, O, B, "B", { color: SECOND, push: 18 });
      nameOutside(g, O, A, "A", { color: FIRST });
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        {
          label: "Along the line you spin",
          tex: `PA \\cdot PB = (${fmt(m.pa, 2)})(${fmt(m.pb, 2)}) = ${fmt(m.pa * m.pb, 2)}`,
          tone: "good",
        },
        {
          label: "Where P is",
          tex: `d = ${fmt(m.d, 2)},\\ r = ${fmt(R, 2)}:\\ \\text{${m.where === "on" ? "on the circle" : m.where}}`,
        },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Along the line through the centre",
          tex: `PM \\cdot PN = (${fmt(m.pm, 2)})(${fmt(m.pn, 2)}) = ${fmt(m.pm * m.pn, 2)}`,
          tone: "good",
        });
      }
      rows.push({
        label: "The constant",
        tex: `|d^2 - r^2| = |${fmt(m.d * m.d, 2)} - ${fmt(R * R, 2)}| = ${fmt(Math.abs(m.power), 2)}`,
        tone: "good",
      });
      if (f.step >= 3 && m.where !== "on") {
        const root = Math.sqrt(Math.abs(m.power));
        rows.push(
          m.where === "outside"
            ? { label: "Tangent from P", tex: `PT^2 = (${fmt(root, 2)})^2 = ${fmt(root * root, 2)}`, tone: "good" }
            : {
                label: "Half of the shortest chord",
                tex: `h^2 = (${fmt(root, 2)})^2 = ${fmt(root * root, 2)}`,
                tone: "good",
              },
        );
      }
      return rows;
    },
  };
});
