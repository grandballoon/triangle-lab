// The volume of a regular tetrahedron of edge s, built up one fact at a time:
// the base area, where the altitude lands, how far that foot is from a corner,
// the height by Pythagoras, and finally a third of base times height.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { dist3, faces, label3, lerp3, Orbit, p3, point3, polygon3, segment3 } from "../solid.ts";
import { centroid3, glass, mid3, pyramidSides, rightAngle3, tetraVolume, triangleArea3 } from "../kit/solids.ts";

const BASE = C.gold;
const ALTITUDE = C.blue;
const MEDIAN = C.green;
const EDGE = C.pink;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.35, 0.4, { x: 0, y: 0.4 }));
  const edge = s.slider({ label: "s =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 3, max: 5, value: 4.4, step: 0.2 });

  // Base ABC flat on the floor, D above its centre G.
  const model = () => {
    const e = edge.value;
    const reach = e / Math.sqrt(3); // from the base's centre to a corner
    const h = e * Math.sqrt(2 / 3);
    const y = -h / 2;
    const A = p3(-reach * Math.cos(Math.PI / 6), y, reach * Math.sin(Math.PI / 6));
    const B = p3(reach * Math.cos(Math.PI / 6), y, reach * Math.sin(Math.PI / 6));
    const Cc = p3(0, y, -reach);
    const D = p3(0, h / 2, 0);
    return { e, A, B, Cc, D, G: centroid3([A, B, Cc]), M: mid3(B, Cc) };
  };

  return {
    steps: [
      {
        title: "Four equilateral faces",
        text: "A regular tetrahedron is a pyramid whose base and three side faces are all equilateral triangles of side $s$. Turn it and change $s$. Its volume is $\\tfrac13 \\cdot \\text{base} \\cdot \\text{height}$, so we need those two numbers.",
      },
      {
        title: "The base",
        text: "The base $ABC$ is an equilateral triangle of side $s$. Its area is $\\tfrac{\\sqrt3}{4}s^2$.",
      },
      {
        title: "Where the altitude lands",
        text: "Drop the altitude $DG$. Right triangles $DGA$, $DGB$, $DGC$ share the leg $DG$ and have equal hypotenuses $s$, so $GA = GB = GC$. $G$ is the centre of the base — in an equilateral triangle, its centroid.",
      },
      {
        title: "Two thirds of a median",
        text: "The median $AM$ is also an altitude of the base, so $AM = \\tfrac{\\sqrt3}{2}s$. A centroid sits two thirds of the way along each median: $AG = \\tfrac23 \\cdot \\tfrac{\\sqrt3}{2}s = \\tfrac{\\sqrt3}{3}s$.",
      },
      {
        title: "The height",
        text: "In right triangle $DGA$ the hypotenuse is the edge $DA = s$. So $DG^2 = s^2 - \\tfrac13 s^2 = \\tfrac23 s^2$, and the height is $DG = \\tfrac{\\sqrt6}{3}s$.",
      },
      {
        title: "The volume",
        text: "$V = \\tfrac13 \\cdot \\tfrac{\\sqrt3}{4}s^2 \\cdot \\tfrac{\\sqrt6}{3}s = \\tfrac{\\sqrt{18}}{36}s^3 = \\tfrac{\\sqrt2}{12}s^3$. Slide $s$: doubling the edge multiplies the volume by eight.",
      },
    ],

    draw(g, f) {
      const { A, B, Cc, D, G, M } = model();
      const base = [A, B, Cc];
      faces(g, cam, [base, ...pyramidSides(base, D)].map((pts) => ({ pts, ...glass(g.accent) })));

      if (f.at(1) > 0) polygon3(g, cam, base, { fill: tint(BASE, 0.2), stroke: BASE, alpha: f.at(1) });
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        segment3(g, cam, A, M, { color: MEDIAN, width: 2, dash: [6, 5], alpha });
        segment3(g, cam, A, G, { color: MEDIAN, width: 4, alpha });
        rightAngle3(g, cam, M, A, B, { color: MEDIAN, alpha }, 0.24);
        g.ticks(cam.project(B), cam.project(M), 1, { color: MEDIAN, alpha });
        g.ticks(cam.project(M), cam.project(Cc), 1, { color: MEDIAN, alpha });
        point3(g, cam, M, { color: MEDIAN, label: "M", alpha });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        // Once the median takes over, the other two spokes step back.
        const spokes = f.step >= 3 ? 0.35 * alpha : alpha;
        segment3(g, cam, G, B, { color: MEDIAN, width: 2, alpha: spokes });
        segment3(g, cam, G, Cc, { color: MEDIAN, width: 2, alpha: spokes });
        segment3(g, cam, G, A, { color: MEDIAN, width: 2, alpha });
        segment3(g, cam, D, G, { color: ALTITUDE, width: 4, alpha });
        rightAngle3(g, cam, G, D, A, { color: ALTITUDE, alpha }, 0.24);
        point3(g, cam, G, { color: ALTITUDE, alpha });
        label3(g, cam, G, "G", { color: ALTITUDE, dx: 13, dy: -12, alpha });
      }
      if (f.at(4) > 0) {
        const alpha = f.at(4);
        polygon3(g, cam, [D, G, A], { fill: tint(ALTITUDE, 0.22), stroke: null, alpha });
        segment3(g, cam, D, A, { color: EDGE, width: 4, alpha });
        label3(g, cam, lerp3(D, A, 0.5), "s", { color: EDGE, dx: -13, dy: 6, alpha });
      }

      label3(g, cam, A, "A", { dx: -14, dy: -10 });
      label3(g, cam, B, "B", { dx: 14, dy: -10 });
      label3(g, cam, Cc, "C", { dx: 12, dy: 12 });
      label3(g, cam, D, "D", { dy: 15 });
    },

    readout(f) {
      const { e, A, B, Cc, D, G, M } = model();
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Edge", tex: `s = ${fmt(e)}` });
      if (f.step >= 1) {
        rows.push({
          label: "Base area",
          tex: `\\tfrac{\\sqrt3}{4}s^2 = ${fmt(triangleArea3(A, B, Cc), 2)}`,
        });
      }
      if (f.step === 2) {
        rows.push({
          label: "Foot to each corner",
          tex: `GA = GB = GC = ${fmt(dist3(G, B), 2)}`,
          tone: "good",
        });
      }
      if (f.step >= 3) {
        rows.push({ label: "Median", tex: `AM = \\tfrac{\\sqrt3}{2}s = ${fmt(dist3(A, M), 2)}` });
        rows.push({ label: "Centroid", tex: `AG = \\tfrac23 AM = \\tfrac{\\sqrt3}{3}s = ${fmt(dist3(A, G), 2)}` });
      }
      if (f.step >= 4) {
        rows.push({ label: "Height", tex: `DG = \\tfrac{\\sqrt6}{3}s = ${fmt(dist3(D, G), 2)}` });
      }
      if (f.step >= 5) {
        rows.push({ label: "Volume", tex: `\\tfrac{\\sqrt2}{12}s^3 = ${fmt((Math.SQRT2 / 12) * e ** 3, 2)}` });
        rows.push({
          label: "A third of base times height",
          tex: `\\tfrac13 (${fmt(triangleArea3(A, B, Cc), 2)})(${fmt(dist3(D, G), 2)}) = ${fmt(tetraVolume(A, B, Cc, D), 2)}`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
