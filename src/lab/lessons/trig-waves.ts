// A radius turning counter-clockwise round a unit circle, with the right
// triangle it makes, and the sine, cosine and tangent waves unrolled beside
// it. The circle's radius is the length called 1, and the graph spends that
// same length on each radian, so a quarter of the rim unrolls to exactly the
// quarter-turn mark: the triangle's height carries straight across to the
// sine wave, its width swings up to carry across to the cosine wave, and the
// radius, run on until it meets the wall tangent at (1, 0), carries across
// to the tangent wave.
//
// The angle and the waves come from the pure kit/unit-circle.ts; this file
// only places them on the stage and holds the clock.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, onCircle, polar, TAU, toDeg, toRad, vec, type Vec } from "../geo.ts";
import {
  angleFrom,
  asymptotes,
  quadrantOf,
  ratiosOf,
  signOf,
  tanBranches,
  turned,
  wave,
} from "../kit/unit-circle.ts";
import { lesson, term, type Readout } from "../scene.ts";

const CENTER = vec(-5.6, 0);
const R = 1.6; // stage units in the length called 1
const WALL = CENTER.x + R; // the tangent line x = 1
const X0 = -2.4; // where θ = 0 sits on the graph
const TAN_LIMIT = 2.75; // |tan θ| drawn, so the tangent stays on the stage
const SPEED = TAU / 14; // radians a second: one turn in 14 s

const SIN = C.gold;
const COS = C.blue;
const TAN = C.violet;
const ANGLE = C.pink;

/** Where θ and a value land on the graph. */
const onGraph = (theta: number, value: number): Vec => vec(X0 + theta * R, value * R);
const graphOf = (pts: readonly Vec[]): Vec[] => pts.map((p) => onGraph(p.x, p.y));
const deg = (theta: number): string => `${fmt(toDeg(theta), 0)}^\\circ`;

export default lesson((s) => {
  const turning = s.toggle("Turning", true);
  let theta = toRad(35);
  let lastTime: number | null = null;
  s.button("Back to 0°", () => {
    theta = 0;
  });

  const start = polar(CENTER, R, theta);
  const P = s.point(start.x, start.y, { color: C.ink, constrain: onCircle(CENTER, R) });

  /** Move the angle on by the time since the last frame, or follow the learner's drag. */
  const tick = (time: number): void => {
    const dt = lastTime === null ? 0 : time - lastTime;
    lastTime = time;
    if (P.grabbed) theta = angleFrom(CENTER, P);
    else if (turning.on) theta = turned(theta, dt, SPEED);
    P.set(polar(CENTER, R, theta));
  };

  return {
    steps: [
      {
        title: "SOH CAH TOA on a circle",
        text: "A radius of length $1$ turns round the circle, and dropping straight down from its tip makes a right triangle with hypotenuse $1$. SOH: $\\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}} = \\frac{\\text{opposite}}{1}$, so the triangle's height is $\\sin\\theta$. CAH: $\\cos\\theta = \\frac{\\text{adjacent}}{1}$, so its width is $\\cos\\theta$. The tip of the radius is the point $(\\cos\\theta, \\sin\\theta)$.",
      },
      {
        title: "Unroll the height: sine",
        text: "Carry the height straight across to the graph, and lay out the angle along the bottom, $1$ radius per radian. As $\\theta$ turns, the height traces the sine wave: up to $1$ at $90^\\circ$, back to $0$ at $180^\\circ$, down to $-1$ at $270^\\circ$, and home at $360^\\circ$.",
      },
      {
        title: "Swing up the width: cosine",
        text: "The width lies flat, so swing it up a quarter turn to stand it on end, then carry it across too. It traces the cosine wave, which starts at $1$ instead of $0$. It is the sine wave started a quarter turn early: $\\cos\\theta = \\sin(\\theta + 90^\\circ)$.",
      },
      {
        title: "Past a right angle",
        text: "A triangle can't have an angle over $90^\\circ$, but the circle can. Keep reading the width and height as coordinates of the tip, with signs: left of the centre the width is negative, below it the height is. So $\\cos 120^\\circ = -\\frac12$ and $\\sin 120^\\circ = \\frac{\\sqrt3}{2}$, and each quarter of the turn has its own pair of signs.",
      },
      {
        title: "The tangent wall",
        text: "Stand a wall where the circle touches $x = 1$; it is tangent to the circle, which is where the name comes from. Run the radius on until it hits the wall. That makes a bigger triangle with the same angle and an adjacent side of exactly $1$, so its height is TOA: $\\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{\\sin\\theta}{\\cos\\theta} = \\tan\\theta$.",
      },
      {
        title: "Three waves, one turn",
        text: "Watch all three at once. Where $\\sin\\theta = 0$, so is $\\tan\\theta$. Where $\\cos\\theta = 0$, at $90^\\circ$ and $270^\\circ$, the radius runs parallel to the wall and never meets it: $\\tan\\theta$ shoots off and is undefined. Sine and cosine repeat every $360^\\circ$; tangent repeats every $180^\\circ$, because pointing the radius the opposite way meets the wall at the same height.",
      },
    ],

    likes: [
      {
        title: "A seat on a Ferris wheel",
        text: "Ride a Ferris wheel and plot your height against time: up, over the top, down, along the bottom, and up again. That smooth up-and-down is a sine wave, because your height is the radius times $\\sin\\theta$. A friend tracking how far left or right of the hub you are would draw the cosine wave.",
      },
      {
        title: "A shadow on the wall",
        text: "Shine a torch sideways at a ball fixed to the rim of a turning wheel. Its shadow on the wall only goes up and down, never round, and it slows at the top and bottom and rushes through the middle. That shadow is the triangle's height carried across to the graph.",
      },
    ],

    uses: [
      {
        title: "Mains electricity",
        text: "A power-station generator turns a coil of wire in a magnetic field. The voltage it makes follows how much of the coil faces the field, which goes as $\\sin\\theta$, so the electricity at a socket is a sine wave. In Europe the coil turns $50$ times a second, so the wave repeats $50$ times a second.",
      },
      {
        title: "Moving round a circle in a game",
        text: "To send a planet round a sun at distance $r$, a game places it at $x = r\\cos\\theta$, $y = r\\sin\\theta$ and makes $\\theta$ a little bigger each frame. It is exactly the radius turning in this lesson, and the planet's two coordinates are the two waves.",
      },
      {
        title: "How steep is a slope",
        text: "A road sign giving a hill as $10\\%$ means it rises $10$ m for every $100$ m across: its slope is $\\tan\\theta = 0.1$, so it climbs at about $5.7^\\circ$. Slope is just tangent: the rise for each $1$ of run, like the height on the tangent wall.",
      },
    ],

    draw(g, f) {
      tick(f.time);
      const { sin, cos, tan } = ratiosOf(theta);
      const tip = polar(CENTER, R, theta);
      const foot = vec(tip.x, CENTER.y);
      const showSin = f.at(1);
      const showCos = f.at(2);
      const showSigns = f.at(3) * (1 - f.at(4));
      const showTan = f.at(4);

      drawGraphFrame(g, showTan);
      drawCircleFrame(g);
      if (showSigns > 0) drawSigns(g, theta, showSigns);

      // The triangle the radius makes.
      g.polygon([CENTER, foot, tip], { fill: tint(C.ink, 0.06), stroke: null });
      if (Math.abs(sin) > 0.12 && Math.abs(cos) > 0.12) {
        g.angle(CENTER, foot, tip, { color: C.dim, r: 12, width: 1.5 });
      }
      g.angleMark(CENTER, 0, theta, { color: ANGLE, r: 22, label: "θ", square: false, fill: true });
      g.segment(CENTER, foot, { color: COS, width: 4, term: "adj" });
      g.segment(foot, tip, { color: SIN, width: 4, term: "opp" });
      g.segment(CENTER, tip, { color: C.ink, width: 3, term: "hyp" });
      g.along(CENTER, tip, "1", { offset: sin * cos >= 0 ? 14 : -14, size: 15 });
      if (Math.abs(sin) > 0.15) {
        g.label(vec(tip.x, tip.y / 2), "sin θ", { color: SIN, size: 14, align: cos >= 0 ? "left" : "right", dx: cos >= 0 ? 9 : -9 });
      }
      if (Math.abs(cos) > 0.15) {
        g.label(vec((CENTER.x + foot.x) / 2, CENTER.y), "cos θ", { color: COS, size: 14, dy: sin >= 0 ? -14 : 14 });
      }
      if (f.step === 0 || f.step === 3) {
        g.label(tip, "(cos θ, sin θ)", {
          size: 14,
          bold: true,
          align: cos >= 0 ? "left" : "right",
          dx: cos >= 0 ? 12 : -12,
          dy: sin >= 0 ? 12 : -12,
        });
      }

      if (showSin > 0) {
        const a = showSin;
        const head = onGraph(theta, sin);
        g.path(graphOf(wave(Math.sin, 0, TAU)), { color: SIN, width: 2, alpha: a * 0.2 });
        g.path(graphOf(wave(Math.sin, 0, theta)), { color: SIN, width: 3, alpha: a });
        g.segment(tip, head, { color: SIN, width: 1.5, dash: [5, 5], alpha: a * 0.8 });
        g.segment(vec(head.x - g.px(3), 0), vec(head.x - g.px(3), head.y), { color: SIN, width: 3, alpha: a });
        g.point(head, { color: SIN, r: 4, alpha: a });
        g.label(vec(4.2, 4.5), "sin θ", { color: SIN, bold: true, alpha: a });
      }

      if (showCos > 0) {
        const a = showCos;
        const head = onGraph(theta, cos);
        const standing = vec(CENTER.x, cos * R); // the width, swung up to stand on end
        if (Math.abs(cos) > 0.02) {
          const [from, to] = cos >= 0 ? [0, Math.PI / 2] : [Math.PI / 2, Math.PI];
          g.arc(CENTER, Math.abs(cos) * R, from, to, { color: COS, width: 1.5, dash: [3, 4], alpha: a * 0.8 });
        }
        g.segment(CENTER, standing, { color: COS, width: 2, alpha: a * 0.7 });
        g.segment(standing, head, { color: COS, width: 1.5, dash: [5, 5], alpha: a * 0.6 });
        g.path(graphOf(wave(Math.cos, 0, TAU)), { color: COS, width: 2, alpha: a * 0.2 });
        g.path(graphOf(wave(Math.cos, 0, theta)), { color: COS, width: 3, alpha: a });
        g.segment(vec(head.x + g.px(3), 0), vec(head.x + g.px(3), head.y), { color: COS, width: 3, alpha: a });
        g.point(head, { color: COS, r: 4, alpha: a });
        g.label(vec(5.6, 4.5), "cos θ", { color: COS, bold: true, alpha: a });
      }

      if (showTan > 0) {
        const a = showTan;
        g.segment(vec(WALL, -4.6), vec(WALL, 4.6), { color: TAN, width: 1.5, alpha: a * 0.45 });
        for (const branch of tanBranches(0, TAU, TAN_LIMIT)) {
          g.path(graphOf(branch), { color: TAN, width: 2, alpha: a * 0.2 });
        }
        for (const branch of tanBranches(0, theta, TAN_LIMIT)) {
          g.path(graphOf(branch), { color: TAN, width: 3, alpha: a });
        }
        if (tan !== null && Math.abs(tan) <= TAN_LIMIT) {
          const hit = vec(WALL, tan * R);
          const head = onGraph(theta, tan);
          g.segment(CENTER, hit, { color: TAN, width: 1.5, dash: [6, 4], alpha: a * 0.8 });
          g.segment(vec(WALL, 0), hit, { color: TAN, width: 4, alpha: a, term: "tan" });
          g.segment(hit, head, { color: TAN, width: 1.5, dash: [5, 5], alpha: a * 0.6 });
          g.point(hit, { color: TAN, r: 4, alpha: a });
          g.point(head, { color: TAN, r: 4, alpha: a });
          g.label(hit, "tan θ", { color: TAN, size: 14, align: "left", dx: 9, dy: tan >= 0 ? 10 : -10, alpha: a });
        }
        g.label(vec(7.0, 4.5), "tan θ", { color: TAN, bold: true, alpha: a });
      }
    },

    readout(f) {
      const { sin, cos, tan } = ratiosOf(theta);
      const rows: Readout[] = [
        { label: "The angle turned", tex: `\\theta = ${deg(theta)} = ${fmt(theta, 2)}\\ \\text{rad}` },
        {
          label: "SOH",
          tex: `\\sin\\theta = \\frac{\\text{opp}}{\\text{hyp}} = \\frac{${term("opp", fmt(sin, 2))}}{${term("hyp", "1")}} = ${fmt(sin, 2)}`,
        },
        {
          label: "CAH",
          tex: `\\cos\\theta = \\frac{\\text{adj}}{\\text{hyp}} = \\frac{${term("adj", fmt(cos, 2))}}{${term("hyp", "1")}} = ${fmt(cos, 2)}`,
        },
      ];
      if (f.step >= 4) {
        const toa = `\\tan\\theta = \\frac{\\text{opp}}{\\text{adj}} = \\frac{${fmt(sin, 2)}}{${fmt(cos, 2)}}`;
        if (tan === null) {
          rows.push({ label: "TOA", tex: `${toa}\\ \\text{is undefined}`, tone: "warn" });
        } else {
          const height = Math.abs(tan) <= TAN_LIMIT ? term("tan", fmt(tan, 2)) : fmt(tan, 2);
          rows.push({ label: "TOA", tex: `${toa} = ${height}` });
        }
      }
      if (f.step === 3) {
        rows.push({
          label: `Quadrant ${quadrantOf(theta)}`,
          tex: `(\\cos\\theta, \\sin\\theta) = (${fmt(cos, 2)}, ${fmt(sin, 2)})`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});

/** The graph's axes, the ±1 guides and the quarter-turn marks; taller once tangent needs the room. */
function drawGraphFrame(g: Draw, showTan: number): void {
  const end = X0 + TAU * R;
  const reach = R + 0.5 + showTan * (TAN_LIMIT * R + 0.2 - R - 0.5);
  g.segment(vec(X0, 0), vec(end + 0.3, 0), { color: C.dim, width: 2 });
  g.segment(vec(X0, -reach), vec(X0, reach), { color: C.dim, width: 2 });
  for (const v of [1, -1]) {
    g.segment(vec(X0, v * R), vec(end, v * R), { color: C.faint, width: 1, dash: [3, 6] });
    g.label(vec(X0, v * R), v > 0 ? "1" : "−1", { color: C.dim, size: 12, dx: -14 });
  }
  for (let q = 1; q <= 4; q++) {
    const x = X0 + (q * Math.PI * R) / 2;
    g.segment(vec(x, -g.px(5)), vec(x, g.px(5)), { color: C.dim, width: 2 });
    g.label(vec(x, 0), `${q * 90}°`, { color: C.dim, size: 12, dx: 14, dy: -12 });
  }
  if (showTan > 0) {
    for (const t of asymptotes(0, TAU)) {
      const x = X0 + t * R;
      g.segment(vec(x, -reach), vec(x, reach), { color: TAN, width: 1, dash: [4, 6], alpha: showTan * 0.5 });
    }
  }
}

/** Axes through the centre and the unit circle itself. */
function drawCircleFrame(g: Draw): void {
  const reach = R + 0.45;
  g.segment(vec(CENTER.x - reach, 0), vec(CENTER.x + reach, 0), { color: C.faint, width: 1.5 });
  g.segment(vec(CENTER.x, -reach), vec(CENTER.x, reach), { color: C.faint, width: 1.5 });
  g.circle(CENTER, R, { color: C.dim, width: 2 });
  g.point(CENTER, { r: 3, color: C.dim });
}

/** The signs of (cos θ, sin θ) in each quarter of the turn, the current one lit. */
function drawSigns(g: Draw, theta: number, alpha: number): void {
  const now = quadrantOf(theta);
  for (let q = 1; q <= 4; q++) {
    const mid = (q - 0.5) * (Math.PI / 2);
    const at = polar(CENTER, R * 1.28, mid);
    const lit = q === now;
    g.label(at, `(${signOf(Math.cos(mid))}, ${signOf(Math.sin(mid))})`, {
      color: lit ? C.ink : C.dim,
      size: lit ? 15 : 13,
      bold: lit,
      alpha,
    });
  }
}
