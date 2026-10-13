// Folding a sheet so that corner A lands on a chosen point A′. The crease is
// the perpendicular bisector of AA′, and the flap is the mirror image, in the
// crease, of the part of the sheet on A's side. When A′ sits on the far side
// of the sheet, a right triangle at corner B gives the fold's lengths.

import { C, tint } from "../draw.ts";
import { add, clamp, dist, dot, fmt, inBox, len, lerp, mid, normalize, perp, reflect, scale, sub, vec, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const WIDTH = 8;
const HEIGHT = 5;
const A = vec(-4, -3.7);
const B = vec(A.x + WIDTH, A.y);
const K = vec(A.x + WIDTH, A.y + HEIGHT); // corner C
const D = vec(A.x, A.y + HEIGHT);
const SHEET = [A, B, K, D];

// The corner has to travel at least this far, or there is no flap to see.
const MIN_TRAVEL = 1;

const PAPER = "rgba(255, 255, 255, 0.1)";
const LOWER = C.blue; // lengths from E, the lower end of the crease
const UPPER = C.pink; // lengths from F, the upper end
const DIAGONAL = Math.SQRT1_2;

/** The part of a convex polygon where `side` is not negative. */
function clip(poly: readonly Vec[], side: (p: Vec) => number): Vec[] {
  const out: Vec[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const fa = side(a);
    const fb = side(b);
    if (fa >= 0) out.push(a);
    if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) out.push(lerp(a, b, fa / (fa - fb)));
  });
  return out;
}

export default lesson((s) => {
  const mode = s.choice("Corner lands", ["anywhere", "on the far side"] as const);

  const inSheet = inBox(A.x, B.x, A.y, D.y);
  const T = s.point(1.2, -0.2, {
    label: "A′",
    constrain: (p) => {
      if (mode.value === "on the far side") return vec(B.x, clamp(p.y, B.y + MIN_TRAVEL, K.y));
      const q = inSheet(p);
      const off = sub(q, A);
      const l = len(off);
      if (l >= MIN_TRAVEL) return q;
      // Push straight out from the corner; that direction stays on the sheet.
      return add(A, scale(l < 1e-9 ? vec(DIAGONAL, DIAGONAL) : scale(off, 1 / l), MIN_TRAVEL));
    },
  });

  function figure() {
    T.set(T); // the choice may have changed where the corner may land
    const M = mid(A, T);
    const toward = normalize(sub(T, A));
    const along = perp(toward);
    const side = (p: Vec): number => dot(sub(p, M), toward);
    const moved = clip(SHEET, (p) => -side(p));
    // The crease is the edge of the moved part that lies on the bisector.
    const onCrease = moved.filter((p) => Math.abs(side(p)) < 1e-9).sort((p, q) => dot(sub(p, q), along));
    const ends = onCrease.length >= 2 ? [onCrease[0], onCrease[onCrease.length - 1]] : [M, M];
    const [E, F] = ends[0].y <= ends[1].y ? ends : [ends[1], ends[0]];
    return {
      M,
      E,
      F,
      stays: clip(SHEET, side),
      moved,
      flap: moved.map((p) => reflect(p, M, add(M, along))),
      farSide: mode.value === "on the far side",
    };
  }

  return {
    steps: [
      {
        title: "Fold a corner over",
        text: "Drag $A'$: the sheet folds so that corner $A$ lands exactly there. The dashed outline is where the flap used to lie. Watch how the crease turns and slides as the landing point moves.",
      },
      {
        title: "Where the crease must be",
        text: "A fold is a reflection in the crease. Points on the crease stay put, so each is equally far from $A$ and from its image $A'$. That makes the crease the perpendicular bisector of $AA'$, crossing it at the midpoint $M$.",
      },
      {
        title: "What the fold preserves",
        text: "Reflection keeps every length and angle, so the flap is congruent to the dashed region it came from. In particular, the ends $E$ and $F$ of the crease give $EA = EA'$ and $FA = FA'$.",
      },
      {
        title: "Corner to the far side",
        text: "Choose “on the far side”. If $AE = x$, the fold gives $EA' = x$ and leaves $EB = w - x$. Triangle $EBA'$ has a right angle at $B$, so $x^2 = (w - x)^2 + t^2$ with $t = BA'$, giving $x = \\frac{w^2 + t^2}{2w}$.",
      },
    ],

    draw(g, f) {
      const { M, E, F, stays, moved, flap, farSide } = figure();

      g.polygon(stays, { fill: PAPER, color: C.ink, width: 2.5 });
      g.polygon(moved, { color: C.dim, width: 2, dash: [6, 6] });
      g.polygon(flap, { fill: tint(g.accent, 0.3), color: g.accent, width: 2.5 });

      if (f.at(3) > 0 && farSide) {
        const a = f.at(3);
        g.polygon([E, B, T], { fill: tint(C.gold, 0.22), color: C.gold, width: 2.5, alpha: a });
        g.angle(E, B, T, { color: C.gold, r: 16, width: 2, alpha: a });
        g.along(A, E, "x", { color: LOWER, offset: -16, alpha: a });
        g.along(E, B, "w − x", { color: C.gold, offset: -16, alpha: a });
        g.along(B, T, "t", { color: C.gold, offset: -16, alpha: a });
        g.along(E, T, "x", { color: LOWER, offset: 16, alpha: a });
      }
      if (f.at(1) > 0) {
        const a = f.at(1);
        g.segment(A, T, { color: C.ink, width: 2, dash: [3, 5], alpha: a });
        g.ticks(A, M, 1, { alpha: a });
        g.ticks(M, T, 1, { alpha: a });
        g.angle(T, M, F, { r: 15, width: 2, alpha: a });
        g.point(M, { r: 4, alpha: a });
        g.label(M, "M", { dx: 14, dy: -12, alpha: a });
      }
      if (f.at(2) > 0) {
        const a = f.at(2);
        g.segment(E, A, { color: LOWER, width: 2.5, dash: [6, 6], alpha: a });
        g.segment(E, T, { color: LOWER, width: 2.5, alpha: a });
        g.ticks(E, A, 2, { color: LOWER, alpha: a });
        g.ticks(E, T, 2, { color: LOWER, alpha: a });
        g.segment(F, A, { color: UPPER, width: 2.5, dash: [6, 6], alpha: a });
        g.segment(F, T, { color: UPPER, width: 2.5, alpha: a });
        g.ticks(F, A, 3, { color: UPPER, alpha: a });
        g.ticks(F, T, 3, { color: UPPER, alpha: a });
      }

      g.segment(E, F, { color: C.gold, width: 4 });
      g.point(E, { color: C.gold });
      g.point(F, { color: C.gold });
      g.label(E, "E", { color: C.gold, dx: 4, dy: -16 });
      g.label(F, "F", { color: C.gold, dx: -14, dy: 12 });

      g.label(A, "A", { color: C.dim, dx: -13, dy: -11 });
      g.label(B, "B", { color: C.dim, dx: 13, dy: -11 });
      g.label(K, "C", { color: C.dim, dx: 13, dy: 11 });
      g.label(D, "D", { color: C.dim, dx: -13, dy: 11 });
    },

    readout() {
      const { M, E, F, farSide } = figure();
      const rows: Readout[] = [
        { label: "The crease bisects AA′", tex: `AM = ${fmt(dist(A, M), 2)},\\quad MA' = ${fmt(dist(M, T), 2)}`, tone: "good" },
        { label: "From the lower end", tex: `EA = ${fmt(dist(E, A), 2)},\\quad EA' = ${fmt(dist(E, T), 2)}`, tone: "good" },
        { label: "From the upper end", tex: `FA = ${fmt(dist(F, A), 2)},\\quad FA' = ${fmt(dist(F, T), 2)}`, tone: "good" },
        { label: "Length of the crease", tex: `EF = ${fmt(dist(E, F), 2)}` },
      ];
      if (!farSide) return rows;
      const t = dist(B, T);
      const x = (WIDTH * WIDTH + t * t) / (2 * WIDTH);
      return [
        ...rows,
        {
          label: "Pythagoras at corner B",
          tex: `x = \\frac{w^2 + t^2}{2w} = \\frac{${fmt(WIDTH)}^2 + ${fmt(t, 2)}^2}{2 \\cdot ${fmt(WIDTH)}} = ${fmt(x, 2)}`,
        },
        { label: "Measured on the fold", tex: `AE = ${fmt(dist(A, E), 2)}`, tone: "good" },
      ];
    },
  };
});
