// Equal sides if and only if equal base angles. Both directions drop the
// altitude from the apex and compare the two right triangles it makes: HL
// turns equal sides into equal angles, SA turns equal angles into equal sides.

import { C, tint } from "../draw.ts";
import { angleAt, clamp, dist, fmt, toDeg, type Vec } from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson, type Readout } from "../scene.ts";

const BASE = -2.8;
const FOOT: Vec = { x: 0, y: BASE };

const SIDES = C.gold;
const ANGLES = C.pink;
const ALTITUDE = C.cyan;

export default lesson((s) => {
  const A = s.point(0, 3.4, { label: "A", constrain: (p) => ({ x: 0, y: clamp(p.y, 0.2, 4.2) }) });
  const V = s.point(3.6, BASE, { label: "C", constrain: (p) => ({ x: clamp(p.x, 1.5, 6.5), y: BASE }) });
  // B mirrors C in the axis through A, which is what keeps the triangle isosceles.
  const mirror = (): Vec => ({ x: -V.x, y: BASE });

  return {
    steps: [
      {
        title: "Two equal sides, two equal angles",
        text: "Slide $A$ along the axis and drag $C$ to widen the base. Sides $AB$ and $AC$ stay equal, and so do the base angles at $B$ and $C$. Does each fact force the other?",
      },
      {
        title: "Start from equal sides",
        text: "Suppose all we know is $AB = AC$. Drop the altitude from $A$ to the base, meeting it at $X$. It splits the triangle into two right triangles.",
      },
      {
        title: "HL gives equal angles",
        text: "Right triangles $AXB$ and $AXC$ have equal hypotenuses, $AB = AC$, and share the leg $AX$. By HL they are congruent, so $\\angle B = \\angle C$.",
      },
      {
        title: "Start from equal angles",
        text: "Now begin again, knowing only that $\\angle B = \\angle C$. Draw the same altitude $AX$.",
      },
      {
        title: "SA gives equal sides",
        text: "Right triangles $AXB$ and $AXC$ share the leg $AX$ and have equal acute angles at $B$ and $C$. By SA they are congruent, so $AB = AC$. Equal sides and equal base angles always come together.",
      },
    ],

    draw(g, f) {
      const B = mirror();
      // A mark that belongs to one step fades in during it and is solid otherwise.
      const arriving = (n: number): number => (f.step === n ? f.at(n) : 1);
      const sidesKnown = f.step !== 3;
      const anglesKnown = f.step !== 1;

      if (f.step === 2 || f.step === 4) {
        const alpha = arriving(f.step);
        g.polygon([A, FOOT, B], { fill: tint(C.blue, 0.22), stroke: null, alpha });
        g.polygon([A, FOOT, V], { fill: tint(C.violet, 0.22), stroke: null, alpha });
      } else {
        g.polygon([A, B, V], { fill: "rgba(255, 255, 255, 0.05)", stroke: null });
      }
      g.segment(B, V);

      for (const end of [B, V]) {
        g.segment(A, end, { color: sidesKnown ? SIDES : C.ink });
        if (sidesKnown) g.ticks(A, end, 1, { color: SIDES, alpha: arriving(4) });
      }
      if (anglesKnown) {
        g.angle(A, B, V, { color: ANGLES, fill: true, r: 32, alpha: arriving(2) });
        g.angle(A, V, B, { color: ANGLES, fill: true, r: 32, alpha: arriving(2) });
      }
      if (f.at(1) > 0) {
        g.segment(A, FOOT, { color: ALTITUDE, width: 2.5, dash: [7, 5], alpha: f.at(1) });
        g.angle(A, FOOT, V, { color: ALTITUDE, r: 15, width: 2, alpha: f.at(1) });
        g.point(FOOT, { color: ALTITUDE, alpha: f.at(1) });
        g.label(FOOT, "X", { color: ALTITUDE, bold: true, dy: -18, alpha: f.at(1) });
      }

      g.point(B, { color: g.accent });
      g.label(B, "B", { color: g.accent, bold: true, dx: -18, dy: 18 });
      if (f.step >= 1) {
        const known = f.step <= 2 ? "Given: AB = AC" : "Given: ∠B = ∠C";
        g.label({ x: 0, y: -4.1 }, known, { color: f.step <= 2 ? SIDES : ANGLES, size: 17, bold: true });
      }
    },

    readout(f) {
      const B = mirror();
      const AB = dist(A, B);
      const AC = dist(A, V);
      const atB = angleAt(A, B, V);
      const atC = angleAt(A, V, B);
      const rows: Readout[] = [
        { label: "Sides", tex: `AB = ${fmt(AB, 2)},\\quad AC = ${fmt(AC, 2)}`, tone: holds(agree(AB, AC)) },
        {
          label: "Base angles",
          tex: `\\angle B = ${fmt(toDeg(atB))}^\\circ,\\quad \\angle C = ${fmt(toDeg(atC))}^\\circ`,
          tone: holds(agree(atB, atC)),
        },
      ];
      if (f.step === 0) return rows;
      const BX = dist(B, FOOT);
      const XC = dist(FOOT, V);
      return [
        ...rows,
        { label: "Shared leg", tex: `AX = ${fmt(dist(A, FOOT), 2)}` },
        { label: "Halves of the base", tex: `BX = ${fmt(BX, 2)},\\quad XC = ${fmt(XC, 2)}`, tone: holds(agree(BX, XC)) },
      ];
    },
  };
});
