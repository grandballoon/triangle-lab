// Complex numbers as points of a plane, and adding them. A number a + bi has
// a real part and an imaginary part, so it needs two axes; adding two numbers
// adds their parts separately, which lays their arrows head to tail.

import { C, tint } from "../draw.ts";
import { both, inBox, snapToGrid } from "../geo.ts";
import { cx, minus, plane, plus, texCx, texFactor, texTerm, textCx, vector } from "../kit/complex.ts";
import { lesson, type Readout } from "../scene.ts";
import impedanceSeriesImage from "../../images/impedance-series.svg";
import walkingLegsSumImage from "../../images/walking-legs-sum.svg";

const Z = C.cyan;
const W = C.pink;
const SUM = C.gold;

export default lesson((s) => {
  const keep = both(snapToGrid(1), inBox(-7, 7, -4, 4));
  const z = s.point(3, 1, { label: "z", color: Z, constrain: keep });
  const w = s.point(1, 2, { label: "w", color: W, constrain: keep });

  return {
    steps: [
      {
        title: "A number with two parts",
        text: "A complex number is $z = a + bi$, with $a$ and $b$ real. Its real part is $a$ and its imaginary part is $b$, so it needs two axes: draw $z$ as the point $(a, b)$. The real numbers lie along the horizontal axis and the pure imaginary numbers $bi$ up the vertical one.",
      },
      {
        title: "Adding adds the parts",
        text: "$(a + bi) + (c + di) = (a + c) + (b + d)i$: real parts add to real parts, imaginary to imaginary. On the plane that is moving $c$ across and $d$ up from $z$, so $z + w$ sits where $w$'s arrow ends when it starts at $z$'s tip, the far corner of a parallelogram.",
      },
      {
        title: "Subtracting",
        text: "$z - w = (a - c) + (b - d)i$. It is the number you add to $w$ to get $z$, so it is the arrow from $w$ to $z$, slid back to start at 0. Two complex numbers are equal only when both their parts are equal.",
      },
    ],

    draw(g, f) {
      plane(g);
      const zz = cx(z.x, z.y);
      const ww = cx(w.x, w.y);

      if (f.step === 0) {
        g.segment({ x: z.x, y: 0 }, z, { color: Z, width: 2, dash: [4, 4] });
        g.segment({ x: 0, y: z.y }, z, { color: Z, width: 2, dash: [4, 4] });
        g.label({ x: z.x, y: 0 }, "real part", { color: Z, size: 12, dy: z.y >= 0 ? -16 : 10 });
        g.label({ x: 0, y: z.y }, "imaginary part", { color: Z, size: 12, dx: z.x >= 0 ? -10 : 10, align: z.x >= 0 ? "right" : "left" });
        vector(g, zz, { color: Z, label: textCx(zz) });
        vector(g, ww, { color: W, label: textCx(ww), alpha: 0.4 });
        return;
      }

      if (f.step === 1) {
        const sum = plus(zz, ww);
        g.polygon([cx(0, 0), zz, sum, ww], { color: SUM, fill: tint(SUM, 0.08), width: 1, alpha: 0.6 });
        vector(g, zz, { color: Z });
        vector(g, ww, { color: W, alpha: 0.5 });
        vector(g, ww, { color: W, from: zz });
        vector(g, sum, { color: SUM, label: `z + w = ${textCx(sum)}` });
        return;
      }

      const diff = minus(zz, ww);
      vector(g, zz, { color: Z, alpha: 0.5 });
      vector(g, ww, { color: W, alpha: 0.5 });
      vector(g, diff, { color: SUM, from: ww, dash: [6, 5] });
      vector(g, diff, { color: SUM, label: `z − w = ${textCx(diff)}` });
    },

    readout(f) {
      const zz = cx(z.x, z.y);
      const ww = cx(w.x, w.y);
      const rows: Readout[] = [
        { label: "z", tex: `z = ${texCx(zz)}`, tone: "plain" },
        { label: "w", tex: `w = ${texCx(ww)}` },
      ];
      if (f.step === 0) {
        rows.push({ label: "Parts of z", tex: `\\operatorname{Re} z = ${z.x},\\quad \\operatorname{Im} z = ${z.y}` });
      } else if (f.step === 1) {
        rows.push({
          label: "Sum",
          tex: `${texFactor(zz)} + ${texFactor(ww)} = (${z.x} + ${texTerm(w.x)}) + (${z.y} + ${texTerm(w.y)})i = ${texCx(plus(zz, ww))}`,
          tone: "good",
        });
      } else {
        rows.push({
          label: "Difference",
          tex: `${texFactor(zz)} - ${texFactor(ww)} = (${z.x} - ${texTerm(w.x)}) + (${z.y} - ${texTerm(w.y)})i = ${texCx(minus(zz, ww))}`,
          tone: "good",
        });
      }
      return rows;
    },

    likes: [
      {
        title: "Mixed shopping",
        text: "Two bags, one with 3 apples and 1 pear, one with 1 apple and 2 pears, make 4 apples and 3 pears together. Nobody adds apples to pears. The real and imaginary parts of complex numbers are kept apart in just the same way when you add.",
      },
      {
        title: "Directions on a grid",
        text: "\"Three east, one north\" and then \"one east, two north\" leaves you four east and three north of where you began. The order of the two legs does not matter, which is why $z + w = w + z$: both routes reach the same corner of the parallelogram.",
      },
    ],

    uses: [
      {
        title: "Adding the legs of a walk",
        text: "Write each leg of a walk on a street grid as a complex number, east as the real part and north as the imaginary part. Walking $3 + 2i$ blocks and then $1 + 4i$ leaves you at $4 + 6i$, 4 east and 6 north of the start, however many legs and in whatever order.",
        tags: ["navigation", "travel"],
        image: {
          src: walkingLegsSumImage,
          caption: "Two legs of a walk, 3 + 2i blocks and then 1 + 4i, add to 4 + 6i: the east parts and the north parts add separately.",
          alt: "Seen from above, a grid of city blocks with a blue arrow 3 + 2i and a red arrow 1 + 4i head to tail, and a gold dashed arrow from start to finish labelled 4 + 6i.",
        },
      },
      {
        title: "Impedances in series",
        text: "Engineers describe how a part resists alternating current by a complex impedance: resistance as the real part, and the reactance of coils and capacitors as the imaginary part, written with $j$. Parts in series add: a 30 Ω resistor and a coil of 40 Ω reactance make $30 + 40j$ ohms. Its size, $\\sqrt{30^2 + 40^2} = 50$ Ω, sets how much current flows.",
        tags: ["electrical"],
        image: {
          src: impedanceSeriesImage,
          caption: "A 30 Ω resistor in series with a coil of 40 Ω reactance has impedance 30 + 40j ohms, of size 50 Ω.",
          alt: "A zigzag resistor and a coil in a row, and beside them a right triangle with legs 30 and 40 and a gold dashed hypotenuse 50.",
        },
      },
    ],
  };
});
