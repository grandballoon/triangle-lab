// Working with proportions. Plot a/b as the point (b, a): equal ratios are
// points on one line through the origin. Cross-multiplying, ad = bc, is the
// equality of the two rectangles off the diagonal; adding tops and bottoms
// stays on the line; and dividing in a ratio cuts a whole into equal parts.

import { C, tint } from "../draw.ts";
import { both, inBox, snapToGrid, type Vec } from "../geo.ts";
import { axes, onStage, plot, type Graph } from "../kit/algebra.ts";
import { texRatio } from "../kit/coordinates.ts";
import { box, texNum } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import mapScaleBarImage from "../../images/map-scale-bar.svg";
import recipeScalingImage from "../../images/recipe-scaling.svg";

const P_COLOR = C.cyan;
const Q_COLOR = C.pink;
const LINE = C.gold;
const GRAPH: Graph = { origin: { x: -7, y: -3 }, unit: { x: 1, y: 1 } };
/** The amount shared out in the last step, in dollars. */
const SHARED = 60;

export default lesson((s) => {
  const o = GRAPH.origin;
  // P is (b, a) in whole numbers; Q is t times P.
  const P = s.point(o.x + 3, o.y + 2, { label: "P", color: P_COLOR, constrain: both(snapToGrid(1), inBox(o.x + 1, o.x + 3, o.y + 1, o.y + 2)) });
  const t = s.slider({ label: "Q = t·P, t =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0.5, max: 2, value: 2, step: 0.5 });

  const parts = (): { a: number; b: number; c: number; d: number } => {
    const b = Math.round(P.x - o.x);
    const a = Math.round(P.y - o.y);
    return { a, b, c: a * t.value, d: b * t.value };
  };

  return {
    steps: [
      {
        title: "Equal ratios",
        text: "A proportion says two ratios are equal: $\\frac{a}{b} = \\frac{c}{d}$. Plot each ratio as a point, $(b, a)$ and $(d, c)$. Equal ratios mean equal slopes from 0, so both points lie on one line through the origin. Drag $P$, and slide $Q$ along the line with $t$.",
      },
      {
        title: "Cross-multiplying",
        text: "Multiply both sides by $bd$ and $\\frac{a}{b} = \\frac{c}{d}$ becomes $ad = bc$. The picture shows why. The diagonal cuts the big rectangle, and the two small ones on it, into equal halves, so what is left over on each side, the two shaded rectangles, has equal area: $a(d - b) = b(c - a)$. Add $ab$ to both and $ad = bc$.",
      },
      {
        title: "Adding tops and bottoms",
        text: "From $\\frac{a}{b} = \\frac{c}{d}$ it follows that $\\frac{a + c}{b + d}$ is the same ratio: put $Q$'s arrow on the end of $P$'s and you are still on the line. Cross-multiplying backwards gives other true forms too: $\\frac{a}{c} = \\frac{b}{d}$, $\\frac{b}{a} = \\frac{d}{c}$ and $\\frac{a + b}{b} = \\frac{c + d}{d}$.",
      },
      {
        title: "Dividing in a ratio",
        text: "To share $\\text{\\textdollar}60$ in the ratio $a : b$, cut it into $a + b$ equal parts. Each part is $\\frac{60}{a + b}$, so the shares are $\\frac{a}{a + b} \\cdot 60$ and $\\frac{b}{a + b} \\cdot 60$. Their ratio is still $a : b$, and together they make the whole 60.",
      },
    ],

    draw(g, f) {
      const at = (x: number, y: number): Vec => onStage(GRAPH, { x, y });
      const { a, b, c, d } = parts();
      axes(g, GRAPH, { positive: true });
      if (f.step !== 3) plot(g, GRAPH, (x) => (a / b) * x, { color: LINE, width: 2, alpha: 0.7, from: 0 });

      if (f.step === 3) {
        // A tape of a + b equal parts across the top.
        const n = a + b;
        const [left, right, low, high] = [-6.5, 6.5, 2.6, 3.6];
        const w = (right - left) / n;
        for (let i = 0; i < n; i++) {
          const color = i < a ? P_COLOR : Q_COLOR;
          box(g, { x: left + i * w, y: low }, { x: left + (i + 1) * w, y: high }, { color, fill: tint(color, 0.22), width: 2, alpha: f.at(3) });
          g.label({ x: left + (i + 0.5) * w, y: (low + high) / 2 }, `$${texNum(SHARED / n)}`, { color: C.ink, size: 13, bold: true, alpha: f.at(3) });
        }
        const split = left + a * w;
        g.label({ x: (left + split) / 2, y: high }, `${a} parts: $${texNum((SHARED * a) / n)}`, { color: P_COLOR, size: 14, bold: true, dy: 14, alpha: f.at(3) });
        g.label({ x: (split + right) / 2, y: high }, `${b} parts: $${texNum((SHARED * b) / n)}`, { color: Q_COLOR, size: 14, bold: true, dy: 14, alpha: f.at(3) });
      }

      if (f.step === 1 && t.value !== 1) {
        // The near point and the far one, whichever t makes them.
        const [near, far] = t.value > 1 ? [{ x: b, y: a }, { x: d, y: c }] : [{ x: d, y: c }, { x: b, y: a }];
        const alpha = f.at(1);
        box(g, at(0, 0), at(far.x, far.y), { color: C.dim, width: 1.5, alpha });
        g.segment(at(near.x, 0), at(near.x, far.y), { color: C.faint, width: 1.5, alpha });
        g.segment(at(0, near.y), at(far.x, near.y), { color: C.faint, width: 1.5, alpha });
        box(g, at(near.x, 0), at(far.x, near.y), { color: C.green, fill: tint(C.green, 0.25), width: 2, alpha });
        box(g, at(0, near.y), at(near.x, far.y), { color: C.violet, fill: tint(C.violet, 0.25), width: 2, alpha });
        g.label(at((near.x + far.x) / 2, near.y / 2), texNum(near.y * (far.x - near.x)), { color: C.green, size: 14, bold: true, alpha });
        g.label(at(near.x / 2, (near.y + far.y) / 2), texNum(near.x * (far.y - near.y)), { color: C.violet, size: 14, bold: true, alpha });
      }

      if (f.step !== 3) {
        const q = at(d, c);
        g.arrow(at(0, 0), q, { color: Q_COLOR, width: 3 });
        g.point(q, { color: Q_COLOR, r: 6 });
        g.label(q, `Q (${texNum(d)}, ${texNum(c)})`, { color: Q_COLOR, size: 14, bold: true, dx: 10, dy: -16, align: "left" });
      }
      if (f.step === 2) {
        const sum = at(b + d, a + c);
        g.arrow(P, sum, { color: Q_COLOR, width: 2.5, dash: [6, 5], alpha: f.at(2) });
        g.point(sum, { color: LINE, r: 6, alpha: f.at(2) });
        g.label(sum, `(b + d, a + c) = (${texNum(b + d)}, ${texNum(a + c)})`, { color: LINE, size: 14, bold: true, dx: -10, dy: 10, align: "right", alpha: f.at(2) });
      }
      g.arrow(at(0, 0), P, { color: P_COLOR, width: 3 });
      g.label(P, `(${b}, ${a})`, { color: P_COLOR, size: 14, bold: true, dx: -16, dy: -6, align: "right" });
    },

    readout(f) {
      const { a, b, c, d } = parts();
      const frac = (n: number, m: number): string => `\\frac{${texNum(n)}}{${texNum(m)}}`;
      const rows: Readout[] = [{ label: "Proportion", tex: `\\frac{a}{b} = ${frac(a, b)},\\quad \\frac{c}{d} = ${frac(c, d)} = ${texRatio(a, b)}`, tone: "good" }];
      if (f.step === 1) {
        rows.push({ label: "Cross products", tex: `ad = ${texNum(a)} \\cdot ${texNum(d)} = ${texNum(a * d)},\\quad bc = ${texNum(b)} \\cdot ${texNum(c)} = ${texNum(b * c)}`, tone: "good" });
        rows.push({ label: "Shaded", tex: `a(d - b) = ${texNum(a * (d - b))},\\quad b(c - a) = ${texNum(b * (c - a))}` });
      } else if (f.step === 2) {
        rows.push({ label: "Tops and bottoms", tex: `\\frac{a + c}{b + d} = ${frac(a + c, b + d)} = ${texRatio(a, b)}`, tone: "good" });
        rows.push({ label: "Swapped", tex: `\\frac{a}{c} = ${frac(a, c)} = ${texNum(a / c, 3)},\\quad \\frac{b}{d} = ${frac(b, d)} = ${texNum(b / d, 3)}` });
      } else if (f.step === 3) {
        const n = a + b;
        rows.push({ label: "Each part", tex: `\\frac{60}{a + b} = \\frac{60}{${n}} = ${texNum(SHARED / n)}` });
        rows.push({ label: "Shares", tex: `${a} \\cdot ${texNum(SHARED / n)} = ${texNum((SHARED * a) / n)},\\quad ${b} \\cdot ${texNum(SHARED / n)} = ${texNum((SHARED * b) / n)}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Mixing paint",
        text: "A shade made from 2 tins of blue to 3 of white comes out the same in a batch of 4 blue to 6 white, since $\\frac23 = \\frac46$. A batch of 3 blue to 4 white is a different shade, and cross-multiplying shows it at once: $2 \\cdot 4 = 8$ but $3 \\cdot 3 = 9$.",
      },
      {
        title: "Splitting a bill fairly",
        text: "Two friends who put in $\\text{\\textdollar}20$ and $\\text{\\textdollar}30$ toward a $\\text{\\textdollar}50$ prize ticket might share a $\\text{\\textdollar}200$ win in the same $2 : 3$ ratio. Five equal parts of $\\text{\\textdollar}40$ give $\\text{\\textdollar}80$ and $\\text{\\textdollar}120$.",
      },
    ],

    uses: [
      {
        title: "Scaling a recipe",
        text: "A recipe for 4 that uses 3 cups of flour needs $x$ cups for 6, where $\\frac{3}{4} = \\frac{x}{6}$. Cross-multiplying, $4x = 18$, so $x = 4.5$ cups. Every ingredient scales by the same factor, $\\frac{6}{4} = 1.5$.",
        tags: ["home"],
        image: {
          src: recipeScalingImage,
          caption: "A recipe for 4 that uses 3 cups of flour needs 4.5 cups for 6: 3/4 = x/6.",
          alt: "A recipe card reading Serves 4, 3 cups flour and a gold arrow marked × 1.5 to a second card reading Serves 6, 4½ cups flour, above a mixing bowl of flour with the line 3 / 4 = 4½ / 6.",
        },
      },
      {
        title: "Reading a map",
        text: "A map's scale is a ratio: at 1 cm to 5 km, every distance on the map is in proportion to the real one. Two towns 7 cm apart on the map are $\\frac{1}{5} = \\frac{7}{x}$, so $x = 35$ km apart on the ground, as the crow flies.",
        tags: ["navigation", "travel"],
        image: {
          src: mapScaleBarImage,
          caption: "On a map at 1 cm to 5 km, 7 cm between two towns stands for 35 km.",
          alt: "A simple green map with a winding road between two red town dots, a ruler measuring 7 cm between them, a scale bar marked 0, 5, 10 km with 1 cm = 5 km, and the line 7 × 5 = 35 km.",
        },
      },
    ],
  };
});
