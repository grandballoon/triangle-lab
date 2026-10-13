// What happens to a² + b² = c² when the angle at C is not a right angle.
// Dropping the altitude from A onto line BC gives c² = a² + b² ± 2ax: too big
// when C is obtuse, too small when C is acute. So equality can only happen at
// a right angle — the converse of the Pythagorean theorem.

import { C, tint } from "../draw.ts";
import { angleAt, clamp, dist, fmt, toDeg, type Vec } from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson, type Readout } from "../scene.ts";

const BASE = -2.6;
const VERTEX_C: Vec = { x: 0.5, y: BASE };
const SNAP = 0.18;

const SMALL = C.gold;
const LARGE = C.blue;

type Kind = "acute" | "right" | "obtuse";
const KIND_COLOR: Record<Kind, string> = { acute: C.green, right: C.gold, obtuse: C.red };
// How a² + b² compares with c² for each kind of angle at C.
const RELATION: Record<Kind, string> = { acute: ">", right: "=", obtuse: "<" };

export default lesson((s) => {
  const B = s.point(-4.6, BASE, { label: "B", constrain: (p) => ({ x: clamp(p.x, -6.8, -2.5), y: BASE }) });
  // A stays to the right of B, so the angle at B is acute and the foot of the
  // altitude can only leave side BC past C. Directly above C it snaps to 90°.
  const A = s.point(2.9, 1.5, {
    label: "A",
    constrain: (p) => {
      const x = clamp(p.x, B.x + 1, 6.2);
      return { x: Math.abs(x - VERTEX_C.x) < SNAP ? VERTEX_C.x : x, y: clamp(p.y, BASE + 2, 4) };
    },
  });

  const measure = () => {
    const overhang = A.x - VERTEX_C.x;
    const kind: Kind = overhang === 0 ? "right" : overhang > 0 ? "obtuse" : "acute";
    return {
      a: dist(B, VERTEX_C),
      b: dist(A, VERTEX_C),
      c: dist(A, B),
      x: Math.abs(overhang),
      h: A.y - BASE,
      // BD is a + x past C and a − x short of it.
      sign: Math.sign(overhang),
      kind,
      D: { x: A.x, y: BASE },
    };
  };

  return {
    steps: [
      {
        title: "Tilt the angle at C",
        text: "Drag $A$ left and right so the angle at $C$ passes through $90^\\circ$, and watch $a^2 + b^2$ against $c^2$. They agree only at the right angle. Which way does the balance tip on each side?",
      },
      {
        title: "Drop an altitude",
        text: "Draw the altitude from $A$ to line $BC$, meeting it at $D$. When the angle at $C$ is obtuse, $D$ falls on the extension of $BC$ past $C$. Call $AD = h$ and $CD = x$.",
      },
      {
        title: "The small right triangle",
        text: "Triangle $ACD$ has a right angle at $D$, with legs $x$ and $h$ and hypotenuse $b$. So $x^2 + h^2 = b^2$.",
      },
      {
        title: "The large right triangle",
        text: "In right triangle $ABD$ the leg $BD$ is $a + x$ if $C$ is obtuse and $a - x$ if it is acute. So $c^2 = (a \\pm x)^2 + h^2 = a^2 + (x^2 + h^2) \\pm 2ax = a^2 + b^2 \\pm 2ax$.",
      },
      {
        title: "The converse",
        text: "An obtuse angle at $C$ makes $c^2$ larger than $a^2 + b^2$, and an acute one makes it smaller. So if the sides of a triangle satisfy $a^2 + b^2 = c^2$, the angle opposite $c$ must be a right angle.",
      },
    ],

    draw(g, f) {
      A.set(A);
      const { x, kind, sign, D } = measure();
      const color = KIND_COLOR[kind];

      if (f.at(3) > 0) g.polygon([A, B, D], { fill: tint(LARGE, 0.2), stroke: null, alpha: f.at(3) });
      if (f.at(2) > 0) g.polygon([A, VERTEX_C, D], { fill: tint(SMALL, 0.3), stroke: null, alpha: f.at(2) });
      g.polygon([A, B, VERTEX_C], { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(1) > 0) {
        const one = f.at(1);
        if (sign > 0) g.segment(VERTEX_C, D, { width: 2, dash: [6, 5], alpha: one });
        g.segment(A, D, { color: SMALL, width: 2.5, dash: [6, 5], alpha: one });
        g.angle(A, D, B, { r: 14, width: 2, alpha: one });
        g.along(A, D, "h", { color: SMALL, alpha: one, offset: sign > 0 ? 14 : -14 });
        if (x > 0.3) {
          g.along(VERTEX_C, D, "x", { color: SMALL, alpha: one, offset: sign > 0 ? 13 : -13 });
          g.point(D, { color: SMALL, alpha: one });
          g.label(D, "D", { color: SMALL, alpha: one, dy: -16, dx: sign * 10 });
        }
      }
      if (f.at(3) > 0 && sign !== 0) {
        g.along(B, D, sign > 0 ? "a + x" : "a − x", { color: LARGE, alpha: f.at(3), offset: -36 });
      }

      g.angle(B, VERTEX_C, A, { color, fill: true, r: 30, label: true });
      g.along(B, VERTEX_C, "a", { offset: -16 });
      g.along(VERTEX_C, A, "b", { offset: sign > 0 ? 16 : -16 });
      g.along(A, B, "c", { offset: -16 });
      g.point(VERTEX_C, { color: g.accent });
      g.label(VERTEX_C, "C", { color: g.accent, bold: true, dy: -18 });

      g.label({ x: 0, y: -4.3 }, `${kind} angle at C:  a² + b² ${RELATION[kind]} c²`, {
        color,
        size: 17,
        bold: true,
      });
    },

    readout(f) {
      const { a, b, c, x, h, sign, kind } = measure();
      const legsSquared = a * a + b * b;
      const rows: Readout[] = [
        { label: "Angle at $C$", tex: `\\angle C = ${fmt(toDeg(angleAt(B, VERTEX_C, A)))}^\\circ\\ \\text{(${kind})}` },
        {
          label: "Squares compared",
          tex: `a^2 + b^2 = ${fmt(legsSquared)} \\;${RELATION[kind]}\\; c^2 = ${fmt(c * c)}`,
          tone: kind === "right" ? "good" : "plain",
        },
      ];
      if (f.step >= 1) rows.push({ label: "Altitude and offset", tex: `h = ${fmt(h, 2)},\\ x = ${fmt(x, 2)}` });
      if (f.step >= 2) {
        rows.push({
          label: "Triangle $ACD$",
          tex: `x^2 + h^2 = ${fmt(x * x + h * h)} = b^2`,
          tone: holds(agree(x * x + h * h, b * b)),
        });
      }
      if (f.step >= 3) {
        const op = sign < 0 ? "-" : "+";
        rows.push(
          {
            label: "Triangle $ABD$",
            tex: `(a ${op} x)^2 + h^2 = ${fmt((a + sign * x) ** 2 + h * h)} = c^2`,
            tone: holds(agree((a + sign * x) ** 2 + h * h, c * c)),
          },
          {
            label: "Expanded",
            tex: `a^2 + b^2 ${op} 2ax = ${fmt(legsSquared)} ${op} ${fmt(2 * a * x)} = ${fmt(legsSquared + sign * 2 * a * x)}`,
            tone: holds(agree(legsSquared + sign * 2 * a * x, c * c)),
          },
        );
      }
      return rows;
    },
  };
});
