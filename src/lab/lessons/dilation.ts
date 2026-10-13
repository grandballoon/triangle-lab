// A dilation with centre O and factor k sends A to the point A′ on line OA
// with OA′ = |k|·OA — on A's side of O when k > 0, on the far side when
// k < 0. The steps prove, by SAS similarity of triangles OAB and OA′B′, that
// a segment's image is parallel to it and |k| times as long, which is why
// the image is similar to the original and its area is multiplied by k².

import { C, tint } from "../draw.ts";
import { angleAt, dist, fmt, inBox, lerp, polygonArea, toDeg, vec, type Vec } from "../geo.ts";
import {
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  ORIGINAL,
  testTriangle,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const AT_CENTRE = C.gold; // the angle at O that both triangles use
const AT_VERTEX = C.pink; // the equal angles at A and A′

// The factors the slider steps through: quarter steps, skipping k = 0, which
// would crush the whole plane onto O.
const FACTORS = [-1.5, -1.25, -1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const START = FACTORS.indexOf(2);

export default lesson((s) => {
  const pick = s.slider({
    label: "k =",
    at: vec(-7.6, -4.3),
    width: 5,
    min: 0,
    max: FACTORS.length - 1,
    value: START,
    step: 1,
    format: (i) => fmt(FACTORS[i], 2),
  });
  const O = s.point(-1.5, -0.5, { label: "O", constrain: inBox(-7, 7, -3.4, 4) });
  const [A, B, K] = testTriangle(s, [vec(0.5, -1.5), vec(2.5, -1), vec(1, 0.8)], inBox(-6, 6, -3.3, 3.6));

  const factor = (): number => FACTORS[pick.value];
  const scaleFromO = (p: Vec): Vec => lerp(O, p, factor());
  const original = (): Triple => [A, B, K];

  return {
    steps: [
      {
        title: "Grow and shrink from a point",
        text: "Slide $k$ and drag the centre $O$ or the triangle. The image is a scale copy. Notice the lines joining matching corners: wherever you put things, they all pass through $O$.",
      },
      {
        title: "What the factor means",
        text: "$A'$ sits on line $OA$ with $OA' = |k| \\cdot OA$, on the same side of $O$ as $A$ when $k > 0$ and on the opposite side when $k < 0$. The same rule places $B'$ and $C'$.",
      },
      {
        title: "Two similar triangles",
        text: "Compare $\\triangle OAB$ with $\\triangle OA'B'$. They have the same angle at $O$ — shared, or vertical when $k < 0$ — and the sides around it are in the same ratio $|k|$. By SAS similarity, $\\triangle OAB \\sim \\triangle OA'B'$.",
      },
      {
        title: "Parallel, and k times as long",
        text: "So the third sides are in that ratio too: $A'B' = |k| \\cdot AB$. And the matching angles $\\angle OAB = \\angle OA'B'$ are equal angles on the line $OA$, which forces $A'B' \\parallel AB$.",
      },
      {
        title: "Same shape, area times k squared",
        text: "Every side is multiplied by $|k|$ and stays parallel to itself, so every angle is kept: the image is similar to the original. Base and height both scale by $|k|$, so the area scales by $k^2$.",
      },
    ],

    draw(g, f) {
      const src = original();
      const img = mapTriple(src, scaleFromO);

      if (f.at(2) > 0) {
        g.polygon([O, A, B], { fill: tint(ORIGINAL, 0.2), stroke: null, alpha: f.at(2) });
        g.polygon([O, img[0], img[1]], { fill: tint(IMAGE, 0.2), stroke: null, alpha: f.at(2) });
      }

      for (const p of src) g.line(O, p, { color: C.faint, width: 1.5 });
      drawFigure(g, src, ORIGINAL);
      drawImage(g, img);

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.segment(O, img[0], { color: IMAGE, width: 3, alpha });
        g.segment(O, A, { color: ORIGINAL, width: 3, alpha });
        if (f.step === 1) {
          g.along(O, A, `OA = ${fmt(dist(O, A), 2)}`, { color: ORIGINAL, offset: 16, alpha });
          g.along(O, img[0], `OA′ = ${fmt(dist(O, img[0]), 2)}`, { color: IMAGE, offset: -16, alpha });
        }
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        g.segment(O, img[1], { color: IMAGE, width: 3, alpha });
        g.segment(O, B, { color: ORIGINAL, width: 3, alpha });
        g.angle(A, O, B, { color: AT_CENTRE, fill: true, r: 30, alpha });
        if (factor() < 0) g.angle(img[0], O, img[1], { color: AT_CENTRE, fill: true, r: 30, alpha });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        g.angle(O, A, B, { color: AT_VERTEX, fill: true, arcs: 2, r: 22, alpha });
        g.angle(O, img[0], img[1], { color: AT_VERTEX, fill: true, arcs: 2, r: 22, alpha });
        g.chevrons(A, B, 1, { alpha });
        // The image side points the other way when k is negative.
        const [from, to] = factor() > 0 ? [img[0], img[1]] : [img[1], img[0]];
        g.chevrons(from, to, 1, { alpha });
      }
    },

    readout(f) {
      const k = factor();
      const src = original();
      const img = mapTriple(src, scaleFromO);
      const size = fmt(Math.abs(k), 2);
      // A vertex dragged onto O has no ratio to show: it is the one fixed point.
      const quotient = (name: string, top: number, bottom: number): string =>
        bottom < 1e-9
          ? `${name} = 0`
          : `\\frac{${name}}{${name.replace(/'/g, "")}} = \\frac{${fmt(top, 2)}}{${fmt(bottom, 2)}} = ${fmt(top / bottom, 2)}`;

      const rows: Readout[] = [
        { label: "Factor", tex: `k = ${fmt(k, 2)}` },
        { label: "Distances from the centre", tex: quotient("OA'", dist(O, img[0]), dist(O, A)), tone: "good" },
        { tex: quotient("OB'", dist(O, img[1]), dist(O, B)), tone: "good" },
      ];
      if (f.step >= 3) {
        const deg = (p: Vec, v: Vec, q: Vec): string => `${fmt(toDeg(angleAt(p, v, q)), 0)}^\\circ`;
        rows.push(
          {
            label: `A side and its image: $|k| = ${size}$`,
            tex: quotient("A'B'", dist(img[0], img[1]), dist(A, B)),
            tone: "good",
          },
          {
            label: "Matching angles",
            tex: `\\angle OAB = ${deg(O, A, B)}, \\quad \\angle OA'B' = ${deg(O, img[0], img[1])}`,
            tone: "good",
          },
        );
      }
      if (f.step >= 4) {
        const ratio = polygonArea(img) / polygonArea(src);
        rows.push({
          label: "Ratio of the areas",
          tex: `${fmt(ratio, 2)} = ${k < 0 ? `(${fmt(k, 2)})` : fmt(k, 2)}^2 = k^2`,
          tone: "good",
        });
      }
      return rows;
    },
  };
});
