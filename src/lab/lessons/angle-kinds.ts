// The kinds of angle, and the units they are measured in. One ray is fixed and
// the other swings all the way round a dial; the angle swept is named (acute,
// right, obtuse, straight, reflex) and read out as a fraction of a turn, in
// radians, and in degrees, minutes and seconds.

import { C } from "../draw.ts";
import { angleOf, clamp, fmt, polar, sub, TAU, toDeg, toRad, vec, wrapAngle } from "../geo.ts";
import { lesson } from "../scene.ts";

const O = vec(0, -0.3);
const DIAL = 3.4;
const E = polar(O, DIAL, 0);
const START = polar(O, DIAL, toRad(52.3));
const SNAP_EVERY = 15; // degrees: the dial catches on these marks…
const SNAP_WITHIN = 0.8; // …when the ray is this close
const MIN_DEG = 1;
const MAX_DEG = 359;
const EXACT = 1e-6;

const QUARTERS = [
  { deg: 90, radians: "π/2" },
  { deg: 180, radians: "π" },
  { deg: 270, radians: "3π/2" },
  { deg: 360, radians: "2π" },
];

function kind(deg: number): { name: string; color: string } {
  if (Math.abs(deg - 90) < EXACT) return { name: "right", color: C.gold };
  if (Math.abs(deg - 180) < EXACT) return { name: "straight", color: C.violet };
  if (deg < 90) return { name: "acute", color: C.green };
  if (deg < 180) return { name: "obtuse", color: C.red };
  return { name: "reflex", color: C.cyan };
}

/** Degrees, minutes and seconds of an angle, rounded to the nearest second. */
function dms(deg: number): { d: number; m: number; s: number } {
  const seconds = Math.round(deg * 3600);
  return { d: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60), s: seconds % 60 };
}

export default lesson((s) => {
  const P = s.point(START.x, START.y, {
    label: "P",
    constrain: (p) => {
      const raw = toDeg(wrapAngle(angleOf(sub(p, O))));
      const mark = Math.round(raw / SNAP_EVERY) * SNAP_EVERY;
      const deg = Math.abs(raw - mark) < SNAP_WITHIN ? mark : raw;
      return polar(O, DIAL, toRad(clamp(deg, MIN_DEG, MAX_DEG)));
    },
  });

  /** The angle swept counter-clockwise from ray OE round to ray OP. */
  const swept = (): number => wrapAngle(angleOf(sub(P, O)));

  return {
    steps: [
      {
        title: "Swing the ray",
        text: "Drag $P$ all the way round. The angle is the fraction of a full turn the ray has swept, and its name changes at $90^\\circ$ and $180^\\circ$: acute, right, obtuse, straight, reflex.",
      },
      {
        title: "Two ways to count a turn",
        text: "A full turn is $360^\\circ$, or $2\\pi$ radians. Converting is a change of units: multiply degrees by $\\frac{2\\pi}{360^\\circ}$. Find $\\frac{\\pi}{3}$ and $\\frac{3\\pi}{4}$ on the dial.",
      },
      {
        title: "Finer than a degree",
        text: "A degree splits into $60$ minutes, and a minute into $60$ seconds, so $20.5^\\circ$ is $20^\\circ\\,30'$. Nudge the ray between the marks and read the panel.",
      },
    ],

    draw(g, f) {
      const theta = swept();
      const deg = toDeg(theta);
      const { name, color } = kind(deg);

      // The dial: a tick every 10°, longer every 30°, numbered at the quarters.
      g.circle(O, DIAL, { color: C.faint, width: 1.5 });
      for (let mark = 0; mark < 360; mark += 10) {
        const inner = DIAL - g.px(mark % 30 === 0 ? 12 : 6);
        g.segment(polar(O, inner, toRad(mark)), polar(O, DIAL, toRad(mark)), { color: C.dim, width: 1.5 });
      }
      for (const q of QUARTERS) {
        const at = polar(O, DIAL + g.px(26), toRad(q.deg));
        const drop = q.deg === 360 ? -24 : 0; // keep clear of the fixed ray
        g.label(at, `${q.deg}°`, { color: C.dim, size: 13, dy: 9 + drop });
        if (f.at(1) > 0) g.label(at, q.radians, { color: g.accent, size: 13, dy: -9 + drop, alpha: f.at(1) });
      }

      g.arc(O, DIAL, 0, theta, { color, width: 5 });
      g.ray(O, E, { color: C.ink });
      g.ray(O, P, { color: C.ink });
      g.angleMark(O, 0, theta, { color, fill: true, r: 56, label: `${fmt(deg)}°` });
      g.point(O, { label: "O" });
      g.label(O, name, { color, dy: -32, size: 20, bold: true });
    },

    readout() {
      const theta = swept();
      const deg = toDeg(theta);
      const turn = theta / TAU;
      const { d, m, s: sec } = dms(deg);
      return [
        { label: "Measure in degrees", tex: `\\theta = ${fmt(deg, 2)}^\\circ` },
        { label: "Kind", tex: `\\text{${kind(deg).name}}` },
        { label: "Fraction of a full turn", tex: `\\frac{\\theta}{360^\\circ} = ${fmt(turn, 3)}` },
        { label: "Measure in radians", tex: `${fmt(turn, 3)} \\cdot 2\\pi = ${fmt(deg / 180, 3)}\\,\\pi = ${fmt(theta, 3)}` },
        { label: "Degrees, minutes, seconds", tex: `${d}^\\circ\\,${m}'\\,${sec}''` },
      ];
    },
  };
});
