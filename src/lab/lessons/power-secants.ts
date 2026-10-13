// From a point outside a circle, the square of the tangent equals the external
// part of any secant times the whole secant: PT² = PA·PB. The triangles PTA
// and PBT share the angle at P, and the tangent–chord angle at T equals the
// inscribed angle at B on the same arc, so they are similar. Since every
// secant gives the same PT², any two secants give equal products.

import { C, tint } from "../draw.ts";
import { both, dist, fmt, inBox, inRing, polar, toRad, vec, wrapAngle } from "../geo.ts";
import { bearing, farArc, farPair, nameOutside, nearPoint } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(2.4, 0);
const R = 3.1;
const GAP = 0.3;
// How far short of the tangent point the secants' far ends must stop.
const END_GAP = 0.35;

const SECANT = C.gold;
const SECOND = C.pink;
const EQUAL = C.green;
const AUX = C.violet;

export default lesson((s) => {
  // The ring keeps P outside the circle; its inner edge lies inside the box.
  const P = s.point(-6.3, -0.8, { label: "P", constrain: both(inRing(O, R + 1, 30), inBox(-7.5, 7.5, -4.6, 4.6)) });
  const far = farPair(s, P, O, R, [toRad(-50), toRad(35)], GAP, END_GAP);
  // B, on the secant used in the proof, is the one next to the tangent point.
  const [D, B] = far.points;

  const measure = () => {
    far.settle();
    const arc = farArc(P, O, R);
    const tangentAt = arc.from + arc.span;
    const T = polar(O, R, tangentAt);
    const A = nearPoint(P, B, O, R);
    const ptC = nearPoint(P, D, O, R);
    return {
      T,
      A,
      ptC,
      tangentAt,
      pt: dist(P, T),
      pa: dist(P, A),
      pb: dist(P, B),
      pc: dist(P, ptC),
      pd: dist(P, D),
    };
  };

  return {
    steps: [
      {
        title: "A tangent and a secant",
        text: "From $P$ one line touches the circle at $T$ and another cuts through it at $A$ and $B$. Drag $P$ and $B$, and compare $PT^2$ with $PA \\cdot PB$.",
      },
      {
        title: "Two triangles",
        text: "Join $T$ to $A$ and to $B$. Triangles $PTA$ and $PBT$ overlap, and they share the angle at $P$.",
      },
      {
        title: "A tangent–chord angle",
        text: "$\\angle PTA$ lies between the tangent and the chord $TA$, so it is half of arc $TA$. $\\angle PBT$ is inscribed on that same arc, so it is half of it too. The two are equal.",
      },
      {
        title: "Similar triangles",
        text: "Two equal angles give $\\triangle PTA \\sim \\triangle PBT$, so $\\dfrac{PT}{PB} = \\dfrac{PA}{PT}$. Cross-multiply: $PT^2 = PA \\cdot PB$.",
      },
      {
        title: "Any two secants",
        text: "Nothing depended on which secant we drew. A second one, through $C$ and $D$, gives $PC \\cdot PD = PT^2$ as well, so $PA \\cdot PB = PC \\cdot PD$. Drag $D$ to check.",
      },
    ],

    draw(g, f) {
      const m = measure();
      const { T, A, ptC } = m;
      D.hidden = f.step < 4;
      D.enabled = !D.hidden;

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(1) > 0) {
        g.polygon([P, B, T], { fill: tint(AUX, 0.12), stroke: null, alpha: f.at(1) });
        g.polygon([P, T, A], { fill: tint(SECANT, 0.2), stroke: null, alpha: f.at(1) });
        g.segment(T, A, { color: AUX, width: 2.5, alpha: f.at(1) });
        g.segment(T, B, { color: AUX, width: 2.5, alpha: f.at(1) });
        g.angle(T, P, B, { color: g.accent, r: 44, alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        const arcTA = wrapAngle(bearing(O, A) - m.tangentAt);
        g.arc(O, R, m.tangentAt, m.tangentAt + arcTA, { color: EQUAL, width: 6, alpha: f.at(2) });
        g.angle(P, T, A, { color: EQUAL, fill: true, r: 40, arcs: 2, alpha: f.at(2) });
        g.angle(P, B, T, { color: EQUAL, fill: true, r: 40, arcs: 2, alpha: f.at(2) });
      }
      if (f.at(4) > 0) {
        g.ray(P, D, { color: C.dim, width: 1.5, alpha: f.at(4) });
        g.segment(P, D, { color: SECOND, alpha: f.at(4) });
        g.point(ptC, { color: SECOND, alpha: f.at(4) });
        nameOutside(g, O, ptC, "C", { color: SECOND, push: 18, alpha: f.at(4) });
        nameOutside(g, O, D, "D", { color: SECOND, alpha: f.at(4) });
      }

      g.ray(P, T, { color: C.dim, width: 1.5 });
      g.ray(P, B, { color: C.dim, width: 1.5 });
      g.segment(P, B, { color: SECANT });
      g.segment(P, T, { color: g.accent, width: 4 });
      g.along(P, T, fmt(m.pt), { color: g.accent });

      g.point(T, { color: g.accent });
      g.point(A, { color: SECANT });
      nameOutside(g, O, T, "T", { color: g.accent, push: 18 });
      nameOutside(g, O, A, "A", { color: SECANT, push: 18 });
      nameOutside(g, O, B, "B", { color: SECANT });
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        { label: "Tangent, squared", tex: `PT^2 = (${fmt(m.pt, 2)})^2 = ${fmt(m.pt ** 2, 2)}`, tone: "good" },
        {
          label: "External part × whole secant",
          tex: `PA \\cdot PB = (${fmt(m.pa, 2)})(${fmt(m.pb, 2)}) = ${fmt(m.pa * m.pb, 2)}`,
          tone: "good",
        },
        { label: "Chord inside the circle", tex: `AB = PB - PA = ${fmt(m.pb - m.pa, 2)}` },
      ];
      if (f.step >= 3) {
        rows.push({
          label: "Matching sides of the similar triangles",
          tex: `\\frac{PT}{PB} = ${fmt(m.pt / m.pb, 2)},\\quad \\frac{PA}{PT} = ${fmt(m.pa / m.pt, 2)}`,
          tone: "good",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: "The second secant",
          tex: `PC \\cdot PD = (${fmt(m.pc, 2)})(${fmt(m.pd, 2)}) = ${fmt(m.pc * m.pd, 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
