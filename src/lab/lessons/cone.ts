// A right circular cone beside its own lateral surface, cut along one slant
// line and laid flat. The flat piece is a sector of a circle of radius l (the
// slant height) whose arc is the cone's rim, and that gives the area πrl.

import { C, tint } from "../draw.ts";
import { fmt, polar, TAU } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { label3, lerp3, Orbit, p3, path3, point3, polygon3, ringY, segment3 } from "../solid.ts";
import { cone3, rightAngle3 } from "../kit/solids.ts";

const RIM = C.gold;
const SLANT = C.pink;
const ALTITUDE = C.blue;
const RADIUS = C.green;

const RULINGS = 12; // slant lines drawn on the cone and on its flat copy
const SECTOR_CENTRE = { x: 4.2, y: 0.2 };

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.4, 0.3, { x: -4, y: 0.5 }));
  const radius = s.slider({ label: "r =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 0.8, max: 1.6, value: 1.4, step: 0.1 });
  const height = s.slider({ label: "h =", at: { x: -3.2, y: -4.3 }, width: 3.4, min: 1.5, max: 3, value: 2.6, step: 0.1 });

  return {
    steps: [
      {
        title: "A pyramid with a round base",
        text: "Set the radius $r$ and the height $h$, and drag empty space to turn the cone. Like every pyramid, it holds a third of the cylinder around it: $V = \\tfrac13 \\pi r^2 h$.",
      },
      {
        title: "Slant height",
        text: "The axis is perpendicular to the base, so the height, a radius and the line from the apex to the rim form a right triangle. The slant height $l$ satisfies $r^2 + h^2 = l^2$.",
      },
      {
        title: "Cut and unroll",
        text: "Cut the surface along one slant line and flatten it. Every point of the rim is $l$ from the apex, so the rim becomes an arc of a circle of radius $l$. The arc is still as long as the rim: $2\\pi r$.",
      },
      {
        title: "Area of the sector",
        text: "A full circle of radius $l$ has circumference $2\\pi l$. Our arc is the fraction $\\tfrac{2\\pi r}{2\\pi l} = \\tfrac{r}{l}$ of it, so the sector is that fraction of the disc: $\\tfrac{r}{l} \\cdot \\pi l^2 = \\pi r l$.",
      },
      {
        title: "Total surface",
        text: "Add the base, a disc of radius $r$, to the lateral surface: the total surface area of a cone is $\\pi r l + \\pi r^2$.",
      },
    ],

    draw(g, f) {
      const r = radius.value;
      const h = height.value;
      const l = Math.hypot(r, h);
      const apex = p3(0, h / 2, 0);
      const O = p3(0, -h / 2, 0);
      // Parametrised from the cut, which faces the viewer at the start.
      const rim = ringY(O, r, Math.PI / 2, Math.PI / 2 + TAU, 72).slice(0, 72);
      const cutFoot = rim[0];

      cone3(g, cam, apex, rim, g.accent);
      if (f.at(4) > 0) {
        polygon3(g, cam, rim, { fill: tint(RADIUS, 0.25), stroke: null, alpha: f.at(4) });
        label3(g, cam, p3(-r / 2, -h / 2, 0), "πr²", { color: RADIUS, size: 14, alpha: f.at(4) });
      }

      if (f.at(2) > 0) {
        const alpha = f.at(2);
        for (let i = 1; i < RULINGS; i++) {
          segment3(g, cam, apex, rim[(i * rim.length) / RULINGS], { color: C.faint, width: 1.5, alpha });
        }
        path3(g, cam, [...rim, rim[0]], { color: RIM, width: 4, alpha });
        segment3(g, cam, apex, cutFoot, { color: SLANT, width: 4, alpha });
      }
      if (f.at(1) > 0) {
        const alpha = f.at(1);
        const Q = p3(r, -h / 2, 0);
        polygon3(g, cam, [apex, O, Q], { fill: tint(ALTITUDE, 0.18), stroke: null, alpha });
        segment3(g, cam, apex, O, { color: ALTITUDE, width: 4, alpha });
        segment3(g, cam, O, Q, { color: RADIUS, width: 4, alpha });
        segment3(g, cam, apex, Q, { color: SLANT, width: 4, alpha });
        rightAngle3(g, cam, O, apex, Q, { color: ALTITUDE, alpha }, 0.22);
        label3(g, cam, lerp3(apex, O, 0.5), "h", { color: ALTITUDE, dx: -12, alpha });
        label3(g, cam, lerp3(O, Q, 0.5), "r", { color: RADIUS, dy: -13, alpha });
        label3(g, cam, lerp3(apex, Q, 0.5), "l", { color: SLANT, dx: 13, dy: 4, alpha });
      }
      point3(g, cam, apex, { r: 3.5 });

      if (f.at(2) > 0) {
        const alpha = f.at(2);
        // The sector opens upward, symmetric about the vertical through its centre.
        const sweep = (TAU * r) / l;
        const from = Math.PI / 2 - sweep / 2;
        const to = Math.PI / 2 + sweep / 2;
        const c = SECTOR_CENTRE;
        if (f.at(3) > 0) {
          g.circle(c, l, { stroke: C.dim, width: 1.5, dash: [5, 6], alpha: f.at(3) });
        }
        g.sector(c, l, from, to, { fill: tint(g.accent, f.step >= 3 ? 0.22 : 0.1), stroke: null, alpha });
        for (let i = 1; i < RULINGS; i++) {
          g.segment(c, polar(c, l, from + (sweep * i) / RULINGS), { color: C.faint, width: 1.5, alpha });
        }
        g.arc(c, l, from, to, { color: RIM, width: 4, alpha });
        g.segment(c, polar(c, l, from), { color: SLANT, width: 4, alpha });
        g.segment(c, polar(c, l, to), { color: SLANT, width: 4, alpha });
        g.point(c, { r: 3.5, alpha });
        g.along(c, polar(c, l, from), "l", { color: SLANT, offset: -14, alpha });
        g.label(polar(c, l, Math.PI / 2), "arc = 2πr", { color: RIM, dy: 15, size: 14, alpha });
      }
    },

    readout(f) {
      const r = radius.value;
      const h = height.value;
      const l = Math.hypot(r, h);
      const rows: Readout[] = [
        { label: "Volume", tex: `V = \\tfrac13 \\pi r^2 h = ${fmt((Math.PI * r * r * h) / 3, 2)}` },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Slant height",
          tex: `l = \\sqrt{r^2 + h^2} = \\sqrt{${fmt(r * r, 2)} + ${fmt(h * h, 2)}} = ${fmt(l, 2)}`,
        });
      }
      if (f.step >= 2) {
        rows.push({ label: "Arc of the sector", tex: `2\\pi r = ${fmt(TAU * r, 2)}` });
        rows.push({ label: "Angle of the sector", tex: `\\tfrac{r}{l} \\cdot 360^\\circ = ${fmt((360 * r) / l, 0)}^\\circ` });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Lateral area",
          tex: `\\tfrac{r}{l} \\cdot \\pi l^2 = \\pi r l = ${fmt(Math.PI * r * l, 2)}`,
          tone: "good",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: "Total area",
          tex: `\\pi r l + \\pi r^2 = ${fmt(Math.PI * r * l + Math.PI * r * r, 2)}`,
        });
      }
      return rows;
    },
  };
});
