// Pythagorean triples: right triangles whose three sides are all whole
// numbers. The legs snap to a lattice; the triangle lights up when the
// hypotenuse comes out whole, and a scaled copy shows that multiplying a
// triple by any factor gives sides that still satisfy a² + b² = c².

import { C, tint } from "../draw.ts";
import { clamp, fmt, lerp, type Vec } from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

// The right-angle corner, and how many lattice units fit at each zoom.
const ORIGIN = { x: -6.5, y: -3.3 };
const NEAR = { unit: 1, aMax: 12, bMax: 8 };
const FAR = { unit: 0.5, aMax: 24, bMax: 16 };

// Legs (a, b) of the triples that fit on the far lattice, primitives first.
const TRIPLES: readonly (readonly [number, number])[] = [
  [4, 3], [12, 5], [15, 8], [24, 7], [8, 6], [12, 9], [16, 12], [20, 15], [24, 10],
];

const SCALE_STEP = 0.25;
const SCALED = C.violet;

const gcd = (m: number, n: number): number => (n === 0 ? m : gcd(n, m % n));

export default lesson((s) => {
  const far = s.toggle("Zoom out", false);
  const zoom = () => (far.on ? FAR : NEAR);
  const at = (x: number, y: number): Vec => ({ x: ORIGIN.x + x * zoom().unit, y: ORIGIN.y + y * zoom().unit });

  // The legs, in lattice units. The handles are placed from these each frame.
  let a = 4;
  let b = 3;
  const endOfA = s.point(ORIGIN.x + a, ORIGIN.y, {
    color: C.gold,
    constrain: (p) => {
      a = clamp(Math.round((p.x - ORIGIN.x) / zoom().unit), 1, zoom().aMax);
      return at(a, 0);
    },
  });
  const endOfB = s.point(ORIGIN.x, ORIGIN.y + b, {
    color: C.cyan,
    constrain: (p) => {
      b = clamp(Math.round((p.y - ORIGIN.y) / zoom().unit), 1, zoom().bMax);
      return at(0, b);
    },
  });

  const factor = s.slider({
    label: "scale n =",
    at: { x: 1.4, y: -4.5 },
    width: 4,
    min: SCALE_STEP,
    max: 3,
    value: 1,
    step: SCALE_STEP,
  });

  s.button("Next triple", () => {
    const fits = TRIPLES.filter(([x, y]) => x <= zoom().aMax && y <= zoom().bMax);
    const current = fits.findIndex(([x, y]) => x === a && y === b);
    [a, b] = fits[(current + 1) % fits.length];
  });

  /** Keep the legs on the lattice in view and the scaled copy inside it. */
  const settle = (): void => {
    const { aMax, bMax } = zoom();
    a = Math.min(a, aMax);
    b = Math.min(b, bMax);
    const room = Math.floor(Math.min(aMax / a, bMax / b) / SCALE_STEP) * SCALE_STEP;
    if (factor.value > room) factor.value = room;
  };

  const hypotenuse = () => {
    const squared = a * a + b * b;
    const root = Math.round(Math.sqrt(squared));
    // The triple as it is usually written, shorter leg first.
    const triple = [Math.min(a, b), Math.max(a, b), root];
    return { squared, c: Math.sqrt(squared), whole: root * root === squared, triple };
  };

  return {
    steps: [
      {
        title: "Whole-number right triangles",
        text: "Drag the ends of the legs; they snap to whole numbers. Usually $c = \\sqrt{a^2 + b^2}$ is not whole. Hunt for legs where it is, such as $3$ and $4$: the triangle lights up for every Pythagorean triple.",
      },
      {
        title: "Triples worth knowing",
        text: "Tap “Next triple” to visit $(3, 4, 5)$ and $(5, 12, 13)$, then zoom out for $(8, 15, 17)$ and $(7, 24, 25)$. Check one yourself: $5^2 + 12^2 = 25 + 144 = 169 = 13^2$.",
      },
      {
        title: "Scale a triple",
        text: "Move the slider to multiply every side by $n$. Because $(na)^2 + (nb)^2 = n^2(a^2 + b^2) = n^2c^2 = (nc)^2$, the scaled sides still form a right triangle, whether $n$ is whole or not.",
      },
    ],

    draw(g) {
      settle();
      const { unit, aMax, bMax } = zoom();
      Object.assign(endOfA, at(a, 0));
      Object.assign(endOfB, at(0, b));
      const { c, whole, triple } = hypotenuse();
      const n = factor.value;

      for (let i = 0; i <= aMax; i++) g.segment(at(i, 0), at(i, bMax), { color: C.faint, width: 1 });
      for (let j = 0; j <= bMax; j++) g.segment(at(0, j), at(aMax, j), { color: C.faint, width: 1 });

      if (n !== 1) {
        const scaled = [ORIGIN, at(n * a, 0), at(0, n * b)];
        g.polygon(scaled, { fill: tint(SCALED, 0.12), color: SCALED, width: 2, dash: [7, 5] });
        g.label(lerp(scaled[1], scaled[2], 0.25), `n·c = ${fmt(n * c, 2)}`, {
          color: SCALED,
          size: 13,
          align: "left",
          dx: 10,
          dy: 10,
        });
      }

      const color = whole ? C.green : C.ink;
      g.polygon([ORIGIN, endOfA, endOfB], { fill: tint(whole ? C.green : g.accent, whole ? 0.32 : 0.12), stroke: null });
      g.segment(ORIGIN, endOfA, { color: C.gold });
      g.segment(ORIGIN, endOfB, { color: C.cyan });
      g.segment(endOfA, endOfB, { color, width: whole ? 4 : 3 });
      g.angle(endOfA, ORIGIN, endOfB, { r: Math.min(14, unit * g.view.scale * 0.6), width: 2 });
      g.along(ORIGIN, endOfA, `a = ${a}`, { color: C.gold, offset: -16 });
      g.along(ORIGIN, endOfB, `b = ${b}`, { color: C.cyan, offset: 26 });
      g.label(lerp(endOfA, endOfB, 0.5), whole ? `c = ${fmt(c)}` : `c = √${a * a + b * b} ≈ ${fmt(c, 2)}`, {
        color,
        bold: whole,
        align: "left",
        dx: 10,
        dy: 10,
      });

      const headline = whole ? `(${triple.join(", ")}) is a Pythagorean triple` : "not a triple";
      g.label(at(aMax, bMax), headline, { color: whole ? C.green : C.dim, bold: whole, align: "right", dx: -10, dy: -16 });
    },

    readout() {
      settle();
      const { squared, c, whole, triple } = hypotenuse();
      const n = factor.value;
      const shared = gcd(a, b);
      const scaledLegs = (n * a) ** 2 + (n * b) ** 2;
      const scaledHypotenuse = (n * c) ** 2;
      return [
        { label: "Legs", tex: `a^2 + b^2 = ${a * a} + ${b * b} = ${squared}` },
        {
          label: "Hypotenuse",
          tex: whole ? `c = \\sqrt{${squared}} = ${fmt(c)}` : `c = \\sqrt{${squared}} \\approx ${fmt(c, 2)}`,
          tone: whole ? "good" : "plain",
        },
        {
          label: "Triple",
          tex: !whole
            ? "\\text{not whole numbers}"
            : shared === 1
              ? `(${triple.join(", ")})`
              : `(${triple.join(", ")}) = ${shared} \\cdot (${triple.map((side) => side / shared).join(", ")})`,
          tone: whole ? "good" : "dim",
        },
        { label: "Scaled sides", tex: `n = ${fmt(n, 2)}:\\ (${fmt(n * a, 2)},\\ ${fmt(n * b, 2)},\\ ${fmt(n * c, 2)})` },
        {
          label: "Still a right triangle",
          tex: `(na)^2 + (nb)^2 = ${fmt(scaledLegs, 2)} = (nc)^2`,
          tone: holds(agree(scaledLegs, scaledHypotenuse)),
        },
      ];
    },
  };
});
