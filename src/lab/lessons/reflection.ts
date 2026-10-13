// A reflection flips the plane over a mirror line: the mirror is the
// perpendicular bisector of the segment from each point to its image. The
// learner drags the two ends of the mirror and the triangle. The last two
// steps prove that a line and its image make equal angles with the mirror,
// by congruent right triangles standing on it.

import { C, tint } from "../draw.ts";
import { angleAt, dist, distToLine, fmt, inBox, lineLine, project, reflect, toDeg, vec, type Vec } from "../geo.ts";
import {
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  NAMES,
  ORIGINAL,
  spin,
  testTriangle,
  turnTex,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const EQUAL = C.gold; // the two equal angles at the mirror
/** Closer to the mirror than this, a point is treated as lying on it. */
const ON_MIRROR = 0.05;
const STAGE = { x: 8, y: 5 };

/** The side whose line meets the mirror, and the vertex on it used in the proof. */
interface Crossing {
  /** Where the side's line meets the mirror. */
  X: Vec;
  /** Index of the vertex on that side farther from the mirror. */
  vertex: number;
  /** Index of the side's other end. */
  other: number;
}

export default lesson((s) => {
  // One end stays above the figure and one below, so the mirror never collapses.
  const M = s.point(1, 4.2, { constrain: inBox(-2.5, 4, 2.6, 4.5) });
  const N = s.point(0, -4.2, { constrain: inBox(-2.5, 4, -4.5, -2.6) });
  const [A, B, K] = testTriangle(s, [vec(-5.5, -2), vec(-2, -1), vec(-4, 2)], inBox(-7, 3, -4, 4));

  const flip = (p: Vec): Vec => reflect(p, M, N);
  const original = (): Triple => [A, B, K];

  /**
   * Of the triangle's three sides, the one whose line meets the mirror
   * nearest the middle of the stage. At most one side can be parallel to the
   * mirror, so there is always one to choose.
   */
  function crossing(src: Triple): Crossing {
    let best: Crossing = { X: project(src[0], M, N), vertex: 0, other: 1 };
    let bestReach = Infinity;
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const X = lineLine(src[i], src[j], M, N);
      if (!X) continue;
      const reach = Math.max(Math.abs(X.x) / STAGE.x, Math.abs(X.y) / STAGE.y);
      if (reach >= bestReach) continue;
      const iFarther = distToLine(src[i], M, N) >= distToLine(src[j], M, N);
      best = { X, vertex: iFarther ? i : j, other: iFarther ? j : i };
      bestReach = reach;
    }
    return best;
  }

  return {
    steps: [
      {
        title: "Flip over a mirror",
        text: "Drag either end of the mirror line, then the corners of the triangle. The image is what you would get by folding the plane along the mirror.",
      },
      {
        title: "The mirror bisects every jump",
        text: "Join each point to its image. The mirror crosses that segment at a right angle, at its midpoint — it is the perpendicular bisector. A point lying on the mirror does not move at all.",
      },
      {
        title: "Same size, turned over",
        text: "Each side keeps its length, so the image is congruent. But follow $A \\to B \\to C$ and then $A' \\to B' \\to C'$: one runs counter-clockwise, the other clockwise. A reflection reverses orientation.",
      },
      {
        title: "A line meets its image on the mirror",
        text: "Extend one side until it hits the mirror at $X$. A point on the mirror is its own image, so the image of that line passes through $X$ as well.",
      },
      {
        title: "Equal angles with the mirror",
        text: "Drop the highlighted vertex and its image onto the mirror at $F$. The two right triangles share the leg $XF$ and have equal legs to $F$, so they are congruent: the line and its image meet the mirror at equal angles.",
      },
    ],

    draw(g, f) {
      const src = original();
      const img = mapTriple(src, flip);
      const feet = mapTriple(src, (p) => project(p, M, N));
      const { X, vertex, other } = crossing(src);
      const P = src[vertex];
      const Q = img[vertex];
      const F = feet[vertex];

      if (f.at(4) > 0 && dist(X, F) > ON_MIRROR) {
        g.polygon([X, F, P], { fill: tint(ORIGINAL, 0.22), stroke: null, alpha: f.at(4) });
        g.polygon([X, F, Q], { fill: tint(IMAGE, 0.22), stroke: null, alpha: f.at(4) });
      }

      g.line(M, N, { color: g.accent, width: 3 });
      g.label(M, "mirror", { color: g.accent, dx: 46, dy: 4, size: 14 });

      if (f.at(3) > 0) {
        const alpha = f.at(3);
        g.line(P, src[other], { color: ORIGINAL, width: 1.5, alpha });
        g.line(Q, img[other], { color: IMAGE, width: 1.5, alpha });
      }

      drawFigure(g, src, ORIGINAL);
      drawImage(g, img);

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        src.forEach((p, i) => {
          // In the proof only the highlighted vertex keeps its marks.
          const shown = i === vertex ? alpha : alpha * (1 - f.at(3));
          if (shown <= 0 || dist(p, feet[i]) < ON_MIRROR) return;
          g.segment(p, img[i], { color: C.dim, width: 2, dash: [5, 5], alpha: shown });
          g.ticks(p, feet[i], i + 1, { alpha: shown });
          g.ticks(feet[i], img[i], i + 1, { alpha: shown });
          // Measure the right angle against whichever end of the mirror is farther off.
          const end = dist(feet[i], M) > dist(feet[i], N) ? M : N;
          g.angle(p, feet[i], end, { color: C.ink, r: 16, alpha: shown });
        });
      }
      if (f.at(2) > 0 && f.step === 2) {
        spin(g, src, ORIGINAL, f.at(2));
        spin(g, img, IMAGE, f.at(2));
      }
      if (f.at(3) > 0) {
        g.point(X, { color: g.accent, alpha: f.at(3) });
        g.label(X, "X", { color: g.accent, bold: true, dx: -16, dy: -14, alpha: f.at(3) });
      }
      if (f.at(4) > 0 && dist(X, F) > ON_MIRROR) {
        const alpha = f.at(4);
        g.point(F, { alpha });
        g.label(F, "F", { bold: true, dx: 14, dy: -14, alpha });
        g.angle(P, X, F, { color: EQUAL, fill: true, arcs: 2, r: 30, alpha });
        g.angle(Q, X, F, { color: EQUAL, fill: true, arcs: 2, r: 30, alpha });
      }
    },

    readout(f) {
      const src = original();
      const img = mapTriple(src, flip);
      const foot = project(A, M, N);
      const onMirror = dist(A, foot) < ON_MIRROR;
      const rows: Readout[] = [
        {
          label: "Distance to the mirror",
          tex: `A:\\ ${fmt(distToLine(A, M, N), 2)} \\qquad A':\\ ${fmt(distToLine(img[0], M, N), 2)}`,
          tone: "good",
        },
        onMirror
          ? { label: "$A$ is on the mirror", tex: "A' = A", tone: "good" }
          : {
              label: "Angle between $AA'$ and the mirror",
              tex: `${fmt(toDeg(angleAt(A, foot, dist(foot, M) > dist(foot, N) ? M : N)), 0)}^\\circ`,
              tone: "good",
            },
        {
          label: "A side and its image",
          tex: `AB = ${fmt(dist(A, B), 2)}, \\quad A'B' = ${fmt(dist(img[0], img[1]), 2)}`,
          tone: "good",
        },
        { label: "Orientation", tex: `ABC\\ ${turnTex(src)} \\qquad A'B'C'\\ ${turnTex(img)}`, tone: "plain" },
      ];
      if (f.step >= 4) {
        const { X, vertex } = crossing(src);
        const F = project(src[vertex], M, N);
        const name = NAMES[vertex];
        const deg = (p: Vec): string => `${fmt(toDeg(angleAt(p, X, F)), 1)}^\\circ`;
        rows.push(
          dist(X, F) > ON_MIRROR
            ? {
                label: "Angles with the mirror",
                tex: `\\angle ${name}XF = ${deg(src[vertex])}, \\quad \\angle ${name}'XF = ${deg(img[vertex])}`,
                tone: "good",
              }
            : { label: "Angles with the mirror", tex: "90^\\circ \\text{ on both sides}", tone: "good" },
        );
      }
      return rows;
    },
  };
});
