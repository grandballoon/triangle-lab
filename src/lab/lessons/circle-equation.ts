// The equation of a circle. A circle is every point at distance R from its
// centre (p, q), so the distance formula turns it into
// (x − p)² + (y − q)² = R². A test point shows the left side falling short of,
// matching or exceeding R²; multiplying out gives the general form, and
// completing the square recovers the centre and radius from it.

import { C, tint } from "../draw.ts";
import { both, dist, fmt, inBox, inRing, snapToGrid } from "../geo.ts";
import { lattice, num, pair, par, plane, riseRun, settle, texPoint, texShiftSquared, texSum } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const RADIUS = C.gold;
// With the centre this near the middle and R at most MAX_R, the whole circle
// stays on the stage.
const MAX_R = 3;
const CENTRE_BOX = both(snapToGrid(1), inBox(-4, 4, -1, 1));

type Place = "inside" | "on" | "outside";
const PLACE: Record<Place, { color: string; sign: string; text: string }> = {
  inside: { color: C.blue, sign: "<", text: "inside" },
  on: { color: C.green, sign: "=", text: "on the circle" },
  outside: { color: C.orange, sign: ">", text: "outside" },
};

export default lesson((s) => {
  const O = s.point(-2, 0, { label: "O", constrain: CENTRE_BOX });
  // On the lattice wherever that keeps 1 ≤ R ≤ MAX_R, else on the nearer limit.
  const rim = s.point(1, 0, {
    label: "(x, y)",
    color: RADIUS,
    constrain: both(snapToGrid(1), inRing(() => O, 1, MAX_R)),
  });
  const T = s.point(2, 2, { label: "T", color: C.ink, constrain: lattice });

  let lastO = { x: O.x, y: O.y };

  const radiusSquared = (): number => dist(O, rim) ** 2;
  const leftSide = (): number => (T.x - O.x) ** 2 + (T.y - O.y) ** 2;
  function place(): Place {
    const excess = leftSide() - radiusSquared();
    return Math.abs(excess) < 1e-6 ? "on" : excess < 0 ? "inside" : "outside";
  }
  /** The coefficients of x² + y² + Ax + By + C = 0. */
  const general = (): { A: number; B: number; C: number } => ({
    A: -2 * O.x + 0,
    B: -2 * O.y + 0,
    C: O.x ** 2 + O.y ** 2 - radiusSquared(),
  });

  return {
    steps: [
      {
        title: "All the points at one distance",
        text: "Drag the centre $O$, and drag the gold point to set the radius $R$. The circle is every point whose distance from $O = (p, q)$ is exactly $R$.",
      },
      {
        title: "From distance to equation",
        text: "By the distance formula, a point $(x, y)$ is $\\sqrt{(x - p)^2 + (y - q)^2}$ from the centre. On the circle that equals $R$; squaring both sides gives $(x - p)^2 + (y - q)^2 = R^2$.",
      },
      {
        title: "Test a point",
        text: "Drag $T$ around. The left side is the square of its distance from $O$: less than $R^2$ inside the circle, equal to it on the circle, greater outside.",
      },
      {
        title: "Multiply it out",
        text: "Expand the squares and move everything to one side: $x^2 + y^2 + Ax + By + C = 0$, with $A = -2p$, $B = -2q$ and $C = p^2 + q^2 - R^2$. The centre and radius are now hidden.",
      },
      {
        title: "Complete the square",
        text: "To find them again, add $\\tfrac{A^2}{4}$ and $\\tfrac{B^2}{4}$ to both sides. The left side folds back into two squares: the centre is $(-\\tfrac A2, -\\tfrac B2)$ and $R^2 = \\tfrac{A^2}{4} + \\tfrac{B^2}{4} - C$.",
      },
    ],

    draw(g, f) {
      // The rim point rides along with the centre, keeping the radius.
      rim.x += O.x - lastO.x;
      rim.y += O.y - lastO.y;
      lastO = { x: O.x, y: O.y };
      settle(rim);
      const testing = f.step >= 2;
      T.hidden = !testing;
      T.enabled = testing;
      const R = dist(O, rim);

      plane(g);
      g.circle(O, R, { color: g.accent, fill: tint(g.accent, 0.08) });
      g.segment(O, rim, { color: RADIUS });
      g.along(O, rim, `R = ${num(R, 2)}`, { color: RADIUS, offset: rim.x >= O.x ? 16 : -16 });
      g.label(O, pair(O), { color: g.accent, dx: -18, dy: -18, align: "right", size: 13 });

      if (f.at(1) > 0 && !testing) {
        riseRun(g, O, rim, { alpha: f.at(1), run: `x − p = ${num(rim.x - O.x, 2)}`, rise: `y − q = ${num(rim.y - O.y, 2)}` });
      }
      if (f.at(2) > 0) {
        const where = PLACE[place()];
        g.segment(O, T, { color: where.color, width: 2, dash: [6, 5], alpha: f.at(2) });
        g.label(T, where.text, { color: where.color, dx: 18, dy: -18, align: "left", bold: true, alpha: f.at(2) });
      }
    },

    readout(f) {
      const R2 = radiusSquared();
      const standard = `${texShiftSquared("x", O.x)} + ${texShiftSquared("y", O.y)} = ${fmt(R2, 2)}`;
      const { A, B, C: c } = general();
      const generalRow: Readout = {
        label: "General form",
        tex: `${texSum([[1, "x^2"], [1, "y^2"], [A, "x"], [B, "y"], [c, ""]])} = 0`,
      };

      if (f.step < 3) {
        const rows: Readout[] = [
          { label: "Centre and radius", tex: `(p,\\,q) = ${texPoint(O)},\\quad R = ${fmt(Math.sqrt(R2), 2)}` },
          { label: "Equation", tex: standard },
        ];
        if (f.step === 2) {
          const where = place();
          rows.push({
            label: `T is ${PLACE[where].text}`,
            tex: `(${fmt(T.x)} - ${par(O.x)})^2 + (${fmt(T.y)} - ${par(O.y)})^2 = ${fmt(leftSide(), 2)} ${PLACE[where].sign} ${fmt(R2, 2)}`,
            tone: where === "on" ? "good" : "plain",
          });
        }
        return rows;
      }
      if (f.step === 3) {
        return [
          { label: "Equation", tex: standard },
          { label: "Coefficient of x", tex: `A = -2p = -2(${fmt(O.x)}) = ${fmt(A)}` },
          { label: "Coefficient of y", tex: `B = -2q = -2(${fmt(O.y)}) = ${fmt(B)}` },
          {
            label: "Constant",
            tex: `C = ${par(O.x)}^2 + ${par(O.y)}^2 - ${fmt(R2, 2)} = ${fmt(c, 2)}`,
          },
          generalRow,
        ];
      }
      const recovered = (A * A) / 4 + (B * B) / 4 - c;
      return [
        generalRow,
        { label: "Add to both sides", tex: `\\tfrac{A^2}{4} = ${fmt((A * A) / 4, 2)},\\quad \\tfrac{B^2}{4} = ${fmt((B * B) / 4, 2)}` },
        {
          label: "Radius squared",
          tex: `${fmt((A * A) / 4, 2)} + ${fmt((B * B) / 4, 2)} - ${par(c, 2)} = ${fmt(recovered, 2)}`,
          tone: "good",
        },
        {
          label: "Centre",
          tex: `\\left(-\\tfrac{A}{2},\\,-\\tfrac{B}{2}\\right) = ${texPoint({ x: -A / 2, y: -B / 2 })}`,
          tone: "good",
        },
        { label: "Back where we started", tex: standard, tone: "good" },
      ];
    },
  };
});
