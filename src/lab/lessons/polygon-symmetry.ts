// The symmetries of a regular n-gon. The learner turns a numbered copy of the
// polygon about its centre: it lands on its own outline exactly at multiples
// of 360°/n. Flipping the copy over shows the n mirror lines, and the
// half-turn is one of the rotations — a point symmetry — only when n is even.

import { C, tint } from "../draw.ts";
import { angleOf, fmt, polar, regularPolygon, sub, TAU, toDeg, toRad, vec, wrapAngle, type Vec } from "../geo.ts";
import { IMAGE, ORIGINAL } from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const CENTRE = vec(0, 0.5);
const RADIUS = 3.4;
const TOP = Math.PI / 2;
/** The copy clicks into place within this much of a matching turn. */
const SNAP = toRad(5);
const MATCH = C.green;
const MIRROR = C.gold;
const HALF_TURN = C.pink;

export default lesson((s) => {
  const sides = s.slider({ label: "n =", at: vec(-7.6, -4.3), width: 4, min: 3, max: 10, value: 5, step: 1 });
  const flipped = s.toggle("Flip it over");

  const unit = (): number => TAU / sides.value;
  /** How far `turn` is from the nearest multiple of 360°/n, and that multiple. */
  const nearest = (turn: number): { multiple: number; gap: number } => {
    const multiple = Math.round(turn / unit());
    return { multiple, gap: turn - multiple * unit() };
  };

  // Vertex 1 of the copy: dragging it round the circle turns the copy.
  const grip = s.point(CENTRE.x, CENTRE.y + RADIUS, {
    color: IMAGE,
    constrain: (p) => {
      const turn = angleOf(sub(p, CENTRE)) - TOP;
      const { multiple, gap } = nearest(turn);
      return polar(CENTRE, RADIUS, TOP + (Math.abs(gap) < SNAP ? multiple * unit() : turn));
    },
  });

  /** The copy's turn, counter-clockwise from where it started, in [0, 2π). */
  const turnNow = (): number => wrapAngle(angleOf(sub(grip, CENTRE)) - TOP);
  const matches = (): boolean => Math.abs(nearest(turnNow()).gap) < 1e-6;

  return {
    steps: [
      {
        title: "Turn it onto itself",
        text: "Drag corner 1 round the circle and watch for the copy to click onto the outline and turn green. Count the positions where it fits, then change the number of sides $n$.",
      },
      {
        title: "n rotations",
        text: "For the polygon to land on itself, corner 1 must land on a corner. The $n$ corners are spaced $360^\\circ / n$ apart as seen from the centre, so exactly the $n$ multiples of that angle work — counting the turn of $0^\\circ$.",
      },
      {
        title: "n mirror lines",
        text: "Flip the copy over: it still fits at the same turns, with its numbers now running the other way. Each gold line is a mirror of the polygon — $n$ of them, each through a corner or the middle of a side.",
      },
      {
        title: "Point symmetry",
        text: "Reflecting in the centre is a half-turn. $180^\\circ$ is a multiple of $360^\\circ / n$ only when $n$ is even: then the pink half-turned copy fits the outline. For odd $n$ every corner lands opposite a side.",
      },
    ],

    draw(g, f) {
      grip.set(grip); // a change of n moves the places where the copy clicks in
      const n = sides.value;
      const turn = turnNow();
      const fits = matches();
      const outline = regularPolygon(CENTRE, RADIUS, n, TOP);
      const sense = flipped.on ? -1 : 1;
      const corner = (i: number, r = RADIUS): Vec => polar(CENTRE, r, TOP + turn + sense * i * unit());
      const copy = Array.from({ length: n }, (_, i) => corner(i));
      const color = fits ? MATCH : IMAGE;

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        for (const p of outline) g.segment(CENTRE, p, { color: C.faint, width: 1.5, alpha });
        g.angle(outline[0], CENTRE, outline[1], {
          color: g.accent,
          fill: true,
          r: 34,
          label: `${fmt(360 / n)}°`,
          alpha,
          square: false,
        });
      }
      if (f.at(2) > 0) {
        for (let i = 0; i < n; i++) {
          const along = TOP + (i * Math.PI) / n;
          g.segment(polar(CENTRE, RADIUS + 0.6, along), polar(CENTRE, RADIUS + 0.6, along + Math.PI), {
            color: MIRROR,
            width: 1.5,
            dash: [7, 6],
            alpha: f.at(2),
          });
        }
      }

      g.polygon(outline, { color: ORIGINAL, width: 5 });
      if (f.at(3) > 0) {
        const opposite = regularPolygon(CENTRE, RADIUS, n, TOP + Math.PI);
        g.polygon(opposite, { color: HALF_TURN, width: 2.5, dash: [8, 6], alpha: f.at(3) });
        g.segment(outline[0], opposite[0], { color: HALF_TURN, width: 1.5, alpha: f.at(3) });
        g.point(opposite[0], { color: HALF_TURN, alpha: f.at(3) });
      }
      g.polygon(copy, { fill: tint(color, 0.22), color, width: 2.5 });
      copy.forEach((p, i) => {
        g.point(p, { color });
        g.label(corner(i, RADIUS - 0.5), String(i + 1), { color, bold: i === 0, size: 14 });
      });
      g.point(CENTRE, { color: C.dim });
      if (fits) g.label(CENTRE, "fits", { color: MATCH, bold: true, size: 18, dy: -22 });
    },

    readout(f) {
      const n = sides.value;
      const step = 360 / n;
      const turn = toDeg(turnNow());
      const fits = matches();
      const even = n % 2 === 0;
      const which = Math.round(turn / step) % n; // a full turn is the same as none
      const rows: Readout[] = [
        {
          label: "Smallest turn that fits",
          tex: `\\frac{360^\\circ}{n} = \\frac{360^\\circ}{${n}} = ${fmt(step)}^\\circ`,
        },
        fits
          ? {
              label: "Your turn",
              tex: `${fmt(which * step)}^\\circ = ${which} \\times ${fmt(step)}^\\circ`,
              tone: "good",
            }
          : { label: "Your turn: not a symmetry", tex: `${fmt(turn)}^\\circ`, tone: "warn" },
      ];
      if (f.step >= 1) rows.push({ label: "Rotations, counting $0^\\circ$", tex: `n = ${n}` });
      if (f.step >= 2) {
        rows.push({ label: "Mirror lines", tex: `n = ${n}` }, { label: "Symmetries in all", tex: `2n = ${2 * n}` });
      }
      if (f.step >= 3) {
        rows.push({
          label: even ? "Point symmetry: yes" : "Point symmetry: no",
          tex: `180^\\circ = ${fmt(n / 2)} \\times ${fmt(step)}^\\circ`,
          tone: even ? "good" : "warn",
        });
      }
      return rows;
    },
  };
});
