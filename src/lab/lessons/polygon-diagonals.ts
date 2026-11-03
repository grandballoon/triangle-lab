// Counting the diagonals of an n-gon: each vertex sends a diagonal to all but
// three of the vertices (itself and its two neighbours), and adding that up
// over every vertex counts each diagonal twice, so there are n(n − 3)/2.

import { C, tint } from "../draw.ts";
import { dist, regularPolygon, vec, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const CENTER = vec(0, 0.5);
const RADIUS = 3.7;
const CHOSEN = C.gold;
const SIDES = C.blue;
const TWICE = C.pink;

export default lesson((s) => {
  const sides = s.slider({ label: "n =", at: vec(-7.4, -4.3), width: 4.5, min: 3, max: 12, value: 7, step: 1 });
  const corners = (): Vec[] => regularPolygon(CENTER, RADIUS, sides.value);
  const nearest = (p: Vec): number => {
    const pts = corners();
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (dist(p, pts[i]) < dist(p, pts[best])) best = i;
    return best;
  };
  // The chosen vertex: a grip that hops from corner to corner.
  const chosen = s.point(CENTER.x, CENTER.y + RADIUS, { color: CHOSEN, constrain: (p) => corners()[nearest(p)] });

  return {
    steps: [
      {
        title: "Diagonals from one vertex",
        text: "Drag the gold vertex around the polygon and slide $n$. Segments join it to the other $n - 1$ vertices: two are sides (blue), so the remaining $n - 3$ are diagonals (gold).",
      },
      {
        title: "Every vertex does the same",
        text: "Each of the $n$ vertices sends out $n - 3$ diagonals of its own. Adding them up vertex by vertex gives $n(n - 3)$.",
      },
      {
        title: "Each one counted twice",
        text: "That is too many. The pink diagonal was counted at one end and again at the other, and so was every diagonal. Halve the total: an $n$-gon has $\\tfrac{n(n-3)}{2}$ diagonals.",
      },
    ],

    likes: [
      {
        title: "Shaking hands round a table",
        text: "At a round table of $n$ people, everyone shakes hands with everyone except themselves and the two people beside them: $n - 3$ handshakes each. Ask each person to count theirs and the counts add to $n(n - 3)$, but every handshake was counted by both people in it, so there were $\\tfrac{n(n-3)}{2}$. The people are the vertices, neighbours are the sides, and handshakes across the table are the diagonals.",
      },
      {
        title: "Counting friendships in a group",
        text: "If each of $6$ friends says they are close to $3$ others in the group, there are not $18$ friendships but $9$, because each one is reported from both ends. Counting from every point and then halving is exactly how the lesson counts diagonals.",
      },
    ],

    uses: [
      {
        title: "Planning a round-robin tournament",
        text: "In a round robin every team plays every other team once. Each of $8$ teams has $7$ matches, which adds to $56$, but each match was counted for both teams, so there are $28$ to schedule. That is the $8$ sides plus the $\\tfrac{8 \\cdot 5}{2} = 20$ diagonals of an octagon.",
      },
      {
        title: "Wiring every office to every other",
        text: "A network that links each of $10$ sites directly to each of the others needs $\\tfrac{10 \\cdot 9}{2} = 45$ links. Since that grows roughly with the square of the number of sites, large networks instead route traffic through hubs.",
      },
    ],

    draw(g, f) {
      chosen.set(chosen); // follow its corner when n changes
      const pts = corners();
      const n = pts.length;
      const k = nearest(chosen);
      const isDiagonal = (i: number, j: number): boolean => (i - j + n) % n > 1 && (j - i + n) % n > 1;

      g.polygon(pts, { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(1) > 0) {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (isDiagonal(i, j)) g.segment(pts[i], pts[j], { color: tint(g.accent, 0.7), width: 1.5, alpha: f.at(1) });
          }
        }
      }

      g.segment(pts[k], pts[(k + 1) % n], { color: SIDES, width: 4 });
      g.segment(pts[k], pts[(k + n - 1) % n], { color: SIDES, width: 4 });
      for (let j = 0; j < n; j++) {
        if (isDiagonal(k, j)) g.segment(pts[k], pts[j], { color: CHOSEN, width: 2.5 });
      }

      if (f.at(2) > 0 && n > 3) {
        const other = pts[(k + 2) % n];
        g.segment(pts[k], other, { color: TWICE, width: 4.5, alpha: f.at(2) });
        g.circle(pts[k], g.px(20), { color: TWICE, width: 2.5, alpha: f.at(2) });
        g.circle(other, g.px(20), { color: TWICE, width: 2.5, alpha: f.at(2) });
      }

      for (const p of pts) g.point(p);
    },

    readout(f) {
      const n = sides.value;
      let counted = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) if (!(i === 0 && j === n - 1)) counted++;
      }
      const rows: Readout[] = [
        { label: "Sides", tex: `n = ${n}` },
        { label: "Diagonals from one vertex", tex: `n - 3 = ${n} - 3 = ${n - 3}` },
      ];
      if (f.step >= 1) {
        rows.push({ label: "Added over all vertices", tex: `n(n-3) = ${n} \\cdot ${n - 3} = ${n * (n - 3)}` });
      }
      if (f.step >= 2) {
        rows.push(
          { label: "Diagonals", tex: `\\frac{n(n-3)}{2} = \\frac{${n * (n - 3)}}{2} = ${(n * (n - 3)) / 2}` },
          { label: "Counted one by one", tex: `${counted}\\text{ diagonals}`, tone: "good" },
        );
      }
      return rows;
    },
  };
});
