// Why quadratic equations come up. A rock thrown down from a tower would, at
// a steady speed, lose height along a straight line, and the moment it lands
// would solve a linear equation. Gravity adds a term in t², which bends the
// line into a curve, and the landing time then solves an equation of degree
// two — one that the moves of the linear chapter cannot untangle.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { axes, onStage, plot, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";

const ROCK = C.orange;
const STEADY = C.cyan;
/** Half-seconds across and 20 feet up per stage unit, from the tower's foot. */
const GRAPH: Graph = { origin: { x: -4, y: -3.5 }, unit: { x: 0.5, y: 20 } };
const LAST_SECOND = 5.6;
const TOWER_X = -6;
/** Gravity's pull, in feet per second squared, halved: h loses 16t² feet. */
const G_HALF = 16;

export default lesson((s) => {
  const tower = s.slider({ label: "H =", format: (v) => `${v} ft`, at: { x: -7.6, y: -4.3 }, width: 3.4, min: 40, max: 150, value: 100, step: 10 });
  const speed = s.slider({ label: "v =", format: (v) => `${v} ft/s`, at: { x: -2.4, y: -4.3 }, width: 3.4, min: 0, max: 30, value: 5, step: 5 });
  const clock = s.point(GRAPH.origin.x + 2, GRAPH.origin.y, {
    label: "t",
    color: C.ink,
    constrain: (p) => ({ x: clamp(p.x, GRAPH.origin.x, GRAPH.origin.x + LAST_SECOND / GRAPH.unit.x), y: GRAPH.origin.y }),
  });

  const steady = (t: number): number => tower.value - speed.value * t;
  const real = (t: number): number => tower.value - speed.value * t - G_HALF * t * t;
  /** The positive root of 16t² + vt − H = 0. */
  const landing = (): number => {
    const [v, H] = [speed.value, tower.value];
    return (-v + Math.sqrt(v * v + 4 * G_HALF * H)) / (2 * G_HALF);
  };

  return {
    steps: [
      {
        title: "At a steady speed, a line",
        text: "Throw a rock down from a tower $H$ feet high at $v$ feet a second. If it kept that speed, its height after $t$ seconds would be $h = H - vt$: a straight line, landing when $H - vt = 0$, at $t = \\frac{H}{v}$.",
      },
      {
        title: "Gravity bends it",
        text: "But gravity speeds the rock up, and its height is really $h = H - vt - 16t^2$. Drag $t$: the rock falls further each second than the second before, and the graph curves down ever more steeply.",
      },
      {
        title: "When does it land?",
        text: "It lands when $16t^2 + vt - H = 0$. That has degree two, and the old moves fail: solving for $t$ gives $t = \\frac{H - 16t^2}{v}$, with $t$ still on the right. The rest of this chapter is about solving such equations.",
      },
    ],

    draw(g, f) {
      const now = (clock.x - GRAPH.origin.x) * GRAPH.unit.x;
      const ground = onStage(GRAPH, { x: 0, y: 0 });
      const top = onStage(GRAPH, { x: 0, y: tower.value });

      axes(g, GRAPH, { positive: true, xName: "seconds", yName: "height, ft" });
      // The tower, to the graph's height scale, with the rock beside it.
      g.polygon(
        [
          { x: TOWER_X - 0.6, y: ground.y },
          { x: TOWER_X + 0.6, y: ground.y },
          { x: TOWER_X + 0.6, y: top.y },
          { x: TOWER_X - 0.6, y: top.y },
        ],
        { color: C.dim, fill: "rgba(255, 255, 255, 0.08)", width: 2 },
      );
      g.segment({ x: TOWER_X - 1.6, y: ground.y }, { x: GRAPH.origin.x, y: ground.y }, { color: C.dim, width: 2 });

      const height = f.step === 0 ? steady(now) : real(now);
      const rockY = onStage(GRAPH, { x: 0, y: Math.max(0, height) }).y;
      g.point({ x: TOWER_X + 1.1, y: rockY }, { color: ROCK, r: 9 });
      g.segment({ x: TOWER_X + 1.1, y: rockY }, onStage(GRAPH, { x: now, y: Math.max(0, height) }), {
        color: C.faint,
        width: 1.5,
        dash: [3, 5],
      });

      const steadyAlpha = f.step === 0 ? 1 : 0.45;
      plot(g, GRAPH, steady, { color: STEADY, dash: [8, 6], alpha: steadyAlpha, from: 0, to: tower.value / Math.max(speed.value, 1e-9) });
      if (f.at(1) > 0) plot(g, GRAPH, real, { color: ROCK, alpha: f.at(1), from: 0, to: landing() });
      g.point(onStage(GRAPH, { x: now, y: Math.max(0, height) }), { color: f.step === 0 ? STEADY : ROCK, r: 6 });

      if (f.at(2) > 0) {
        const t = landing();
        const at = onStage(GRAPH, { x: t, y: 0 });
        g.point(at, { color: C.gold, r: 8, alpha: f.at(2) });
        g.label(at, `lands at ${fmt(t, 2)} s`, { color: C.gold, size: 15, bold: true, dy: 22, alpha: f.at(2) });
      }
    },

    readout(f) {
      const [H, v] = [tower.value, speed.value];
      const now = (clock.x - GRAPH.origin.x) * GRAPH.unit.x;
      const rows: Readout[] = [
        {
          label: "Steady speed",
          tex: v === 0 ? `h = ${H}:\\ \\text{never lands}` : `h = ${H} - ${v}t,\\quad \\text{lands at } t = \\frac{${H}}{${v}} = ${fmt(H / v, 2)}`,
          tone: f.step === 0 ? "plain" : "dim",
        },
      ];
      if (f.step >= 1) {
        rows.push({ label: "With gravity", tex: `h = ${H} - ${v}t - 16t^2` });
        rows.push({
          label: `At t = ${fmt(now, 2)} s`,
          tex: `h = ${H} - ${v}(${fmt(now, 2)}) - 16(${fmt(now, 2)})^2 = ${fmt(real(now), 1)}`,
          tone: real(now) < 0 ? "dim" : "plain",
        });
      }
      if (f.step >= 2) {
        rows.push({ label: "Lands when", tex: `16t^2 + ${v}t - ${H} = 0` });
        rows.push({ label: "Solved later in the chapter", tex: `t = ${fmt(landing(), 2)}\\ \\text{s}`, tone: "good" });
      }
      return rows;
    },

    uses: [
      {
        title: "How deep is the well?",
        text: "Drop a pebble down a well and count 2 seconds to the splash. Ignoring the moment the sound takes to come back up, it fell $16t^2 = 16 \\cdot 2^2 = 64$ feet. For a well you know is 100 feet deep, you solve $16t^2 = 100$ instead: the splash comes after 2.5 seconds.",
      },
      {
        title: "Anything thrown or dropped",
        text: "A ball's height, a fountain's jet and a diver's path all carry the same $-16t^2$ (in feet) or $-4.9t^2$ (in metres). Asking when they reach a given height is always a quadratic equation.",
      },
      {
        title: "Stopping distance",
        text: "A car braking from speed $v$ travels $vt - \\tfrac12 a t^2$ in $t$ seconds, so the time to cover a given distance, or to stop short of something, comes from a quadratic.",
      },
    ],
  };
});
