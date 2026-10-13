// Why a disc has area πr². The disc is cut into n equal wedges, which are then
// dealt out in a row, alternately point down and point up. The row has half
// the rim along each long edge (πr) and a radius for its slanted side, and
// straightens toward a πr-by-r rectangle as n grows. A last step bends the same
// rim into a square, which encloses less.

import { C, tint } from "../draw.ts";
import { add, fmt, lerp, TAU, vec } from "../geo.ts";
import { turnBetween } from "../kit/circles.ts";
import { lesson } from "../scene.ts";

const DISC = vec(-5.2, 0.9);
const ROW_LEFT = -2.6; // left edge of the dealt-out row
const SQUARE = vec(2.2, 0.9);
const UP = Math.PI / 2;
const EVEN = C.gold;
const ODD = C.blue;

export default lesson((s) => {
  const wedges = s.slider({ label: "wedges:", at: vec(-7.4, -4.3), width: 4.4, min: 4, max: 40, value: 12, step: 2 });
  const radius = s.slider({ label: "r =", at: vec(-1.6, -4.3), width: 3.4, min: 1.2, max: 2.2, value: 1.9, step: 0.1 });

  return {
    steps: [
      {
        title: "Slice the disc",
        text: "Use the slider to cut the disc into more or fewer equal wedges. Cutting changes nothing about the area: together the wedges are still the whole disc of radius $r$.",
      },
      {
        title: "Deal them out",
        text: "Lay the wedges in a row, alternately point down and point up. Each fits against the next along a straight side, so no area is gained or lost. Try more wedges.",
      },
      {
        title: "Almost a rectangle",
        text: "Half the rim runs along the top and half along the bottom, each $\\pi r$ long, and the slanted side is a radius. More wedges straighten the row toward a $\\pi r$ by $r$ rectangle, so $A = \\pi r \\cdot r = \\pi r^2$.",
      },
      {
        title: "The best use of a fence",
        text: "Bend the same length of rim into a square instead. The circle holds $\\frac{4}{\\pi} \\approx 1.27$ times as much. In fact no shape with that perimeter encloses more than the circle does.",
      },
    ],

    draw(g, f) {
      const n = wedges.value;
      const r = radius.value;
      const half = Math.PI / n; // half the angle of one wedge
      const stride = r * Math.sin(half); // between neighbouring points in the row
      const rise = r * Math.cos(half);
      const floor = DISC.y - r / 2;
      const rowStart = vec(ROW_LEFT + stride, floor);
      const dealt = f.at(1) * (1 - f.at(3));

      g.circle(DISC, r, { color: C.dim, width: 2 });

      for (let i = 0; i < n; i++) {
        const even = i % 2 === 0;
        const inDisc = (i + 0.5) * 2 * half;
        const inRow = even ? UP : -UP;
        const apex = lerp(DISC, vec(rowStart.x + i * stride, floor + (even ? 0 : rise)), dealt);
        const axis = inDisc + turnBetween(inRow, inDisc) * dealt;
        const color = even ? EVEN : ODD;
        g.sector(apex, r, axis - half, axis + half, { fill: tint(color, 0.45), stroke: color, width: 1.5 });
      }

      if (f.at(2) > 0) {
        const alpha = f.at(2) * (1 - f.at(3));
        const side = add(rowStart, vec(-stride, rise)); // top of the row's left edge
        g.segment(rowStart, side, { color: C.pink, width: 4, alpha });
        g.along(rowStart, side, "r", { color: C.pink, offset: -16, alpha });
        g.label(vec(rowStart.x + (n * stride) / 2, floor + r), "top edge: half the rim, πr", {
          color: EVEN,
          dy: 20,
          alpha,
        });
        g.label(vec(rowStart.x + (n * stride) / 2, floor + rise - r), "bottom edge: the other half, πr", {
          color: ODD,
          dy: -20,
          alpha,
        });
      }

      if (f.at(3) > 0) {
        const alpha = f.at(3);
        const h = (Math.PI * r) / 4; // half the side of the square with the disc's perimeter
        const corners = [vec(-h, -h), vec(h, -h), vec(h, h), vec(-h, h)].map((c) => add(SQUARE, c));
        g.circle(DISC, r, { color: g.accent, width: 4, alpha });
        g.polygon(corners, { color: g.accent, width: 4, fill: tint(g.accent, 0.2), alpha });
        g.label(SQUARE, `area ${fmt((2 * h) ** 2, 2)}`, { alpha });
        g.label(vec(SQUARE.x, SQUARE.y - h), `fence ${fmt(TAU * r, 2)}`, { color: g.accent, dy: -18, alpha });
        g.label(vec(DISC.x, DISC.y - r), `fence ${fmt(TAU * r, 2)}`, { color: g.accent, dy: -18, alpha });
        g.label(vec(DISC.x, DISC.y + r), `area ${fmt(Math.PI * r * r, 2)}`, { dy: 18, alpha });
      }
    },

    readout(f) {
      const n = wedges.value;
      const r = radius.value;
      const area = Math.PI * r * r;

      if (f.step === 3) {
        const fence = TAU * r;
        const square = (fence / 4) ** 2;
        return [
          { label: "Length of fence", tex: `P = 2\\pi r = ${fmt(fence, 2)}` },
          { label: "As a square", tex: `\\left(\\tfrac{P}{4}\\right)^2 = (${fmt(fence / 4, 2)})^2 = ${fmt(square, 2)}` },
          { label: "As a circle", tex: `\\pi r^2 = \\frac{P^2}{4\\pi} = ${fmt(fence ** 2 / (4 * Math.PI), 2)}` },
          {
            label: "Circle ÷ square",
            tex: `\\frac{${fmt(area, 2)}}{${fmt(square, 2)}} = ${fmt(area / square, 3)} = \\frac{4}{\\pi}`,
            tone: "good",
          },
        ];
      }

      const base = n * r * Math.sin(Math.PI / n);
      const height = r * Math.cos(Math.PI / n);
      return [
        { label: "Wedges", tex: `n = ${n}` },
        { label: "Half the rim", tex: `\\tfrac12 C = \\pi r = ${fmt(Math.PI * r, 2)}` },
        { label: "Row measured straight across", tex: `${fmt(base, 2)} \\text{ wide},\\ ${fmt(height, 2)} \\text{ tall}` },
        { label: "Straight width × height", tex: `(${fmt(base, 2)})(${fmt(height, 2)}) = ${fmt(base * height, 2)}` },
        { label: "Area of the disc", tex: `\\pi r \\cdot r = \\pi r^2 = ${fmt(area, 2)}`, tone: "good" },
      ];
    },
  };
});
