// One point, two addresses. Cartesian coordinates say how far across and how
// far up; polar coordinates say how far from the origin and in which
// direction. Freezing one coordinate traces that system's simplest curves, and
// a right triangle translates between the two.

import { C, tint, type Draw } from "../draw.ts";
import { angleOf, fmt, len, polar, toDeg, wrapAngle, type Vec } from "../geo.ts";
import { num, pair, par, settle, snapping, X_COLOR, Y_COLOR } from "../kit/coordinates.ts";
import { lesson } from "../scene.ts";

const R_COLOR = C.gold;
const THETA_COLOR = C.green;
const O: Vec = { x: 0, y: 0 };

// Quadrants run counter-clockwise from the upper right.
const QUADRANTS = [
  { name: "I", sx: 1, sy: 1 },
  { name: "II", sx: -1, sy: 1 },
  { name: "III", sx: -1, sy: -1 },
  { name: "IV", sx: 1, sy: -1 },
];

function quadrantOf(p: Vec): string | null {
  const q = QUADRANTS.find((k) => p.x * k.sx > 0 && p.y * k.sy > 0);
  return q ? q.name : null;
}

/** Circles of whole-number r and rays every 30°: the polar "graph paper". */
function polarGrid(g: Draw): void {
  for (let r = 1; r <= 9; r++) g.circle(O, r, { color: C.faint, width: 1 });
  for (let k = 0; k < 12; k++) g.ray(O, polar(O, 1, (k * Math.PI) / 6), { color: C.faint, width: 1 });
}

export default lesson((s) => {
  const snap = s.toggle("Snap to grid", true);
  const guides = s.choice("Guides", ["Cartesian", "Polar"]);
  const P = s.point(4, 3, { label: "P", constrain: snapping(snap) });

  const theta = (): number => wrapAngle(angleOf(P));

  return {
    steps: [
      {
        title: "Two addresses for one point",
        text: "Drag $P$. Its Cartesian address $(x, y)$ says how far across and how far up. Switch Guides to Polar: the same point is $(r, \\theta)$ — how far from the origin, and at what angle from the positive $x$-axis.",
      },
      {
        title: "Four quadrants",
        text: "The axes cut the plane into four quadrants, numbered counter-clockwise from the upper right. The signs of $x$ and $y$ tell you which one $P$ is in; on an axis it is in none.",
      },
      {
        title: "Freeze one coordinate",
        text: "Hold one coordinate still and let the other run. Cartesian: $x = $ constant is a vertical line, $y = $ constant a horizontal one. Polar: $r = $ constant is a circle about the origin, $\\theta = $ constant a ray.",
      },
      {
        title: "Translating between them",
        text: "Both addresses live in one right triangle with hypotenuse $r$ and legs $x$ and $y$. So $x = r\\cos\\theta$, $y = r\\sin\\theta$, and by the Pythagorean theorem $r = \\sqrt{x^2 + y^2}$.",
      },
    ],

    draw(g, f) {
      settle(P);
      const cartesian = guides.value === "Cartesian";
      const foot = { x: P.x, y: 0 };
      const r = len(P);
      // At the last step both sets of guides are shown, whichever is chosen.
      const legs = cartesian ? 1 : f.at(3);
      const spoke = cartesian ? f.at(3) : 1;
      const frozen = f.at(2);

      if (cartesian) g.grid(1);
      else polarGrid(g);
      g.axes();

      if (f.at(1) > 0) {
        for (const q of QUADRANTS) {
          const here = q.name === quadrantOf(P);
          if (here) {
            const corner = { x: q.sx * 8, y: q.sy * 5 };
            g.polygon([O, { x: corner.x, y: 0 }, corner, { x: 0, y: corner.y }], {
              fill: tint(g.accent, 0.1),
              stroke: null,
              alpha: f.at(1),
            });
          }
          g.label({ x: q.sx * 7.3, y: q.sy * 4.5 }, q.name, {
            color: here ? g.accent : C.dim,
            size: 20,
            bold: true,
            alpha: f.at(1),
          });
        }
      }

      if (frozen > 0) {
        if (cartesian) {
          g.line(P, { x: P.x, y: P.y + 1 }, { color: X_COLOR, width: 2, dash: [8, 6], alpha: frozen });
          g.line(P, { x: P.x + 1, y: P.y }, { color: Y_COLOR, width: 2, dash: [8, 6], alpha: frozen });
          g.label({ x: P.x, y: P.y < 0 ? 4.5 : -4.5 }, `x = ${num(P.x)}`, { color: X_COLOR, dx: 30, alpha: frozen });
          g.label({ x: P.x < 0 ? 7 : -7, y: P.y }, `y = ${num(P.y)}`, { color: Y_COLOR, dy: 14, alpha: frozen });
        } else {
          g.circle(O, r, { color: R_COLOR, width: 2, dash: [8, 6], alpha: frozen });
          if (r > 0) g.ray(O, P, { color: THETA_COLOR, width: 2, dash: [8, 6], alpha: frozen });
        }
      }

      if (legs > 0) {
        const trig = f.step >= 3;
        g.segment(O, foot, { color: X_COLOR, width: 4, alpha: legs });
        g.segment(foot, P, { color: Y_COLOR, width: 4, alpha: legs });
        // Captions go on the far side of each leg from the triangle.
        g.label({ x: P.x / 2, y: 0 }, trig ? `r·cos θ = ${num(P.x)}` : `x = ${num(P.x)}`, {
          color: X_COLOR,
          size: 14,
          dy: P.y >= 0 ? -30 : 30,
          alpha: legs,
        });
        g.label({ x: P.x, y: P.y / 2 }, trig ? `r·sin θ = ${num(P.y)}` : `y = ${num(P.y)}`, {
          color: Y_COLOR,
          size: 14,
          dx: P.x >= 0 ? 12 : -12,
          align: P.x >= 0 ? "left" : "right",
          alpha: legs,
        });
      }

      if (spoke > 0) {
        g.segment(O, P, { color: R_COLOR, width: 4, alpha: spoke });
        if (r > 0.5) {
          g.along(O, P, `r = ${num(r, 2)}`, { color: R_COLOR, offset: P.x >= 0 ? 16 : -16, alpha: spoke });
          g.angleMark(O, 0, theta(), {
            color: THETA_COLOR,
            r: 30,
            fill: true,
            square: false,
            label: `θ = ${num(toDeg(theta()))}°`,
            alpha: spoke,
          });
        }
      }

      const address = cartesian ? pair(P) : `(${num(r, 2)}, ${num(toDeg(theta()))}°)`;
      g.label(P, address, {
        dx: P.x > 4 ? -20 : 20,
        dy: -20,
        align: P.x > 4 ? "right" : "left",
        color: g.accent,
      });
    },

    readout() {
      const r = len(P);
      const angle = theta();
      const degrees = `${fmt(toDeg(angle))}^\\circ`;
      const quadrant = quadrantOf(P);
      return [
        { label: "Cartesian", tex: `(x,\\,y) = (${fmt(P.x)},\\,${fmt(P.y)})` },
        { label: "Polar", tex: `(r,\\,\\theta) = (${fmt(r, 2)},\\,${degrees})` },
        {
          label: "Distance from the origin",
          tex: `r = \\sqrt{${par(P.x)}^2 + ${par(P.y)}^2} = ${fmt(r, 2)}`,
        },
        {
          label: "Back to x",
          tex: `r\\cos\\theta = ${fmt(r, 2)}\\cos ${degrees} = ${fmt(r * Math.cos(angle))}`,
          tone: "good",
        },
        {
          label: "Back to y",
          tex: `r\\sin\\theta = ${fmt(r, 2)}\\sin ${degrees} = ${fmt(r * Math.sin(angle))}`,
          tone: "good",
        },
        {
          label: "Quadrant",
          tex: quadrant ? `\\text{${quadrant}}` : "\\text{none — on an axis}",
          tone: quadrant ? "plain" : "dim",
        },
      ];
    },
  };
});
