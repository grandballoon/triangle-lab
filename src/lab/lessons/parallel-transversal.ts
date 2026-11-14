// Two lines cut by a transversal, all eight angles shown at once and coloured
// by measure. While the lines are parallel they come in just two sizes, so
// alternate interior and corresponding angles share a colour, and a
// same-side interior pair is one of each colour, adding to 180°. Tilting one
// line gives the angles at Y sizes, and colours, of their own, off by exactly
// the tilt — the converse: the angles agree only for parallels.

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

// One colour per measure. The angles at Y take X's colours while the lines
// are parallel, and colours of their own once m is tilted.
const AT_X = { lean: C.gold, open: C.blue } as const;
const AT_Y_TILTED = { lean: C.green, open: C.orange } as const;

/** The four angles at a crossing, as arms about the vertex, numbered as usual. */
interface Crossing {
  at: Vec;
  /** 1 or 5: above the line, to the west. */
  upWest: readonly [Vec, Vec];
  /** 2 or 6: above, to the east. */
  upEast: readonly [Vec, Vec];
  /** 3 or 7: below, to the west. */
  downWest: readonly [Vec, Vec];
  /** 4 or 8: below, to the east. */
  downEast: readonly [Vec, Vec];
}

function crossing(at: Vec, up: Vec, east: Vec): Crossing {
  const [n, s, e, w] = [add(at, up), sub(at, up), add(at, east), sub(at, east)];
  return { at, upWest: [n, w], upEast: [n, e], downWest: [s, w], downEast: [s, e] };
}

const measure = (c: Crossing, arms: readonly [Vec, Vec]): number => toDeg(angleAt(arms[0], c.at, arms[1]));

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

  const figure = () => {
    Y.set(Y); // stay on the lower line as it tilts
    const up = normalize(sub(X, Y)); // along the transversal, from Y toward X
    const along = normalize(sub(tilt, PIVOT)); // along the lower line
    const x = crossing(X, up, EAST);
    const y = crossing(Y, up, along);
    return {
      x,
      y,
      // "lean" is the size of angles 2, 3, 6 and 7; "open" of 1, 4, 5 and 8.
      lean: { x: measure(x, x.upEast), y: measure(y, y.upEast) },
      open: { x: measure(x, x.upWest), y: measure(y, y.upWest) },
      turned: toDeg(angleOf(along)),
      parallel: tilt.y === LOW_Y,
    };
  };

  return {
    steps: [
      {
        title: "Eight angles, two sizes",
        text: "Lines $\\ell$ and $m$ are parallel, and a transversal crosses both, making four angles at $X$ and four at $Y$. Drag $X$ and $Y$ to swing it: all eight come in just two sizes. Every gold angle equals every other gold one, every blue equals every blue, and a gold and a blue together make $180^\\circ$.",
      },
      {
        title: "The pairs, by their shapes",
        text: "Alternate interior angles sit between the parallels on opposite sides of the transversal, in the corners of a Z: same colour, so equal. Corresponding angles sit in the same place at each crossing, as in an F: same colour, so equal. Same-side interior angles sit between the parallels on one side, as in a C: one gold and one blue, so they add to $180^\\circ$.",
      },
      {
        title: "Why two sizes",
        text: "At each crossing, angles facing each other are vertical angles, so they are equal, and neighbours along a line make $180^\\circ$. That leaves two sizes per crossing. The transversal meets $\\ell$ and $m$ at the same slant because they run the same way, so the two crossings share their sizes.",
      },
      {
        title: "Break the parallels",
        text: "Now drag the tilt handle to turn $m$. The angles at $Y$ take sizes, and colours, of their own: every relationship fails at once, and by exactly the angle $m$ has turned. Straighten $m$ and the colours match again.",
      },
      {
        title: "Reading it backwards",
        text: "So the test runs both ways: if a transversal makes equal alternate interior or corresponding angles, or supplementary same-side angles, the two lines must be parallel.",
      },
    ],

    likes: [
      {
        title: "Driving across railway tracks",
        text: "Drive straight across a pair of railway rails and your road crosses each rail at exactly the same slant, because the rails run in the same direction. The second crossing is a copy of the first slid along the road, so the matching angles are equal. If the rails splayed apart, the two crossings would differ by exactly the splay.",
      },
      {
        title: "Angled parking bays",
        text: "In a car park with slanted bays, every bay line meets the kerb at the same angle, and that alone keeps the lines parallel, so you swing into each bay the same way. Paint one line at a different angle and that bay would narrow towards one end.",
      },
    ],

    uses: [
      {
        title: "Drawing parallel lines with a set square",
        text: "Draughtspeople and carpenters draw parallel lines by sliding a set square along a straight edge and drawing along its side at each stop. The side always meets the straight edge at the same angle, so, reading the rule backwards, every line drawn is parallel.",
      },
      {
        title: "Measuring the Earth",
        text: "Sunlight arrives in parallel rays. In Eratosthenes' famous measurement, at noon on midsummer the Sun was overhead at Syene, while at Alexandria a stick's shadow showed the rays coming in $7.2^\\circ$ from vertical. The two vertical lines meet at the Earth's centre, and the alternate angle there is also $7.2^\\circ$, one fiftieth of a circle, so the Earth's circumference is fifty times the distance between the two cities.",
      },
    ],

    draw(g) {
      const { x, y, parallel } = figure();

      g.line(TOP_LEFT, TOP_RIGHT, { color: C.ink });
      g.line(PIVOT, tilt, { color: C.ink });
      g.line(X, Y, { color: g.accent });
      g.label(TOP_LEFT, "ℓ", { dy: 16, size: 17 });
      g.label(PIVOT, "m", { dy: 16, size: 17 });
      if (parallel) {
        g.chevrons(vec(5, TOP_Y), vec(6.2, TOP_Y), 1, { color: C.dim });
        g.chevrons(vec(5, LOW_Y), vec(6.2, LOW_Y), 1, { color: C.dim });
      }

      const mark = (c: Crossing, colors: { lean: string; open: string }) => {
        for (const [arms, color] of [
          [c.upWest, colors.open],
          [c.upEast, colors.lean],
          [c.downWest, colors.lean],
          [c.downEast, colors.open],
        ] as const) {
          g.angle(arms[0], c.at, arms[1], { color, fill: true, r: 30, label: `${fmt(measure(c, arms))}°` });
        }
      };
      mark(x, AT_X);
      mark(y, parallel ? AT_X : AT_Y_TILTED);
    },

    readout() {
      const { lean, open, turned, parallel } = figure();
      const deg = (v: number) => `${fmt(v)}^\\circ`;
      const same = (a: number, b: number) => (parallel ? `${deg(a)} = ${deg(b)}` : `${deg(a)} \\ne ${deg(b)}`);
      const tone = parallel ? "good" : "warn";
      return [
        {
          label: "The two lines",
          tex: parallel ? "\\ell \\parallel m" : `m \\text{ is turned } ${fmt(turned)}^\\circ`,
          tone,
        },
        { label: "Alternate interior: equal?", tex: same(lean.x, lean.y), tone },
        { label: "Corresponding: equal?", tex: same(open.x, open.y), tone },
        { label: "Same-side interior: supplementary?", tex: `${deg(lean.x)} + ${deg(open.y)} = ${deg(lean.x + open.y)}`, tone },
      ];
    },
  };
});
