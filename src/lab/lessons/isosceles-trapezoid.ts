// An isosceles trapezoid three ways: equal legs, equal base angles and equal
// diagonals all arrive together. Sliding the top base shows the three
// comparisons flip at the same moment; the proof drops the two altitudes and
// reads the equalities off two pairs of congruent right triangles.

import { C, tint } from "../draw.ts";
import { angleAt, clamp, dist, fmt, toDeg, vec } from "../geo.ts";
import { eq, GLASS, same } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const BASE_Y = -3.2;
const TOP_MIN = -0.4;
const TOP_MAX = 3.4;
const RIGHT = 7.2;
// Each altitude lands at least this far inside the bottom base, so the right
// triangles of the proof never collapse.
const OVERHANG = 0.8;
const MIN_TOP = 1.2;
// How close to symmetric the top base must be before it clicks into place.
const SNAP = 0.2;

const LEG = C.gold;
const ANGLE = C.pink;
const DIAGONAL = C.blue;
const ALTITUDE = C.green;

export default lesson((s) => {
  // The bottom base is symmetric about the y-axis: D is the mirror image of C.
  const Cc = s.point(6, BASE_Y, { label: "C" });
  const A = s.point(-2.2, 2.4, { label: "A" });
  const B = s.point(4.2, 2.4, { label: "B" });
  // From the first proof step on, the legs are held equal: B mirrors A.
  let isosceles = false;

  Cc.constrain = (p) => vec(clamp(p.x, Math.max(B.x, -A.x) + OVERHANG, RIGHT), BASE_Y);
  // A and B share the top base, so lifting either one lifts the other with it.
  A.constrain = (p) => {
    const x = clamp(p.x, -Cc.x + OVERHANG, isosceles ? -MIN_TOP / 2 : B.x - MIN_TOP);
    B.y = clamp(p.y, TOP_MIN, TOP_MAX);
    if (isosceles) B.x = -x;
    return vec(x, B.y);
  };
  B.constrain = (p) => {
    A.y = clamp(p.y, TOP_MIN, TOP_MAX);
    if (isosceles) return vec(-A.x, A.y);
    const x = clamp(p.x, A.x + MIN_TOP, Cc.x - OVERHANG);
    return vec(Math.abs(x + A.x) < SNAP && -A.x >= A.x + MIN_TOP ? -A.x : x, A.y);
  };

  const settle = (step: number): void => {
    isosceles = step > 0;
    B.enabled = !isosceles;
    if (isosceles) {
      A.x = Math.min(A.x, -MIN_TOP / 2);
      B.x = -A.x;
    }
  };

  const measure = () => {
    const D = vec(-Cc.x, BASE_Y);
    return {
      D,
      X: vec(A.x, BASE_Y),
      Y: vec(B.x, BASE_Y),
      legs: [dist(A, D), dist(B, Cc)],
      base: [angleAt(A, D, Cc), angleAt(B, Cc, D)],
      upper: [angleAt(D, A, B), angleAt(Cc, B, A)],
      diagonals: [dist(A, Cc), dist(B, D)],
    };
  };

  return {
    steps: [
      {
        title: "Three things that happen together",
        text: "Slide $A$ or $B$ along the top base and compare the legs, the base angles and the diagonals in the panel. Bring the top base to the middle until it clicks: all three pairs become equal at once.",
      },
      {
        title: "Equal legs, two altitudes",
        text: "Now keep the legs equal: $AD = BC$. Drop altitudes $AX$ and $BY$ to the bottom base. They span the same pair of parallel lines, so $AX = BY$.",
      },
      {
        title: "Hypotenuse and leg",
        text: "Right triangles $AXD$ and $BYC$ have equal hypotenuses and one pair of equal legs, so they are congruent (HL). Hence $DX = YC$ and $\\angle D = \\angle C$ — and their supplements $\\angle A$ and $\\angle B$ match too.",
      },
      {
        title: "The diagonals",
        text: "In right triangles $AXC$ and $BYD$: $AX = BY$, and $XC = XY + YC = XY + DX = DY$. Two legs match, so the triangles are congruent (LL) and their hypotenuses agree: $AC = BD$.",
      },
      {
        title: "And back again",
        text: "Run it in reverse. Equal diagonals make $AXC \\cong BYD$ by HL, so $XC = DY$, then $DX = YC$, then $AXD \\cong BYC$ by LL: equal legs. Equal base angles give $AXD \\cong BYC$ directly.",
      },
    ],

    draw(g, f) {
      settle(f.step);
      const m = measure();
      const { D, X, Y } = m;
      const equal = same(m.legs[0], m.legs[1]);

      g.polygon([D, Cc, B, A], { fill: GLASS, color: C.dim, width: 2 });
      g.chevrons(A, B, 1, { color: C.dim });
      g.chevrons(D, Cc, 1, { color: C.dim });

      if (f.at(2) > 0) {
        const a = f.at(2) * (1 - 0.8 * f.at(3));
        g.polygon([A, X, D], { fill: tint(LEG, 0.22), stroke: null, alpha: a });
        g.polygon([B, Y, Cc], { fill: tint(LEG, 0.22), stroke: null, alpha: a });
        g.ticks(D, X, 2, { color: C.ink, alpha: f.at(2) });
        g.ticks(Y, Cc, 2, { color: C.ink, alpha: f.at(2) });
      }
      if (f.at(3) > 0) {
        g.polygon([A, X, Cc], { fill: tint(DIAGONAL, 0.16), stroke: null, alpha: f.at(3) });
        g.polygon([B, Y, D], { fill: tint(DIAGONAL, 0.16), stroke: null, alpha: f.at(3) });
      }

      g.segment(A, Cc, { color: DIAGONAL, width: f.step >= 3 ? 3.5 : 2 });
      g.segment(B, D, { color: DIAGONAL, width: f.step >= 3 ? 3.5 : 2 });
      g.segment(A, D, { color: LEG, width: 4 });
      g.segment(B, Cc, { color: LEG, width: 4 });
      if (equal) {
        g.ticks(A, D, 1, { color: LEG });
        g.ticks(B, Cc, 1, { color: LEG });
      }
      g.angle(Cc, D, A, { color: ANGLE, fill: true, r: 30, label: f.step === 0 });
      g.angle(B, Cc, D, { color: ANGLE, fill: true, r: 30, label: f.step === 0 });

      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(A, X, { color: ALTITUDE, width: 2.5, dash: [6, 5], alpha: a });
        g.segment(B, Y, { color: ALTITUDE, width: 2.5, dash: [6, 5], alpha: a });
        g.ticks(A, X, 3, { color: ALTITUDE, alpha: a });
        g.ticks(B, Y, 3, { color: ALTITUDE, alpha: a });
        g.angle(A, X, D, { color: ALTITUDE, r: 14, width: 2, alpha: a });
        g.angle(B, Y, Cc, { color: ALTITUDE, r: 14, width: 2, alpha: a });
        g.point(X, { color: ALTITUDE, alpha: a });
        g.label(X, "X", { color: ALTITUDE, dy: -18, alpha: a });
        g.point(Y, { color: ALTITUDE, alpha: a });
        g.label(Y, "Y", { color: ALTITUDE, dy: -18, alpha: a });
      }

      g.point(D, { color: g.accent });
      g.label(D, "D", { color: g.accent, dx: -16, dy: 14, bold: true });
    },

    readout(f) {
      settle(f.step);
      const m = measure();
      const compare = (label: string, left: string, right: string, values: number[], unit = "") => {
        const equal = same(values[0], values[1]);
        return {
          label,
          tex: `${left} = ${fmt(values[0], 2)}${unit} ${eq(equal)} ${right} = ${fmt(values[1], 2)}${unit}`,
          tone: equal ? ("good" as const) : ("warn" as const),
        };
      };
      const degrees = (pair: number[]): number[] => pair.map(toDeg);
      return [
        compare("Legs", "AD", "BC", m.legs),
        compare("Base angles", "\\angle D", "\\angle C", degrees(m.base), "^\\circ"),
        compare("Upper angles", "\\angle A", "\\angle B", degrees(m.upper), "^\\circ"),
        compare("Diagonals", "AC", "BD", m.diagonals),
      ];
    },
  };
});
