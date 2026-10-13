// The cube's standard measurements — surface, volume, face diagonal, space
// diagonal — and two equilateral triangles hiding in it: one made of three
// face diagonals, one joining the midpoints of the three edges at a corner.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { dist3, faces, label3, Orbit, p3, polygon3, segment3 } from "../solid.ts";
import { glass, mid3, rightAngle3 } from "../kit/solids.ts";

const FACE_DIAGONAL = C.gold;
const SPACE_DIAGONAL = C.pink;
const EDGE = C.blue;
const MIDPOINTS = C.green;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.62, 0.38, { x: 0, y: 0.6 }));
  const side = s.slider({ label: "s =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 2, max: 4.4, value: 3.6, step: 0.2 });

  // Floor ABCD, ceiling EFGH directly above.
  const corners = () => {
    const k = side.value / 2;
    return {
      A: p3(-k, -k, k),
      B: p3(k, -k, k),
      Cc: p3(k, -k, -k),
      D: p3(-k, -k, -k),
      E: p3(-k, k, k),
      F: p3(k, k, k),
      G: p3(k, k, -k),
      H: p3(-k, k, -k),
    };
  };

  return {
    steps: [
      {
        title: "Six equal squares",
        text: "Change the edge $s$ and turn the cube by dragging empty space. Six square faces give surface area $6s^2$; stacking a face to height $s$ gives volume $s^3$.",
      },
      {
        title: "Across a face",
        text: "The floor is a square, so $ABC$ is a right triangle with two legs of length $s$. Its hypotenuse, the face diagonal, is $AC = s\\sqrt2$.",
      },
      {
        title: "Through the middle",
        text: "Edge $CG$ is perpendicular to the floor, so it is perpendicular to $AC$. In right triangle $ACG$: $AG^2 = 2s^2 + s^2$, so the space diagonal is $AG = s\\sqrt3$.",
      },
      {
        title: "Three face diagonals",
        text: "$B$, $D$ and $E$ are the three corners next to $A$. Each side of triangle $BDE$ crosses one face as its diagonal, so all three are $s\\sqrt2$: the triangle is equilateral.",
      },
      {
        title: "Three midpoints",
        text: "$L$, $M$, $N$ are the midpoints of the edges at $A$. Each side of $LMN$ is the hypotenuse of a right triangle with legs $\\tfrac{s}{2}$, so each is $\\tfrac{s\\sqrt2}{2}$: equilateral again, with $60^\\circ$ angles.",
      },
    ],

    draw(g, f) {
      const { A, B, Cc, D, E, F, G, H } = corners();
      faces(
        g,
        cam,
        [[A, B, Cc, D], [E, F, G, H], [A, B, F, E], [B, Cc, G, F], [Cc, D, H, G], [D, A, E, H]].map((pts) => ({
          pts,
          ...glass(g.accent),
        })),
      );

      // The diagonals step back once the triangles take the stage.
      const early = f.step >= 3 ? 0.3 : 1;
      if (f.at(1) > 0) {
        const alpha = f.at(1) * early;
        polygon3(g, cam, [A, B, Cc], { fill: tint(FACE_DIAGONAL, 0.2), stroke: null, alpha });
        segment3(g, cam, A, Cc, { color: FACE_DIAGONAL, alpha });
        rightAngle3(g, cam, B, A, Cc, { color: FACE_DIAGONAL, alpha });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2) * early;
        polygon3(g, cam, [A, Cc, G], { fill: tint(SPACE_DIAGONAL, 0.2), stroke: null, alpha });
        segment3(g, cam, Cc, G, { color: EDGE, width: 4, alpha });
        segment3(g, cam, A, G, { color: SPACE_DIAGONAL, width: 4, alpha });
        rightAngle3(g, cam, Cc, A, G, { color: EDGE, alpha });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3) * (f.step >= 4 ? 0.3 : 1);
        polygon3(g, cam, [B, D, E], { fill: tint(FACE_DIAGONAL, 0.25), stroke: FACE_DIAGONAL, width: 4, alpha });
        for (const [p, q] of [[B, D], [D, E], [E, B]]) g.ticks(cam.project(p), cam.project(q), 1, { color: FACE_DIAGONAL, alpha });
      }
      if (f.at(4) > 0) {
        const alpha = f.at(4);
        const L = mid3(A, B);
        const M = mid3(A, D);
        const N = mid3(A, E);
        polygon3(g, cam, [L, M, N], { fill: tint(MIDPOINTS, 0.3), stroke: MIDPOINTS, width: 4, alpha });
        label3(g, cam, L, "L", { color: MIDPOINTS, dy: -14, alpha });
        label3(g, cam, M, "M", { color: MIDPOINTS, dx: -14, alpha });
        label3(g, cam, N, "N", { color: MIDPOINTS, dx: -14, alpha });
      }

      label3(g, cam, A, "A", { dx: -14, dy: -12 });
      label3(g, cam, B, "B", { dx: 14, dy: -12 });
      label3(g, cam, Cc, "C", { dx: 14, dy: -12 });
      label3(g, cam, D, "D", { dx: -14, dy: -12 });
      label3(g, cam, E, "E", { dx: -14, dy: 12 });
      label3(g, cam, G, "G", { dx: 14, dy: 12 });
    },

    readout(f) {
      const edge = side.value;
      const { A, B, Cc, D, G } = corners();
      const rows: Readout[] = [
        { label: "Surface area", tex: `S = 6s^2 = 6(${fmt(edge)})^2 = ${fmt(6 * edge * edge)}` },
        { label: "Volume", tex: `V = s^3 = (${fmt(edge)})^3 = ${fmt(edge ** 3)}` },
      ];
      if (f.step === 1 || f.step === 2) {
        rows.push({ label: "Face diagonal", tex: `AC = s\\sqrt2 = ${fmt(dist3(A, Cc), 2)}` });
      }
      if (f.step === 2) {
        rows.push({ label: "Space diagonal", tex: `AG = s\\sqrt3 = ${fmt(dist3(A, G), 2)}` });
      }
      if (f.step === 3) {
        rows.push({
          label: "Sides of BDE",
          tex: `BD = DE = EB = ${fmt(dist3(B, D), 2)} = s\\sqrt2`,
          tone: "good",
        });
        rows.push({
          label: "Area of BDE",
          tex: `\\tfrac{\\sqrt3}{4}(s\\sqrt2)^2 = \\tfrac{\\sqrt3}{2}s^2 = ${fmt((Math.sqrt(3) / 2) * edge * edge, 2)}`,
        });
      }
      if (f.step === 4) {
        const L = mid3(A, B);
        const M = mid3(A, D);
        rows.push({
          label: "Sides of LMN",
          tex: `LM = MN = NL = ${fmt(dist3(L, M), 2)} = \\tfrac{s\\sqrt2}{2}`,
          tone: "good",
        });
        rows.push({ label: "So every angle is", tex: "\\angle LMN = 60^\\circ", tone: "good" });
      }
      return rows;
    },
  };
});
