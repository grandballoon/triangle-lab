// Circumference ÷ diameter is the same for every circle. A wheel rolls one
// turn along the ground, leaving its rim behind as a straight trail; copies of
// the diameter laid along the trail fit three times and a bit, whatever the
// size of the wheel.

import { C, tint } from "../draw.ts";
import { add, clamp, fmt, polar, sub, TAU, vec } from "../geo.ts";
import { lesson } from "../scene.ts";

const START_X = -7.2;
const GROUND_Y = -0.8;
const RULER_Y = GROUND_Y - 0.9;
const DIAMETER = C.gold;
const LEFTOVER = C.orange;

export default lesson((s) => {
  const d = s.slider({ label: "d =", at: vec(START_X, -4.3), width: 4, min: 1.5, max: 4, value: 2.6, step: 0.1 });

  // How much of one full turn the wheel has rolled, 0 to 1. Kept as a fraction
  // so that a wheel parked at the end stays at the end when it is resized.
  let turn = 0.35;
  const centreAt = (t: number) => vec(START_X + t * Math.PI * d.value, GROUND_Y + d.value / 2);
  const start = centreAt(turn);
  const wheel = s.point(start.x, start.y, {
    constrain: (p) => {
      turn = clamp((p.x - START_X) / (Math.PI * d.value), 0, 1);
      return centreAt(turn);
    },
  });

  return {
    steps: [
      {
        title: "Roll the wheel",
        text: "Drag the wheel to the right through one full turn. Its rim peels off onto the ground, so the finished trail is exactly as long as the circumference $C$.",
      },
      {
        title: "Measure it in diameters",
        text: "Lay copies of the diameter $d$ along the trail. Three fit, with a little left over: about $0.14$ of a diameter.",
      },
      {
        title: "Every circle agrees",
        text: "Change $d$ with the slider and roll again. The trail is always the same number of diameters long. That number is $\\pi \\approx 3.14$, so $C = \\pi d = 2\\pi r$.",
      },
    ],

    likes: [
      {
        title: "Walking round a pond",
        text: "However big a round pond is, walking all the way round it is just over three times as far as rowing straight across through the middle. A bigger pond makes both trips longer by the same factor, so that ratio never changes: it is $\\pi$.",
      },
      {
        title: "Rolling a coin along a ruler",
        text: "Mark a point on a coin's edge and roll it one full turn along a ruler: the distance it travels is its circumference, the rim laid out flat. Lay the coin's width along that distance and it fits just over three times, whichever coin you use.",
      },
    ],

    uses: [
      {
        title: "A trundle wheel",
        text: "Groundskeepers and surveyors measure distances with a trundle wheel, a wheel on a handle that clicks once per turn. A wheel whose circumference is exactly $1$ metre has diameter $\\frac{1}{\\pi} \\approx 0.318$ metres, so each click means one metre walked.",
      },
      {
        title: "A bike computer",
        text: "A cycle computer counts turns of the wheel using a magnet on a spoke, and you tell it the wheel's circumference. A wheel about $0.67$ metres across rolls $\\pi \\times 0.67 \\approx 2.1$ metres per turn, so $1000$ turns is about $2.1$ km.",
      },
      {
        title: "Ribbon round a cake",
        text: "To tie a ribbon round a round cake $20$ cm across, you need $\\pi \\times 20 \\approx 63$ cm of ribbon, plus a little extra for the bow.",
      },
    ],

    draw(g, f) {
      wheel.set(centreAt(turn));
      const r = d.value / 2;
      const around = Math.PI * d.value;
      const rolled = turn * TAU; // radians the wheel has turned, clockwise
      const end = START_X + around;
      const tick = g.px(8);

      // Ground, with the whole turn marked out and the part laid so far lit.
      g.segment(vec(START_X - 0.5, GROUND_Y), vec(7.7, GROUND_Y), { color: C.faint, width: 2 });
      for (const x of [START_X, end]) {
        g.segment(vec(x, GROUND_Y - tick), vec(x, GROUND_Y + tick), { color: C.dim, width: 2 });
      }
      g.segment(vec(START_X, GROUND_Y), vec(wheel.x, GROUND_Y), { color: g.accent, width: 5 });

      // The wheel: the rim still to be laid down stays lit, and a diameter
      // turns with it.
      const mark = polar(wheel, r, -Math.PI / 2 - rolled);
      g.circle(wheel, r, { color: C.dim, width: 2, fill: tint(g.accent, 0.08) });
      if (turn < 1) g.arc(wheel, r, -Math.PI / 2, -Math.PI / 2 + TAU - rolled, { color: g.accent, width: 5 });
      g.segment(mark, sub(add(wheel, wheel), mark), { color: DIAMETER, width: 3 });
      g.point(mark, { color: g.accent });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        for (let i = 0; i < 3; i++) {
          const a = vec(START_X + i * d.value, RULER_Y);
          const b = vec(a.x + d.value, RULER_Y);
          g.segment(a, b, { color: DIAMETER, width: 4, alpha });
          g.segment(vec(b.x, RULER_Y - tick), vec(b.x, RULER_Y + tick), { color: DIAMETER, width: 2, alpha });
          g.along(a, b, "d", { color: DIAMETER, offset: -18, alpha });
        }
        g.segment(vec(START_X, RULER_Y - tick), vec(START_X, RULER_Y + tick), { color: DIAMETER, width: 2, alpha });
        g.segment(vec(START_X + 3 * d.value, RULER_Y), vec(end, RULER_Y), { color: LEFTOVER, width: 4, alpha });
        g.segment(vec(end, RULER_Y), vec(end, GROUND_Y), { color: C.dim, width: 1.5, dash: [4, 4], alpha });
        g.label(vec(end, RULER_Y), "+ 0.14 d", { color: LEFTOVER, size: 14, align: "left", dx: 10, alpha });
      }
    },

    readout() {
      const r = d.value / 2;
      const around = Math.PI * d.value;
      const laid = turn * around;
      return [
        { label: "Diameter", tex: `d = 2r = 2(${fmt(r, 2)}) = ${fmt(d.value, 2)}` },
        { label: "Trail so far", tex: `${fmt(laid, 2)} = ${fmt(laid / d.value, 2)}\\,d` },
        { label: "One full turn", tex: `C = \\pi d = 2\\pi r = ${fmt(around, 2)}` },
        {
          label: "The same for every circle",
          tex: `\\frac{C}{d} = \\frac{${fmt(around, 2)}}{${fmt(d.value, 2)}} = ${fmt(around / d.value, 4)}\\ldots`,
          tone: "good",
        },
      ];
    },
  };
});
