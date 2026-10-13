// Two chords crossing inside a circle make an angle equal to half the sum of
// the two arcs it and its vertical angle cut off. Joining one endpoint of each
// chord makes a small triangle whose two far angles are inscribed angles on
// those arcs, and the angle between the chords is its exterior angle.

import { C, tint } from "../draw.ts";
import { add, angleAt, lineLine, normalize, sub, toRad, vec, wrapAngle } from "../geo.ts";
import { arcTex, bearing, degTex, nameOutside, ring } from "../kit/circle-angles.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.2);
const R = 3.8;
const GAP = 0.3;

const NEAR = C.gold; // arc AC and the inscribed angle standing on it
const FAR = C.blue; // arc BD and the inscribed angle standing on it
const AUX = C.violet;

export default lesson((s) => {
  // Counter-clockwise order A, C, B, D, so chords AB and CD always cross.
  const [A, ptC, B, D] = ring(s, O, R, [toRad(160), toRad(250), toRad(330), toRad(80)], GAP);

  const measure = () => {
    const a = bearing(O, A);
    const b = bearing(O, B);
    return {
      a,
      b,
      E: lineLine(A, B, ptC, D) ?? O,
      arcAC: wrapAngle(bearing(O, ptC) - a),
      arcBD: wrapAngle(bearing(O, D) - b),
    };
  };

  return {
    steps: [
      {
        title: "Two chords, two arcs",
        text: "Drag the four points. The chords cross at $E$; the angle there and the angle opposite it cut off the two coloured arcs. Compare $\\angle AEC$ with those arcs.",
      },
      {
        title: "Join A to D",
        text: "One extra chord, $AD$, makes the small triangle $AED$. Its angles at $A$ and $D$ are both inscribed angles of the circle.",
      },
      {
        title: "Two inscribed angles",
        text: "An inscribed angle is half its arc. The angle at $D$ stands on arc $AC$, so it is half of it; the angle at $A$ stands on arc $BD$, so it is half of that.",
      },
      {
        title: "An exterior angle",
        text: "$\\angle AEC$ is an exterior angle of triangle $AED$, so it equals the two far angles together: half of arc $AC$ plus half of arc $BD$.",
      },
    ],

    draw(g, f) {
      const m = measure();

      g.circle(O, R, { color: C.dim, width: 2 });
      g.arc(O, R, m.a, m.a + m.arcAC, { color: NEAR, width: 6 });
      g.arc(O, R, m.b, m.b + m.arcBD, { color: FAR, width: 6 });

      if (f.at(1) > 0) {
        g.polygon([A, m.E, D], { fill: tint(AUX, 0.14), stroke: null, alpha: f.at(1) });
        g.segment(A, D, { color: AUX, width: 2.5, dash: [7, 6], alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        g.angle(ptC, D, A, { color: NEAR, fill: true, r: 44, label: true, alpha: f.at(2) });
        g.angle(B, A, D, { color: FAR, fill: true, r: 44, label: true, alpha: f.at(2) });
      }

      g.segment(A, B);
      g.segment(ptC, D);
      g.angle(A, m.E, ptC, { color: g.accent, fill: true, r: 30, label: true });
      g.angle(B, m.E, D, { color: g.accent, r: 30 });
      g.point(m.E, { color: C.ink });
      // E's name goes in the quarter between EC and EB, which stays empty.
      const gapDir = normalize(add(normalize(sub(ptC, m.E)), normalize(sub(B, m.E))));
      g.label(m.E, "E", { bold: true, dx: gapDir.x * 22, dy: gapDir.y * 22 });
      nameOutside(g, O, A, "A");
      nameOutside(g, O, ptC, "C");
      nameOutside(g, O, B, "B");
      nameOutside(g, O, D, "D");
    },

    readout(f) {
      const m = measure();
      const rows: Readout[] = [
        { label: "Arc cut off by the angle", tex: `${arcTex("AC")} = ${degTex(m.arcAC)}` },
        { label: "Arc cut off opposite it", tex: `${arcTex("BD")} = ${degTex(m.arcBD)}` },
      ];
      if (f.step >= 2) {
        rows.push(
          { label: "Inscribed at D", tex: `\\angle CDA = ${degTex(angleAt(ptC, D, A))}` },
          { label: "Inscribed at A", tex: `\\angle BAD = ${degTex(angleAt(B, A, D))}` },
        );
      }
      rows.push(
        { label: "Angle between the chords", tex: `\\angle AEC = ${degTex(angleAt(A, m.E, ptC))}` },
        {
          label: "Half the sum of the arcs",
          tex: `\\tfrac12(${degTex(m.arcAC)} + ${degTex(m.arcBD)}) = ${degTex((m.arcAC + m.arcBD) / 2)}`,
          tone: "good",
        },
      );
      return rows;
    },
  };
});
