// Motion word problems: rate × time = distance. On a graph of distance against
// time a steady trip is a straight line whose slope is its speed. A second,
// faster car that leaves later starts its line further right and climbs more
// steeply, and it catches the first where the lines cross — which is where
// the two distance equations are equal.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { axes, onStage, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";

const FIRST = C.cyan;
const SECOND = C.orange;
const MEET = C.gold;
/** Hours across, 80 miles up per stage unit, starting at the lower left. */
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 80 } };
const LAST_HOUR = 14.4;
/** The road along the top, drawn to its own scale: miles per stage unit. */
const ROAD_Y = 4.4;
const ROAD_SCALE = 50;

const hours = (t: number): string => `${fmt(t, 2)} h`;
const miles = (d: number): string => `${fmt(d, 1)} mi`;

export default lesson((s) => {
  const v1 = s.slider({ label: "r₁ =", format: (v) => `${v} mph`, at: { x: -7.6, y: -4.3 }, width: 3.4, min: 20, max: 70, value: 40, step: 5 });
  const v2 = s.slider({ label: "r₂ =", format: (v) => `${v} mph`, at: { x: -2.4, y: -4.3 }, width: 3.4, min: 20, max: 90, value: 60, step: 5 });
  const lead = s.slider({ label: "h =", format: (v) => `${v} h`, at: { x: 2.8, y: -4.3 }, width: 3.4, min: 0, max: 5, value: 2, step: 0.5 });
  const clock = s.point(GRAPH.origin.x + 1, GRAPH.origin.y, {
    label: "now",
    color: C.ink,
    constrain: (p) => ({ x: clamp(p.x, GRAPH.origin.x, GRAPH.origin.x + LAST_HOUR), y: GRAPH.origin.y }),
  });

  const first = (t: number): number => v1.value * Math.max(0, t);
  const second = (t: number): number => v2.value * Math.max(0, t - lead.value);
  /** When the second car draws level, or null if it never does after it sets off. */
  const catchUp = (): number | null => {
    const gain = v2.value - v1.value;
    if (gain <= 0) return null;
    return (v2.value * lead.value) / gain;
  };

  return {
    steps: [
      {
        title: "Rate times time",
        text: "The first car drives at a steady speed $r_1$, so each hour adds the same distance: $d = r_1 t$. On a graph of distance against time that is a straight line, and its slope is the speed. Drag “now” to run the clock.",
      },
      {
        title: "A later, faster car",
        text: "The second car waits out the head start $h$, then drives at $r_2$. At time $t$ it has been driving for $t - h$ hours, so its distance is $d = r_2(t - h)$: a steeper line that starts later.",
      },
      {
        title: "Same place, same time",
        text: "It draws level when both distances are equal: $r_1 t = r_2 (t - h)$. That is one linear equation in $t$; gathering the $t$ terms gives $t = \\frac{r_2 h}{r_2 - r_1}$, where the lines cross.",
      },
      {
        title: "Only if it is faster",
        text: "Slow the second car to the first's speed: the lines are parallel and the gap never closes. Slower still and the formula gives a negative time, a meeting before the second car had even set off. Always check that an answer makes sense.",
      },
    ],

    draw(g, f) {
      const now = clock.x - GRAPH.origin.x;
      const meetAt = catchUp();
      const at = (t: number, d: number) => onStage(GRAPH, { x: t, y: d });

      axes(g, GRAPH, { positive: true, xName: "hours", yName: "miles" });
      g.path([at(0, 0), at(LAST_HOUR, first(LAST_HOUR))], { color: FIRST });
      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.path([at(0, 0), at(lead.value, 0)], { color: SECOND, dash: [4, 6], width: 2, alpha });
        g.path([at(lead.value, 0), at(LAST_HOUR, second(LAST_HOUR))], { color: SECOND, alpha });
      }
      if (f.at(2) > 0 && meetAt !== null && meetAt <= LAST_HOUR) {
        const alpha = f.at(2);
        const p = at(meetAt, first(meetAt));
        g.segment(p, at(meetAt, 0), { color: MEET, width: 2, dash: [5, 5], alpha });
        g.segment(p, at(0, first(meetAt)), { color: MEET, width: 2, dash: [5, 5], alpha });
        g.point(p, { color: MEET, r: 8, alpha });
        g.label(p, `${hours(meetAt)}, ${miles(first(meetAt))}`, { color: MEET, size: 14, bold: true, dx: -14, dy: 18, align: "right", alpha });
      }

      // The clock on both lines, and the two cars on the road at that moment.
      g.segment(at(now, 0), at(now, Math.max(first(now), second(now))), { color: C.dim, width: 1.5, dash: [3, 5] });
      g.point(at(now, first(now)), { color: FIRST, r: 6 });
      const road = (d: number) => ({ x: GRAPH.origin.x + d / ROAD_SCALE, y: ROAD_Y });
      const roadEnd = road(ROAD_SCALE * (7.6 - GRAPH.origin.x));
      g.segment(road(0), roadEnd, { color: C.faint, width: 10 });
      g.label(road(0), "start", { color: C.dim, size: 12, dx: -8, align: "right" });
      g.point(road(Math.min(first(now), ROAD_SCALE * 14.5)), { color: FIRST, r: 8 });
      if (f.step >= 1) {
        g.point(at(now, second(now)), { color: SECOND, r: 6 });
        g.point(road(Math.min(second(now), ROAD_SCALE * 14.5)), { color: SECOND, r: 8 });
      }
    },

    readout(f) {
      const now = clock.x - GRAPH.origin.x;
      const [r1, r2, h] = [v1.value, v2.value, lead.value];
      const rows: Readout[] = [
        { label: "First car", tex: `d = ${r1}t = ${r1}(${fmt(now, 2)}) = ${fmt(first(now), 1)}` },
      ];
      if (f.step >= 1) {
        rows.push({
          label: "Second car",
          tex: now >= h ? `d = ${r2}(t - ${fmt(h)}) = ${fmt(second(now), 1)}` : `\\text{waiting until } t = ${fmt(h)}`,
          tone: now >= h ? "plain" : "dim",
        });
      }
      if (f.step >= 2) {
        rows.push({ label: "Draw level", tex: `${r1}t = ${r2}(t - ${fmt(h)})` });
        const t = catchUp();
        rows.push(
          t === null
            ? {
                label: "Gather the t terms",
                tex: `${fmt(r2 - r1)}t = ${fmt(r2 * h)}:\\ ${r2 === r1 ? "\\text{no solution}" : `t = ${fmt((r2 * h) / (r2 - r1), 2)} < ${fmt(h)}`}`,
                tone: "warn",
              }
            : {
                label: "Gather the t terms",
                tex: `${fmt(r2 - r1)}t = ${fmt(r2 * h)} \\;\\Rightarrow\\; t = ${fmt(t, 2)},\\ d = ${fmt(r1 * t, 1)}`,
                tone: "good",
              },
        );
      }
      return rows;
    },

    uses: [
      {
        title: "Catching up on a bike",
        text: "A friend sets off walking to the park at 5 km/h, and you leave 20 minutes later on a bike at 15 km/h. Setting the distances equal, $5t = 15\\left(t - \\tfrac13\\right)$, gives $t = \\tfrac12$ hour: you catch them 2.5 km from home, ten minutes after you set off.",
      },
      {
        title: "Meeting on the road",
        text: "Two friends 30 km apart cycle toward each other at 12 and 18 km/h. Their distances add up to the gap, $12t + 18t = 30$, so they meet after 1 hour, 12 km from the slower rider's house: not halfway, because the faster one covers more.",
      },
      {
        title: "Arrival estimates",
        text: "A navigation app predicts when you will reach someone driving ahead of you, or meet someone coming the other way, by setting two distance equations equal and solving for the time.",
      },
    ],
  };
});
