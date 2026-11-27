// Transforming a graph. From y = f(x), adding k to the output lifts the graph
// k; putting x − h in for x moves it h to the right; multiplying the output
// by a stretches it from the x-axis (and flips it when a < 0); putting bx in
// for x squeezes it towards the y-axis by b (and flips it when b < 0).
// Together, y = a·f(b(x − h)) + k sends each point (x, y) of the original to
// (x/b + h, ay + k).

import { C } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { axes } from "../kit/algebra.ts";
import { num } from "../kit/coordinates.ts";
import { at, curve, image, moved, GRAPH, shown, texMove, type Fn, type Move } from "../kit/functions.ts";
import { lesson, type Readout } from "../scene.ts";
import echoDelayGainImage from "../../images/echo-delay-gain.svg";
import jumpArcMovedImage from "../../images/jump-arc-moved.svg";

const BASE = C.dim;
const POINTS = [C.gold, C.pink] as const;

const SHAPES = ["x²", "√x", "|x|"] as const;
type Shape = (typeof SHAPES)[number];

const FNS: Record<Shape, Fn> = {
  "x²": (x) => x * x,
  "√x": (x) => (x >= 0 ? Math.sqrt(x) : NaN),
  "|x|": (x) => Math.abs(x),
};
const TEX: Record<Shape, string> = { "x²": "x^2", "√x": "\\sqrt{x}", "|x|": "|x|" };

/** Points of every base shape that are easy to follow: the corner and (1, 1). */
const MARKED: Vec[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export default lesson((s) => {
  const shape = s.choice("f(x) =", SHAPES, "x²");
  const fmtS = (v: number): string => num(v, 2);
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: -2, max: 2, value: 1, step: 0.25, format: fmtS });
  const b = s.slider({ label: "b =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: -2, max: 2, value: 1, step: 0.25, format: fmtS });
  const h = s.slider({ label: "h =", at: { x: 0, y: -4.3 }, width: 2.8, min: -4, max: 4, value: 0, step: 0.5, format: fmtS });
  const k = s.slider({ label: "k =", at: { x: 3.8, y: -4.3 }, width: 2.8, min: -3, max: 3, value: 0, step: 0.5, format: fmtS });
  const move = (): Move => ({ a: a.value, b: b.value, h: h.value, k: k.value });

  return {
    steps: [
      {
        title: "Up and down: f(x) + k",
        text: "Slide $k$. The graph of $y = f(x) + k$ has every output raised by $k$, so the whole graph moves up $k$, or down when $k < 0$. The point $(1, 1)$ of $y = x^2$ goes to $(1, 1 + k)$, and the corner $(0, 0)$ to $(0, k)$.",
      },
      {
        title: "Left and right: f(x − h)",
        text: "Slide $h$. The graph of $y = f(x - h)$ takes at $x$ the value $f$ had at $x - h$, so everything happens $h$ later: the graph moves $h$ to the right. The minus sign catches people out: $y = (x - 3)^2$ has its corner at $x = 3$, and $y = (x + 3)^2 = f(x - (-3))$ moves left.",
      },
      {
        title: "Taller and flipped: a·f(x)",
        text: "Slide $a$. Multiplying every output by $a$ stretches the graph away from the $x$-axis by $a$, or squashes it toward the axis when $0 < a < 1$; points on the axis stay put. A negative $a$ also flips the graph over the $x$-axis: $y = -f(x)$ is the mirror image of $y = f(x)$ in that axis.",
      },
      {
        title: "Squeezed sideways: f(bx)",
        text: "Slide $b$. The graph of $y = f(bx)$ reaches at $x$ what $f$ reached at $bx$, so every point moves to $\\frac{1}{b}$ of its distance from the $y$-axis: $b = 2$ squeezes it to half the width. A negative $b$ also flips it over the $y$-axis; $y = f(-x)$ is the mirror image, and an even function does not change.",
      },
      {
        title: "All four at once",
        text: "Together, $y = a f(b(x - h)) + k$ sends each point $(x, y)$ of $y = f(x)$ to $\\left(\\frac{x}{b} + h,\\ ay + k\\right)$: squeeze across then shift by $h$, stretch up then shift by $k$. So $y = 2(x - 1)^2 + 3$ is $y = x^2$ stretched by 2 with its corner moved to $(1, 3)$.",
      },
    ],

    draw(g) {
      axes(g, GRAPH, { xName: "x", yName: "y" });
      const fn = FNS[shape.value];
      const m = move();
      curve(g, fn, { color: BASE, width: 2.5, dash: [8, 6] });
      curve(g, moved(fn, m), { color: g.accent, width: 3.5 });
      MARKED.forEach((p, i) => {
        const color = POINTS[i];
        const q = image(p, m);
        g.circle(at(p.x, p.y), g.px(7), { color, width: 2 });
        if (!q || !shown(q.x, q.y)) return;
        if (Math.hypot(q.x - p.x, q.y - p.y) > 0.4) g.arrow(at(p.x, p.y), at(q.x, q.y), { color, width: 2, alpha: 0.8 });
        g.point(at(q.x, q.y), { color, r: 7 });
        g.label(at(q.x, q.y), `(${num(q.x, 2)}, ${num(q.y, 2)})`, { color, size: 14, bold: true, dx: 12, dy: i === 0 ? -16 : 16, align: "left" });
      });
    },

    readout() {
      const m = move();
      const base = TEX[shape.value];
      const rows: Readout[] = [
        { label: "Original", tex: `f(x) = ${base}` },
        { label: "Moved", tex: `y = ${texMove(m)}` },
      ];
      if (m.b === 0) {
        rows.push({ label: "b = 0", tex: `y = a f(0) + k = ${fmt(m.a * FNS[shape.value](0) + m.k, 2)} \\text{: flattened}`, tone: "warn" });
        return rows;
      }
      MARKED.forEach((p) => {
        const q = image(p, m)!;
        rows.push({ label: `(${fmt(p.x)}, ${fmt(p.y)}) goes to`, tex: `\\left(\\tfrac{${fmt(p.x)}}{${fmt(m.b, 2)}} + ${fmt(m.h, 2)},\\ ${fmt(m.a, 2)} \\cdot ${fmt(p.y)} + ${fmt(m.k, 2)}\\right) = (${fmt(q.x, 3)},\\ ${fmt(q.y, 3)})`.replace(/\+ -/g, "- "), tone: "good" });
      });
      return rows;
    },

    likes: [
      {
        title: "Moving a picture on a wall",
        text: "Moving a framed picture up, down or along the wall changes where it is, not what it shows. Adding $k$ to the output or putting $x - h$ in for the input moves a graph the same way, without bending it.",
      },
      {
        title: "Stretching a photo",
        text: "Dragging the corner handle of a photo on a screen stretches it taller or wider, and dragging past the edge flips it. Multiplying the output by $a$ and the input by $b$ do the same to a graph, one direction each.",
      },
    ],

    uses: [
      {
        title: "Echo: a delayed, quieter copy",
        text: "An echo effect adds to a sound $s(t)$ a copy that is later and quieter: $0.5\\,s(t - 0.3)$ is the same wave delayed 0.3 seconds and at half the height. Audio editors build delay, volume and reversal out of exactly these moves of the graph of pressure against time.",
        tags: ["music", "computing"],
        image: {
          src: echoDelayGainImage,
          caption: "An echo is a·s(t − h): the same sound wave moved h = 0.3 s later and scaled by a = 0.5.",
          alt: "A sound wave burst on a time axis and, 0.3 s to its right, a gold copy at half the height, labelled s(t) and 0.5 s(t − 0.3).",
        },
      },
      {
        title: "A jump arc in a game",
        text: "A game can store one jump shape, $y = -x^2$, and move it to wherever a character jumps: $y = k - a(x - h)^2$ peaks at $(h, k)$, and $a$ sets how sharply it falls away. A peak 4 units up, 3 units along with a fall of 0.5 gives $y = 4 - 0.5(x - 3)^2$, which lands back on the ground at $x = 3 \\pm \\sqrt{8}$.",
        tags: ["game-design", "computing"],
        image: {
          src: jumpArcMovedImage,
          caption: "One stored jump shape y = −x², stretched and moved, becomes y = 4 − 0.5(x − 3)² with its peak at (3, 4).",
          alt: "A small character jumping along a gold arc that peaks at the point (3, 4) above a ground line, with the plain shape y = −x² drawn faintly at the origin.",
        },
      },
    ],
  };
});
