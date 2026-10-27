// Completing the square, as an area. x² + bx is a square of side x with a
// strip b wide beside it. Cut the strip in half lengthwise and turn one half
// to lie along the top: the shape is now a square of side x + b/2 with one
// corner missing, a small square of side b/2. Adding that corner to both
// sides of an equation turns x² + bx = k into (x + b/2)² = k + (b/2)², which a
// square root undoes.

import { C, tint } from "../draw.ts";
import { clamp, fmt, lerp, rotateAbout, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const SQUARE = C.cyan;
const STRIP = C.orange;
const CORNER = C.gold;
/** The figure's lower-left corner. */
const O: Vec = { x: -7, y: -3.2 };
const X_MIN = 1;
const X_MAX = 5;

export default lesson((s) => {
  const b = s.slider({ label: "b =", at: { x: 2.6, y: -4.3 }, width: 4, min: 1, max: 4, value: 3, step: 0.5, format: (v) => fmt(v) });
  // The square's far corner, on its diagonal, sets x.
  const X = s.point(O.x + 3, O.y + 3, {
    label: "x",
    color: SQUARE,
    constrain: (p) => {
      const t = clamp((p.x - O.x + (p.y - O.y)) / 2, X_MIN, X_MAX);
      const x = Math.round(t * 4) / 4;
      return { x: O.x + x, y: O.y + x };
    },
  });

  const x = (): number => X.x - O.x;
  const at = (u: number, v: number): Vec => ({ x: O.x + u, y: O.y + v });
  const rect = (u0: number, v0: number, u1: number, v1: number): Vec[] => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];

  return {
    steps: [
      {
        title: "x² + bx as an area",
        text: "Drag the corner to change $x$ and the slider to change $b$. The square has area $x^2$ and the strip beside it, $b$ wide and $x$ tall, has area $bx$. Together they show $x^2 + bx$.",
      },
      {
        title: "Split the strip",
        text: "Cut the strip into two halves, each $\\frac{b}{2}$ wide, and turn one half to lie along the top of the square. Nothing is added or lost: the area is still $x^2 + bx$.",
      },
      {
        title: "A corner is missing",
        text: "The shape is now almost a square of side $x + \\frac{b}{2}$. Only the corner is missing: a small square of side $\\frac{b}{2}$, area $\\left(\\frac{b}{2}\\right)^2$.",
      },
      {
        title: "Complete the square",
        text: "Add the corner, and $x^2 + bx + \\left(\\frac{b}{2}\\right)^2 = \\left(x + \\frac{b}{2}\\right)^2$. To complete the square, halve the $x$ coefficient and square it.",
      },
      {
        title: "Solve with a square root",
        text: "To solve $x^2 + bx = k$, add the corner to both sides: $\\left(x + \\frac{b}{2}\\right)^2 = k + \\left(\\frac{b}{2}\\right)^2$. A square root leaves a linear equation, $x = -\\frac{b}{2} \\pm \\sqrt{k + \\left(\\frac{b}{2}\\right)^2}$. (With $ax^2$, divide by $a$ first.)",
      },
    ],

    draw(g, f) {
      const s0 = x();
      const h = b.value / 2;
      const turn = f.at(1);

      // The square, the half strip that stays, and the half that turns.
      g.polygon(rect(0, 0, s0, s0), { color: SQUARE, fill: tint(SQUARE, 0.22), width: 2 });
      g.polygon(rect(s0, 0, s0 + (turn > 0 ? h : 2 * h), s0), {
        color: STRIP,
        fill: tint(STRIP, 0.22),
        width: 2,
      });
      if (turn > 0) {
        // Rotating a quarter turn about this centre carries the outer half
        // strip exactly onto the top of the square.
        const centre = at((s0 + h) / 2, (s0 - h) / 2);
        const moving = rect(s0 + h, 0, s0 + 2 * h, s0).map((p) => rotateAbout(p, centre, (Math.PI / 2) * turn));
        g.polygon(moving, { color: STRIP, fill: tint(STRIP, 0.22), width: 2 });
      }

      const corner = rect(s0, s0, s0 + h, s0 + h);
      if (f.at(2) > 0) {
        g.polygon(corner, {
          color: CORNER,
          fill: tint(CORNER, 0.3 * f.at(3)),
          width: 2,
          dash: f.step >= 3 ? undefined : [6, 5],
          alpha: f.at(2),
        });
        g.label(lerp(corner[0], corner[2], 0.5), "(b/2)²", { color: CORNER, size: 13, alpha: f.at(2) });
      }

      // Areas inside, lengths outside.
      g.label(at(s0 / 2, s0 / 2), "x²", { color: SQUARE, size: 18, bold: true });
      if (turn < 1) {
        g.label(at(s0 + h, s0 / 2), "bx", { color: STRIP, size: 16, bold: true, alpha: 1 - turn });
      } else {
        g.label(at(s0 + h / 2, s0 / 2), "(b/2)x", { color: STRIP, size: 13 });
        g.label(at(s0 / 2, s0 + h / 2), "(b/2)x", { color: STRIP, size: 13 });
      }
      g.along(at(0, 0), at(s0, 0), "x", { color: SQUARE, offset: -16 });
      g.along(at(s0, 0), at(s0 + (turn > 0 ? h : 2 * h), 0), turn > 0 ? "b/2" : "b", { color: STRIP, offset: -16 });
      if (f.at(3) > 0) {
        const side = s0 + h;
        g.along(at(side, 0), at(side, side), `x + b/2 = ${fmt(side, 2)}`, { color: CORNER, offset: -20, alpha: f.at(3) });
      }
    },

    readout(f) {
      const s0 = x();
      const h = b.value / 2;
      const area = s0 * s0 + b.value * s0;
      const rows: Readout[] = [
        { label: "Area", tex: `x^2 + bx = ${fmt(s0, 2)}^2 + ${fmt(b.value)} \\cdot ${fmt(s0, 2)} = ${fmt(area, 3)}` },
      ];
      if (f.step >= 2) rows.push({ label: "Missing corner", tex: `\\left(\\frac{b}{2}\\right)^2 = ${fmt(h, 2)}^2 = ${fmt(h * h, 4)}` });
      if (f.step >= 3) {
        rows.push({
          label: "Completed",
          tex: `${fmt(area, 3)} + ${fmt(h * h, 4)} = ${fmt(area + h * h, 4)} = (${fmt(s0, 2)} + ${fmt(h, 2)})^2`,
          tone: "good",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: `Recover x from k = ${fmt(area, 3)}`,
          tex: `x = -${fmt(h, 2)} + \\sqrt{${fmt(area, 3)} + ${fmt(h * h, 4)}} = ${fmt(-h + Math.sqrt(area + h * h), 3)}`,
          tone: "good",
        });
        rows.push({
          label: "The other root",
          tex: `x = -${fmt(h, 2)} - \\sqrt{${fmt(area + h * h, 4)}} = ${fmt(-h - Math.sqrt(area + h * h), 3)}`,
          tone: "dim",
        });
      }
      return rows;
    },

    uses: [
      {
        title: "The biggest bed for your edging",
        text: "With 20 m of edging, a rectangular bed $x$ m long is $10 - x$ wide, so its area is $10x - x^2 = 25 - (x - 5)^2$. That is 25 minus something never negative, so the area is largest, 25 m², when $x = 5$: a square.",
      },
      {
        title: "The top of a throw",
        text: "A ball tossed upward has height $h = -16t^2 + 32t + 5$ feet. Completing the square gives $h = 21 - 16(t - 1)^2$, so it peaks after 1 second, 21 feet up, without drawing a graph.",
      },
    ],
  };
});
