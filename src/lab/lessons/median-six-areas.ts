// The three medians of a triangle cut it into six triangles of equal area. A
// median halves the area (same altitude, half the base); the centroid sits a
// third of the way up that median, so the small triangle at its foot is a
// third of the half.

import { C, tint } from "../draw.ts";
import { centroid, dist, fmt, mid, project, triangleArea, type Vec } from "../geo.ts";
import { agree, looseTriangle } from "../kit/areas.ts";
import { lesson } from "../scene.ts";

const HALF = C.gold; // triangle ACD, half of the whole
const SIXTH = C.pink; // triangle GCD
const THIRDS = C.green; // the centroid's split of a median
const PIECES = [C.blue, C.cyan, C.violet, C.pink, C.orange, C.green];

const DASH = [6, 5];

export default lesson((s) => {
  const [A, B, P] = looseTriangle(s);

  const figure = () => {
    const D = mid(B, P);
    const E = mid(P, A);
    const F = mid(A, B);
    const G = centroid([A, B, P]);
    const six: Vec[][] = [[G, A, F], [G, F, B], [G, B, D], [G, D, P], [G, P, E], [G, E, A]];
    return { D, E, F, G, six };
  };

  return {
    steps: [
      {
        title: "Six pieces",
        text: "Each median joins a corner to the midpoint of the opposite side. Drag the corners: the six pieces change shape, but compare the areas written inside them.",
      },
      {
        title: "A median halves the area",
        text: "Triangles $ACD$ and $ABC$ have the same altitude from $A$, so their areas are in the ratio of their bases. $D$ is the midpoint of $BC$, so $CD = \\tfrac12 CB$ and $[ACD] = \\tfrac12 [ABC]$.",
      },
      {
        title: "Where the medians cross",
        text: "The medians meet at the centroid $G$, which lies two thirds of the way from each corner to the opposite midpoint. Along the median from $A$ that leaves $GD = \\tfrac13 AD$.",
      },
      {
        title: "A third of the half",
        text: "Now look from $C$. Triangles $GCD$ and $ACD$ have bases $GD$ and $AD$ on one line, so they share the altitude from $C$. Hence $[GCD] = \\tfrac13 [ACD] = \\tfrac16 [ABC]$.",
      },
      {
        title: "All six",
        text: "Nothing was special about that piece: the same two steps, started from any median and either end of its side, give $\\tfrac16 [ABC]$ every time. The six areas are equal.",
      },
    ],

    draw(g, f) {
      const { D, E, F, G, six } = figure();

      // The six colours step back while the argument follows a single piece.
      const strength = 0.3 - 0.24 * (f.at(1) - f.at(4));
      six.forEach((piece, i) => g.polygon(piece, { fill: tint(PIECES[i], strength), stroke: null }));

      if (f.at(1) > 0) {
        const a = f.at(1) - f.at(4);
        const foot = project(A, B, P);
        g.polygon([A, P, D], { fill: tint(HALF, 0.22), stroke: null, alpha: a });
        // The base line is extended in case the altitude lands outside BC.
        g.segment(D, foot, { color: C.dim, width: 1.5, dash: DASH, alpha: a });
        g.segment(A, foot, { color: HALF, width: 2, dash: DASH, alpha: a });
        g.angle(A, foot, D, { color: HALF, r: 12, width: 1.5, alpha: a });
        g.ticks(B, D, 1, { color: HALF, alpha: f.at(1) });
        g.ticks(D, P, 1, { color: HALF, alpha: f.at(1) });
      }
      if (f.at(3) > 0) {
        const a = f.at(3) - f.at(4);
        const foot = project(P, A, D);
        g.polygon([G, P, D], { fill: tint(SIXTH, 0.45), stroke: null, alpha: a });
        g.segment(D, foot, { color: C.dim, width: 1.5, dash: DASH, alpha: a });
        g.segment(A, foot, { color: C.dim, width: 1.5, dash: DASH, alpha: a });
        g.segment(P, foot, { color: SIXTH, width: 2, dash: DASH, alpha: a });
        g.angle(P, foot, G, { color: SIXTH, r: 12, width: 1.5, alpha: a });
      }

      g.polygon([A, B, P], {});
      g.segment(A, D, { color: g.accent, width: 2.5 });
      g.segment(B, E, { color: g.accent, width: 2.5 });
      g.segment(P, F, { color: g.accent, width: 2.5 });

      if (f.at(2) > 0) {
        const a = f.at(2) - f.at(4);
        g.segment(A, G, { color: THIRDS, width: 4, alpha: a });
        g.segment(G, D, { color: THIRDS, width: 4, alpha: a });
        g.along(A, G, fmt(dist(A, G), 2), { color: THIRDS, offset: 16, alpha: a });
        g.along(G, D, fmt(dist(G, D), 2), { color: THIRDS, offset: 16, alpha: a });
      }

      const numbers = 1 - (f.at(1) - f.at(4));
      six.forEach((piece, i) =>
        g.label(centroid(piece), fmt(triangleArea(piece[0], piece[1], piece[2]), 2), {
          color: PIECES[i],
          size: 13,
          bold: true,
          alpha: numbers,
        }),
      );

      g.point(D, { label: "D" });
      g.point(E, { label: "E" });
      g.point(F, { label: "F" });
      g.point(G, { label: f.step >= 2 ? "G" : undefined, color: g.accent });
    },

    readout() {
      const { D, G, six } = figure();
      const whole = triangleArea(A, B, P);
      const half = triangleArea(A, P, D);
      const sixth = triangleArea(G, P, D);
      const areas = six.map(([p, q, r]) => triangleArea(p, q, r));
      const equal = areas.every((x) => agree(x, whole / 6));
      return [
        { label: "Whole triangle", tex: `[ABC] = ${fmt(whole, 2)}` },
        {
          label: "Cut by a median",
          tex: `[ACD] = ${fmt(half, 2)},\\quad \\tfrac12 [ABC] = ${fmt(whole / 2, 2)}`,
          tone: agree(half, whole / 2) ? "good" : "warn",
        },
        {
          label: "Centroid on the median",
          tex: `\\frac{GD}{AD} = \\frac{${fmt(dist(G, D), 2)}}{${fmt(dist(A, D), 2)}} = ${fmt(dist(G, D) / dist(A, D), 3)}`,
        },
        {
          label: "One small piece",
          tex: `[GCD] = ${fmt(sixth, 2)},\\quad \\tfrac16 [ABC] = ${fmt(whole / 6, 2)}`,
          tone: agree(sixth, whole / 6) ? "good" : "warn",
        },
        {
          label: "Smallest and largest of the six",
          tex: `${fmt(Math.min(...areas), 2)} \\;\\text{and}\\; ${fmt(Math.max(...areas), 2)}`,
          tone: equal ? "good" : "warn",
        },
      ];
    },
  };
});
