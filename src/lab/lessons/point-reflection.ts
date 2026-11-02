// Reflection in a point O sends each point straight through O to the same
// distance on the other side, so O is the midpoint of every point and its
// image: A′ = 2O − A. Everything snaps to the grid so the coordinates can be
// read off, and the last step shows the map is just a half-turn about O.

import { C } from "../draw.ts";
import {
  add,
  angleOf,
  both,
  dist,
  fmt,
  inBox,
  mid,
  rotateAbout,
  scale,
  snapToGrid,
  sub,
  vec,
  type Vec,
} from "../geo.ts";
import {
  coordsTex,
  drawFigure,
  drawImage,
  mapTriple,
  ORIGINAL,
  testTriangle,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const RUN = C.gold;
const RISE = C.pink;
/** Seconds for the ghost triangle to swing through its half-turn, then rest. */
const SWING = 2.4;
const REST = 1.2;

/** A number as a factor or subtrahend: negative values get brackets. */
const bracket = (n: number): string => (n < 0 ? `(${fmt(n)})` : fmt(n));

export default lesson((s) => {
  const grid = snapToGrid(1);
  // The centre stays near the middle so the image stays on the stage.
  const O = s.point(2, 0, { label: "O", constrain: both(inBox(0, 3, -1, 1), grid) });
  const [A, B, K] = testTriangle(s, [vec(4, 3), vec(5, 0), vec(7, 2)], both(inBox(-1, 7, -3, 3), grid));

  const through = (p: Vec): Vec => sub(scale(O, 2), p);
  const original = (): Triple => [A, B, K];

  return {
    steps: [
      {
        title: "Straight through a point",
        text: "Drag $O$ and the corners of the triangle; everything snaps to the grid. Each corner is sent through $O$ and out the other side, exactly as far again.",
      },
      {
        title: "O is every midpoint",
        text: "$A'$ lies on line $AO$, beyond $O$, with $OA' = OA$. So $O$ is the midpoint of $AA'$ — and of $BB'$ and $CC'$. All three segments cross at $O$.",
      },
      {
        title: "Take the same step twice",
        text: "Walk from $A$ to $O$: so far across, so far up. Repeat that same step from $O$ and you land on $A'$. In coordinates, $A' = O + (O - A) = 2O - A$.",
      },
      {
        title: "A half-turn in disguise",
        text: "Spin the triangle $180^\\circ$ about $O$: each point keeps its distance from $O$ and ends up directly opposite. That is exactly where the reflection put it, so the two maps are the same.",
      },
    ],
    likes: [
      {
        title: "Sitting across a round table",
        text: "At a round table, the person sitting directly opposite you is on the straight line through the centre, as far beyond it as you are on this side. The centre of the table is $O$, and it is the midpoint between you and them. Spin the table top half a turn and your plate goes exactly to their place, which is why the point reflection is a half-turn.",
      },
      {
        title: "Pacing past a lamp post",
        text: "Stand at $A$ and walk to a lamp post at $O$, counting your paces: say $4$ east and $3$ north. Now take exactly the same paces again from the lamp post, and you arrive at $A'$. You have walked the step $O - A$ twice, which is the rule $A' = 2O - A$.",
      },
    ],
    uses: [
      {
        title: "Playing cards that read either way up",
        text: "The kings, queens and jacks in a standard pack are printed double-ended: the lower half of the card is the upper half turned through $180^\\circ$ about the card's centre. Every point of the design has a matching point straight through the centre and as far again. So the card looks the same whichever way up you are dealt it, and you never need to turn it round.",
      },
      {
        title: "Drawing a rectangle from its centre",
        text: "Many drawing programs let you hold a key to draw a rectangle out from its centre instead of from a corner. The program keeps the centre $O$ fixed and puts the opposite corner at $2O - A$, where $A$ is the corner you are dragging. With the centre at $(5, 3)$ and your pointer at $(8, 5)$, the far corner lands at $(2, 1)$.",
      },
      {
        title: "Why a pinhole camera turns the picture over",
        text: "In a pinhole camera, light from each point of the scene travels in a straight line through the pinhole and lands on the far side. So the picture on the screen is upside down and swapped left to right at once: a half-turn about the pinhole, not a flip. It is a true point reflection only when the screen is as far behind the pinhole as the subject is in front; otherwise the picture is also shrunk or enlarged.",
      },
    ],

    draw(g, f) {
      const src = original();
      const img = mapTriple(src, through);

      g.grid(1);
      g.axes();

      if (f.at(3) > 0) {
        // A ghost of the triangle swings round O to land on the image.
        const phase = Math.min((f.time % (SWING + REST)) / SWING, 1);
        const angle = Math.PI * (phase * phase * (3 - 2 * phase));
        const ghost = mapTriple(src, (p) => rotateAbout(p, O, angle));
        src.forEach((p) => {
          const from = angleOf(sub(p, O));
          g.arc(O, dist(O, p), from, from + Math.PI, { color: C.dim, width: 1.5, dash: [4, 5], alpha: f.at(3) });
        });
        g.polygon(ghost, { color: C.ink, width: 2, dash: [6, 5], alpha: 0.7 * f.at(3) });
      }

      drawFigure(g, src, ORIGINAL);
      drawImage(g, img);

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        src.forEach((p, i) => {
          g.segment(p, img[i], { color: C.dim, width: 2, dash: [5, 5], alpha });
          g.ticks(p, O, i + 1, { alpha });
          g.ticks(O, img[i], i + 1, { alpha });
        });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        const step = sub(O, A);
        // The same L-shaped walk, from A to O and again from O to A′.
        for (const from of [A, O]) {
          const corner = vec(from.x + step.x, from.y);
          const to = add(from, step);
          g.segment(from, corner, { color: RUN, width: 3, alpha });
          g.segment(corner, to, { color: RISE, width: 3, alpha });
          if (step.x !== 0)
            g.along(from, corner, fmt(step.x), { color: RUN, offset: step.x * step.y >= 0 ? -14 : 14, alpha });
          if (step.y !== 0)
            g.along(corner, to, fmt(step.y), { color: RISE, offset: step.x * step.y >= 0 ? -14 : 14, alpha });
        }
      }
    },

    readout(f) {
      const A2 = through(A);
      const rows: Readout[] = [
        { label: "Centre and point", tex: `O = ${coordsTex(O)}, \\quad A = ${coordsTex(A)}` },
        { label: "Image", tex: `A' = 2O - A` },
        {
          tex: `= (2 \\cdot ${bracket(O.x)} - ${bracket(A.x)},\\ 2 \\cdot ${bracket(O.y)} - ${bracket(A.y)}) = ${coordsTex(A2)}`,
        },
        { label: "Midpoint of $AA'$", tex: `${coordsTex(mid(A, A2))} = O`, tone: "good" },
        { label: "Distances", tex: `OA = ${fmt(dist(O, A), 2)}, \\quad OA' = ${fmt(dist(O, A2), 2)}`, tone: "good" },
      ];
      if (f.step >= 3) {
        rows.push({
          label: "$A$ turned $180^\\circ$ about $O$",
          tex: `${coordsTex(rotateAbout(A, O, Math.PI))} = A'`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
