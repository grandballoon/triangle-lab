// Your hands as a protractor. With both hands in view, heels together, the
// angle opens between the two index fingers; without them, the three points
// are draggable. Either way the angle is named and measured as it changes.

import { C } from "../draw.ts";
import { angleAt, fmt, inBox, toDeg } from "../geo.ts";
import { lesson } from "../scene.ts";
import { protractorOf } from "../kit/two-hands.ts";
import fistPoleStarImage from "../../images/fist-pole-star.svg";
import handTrackingFingerImage from "../../images/hand-tracking-finger.svg";
import kneeGoniometerImage from "../../images/knee-goniometer.svg";

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

  return {
    steps: [
      {
        title: "Open and close an angle",
        text: "Hold both hands up to the camera with the heels of your palms together, index fingers pointing up, and open them like a book: the angle between your two index fingers is measured live. Open it past a right angle and watch its name change, then all the way to a straight line. No camera? Drag the points instead.",
      },
    ],

    likes: [
      {
        title: "Opening a laptop",
        text: "The hinge is the vertex and the screen and keyboard are the two arms. Shut, the angle is $0^\\circ$; upright it is about a right angle; tipped further back it is obtuse; and a laptop that folds flat makes a straight angle.",
      },
      {
        title: "Opening a door",
        text: "The hinge is the vertex, and how far the door swings open is the angle. A narrow door and a wide one opened the same amount make the same angle, even though the wide door's edge travels further: the angle does not depend on how long the arms are.",
      },
    ],

    uses: [
      {
        title: "Measuring the sky with your hand",
        text: "Stargazers and hikers estimate angles with an outstretched arm: a closed fist held at arm's length covers about $10^\\circ$ of sky. The Pole Star stands as high above the horizon as your latitude, so from London, at about $51^\\circ$ north, it is roughly five fists up.",
        image: {
          src: fistPoleStarImage,
          caption: "Measuring the sky by hand: from London the Pole Star stands about 51° above the horizon, roughly five fists held at arm's length.",
          alt: "A person at night with an arm stretched out and a fist raised; dashed gold lines run from their eye level to the horizon and up to a bright star, with the angle marked 51°.",
        },
      },
      {
        title: "Measuring how far a joint bends",
        text: "Physiotherapists measure a joint with a goniometer, a protractor with two long arms laid along the limb and its pivot on the joint. Measuring a recovering knee week by week, say from $90^\\circ$ of bend to $120^\\circ$, shows how well the treatment is working.",
        image: {
          src: kneeGoniometerImage,
          caption: "A physiotherapist's goniometer: its two arms lie along the thigh and shin, and the angle at its pivot shows how far the knee bends.",
          alt: "A person sitting on a treatment table with the lower leg hanging over the edge; a steel goniometer's arms lie along the thigh and shin with its pivot on the knee, and a gold arc marks the angle as 120°.",
        },
      },
      {
        title: "Hand tracking",
        text: "Headsets with hand tracking do what this page does: find points on the fingers in each camera frame and work out the angles between them. Whether a finger is bent or straight can be read from the angle at its knuckle.",
        image: {
          src: handTrackingFingerImage,
          caption: "Hand tracking: a headset finds points on each finger and reads whether a finger is bent from the angle at its joint.",
          alt: "An open hand with gold dots on every finger joint joined by dashed gold lines; the index finger is bent and a gold arc marks the angle at its middle joint. A headset with two camera lenses sits in the corner.",
        },
      },
    ],

    draw(g, f) {
      const held = protractorOf(f.hands);
      if (held) {
        V.set(held.V);
        P.set(held.P);
        Q.set(held.Q);
      } else if (f.hands.length === 1) {
        g.label({ x: 0, y: 4.4 }, "Hold up your other hand too", { color: C.dim, size: 16 });
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
