// Area = ½ · base · height, for every triangle. A right triangle is half a
// rectangle; the altitude cuts any other triangle into two right triangles,
// which add when its foot lands inside the base and subtract when it lands
// outside. Any of the three sides can play the base.

import { C, tint } from "../draw.ts";
import {
  add, both, cross, dist, dot, fmt, inBox, lerp, project, sub, triangleArea, vec,
  type Constraint,
} from "../geo.ts";
import { labelAway } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const A = vec(-2, -2.2);
const B = vec(2, -2.2);

const BIG = C.blue; // the right triangle on the longer piece, m
const SMALL = C.gold; // the right triangle on the shorter piece, n
const REMOVED = C.red; // the same triangle when it has to be taken away
const HEIGHT = C.pink;

const SNAP = 0.15;
const ON_CORNER = 1e-3; // as a fraction of the base
const BASES = ["AB", "BC", "CA"] as const;
type Base = (typeof BASES)[number];

/** Catch the apex directly above A or B, where the triangle is right-angled. */
const snapAbove: Constraint = (p) => {
  for (const corner of [A, B]) if (Math.abs(p.x - corner.x) < SNAP) return { x: corner.x, y: p.y };
  return p;
};

export default lesson((s) => {
  const V = s.point(0.8, 2.2, { label: "C", constrain: both(inBox(-6, 6, 0.2, 2.8), snapAbove) });
  const base = s.choice("Base", BASES);

  /** The triangle read from one base: its ends, the apex, and the altitude. */
  const read = (which: Base) => {
    const [P, Q, R] = which === "AB" ? [A, B, V] : which === "BC" ? [B, V, A] : [V, A, B];
    const D = project(R, P, Q);
    const b = dist(P, Q);
    const t = dot(sub(D, P), sub(Q, P)) / (b * b);
    const where = Math.abs(t) < ON_CORNER || Math.abs(t - 1) < ON_CORNER ? "corner" : t > 0 && t < 1 ? "inside" : "outside";
    // The end of the base farther from the foot bounds the bigger right triangle.
    const [far, near] = t < 0.5 ? [Q, P] : [P, Q];
    return { P, Q, R, D, b, h: dist(R, D), far, near, m: dist(D, far), n: dist(D, near), where } as const;
  };

  return {
    steps: [
      {
        title: "Slide the apex",
        text: "Drag $C$ left and right, well past the ends of $AB$. The triangle leans right over, yet its area only changes when its height does. The chips choose which side counts as the base.",
      },
      {
        title: "Drop the altitude",
        text: "The height $h$ is the perpendicular from the opposite corner to the line of the base, meeting it at $D$. When the triangle leans far enough, $D$ lands outside the base, on its extension.",
      },
      {
        title: "Half a rectangle",
        text: "The altitude makes two right triangles that share the leg $h$; their other legs are $m$ and $n$. A right triangle is a rectangle cut along its diagonal, so their areas are $\\frac12 mh$ and $\\frac12 nh$.",
      },
      {
        title: "Add or subtract",
        text: "With $D$ inside the base the pieces add: $\\frac12 mh + \\frac12 nh$, and $b = m + n$. With $D$ outside, take the smaller from the larger: $\\frac12 mh - \\frac12 nh$, and $b = m - n$. Either way, $\\frac12 bh$.",
      },
      {
        title: "Any side will do",
        text: "Switch the base with the chips. Each side has its own altitude and its own cut-up picture, but all three products $\\frac12 \\cdot \\text{base} \\cdot \\text{height}$ give the same area.",
      },
    ],

    draw(g, f) {
      const { P, Q, R, D, far, near, n, where } = read(base.value);
      const up = sub(R, D);
      const smallColor = where === "outside" ? REMOVED : SMALL;
      const centre = lerp(lerp(A, B, 0.5), V, 1 / 3);

      if (f.at(2) > 0) {
        const alpha = f.at(2);
        g.polygon([D, far, add(far, up), R], { fill: tint(BIG, 0.07), color: tint(BIG, 0.6), width: 1.5, alpha });
        g.polygon([D, far, R], { fill: tint(BIG, 0.22), stroke: null, alpha });
        if (where !== "corner") {
          g.polygon([D, near, add(near, up), R], {
            fill: tint(smallColor, 0.07), color: tint(smallColor, 0.7), width: 1.5,
            dash: where === "outside" ? [5, 4] : [], alpha,
          });
          g.polygon([D, near, R], { fill: tint(smallColor, 0.26), stroke: null, alpha });
        }
      }
      if (f.at(4) > 0) {
        for (const other of BASES.filter((name) => name !== base.value)) {
          const o = read(other);
          g.segment(o.near, o.D, { color: C.faint, width: 1.5, dash: [4, 5], alpha: f.at(4) });
          g.segment(o.R, o.D, { color: C.dim, width: 1.5, dash: [4, 5], alpha: f.at(4) });
        }
      }

      g.polygon([A, B, V], { fill: f.step < 2 ? tint(g.accent, 0.14) : undefined, color: C.ink });
      g.segment(P, Q, { color: g.accent, width: 5 });
      // Labels for the base go on the side facing away from the apex.
      const outward = cross(sub(Q, P), sub(R, P)) > 0 ? -1 : 1;
      g.along(P, Q, "b", { color: g.accent, offset: outward * (f.step >= 2 ? 36 : 17), size: 16 });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        if (where === "outside") g.segment(near, D, { color: C.dim, width: 2, dash: [6, 5], alpha });
        g.segment(R, D, { color: HEIGHT, dash: [7, 5], alpha });
        if (where !== "corner") g.angle(R, D, far, { color: HEIGHT, r: 14, width: 2, alpha });
        g.along(D, R, "h", { color: HEIGHT, offset: cross(up, sub(far, D)) > 0 ? 14 : -14, size: 16, alpha });
        g.point(D, { color: HEIGHT, r: 4, alpha });
        if (where !== "corner") labelAway(g, D, "D", lerp(R, far, 0.5), { color: HEIGHT, alpha });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        g.along(D, far, "m", { color: BIG, offset: cross(sub(far, D), up) > 0 ? -17 : 17, size: 15, alpha });
        if (n > 0.3) {
          g.along(D, near, "n", { color: smallColor, offset: cross(sub(near, D), up) > 0 ? -17 : 17, size: 15, alpha });
        }
      }
      if (f.at(3) > 0) {
        const caption = {
          inside: ["D inside the base: the pieces add", SMALL],
          outside: ["D outside the base: take the red piece away", REMOVED],
          corner: ["D on a corner: one right triangle, half a rectangle", BIG],
        } as const;
        const [text, color] = caption[where];
        g.label(vec(0, 4.3), text, { color, alpha: f.at(3) });
      }

      g.point(A, { r: 4 });
      g.point(B, { r: 4 });
      labelAway(g, A, "A", centre);
      labelAway(g, B, "B", centre);
    },

    readout(f) {
      const { b, h, m, n, where } = read(base.value);
      const area = triangleArea(A, B, V);
      const half = (x: number, y: number): string => `\\tfrac12(${fmt(x, 2)})(${fmt(y, 2)})`;
      const pieces: Record<typeof where, Readout> = {
        inside: {
          label: "Two right triangles, added",
          tex: `${half(m, h)} + ${half(n, h)} = ${fmt((m * h) / 2 + (n * h) / 2, 2)}`,
        },
        outside: {
          label: "Bigger right triangle minus smaller",
          tex: `${half(m, h)} - ${half(n, h)} = ${fmt((m * h) / 2 - (n * h) / 2, 2)}`,
        },
        corner: { label: "A right triangle: half a rectangle", tex: `${half(m, h)} = ${fmt((m * h) / 2, 2)}` },
      };
      const rows: Readout[] = [
        { label: "Base and height", tex: `b = ${base.value} = ${fmt(b, 2)},\\quad h = ${fmt(h, 2)}` },
        { label: "Half base times height", tex: `\\tfrac12 bh = ${half(b, h)} = ${fmt((b * h) / 2, 2)}`, tone: "good" },
      ];
      if (f.step >= 2) rows.push({ ...pieces[where], tone: "good" });
      if (f.step >= 4) {
        for (const other of BASES.filter((name) => name !== base.value)) {
          const o = read(other);
          rows.push({ label: `With base $${other}$`, tex: `${half(o.b, o.h)} = ${fmt((o.b * o.h) / 2, 2)}`, tone: "good" });
        }
      }
      rows.push({ label: "Area, measured directly", tex: `[ABC] = ${fmt(area, 2)}` });
      return rows;
    },
  };
});
