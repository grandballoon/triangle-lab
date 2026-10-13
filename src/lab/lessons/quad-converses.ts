// Which properties of the diagonals force which quadrilateral. The learner
// holds the two diagonals themselves: each end can be swung about the crossing
// point and pulled in or out. Three switches impose "bisect each other",
// "perpendicular" and "equal"; whatever freedom is left shows which shape the
// conditions really force — and that perpendicular diagonals alone do not make
// a rhombus, though they do still give the area ½·d₁·d₂.

import { C, tint } from "../draw.ts";
import { angleOf, clamp, dist, fmt, len, polar, polygonArea, sub, toDeg, toRad, vec, wrapAngle, type Vec } from "../geo.ts";
import { eq, same } from "../kit/quadrilaterals.ts";
import { lesson, type Handle, type Readout } from "../scene.ts";

const P = vec(0, -0.2);
const MIN_REACH = 1.2;
const MAX_REACH = 4.1;
// The diagonals never come closer to lying along each other than this.
const MIN_GAP = toRad(25);
// With a switch off, a dragged end still clicks into place when it comes this
// close to satisfying the condition, so every shape can also be found by hand.
const SNAP_LENGTH = 0.12;
const SNAP_ANGLE = toRad(3);

const D1 = C.cyan;
const D2 = C.violet;

interface Kind {
  name: string;
  color: string;
}

export default lesson((s) => {
  const bisect = s.toggle("Bisect each other");
  const perpendicular = s.toggle("Perpendicular");
  const equal = s.toggle("Equal lengths");

  // The model: diagonal k points in direction angle[k] from P, reaching
  // reach[k][0] that way (to A or B) and reach[k][1] the opposite way (to C or D).
  const angle = [toRad(8), toRad(112)];
  const reach = [
    [3.9, 2.3],
    [2.6, 3.5],
  ];
  const at = (k: number, end: number): Vec => polar(P, reach[k][end], angle[k] + end * Math.PI);
  const total = (k: number): number => reach[k][0] + reach[k][1];
  /** The turn from diagonal `from` to diagonal `to`, in [−π, π). */
  const turnBetween = (from: number, to: number): number => wrapAngle(angle[to] - angle[from] + Math.PI) - Math.PI;
  const reachable = (r: number): boolean => r >= MIN_REACH && r <= MAX_REACH;

  /** Make diagonal `1 - master` obey the switches, leaving `master` alone where it can. */
  const resolve = (master: number): void => {
    const other = 1 - master;
    const offset = turnBetween(master, other);
    const turn = perpendicular.on ? Math.PI / 2 : clamp(Math.abs(offset), MIN_GAP, Math.PI - MIN_GAP);
    angle[other] = angle[master] + (offset < 0 ? -turn : turn);

    if (bisect.on) {
      for (const r of reach) r[0] = r[1] = (r[0] + r[1]) / 2;
    }
    if (equal.on) {
      // Rescale the other diagonal to the master's length, keeping the way P
      // divides it as far as the reach limits allow.
      const length = total(master);
      const share = reach[other][0] / total(other);
      const near = clamp(share * length, Math.max(MIN_REACH, length - MAX_REACH), Math.min(MAX_REACH, length - MIN_REACH));
      reach[other] = [near, length - near];
    }
  };

  const ends: Handle[][] = [
    [s.point(0, 0, { label: "A", color: D1 }), s.point(0, 0, { label: "C", color: D1 })],
    [s.point(0, 0, { label: "B", color: D2 }), s.point(0, 0, { label: "D", color: D2 })],
  ];
  /** Put every handle where the model says, bypassing the constraints that feed it. */
  const place = (): void => {
    ends.forEach((pair, k) =>
      pair.forEach((h, end) => {
        const p = at(k, end);
        h.x = p.x;
        h.y = p.y;
      }),
    );
  };
  const settle = (): void => {
    resolve(0);
    place();
  };
  settle();

  // Dragging an end swings its whole diagonal about P and sets how far that
  // end reaches; the rest of the figure then gives way as the switches demand.
  ends.forEach((pair, k) =>
    pair.forEach((h, end) => {
      h.constrain = (p) => {
        const v = sub(p, P);
        const other = 1 - k;
        if (len(v) > 1e-9) angle[k] = angleOf(v) - end * Math.PI;
        const offset = turnBetween(other, k);
        if (Math.abs(Math.abs(offset) - Math.PI / 2) < SNAP_ANGLE) {
          angle[k] = angle[other] + Math.sign(offset) * (Math.PI / 2);
        }

        let r = clamp(len(v), MIN_REACH, MAX_REACH);
        const partner = reach[k][1 - end];
        if (bisect.on) {
          if (Math.abs(2 * r - total(other)) < SNAP_LENGTH && reachable(total(other) / 2)) r = total(other) / 2;
          reach[k][1 - end] = r;
        } else if (Math.abs(r - partner) < SNAP_LENGTH) {
          r = partner;
        } else if (Math.abs(r + partner - total(other)) < SNAP_LENGTH && reachable(total(other) - partner)) {
          r = total(other) - partner;
        }
        reach[k][end] = r;
        resolve(k);
        place();
        return at(k, end);
      };
    }),
  );

  const measure = () => {
    const [[A, Cc], [B, D]] = ends;
    const d1 = dist(A, Cc);
    const d2 = dist(B, D);
    const theta = Math.abs(turnBetween(0, 1));
    const halved = reach.map((r) => same(r[0], r[1]));
    return {
      A,
      B,
      Cc,
      D,
      d1,
      d2,
      theta,
      halved,
      bisecting: halved[0] && halved[1],
      right: same(theta, Math.PI / 2),
      equalLong: same(d1, d2),
      area: polygonArea([A, B, Cc, D]),
    };
  };

  const classify = (m: ReturnType<typeof measure>): Kind => {
    if (m.bisecting && m.right && m.equalLong) return { name: "square", color: C.gold };
    if (m.bisecting && m.right) return { name: "rhombus", color: C.pink };
    if (m.bisecting && m.equalLong) return { name: "rectangle", color: C.blue };
    if (m.bisecting) return { name: "parallelogram", color: C.green };
    // One diagonal is the perpendicular bisector of the other.
    if (m.right && (m.halved[0] || m.halved[1])) return { name: "kite", color: C.orange };
    return { name: "quadrilateral", color: C.ink };
  };

  return {
    steps: [
      {
        title: "Build it from the diagonals",
        text: "Drag the ends of the two diagonals: swing them about $P$, pull them longer or shorter. Then turn on one or more of the three conditions and wiggle whatever still moves — the name shows which shape those conditions force.",
      },
      {
        title: "Bisecting gives a parallelogram",
        text: "Switch on only “Bisect each other”. Triangles $APB$ and $CPD$ have $PA = PC$, $PB = PD$ and equal vertical angles at $P$, so they are congruent (SAS). Then $\\angle PAB = \\angle PCD$, so $AB \\parallel CD$; likewise $BC \\parallel DA$.",
      },
      {
        title: "Add perpendicular: a rhombus",
        text: "Now add “Perpendicular”. The four triangles around $P$ are right triangles with legs $PA = PC$ and $PB = PD$, so all four are congruent (LL) and their hypotenuses — the four sides — are equal.",
      },
      {
        title: "Or add equal: a rectangle",
        text: "Swap “Perpendicular” for “Equal lengths”. Now $PA = PB = PC = PD$: four isosceles triangles. Each corner is one base angle from each of two neighbouring triangles, which makes all four corners equal — $90^\\circ$ each. All three switches together: a square.",
      },
      {
        title: "Perpendicular alone is not enough",
        text: "Leave only “Perpendicular” on and pull one end so $P$ is off-centre: no rhombus. Still, triangles $ABC$ and $ADC$ stand on the base $AC$ with heights $PB$ and $PD$, so the area is $\\tfrac12 AC\\,(PB + PD) = \\tfrac12 d_1 d_2$.",
      },
    ],

    draw(g, f) {
      settle();
      const m = measure();
      const { A, B, Cc, D } = m;
      const kind = classify(m);
      const quad: Vec[] = [A, B, Cc, D];
      const only = (n: number): number => (f.step === n ? f.at(n) : 0);

      g.polygon(quad, { fill: tint(kind.color, 0.1), stroke: null });

      // Each step shades the triangles its argument is about, once its condition holds.
      if (only(1) > 0 && m.bisecting) {
        g.polygon([A, P, B], { fill: tint(C.green, 0.3), stroke: null, alpha: only(1) });
        g.polygon([Cc, P, D], { fill: tint(C.green, 0.3), stroke: null, alpha: only(1) });
      }
      if (only(2) > 0 && m.bisecting && m.right) {
        quad.forEach((p, i) => {
          g.polygon([p, P, quad[(i + 1) % 4]], {
            fill: tint(C.pink, i % 2 ? 0.16 : 0.32),
            stroke: null,
            alpha: only(2),
          });
        });
      }
      if (only(3) > 0 && m.bisecting && m.equalLong) {
        quad.forEach((p, i) => {
          const q = quad[(i + 1) % 4];
          g.polygon([p, P, q], { fill: tint(C.blue, i % 2 ? 0.14 : 0.28), stroke: null, alpha: only(3) });
          g.angle(P, p, q, { color: C.blue, r: 26, alpha: only(3) });
          g.angle(P, q, p, { color: C.blue, r: 26, alpha: only(3) });
        });
      }
      if (only(4) > 0 && m.right) {
        g.polygon([A, B, Cc], { fill: tint(D2, 0.28), stroke: null, alpha: only(4) });
        g.polygon([A, D, Cc], { fill: tint(D2, 0.14), stroke: null, alpha: only(4) });
      }

      g.polygon(quad, { color: kind.color, width: 4 });
      if (m.bisecting) {
        g.chevrons(A, B, 1, { color: kind.color });
        g.chevrons(D, Cc, 1, { color: kind.color });
        g.chevrons(B, Cc, 2, { color: kind.color });
        g.chevrons(A, D, 2, { color: kind.color });
      }
      if (m.bisecting && m.equalLong) {
        quad.forEach((p, i) => g.angle(quad[(i + 3) % 4], p, quad[(i + 1) % 4], { color: kind.color, r: 13, width: 2 }));
      }

      g.segment(A, Cc, { color: D1 });
      g.segment(B, D, { color: D2 });
      if (m.halved[0]) {
        g.ticks(A, P, 1, { color: D1 });
        g.ticks(P, Cc, 1, { color: D1 });
      }
      if (m.halved[1]) {
        g.ticks(B, P, 2, { color: D2 });
        g.ticks(P, D, 2, { color: D2 });
      }
      g.angle(A, P, B, { r: 20, width: 2, label: !m.right });
      g.point(P);
      g.label(P, "P", { dx: -13, dy: -15 });

      g.label(vec(0, 4.55), kind.name, { color: kind.color, size: 22, bold: true });
    },

    readout() {
      settle();
      const m = measure();
      const halfProduct = (m.d1 * m.d2) / 2;
      const verdict = (holds: boolean): "good" | "warn" => (holds ? "good" : "warn");
      const halves = (k: number, near: string, far: string): Readout => ({
        tex: `${near} = ${fmt(reach[k][0])} ${eq(m.halved[k])} ${far} = ${fmt(reach[k][1])}`,
        tone: verdict(m.halved[k]),
      });
      return [
        { label: "Bisect each other?", ...halves(0, "PA", "PC") },
        halves(1, "PB", "PD"),
        { label: "Perpendicular?", tex: `\\angle APB = ${fmt(toDeg(m.theta))}^\\circ`, tone: verdict(m.right) },
        {
          label: "Equal?",
          tex: `AC = ${fmt(m.d1)} ${eq(m.equalLong)} BD = ${fmt(m.d2)}`,
          tone: verdict(m.equalLong),
        },
        { label: "So it is a", tex: `\\text{${classify(m).name}}` },
        {
          label: "Area, and half the diagonals' product",
          tex: `[ABCD] = ${fmt(m.area, 2)},\\quad \\tfrac12 d_1 d_2 = ${fmt(halfProduct, 2)}`,
          tone: verdict(m.right),
        },
      ];
    },
  };
});
