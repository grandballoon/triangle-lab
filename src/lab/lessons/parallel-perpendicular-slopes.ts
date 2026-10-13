// Slopes of parallel and perpendicular lines. Line 1's rise/run triangle is
// copied to a point C on line 2. Slid there unchanged it shows a parallel line
// has the same slope; turned a quarter turn, "over b, up a" becomes
// "over −a, up b", so the slopes of perpendicular lines multiply to −1.

import { C } from "../draw.ts";
import { add, angleOf, both, clamp, dist, fmt, inBox, len, lineLine, perp, snapToGrid, type Vec } from "../geo.ts";
import { guard, num, plane, riseRun, settle, X_COLOR, Y_COLOR } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const SECOND = C.gold;
// A and C stay near the middle and B within REACH of A, so both triangles —
// each at most REACH across — fit on the stage.
const REACH = 3;
const NEAR = both(snapToGrid(1), inBox(-4, 4, -1, 1));

/** `m_1 = \frac{2}{3} = 0.67`, or a note that a vertical line has no slope. */
function slopeTex(name: string, over: number, up: number): string {
  if (over === 0) return `${name}\\ \\text{is undefined (vertical)}`;
  return `${name} = \\frac{${fmt(up)}}{${fmt(over)}} = ${fmt(up / over, 2)}`;
}

export default lesson((s) => {
  const relation = s.choice("Second line", ["Parallel", "Perpendicular"]);
  const A = s.point(-4, -1, { label: "A", constrain: NEAR });
  const B = s.point(-1, 1, { label: "B" });
  guard(
    B,
    (p) => ({
      x: clamp(Math.round(p.x), A.x - REACH, A.x + REACH),
      y: clamp(Math.round(p.y), A.y - REACH, A.y + REACH),
    }),
    (q) => dist(q, A) >= 1,
  );
  const P = s.point(3, 0, { label: "C", color: SECOND, constrain: NEAR });

  const turned = (): boolean => relation.value === "Perpendicular";
  /** Line 1's "over, up" and, after the slide or quarter turn, line 2's. */
  const steps1 = (): Vec => ({ x: B.x - A.x, y: B.y - A.y });
  const steps2 = (): Vec => (turned() ? perp(steps1()) : steps1());

  let lastA = { x: A.x, y: A.y };

  return {
    steps: [
      {
        title: "Two lines, two slopes",
        text: "Drag $A$ and $B$ to tilt the first line; $C$ carries the second. Choose whether the second line is parallel or perpendicular to the first, and compare the slopes $m_1$ and $m_2$ as you tilt.",
      },
      {
        title: "Parallel: slide the triangle",
        text: "Line 1 goes over $b$ and up $a$, so $m_1 = \\frac{a}{b}$. A parallel line climbs at the same rate: slide that triangle to $C$ unchanged and it fits the second line, so $m_2 = \\frac{a}{b}$ as well.",
      },
      {
        title: "Perpendicular: turn the triangle",
        text: "Choose Perpendicular. The copy at $C$ is turned a quarter turn. Its “over $b$” leg now points straight up, and its “up $a$” leg points backwards: the turned line goes over $-a$ and up $b$.",
      },
      {
        title: "Slopes that multiply to −1",
        text: "So $m_2 = \\frac{b}{-a}$, and $m_1 m_2 = \\frac{a}{b}\\cdot\\frac{b}{-a} = -1$. The rule needs both slopes to exist: a horizontal and a vertical line are perpendicular, but there is nothing to multiply.",
      },
    ],

    draw(g, f) {
      // B rides along when A is dragged, keeping line 1's direction.
      B.x += A.x - lastA.x;
      B.y += A.y - lastA.y;
      lastA = { x: A.x, y: A.y };
      settle(B);

      const d1 = steps1();
      const d2 = steps2();
      const tip = add(P, d2);
      const quarter = turned();

      plane(g);
      g.line(A, B, { color: g.accent });
      g.line(P, tip, { color: SECOND });
      if (quarter) {
        const meet = lineLine(A, B, P, tip);
        if (meet && Math.abs(meet.x) < 7.5 && Math.abs(meet.y) < 4.5) {
          g.angle(add(meet, d1), meet, add(meet, d2), { color: C.ink, r: 16, width: 2 });
        }
      } else {
        g.chevrons(A, B, 1, { color: g.accent });
        g.chevrons(P, tip, 1, { color: SECOND });
      }

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        riseRun(g, A, B, { alpha, run: `over ${num(d1.x)}`, rise: `up ${num(d1.y)}` });
        if (quarter) {
          // The same two legs, each turned a quarter turn: blue now runs
          // vertically and pink horizontally.
          const corner = add(P, perp({ x: d1.x, y: 0 }));
          g.polygon([P, corner, tip], { fill: "rgba(255, 255, 255, 0.06)", stroke: null, alpha });
          g.segment(P, corner, { color: X_COLOR, alpha });
          g.segment(corner, tip, { color: Y_COLOR, alpha });
          // Captions go outside the triangle, which lies to the left of the
          // walk C → corner → tip exactly when a and b have the same sign.
          const out = d1.x * d1.y > 0 ? -1 : 1;
          if (d1.x !== 0) g.along(P, corner, `up ${num(d1.x)}`, { color: X_COLOR, alpha, offset: 24 * out });
          if (d1.y !== 0) g.along(corner, tip, `over ${num(-d1.y)}`, { color: Y_COLOR, alpha, offset: 16 * out });
        } else {
          riseRun(g, P, tip, { alpha, run: `over ${num(d1.x)}`, rise: `up ${num(d1.y)}` });
        }
      }
      if (quarter && f.at(2) > 0) {
        // Where the copy sat before it was turned, and the arc its tip swept.
        const alpha = f.at(2);
        const before = add(P, d1);
        const from = angleOf(d1);
        g.path([P, { x: before.x, y: P.y }, before, P], { color: C.dim, width: 2, dash: [5, 5], alpha });
        g.arc(P, len(d1), from, from + Math.PI / 2, { color: C.dim, width: 2, dash: [5, 5], alpha });
        g.angle(before, P, tip, { color: C.ink, r: 16, width: 2, alpha });
      }
    },

    readout() {
      const d1 = steps1();
      const d2 = steps2();
      const quarter = turned();
      const rows: Readout[] = [
        {
          label: "Over, up",
          tex: quarter
            ? `(b,\\,a) = (${fmt(d1.x)},\\,${fmt(d1.y)}) \\to (-a,\\,b) = (${fmt(d2.x)},\\,${fmt(d2.y)})`
            : `(b,\\,a) = (${fmt(d1.x)},\\,${fmt(d1.y)})\\ \\text{for both}`,
        },
        { label: "Line 1 (through A and B)", tex: slopeTex("m_1", d1.x, d1.y) },
        { label: "Line 2 (through C)", tex: slopeTex("m_2", d2.x, d2.y) },
      ];
      if (!quarter) {
        rows.push(
          d1.x === 0
            ? { label: "Parallel", tex: "\\text{both vertical}", tone: "good" }
            : {
                label: "Parallel",
                tex: `m_1 = m_2 = ${fmt(d1.y / d1.x, 2)}`,
                tone: "good",
              },
        );
      } else if (d1.x === 0 || d1.y === 0) {
        rows.push({
          label: "Perpendicular",
          tex: "\\text{horizontal} \\perp \\text{vertical: no product}",
          tone: "dim",
        });
      } else {
        const product = (d1.y / d1.x) * (d2.y / d2.x);
        rows.push({
          label: "Perpendicular",
          tex: `m_1 m_2 = \\frac{${fmt(d1.y)}}{${fmt(d1.x)}}\\cdot\\frac{${fmt(d2.y)}}{${fmt(d2.x)}} = ${fmt(product, 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
