// Your hand as a protractor. With a hand in view, the angle opens between
// thumb and index finger; without one, the three points are draggable. Either
// way the angle is named and measured as it changes.

import { C } from "../draw.ts";
import { angleAt, fmt, inBox, toDeg } from "../geo.ts";
import { lesson } from "../scene.ts";

// MediaPipe landmarks: base of the thumb, tip of the thumb, tip of the index.
const THUMB_BASE = 1;
const THUMB_TIP = 4;
const INDEX_TIP = 8;

const RIGHT_TOLERANCE = 1.5;

function kind(degrees: number): { name: string; color: string } {
  if (Math.abs(degrees - 90) <= RIGHT_TOLERANCE) return { name: "right", color: C.gold };
  if (degrees < 90) return { name: "acute", color: C.green };
  if (degrees >= 180 - RIGHT_TOLERANCE) return { name: "straight", color: C.violet };
  return { name: "obtuse", color: C.red };
}

export default lesson((s) => {
  const box = inBox(-7.5, 7.5, -4.6, 4.6);
  const V = s.point(-2, -1.5, { label: "V", constrain: box });
  const P = s.point(3.5, -1.5, { label: "P", constrain: box });
  const Q = s.point(1, 2.8, { label: "Q", constrain: box });
  const follow = s.toggle("Follow my hand", true);

  return {
    steps: [
      {
        title: "Open and close an angle",
        text: "Hold one hand up to the camera and spread your thumb and index finger: the angle between them is measured live. Open it past a right angle and watch its name change. No camera? Turn off “Follow my hand” and drag the points instead.",
      },
    ],

    draw(g, f) {
      const hand = follow.on ? f.hands[0] : undefined;
      if (hand) {
        V.set(hand.points[THUMB_BASE]);
        P.set(hand.points[THUMB_TIP]);
        Q.set(hand.points[INDEX_TIP]);
      }
      const degrees = toDeg(angleAt(P, V, Q));
      const { name, color } = kind(degrees);

      g.ray(V, P, { color: C.ink });
      g.ray(V, Q, { color: C.ink });
      g.angle(P, V, Q, { color, fill: true, r: 54, label: true });
      g.label(V, name, { color, dy: -30, size: 20, bold: true });
    },

    readout() {
      const radians = angleAt(P, V, Q);
      const degrees = toDeg(radians);
      return [
        { label: "Measure in degrees", tex: `\\angle PVQ = ${fmt(degrees)}^\\circ` },
        {
          label: "Measure in radians",
          tex: `${fmt(degrees)}^\\circ \\cdot \\frac{\\pi}{180^\\circ} = ${fmt(radians, 2)}`,
        },
        { label: "Kind", tex: `\\text{${kind(degrees).name}}` },
        {
          label: "Complement",
          tex: degrees < 90 ? `90^\\circ - ${fmt(degrees)}^\\circ = ${fmt(90 - degrees)}^\\circ` : "\\text{none (not acute)}",
          tone: degrees < 90 ? "plain" : "dim",
        },
        { label: "Supplement", tex: `180^\\circ - ${fmt(degrees)}^\\circ = ${fmt(180 - degrees)}^\\circ` },
      ];
    },
  };
});
