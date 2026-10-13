// The exterior angles of a convex polygon sum to 360°, whatever the number of
// sides. Algebra: n straight angles minus the interior sum. Picture: shrink
// the polygon to a point — no side changes direction, so no angle changes —
// and the exterior angles close up into one full turn.

import { C } from "../draw.ts";
import { angleOf, centroid, fmt, lerp, polar, sub, toDeg, vec, wrapAngle, type Vec } from "../geo.ts";
import { convexPolygon, interiorAngles, pieceColor } from "../kit/polygons.ts";
import { lesson, type Readout } from "../scene.ts";

const MAX_SIDES = 10;
const WEDGE = 36; // px
const EXTENSION = 74; // px

export default lesson((s) => {
  const sides = s.slider({ label: "n =", at: vec(-7.4, -4.3), width: 4, min: 3, max: MAX_SIDES, value: 5, step: 1 });
  const shrink = s.slider({
    label: "shrink",
    at: vec(3.4, -4.3),
    width: 4,
    min: 0,
    max: 1,
    value: 0,
    format: (v) => `${Math.round(v * 100)}%`,
  });
  const polygon = convexPolygon(s, {
    max: MAX_SIDES,
    sides: () => sides.value,
    center: vec(0, 0.65),
    radius: 2.6,
    box: [-6.2, 6.2, -2, 3.3],
  });

  // Exterior angle at each corner: the turn from the previous side's
  // direction to the next side's, counter-clockwise. Returns [from, sweep].
  const turns = (pts: readonly Vec[]): [number, number][] =>
    pts.map((p, i) => {
      const n = pts.length;
      const from = angleOf(sub(p, pts[(i + n - 1) % n]));
      return [from, wrapAngle(angleOf(sub(pts[(i + 1) % n], p)) - from)];
    });

  return {
    steps: [
      {
        title: "Turning at every corner",
        text: "Extend each side past its corner: the angle you turn through to follow the next side is an exterior angle. Drag the corners and slide $n$ — the total turn in the panel never moves.",
      },
      {
        title: "A straight angle at each corner",
        text: "At every corner the interior angle and the exterior angle lie along one straight line, so they add to $180^\\circ$. Over all $n$ corners, interior and exterior angles together make $180^\\circ n$.",
      },
      {
        title: "Take away the interior angles",
        text: "The interior angles account for $180^\\circ(n-2)$ of that. What is left for the exterior angles is $180^\\circ n - 180^\\circ(n - 2) = 360^\\circ$: the $n$ cancels.",
      },
      {
        title: "Shrink it to a point",
        text: "Now slide “shrink”. Every side keeps its direction, so every exterior angle keeps its size. When the polygon is a single point, the angles sit around it and fill one full turn.",
      },
    ],

    draw(g, f) {
      polygon.setDraggable(shrink.value === 0);
      const full = polygon.corners();
      const hub = centroid(full);
      const scale = 1 - shrink.value;
      const pts = full.map((p) => lerp(hub, p, scale));
      const exterior = turns(full);

      if (scale < 1) g.polygon(full, { color: C.faint, width: 1.5, dash: [5, 6] });
      g.polygon(pts, { fill: "rgba(255, 255, 255, 0.05)" });

      pts.forEach((p, i) => {
        const [from, sweep] = exterior[i];
        g.segment(p, polar(p, g.px(EXTENSION), from), { color: C.dim, width: 2, dash: [6, 5] });
        g.angleMark(p, from, from + sweep, { color: pieceColor(i), r: WEDGE, fill: true, label: true, square: false });
        if (f.at(1) > 0) {
          // The interior angle completes the straight line through the corner.
          g.angleMark(p, from + sweep, from + Math.PI, {
            color: C.ink,
            r: 18,
            width: 2,
            square: false,
            alpha: f.at(1) * scale,
          });
        }
      });
    },

    readout(f) {
      const pts = polygon.corners();
      const n = pts.length;
      const exteriorSum = turns(pts).reduce((a, [, sweep]) => a + toDeg(sweep), 0);
      const interiorSum = interiorAngles(pts).reduce((a, b) => a + toDeg(b), 0);
      const rows: Readout[] = [{ label: "Sides", tex: `n = ${n}` }];
      if (f.step >= 1) rows.push({ label: "All the straight angles", tex: `180^\\circ n = ${180 * n}^\\circ` });
      if (f.step >= 2) {
        rows.push(
          { label: "Interior angles, measured", tex: `${fmt(interiorSum)}^\\circ = 180^\\circ \\cdot ${n - 2}` },
          { label: "Difference", tex: `${180 * n}^\\circ - ${fmt(interiorSum)}^\\circ = ${fmt(180 * n - interiorSum)}^\\circ` },
        );
      }
      rows.push({ label: "Exterior angles, measured and added", tex: `${fmt(exteriorSum)}^\\circ`, tone: "good" });
      return rows;
    },
  };
});
