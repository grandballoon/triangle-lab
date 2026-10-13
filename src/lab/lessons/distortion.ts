// A distortion stretches or squeezes in one direction only: horizontal
// distances from a fixed vertical line are multiplied by k, heights are left
// alone. Lines stay lines but angles change — a circle becomes an ellipse,
// an isosceles triangle can become equilateral. Slicing the figure into
// strips parallel to the stretch shows why every area is multiplied by k.

import { C, tint, type Draw } from "../draw.ts";
import { clamp, fmt, inBox, inRing, len, polar, polygonArea, TAU, vec, type Vec } from "../geo.ts";
import {
  anglesOf,
  drawFigure,
  drawImage,
  IMAGE,
  mapTriple,
  ORIGINAL,
  satellite,
  testTriangle,
  type Triple,
} from "../kit/transformations.ts";
import { lesson, type Readout } from "../scene.ts";

const STRIPS = 12;
/** Which strip is picked out, in the figure and in the panel. */
const SHOWN_STRIP = 4;
const CIRCLE_SIDES = 96;
const LINE_Y = { top: 4.4, bottom: -3.6 };
/** Within this many degrees of 60° on every angle, call the image equilateral. */
const EQUILATERAL_TOLERANCE = 1;
const ORIGIN = vec(0, 0);

/** The horizontal extent of a figure at height y, or null where y misses it. */
type Span = (y: number) => [number, number] | null;

function triangleSpan(t: Triple): Span {
  return (y) => {
    const xs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const p = t[i];
      const q = t[(i + 1) % 3];
      if (p.y === q.y || y < Math.min(p.y, q.y) || y > Math.max(p.y, q.y)) continue;
      xs.push(p.x + ((y - p.y) / (q.y - p.y)) * (q.x - p.x));
    }
    return xs.length < 2 ? null : [Math.min(...xs), Math.max(...xs)];
  };
}

function circleSpan(center: Vec, r: number): Span {
  return (y) => {
    const half2 = r * r - (y - center.y) ** 2;
    if (half2 <= 0) return null;
    const half = Math.sqrt(half2);
    return [center.x - half, center.x + half];
  };
}

export default lesson((s) => {
  const shape = s.choice("Figure", ["triangle", "circle"] as const);
  const factor = s.slider({ label: "k =", at: vec(-7.6, -4.3), width: 5, min: 0.25, max: 2.5, value: 1.5, step: 0.05 });
  // The fixed line is dragged sideways by a grip at its top end.
  const grip = s.point(-7, LINE_Y.top, { constrain: (p) => vec(clamp(p.x, -7.5, -5.5), LINE_Y.top) });
  // The triangle starts isosceles, with its base parallel to the fixed line.
  const [A, B, K] = testTriangle(s, [vec(-5.5, 2), vec(-5.5, -3), vec(-3, -0.5)], inBox(-7, -2, -3.2, 3.6));
  const centre = s.point(-4, 0.4, { label: "Q", color: ORIGINAL, constrain: inBox(-4.5, -3, -0.8, 1.6) });
  const rim = satellite(s, centre, vec(1.8, 0), inRing(ORIGIN, 1, 2.2), { color: ORIGINAL });

  const stretch = (p: Vec): Vec => vec(grip.x + factor.value * (p.x - grip.x), p.y);
  const original = (): Triple => [A, B, K];
  const circle = (): Vec[] =>
    Array.from({ length: CIRCLE_SIDES }, (_, i) => polar(centre, len(rim.offset), (i * TAU) / CIRCLE_SIDES));

  /** The current figure cut into horizontal strips, each as [x0, x1, y0, y1]. */
  function strips(): [number, number, number, number][] {
    const round = shape.value === "circle";
    const r = len(rim.offset);
    const span = round ? circleSpan(centre, r) : triangleSpan(original());
    const ymin = round ? centre.y - r : Math.min(A.y, B.y, K.y);
    const ymax = round ? centre.y + r : Math.max(A.y, B.y, K.y);
    const h = (ymax - ymin) / STRIPS;
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < STRIPS; i++) {
      const y0 = ymin + i * h;
      const x = span(y0 + h / 2);
      if (x) out.push([x[0], x[1], y0, y0 + h]);
    }
    return out;
  }

  function drawStrips(g: Draw, alpha: number): void {
    strips().forEach(([x0, x1, y0, y1], i) => {
      const shown = i === SHOWN_STRIP;
      const box = (a: number, b: number): Vec[] => [vec(a, y0), vec(b, y0), vec(b, y1), vec(a, y1)];
      const [i0, i1] = [stretch(vec(x0, 0)).x, stretch(vec(x1, 0)).x];
      g.polygon(box(i0, i1), { fill: tint(IMAGE, shown ? 0.55 : 0.2), color: IMAGE, width: 1, alpha });
      g.polygon(box(x0, x1), { fill: tint(ORIGINAL, shown ? 0.55 : 0.2), color: ORIGINAL, width: 1, alpha });
    });
  }

  return {
    steps: [
      {
        title: "Stretch one way only",
        text: "Slide $k$ to stretch or squeeze the figure away from the fixed line; drag its corners, or the line by its grip. Every point's distance from the line is multiplied by $k$, while its height stays the same.",
      },
      {
        title: "Shape is not preserved",
        text: "Straight sides stay straight, but the angles change, so the image is not similar to the original. The isosceles triangle you start with turns equilateral near $k = 1.73$. Switch to the circle: it becomes an ellipse.",
      },
      {
        title: "Cut it into strips",
        text: "Slice the figure into thin strips that run along the stretch. Each strip keeps its height while its length is multiplied by $k$, so each strip's area is multiplied by $k$.",
      },
      {
        title: "Area is multiplied by k",
        text: "The strips make up the whole figure, and every one of them grew by the same factor. So the whole area is multiplied by $k$ — for the triangle, the circle, or any shape at all.",
      },
    ],

    draw(g, f) {
      rim.follow();
      const round = shape.value === "circle";
      for (const h of [A, B, K]) h.enabled = !round;
      for (const h of [centre, rim.handle]) h.enabled = round;
      for (const h of [A, B, K, centre, rim.handle]) h.hidden = !h.enabled;

      const top = vec(grip.x, LINE_Y.top);
      const bottom = vec(grip.x, LINE_Y.bottom);
      g.segment(top, bottom, { color: g.accent, width: 3 });
      g.label(top, "fixed line", { color: g.accent, size: 14, dx: 48, dy: 2 });

      const outline: readonly Vec[] = round ? circle() : original();
      const image = outline.map(stretch);
      const corners: readonly Vec[] = round ? [centre] : outline;

      // Each marked point travels along its own horizontal line.
      for (const p of corners) {
        const q = stretch(p);
        const far = Math.abs(q.x - grip.x) > Math.abs(p.x - grip.x) ? q : p;
        g.segment(vec(grip.x, p.y), far, { color: C.dim, width: 1.5, dash: [4, 5] });
      }

      drawFigure(g, outline, ORIGINAL);
      if (round) {
        drawFigure(g, image, IMAGE);
        g.point(stretch(centre), { color: IMAGE });
        g.label(stretch(centre), "Q′", { color: IMAGE, bold: true, dx: 16, dy: -16 });
      } else {
        drawImage(g, image);
      }

      if (f.at(1) > 0 && f.step === 1 && !round) {
        const mark = (t: readonly Vec[], color: string): void => {
          for (let i = 0; i < 3; i++) {
            g.angle(t[(i + 1) % 3], t[i], t[(i + 2) % 3], { color, fill: true, r: 20, alpha: f.at(1) });
          }
        };
        mark(outline, ORIGINAL);
        mark(image, IMAGE);
      }

      if (f.at(2) > 0) drawStrips(g, f.at(2));
    },

    readout(f) {
      const k = factor.value;
      const round = shape.value === "circle";
      const r = len(rim.offset);
      const rows: Readout[] = [
        { label: "Rule, measuring $x$ from the fixed line", tex: `(x,\\, y) \\to (${fmt(k, 2)}\\,x,\\; y)` },
      ];

      if (round) {
        rows.push(
          { label: "Circle", tex: `\\text{width } ${fmt(2 * r, 2)}, \\quad \\text{height } ${fmt(2 * r, 2)}` },
          { label: "Its image", tex: `\\text{width } ${fmt(2 * r * k, 2)}, \\quad \\text{height } ${fmt(2 * r, 2)}` },
        );
      } else {
        const list = (t: Triple): string =>
          anglesOf(t)
            .map((a) => `${fmt(a, 0)}^\\circ`)
            .join(",\\ ");
        const image = mapTriple(original(), stretch);
        const equilateral = anglesOf(image).every((a) => Math.abs(a - 60) <= EQUILATERAL_TOLERANCE);
        rows.push(
          { label: "Angles of $ABC$", tex: list(original()) },
          {
            label: equilateral ? "Angles of $A'B'C'$ — nearly equilateral" : "Angles of $A'B'C'$",
            tex: list(image),
            tone: equilateral ? "good" : "plain",
          },
        );
      }

      if (f.step >= 2) {
        const outline: readonly Vec[] = round ? circle() : original();
        // The circle's area is exact; its image is measured from the stretched outline.
        const before = round ? Math.PI * r * r : polygonArea(outline);
        const after = polygonArea(outline.map(stretch)) * (round ? before / polygonArea(outline) : 1);
        const strip = strips()[SHOWN_STRIP];
        if (strip) {
          const w = strip[1] - strip[0];
          rows.push({
            label: "Length of the bright strip",
            tex: `${fmt(w, 2)} \\to ${fmt(k, 2)} \\cdot ${fmt(w, 2)} = ${fmt(k * w, 2)}`,
          });
        }
        rows.push(
          { label: "Area before and after", tex: `${fmt(before, 2)} \\to ${fmt(after, 2)}` },
          {
            label: "Ratio of the areas",
            tex: `\\frac{${fmt(after, 2)}}{${fmt(before, 2)}} = ${fmt(after / before, 2)} = k`,
            tone: "good",
          },
        );
      }
      return rows;
    },
  };
});
