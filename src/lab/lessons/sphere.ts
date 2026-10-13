// A sphere and a plane that slices it. The cut is a circle; joining the
// sphere's centre to the circle's centre gives a segment perpendicular to the
// cut (by congruent triangles), and then Pythagoras gives the circle's radius.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { label3, Orbit, p3, point3, polygon3, ringY, segment3, sphere3 } from "../solid.ts";
import { rightAngle3 } from "../kit/solids.ts";

const PLANE_HALF = 3.7;
const GREAT = 0.05; // below this distance the cut passes through the centre

const RADIUS = C.gold;
const CUT = C.pink;
const DISTANCE = C.blue;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.5, 0.3, { x: 0, y: 0.5 }));
  const radius = s.slider({ label: "r =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 2, max: 3.2, value: 3, step: 0.1 });
  const offset = s.slider({ label: "d =", at: { x: -3.2, y: -4.3 }, width: 3.4, min: 0, max: 3.4, value: 1.8, step: 0.1 });

  /** Radius of the cut, or null when the plane misses (or only touches) the sphere. */
  const cutRadius = (): number | null => {
    const r = radius.value;
    const d = offset.value;
    return d < r - 1e-9 ? Math.sqrt(r * r - d * d) : null;
  };

  return {
    steps: [
      {
        title: "Slice a sphere",
        text: "A plane sits at distance $d$ from the centre $O$ of a sphere of radius $r$. Slide $d$: the plane cuts the sphere in a circle that shrinks as the plane moves out. At $d = 0$ it is a great circle.",
      },
      {
        title: "A diameter of the cut",
        text: "Let $B$ be the centre of the cut circle and $AC$ one of its diameters. Join $O$ to $A$, $B$ and $C$. This makes two triangles, $OBA$ and $OBC$, sharing the side $OB$.",
      },
      {
        title: "Congruent triangles",
        text: "$AB = BC$ (radii of the cut), $OA = OC$ (radii of the sphere) and $OB$ is shared, so the triangles are congruent by SSS. Then $\\angle OBA = \\angle OBC$, and since they fill a straight line, both are $90^\\circ$.",
      },
      {
        title: "Pythagoras in the slice",
        text: "The same holds for every diameter, so $OB$ is perpendicular to the plane and $OB = d$. In right triangle $OBA$: $AB^2 = r^2 - d^2$, so the cut has radius $\\sqrt{r^2 - d^2}$.",
      },
    ],

    draw(g, f) {
      const r = radius.value;
      const d = offset.value;
      const rho = cutRadius();
      const O = p3(0, 0, 0);
      const B = p3(0, d, 0);

      sphere3(g, cam, O, r, { fill: tint(g.accent, 0.07), stroke: tint(g.accent, 0.9), color: tint(g.accent, 0.5) });
      polygon3(
        g,
        cam,
        [p3(-PLANE_HALF, d, PLANE_HALF), p3(PLANE_HALF, d, PLANE_HALF), p3(PLANE_HALF, d, -PLANE_HALF), p3(-PLANE_HALF, d, -PLANE_HALF)],
        { fill: tint(C.ink, 0.07), stroke: C.dim, width: 1.5 },
      );
      point3(g, cam, O, { label: "O" });

      if (rho === null) {
        if (d - r < 1e-9) point3(g, cam, B, { color: CUT, label: "tangent" });
        return;
      }
      const circle = ringY(B, rho);
      polygon3(g, cam, circle, { fill: tint(CUT, 0.16), stroke: CUT, width: 3 });
      if (d < GREAT) label3(g, cam, p3(0, 0, rho), "great circle", { color: CUT, dy: -16, size: 13 });

      const A = p3(-rho, d, 0);
      const Cc = p3(rho, d, 0);
      if (f.at(1) > 0) {
        const alpha = f.at(1);
        segment3(g, cam, A, Cc, { color: CUT, alpha });
        segment3(g, cam, O, A, { color: RADIUS, alpha });
        segment3(g, cam, O, Cc, { color: RADIUS, alpha });
        if (d >= GREAT) segment3(g, cam, O, B, { color: DISTANCE, width: 4, alpha });
        label3(g, cam, A, "A", { dx: -14, alpha });
        label3(g, cam, Cc, "C", { dx: 14, alpha });
        label3(g, cam, B, "B", { dy: 14, alpha });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        g.ticks(cam.project(A), cam.project(B), 1, { color: CUT, alpha });
        g.ticks(cam.project(B), cam.project(Cc), 1, { color: CUT, alpha });
        g.ticks(cam.project(O), cam.project(A), 2, { color: RADIUS, alpha });
        g.ticks(cam.project(O), cam.project(Cc), 2, { color: RADIUS, alpha });
        if (d >= GREAT) {
          rightAngle3(g, cam, B, O, A, { color: DISTANCE, alpha }, 0.26);
          rightAngle3(g, cam, B, O, Cc, { color: DISTANCE, alpha }, 0.26);
        }
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        polygon3(g, cam, [O, B, A], { fill: tint(RADIUS, 0.22), stroke: null, alpha });
        g.along(cam.project(O), cam.project(A), "r", { color: RADIUS, offset: 14, alpha });
        if (d >= GREAT) g.along(cam.project(B), cam.project(O), "d", { color: DISTANCE, offset: 12, alpha });
        segment3(g, cam, A, B, { color: CUT, width: 5, alpha });
      }
    },

    readout(f) {
      const r = radius.value;
      const d = offset.value;
      const rho = cutRadius();
      const rows: Readout[] = [
        { label: "Surface area", tex: `S = 4\\pi r^2 = ${fmt(4 * Math.PI * r * r)}` },
        { label: "Volume", tex: `V = \\tfrac43\\pi r^3 = ${fmt((4 / 3) * Math.PI * r ** 3)}` },
      ];
      if (rho === null) {
        rows.push({
          label: "The cut",
          tex: d - r < 1e-9 ? "d = r:\\ \\text{the plane is tangent}" : "d > r:\\ \\text{the plane misses}",
          tone: "warn",
        });
        return rows;
      }
      rows.push({
        label: d < GREAT ? "Great circle" : "Radius of the cut",
        tex: `\\sqrt{r^2 - d^2} = \\sqrt{${fmt(r * r, 2)} - ${fmt(d * d, 2)}} = ${fmt(rho, 2)}`,
      });
      if (f.step >= 3) {
        rows.push({
          label: "Right triangle OBA",
          tex: `OB^2 + AB^2 = ${fmt(d * d + rho * rho, 2)} = r^2`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
