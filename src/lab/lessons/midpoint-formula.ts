// The midpoint formula, and its extension to any fraction of the way. Stepping
// across and up from A to the point T, then again from T to B, makes two right
// triangles on the same line. They are similar — congruent when T is the
// midpoint — so T's coordinates are found leg by leg.

import { C } from "../draw.ts";
import { dist, fmt, lerp } from "../geo.ts";
import { keepApart, num, pair, par, plane, riseRun, settle, snapping, X_COLOR, Y_COLOR } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const POINT = C.gold;
/** Legs shorter than this are too small to carry marks. */
const TINY = 0.4;

export default lesson((s) => {
  const snap = s.toggle("Snap to grid", true);
  const A = s.point(-5, -1, { label: "A" });
  const B = s.point(3, 3, { label: "B" });
  keepApart(A, B, snapping(snap), 2);
  const fraction = s.slider({
    label: "t =",
    at: { x: 2.6, y: -4.3 },
    width: 4,
    min: 0,
    max: 1,
    value: 0.5,
    step: 0.05,
  });
  s.button("Back to the midpoint", () => (fraction.value = 0.5));

  const isHalf = (): boolean => Math.abs(fraction.value - 0.5) < 1e-9;

  return {
    steps: [
      {
        title: "A point part of the way",
        text: "Drag $A$ and $B$. The slider puts the gold point a fraction $t$ of the way from $A$ to $B$; at $t = \\tfrac12$ it is the midpoint $M$. How do its coordinates come from those of the endpoints?",
      },
      {
        title: "Two right triangles",
        text: "Step across and then up from $A$ to the gold point, and again from there to $B$. Every leg follows the grid, so both triangles have a right angle.",
      },
      {
        title: "Same shape",
        text: "The two horizontal legs are parallel, and both hypotenuses lie on line $AB$, so the marked angles are equal. The triangles are similar. At the midpoint their hypotenuses are equal as well, which makes them congruent.",
      },
      {
        title: "Average the coordinates",
        text: "Keep $t = \\tfrac12$. Congruent triangles have equal legs, so each horizontal leg is half of $x_2 - x_1$, and $x_M = x_1 + \\tfrac12(x_2 - x_1) = \\tfrac{x_1 + x_2}{2}$. The vertical legs give $y_M$ the same way.",
      },
      {
        title: "Any fraction of the way",
        text: "Now move the slider. The triangles stay similar, with hypotenuses $t \\cdot AB$ and $(1 - t) \\cdot AB$, so their legs split the full run and rise in that same ratio. The point is $(x_1 + t(x_2 - x_1),\\ y_1 + t(y_2 - y_1))$.",
      },
    ],

    draw(g, f) {
      settle(A, B);
      const t = fraction.value;
      const T = lerp(A, B, t);
      const half = isHalf();
      const corner1 = { x: T.x, y: A.y };
      const corner2 = { x: B.x, y: T.y };
      const slanted = [T.x - A.x, T.y - A.y, B.x - T.x, B.y - T.y].every((leg) => Math.abs(leg) > TINY);

      plane(g);
      if (f.at(1) > 0) {
        const captions = f.step >= 3;
        for (const [from, to] of [
          [A, T],
          [T, B],
        ]) {
          riseRun(g, from, to, {
            alpha: f.at(1),
            dash: [6, 5],
            run: captions ? num(to.x - from.x, 2) : "",
            rise: captions ? num(to.y - from.y, 2) : "",
          });
        }
      }
      g.segment(A, B, { color: g.accent, width: 4 });

      if (f.at(2) > 0 && slanted) {
        g.angle(corner1, A, T, { color: POINT, r: 28, alpha: f.at(2) });
        g.angle(corner2, T, B, { color: POINT, r: 28, alpha: f.at(2) });
        if (half) {
          g.ticks(A, T, 1, { color: g.accent, alpha: f.at(2) });
          g.ticks(T, B, 1, { color: g.accent, alpha: f.at(2) });
        }
      }
      if (f.at(3) > 0 && slanted && half) {
        g.ticks(A, corner1, 2, { color: X_COLOR, alpha: f.at(3) });
        g.ticks(T, corner2, 2, { color: X_COLOR, alpha: f.at(3) });
        g.ticks(corner1, T, 3, { color: Y_COLOR, alpha: f.at(3) });
        g.ticks(corner2, B, 3, { color: Y_COLOR, alpha: f.at(3) });
      }

      // The triangles hang below the point when the walk climbs and stand
      // above it when the walk falls; the caption takes the other side.
      const above = B.y >= A.y;
      g.point(T, { color: POINT, r: 7 });
      g.label(T, `${half ? "M" : "T"} ${pair(T, 2)}`, {
        color: POINT,
        bold: true,
        dx: B.x >= A.x ? -14 : 14,
        dy: above ? 20 : -20,
        align: B.x >= A.x ? "right" : "left",
      });
    },

    readout() {
      const t = fraction.value;
      const T = lerp(A, B, t);
      const rows: Readout[] = [
        {
          label: "x: start plus t of the run",
          tex: `${fmt(A.x, 2)} + ${fmt(t, 2)}(${fmt(B.x - A.x, 2)}) = ${fmt(T.x, 2)}`,
        },
        {
          label: "y: start plus t of the rise",
          tex: `${fmt(A.y, 2)} + ${fmt(t, 2)}(${fmt(B.y - A.y, 2)}) = ${fmt(T.y, 2)}`,
        },
        {
          label: "Measured",
          tex: `\\frac{AT}{AB} = \\frac{${fmt(dist(A, T), 2)}}{${fmt(dist(A, B), 2)}} = ${fmt(dist(A, T) / dist(A, B), 2)}`,
          tone: "good",
        },
      ];
      if (isHalf()) {
        rows.push(
          {
            label: "Average of the x's",
            tex: `\\frac{${fmt(A.x, 2)} + ${par(B.x, 2)}}{2} = ${fmt((A.x + B.x) / 2, 2)}`,
            tone: "good",
          },
          {
            label: "Average of the y's",
            tex: `\\frac{${fmt(A.y, 2)} + ${par(B.y, 2)}}{2} = ${fmt((A.y + B.y) / 2, 2)}`,
            tone: "good",
          },
        );
      } else {
        rows.push({ label: "Midpoint", tex: "\\text{set } t = \\tfrac12", tone: "dim" });
      }
      return rows;
    },
  };
});
