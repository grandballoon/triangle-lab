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

    likes: [
      {
        title: "The minute hand of a clock",
        text: "The minute hand sweeps a full turn, $360^\\circ$, every hour. A quarter of an hour is a right angle and half an hour a straight angle. Twenty minutes is a third of a turn, $120^\\circ$, which is obtuse, and forty minutes is past halfway: a reflex angle.",
      },
      {
        title: "Swapping cups for millilitres",
        text: "A recipe in cups and the same recipe in millilitres ask for the same amount of flour; only the unit is different, and you convert by multiplying by a fixed rate. Degrees and radians are two units for the same turn: a full turn is $360^\\circ$ or $2\\pi$ radians, so you multiply degrees by $\\frac{2\\pi}{360^\\circ}$.",
      },
      {
        title: "Splitting an hour",
        text: "A degree breaks into $60$ minutes and each minute into $60$ seconds, just like an hour. So $20.5^\\circ$ is $20^\\circ\\,30'$, the same way $2.5$ hours is $2$ hours $30$ minutes.",
      },
    ],

    uses: [
      {
        title: "Spinning tricks",
        text: "Skateboarders and snowboarders name spins by how far they turn: a 180 lands you riding backwards, a 360 brings you round to face the way you started, and a 540 is one and a half turns.",
      },
      {
        title: "Reading a GPS position",
        text: "Latitude and longitude are angles, often written in degrees, minutes and seconds. One minute of latitude is about $1852$ metres, a nautical mile, so one second is about $31$ metres: a position to the nearest second pins down a spot about the size of a house plot.",
      },
      {
        title: "Turning a sprite in a game",
        text: "Most programming languages measure angles in radians: in JavaScript, Math.cos(90) is the cosine of $90$ radians, not of $90^\\circ$. To turn a sprite a quarter turn, a game programmer passes $\\frac{\\pi}{2}$, converting with $90 \\cdot \\frac{2\\pi}{360} = \\frac{\\pi}{2}$.",
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
