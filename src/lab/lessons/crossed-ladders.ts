// Crossed ladders: posts of heights x and y stand on level ground, and the
// lines from each top to the foot of the other post cross at height z. Two
// pairs of similar triangles give z/x + z/y = 1, so 1/x + 1/y = 1/z — and the
// distance between the posts never enters.

import { C, tint } from "../draw.ts";
import { clamp, fmt, lineLine, mid, onSegment, vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const GROUND = -3.6;
const A = vec(-5.5, GROUND);
const MIN_HEIGHT = 1.5;
const MAX_HEIGHT = 7.6;

const LEFT = C.gold; // the post of height x and the triangle it belongs to
const RIGHT = C.blue; // the post of height y
const CROSSING = C.pink; // the height z

const height = (y: number): number => clamp(y, GROUND + MIN_HEIGHT, GROUND + MAX_HEIGHT);

export default lesson((s) => {
  const B = s.point(3.5, GROUND, { label: "B", constrain: onSegment(vec(-1.5, GROUND), vec(6, GROUND)) });
  const P = s.point(A.x, 1.4, { label: "P", constrain: (p) => vec(A.x, height(p.y)) });
  const Q = s.point(B.x, -0.2, { label: "Q", constrain: (p) => vec(B.x, height(p.y)) });

  function figure() {
    Q.set(Q); // the post stays over its foot when B slides
    // PB falls to the right and QA to the left, so they always cross.
    const X = lineLine(P, B, Q, A) ?? mid(A, B);
    const F = vec(X.x, GROUND);
    return { X, F, x: P.y - GROUND, y: Q.y - GROUND, z: X.y - GROUND, m: X.x - A.x, n: B.x - X.x };
  }

  return {
    steps: [
      {
        title: "Two posts, two ladders",
        text: "Each ladder runs from the top of one post to the foot of the other. Drag $P$ and $Q$ to change the heights $x$ and $y$, and slide $B$ to move the posts apart. What decides the height $z$ of the crossing?",
      },
      {
        title: "Drop a perpendicular",
        text: "From the crossing point $X$ drop a perpendicular to the ground at $F$. It has length $z$, and it splits the ground between the posts into $AF = m$ and $FB = n$.",
      },
      {
        title: "First pair of similar triangles",
        text: "Triangles $XFB$ and $PAB$ both have a right angle and share the angle at $B$, so they are similar. Matching sides give $\\dfrac{z}{x} = \\dfrac{n}{m + n}$.",
      },
      {
        title: "Second pair",
        text: "In the same way, triangles $XFA$ and $QBA$ have right angles and share the angle at $A$. So $\\dfrac{z}{y} = \\dfrac{m}{m + n}$.",
      },
      {
        title: "Add them",
        text: "Adding, $\\dfrac{z}{x} + \\dfrac{z}{y} = \\dfrac{n + m}{m + n} = 1$. Divide by $z$ to get $\\dfrac1x + \\dfrac1y = \\dfrac1z$. The spacing $m + n$ has cancelled: only the heights matter.",
      },
    ],

    draw(g, f) {
      const { X, F, x, y, z } = figure();

      if (f.at(2) > 0) {
        const a = f.at(2);
        g.polygon([P, A, B], { fill: tint(LEFT, 0.1), stroke: null, alpha: a });
        g.polygon([X, F, B], { fill: tint(LEFT, 0.3), stroke: null, alpha: a });
        g.angle(A, B, P, { color: LEFT, r: 34, fill: true, alpha: a });
      }
      if (f.at(3) > 0) {
        const a = f.at(3);
        g.polygon([Q, B, A], { fill: tint(RIGHT, 0.1), stroke: null, alpha: a });
        g.polygon([X, F, A], { fill: tint(RIGHT, 0.3), stroke: null, alpha: a });
        g.angle(B, A, Q, { color: RIGHT, r: 34, fill: true, alpha: a });
      }
      if (f.at(4) > 0) {
        g.segment(vec(A.x, X.y), vec(B.x, X.y), { color: CROSSING, width: 1.5, dash: [4, 6], alpha: f.at(4) });
      }

      g.segment(vec(A.x - 1.2, GROUND), vec(B.x + 1.2, GROUND), { color: C.dim, width: 3 });
      g.segment(P, B, { color: C.ink });
      g.segment(Q, A, { color: C.ink });
      g.segment(A, P, { color: LEFT, width: 5 });
      g.segment(B, Q, { color: RIGHT, width: 5 });
      g.segment(X, F, { color: CROSSING, width: 4 });
      g.label(vec(A.x, mid(A, P).y), `x = ${fmt(x)}`, { color: LEFT, dx: -14, align: "right", size: 14 });
      g.label(vec(B.x, mid(B, Q).y), `y = ${fmt(y)}`, { color: RIGHT, dx: 14, align: "left", size: 14 });
      g.label(mid(X, F), `z = ${fmt(z)}`, { color: CROSSING, dx: 10, align: "left", size: 14 });
      g.angle(P, A, B, { color: C.dim, r: 13, width: 2 });
      g.angle(Q, B, A, { color: C.dim, r: 13, width: 2 });

      if (f.at(1) > 0) {
        const a = f.at(1);
        g.angle(X, F, B, { color: CROSSING, r: 13, width: 2, alpha: a });
        g.along(A, F, "m", { offset: -16, alpha: a });
        g.along(F, B, "n", { offset: -16, alpha: a });
        g.label(F, "F", { dy: -34, alpha: a });
      }

      g.point(A, { color: C.ink });
      g.label(A, "A", { dx: -14, dy: -12 });
      g.point(X, { color: CROSSING });
      g.label(X, "X", { color: CROSSING, dy: 18 });
    },

    readout() {
      const { x, y, z, m, n } = figure();
      return [
        { label: "Heights", tex: `x = ${fmt(x, 2)},\\; y = ${fmt(y, 2)},\\; z = ${fmt(z, 2)}` },
        { label: "Triangles XFB and PAB", tex: `\\frac{z}{x} = ${fmt(z / x, 3)},\\quad \\frac{n}{m+n} = ${fmt(n / (m + n), 3)}`, tone: "good" },
        { label: "Triangles XFA and QBA", tex: `\\frac{z}{y} = ${fmt(z / y, 3)},\\quad \\frac{m}{m+n} = ${fmt(m / (m + n), 3)}`, tone: "good" },
        { label: "Sum of reciprocals", tex: `\\frac1x + \\frac1y = ${fmt(1 / x + 1 / y, 3)}` },
        { label: "Reciprocal of the crossing height", tex: `\\frac1z = ${fmt(1 / z, 3)}`, tone: "good" },
        { label: "Spacing (it cancels)", tex: `m + n = ${fmt(m + n, 2)}`, tone: "dim" },
      ];
    },
  };
});
