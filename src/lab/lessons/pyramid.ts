// A regular pyramid: a third of the prism on the same base, with its apex over
// the centre of the base. The slant height — the altitude of a side face —
// comes from a right triangle inside, and gives the lateral area. A cube cut
// into three congruent pyramids shows where the third comes from.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, TAU } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { add3, faces, label3, Orbit, p3, point3, polygon3, scale3, segment3, type P3 } from "../solid.ts";
import { centroid3, glass, mid3, polygonY, prismSides, pyramidSides, rightAngle3, triangleArea3 } from "../kit/solids.ts";

const ALTITUDE = C.blue;
const APOTHEM = C.green;
const SLANT = C.pink;
const THIRDS = [C.gold, C.cyan, C.violet];

const CUBE_HALF = 1.05;
const CUBE_CENTRE = { x: 5.3, y: 0.6 };

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.5, 0.4, { x: -0.8, y: 0.5 }));
  // The dissected cube turns with the pyramid, on its own patch of the stage.
  const cubeCam = new Orbit(cam.yaw, cam.pitch, CUBE_CENTRE);
  const sides = s.slider({ label: "sides n =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 3, max: 8, value: 4, step: 1 });
  const radius = s.slider({ label: "base radius", at: { x: -3.2, y: -4.3 }, width: 3.4, min: 1.2, max: 2.4, value: 2, step: 0.1 });
  const height = s.slider({ label: "h =", at: { x: 1.2, y: -4.3 }, width: 3.4, min: 1.5, max: 4, value: 3, step: 0.1 });

  const model = () => {
    const n = sides.value;
    const r = radius.value;
    const h = height.value;
    const base = polygonY(n, r, -h / 2, Math.PI / 2 - Math.PI / n);
    const apex = p3(0, h / 2, 0);
    const O = p3(0, -h / 2, 0);
    const M = mid3(base[0], base[1]);
    const side = 2 * r * Math.sin(Math.PI / n);
    const apothem = r * Math.cos(Math.PI / n);
    return {
      n,
      h,
      base,
      apex,
      O,
      M,
      side,
      apothem,
      slant: Math.hypot(h, apothem),
      area: (n / 2) * r * r * Math.sin(TAU / n),
    };
  };

  /** The cube as three pyramids sharing the corner V, eased apart by `gap`. */
  const drawThirds = (g: Draw, gap: number, alpha: number): void => {
    cubeCam.yaw = cam.yaw;
    cubeCam.pitch = cam.pitch;
    const k = CUBE_HALF;
    const V = p3(-k, k, k);
    // Each pyramid stands on one of the three faces that do not touch V.
    const parts: { base: P3[]; out: P3 }[] = [
      { base: [p3(k, -k, k), p3(k, -k, -k), p3(k, k, -k), p3(k, k, k)], out: p3(1, 0, 0) },
      { base: [p3(-k, -k, k), p3(k, -k, k), p3(k, -k, -k), p3(-k, -k, -k)], out: p3(0, -1, 0) },
      { base: [p3(-k, -k, -k), p3(k, -k, -k), p3(k, k, -k), p3(-k, k, -k)], out: p3(0, 0, -1) },
    ];
    parts
      .map((part, i) => {
        const shift = scale3(part.out, gap);
        const base = part.base.map((p) => add3(p, shift));
        const tip = add3(V, shift);
        return { base, tip, color: THIRDS[i], depth: cubeCam.project(centroid3([...base, tip])).depth };
      })
      .sort((a, b) => a.depth - b.depth)
      .forEach(({ base, tip, color }) => {
        faces(g, cubeCam, [base, ...pyramidSides(base, tip)].map((pts) => ({ pts, ...glass(color, 0.22), alpha })));
      });
    g.label({ x: CUBE_CENTRE.x, y: CUBE_CENTRE.y - 2.9 }, "one cube = three equal pyramids", { size: 13, alpha });
  };

  return {
    steps: [
      {
        title: "A regular pyramid",
        text: "Choose how many sides the base has, its size, and the height $h$. The base is a regular polygon and the apex $P$ sits directly above its centre $O$, so all the side faces are congruent triangles.",
      },
      {
        title: "A third of the prism",
        text: "Stand a prism on the same base with the same height. The pyramid fills exactly one third of it: $V = \\tfrac13 Bh$, where $B$ is the area of the base. This holds for every pyramid.",
      },
      {
        title: "Why a third",
        text: "Here is one case you can see. Join one corner of a cube to the three faces that do not touch it. The cube splits into three congruent pyramids, each with base $c^2$ and height $c$, so each is $\\tfrac13 c^3$.",
      },
      {
        title: "Slant height",
        text: "$M$ is the midpoint of a base edge. $PO$ is perpendicular to the base, so $POM$ is a right triangle and $PM^2 = PO^2 + OM^2$. $PM$ is the altitude of a side face, called the slant height $l$.",
      },
      {
        title: "Lateral area",
        text: "Each side face is a triangle with base $a$ (a side of the polygon) and height $l$, so its area is $\\tfrac12 al$. There are $n$ of them: the lateral area is $\\tfrac12 (na)\\,l = \\tfrac12 pl$, with $p$ the base perimeter.",
      },
    ],

    draw(g, f) {
      const { n, h, base, apex, O, M } = model();

      if (f.step === 1) {
        const lid = polygonY(n, radius.value, h / 2, Math.PI / 2 - Math.PI / n);
        const ghost = { fill: tint(C.ink, 0.04), stroke: C.dim, width: 1.5, alpha: f.at(1) };
        faces(g, cam, [lid, ...prismSides(base, lid)].map((pts) => ({ pts, ...ghost })));
      }

      faces(g, cam, [base, ...pyramidSides(base, apex)].map((pts) => ({ pts, ...glass(g.accent) })));

      if (f.at(4) > 0) {
        polygon3(g, cam, [base[0], base[1], apex], { fill: tint(SLANT, 0.28), stroke: SLANT, alpha: f.at(4) });
        label3(g, cam, mid3(base[0], base[1]), "a", { color: SLANT, dy: -15, alpha: f.at(4) });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        polygon3(g, cam, [apex, O, M], { fill: tint(ALTITUDE, 0.2), stroke: null, alpha });
        segment3(g, cam, apex, O, { color: ALTITUDE, width: 4, alpha });
        segment3(g, cam, O, M, { color: APOTHEM, width: 4, alpha });
        segment3(g, cam, apex, M, { color: SLANT, width: 4, alpha });
        rightAngle3(g, cam, O, apex, M, { color: ALTITUDE, alpha }, 0.24);
        rightAngle3(g, cam, M, apex, base[1], { color: SLANT, alpha }, 0.24);
        label3(g, cam, mid3(apex, O), "h", { color: ALTITUDE, dx: -12, alpha });
        label3(g, cam, mid3(apex, M), "l", { color: SLANT, dx: 13, alpha });
        point3(g, cam, M, { color: APOTHEM, label: "M", alpha });
      }
      point3(g, cam, O, { color: C.ink, r: 3.5 });
      label3(g, cam, O, "O", { dx: -13, dy: -11 });
      label3(g, cam, apex, "P", { dy: 15 });

      if (f.step === 2) drawThirds(g, 0.3 * (1 - Math.cos(f.time * 1.3)), f.at(2));
    },

    readout(f) {
      const { n, h, base, apex, side, apothem, slant, area } = model();
      const volume = (area * h) / 3;
      const slantRow: Readout = { label: "Slant height", tex: `l = \\sqrt{h^2 + OM^2} = ${fmt(slant, 2)}` };
      if (f.step >= 4) {
        const perimeter = n * side;
        const measured = base.reduce((sum, p, i) => sum + triangleArea3(p, base[(i + 1) % n], apex), 0);
        return [
          slantRow,
          { label: "Perimeter", tex: `p = na = ${n} \\cdot ${fmt(side, 2)} = ${fmt(perimeter, 2)}` },
          { label: "Lateral area", tex: `\\tfrac12 pl = ${fmt((perimeter * slant) / 2, 2)}` },
          { label: "Side faces, added one by one", tex: `${fmt(measured, 2)}`, tone: "good" },
        ];
      }
      const rows: Readout[] = [
        { label: "Base area", tex: `B = ${fmt(area, 2)}` },
        { label: "Volume", tex: `V = \\tfrac13 Bh = \\tfrac13 (${fmt(area, 2)})(${fmt(h)}) = ${fmt(volume, 2)}` },
      ];
      if (f.step === 1) {
        rows.push({ label: "Prism on the same base", tex: `Bh = ${fmt(area * h, 2)} = 3V`, tone: "good" });
      }
      if (f.step === 2) {
        rows.push({ label: "In the cube", tex: "3 \\cdot \\tfrac13 c^2 \\cdot c = c^3", tone: "good" });
      }
      if (f.step === 3) {
        rows.push({ label: "Centre to edge", tex: `OM = ${fmt(apothem, 2)}` }, slantRow);
      }
      return rows;
    },
  };
});
