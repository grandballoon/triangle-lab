// Slope as rise over run. Two points fix a line; walking from one to the
// other, the rise divided by the run measures its steepness. A second pair of
// points sliding on the same line builds a similar triangle, so the ratio does
// not depend on which two points are used.

import { C } from "../draw.ts";
import { add, clamp, dist, dot, fmt, scale, sub, type Vec } from "../geo.ts";
import { clipLine, keepApart, lattice, num, par, plane, riseRun, texPoint } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const SECOND = C.gold;
/** The sliding pair is kept at least this far apart, so it always spans a triangle. */
const GAP = 1;

function kindOf(run: number, rise: number): { name: string; color: string } {
  if (Math.abs(run) < 1e-9) return { name: "undefined", color: C.violet };
  if (Math.abs(rise) < 1e-9) return { name: "zero", color: C.gold };
  return rise / run > 0 ? { name: "positive", color: C.green } : { name: "negative", color: C.red };
}

export default lesson((s) => {
  const A = s.point(-4, -2, { label: "A" });
  const B = s.point(2, 1, { label: "B" });
  keepApart(A, B, lattice);

  const P = s.point(4, 2, { label: "P", color: SECOND });
  const Q = s.point(6, 3, { label: "Q", color: SECOND });

  /** Where along the visible line (from its first end, in units) `p` falls. */
  function along(p: Vec): { start: Vec; unit: Vec; length: number; t: number } | null {
    const ends = clipLine(A, B);
    if (!ends) return null;
    const length = dist(ends[0], ends[1]);
    const unit = scale(sub(ends[1], ends[0]), 1 / length);
    return { start: ends[0], unit, length, t: clamp(dot(sub(p, ends[0]), unit), 0, length) };
  }
  const slide =
    (other: Vec) =>
    (p: Vec): Vec => {
      const me = along(p);
      const them = along(other);
      if (!me || !them) return p;
      // Stop short of the other point rather than passing through it.
      const side = me.t >= them.t ? 1 : -1;
      let t = Math.abs(me.t - them.t) < GAP ? them.t + side * GAP : me.t;
      if (t < 0 || t > me.length) t = them.t - side * GAP;
      return add(me.start, scale(me.unit, t));
    };
  P.constrain = slide(Q);
  Q.constrain = slide(P);

  /** Put P and Q back on the line after A or B has moved it. */
  function reseat(): void {
    const p = along(P);
    const q = along(Q);
    if (!p || !q) return;
    const tq = Math.abs(q.t - p.t) >= GAP ? q.t : p.t + GAP <= p.length ? p.t + GAP : p.t - GAP;
    Object.assign(P, add(p.start, scale(p.unit, p.t)));
    Object.assign(Q, add(p.start, scale(p.unit, tq)));
  }

  return {
    steps: [
      {
        title: "How steep is a line?",
        text: "Drag $A$ and $B$. Going from $A$ to $B$ you move across by the run and up by the rise. Their ratio, the slope $m$, measures the steepness. Watch it as the line tilts.",
      },
      {
        title: "Reading the sign",
        text: "A line that climbs to the right has positive slope; one that falls has negative slope; a flat line has slope $0$. Stand the line upright and the run is $0$ — there is nothing to divide by, so the slope is undefined.",
      },
      {
        title: "Any two points will do",
        text: "Slide $P$ and $Q$ along the line. Their triangle has legs parallel to the first one's and its hypotenuse on the same line, so the two are similar. Similar triangles have equal ratios of legs: the slope is the same.",
      },
    ],

    draw(g, f) {
      reseat();
      const sliding = f.step >= 2;
      P.hidden = Q.hidden = !sliding;
      P.enabled = Q.enabled = sliding;
      const run = B.x - A.x;
      const rise = B.y - A.y;
      const corner = { x: B.x, y: A.y };
      const slanted = Math.abs(run) > 1e-9 && Math.abs(rise) > 1e-9;

      plane(g);
      g.line(A, B, { color: g.accent });
      riseRun(g, A, B, { run: `run ${num(run)}`, rise: `rise ${num(rise)}` });

      if (f.at(1) > 0) {
        const kind = kindOf(run, rise);
        g.label({ x: -7.7, y: 4.5 }, `slope: ${kind.name}`, {
          color: kind.color,
          size: 20,
          bold: true,
          align: "left",
          alpha: f.at(1),
        });
      }
      if (f.at(2) > 0) {
        riseRun(g, P, Q, {
          alpha: f.at(2),
          run: `run ${num(Q.x - P.x, 2)}`,
          rise: `rise ${num(Q.y - P.y, 2)}`,
        });
        if (slanted) {
          g.angle(corner, A, B, { color: SECOND, r: 30, alpha: f.at(2) });
          g.angle({ x: Q.x, y: P.y }, P, Q, { color: SECOND, r: 30, alpha: f.at(2) });
        }
      }
    },

    readout(f) {
      const run = B.x - A.x;
      const rise = B.y - A.y;
      const vertical = Math.abs(run) < 1e-9;
      const rows: Readout[] = [
        { label: "From A to B", tex: `${texPoint(A)} \\to ${texPoint(B)}` },
        { label: "Rise", tex: `y_2 - y_1 = ${fmt(B.y)} - ${par(A.y)} = ${fmt(rise)}` },
        { label: "Run", tex: `x_2 - x_1 = ${fmt(B.x)} - ${par(A.x)} = ${fmt(run)}` },
        vertical
          ? {
              label: "Slope",
              tex: `m = \\frac{${fmt(rise)}}{0}\\ \\text{is undefined}`,
              tone: "warn",
            }
          : {
              label: `Slope (${kindOf(run, rise).name})`,
              tex: `m = \\frac{\\text{rise}}{\\text{run}} = \\frac{${fmt(rise)}}{${fmt(run)}} = ${fmt(rise / run, 2)}`,
            },
      ];
      if (f.step >= 2) {
        const run2 = Q.x - P.x;
        const rise2 = Q.y - P.y;
        rows.push(
          vertical
            ? { label: "From P to Q", tex: "\\text{run} = 0\\ \\text{again}", tone: "warn" }
            : {
                label: "From P to Q",
                tex: `\\frac{${fmt(rise2, 2)}}{${fmt(run2, 2)}} = ${fmt(rise2 / run2, 2)}`,
                tone: "good",
              },
        );
      }
      return rows;
    },
  };
});
