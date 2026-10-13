// The volume of a regular octahedron of edge s. It splits along its middle
// square into two square pyramids; half the square's diagonal and an edge give
// the pyramid's height by Pythagoras, and two pyramids give the volume.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { dist3, faces, label3, lerp3, Orbit, p3, point3, polygon3, segment3 } from "../solid.ts";
import { glass, pyramidSides, rightAngle3, tetraVolume } from "../kit/solids.ts";

const SQUARE = C.gold;
const HALF_DIAGONAL = C.green;
const ALTITUDE = C.blue;
const EDGE = C.pink;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.3, 0.32, { x: 0, y: 0.5 }));
  const edge = s.slider({ label: "s =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 2.6, max: 4.4, value: 3.8, step: 0.2 });

  // The middle square ABCD lies flat, with P above and Q below its centre O.
  const model = () => {
    const e = edge.value;
    const k = e / Math.SQRT2;
    return {
      e,
      A: p3(-k, 0, 0),
      B: p3(0, 0, k),
      Cc: p3(k, 0, 0),
      D: p3(0, 0, -k),
      P: p3(0, k, 0),
      Q: p3(0, -k, 0),
      O: p3(0, 0, 0),
    };
  };

  return {
    steps: [
      {
        title: "Eight equilateral faces",
        text: "A regular octahedron has eight equilateral triangles for faces, four meeting at each corner; every edge has length $s$. Turn it and change $s$. How much space does it enclose?",
      },
      {
        title: "Two pyramids",
        text: "The four edges round the middle form a square $ABCD$ of side $s$. It splits the solid into two congruent pyramids with this square as base, each of volume $\\tfrac13 s^2 \\cdot PO$.",
      },
      {
        title: "Half a diagonal",
        text: "The square's diagonal is $AC = s\\sqrt2$, and the centre $O$ is its midpoint, so $OA = \\tfrac{\\sqrt2}{2}s$.",
      },
      {
        title: "The height",
        text: "$PO$ is perpendicular to the square, so $POA$ is a right triangle with hypotenuse $PA = s$: $PO^2 = s^2 - \\tfrac12 s^2$, giving $PO = \\tfrac{\\sqrt2}{2}s$. It equals $OA$ — the upright slice $APCQ$ is a square too.",
      },
      {
        title: "The volume",
        text: "One pyramid: $\\tfrac13 \\cdot s^2 \\cdot \\tfrac{\\sqrt2}{2}s = \\tfrac{\\sqrt2}{6}s^3$. The octahedron is two of them: $V = \\tfrac{\\sqrt2}{3}s^3$.",
      },
    ],

    draw(g, f) {
      const { A, B, Cc, D, P, Q, O } = model();
      const square = [A, B, Cc, D];
      faces(
        g,
        cam,
        [...pyramidSides(square, P), ...pyramidSides(square, Q)].map((pts) => ({ pts, ...glass(g.accent) })),
      );

      if (f.at(1) > 0) polygon3(g, cam, square, { fill: tint(SQUARE, 0.2), stroke: SQUARE, alpha: f.at(1) });
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        segment3(g, cam, A, Cc, { color: HALF_DIAGONAL, width: 2, dash: [6, 5], alpha });
        segment3(g, cam, O, A, { color: HALF_DIAGONAL, width: 4, alpha });
        point3(g, cam, O, { color: C.ink, r: 3.5, alpha });
        label3(g, cam, O, "O", { dx: 12, dy: -12, alpha });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        polygon3(g, cam, [P, O, A], { fill: tint(ALTITUDE, 0.22), stroke: null, alpha });
        polygon3(g, cam, [A, P, Cc, Q], { stroke: tint(EDGE, 0.7), width: 2, dash: [3, 5], alpha });
        segment3(g, cam, P, O, { color: ALTITUDE, width: 4, alpha });
        segment3(g, cam, P, A, { color: EDGE, width: 4, alpha });
        rightAngle3(g, cam, O, P, A, { color: ALTITUDE, alpha }, 0.24);
        label3(g, cam, lerp3(P, A, 0.5), "s", { color: EDGE, dx: -13, dy: 8, alpha });
      }

      label3(g, cam, A, "A", { dx: -14 });
      label3(g, cam, B, "B", { dx: 4, dy: -15 });
      label3(g, cam, Cc, "C", { dx: 14 });
      label3(g, cam, D, "D", { dx: 12, dy: 12 });
      label3(g, cam, P, "P", { dy: 15 });
      label3(g, cam, Q, "Q", { dy: -15 });
    },

    readout(f) {
      const { e, A, B, Cc, D, P, Q, O } = model();
      const rows: Readout[] = [];
      if (f.step === 0) rows.push({ label: "Edge", tex: `s = ${fmt(e)}` });
      if (f.step >= 1) rows.push({ label: "Middle square", tex: `s^2 = ${fmt(dist3(A, B) * dist3(B, Cc), 2)}` });
      if (f.step >= 2) rows.push({ label: "Half diagonal", tex: `OA = \\tfrac{\\sqrt2}{2}s = ${fmt(dist3(O, A), 2)}` });
      if (f.step >= 3) rows.push({ label: "Height of a pyramid", tex: `PO = \\tfrac{\\sqrt2}{2}s = ${fmt(dist3(P, O), 2)}` });
      if (f.step >= 4) {
        // Measured as four tetrahedra round the axis PQ.
        const measured = [A, B, Cc, D].reduce((sum, v, i, ring) => sum + tetraVolume(P, Q, v, ring[(i + 1) % 4]), 0);
        rows.push({ label: "Volume", tex: `V = \\tfrac{\\sqrt2}{3}s^3 = ${fmt((Math.SQRT2 / 3) * e ** 3, 2)}` });
        rows.push({ label: "Measured from the corners", tex: `${fmt(measured, 2)}`, tone: "good" });
      }
      return rows;
    },
  };
});
