// Prisms and cylinders: volume is base area times height, and the lateral
// surface unrolls into a flat rectangle, perimeter by height. On the unrolled
// wall of a cylinder the shortest route between two points is a straight line.

import { C, tint } from "../draw.ts";
import { clamp, fmt, TAU } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { dist3, faces, label3, lerp3, Orbit, p3, path3, point3, segment3, type Face, type P3 } from "../solid.ts";
import { glass, outlineRulings } from "../kit/solids.ts";

const BASES = ["triangle", "square", "hexagon", "circle"] as const;
const SIDES: Record<(typeof BASES)[number], number> = { triangle: 3, square: 4, hexagon: 6, circle: 72 };

const CUT = C.pink;
const ROUTE = C.gold;
const LEG = C.green;

/**
 * The outline of the base as a chain of `n` segments of length `step` in the
 * xz-plane: curled into a closed regular polygon at `u = 0`, laid out straight
 * at `u = 1`, with every joint opened by the same share in between. The middle
 * of the chain stays put at the back; the two ends meet at the front.
 */
function chain(n: number, step: number, u: number): { x: number; z: number }[] {
  const bend = ((1 - u) * TAU) / n;
  const pts = [{ x: 0, z: 0 }];
  for (let i = 0; i < n; i++) {
    const heading = (i - (n - 1) / 2) * bend;
    const last = pts[i];
    pts.push({ x: last.x + step * Math.cos(heading), z: last.z + step * Math.sin(heading) });
  }
  // Pin the chain's midpoint where it sits on the closed polygon.
  const odd = n % 2 === 1;
  const a = pts[Math.floor(n / 2)];
  const b = pts[Math.ceil(n / 2)];
  const back = odd ? step / (2 * Math.tan(Math.PI / n)) : step / (2 * Math.sin(Math.PI / n));
  const shift = { x: -(a.x + b.x) / 2, z: -back - (a.z + b.z) / 2 };
  return pts.map((p) => ({ x: p.x + shift.x, z: p.z + shift.z }));
}

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.45, 0.36, { x: 0, y: 0.6 }));
  const radius = s.slider({ label: "r =", at: { x: -7.6, y: -4.3 }, width: 3.4, min: 0.8, max: 1.4, value: 1.2, step: 0.1 });
  // Tall enough that going round the wall always beats crossing a lid.
  const height = s.slider({ label: "h =", at: { x: -3.2, y: -4.3 }, width: 3.4, min: 2.2, max: 3.6, value: 3, step: 0.2 });
  const unroll = s.slider({
    label: "unroll",
    at: { x: 1.2, y: -4.3 },
    width: 3.4,
    min: 0,
    max: 1,
    value: 0,
    format: (v) => `${Math.round(v * 100)}%`,
  });
  const base = s.choice("Base", BASES, "hexagon");

  const model = () => {
    const round = base.value === "circle";
    const n = SIDES[base.value];
    const r = radius.value;
    const h = height.value;
    // A polygon is inscribed in the circle of radius r; the circle itself is
    // drawn as many short chords whose lengths add up to exactly 2πr.
    const step = round ? (TAU * r) / n : 2 * r * Math.sin(Math.PI / n);
    const perimeter = n * step;
    const area = round ? Math.PI * r * r : (n / 2) * r * r * Math.sin(TAU / n);
    return { round, n, r, h, step, perimeter, area };
  };

  /** The route from A (top rim) to B (bottom rim, half-way round), one point per chord. */
  const route = (wall: { x: number; z: number }[], n: number, h: number): P3[] => {
    const from = n / 4;
    const pieces = n / 2;
    return Array.from({ length: pieces + 1 }, (_, k) => {
      const p = wall[from + k];
      return p3(p.x, h / 2 - (h * k) / pieces, p.z);
    });
  };

  return {
    steps: [
      {
        title: "A base, carried upward",
        text: "Pick a base and set its size and the height. A prism or cylinder is its base swept straight up, so its volume is $V = Bh$: base area times height. Drag empty space to turn it.",
      },
      {
        title: "Unwrap the wall",
        text: "Slide unroll. In a right prism every side face is a rectangle of height $h$ standing on one side of the base. Laid flat in a row they make one rectangle, so the lateral area is $ph$: perimeter times height.",
      },
      {
        title: "The label of a can",
        text: "Choose the circle. Its wall is cut along one vertical line and unrolls into a rectangle too: $h$ tall and one circumference, $2\\pi r$, wide. Lateral area $2\\pi rh$; add two discs for the total.",
      },
      {
        title: "Across the can",
        text: "With the circle chosen: $A$ is on the top rim and $B$ on the bottom rim, directly opposite. An ant walks from $A$ to $B$ along the curved wall. Which route is shortest? Rolled up, it is hard to tell.",
      },
      {
        title: "Straight on the flat",
        text: "Unroll the wall. $B$ lies half a circumference along from $A$, so the route is the hypotenuse of a right triangle with legs $h$ and $\\pi r$. A straight line is shortest: $\\sqrt{h^2 + (\\pi r)^2}$.",
      },
    ],

    draw(g, f) {
      const { round, n, h, step } = model();
      const u = unroll.value;
      const wall = chain(n, step, u);
      const closed = chain(n, step, 0).slice(0, n);
      const bottom = wall.map((p) => p3(p.x, -h / 2, p.z));
      const top = wall.map((p) => p3(p.x, h / 2, p.z));

      const pane = glass(g.accent);
      const list: Face[] = bottom.slice(0, n).map((p, i) => ({
        pts: [p, bottom[i + 1], top[i + 1], top[i]],
        ...pane,
        stroke: round ? null : pane.stroke,
      }));
      if (u < 1) {
        for (const y of [-h / 2, h / 2]) {
          list.push({ pts: closed.map((p) => p3(p.x, y, p.z)), ...pane, alpha: 1 - u });
        }
      }
      faces(g, cam, list);

      if (round) {
        const edge = { color: tint(g.accent, 0.9), width: 2 };
        path3(g, cam, bottom, edge);
        path3(g, cam, top, edge);
        for (const i of outlineRulings(cam, bottom, top)) segment3(g, cam, bottom[i], top[i], edge);
      }
      if (f.step >= 1 || u > 0) {
        for (const i of [0, n]) segment3(g, cam, bottom[i], top[i], { color: CUT, width: 3 });
      }

      const flat = clamp((u - 0.8) / 0.2, 0, 1);
      if (flat > 0) {
        g.along(cam.project(bottom[0]), cam.project(bottom[n]), round ? "2πr" : "perimeter p", {
          color: C.ink,
          offset: -18,
          alpha: flat,
        });
        g.along(cam.project(bottom[n]), cam.project(top[n]), "h", { color: CUT, offset: -14, alpha: flat });
      }

      if (f.at(3) > 0) {
        if (!round) {
          g.label({ x: 0, y: 4.5 }, "Choose the circle to follow the ant", { color: ROUTE, alpha: f.at(3) });
          return;
        }
        const path = route(wall, n, h);
        const A = path[0];
        const B = path[path.length - 1];
        if (f.at(4) > 0) {
          const alpha = f.at(4);
          const K = p3(A.x, -h / 2, A.z);
          segment3(g, cam, A, K, { color: LEG, width: 3, dash: [6, 5], alpha });
          path3(g, cam, bottom.slice(n / 4, (3 * n) / 4 + 1), { color: LEG, width: 4, alpha });
          label3(g, cam, lerp3(A, K, 0.5), "h", { color: LEG, dx: -12, alpha });
          label3(g, cam, bottom[n / 2], "πr", { color: LEG, dy: -14, alpha });
        }
        path3(g, cam, path, { color: ROUTE, width: 4, alpha: f.at(3) });
        point3(g, cam, A, { color: ROUTE, label: "A", alpha: f.at(3) });
        point3(g, cam, B, { color: ROUTE, label: "B", alpha: f.at(3) });
      }
    },

    readout(f) {
      const { round, n, r, h, step, perimeter, area } = model();
      const around: Readout = {
        label: round ? "Circumference" : "Perimeter",
        tex: round ? `p = 2\\pi r = ${fmt(perimeter, 2)}` : `p = ${n} \\cdot ${fmt(step, 2)} = ${fmt(perimeter, 2)}`,
      };
      if (f.step >= 3) {
        if (!round) return [around, { label: "The ant's route", tex: "\\text{choose the circle}", tone: "warn" }];
        const path = route(chain(n, step, unroll.value), n, h);
        const walked = path.slice(1).reduce((sum, p, i) => sum + dist3(path[i], p), 0);
        const rows: Readout[] = [around, { label: "Route, measured on the wall", tex: `AB = ${fmt(walked, 3)}` }];
        if (f.step >= 4) {
          rows.push({
            label: "Straight line on the flat",
            tex: `\\sqrt{h^2 + (\\pi r)^2} = ${fmt(Math.hypot(h, Math.PI * r), 3)}`,
            tone: "good",
          });
          rows.push({ label: "Over a lid instead", tex: `2r + h = ${fmt(2 * r + h, 3)} \\ \\text{(longer)}`, tone: "dim" });
        }
        return rows;
      }

      const rows: Readout[] = [
        {
          label: "Base area",
          tex: round ? `B = \\pi r^2 = ${fmt(area, 2)}` : `B = ${fmt(area, 2)} \\quad (\\text{side } ${fmt(step, 2)})`,
        },
        { label: "Volume", tex: `V = Bh = ${fmt(area, 2)} \\cdot ${fmt(h)} = ${fmt(area * h, 2)}` },
      ];
      if (f.step >= 1) {
        rows.push(around, {
          label: "Lateral area",
          tex: `${round ? "2\\pi rh" : "ph"} = ${fmt(perimeter, 2)} \\cdot ${fmt(h)} = ${fmt(perimeter * h, 2)}`,
          tone: "good",
        });
      }
      if (f.step === 2) {
        rows.push({
          label: "Total area",
          tex: `${round ? "2\\pi rh + 2\\pi r^2" : "ph + 2B"} = ${fmt(perimeter * h + 2 * area, 2)}`,
        });
      }
      return rows;
    },
  };
});
