// A translation slides every point by the same arrow: (x, y) → (x + a, y + b).
// The learner drags the triangle and the tip A′ of the arrow from A; the same
// arrow then carries B and C, which is why the image is a congruent copy
// facing the same way.

import { C, tint } from "../draw.ts";
import { add, both, dist, fmt, inBox, len, snapToGrid, vec } from "../geo.ts";
import {
  coordsTex,
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  ORIGINAL,
  plusTex,
  satellite,
  spin,
  testTriangle,
  turnTex,
  type Triple,
} from "../kit/transformations.ts";
import { lesson } from "../scene.ts";

const RUN = C.gold;
const RISE = C.pink;
/** Shorter than this, an arrow or a leg is not worth drawing. */
const TINY = 0.05;

export default lesson((s) => {
  const [A, B, P] = testTriangle(s, [vec(-6, -2.5), vec(-2.5, -3), vec(-4.5, 0.5)], inBox(-7, -1, -3.5, 0.5));
  // The arrow snaps to half units so that it can be brought back to exactly zero.
  const arrow = satellite(s, A, vec(5, 2.5), both(inBox(-1, 6.5, -1, 4), snapToGrid(0.5)), {
    label: "A′",
    color: IMAGE,
  });
  const v = arrow.offset;

  const original = (): Triple => [A, B, P];
  const image = (): Triple => mapTriple(original(), (p) => add(p, v));

  return {
    steps: [
      {
        title: "Slide without turning",
        text: "Drag $A'$ to choose how far the triangle slides: $a$ across and $b$ up. Then drag $A$, $B$ or $C$. The image keeps up, always the same arrow away.",
      },
      {
        title: "One arrow for every point",
        text: "$AA'$ and $BB'$ are the same arrow — equal and parallel — so $ABB'A'$ is a parallelogram. Its other pair of sides must match too: $A'B'$ is equal and parallel to $AB$.",
      },
      {
        title: "A congruent copy, facing the same way",
        text: "The same holds for every side, so the two triangles are congruent by SSS. No side has turned, so $A \\to B \\to C$ and $A' \\to B' \\to C'$ run the same way round.",
      },
      {
        title: "Nothing stays put",
        text: "A fixed point would need $(x + a,\\, y + b) = (x,\\, y)$, which forces $a = b = 0$. Bring $A'$ back onto $A$: only the zero slide fixes any point — and then it fixes them all.",
      },
    ],
    likes: [
      {
        title: "Riding an escalator",
        text: "Everyone standing on an escalator is carried the same distance in the same direction: so far along, so far up, like the $a$ across and $b$ up of the arrow. So the gap between any two people stays exactly as it was, and nobody ends up facing a new way, which is why the image is a congruent copy facing the same way. And nobody stays where they started, unless the escalator is switched off.",
      },
      {
        title: "Sliding a tray across a table",
        text: "Push a tray of cups across the table without twisting it and every cup moves along the same arrow as the tray. Two cups and their new places make a parallelogram, just like $ABB'A'$, so the line from one cup to the other keeps its length and its direction. The moment you twist the tray, the cups move by different arrows and it is no longer a translation.",
      },
    ],
    uses: [
      {
        title: "Hanging wallpaper",
        text: "Patterned wallpaper repeats: the printer draws one motif and prints it again and again, each copy slid the same distance, called the pattern repeat, down the roll. When you hang the next strip beside the first, you slide it up or down until its pattern lines up with its neighbour's. Because every copy is a translation of the first, matching one flower along the join matches them all.",
      },
      {
        title: "Moving a character in a video game",
        text: "A game stores where each character is as a pair of coordinates and, every frame, adds the same step to it. A character at $(100, 40)$ walking with step $(3, -2)$ is drawn at $(103, 38)$, then $(106, 36)$. Every pixel of its picture is shifted by that same step, which is why it glides across the screen without turning or changing size.",
      },
      {
        title: "Drawing parallel lines with a set square",
        text: "Draughtsmen and carpenters hold a ruler still and slide a set square along it, drawing a line against the set square's edge at each stop. Sliding along the ruler is a translation, so every line drawn is the image of the first and runs parallel to it, just as $A'B'$ runs parallel to $AB$.",
      },
    ],

    draw(g, f) {
      arrow.follow();
      const src = original();
      const img = image();
      const moving = len(v) > TINY;

      g.grid(1);
      if (f.at(1) > 0 && moving) {
        g.polygon([A, B, img[1], img[0]], { fill: tint(g.accent, 0.14), stroke: null, alpha: f.at(1) });
      }
      drawFigure(g, src, ORIGINAL);
      drawImage(g, img, ["", "B′", "C′"]);

      if (moving) {
        // The arrow's two legs: a across, then b up.
        const corner = vec(img[0].x, A.y);
        const side = v.x >= 0 === v.y >= 0 ? -16 : 16;
        if (Math.abs(v.x) > TINY) {
          g.segment(A, corner, { color: RUN, width: 2, dash: [6, 5] });
          g.along(A, corner, `a = ${fmt(v.x)}`, { color: RUN, offset: side });
        }
        if (Math.abs(v.y) > TINY) {
          g.segment(corner, img[0], { color: RISE, width: 2, dash: [6, 5] });
          g.along(corner, img[0], `b = ${fmt(v.y)}`, { color: RISE, offset: side });
        }
        src.forEach((p, i) => g.arrow(p, img[i], { color: g.accent, width: i === 0 ? 3 : 2 }));
      }

      if (f.at(1) > 0 && moving) {
        const alpha = f.at(1);
        g.chevrons(A, img[0], 1, { color: g.accent, alpha });
        g.chevrons(B, img[1], 1, { color: g.accent, alpha });
        g.chevrons(A, B, 2, { alpha });
        g.chevrons(img[0], img[1], 2, { alpha });
      }
      if (f.at(2) > 0) {
        spin(g, src, ORIGINAL, f.at(2));
        spin(g, img, IMAGE, f.at(2));
      }
    },

    readout() {
      const src = original();
      const img = image();
      const still = len(v) <= TINY;
      return [
        { label: "Rule", tex: `(x,\\, y) \\to (x ${plusTex(v.x)},\\; y ${plusTex(v.y)})` },
        { label: "Where A goes", tex: `${coordsTex(A)} \\to ${coordsTex(img[0])}` },
        { label: "How far each point moves", tex: `AA' = BB' = CC' = ${fmt(dist(B, img[1]), 2)}` },
        {
          label: "A side and its image",
          tex: `AB = ${fmt(dist(A, B), 2)}, \\quad A'B' = ${fmt(dist(img[0], img[1]), 2)}`,
          tone: "good",
        },
        {
          label: "Orientation",
          tex: `ABC\\ ${turnTex(src)} \\qquad A'B'C'\\ ${turnTex(img)}`,
          tone: "good",
        },
        {
          label: "Fixed points",
          tex: still ? "\\text{every point: } a = b = 0" : "\\text{none}",
          tone: still ? "good" : "plain",
        },
      ];
    },
  };
});
