// Areas cut off by diagonals. In a trapezoid the diagonals make two similar
// triangles on the parallel sides, with areas in the ratio of the squared
// bases, and two side triangles of equal area. Then a second figure: when one
// diagonal of a quadrilateral bisects the other, it halves the area.

import { C, tint, type Draw } from "../draw.ts";
import { centroid, clamp, dist, dot, fmt, inBox, lerp, lineLine, project, sub, triangleArea, vec, type Vec } from "../geo.ts";
import { agree } from "../kit/areas.ts";
import { lesson, type Frame, type Readout } from "../scene.ts";

const TOP = 2.9;
const BOTTOM = -2.7;
/** The step at which the trapezoid gives way to the bisected quadrilateral. */
const SECOND_FIGURE = 4;

const SIMILAR = C.blue;
const SIDES = C.pink;
const FIRST_ANGLE = C.gold;
const SECOND_ANGLE = C.green;
const HEIGHT = C.gold;
const UPPER = C.blue; // triangle ACB
const LOWER = C.pink; // triangle ACD

const DASH = [6, 5];

export default lesson((s) => {
  // Trapezoid ABCD with AB ∥ DC. Each corner keeps to its own half of its
  // line, so the figure stays convex and the diagonals always cross inside.
  const rail = (y: number, left: boolean) => (left ? inBox(-7, -0.8, y, y) : inBox(0.8, 7, y, y));
  const A = s.point(-2, TOP, { label: "A", constrain: rail(TOP, true) });
  const B = s.point(1.6, TOP, { label: "B", constrain: rail(TOP, false) });
  const K = s.point(5.4, BOTTOM, { label: "C", constrain: rail(BOTTOM, false) });
  const D = s.point(-5.6, BOTTOM, { label: "D", constrain: rail(BOTTOM, true) });

  // Quadrilateral whose diagonal A′C′ passes through the midpoint X of BD:
  // B is free above the diagonal and D is its reflection in X. The diagonal is
  // kept shallow enough that its line never climbs to B's lowest height.
  const A2 = s.point(-5.6, -0.4, { label: "A", constrain: inBox(-7, -2.5, -0.6, 0.4) });
  const K2 = s.point(5.6, 0.2, { label: "C", constrain: inBox(2.5, 7, -0.6, 0.4) });
  const X = s.point(-0.6, 0, {
    label: "X",
    color: C.ink,
    constrain: (p) => {
      const along = sub(K2, A2);
      return lerp(A2, K2, clamp(dot(sub(p, A2), along) / dot(along, along), 0.2, 0.8));
    },
  });
  // The limits that depend on X keep the mirrored corner D on the stage.
  const B2 = s.point(1.2, 3.2, {
    label: "B",
    constrain: (p) =>
      vec(clamp(p.x, Math.max(-7, 2 * X.x - 7), Math.min(7, 2 * X.x + 7)), clamp(p.y, 1.8, Math.min(4.2, 2 * X.y + 4.4))),
  });

  const trapezoid = [A, B, K, D];
  const bisected = [A2, K2, X, B2];

  /** Show the handles of the figure on stage and retire the other set. */
  function stage(second: boolean): void {
    for (const h of trapezoid) {
      h.enabled = !second;
      h.hidden = second;
    }
    for (const h of bisected) {
      h.enabled = second;
      h.hidden = !second;
    }
  }

  /** The second figure, with X and B re-settled after A or C has moved. */
  function quad(): { D2: Vec; Y: Vec; Z: Vec } {
    X.set(X);
    B2.set(B2);
    const D2 = vec(2 * X.x - B2.x, 2 * X.y - B2.y);
    return { D2, Y: project(B2, A2, K2), Z: project(D2, A2, K2) };
  }

  const crossing = (): Vec => lineLine(A, K, B, D) ?? centroid(trapezoid);

  function drawTrapezoid(g: Draw, f: Frame): void {
    const E = crossing();
    g.polygon([A, B, E], { fill: tint(SIMILAR, 0.3), stroke: null });
    g.polygon([K, D, E], { fill: tint(SIMILAR, 0.3), stroke: null });
    g.polygon([A, E, D], { fill: tint(SIDES, 0.22), stroke: null });
    g.polygon([B, E, K], { fill: tint(SIDES, 0.22), stroke: null });

    if (f.at(3) > 0) {
      // Triangles ABD and ABC stand on AB and reach down to the same parallel.
      const a = f.at(3);
      const left = vec(Math.min(A.x, D.x), TOP);
      const right = vec(Math.max(B.x, K.x), TOP);
      g.segment(left, right, { color: C.dim, width: 1.5, dash: DASH, alpha: a });
      g.segment(D, vec(D.x, TOP), { color: HEIGHT, width: 2, dash: DASH, alpha: a });
      g.segment(K, vec(K.x, TOP), { color: HEIGHT, width: 2, dash: DASH, alpha: a });
      g.ticks(D, vec(D.x, TOP), 1, { color: HEIGHT, alpha: a });
      g.ticks(K, vec(K.x, TOP), 1, { color: HEIGHT, alpha: a });
      g.angle(D, vec(D.x, TOP), vec(D.x + 1, TOP), { color: HEIGHT, r: 12, width: 1.5, alpha: a });
      g.angle(K, vec(K.x, TOP), vec(K.x - 1, TOP), { color: HEIGHT, r: 12, width: 1.5, alpha: a });
      g.segment(A, B, { color: HEIGHT, width: 5, alpha: a });
    }

    g.polygon(trapezoid, {});
    g.segment(A, K, { width: 2.5 });
    g.segment(B, D, { width: 2.5 });
    g.chevrons(A, B, 1, { color: g.accent });
    g.chevrons(D, K, 1, { color: g.accent });

    if (f.at(1) > 0) {
      const a = f.at(1);
      g.angle(B, A, E, { color: FIRST_ANGLE, fill: true, r: 30, alpha: a });
      g.angle(D, K, E, { color: FIRST_ANGLE, fill: true, r: 30, alpha: a });
      g.angle(A, B, E, { color: SECOND_ANGLE, fill: true, r: 24, arcs: 2, alpha: a });
      g.angle(K, D, E, { color: SECOND_ANGLE, fill: true, r: 24, arcs: 2, alpha: a });
    }
    if (f.at(2) > 0) {
      g.along(A, B, `AB = ${fmt(dist(A, B))}`, { color: SIMILAR, offset: 16, alpha: f.at(2) });
      g.along(D, K, `CD = ${fmt(dist(D, K))}`, { color: SIMILAR, offset: -16, alpha: f.at(2) });
    }

    const area = (p: Vec, q: Vec, color: string): void =>
      g.label(centroid([p, q, E]), fmt(triangleArea(p, q, E)), { color, size: 14, bold: true });
    area(A, B, SIMILAR);
    area(K, D, SIMILAR);
    area(A, D, SIDES);
    area(B, K, SIDES);
    g.point(E, { label: "E" });
  }

  function drawBisected(g: Draw, f: Frame): void {
    const { D2, Y, Z } = quad();
    const a = f.at(SECOND_FIGURE);
    g.polygon([A2, K2, B2], { fill: tint(UPPER, 0.25), stroke: null, alpha: a });
    g.polygon([A2, K2, D2], { fill: tint(LOWER, 0.25), stroke: null, alpha: a });

    if (f.at(5) > 0) {
      const b = f.at(5);
      g.polygon([B2, Y, X], { fill: tint(HEIGHT, 0.3), stroke: null, alpha: b });
      g.polygon([D2, Z, X], { fill: tint(HEIGHT, 0.3), stroke: null, alpha: b });
      // The diagonal's line, extended as far as the feet of the altitudes.
      g.segment(Y, Z, { color: C.dim, width: 1.5, dash: DASH, alpha: b });
      g.segment(A2, Y, { color: C.dim, width: 1.5, dash: DASH, alpha: b });
      g.segment(K2, Z, { color: C.dim, width: 1.5, dash: DASH, alpha: b });
      g.segment(B2, Y, { color: HEIGHT, width: 2.5, dash: DASH, alpha: b });
      g.segment(D2, Z, { color: HEIGHT, width: 2.5, dash: DASH, alpha: b });
      // When B stands directly over X the right triangles collapse onto the altitudes.
      if (dist(X, Y) > 0.25) {
        g.angle(B2, Y, X, { color: HEIGHT, r: 12, width: 1.5, alpha: b });
        g.angle(D2, Z, X, { color: HEIGHT, r: 12, width: 1.5, alpha: b });
        g.angle(B2, X, Y, { color: SECOND_ANGLE, fill: true, r: 22, alpha: b });
        g.angle(D2, X, Z, { color: SECOND_ANGLE, fill: true, r: 22, alpha: b });
      }
      g.point(Y, { label: "Y", color: HEIGHT, alpha: b });
      g.point(Z, { label: "Z", color: HEIGHT, alpha: b });
    }

    g.polygon([A2, B2, K2, D2], { alpha: a });
    g.segment(A2, K2, { color: g.accent, alpha: a });
    g.segment(B2, D2, { width: 2.5, alpha: a });
    g.ticks(B2, X, 2, { alpha: a });
    g.ticks(X, D2, 2, { alpha: a });
    g.point(D2, { alpha: a });
    g.label(D2, "D", { dx: 16, dy: -16, bold: true, alpha: a });
    g.label(centroid([A2, K2, B2]), fmt(triangleArea(A2, K2, B2)), { color: UPPER, bold: true, dy: 26, alpha: a });
    g.label(centroid([A2, K2, D2]), fmt(triangleArea(A2, K2, D2)), { color: LOWER, bold: true, dy: -26, alpha: a });
  }

  function trapezoidReadout(): Readout[] {
    const E = crossing();
    const ab = dist(A, B);
    const cd = dist(D, K);
    const small = triangleArea(A, B, E);
    const large = triangleArea(K, D, E);
    const left = triangleArea(A, E, D);
    const right = triangleArea(B, E, K);
    const squared = agree(large / small, (cd / ab) ** 2) ? "good" : "warn";
    return [
      { label: "Parallel sides", tex: `AB = ${fmt(ab)},\\quad CD = ${fmt(cd)}` },
      { label: "Ratio of similarity", tex: `k = \\frac{CD}{AB} = ${fmt(cd / ab, 3)}` },
      { label: "Triangles on the bases", tex: `[ABE] = ${fmt(small, 2)},\\quad [CDE] = ${fmt(large, 2)}` },
      { label: "Ratio of areas", tex: `\\frac{[CDE]}{[ABE]} = ${fmt(large / small, 3)}`, tone: squared },
      { label: "Ratio squared", tex: `k^2 = ${fmt((cd / ab) ** 2, 3)}`, tone: squared },
      {
        label: "Side triangles",
        tex: `[AED] = ${fmt(left, 2)},\\quad [BEC] = ${fmt(right, 2)}`,
        tone: agree(left, right) ? "good" : "warn",
      },
    ];
  }

  function bisectedReadout(): Readout[] {
    const { D2, Y, Z } = quad();
    const ac = dist(A2, K2);
    const by = dist(B2, Y);
    const dz = dist(D2, Z);
    const upper = triangleArea(A2, K2, B2);
    const lower = triangleArea(A2, K2, D2);
    const halves = agree(upper, lower) ? "good" : "warn";
    return [
      { label: "Bisected diagonal", tex: `BX = ${fmt(dist(B2, X), 2)},\\quad XD = ${fmt(dist(X, D2), 2)}` },
      {
        label: "Altitudes to AC",
        tex: `BY = ${fmt(by, 2)},\\quad DZ = ${fmt(dz, 2)}`,
        tone: agree(by, dz) ? "good" : "warn",
      },
      { label: "Above the diagonal", tex: `[ACB] = \\tfrac12 (${fmt(ac, 2)})(${fmt(by, 2)}) = ${fmt(upper, 2)}`, tone: halves },
      { label: "Below the diagonal", tex: `[ACD] = \\tfrac12 (${fmt(ac, 2)})(${fmt(dz, 2)}) = ${fmt(lower, 2)}`, tone: halves },
    ];
  }

  return {
    steps: [
      {
        title: "Four triangles in a trapezoid",
        text: "Slide the corners along the two parallel sides. The diagonals cut the trapezoid into four triangles, each showing its area. Which pair always matches? How do the other two compare?",
      },
      {
        title: "Two similar triangles",
        text: "$AC$ crosses the parallels $AB$ and $DC$, so the alternate angles $\\angle BAE$ and $\\angle DCE$ are equal; $BD$ gives $\\angle ABE = \\angle CDE$. By AA, triangles $ABE$ and $CDE$ are similar.",
      },
      {
        title: "Areas go as the square",
        text: "The bases $AB$ and $CD$ are corresponding sides, so the ratio of similarity is $k = CD/AB$, and the areas are in the ratio $k^2$: $[CDE] = k^2\\,[ABE]$.",
      },
      {
        title: "The side triangles match",
        text: "Triangles $ABD$ and $ABC$ share the base $AB$, and $D$ and $C$ are equally far from it, so their areas are equal. Remove $ABE$ from both: $[AED] = [BEC]$.",
      },
      {
        title: "A diagonal cut in half",
        text: "A new quadrilateral: diagonal $AC$ passes through $X$, the midpoint of diagonal $BD$. Drag $A$, $B$, $C$, or slide $X$ along $AC$, and compare the areas on either side of $AC$.",
      },
      {
        title: "Equal altitudes",
        text: "Drop perpendiculars $BY$, $DZ$ to line $AC$. Right triangles $BYX$, $DZX$ have equal vertical angles at $X$ and $BX = DX$, so they are congruent: $BY = DZ$. Same base $AC$, equal altitudes, so $[ACB] = [ACD]$.",
      },
    ],

    draw(g, f) {
      const second = f.step >= SECOND_FIGURE;
      stage(second);
      if (second) drawBisected(g, f);
      else drawTrapezoid(g, f);
    },

    readout(f) {
      return f.step >= SECOND_FIGURE ? bisectedReadout() : trapezoidReadout();
    },
  };
});
