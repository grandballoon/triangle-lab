// Tangent circles. Two circles touch from outside when their centres are the
// sum of the radii apart, and from inside when they are the difference apart;
// in between they cross, and beyond they miss. The last steps add a third
// circle with every pair touching, where the triangle of centres fixes all
// three radii: r_A = (AB + AC − BC) / 2.

import { C } from "../draw.ts";
import {
  add,
  angleOf,
  circleCircle,
  clamp,
  dist,
  dot,
  fmt,
  inBox,
  len,
  lerp,
  mix,
  normalize,
  perp,
  polar,
  project,
  scale,
  sub,
  vec,
  type Constraint,
  type Vec,
} from "../geo.ts";
import { lesson } from "../scene.ts";

const R_MIN = 0.6;
const R_MAX = 2.6;
const SNAP = 0.18; // a drag this close to tangency lands on it exactly
const TOUCH = 1e-6; // rounding slack when testing for tangency
const APART = 0.5; // the centres A and B never coincide
const CLEAR = 1; // C stays this far from line AB, so the triangle of centres is real
const LOW = inBox(-5, 5, -2.2, 0.8);
const HIGH = inBox(-5, 5, 2.2, 3.6);
const STATUS_AT = vec(0, 4.4);

const COLOR_A = C.gold;
const COLOR_B = C.blue;
const COLOR_C = C.pink;
const OUTSIDE = C.green;
const INSIDE = C.violet;

type Name = "a" | "b";
type State = "external" | "internal" | "apart" | "crossing" | "nested";

const STATUS: Record<State, { label: string; tex: string }> = {
  external: { label: "Externally tangent", tex: "d = r_A + r_B" },
  internal: { label: "Internally tangent", tex: "d = |r_A - r_B|" },
  apart: { label: "Apart", tex: "d > r_A + r_B" },
  crossing: { label: "Crossing at two points", tex: "|r_A - r_B| < d < r_A + r_B" },
  nested: { label: "One inside the other", tex: "d < |r_A - r_B|" },
};

/** `value`, or the nearest of `targets` if one is within the snapping distance. */
function snap(value: number, targets: number[]): number {
  let best = value;
  let bestOff = SNAP;
  for (const t of targets) {
    if (Math.abs(t - value) < bestOff) {
      best = t;
      bestOff = Math.abs(t - value);
    }
  }
  return best;
}

export default lesson((s) => {
  const radius = { a: 1.9, b: 1.3 };
  const gripAngle = { a: 2.3, b: 0.7 };
  // True from the step where the third circle joins and the radii are forced.
  let trio = false;

  const A = s.point(-2.6, -0.9, { label: "A", color: COLOR_A, constrain: LOW });
  const B = s.point(2.6, -0.4, { label: "B", color: COLOR_B, constrain: LOW });
  const K = s.point(0.4, 3.2, { label: "C", color: COLOR_C, constrain: HIGH });
  const rim = (centre: Vec, me: Name): Vec => polar(centre, radius[me], gripAngle[me]);
  const gripA = s.point(rim(A, "a").x, rim(A, "a").y, { color: COLOR_A });
  const gripB = s.point(rim(B, "b").x, rim(B, "b").y, { color: COLOR_B });

  // A centre lands on tangency when dragged near it, and keeps off the other centre.
  const centreRule =
    (other: Vec): Constraint =>
    (p) => {
      const q = LOW(p);
      const away = sub(q, other);
      const d = len(away);
      const dir = d < 1e-9 ? vec(1, 0) : scale(away, 1 / d);
      const tangent = trio ? d : snap(d, [radius.a + radius.b, Math.abs(radius.a - radius.b)]);
      return add(other, scale(dir, Math.max(tangent, APART)));
    };

  // A grip sets its circle's radius, again landing on tangency when close.
  const gripRule =
    (me: Name, centre: Vec, other: Vec): Constraint =>
    (p) => {
      const out = sub(p, centre);
      if (len(out) > 1e-9) gripAngle[me] = angleOf(out);
      const theirs = radius[me === "a" ? "b" : "a"];
      const d = dist(centre, other);
      const tangentRadii = [d - theirs, d + theirs, theirs - d].filter((r) => r >= R_MIN && r <= R_MAX);
      const r = clamp(len(out), R_MIN, R_MAX);
      radius[me] = trio ? r : snap(r, tangentRadii);
      return rim(centre, me);
    };

  A.constrain = centreRule(B);
  B.constrain = centreRule(A);
  gripA.constrain = gripRule("a", A, B);
  gripB.constrain = gripRule("b", B, A);

  /** Radii that make three circles about A, B and C touch in pairs. */
  const forced = (): { a: number; b: number; c: number } => {
    const ab = dist(A, B);
    const ac = dist(A, K);
    const bc = dist(B, K);
    return { a: (ab + ac - bc) / 2, b: (ab + bc - ac) / 2, c: (ac + bc - ab) / 2 };
  };

  /** Carry the grips along with their centres, and keep C off line AB. */
  const settle = (step: number): void => {
    trio = step >= 3;
    for (const [grip, centre, me] of [[gripA, A, "a"], [gripB, B, "b"]] as const) {
      const at = rim(centre, me);
      grip.x = at.x;
      grip.y = at.y;
      grip.enabled = !trio;
      grip.hidden = trio;
    }
    K.enabled = trio;
    K.hidden = !trio;

    const foot = project(K, A, B);
    if (dist(K, foot) < CLEAR) {
      const n = normalize(perp(sub(B, A)));
      const lean = dot(n, sub(K, foot)) || n.y; // on the line itself, go upward
      const at = add(foot, scale(n, lean < 0 ? -CLEAR : CLEAR));
      K.x = at.x;
      K.y = at.y;
    }
  };

  const state = (): State => {
    const d = dist(A, B);
    const sum = radius.a + radius.b;
    const diff = Math.abs(radius.a - radius.b);
    if (Math.abs(d - sum) <= TOUCH) return "external";
    if (Math.abs(d - diff) <= TOUCH) return "internal";
    if (d > sum) return "apart";
    return d < diff ? "nested" : "crossing";
  };

  return {
    steps: [
      {
        title: "Two circles, one distance",
        text: "Drag the centres $A$ and $B$, and the grips on the rims to change the radii. Compare the distance $d$ between the centres with the radii as the circles cross, separate and touch.",
      },
      {
        title: "Touching from outside",
        text: "When the circles are tangent externally, the point of contact lies on segment $AB$, one radius from each centre. So $d = r_A + r_B$. Park $B$ on the dashed green ring to see it.",
      },
      {
        title: "Touching from inside",
        text: "Slide one circle inside the other until they touch. Now the contact point lies beyond the inner centre, and $d = |r_A - r_B|$: the violet ring.",
      },
      {
        title: "Three circles in a huddle",
        text: "Add a third circle and make every pair externally tangent. Drag $A$, $B$ and $C$: the radii are now forced, because each side of the triangle is the sum of two of them.",
      },
      {
        title: "Solve for one radius",
        text: "Add $AB = r_A + r_B$ and $AC = r_A + r_C$, then subtract $BC = r_B + r_C$. Only $2r_A$ survives, so $r_A = \\tfrac12(AB + AC - BC)$.",
      },
    ],

    draw(g, f) {
      settle(f.step);
      const joined = f.at(3);
      const pair = 1 - joined;
      const fit = forced();
      const ra = mix(radius.a, fit.a, joined);
      const rb = mix(radius.b, fit.b, joined);
      const d = dist(A, B);
      const u = scale(sub(B, A), 1 / d);

      g.circle(A, ra, { color: COLOR_A });
      g.circle(B, rb, { color: COLOR_B });

      if (pair > 0) {
        // Where B's centre must sit for the circles to touch.
        if (f.at(1) > 0) {
          g.circle(A, radius.a + radius.b, { color: OUTSIDE, width: 2, dash: [6, 6], alpha: f.at(1) * pair });
        }
        if (f.at(2) > 0) {
          g.circle(A, Math.abs(radius.a - radius.b), { color: INSIDE, width: 2, dash: [6, 6], alpha: f.at(2) * pair });
        }

        g.segment(A, B, { color: C.dim, width: 2, alpha: pair });
        g.along(A, B, `d = ${fmt(d, 2)}`, { alpha: pair });
        g.segment(A, gripA, { color: COLOR_A, width: 2, alpha: pair });
        g.along(A, gripA, fmt(radius.a, 2), { color: COLOR_A, alpha: pair });
        g.segment(B, gripB, { color: COLOR_B, width: 2, alpha: pair });
        g.along(B, gripB, fmt(radius.b, 2), { color: COLOR_B, alpha: pair });

        const now = state();
        if (now === "external" || now === "internal") {
          // Internally, the contact point is on the far side of the smaller circle's centre.
          const toward = now === "external" || radius.a > radius.b ? 1 : -1;
          const contact = add(A, scale(u, toward * radius.a));
          const color = now === "external" ? OUTSIDE : INSIDE;
          g.line(contact, add(contact, perp(u)), { color, width: 2, dash: [8, 6], alpha: pair });
          g.point(contact, { color, r: 6, alpha: pair });
        } else if (now === "crossing") {
          for (const p of circleCircle(A, radius.a, B, radius.b)) g.point(p, { alpha: pair });
        }
        g.label(STATUS_AT, STATUS[now].label, {
          color: now === "external" ? OUTSIDE : now === "internal" ? INSIDE : C.ink,
          size: 18,
          bold: true,
          alpha: pair,
        });
      }

      if (joined > 0) {
        g.circle(K, fit.c, { color: COLOR_C, alpha: joined });
        // Each side of the triangle of centres is two radii meeting at a point of contact.
        const sides = [
          [A, B, fit.a, COLOR_A, COLOR_B],
          [B, K, fit.b, COLOR_B, COLOR_C],
          [K, A, fit.c, COLOR_C, COLOR_A],
        ] as const;
        for (const [p, q, fromP, colorP, colorQ] of sides) {
          const contact = lerp(p, q, fromP / dist(p, q));
          g.segment(p, contact, { color: colorP, width: 4, alpha: joined });
          g.segment(contact, q, { color: colorQ, width: 4, alpha: joined });
          g.point(contact, { alpha: joined });
          if (f.at(4) > 0) {
            g.along(p, contact, fmt(fromP, 2), { color: colorP, alpha: f.at(4) });
            g.along(contact, q, fmt(dist(p, q) - fromP, 2), { color: colorQ, alpha: f.at(4) });
          }
        }
      }
    },

    readout(f) {
      settle(f.step);
      const d = dist(A, B);

      if (trio) {
        const fit = forced();
        const ac = dist(A, K);
        const bc = dist(B, K);
        return [
          { tex: `AB = r_A + r_B = ${fmt(fit.a, 2)} + ${fmt(fit.b, 2)} = ${fmt(d, 2)}` },
          { tex: `AC = r_A + r_C = ${fmt(fit.a, 2)} + ${fmt(fit.c, 2)} = ${fmt(ac, 2)}` },
          { tex: `BC = r_B + r_C = ${fmt(fit.b, 2)} + ${fmt(fit.c, 2)} = ${fmt(bc, 2)}` },
          { label: "Radius of circle A", tex: "r_A = \\tfrac12(AB + AC - BC)" },
          {
            tex: `= \\tfrac12(${fmt(d, 2)} + ${fmt(ac, 2)} - ${fmt(bc, 2)}) = ${fmt(fit.a, 2)}`,
            tone: "good",
          },
        ];
      }

      const now = state();
      return [
        { label: "Between the centres", tex: `d = AB = ${fmt(d, 2)}` },
        {
          label: "Sum of the radii",
          tex: `r_A + r_B = ${fmt(radius.a, 2)} + ${fmt(radius.b, 2)} = ${fmt(radius.a + radius.b, 2)}`,
        },
        { label: "Difference of the radii", tex: `|r_A - r_B| = ${fmt(Math.abs(radius.a - radius.b), 2)}` },
        {
          label: STATUS[now].label,
          tex: STATUS[now].tex,
          tone: now === "external" || now === "internal" ? "good" : "plain",
        },
      ];
    },
  };
});
