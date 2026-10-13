// The medians of a triangle meet in one point, proved with coordinates. With
// the triangle set on the axes as A(a, 0), B(b, 0), C(0, c), two medians cross
// at ((a + b)/3, c/3) and the third passes through the same point: the
// centroid, the average of the vertices, two thirds of the way along each
// median. Freeing the vertices shows the average rule holding anywhere.

import { C, tint } from "../draw.ts";
import { centroid, cross, dist, fmt, lineLine, mid, sub, type Vec } from "../geo.ts";
import { guard, lattice, num, pair, par, plane, texPoint, texSum } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

// One colour per median, named by the vertex it starts from.
const FROM_A = C.gold;
const FROM_B = C.cyan;
const FROM_C = C.pink;
const CENTROID = C.green;
const HOME = { A: { x: -5, y: 0 }, B: { x: 4, y: 0 }, C: { x: 0, y: 3 } };
/** Twice the least area allowed; positive, so A, B, C stay counter-clockwise. */
const MIN_DOUBLE_AREA = 4;

const doubleArea = (a: Vec, b: Vec, c: Vec): number => cross(sub(b, a), sub(c, a));

export default lesson((s) => {
  const free = s.toggle("Free the vertices", false);
  const A = s.point(HOME.A.x, HOME.A.y, { label: "A" });
  const B = s.point(HOME.B.x, HOME.B.y, { label: "B" });
  const P = s.point(HOME.C.x, HOME.C.y, { label: "C" });
  const onXAxis = (p: Vec): Vec => (free.on ? lattice(p) : { x: lattice(p).x, y: 0 });
  const onYAxis = (p: Vec): Vec => (free.on ? lattice(p) : { x: 0, y: lattice(p).y });
  guard(A, onXAxis, (q) => doubleArea(q, B, P) >= MIN_DOUBLE_AREA);
  guard(B, onXAxis, (q) => doubleArea(A, q, P) >= MIN_DOUBLE_AREA);
  guard(P, onYAxis, (q) => doubleArea(A, B, q) >= MIN_DOUBLE_AREA);

  let wasFree = free.on;

  /** Midpoints D, E, F opposite A, B, C; the centroid; and where AD meets BE. */
  function parts(): { D: Vec; E: Vec; F: Vec; G: Vec; crossing: Vec } {
    const D = mid(B, P);
    const E = mid(A, P);
    const G = centroid([A, B, P]);
    return { D, E, F: mid(A, B), G, crossing: lineLine(A, D, B, E) ?? G };
  }

  return {
    steps: [
      {
        title: "Set the triangle down well",
        text: "Drag $A$ and $B$ along the $x$-axis and $C$ along the $y$-axis. Any triangle can be laid on the axes like this, so three numbers $a$, $b$, $c$ describe it. Do its three medians always pass through one point?",
      },
      {
        title: "The midpoints",
        text: "A median joins a vertex to the midpoint of the opposite side. Averaging the endpoints of each side gives $D = (\\tfrac b2, \\tfrac c2)$, $E = (\\tfrac a2, \\tfrac c2)$ and $F = (\\tfrac{a+b}{2}, 0)$.",
      },
      {
        title: "Two medians cross",
        text: "The line through $A$ and $D$ is $cx + (2a - b)y = ac$; the line through $B$ and $E$ is $cx + (2b - a)y = bc$. Subtracting gives $y = \\tfrac c3$, and then $x = \\tfrac{a+b}{3}$.",
      },
      {
        title: "The third passes through it",
        text: "Median $CF$ is $2cx + (a + b)y = c(a + b)$. Put the crossing point in: $\\tfrac23 c(a+b) + \\tfrac13 c(a+b) = c(a+b)$. It fits, so all three medians meet at one point $G$, the centroid.",
      },
      {
        title: "An average, and two to one",
        text: "$G = (\\tfrac{a+b+0}{3}, \\tfrac{0+0+c}{3})$ is the average of the three vertices. From $A$, the step to $G$ is two thirds of the step to $D$, so $AG = 2\\,GD$ — and likewise along the other medians.",
      },
      {
        title: "Anywhere in the plane",
        text: "Turn on “Free the vertices” and drag them anywhere. Sliding or turning the axes renames every point by one rule, and averages obey the same rule — so $G$ is still the average of the three vertices.",
      },
    ],

    draw(g, f) {
      // Back on the axes, the triangle returns to its starting placement.
      if (wasFree && !free.on) {
        Object.assign(A, HOME.A);
        Object.assign(B, HOME.B);
        Object.assign(P, HOME.C);
      }
      wasFree = free.on;
      const { D, E, F, G, crossing } = parts();
      const medians = [
        { from: A, to: D, name: "D", color: FROM_A, shown: f.at(2) },
        { from: B, to: E, name: "E", color: FROM_B, shown: f.at(2) },
        { from: P, to: F, name: "F", color: FROM_C, shown: f.at(3) },
      ];

      plane(g);
      g.polygon([A, B, P], { color: g.accent, fill: tint(g.accent, 0.1) });
      for (const m of medians) {
        g.segment(m.from, m.to, { color: C.dim, width: 2, dash: [5, 5] });
        if (m.shown > 0) g.segment(m.from, m.to, { color: m.color, alpha: m.shown });
        g.point(m.to, { color: m.color, r: 5 });
      }
      g.label(D, "D", { color: FROM_A, dx: 16, dy: 10 });
      g.label(E, "E", { color: FROM_B, dx: -16, dy: 10 });
      g.label(F, "F", { color: FROM_C, dy: -18 });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.ticks(B, D, 1, { color: FROM_A, alpha });
        g.ticks(D, P, 1, { color: FROM_A, alpha });
        g.ticks(A, E, 2, { color: FROM_B, alpha });
        g.ticks(E, P, 2, { color: FROM_B, alpha });
        g.ticks(A, F, 3, { color: FROM_C, alpha });
        g.ticks(F, B, 3, { color: FROM_C, alpha });
      }
      if (f.at(2) > 0) {
        g.point(crossing, { color: CENTROID, r: 7, alpha: f.at(2) });
        g.label(crossing, `${f.step >= 3 ? "G " : ""}${pair(crossing, 2)}`, {
          color: CENTROID,
          bold: true,
          dx: 14,
          dy: -20,
          align: "left",
          alpha: f.at(2),
        });
      }
      if (f.at(4) > 0) {
        g.along(A, G, num(dist(A, G), 2), { color: FROM_A, offset: 16, alpha: f.at(4) });
        g.along(G, D, num(dist(G, D), 2), { color: FROM_A, offset: 16, alpha: f.at(4) });
      }

      g.label(A, pair(A), { dx: -16, dy: -20, align: "right", size: 13 });
      g.label(B, pair(B), { dx: 16, dy: -20, align: "left", size: 13 });
      g.label(P, pair(P), { dx: -18, dy: 18, align: "right", size: 13 });
    },

    readout(f) {
      const { D, E, F, G, crossing } = parts();
      const ratio: Readout = {
        label: "Along the median from $A$",
        tex: `AG = ${fmt(dist(A, G), 2)} = 2(${fmt(dist(G, D), 2)}) = 2\\,GD`,
        tone: "good",
      };
      const meet: Readout = {
        label: "Solving $AD$ and $BE$ together",
        tex: `(x,\\,y) = ${texPoint(crossing, 2)}`,
        tone: "good",
      };

      if (free.on) {
        return [
          {
            label: "Average of the x's",
            tex: `\\frac{${fmt(A.x)} + ${par(B.x)} + ${par(P.x)}}{3} = ${fmt(G.x, 2)}`,
          },
          {
            label: "Average of the y's",
            tex: `\\frac{${fmt(A.y)} + ${par(B.y)} + ${par(P.y)}}{3} = ${fmt(G.y, 2)}`,
          },
          meet,
          ratio,
        ];
      }

      const a = A.x;
      const b = B.x;
      const c = P.y;
      const placed: Readout = {
        label: "$A(a, 0)$, $B(b, 0)$, $C(0, c)$",
        tex: `a = ${fmt(a)},\\quad b = ${fmt(b)},\\quad c = ${fmt(c)}`,
      };
      const medianAD: Readout = { label: "Median $AD$", tex: `${texSum([[c, "x"], [2 * a - b, "y"]])} = ${fmt(a * c)}` };
      const medianBE: Readout = { label: "Median $BE$", tex: `${texSum([[c, "x"], [2 * b - a, "y"]])} = ${fmt(b * c)}` };
      const formula: Readout = {
        label: "The formula's point",
        tex: `\\left(\\tfrac{a+b}{3},\\,\\tfrac{c}{3}\\right) = ${texPoint({ x: (a + b) / 3, y: c / 3 }, 2)}`,
        tone: "good",
      };

      if (f.step === 0) return [placed];
      if (f.step === 1) {
        return [
          placed,
          { label: "Midpoint of $BC$", tex: `D = ${texPoint(D, 2)}` },
          { label: "Midpoint of $AC$", tex: `E = ${texPoint(E, 2)}` },
          { label: "Midpoint of $AB$", tex: `F = ${texPoint(F, 2)}` },
        ];
      }
      if (f.step === 2) return [placed, medianAD, medianBE, meet, formula];
      if (f.step === 3) {
        const left = 2 * c * crossing.x + (a + b) * crossing.y;
        return [
          meet,
          { label: "Median $CF$", tex: `${texSum([[2 * c, "x"], [a + b, "y"]])} = ${fmt(c * (a + b))}` },
          {
            label: "Put the crossing point in",
            tex: `${fmt(2 * c)}(${fmt(crossing.x, 2)}) + ${par(a + b)}(${fmt(crossing.y, 2)}) = ${fmt(left, 2)}`,
            tone: "good",
          },
        ];
      }
      return [
        placed,
        {
          label: "Average of the vertices",
          tex: `\\left(\\tfrac{${fmt(a)} + ${par(b)} + 0}{3},\\,\\tfrac{0 + 0 + ${par(c)}}{3}\\right) = ${texPoint(G, 2)}`,
          tone: "good",
        },
        meet,
        ratio,
      ];
    },
  };
});
