// Two chords crossing inside a circle cut each other so that the products of
// their pieces agree: AE·EB = CE·ED. Joining the ends makes two triangles with
// equal vertical angles at E and equal inscribed angles on the same arc, so
// they are similar, and the equal ratios rearrange into the equal products.

import { C, tint } from "../draw.ts";
import { dist, fmt, lineLine, toRad, vec, wrapAngle } from "../geo.ts";
import { bearing, nameOutside, ring } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.2);
const R = 3.8;
const GAP = 0.3;

const FIRST = C.gold; // chord AB and triangle EAC's side of the ratios
const SECOND = C.blue; // chord CD
const EQUAL = C.green; // the equal inscribed angles and their arc

export default lesson((s) => {
  // Counter-clockwise order A, C, B, D, so chords AB and CD always cross.
  const [A, ptC, B, D] = ring(s, O, R, [toRad(155), toRad(215), toRad(340), toRad(75)], GAP);

  const measure = () => {
    const E = lineLine(A, B, ptC, D) ?? O;
    return { E, ae: dist(A, E), eb: dist(E, B), ce: dist(ptC, E), ed: dist(E, D) };
  };

  return {
    steps: [
      {
        title: "Crossing chords",
        text: "Drag the four points. Each chord is cut in two at $E$. Multiply the two pieces of one chord, then the two pieces of the other, and compare.",
      },
      {
        title: "Two triangles",
        text: "Join $A$ to $C$ and $D$ to $B$. That makes triangles $EAC$ and $EDB$, one on each side of the crossing.",
      },
      {
        title: "Vertical angles",
        text: "The angles at $E$ are vertical angles, so $\\angle AEC = \\angle DEB$.",
      },
      {
        title: "Angles on the same arc",
        text: "$\\angle CAB$ and $\\angle CDB$ are inscribed angles standing on the same arc $CB$, so they are equal too.",
      },
      {
        title: "Similar triangles",
        text: "Two pairs of equal angles make $\\triangle EAC \\sim \\triangle EDB$, so $\\dfrac{AE}{DE} = \\dfrac{CE}{BE}$. Cross-multiply: $AE \\cdot EB = CE \\cdot ED$.",
      },
    ],

    draw(g, f) {
      const { E, ae, eb, ce, ed } = measure();
      const c = bearing(O, ptC);

      g.circle(O, R, { color: C.dim, width: 2 });
      if (f.at(1) > 0) {
        g.polygon([E, A, ptC], { fill: tint(FIRST, 0.16), stroke: null, alpha: f.at(1) });
        g.polygon([E, D, B], { fill: tint(SECOND, 0.16), stroke: null, alpha: f.at(1) });
        g.segment(A, ptC, { color: C.dim, width: 2.5, alpha: f.at(1) });
        g.segment(D, B, { color: C.dim, width: 2.5, alpha: f.at(1) });
      }
      if (f.at(3) > 0) {
        g.arc(O, R, c, c + wrapAngle(bearing(O, B) - c), { color: EQUAL, width: 6, alpha: f.at(3) });
        g.angle(ptC, A, B, { color: EQUAL, fill: true, r: 40, arcs: 2, alpha: f.at(3) });
        g.angle(ptC, D, B, { color: EQUAL, fill: true, r: 40, arcs: 2, alpha: f.at(3) });
      }

      g.segment(A, B, { color: FIRST, width: 4 });
      g.segment(ptC, D, { color: SECOND, width: 4 });
      if (f.at(2) > 0) {
        g.angle(A, E, ptC, { color: g.accent, fill: true, r: 24, alpha: f.at(2) });
        g.angle(D, E, B, { color: g.accent, fill: true, r: 24, alpha: f.at(2) });
      }
      g.along(A, E, fmt(ae), { color: FIRST });
      g.along(E, B, fmt(eb), { color: FIRST });
      g.along(ptC, E, fmt(ce), { color: SECOND });
      g.along(E, D, fmt(ed), { color: SECOND });

      g.point(E, { color: C.ink, label: "E" });
      nameOutside(g, O, A, "A");
      nameOutside(g, O, ptC, "C");
      nameOutside(g, O, B, "B");
      nameOutside(g, O, D, "D");
    },

    readout(f) {
      const { ae, eb, ce, ed } = measure();
      const rows: Readout[] = [
        {
          label: "Pieces of chord AB",
          tex: `AE \\cdot EB = (${fmt(ae, 2)})(${fmt(eb, 2)}) = ${fmt(ae * eb, 2)}`,
          tone: "good",
        },
        {
          label: "Pieces of chord CD",
          tex: `CE \\cdot ED = (${fmt(ce, 2)})(${fmt(ed, 2)}) = ${fmt(ce * ed, 2)}`,
          tone: "good",
        },
        { label: "Whole chords", tex: `AB = ${fmt(ae + eb, 2)},\\quad CD = ${fmt(ce + ed, 2)}` },
      ];
      if (f.step >= 4) {
        rows.push({
          label: "Matching sides of the similar triangles",
          tex: `\\frac{AE}{DE} = ${fmt(ae / ed, 2)},\\quad \\frac{CE}{BE} = ${fmt(ce / eb, 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
