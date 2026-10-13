// Two lines cut by a transversal. While the lines are parallel, alternate
// interior angles and corresponding angles are equal and same-side interior
// angles are supplementary. Tilting one line breaks all three relationships by
// exactly the tilt — which is the converse: the angles agree only for parallels.

import { C } from "../draw.ts";
import { add, angleAt, angleOf, clamp, fmt, lerp, normalize, onSegment, sub, toDeg, vec, type Vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const TOP_Y = 1.8;
const LOW_Y = -1.6;
const TOP_LEFT = vec(-7, TOP_Y);
const TOP_RIGHT = vec(7, TOP_Y);
const PIVOT = vec(-6.6, LOW_Y);
const TILT_X = 6.6;
const TILT_SNAP = 0.15; // the tilt handle catches on "parallel"
const EAST = vec(1, 0);
const EQUAL = C.gold; // the angle at Y and the two at X that match it
const REST = C.blue; // the same-side angle at X

const PAIRS = ["alternate interior", "corresponding", "same-side interior"] as const;
type Pair = (typeof PAIRS)[number];

export default lesson((s) => {
  const tilt = s.point(TILT_X, LOW_Y, {
    label: "tilt",
    color: C.violet,
    constrain: (p) => {
      const y = clamp(p.y, -3.2, -0.4);
      return vec(TILT_X, Math.abs(y - LOW_Y) < TILT_SNAP ? LOW_Y : y);
    },
  });
  const X = s.point(1.6, TOP_Y, { label: "X", constrain: onSegment(vec(-4.5, TOP_Y), vec(4.5, TOP_Y)) });
  const Y = s.point(-1.4, LOW_Y, {
    label: "Y",
    constrain: onSegment(
      () => lerp(PIVOT, tilt, 0.18),
      () => lerp(PIVOT, tilt, 0.82),
    ),
  });
  const pair = s.choice("Pair", PAIRS);

  const figure = () => {
    Y.set(Y); // stay on the lower line as it tilts
    const up = normalize(sub(X, Y)); // along the transversal, from Y toward X
    const along = normalize(sub(tilt, PIVOT)); // along the lower line
    const beyond = add(X, up); // past X, outside the two lines
    const back = sub(X, up); // toward Y, between the lines
    const mark = (a: Vec, b: Vec) => ({ arms: [a, b] as const, deg: toDeg(angleAt(a, X, b)) });
    const atX: Record<Pair, ReturnType<typeof mark>> = {
      "alternate interior": mark(back, sub(X, EAST)),
      corresponding: mark(beyond, add(X, EAST)),
      "same-side interior": mark(back, add(X, EAST)),
    };
    return {
      atX,
      yArm: add(Y, along),
      beta: toDeg(angleAt(X, Y, add(Y, along))),
      turned: toDeg(angleOf(along)),
      parallel: tilt.y === LOW_Y,
    };
  };

  return {
    steps: [
      {
        title: "A line across two parallels",
        text: "Lines $\\ell$ and $m$ are parallel. Drag $X$ and $Y$ to swing the transversal, and pick a pair of angles above. Two kinds of pair stay equal; the third always adds up to $180^\\circ$.",
      },
      {
        title: "Why the pairs go together",
        text: "At $X$, the corresponding angle is vertical to the alternate interior one, so both equal the angle at $Y$. The same-side angle is their neighbour along $\\ell$, so it is what remains of $180^\\circ$.",
      },
      {
        title: "Break the parallels",
        text: "Now drag the tilt handle to turn $m$. Every relationship fails at once, and by exactly the angle $m$ has turned. Straighten $m$ and they all return.",
      },
      {
        title: "Reading it backwards",
        text: "So the test runs both ways: if a transversal makes equal alternate interior or corresponding angles, or supplementary same-side angles, the two lines must be parallel.",
      },
    ],

    draw(g, f) {
      const { atX, yArm, beta, parallel } = figure();

      g.line(TOP_LEFT, TOP_RIGHT, { color: C.ink });
      g.line(PIVOT, tilt, { color: C.ink });
      g.line(X, Y, { color: g.accent });
      g.label(TOP_LEFT, "ℓ", { dy: 16, size: 17 });
      g.label(PIVOT, "m", { dy: 16, size: 17 });
      if (parallel) {
        g.chevrons(vec(5, TOP_Y), vec(6.2, TOP_Y), 1, { color: C.dim });
        g.chevrons(vec(5, LOW_Y), vec(6.2, LOW_Y), 1, { color: C.dim });
      }

      for (const kind of PAIRS) {
        const { arms, deg } = atX[kind];
        const color = kind === "same-side interior" ? REST : EQUAL;
        if (kind === pair.value) {
          g.angle(arms[0], X, arms[1], { color, fill: true, r: 36, label: `${fmt(deg)}°` });
        } else if (f.at(1) > 0) {
          g.angle(arms[0], X, arms[1], { color, r: 28, width: 2, alpha: 0.7 * f.at(1) });
        }
      }
      g.angle(X, Y, yArm, { color: EQUAL, fill: true, r: 36, label: `${fmt(beta)}°` });
    },

    readout() {
      const { atX, beta, turned, parallel } = figure();
      const alpha = atX[pair.value].deg;
      const relation =
        pair.value === "same-side interior"
          ? { label: "Same-side interior: supplementary?", tex: `\\alpha + \\beta = ${fmt(alpha + beta)}^\\circ` }
          : {
              label: pair.value === "corresponding" ? "Corresponding: equal?" : "Alternate interior: equal?",
              tex: parallel ? "\\alpha = \\beta" : `\\alpha - \\beta = ${fmt(alpha - beta)}^\\circ`,
            };
      return [
        {
          label: "The two lines",
          tex: parallel ? "\\ell \\parallel m" : `m \\text{ is turned } ${fmt(turned)}^\\circ`,
          tone: parallel ? "good" : "warn",
        },
        { label: "Angle at X", tex: `\\alpha = ${fmt(alpha)}^\\circ` },
        { label: "Angle at Y", tex: `\\beta = ${fmt(beta)}^\\circ` },
        { ...relation, tone: parallel ? "good" : "warn" },
      ];
    },
  };
});
