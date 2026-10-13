// The space diagonal of a box, found with the Pythagorean theorem twice: once
// across the floor, then once more standing up on the floor's diagonal.

import { C, tint } from "../draw.ts";
import { fmt } from "../geo.ts";
import { lesson } from "../scene.ts";
import { faces, label3, Orbit, p3, polygon3, segment3, type P3 } from "../solid.ts";

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.65, 0.4, { x: 0, y: 0.6 }));
  const length = s.slider({ label: "l =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 1, max: 6, value: 4, step: 0.5 });
  const width = s.slider({ label: "w =", at: { x: -3.2, y: -4.3 }, width: 3.4, min: 1, max: 6, value: 3, step: 0.5 });
  const height = s.slider({ label: "h =", at: { x: 1.2, y: -4.3 }, width: 3.4, min: 1, max: 6, value: 2.5, step: 0.5 });

  return {
    steps: [
      {
        title: "A box in your hand",
        text: "Drag empty space to turn the box, and use the sliders to change its length $l$, width $w$ and height $h$. How long is the diagonal through the inside, from one corner to the opposite one?",
      },
      {
        title: "Across the floor",
        text: "First cross the floor. The floor is an $l \\times w$ rectangle, so its diagonal $AC$ is the hypotenuse of a right triangle: $AC^2 = l^2 + w^2$.",
      },
      {
        title: "Stand a triangle on it",
        text: "The edge $CG$ rises straight up from the floor, so it is perpendicular to every line in the floor through $C$ — including $AC$. That makes $ACG$ a right triangle.",
      },
      {
        title: "Pythagoras again",
        text: "In triangle $ACG$: $AG^2 = AC^2 + h^2 = l^2 + w^2 + h^2$. The space diagonal is $\\sqrt{l^2 + w^2 + h^2}$.",
      },
    ],

    draw(g, f) {
      const l = length.value / 2;
      const w = width.value / 2;
      const h = height.value / 2;
      // Floor ABCD, ceiling EFGH directly above.
      const A = p3(-l, -h, w);
      const B = p3(l, -h, w);
      const Cc = p3(l, -h, -w);
      const D = p3(-l, -h, -w);
      const E = p3(-l, h, w);
      const F = p3(l, h, w);
      const G = p3(l, h, -w);
      const H = p3(-l, h, -w);

      const glass = { fill: tint(g.accent, 0.08), stroke: tint(g.accent, 0.9), width: 2 };
      const quads: P3[][] = [
        [A, B, Cc, D], [E, F, G, H], [A, B, F, E], [B, Cc, G, F], [Cc, D, H, G], [D, A, E, H],
      ];
      faces(g, cam, quads.map((pts) => ({ pts, ...glass })));

      if (f.at(1) > 0) {
        polygon3(g, cam, [A, B, Cc], { fill: tint(C.gold, 0.22), stroke: null, alpha: f.at(1) });
        segment3(g, cam, A, Cc, { color: C.gold, alpha: f.at(1) });
      }
      if (f.at(2) > 0) {
        polygon3(g, cam, [A, Cc, G], { fill: tint(C.pink, 0.22), stroke: null, alpha: f.at(2) });
        segment3(g, cam, Cc, G, { color: C.blue, width: 4, alpha: f.at(2) });
      }
      segment3(g, cam, A, G, { color: C.pink, width: 4, dash: f.step < 3 ? [8, 6] : [] });

      label3(g, cam, A, "A", { dx: -14, dy: -12 });
      label3(g, cam, Cc, "C", { dx: 14, dy: -12 });
      label3(g, cam, G, "G", { dx: 14, dy: 12 });
    },

    readout(f) {
      const l = length.value;
      const w = width.value;
      const h = height.value;
      const floor = Math.hypot(l, w);
      const rows = [
        { label: "Volume", tex: `V = lwh = ${fmt(l * w * h)}` },
        { label: "Surface area", tex: `S = 2(lw + lh + wh) = ${fmt(2 * (l * w + l * h + w * h))}` },
      ];
      if (f.step >= 1) {
        rows.push({ label: "Floor diagonal", tex: `AC = \\sqrt{l^2 + w^2} = ${fmt(floor, 2)}` });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Space diagonal",
          tex: `AG = \\sqrt{l^2 + w^2 + h^2} = ${fmt(Math.hypot(l, w, h), 2)}`,
        });
      }
      return rows;
    },
  };
});
