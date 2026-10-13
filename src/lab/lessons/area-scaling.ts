// Scale a figure by k and its area is multiplied by k². A triangle (whose
// altitude stretches by k along with its base), a square counted in copies of
// the original, and a circle each sit beside their scaled copy.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, mid, polygonArea, vec, type Vec } from "../geo.ts";
import { lesson, type Frame } from "../scene.ts";

const BASE_Y = -2.9;
const ORIGINAL_X = -7.3; // left edge of the original figure
const SCALED_X = -3.8; // left edge of its scaled copy

// The original figures, in stage units.
const TRI = { base: 2.4, height: 2, foot: 1.6 };
const SIDE = 2;
const RADIUS = 1;

const ORIGINAL = C.blue;
const LENGTH = C.gold;

const SHAPES = ["Triangle", "Square", "Circle"] as const;
type Shape = (typeof SHAPES)[number];

/** Corners of the triangle scaled by `k`: base ends, apex, foot of the altitude. */
function triangle(left: number, k: number): { p: Vec; q: Vec; apex: Vec; foot: Vec } {
  return {
    p: vec(left, BASE_Y),
    q: vec(left + k * TRI.base, BASE_Y),
    apex: vec(left + k * TRI.foot, BASE_Y + k * TRI.height),
    foot: vec(left + k * TRI.foot, BASE_Y),
  };
}

const square = (left: number, side: number): Vec[] => [
  vec(left, BASE_Y),
  vec(left + side, BASE_Y),
  vec(left + side, BASE_Y + side),
  vec(left, BASE_Y + side),
];

function area(shape: Shape, k: number): number {
  if (shape === "Triangle") {
    const t = triangle(0, k);
    return polygonArea([t.p, t.q, t.apex]);
  }
  if (shape === "Square") return polygonArea(square(0, k * SIDE));
  return Math.PI * (k * RADIUS) ** 2;
}

export default lesson((s) => {
  const shape = s.choice("Shape", SHAPES);
  const factor = s.slider({ label: "k =", at: { x: -7.6, y: -4.3 }, width: 5, min: 0.5, max: 3, value: 2, step: 0.25 });

  /** The chosen figure: the original, or its copy scaled by k. */
  function figure(g: Draw, f: Frame, copy: boolean): void {
    const left = copy ? SCALED_X : ORIGINAL_X;
    const k = copy ? factor.value : 1;
    const color = copy ? g.accent : ORIGINAL;
    const name = (letter: string, length: number): string =>
      copy ? `k·${letter} = ${fmt(k * length, 2)}` : `${letter} = ${fmt(length, 2)}`;
    const glass = { fill: tint(color, 0.22), color, width: 2.5 };
    const lengths = f.at(1);
    const pieces = f.at(2);
    let top = BASE_Y;
    let centre = left;

    if (shape.value === "Triangle") {
      const t = triangle(left, k);
      top = t.apex.y;
      centre = left + (k * TRI.base) / 2;
      if (pieces > 0) {
        const box = [t.p, t.q, vec(t.q.x, top), vec(t.p.x, top)];
        g.polygon(box, { color: C.dim, width: 1.5, dash: [5, 5], alpha: pieces });
      }
      g.polygon([t.p, t.q, t.apex], glass);
      if (lengths > 0) {
        g.segment(t.apex, t.foot, { color: LENGTH, width: 2, dash: [6, 5], alpha: lengths });
        g.angle(t.apex, t.foot, t.q, { color: LENGTH, r: 11, width: 1.5, alpha: lengths });
        g.segment(t.p, t.q, { color: LENGTH, alpha: lengths });
        g.along(t.p, t.q, name("b", TRI.base), { color: LENGTH, offset: -16, alpha: lengths });
        g.label(mid(t.apex, t.foot), name("h", TRI.height), { color: LENGTH, size: 14, align: "left", dx: 8, alpha: lengths });
      }
    } else if (shape.value === "Square") {
      const side = k * SIDE;
      const corners = square(left, side);
      top = BASE_Y + side;
      centre = left + side / 2;
      g.polygon(corners, glass);
      if (pieces > 0 && copy) {
        // The original square laid into the corner, and the grid of its copies.
        const cell = Math.min(side, SIDE);
        g.polygon(square(left, cell), { fill: tint(ORIGINAL, 0.35), stroke: null, alpha: pieces });
        for (let d = SIDE; d < side - 1e-9; d += SIDE) {
          g.segment(vec(left + d, BASE_Y), vec(left + d, top), { color, width: 1.5, alpha: pieces });
          g.segment(vec(left, BASE_Y + d), vec(left + side, BASE_Y + d), { color, width: 1.5, alpha: pieces });
        }
      }
      if (lengths > 0) {
        g.segment(corners[0], corners[1], { color: LENGTH, alpha: lengths });
        g.along(corners[0], corners[1], name("a", SIDE), { color: LENGTH, offset: -16, alpha: lengths });
      }
    } else {
      const r = k * RADIUS;
      const o = vec(left + r, BASE_Y + r);
      top = BASE_Y + 2 * r;
      centre = o.x;
      g.circle(o, r, glass);
      if (pieces > 0) {
        // The square on the radius: the circle is always π of these.
        const onRadius = [o, vec(o.x + r, o.y), vec(o.x + r, o.y + r), vec(o.x, o.y + r)];
        g.polygon(onRadius, { fill: tint(LENGTH, 0.18), color: LENGTH, width: 1.5, dash: [5, 5], alpha: pieces });
      }
      if (lengths > 0) {
        g.segment(o, vec(o.x + r, o.y), { color: LENGTH, alpha: lengths });
        g.point(o, { color: LENGTH, r: 3.5, alpha: lengths });
        g.label(vec(centre, BASE_Y), name("r", RADIUS), { color: LENGTH, size: 14, dy: -16, alpha: lengths });
      }
    }
    g.label(vec(centre, top), `area ${fmt(area(shape.value, k), 2)}`, { color, dy: 18, bold: true });
  }

  return {
    steps: [
      {
        title: "Grow a figure",
        text: "Slide $k$ to scale the copy on the right, and try each shape. The copy is $k$ times as wide — but compare the two areas. Doubling the size does not double the area.",
      },
      {
        title: "Every length scales",
        text: "In a similar copy every length is multiplied by $k$ — not only the sides. The triangle's altitude is $k$ times as tall, just as a square's side and a circle's radius are $k$ times as long.",
      },
      {
        title: "Area takes k twice",
        text: "An area multiplies two lengths: $\\tfrac12 bh$, $a \\cdot a$, $\\pi \\cdot r \\cdot r$. Each length brings one factor of $k$, so the area is multiplied by $k^2$. In the square you can count the $k^2$ copies.",
      },
    ],

    draw(g, f) {
      figure(g, f, false);
      figure(g, f, true);
    },

    readout() {
      const k = factor.value;
      const before = area(shape.value, 1);
      const after = area(shape.value, k);
      const formulas: Record<Shape, { lengths: string; before: string; after: string }> = {
        Triangle: {
          lengths: `kb = ${fmt(k * TRI.base, 2)},\\quad kh = ${fmt(k * TRI.height, 2)}`,
          before: `\\tfrac12 bh = \\tfrac12(${fmt(TRI.base)})(${fmt(TRI.height)}) = ${fmt(before, 2)}`,
          after: `\\tfrac12 (kb)(kh) = ${fmt(after, 2)}`,
        },
        Square: {
          lengths: `ka = ${fmt(k)} \\cdot ${fmt(SIDE)} = ${fmt(k * SIDE, 2)}`,
          before: `a^2 = ${fmt(SIDE)}^2 = ${fmt(before, 2)}`,
          after: `(ka)^2 = ${fmt(k * SIDE, 2)}^2 = ${fmt(after, 2)}`,
        },
        Circle: {
          lengths: `kr = ${fmt(k)} \\cdot ${fmt(RADIUS)} = ${fmt(k * RADIUS, 2)}`,
          before: `\\pi r^2 = \\pi \\cdot ${fmt(RADIUS)}^2 = ${fmt(before, 2)}`,
          after: `\\pi (kr)^2 = \\pi \\cdot ${fmt(k * RADIUS, 2)}^2 = ${fmt(after, 2)}`,
        },
      };
      const row = formulas[shape.value];
      return [
        { label: "Scale factor", tex: `k = ${fmt(k, 2)}` },
        { label: "Scaled lengths", tex: row.lengths },
        { label: "Original area", tex: row.before },
        { label: "Scaled area", tex: row.after },
        { label: "Ratio of areas", tex: `\\frac{${fmt(after, 2)}}{${fmt(before, 2)}} = ${fmt(after / before, 4)}`, tone: "good" },
        { label: "Scale factor squared", tex: `k^2 = ${fmt(k, 2)}^2 = ${fmt(k * k, 4)}`, tone: "good" },
      ];
    },
  };
});
