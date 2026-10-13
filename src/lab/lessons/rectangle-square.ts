// Rectangles and squares through their diagonals. A rectangle's diagonals are
// equal (each is the hypotenuse over the same two legs) and bisect each other;
// a square is the rectangle that is also a rhombus. Joining the midpoints of a
// square's sides cuts off four congruent isosceles right triangles and leaves
// another square.

import { C, tint } from "../draw.ts";
import { angleAt, clamp, dist, fmt, mid, toDeg, vec, type Vec } from "../geo.ts";
import { GLASS, same } from "../kit/quadrilaterals.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, -0.1);
const MIN_HALF = 1.2;
const MAX_HALF_WIDTH = 6.6;
const MAX_HALF_HEIGHT = 3.9;
// How nearly equal the sides must be before the rectangle clicks into a square.
const SNAP = 0.15;
// From this step on the lesson is about a square, and the figure is held to one.
const SQUARE_FROM = 2;

const D1 = C.gold;
const D2 = C.blue;
const CORNER = C.pink;

export default lesson((s) => {
  let squareOnly = false;
  const Cc = s.point(O.x + 4.8, O.y + 2.6, {
    label: "C",
    constrain: (p) => {
      const a = clamp(p.x - O.x, MIN_HALF, MAX_HALF_WIDTH);
      const b = clamp(p.y - O.y, MIN_HALF, MAX_HALF_HEIGHT);
      if (!squareOnly && Math.abs(a - b) >= SNAP) return vec(O.x + a, O.y + b);
      const half = clamp((a + b) / 2, MIN_HALF, MAX_HALF_HEIGHT);
      return vec(O.x + half, O.y + half);
    },
  });

  const settle = (step: number): void => {
    squareOnly = step >= SQUARE_FROM;
    if (squareOnly) Cc.set(Cc);
  };

  const measure = () => {
    const a = Cc.x - O.x;
    const b = Cc.y - O.y;
    const A = vec(O.x - a, O.y - b);
    const B = vec(O.x + a, O.y - b);
    const D = vec(O.x - a, O.y + b);
    return { A, B, D, l: 2 * a, w: 2 * b, E: mid(A, B), F: mid(B, Cc), G: mid(Cc, D), H: mid(D, A) };
  };

  return {
    steps: [
      {
        title: "Stretch a rectangle",
        text: "Drag corner $C$. Four right angles make a rectangle of length $l$ and width $w$. Compare its two diagonals in the panel — and bring $l$ and $w$ together until the shape clicks into a square.",
      },
      {
        title: "Equal diagonals",
        text: "A rectangle is a parallelogram, so $BC = AD$ and the diagonals bisect each other. Right triangles $ABC$ and $BAD$ share leg $AB$ and have equal second legs, so their hypotenuses agree: $AC = BD = \\sqrt{l^2 + w^2}$.",
      },
      {
        title: "A square is both",
        text: "Make all four sides equal as well, $l = w = s$: a square. It is a rectangle and a rhombus at once, so its diagonals are equal, bisect each other and are perpendicular. Each one is $\\sqrt{s^2 + s^2} = s\\sqrt2$.",
      },
      {
        title: "Join the midpoints",
        text: "Mark the midpoints $E$, $F$, $G$, $H$ of the sides and join them in order. Each corner triangle has a right angle between two legs of length $\\tfrac12 s$: four congruent isosceles right triangles.",
      },
      {
        title: "A square inside",
        text: "Their hypotenuses are equal, so $EF = FG = GH = HE$. Their base angles are $45^\\circ$, so at $E$ what remains of the straight angle is $180^\\circ - 45^\\circ - 45^\\circ = 90^\\circ$. Equal sides and right angles: $EFGH$ is a square.",
      },
    ],

    draw(g, f) {
      settle(f.step);
      const { A, B, D, l, w, E, F, G, H } = measure();
      const corners: Vec[] = [A, B, Cc, D];
      const mids: Vec[] = [E, F, G, H];
      const isSquare = same(l, w);

      g.polygon(corners, { fill: GLASS, stroke: null });

      const halves = f.at(1) * (1 - f.at(2));
      if (halves > 0) {
        g.polygon([A, B, Cc], { fill: tint(D1, 0.16), stroke: null, alpha: halves });
        g.polygon([B, A, D], { fill: tint(D2, 0.16), stroke: null, alpha: halves });
      }

      const inner = f.at(3);
      const diagonals = 1 - 0.75 * inner;
      g.segment(A, Cc, { color: D1, alpha: diagonals });
      g.segment(B, D, { color: D2, alpha: diagonals });
      if (f.at(1) > 0) {
        const a = f.at(1) * diagonals;
        g.ticks(A, O, 2, { color: D1, alpha: a });
        g.ticks(O, Cc, 2, { color: D1, alpha: a });
        g.ticks(B, O, 2, { color: D2, alpha: a });
        g.ticks(O, D, 2, { color: D2, alpha: a });
      }
      if (f.at(2) > 0) g.angle(B, O, Cc, { r: 16, width: 2, alpha: f.at(2) * diagonals });

      if (inner > 0) {
        corners.forEach((corner, i) => {
          g.polygon([mids[(i + 3) % 4], corner, mids[i]], { fill: tint(CORNER, 0.2), stroke: null, alpha: inner });
        });
        g.polygon(mids, { fill: tint(g.accent, 0.12 * f.at(4)), stroke: C.ink, width: 3, alpha: inner });
        for (const [p, name, dx, dy] of [[E, "E", 0, -18], [F, "F", 18, 0], [G, "G", 0, 18], [H, "H", -18, 0]] as const) {
          g.point(p, { alpha: inner });
          g.label(p, name, { dx, dy, bold: true, alpha: inner });
        }
      }
      if (f.at(4) > 0) {
        const a = f.at(4);
        g.angle(A, E, H, { color: CORNER, fill: true, r: 30, label: "45°", alpha: a });
        g.angle(F, E, B, { color: CORNER, fill: true, r: 30, label: "45°", alpha: a });
        g.angle(H, E, F, { r: 18, width: 2, alpha: a });
        mids.forEach((p, i) => g.ticks(p, mids[(i + 1) % 4], 2, { alpha: a }));
      }

      g.polygon(corners, { color: g.accent, width: 4 });
      for (const [p, q, r] of [[D, A, B], [A, B, Cc], [B, Cc, D], [Cc, D, A]] as const) {
        g.angle(p, q, r, { color: g.accent, r: 13, width: 2 });
      }
      if (isSquare) {
        corners.forEach((p, i) => {
          const q = corners[(i + 1) % 4];
          if (inner > 0) {
            g.ticks(p, mid(p, q), 1, { color: g.accent });
            g.ticks(mid(p, q), q, 1, { color: g.accent });
          } else {
            g.ticks(p, q, 1, { color: g.accent });
          }
        });
      }
      const offset = inner > 0 ? -34 : -16;
      g.along(A, B, isSquare ? "s" : "l", { color: g.accent, offset });
      g.along(B, Cc, isSquare ? "s" : "w", { color: g.accent, offset });

      for (const [p, label, dx, dy] of [[A, "A", -15, -13], [B, "B", 15, -13], [D, "D", -15, 13]] as const) {
        g.point(p, { color: g.accent });
        g.label(p, label, { color: g.accent, dx, dy, bold: true });
      }
    },

    readout(f) {
      settle(f.step);
      const { A, B, D, l, w, E, F, H } = measure();
      const ac = dist(A, Cc);
      const bd = dist(B, D);
      if (f.step < SQUARE_FROM) {
        return [
          { label: "Sides", tex: `l = ${fmt(l)},\\quad w = ${fmt(w)}` },
          {
            label: "Diagonal by Pythagoras",
            tex: `\\sqrt{${fmt(l)}^2 + ${fmt(w)}^2} = ${fmt(Math.hypot(l, w), 2)}`,
          },
          { label: "Diagonals, measured", tex: `AC = ${fmt(ac, 2)},\\quad BD = ${fmt(bd, 2)}`, tone: "good" },
          { label: "Half of each", tex: `\\tfrac12 AC = \\tfrac12 BD = ${fmt(ac / 2, 2)}` },
          {
            label: "Shape",
            tex: same(l, w) ? "\\text{square: } l = w" : "\\text{rectangle}",
            tone: same(l, w) ? "good" : "plain",
          },
        ];
      }
      const rows: Readout[] = [
        { label: "Side", tex: `s = ${fmt(l)}` },
        { label: "Diagonal by Pythagoras", tex: `s\\sqrt2 = ${fmt(l * Math.SQRT2, 2)}` },
        { label: "Diagonals, measured", tex: `AC = ${fmt(ac, 2)},\\quad BD = ${fmt(bd, 2)}`, tone: "good" },
      ];
      if (f.step < 3) return rows;
      return [
        ...rows,
        {
          label: "Inner sides",
          tex: `EF = ${fmt(dist(E, F), 2)},\\quad HE = ${fmt(dist(H, E), 2)}`,
          tone: "good",
        },
        {
          label: "Inner angle",
          tex: `\\angle HEF = ${fmt(toDeg(angleAt(H, E, F)))}^\\circ`,
          tone: "good",
        },
        { label: "Inner area", tex: `EF^2 = ${fmt(dist(E, F) ** 2)} = \\tfrac12 s^2` },
      ];
    },
  };
});
