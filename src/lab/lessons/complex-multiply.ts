// Multiplying complex numbers. Expanding (a + bi)(c + di) with i² = −1 gives
// the rule; on the plane, multiplying by a real number stretches, multiplying
// by i makes a quarter turn, and in general the lengths multiply while the
// angles from the real axis add.

import { C } from "../draw.ts";
import { angleOf, both, fmt, inBox, polar, snapToGrid, toDeg, TAU } from "../geo.ts";
import { cx, plane, size, texCx, texFactor, texTerm, textCx, times, vector } from "../kit/complex.ts";
import { lesson, type Readout } from "../scene.ts";
import spriteRotationImage from "../../images/sprite-rotation.svg";
import starTrailsPoleImage from "../../images/star-trails-hourly.svg";

const Z = C.cyan;
const W = C.pink;
const PRODUCT = C.gold;

/** Angle from the positive real axis, from 0 up to a full turn. */
const turn = (v: { x: number; y: number }): number => ((angleOf(v) % TAU) + TAU) % TAU;

export default lesson((s) => {
  const keep = both(snapToGrid(0.5), inBox(-3, 3, -3, 3));
  const z = s.point(2, 1, { label: "z", color: Z, constrain: keep });
  const w = s.point(1, 1, { label: "w", color: W, constrain: keep });

  return {
    steps: [
      {
        title: "Multiply it out",
        text: "Multiply term by term, then use $i^2 = -1$: $(a + bi)(c + di) = ac + adi + bci + bdi^2 = (ac - bd) + (ad + bc)i$. So $(2 + i)(1 + i) = 2 + 2i + i + i^2 = 1 + 3i$. Drag $z$ and $w$ to try others.",
      },
      {
        title: "Stretches and turns",
        text: "Two cases are easy to see. Multiplying by a positive real number, like 2, stretches the arrow: $2z$ points the same way, twice as long. Multiplying by $i$ turns it a quarter turn: $i(a + bi) = -b + ai$. Drag $w$ to $2$ or to $i$ and watch the product.",
      },
      {
        title: "Lengths multiply, angles add",
        text: "In general the product does both. Its length is the length of $z$ times the length of $w$, and its angle from the real axis is $z$'s angle plus $w$'s. With $w = 1 + i$, the product is $z$ turned $45^\\circ$ and stretched by $\\sqrt2$.",
      },
    ],

    draw(g, f) {
      plane(g);
      const zz = cx(z.x, z.y);
      const ww = cx(w.x, w.y);
      const p = times(zz, ww);

      if (f.step === 1) {
        // The two easy products, as ghosts.
        vector(g, times(zz, cx(2, 0)), { color: Z, dash: [5, 5], alpha: 0.6, label: "2z" });
        vector(g, times(zz, cx(0, 1)), { color: Z, dash: [5, 5], alpha: 0.6, label: "iz" });
      }
      if (f.step === 2) {
        const o = { x: 0, y: 0 };
        const [a, b] = [turn(zz), turn(ww)];
        if (size(zz) > 1e-9) g.arc(o, 0.9, 0, a, { color: Z, width: 2.5 });
        if (size(ww) > 1e-9) g.arc(o, 1.3, 0, b, { color: W, width: 2.5 });
        if (size(zz) > 1e-9 && size(ww) > 1e-9) {
          g.arc(o, 1.7, a, a + b, { color: W, width: 2.5, dash: [4, 4] });
          g.arc(o, 2.1, 0, a + b, { color: PRODUCT, width: 2.5 });
          // Written beside the end of the gold arc, clear of the short arrows.
          g.label(polar(o, 2.1, a + b), `${fmt(toDeg(a), 0)}° + ${fmt(toDeg(b), 0)}°`, { color: PRODUCT, size: 13, bold: true, dx: -12, align: "right" });
        }
      }
      // The handles already name z and w; their values crowd the angles in step 3.
      vector(g, zz, { color: Z, label: f.step === 2 ? undefined : textCx(zz) });
      vector(g, ww, { color: W, label: f.step === 2 ? undefined : textCx(ww) });
      vector(g, p, { color: PRODUCT, label: `zw = ${textCx(p)}` });
    },

    readout(f) {
      const zz = cx(z.x, z.y);
      const ww = cx(w.x, w.y);
      const p = times(zz, ww);
      const [a, b, c, d] = [z.x, z.y, w.x, w.y];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Term by term", tex: `${texFactor(zz)}${texFactor(ww)} = (${texTerm(a)} \\cdot ${texTerm(c)} - ${texTerm(b)} \\cdot ${texTerm(d)}) + (${texTerm(a)} \\cdot ${texTerm(d)} + ${texTerm(b)} \\cdot ${texTerm(c)})i` });
        rows.push({ label: "Product", tex: `zw = ${texCx(p)}`, tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Stretched", tex: `2z = ${texCx(times(zz, cx(2, 0)))}` });
        rows.push({ label: "Turned", tex: `iz = i${texFactor(zz)} = ${texCx(times(zz, cx(0, 1)))}` });
        rows.push({ label: "Product", tex: `zw = ${texCx(p)}`, tone: "good" });
      } else {
        rows.push({ label: "Lengths", tex: `|z| \\cdot |w| = ${fmt(size(zz), 3)} \\times ${fmt(size(ww), 3)} = ${fmt(size(zz) * size(ww), 3)} = |zw|`, tone: "good" });
        if (size(zz) > 1e-9 && size(ww) > 1e-9) {
          const sum = toDeg(turn(zz) + turn(ww));
          rows.push({
            label: "Angles",
            tex: `${fmt(toDeg(turn(zz)), 1)}^\\circ + ${fmt(toDeg(turn(ww)), 1)}^\\circ = ${fmt(sum, 1)}^\\circ${sum >= 360 ? ` = 360^\\circ + ${fmt(sum - 360, 1)}^\\circ` : ""}`,
          });
        }
      }
      return rows;
    },

    likes: [
      {
        title: "A photocopier's zoom and a turntable",
        text: "Set a copier to 200% and a picture doubles in size but keeps its direction; put it on a turntable and it turns but keeps its size. Multiplying by a complex number does both at once: a zoom by its length and a turn by its angle. Doing two in a row multiplies the zooms and adds the turns.",
      },
      {
        title: "Gears in a row",
        text: "Two gear pairs in a row multiply their speed ratios, and two dials turned one after the other add their angles. A complex number carries a ratio and an angle together, so one multiplication tracks both.",
      },
    ],

    uses: [
      {
        title: "Turning a sprite",
        text: "A 2D game can turn a shape about the origin by multiplying each of its points, written $x + yi$, by one fixed complex number of length 1. Multiplying by $i$ gives $-y + xi$, a quarter turn; multiplying by $\\frac{\\sqrt2}{2} + \\frac{\\sqrt2}{2}i$ turns it $45^\\circ$. Turning twice is one multiplication by the product, so the turns are easy to combine.",
        tags: ["game-design", "computing"],
        image: {
          src: spriteRotationImage,
          caption: "Multiplying every point of a sprite by i turns it a quarter turn about the origin: x + yi becomes −y + xi.",
          alt: "A small rocket shape on a grid and the same shape turned 90° counter-clockwise about the origin, with a gold arc arrow marked ×i.",
        },
      },
      {
        title: "Stars round the pole",
        text: "As the Earth spins, the stars seem to wheel round the celestial pole at about $15^\\circ$ an hour. Put the pole at 0 and each star's position after one hour is its position times one fixed number $u$ of length 1 and angle $15^\\circ$. After a day of about 24 hours, $u^{24}$ has angle $360^\\circ$, so the stars come back round.",
        tags: ["astronomy"],
        image: {
          src: starTrailsPoleImage,
          caption: "Stars wheel about the celestial pole about 15° an hour; each hour's turn is one multiplication by the same unit complex number.",
          alt: "Concentric star-trail arcs around a pole star above a dark horizon with a few trees, one arc's angle marked 15° by two gold dashed lines.",
        },
      },
    ],
  };
});
