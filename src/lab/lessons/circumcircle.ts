// The three perpendicular bisectors of a triangle meet at the circumcenter O,
// the centre of the circle through the vertices. O is inside an acute
// triangle, outside an obtuse one, and for a right triangle it is the midpoint
// of the hypotenuse — so the median to the hypotenuse is half the hypotenuse.

import { C, tint } from "../draw.ts";
import {
  add, angleAt, circumcenter, clamp, dist, fmt, mid, perp, polar, scale, sub, toDeg, toRad, type Vec,
} from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

const BASE = -1;
// How far below AB the circumcenter may sink before C is stopped.
const DEPTH = 3.4;
const SNAP = 0.2;
const RIGHT_STEP = 5;

const OF_AB = C.gold;
const OF_AC = C.blue;
const OF_BC = C.pink;
const RADIUS = C.green;

type Kind = "acute" | "right" | "obtuse";

export default lesson((s) => {
  // AB stays level and C stays above it and between its ends, so the angles
  // at A and B are acute and only the angle at C decides the triangle's kind.
  const A = s.point(-3.2, BASE, { label: "A", constrain: (p) => ({ x: clamp(p.x, -4.5, -1.2), y: BASE }) });
  const B = s.point(3.2, BASE, { label: "B", constrain: (p) => ({ x: clamp(p.x, 1.2, 4.5), y: BASE }) });

  let heldRight = false;
  const V = s.point(1, 3.5, {
    label: "C",
    constrain: (p) => {
      const m = mid(A, B);
      const half = dist(A, B) / 2;
      if (heldRight) {
        const angle = Math.atan2(Math.max(p.y - m.y, 0.01), p.x - m.x);
        return polar(m, half, clamp(angle, toRad(25), toRad(155)));
      }
      const x = clamp(p.x, A.x + 0.8, B.x - 0.8);
      // O sits (h² − d₁d₂) / 2h above AB, where h is C's height and d₁, d₂
      // the parts its foot cuts AB into; this is the h that puts O at −DEPTH.
      const lowest = -DEPTH + Math.sqrt(DEPTH * DEPTH + (x - A.x) * (B.x - x));
      const q = { x, y: clamp(p.y, BASE + lowest, 4.2) };
      // Near the semicircle on AB, land on it: the angle at C is exactly 90°.
      const r = dist(q, m);
      return Math.abs(r - half) < SNAP ? add(m, scale(sub(q, m), half / r)) : q;
    },
  });

  // P slides on the perpendicular bisector of AB.
  let height = -3.4;
  const P = s.point(0, height, {
    label: "P",
    color: RADIUS,
    constrain: (p) => {
      height = clamp(p.y, -4.4, 4.4);
      return { x: mid(A, B).x, y: height };
    },
  });
  const slidingPoint = (): Vec => ({ x: mid(A, B).x, y: height });

  const kindOf = (): Kind => {
    const gap = dist(B, V) ** 2 + dist(A, V) ** 2 - dist(A, B) ** 2;
    return Math.abs(gap) < 1e-6 ? "right" : gap > 0 ? "acute" : "obtuse";
  };

  return {
    steps: [
      {
        title: "Equally far from both ends",
        text: "Slide $P$ along the perpendicular bisector of $AB$: its distances to $A$ and to $B$ stay equal. Drag $A$, $B$ and $C$ to reshape the triangle.",
      },
      {
        title: "Why the distances match",
        text: "$M$ is the midpoint, so $MA = MB$; the angles at $M$ are both right, and $PM$ is shared. Triangles $PMA$ and $PMB$ are congruent, so $PA = PB$. Conversely, every point with $PA = PB$ lies on this line.",
      },
      {
        title: "Two bisectors cross",
        text: "Let the perpendicular bisectors of $AB$ and $AC$ meet at $O$. From the first, $OA = OB$. From the second, $OA = OC$.",
      },
      {
        title: "The third, and a circle",
        text: "Then $OB = OC$, so $O$ is on the perpendicular bisector of $BC$ too. The circle with centre $O$ and radius $R = OA$ passes through all three vertices: the circumcircle.",
      },
      {
        title: "Inside, on, or outside",
        text: "Drag $C$ down toward $AB$. While the angle at $C$ is acute, $O$ is inside the triangle. At exactly $90^\\circ$ it lands on side $AB$, and once the angle is obtuse, $O$ is outside.",
      },
      {
        title: "The right triangle",
        text: "$C$ is now held at a right angle. The bisector of $AC$ is parallel to $BC$ and starts from the midpoint of $AC$, so it crosses $AB$ at its midpoint. So $O$ is the midpoint of the hypotenuse, and the median $CO = R = \\tfrac{c}{2}$.",
      },
    ],

    draw(g, f) {
      heldRight = f.step === RIGHT_STEP;
      V.set(V);
      const exploring = f.step <= 1;
      const p = slidingPoint();
      P.x = p.x;
      P.y = p.y;
      P.hidden = !exploring;
      P.enabled = exploring;

      const O = circumcenter(A, B, V);
      const bisector = (a: Vec, b: Vec, color: string, ticks: number, alpha: number): void => {
        const m = mid(a, b);
        const up = add(m, perp(sub(b, a)));
        g.line(m, up, { color, width: 1.5, dash: [7, 6], alpha });
        g.angle(up, m, b, { color, r: 13, width: 2, alpha });
        g.ticks(a, m, ticks, { color, alpha });
        g.ticks(m, b, ticks, { color, alpha });
      };

      g.polygon([A, B, V], { fill: "rgba(255, 255, 255, 0.05)" });
      bisector(A, B, OF_AB, 1, 1);

      if (exploring) {
        const m = mid(A, B);
        if (f.at(1) > 0) {
          g.polygon([p, m, A], { fill: tint(C.blue, 0.22), stroke: null, alpha: f.at(1) });
          g.polygon([p, m, B], { fill: tint(C.violet, 0.22), stroke: null, alpha: f.at(1) });
        }
        g.segment(p, A, { color: RADIUS });
        g.segment(p, B, { color: RADIUS });
        g.ticks(p, A, 2, { color: RADIUS });
        g.ticks(p, B, 2, { color: RADIUS });
        g.point(m, { label: "M", color: OF_AB });
        return;
      }

      const two = f.at(2);
      bisector(A, V, OF_AC, 2, two);
      if (f.at(3) > 0) {
        bisector(B, V, OF_BC, 3, f.at(3));
        g.circle(O, dist(O, A), { color: g.accent, fill: tint(g.accent, 0.08), alpha: f.at(3) });
      }
      for (const vertex of [A, B, V]) g.segment(O, vertex, { color: RADIUS, width: 2.5, alpha: two });
      g.point(O, { color: g.accent, alpha: two });

      const kind = kindOf();
      if (f.at(4) > 0) {
        const where = { acute: "O is inside", right: "O is on the hypotenuse", obtuse: "O is outside" }[kind];
        const color = { acute: C.green, right: C.gold, obtuse: C.red }[kind];
        g.angle(A, V, B, { color, fill: true, r: 30, label: true, alpha: f.at(4) });
        g.label(O, where, { color, bold: true, dy: -22, alpha: f.at(4) });
      } else {
        g.label(O, "O", { color: g.accent, dx: 14, dy: -14, bold: true, alpha: two });
      }
      if (f.at(RIGHT_STEP) > 0) {
        const five = f.at(RIGHT_STEP);
        for (const vertex of [A, B, V]) g.ticks(O, vertex, 1, { color: RADIUS, alpha: five });
        g.along(O, V, "R = c/2", { color: RADIUS, alpha: five, offset: 30 });
      }
    },

    readout(f) {
      if (f.step <= 1) {
        const p = slidingPoint();
        const toA = dist(p, A);
        const toB = dist(p, B);
        return [
          { label: "From $P$ to $A$", tex: `PA = ${fmt(toA, 2)}` },
          { label: "From $P$ to $B$", tex: `PB = ${fmt(toB, 2)}` },
          { label: "On the perpendicular bisector", tex: "PA = PB", tone: holds(agree(toA, toB)) },
        ];
      }
      const O = circumcenter(A, B, V);
      const [OA, OB, OC] = [A, B, V].map((vertex) => dist(O, vertex));
      const rows = [
        {
          label: "From $O$ to each vertex",
          tex: `OA = ${fmt(OA, 2)},\\ OB = ${fmt(OB, 2)},\\ OC = ${fmt(OC, 2)}`,
          tone: holds(agree(OA, OB, OC)),
        },
      ];
      if (f.step < 4) return rows;

      const kind = kindOf();
      const half = dist(A, B) / 2;
      const median = dist(V, mid(A, B));
      const where = { acute: "inside the triangle", right: "on side AB", obtuse: "outside the triangle" }[kind];
      const whenRight = kind === "right" ? "good" : "plain";
      return [
        ...rows,
        {
          label: "Angle at $C$",
          tex: `\\angle C = ${fmt(toDeg(angleAt(A, V, B)))}^\\circ\\ \\text{(${kind})}`,
        },
        { label: "Where $O$ is", tex: `\\text{${where}}` },
        {
          label: "Radius against half of $AB$",
          tex: `R = ${fmt(OA, 2)},\\quad \\tfrac{c}{2} = ${fmt(half, 2)}`,
          tone: whenRight,
        },
        {
          label: "Median from $C$ to $AB$",
          tex: `CM = ${fmt(median, 2)}`,
          tone: whenRight,
        },
      ];
    },
  };
});
