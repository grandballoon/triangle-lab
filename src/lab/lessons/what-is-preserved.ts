// What each transformation leaves alone. One triangle, five transformations
// to choose from, all steered by the same two points O and H; the panel tests
// collinearity, lengths, angles, area and orientation on the actual numbers
// of the original and its image.

import { C, type Draw } from "../draw.ts";
import {
  add,
  angleAt,
  angleOf,
  dot,
  fmt,
  inBox,
  inRing,
  len,
  lerp,
  mid,
  normalize,
  perp,
  polygonArea,
  reflect,
  rotateAbout,
  scale,
  signedArea,
  sub,
  toDeg,
  vec,
} from "../geo.ts";
import {
  anglesOf,
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  ORIGINAL,
  same,
  satellite,
  sidesOf,
  spin,
  testTriangle,
  turnTex,
  type Mapping,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const KINDS = ["translation", "rotation", "reflection", "distortion", "dilation"] as const;
type Kind = (typeof KINDS)[number];

/** How far H sits from O when the stretch or dilation factor is 1. */
const UNIT = 2;
const FACTOR_STEP = 0.05;
const ORIGIN = vec(0, 0);
/** Below this a turn is too small to mark. */
const SMALL_ANGLE = 0.02;

export default lesson((s) => {
  const kind = s.choice<Kind>("Transformation", KINDS);
  const O = s.point(1.5, -1, { label: "O", constrain: inBox(-1.5, 3, -2, 2) });
  const [A, B, K] = testTriangle(s, [vec(-6, -2), vec(-2.5, -2.5), vec(-4.5, 1)], inBox(-7.5, 0, -4, 3.5));
  const steer = satellite(s, O, vec(2.4, 1.8), inRing(ORIGIN, 0.5, 5), { label: "H" });
  const h = steer.offset;

  /** The factor H sets for a distortion or dilation: its distance from O in units. */
  const factor = (): number => Math.round(len(h) / UNIT / FACTOR_STEP) * FACTOR_STEP;

  function mapping(): Mapping {
    const k = factor();
    const u = normalize(h);
    switch (kind.value) {
      case "translation":
        return (p) => add(p, h);
      case "rotation":
        return (p) => rotateAbout(p, O, angleOf(h));
      case "reflection":
        return (p) => reflect(p, O, add(O, h));
      case "distortion":
        // Stretch along OH: the part of p − O along u is multiplied by k.
        return (p) => add(p, scale(u, (k - 1) * dot(sub(p, O), u)));
      case "dilation":
        return (p) => lerp(O, p, k);
    }
  }

  /** The marks that show what O and H mean for the chosen transformation. */
  function drawControls(g: Draw, src: Triple, img: Triple): void {
    const H = add(O, h);
    const unitRing = (): void => {
      g.circle(O, UNIT, { color: C.faint, width: 1.5, dash: [4, 6] });
      g.label(add(O, vec(0, -UNIT)), "k = 1", { color: C.dim, size: 12, dy: -12 });
      g.arrow(O, H, { color: g.accent, width: 3 });
      g.label(H, `k = ${fmt(factor(), 2)}`, { color: g.accent, size: 14, dx: 4, dy: -24 });
    };
    switch (kind.value) {
      case "translation":
        g.arrow(O, H, { color: g.accent, width: 3 });
        src.forEach((p, i) => g.arrow(p, img[i], { color: g.accent, width: 1.5, alpha: 0.6 }));
        break;
      case "rotation": {
        const theta = angleOf(h);
        g.segment(O, add(O, vec(len(h), 0)), { color: C.dim, width: 2, dash: [5, 5] });
        g.segment(O, H, { color: g.accent, width: 3 });
        if (Math.abs(theta) > SMALL_ANGLE) {
          const [from, to] = theta > 0 ? [0, theta] : [theta, 0];
          g.angleMark(O, from, to, { color: g.accent, fill: true, r: 30, label: true, square: false });
        }
        break;
      }
      case "reflection":
        g.line(O, H, { color: g.accent, width: 3 });
        break;
      case "distortion":
        g.line(O, add(O, perp(h)), { color: g.accent, width: 2 });
        unitRing();
        break;
      case "dilation":
        for (const p of src) g.line(O, p, { color: C.faint, width: 1.5 });
        unitRing();
        break;
    }
  }

  return {
    steps: [
      {
        title: "What survives?",
        text: "Choose a transformation, then drag $O$ and $H$ to steer it: $H$ is the tip of the slide, the angle of the turn, a second point of the mirror, or the factor $k$. The panel checks five properties on the real numbers.",
      },
      {
        title: "The three rigid motions",
        text: "Translations, rotations and reflections keep every length, so they keep angles and area too: the image is congruent. Only the reflection changes anything on the list — it reverses the orientation.",
      },
      {
        title: "Shape without size",
        text: "A dilation changes lengths and area but keeps every angle, so the image is similar. A distortion keeps neither lengths nor angles. Yet both still send straight lines to straight lines.",
      },
    ],

    draw(g) {
      steer.follow();
      const map = mapping();
      const src: Triple = [A, B, K];
      const img = mapTriple(src, map);
      const M = mid(A, B);
      const M2 = map(M);

      drawControls(g, src, img);
      drawFigure(g, src, ORIGINAL);
      drawImage(g, img);
      spin(g, src, ORIGINAL);
      spin(g, img, IMAGE);

      // M is the test point for collinearity: on AB before, on A′B′ after?
      g.point(M, { color: C.ink, r: 4 });
      g.label(M, "M", { size: 13, dy: -14 });
      g.point(M2, { color: C.ink, r: 4 });
      g.label(M2, "M′", { size: 13, dy: -14 });
    },

    readout() {
      const map = mapping();
      const src: Triple = [A, B, K];
      const img = mapTriple(src, map);
      const M2 = map(mid(A, B));

      // A kept quantity is printed from one number, so the two can never round apart.
      const settle = (after: number[], before: number[]): number[] =>
        after.map((v, i) => (same(v, before[i]) ? before[i] : v));
      const sides = [sidesOf(src), settle(sidesOf(img), sidesOf(src))];
      const angles = [anglesOf(src), settle(anglesOf(img), anglesOf(src))];
      const areas = [polygonArea(src), settle([polygonArea(img)], [polygonArea(src)])[0]];
      const straight = toDeg(angleAt(img[0], M2, img[1]));
      const allSame = (a: number[], b: number[]): boolean => a.every((v, i) => same(v, b[i]));
      const tone = (kept: boolean): Readout["tone"] => (kept ? "good" : "warn");

      return [
        {
          label: "Collinear points stay collinear",
          tex: `\\angle A'M'B' = ${fmt(straight, 1)}^\\circ`,
          tone: tone(same(straight, 180)),
        },
        {
          label: "Lengths",
          tex: `AB = ${fmt(sides[0][0], 2)}, \\quad A'B' = ${fmt(sides[1][0], 2)}`,
          tone: tone(allSame(sides[0], sides[1])),
        },
        {
          label: "Angles",
          tex: `\\angle C = ${fmt(angles[0][2], 1)}^\\circ, \\quad \\angle C' = ${fmt(angles[1][2], 1)}^\\circ`,
          tone: tone(allSame(angles[0], angles[1])),
        },
        { label: "Area", tex: `${fmt(areas[0], 2)} \\to ${fmt(areas[1], 2)}`, tone: tone(same(areas[0], areas[1])) },
        {
          label: "Orientation",
          tex: `ABC\\ ${turnTex(src)} \\qquad A'B'C'\\ ${turnTex(img)}`,
          tone: tone(signedArea(src) * signedArea(img) > 0),
        },
      ];
    },
  };
});
