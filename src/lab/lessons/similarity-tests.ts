// Three ways to know two triangles are similar, all on one figure: a small
// triangle ADE sharing the corner A of triangle ABC. A parallel to BC gives
// equal angles (AA); two equal ratios around A give SAS; three equal ratios
// give SSS; and the midsegment is the SAS case with ratio one half.

import { C, tint } from "../draw.ts";
import {
  add, angleAt, circleCircle, clamp, cross, dist, dot, fmt, inBox, lerp, lineLine, sub, toDeg, type Vec,
} from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson } from "../scene.ts";

type Mode = "AA" | "SAS" | "SSS" | "Midsegment";
const MODES: readonly Mode[] = ["AA", "SAS", "SSS", "Midsegment"];

// How far along a side D and E may sit, and how close two ratios must be to
// snap together in the SAS case.
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.9;
const SNAP = 0.025;

const AT_D = C.gold;
const AT_E = C.cyan;
const AT_A = C.violet;
const DASH = [6, 5];

export default lesson((s) => {
  const mode = s.choice("Case", MODES, "AA");

  // A stays above B and C, so the triangle never flips or flattens.
  const A = s.point(-1, 4, { label: "A", constrain: inBox(-4, 4, 2.6, 4.2) });
  const B = s.point(-6.2, -3.2, { label: "B", constrain: inBox(-7.2, -2.5, -3.6, -1.8) });
  const V = s.point(5.6, -2.6, { label: "C", constrain: inBox(2.5, 7.2, -3.6, -1.8) });

  // D and E are remembered as fractions of AB and AC, so they ride along when
  // a corner moves.
  let ratioD = 0.55;
  let ratioE = 0.4;
  const fraction = (p: Vec, end: Vec): number => {
    const side = sub(end, A);
    return clamp(dot(sub(p, A), side) / dot(side, side), MIN_RATIO, MAX_RATIO);
  };
  const snapTo = (ratio: number, other: number): number =>
    mode.value === "SAS" && Math.abs(ratio - other) < SNAP ? other : ratio;

  const D = s.point(0, 0, {
    label: "D",
    color: AT_D,
    constrain: (p) => {
      ratioD = snapTo(fraction(p, B), ratioE);
      return lerp(A, B, ratioD);
    },
  });
  const E = s.point(0, 0, {
    label: "E",
    color: AT_E,
    constrain: (p) => {
      ratioE = snapTo(fraction(p, V), ratioD);
      return lerp(A, V, ratioE);
    },
  });
  // Creating the handles ran their constraints; put the fractions back.
  ratioD = 0.55;
  ratioE = 0.4;

  /** Where D and E are in the chosen case. */
  const inner = (): { d: Vec; e: Vec } => {
    if (mode.value === "Midsegment") return { d: lerp(A, B, 0.5), e: lerp(A, V, 0.5) };
    const d = lerp(A, B, ratioD);
    const fallback = lerp(A, V, ratioD);
    if (mode.value === "SAS") return { d, e: lerp(A, V, ratioE) };
    if (mode.value === "AA") return { d, e: lineLine(d, add(d, sub(V, B)), A, V) ?? fallback };
    // SSS: compass arcs of radius k·AC about A and k·BC about D, taking the
    // crossing on C's side of AB.
    const side = Math.sign(cross(sub(B, A), sub(V, A)));
    const crossings = circleCircle(A, ratioD * dist(A, V), d, ratioD * dist(B, V));
    return { d, e: crossings.find((p) => Math.sign(cross(sub(B, A), sub(p, A))) === side) ?? fallback };
  };

  const measure = () => {
    const { d, e } = inner();
    const ratios = [dist(A, d) / dist(A, B), dist(A, e) / dist(A, V), dist(d, e) / dist(B, V)];
    return { d, e, ratios, similar: agree(...ratios) };
  };

  return {
    steps: [
      {
        title: "A small triangle in a big one",
        text: "Drag $D$ along $AB$, and move the corners. Triangle $ADE$ shares the corner $A$ with triangle $ABC$, and the panel compares their sides as ratios. Choose a case above to change how $E$ is found.",
      },
      {
        title: "AA: a parallel line",
        text: "Choose AA. $E$ is where the line through $D$ parallel to $BC$ meets $AC$. The corresponding angles at $D$ and $B$, and at $E$ and $C$, are equal, so the triangles are similar and all three ratios agree.",
      },
      {
        title: "SAS: two ratios around an angle",
        text: "Choose SAS and drag $E$ as well. The triangles share angle $A$. Only when $\\tfrac{AD}{AB} = \\tfrac{AE}{AC}$ do the other angles match, and then $DE$ is parallel to $BC$.",
      },
      {
        title: "SSS: three ratios",
        text: "Choose SSS. Now $E$ is found with compasses, from the lengths $k \\cdot AC$ and $k \\cdot BC$ alone, where $k = \\tfrac{AD}{AB}$. Three sides in one ratio force the same angles, and $E$ lands on $AC$.",
      },
      {
        title: "The midsegment",
        text: "Choose Midsegment: $D$ and $E$ are midpoints. Both ratios at $A$ are $\\tfrac12$, so SAS makes the triangles similar. Hence $DE = \\tfrac12 BC$, and $\\angle ADE = \\angle B$ makes $DE$ parallel to $BC$.",
      },
    ],

    likes: [
      {
        title: "Cutting the tip off a slice of pizza",
        text: "Cut across a triangular slice of pizza parallel to the crust, and the tip you cut off is a small copy of the whole slice: same corner, same shape, every edge shrunk by the same amount. That is the AA case, with $DE$ parallel to $BC$. Cut halfway down the sides and the new edge is exactly half the crust, the midsegment.",
      },
      {
        title: "Enlarging a photo",
        text: "When you enlarge a photo, every length grows by the same factor $k$ and no angle changes, so faces still look right. Stretch only the width and everyone looks wider: the angles change because the ratios no longer agree. The tests say how few checks you need to know an enlargement is honest.",
      },
    ],

    uses: [
      {
        title: "How tall is that building?",
        text: "On a sunny day, measure your own shadow and the building's. Sunlight arrives in parallel rays, so you and your shadow form a triangle similar to the building and its shadow (AA). If you are 1.8 metres tall with a 1.2 metre shadow, and the building's shadow is 20 metres, the building is $20 \\cdot \\tfrac{1.8}{1.2} = 30$ metres tall.",
      },
      {
        title: "Sizing a projector picture",
        text: "Light from a projector spreads from one point, so the picture and the lens form similar triangles at every distance. If the picture is 2 metres wide with the projector 3 metres from the wall, moving it back to 4.5 metres makes the picture $2 \\cdot \\tfrac{4.5}{3} = 3$ metres wide. Installers use this ratio, often printed as the throw ratio, to choose where to mount it.",
      },
      {
        title: "A brace for an A-frame",
        text: "An A-frame sign or stepladder whose feet stand 80 centimetres apart can be braced with a bar joining the midpoints of its two legs. By the midsegment, that bar is parallel to the floor and exactly 40 centimetres long, so you can cut it before assembling anything.",
      },
    ],

    draw(g) {
      const m = mode.value;
      const { d, e, similar } = measure();
      Object.assign(D, d);
      Object.assign(E, e);
      D.enabled = m !== "Midsegment";
      E.enabled = m === "SAS";

      g.polygon([A, B, V], { fill: "rgba(255, 255, 255, 0.05)" });
      g.polygon([A, d, e], { fill: tint(g.accent, 0.2), stroke: null });

      if (m === "SSS") {
        const towardE = sub(e, A);
        const fromA = Math.atan2(towardE.y, towardE.x);
        const fromD = Math.atan2(e.y - d.y, e.x - d.x);
        g.arc(A, dist(A, e), fromA - 0.3, fromA + 0.3, { color: AT_E, width: 2, dash: DASH });
        g.arc(d, dist(d, e), fromD - 0.3, fromD + 0.3, { color: AT_D, width: 2, dash: DASH });
      }
      if (m === "AA") g.line(d, e, { color: C.dim, width: 1.5, dash: DASH });

      g.segment(d, e, { color: similar ? g.accent : C.red, width: 4 });
      if (similar) {
        g.chevrons(d, e, 1, { color: g.accent });
        g.chevrons(B, V, 1, { color: g.accent });
      }
      if (m === "Midsegment") {
        g.ticks(A, d, 1, { color: AT_D });
        g.ticks(d, B, 1, { color: AT_D });
        g.ticks(A, e, 2, { color: AT_E });
        g.ticks(e, V, 2, { color: AT_E });
      }
      if (m === "SAS" || m === "Midsegment") g.angle(B, A, V, { color: AT_A, fill: true, r: 30 });

      // Matching angles share a colour; a mismatch turns the inner ones red.
      g.angle(A, B, V, { color: AT_D, fill: true, r: 30, label: true });
      g.angle(A, d, e, { color: similar ? AT_D : C.red, fill: true, r: 26, label: true });
      g.angle(A, V, B, { color: AT_E, fill: true, r: 30, label: true, arcs: 2 });
      g.angle(A, e, d, { color: similar ? AT_E : C.red, fill: true, r: 26, label: true, arcs: 2 });

      const caption: Record<Mode, string> = {
        AA: "DE ∥ BC copies the angles at B and C to D and E: similar by AA.",
        SAS: similar
          ? "AD/AB = AE/AC around the shared angle A: similar by SAS."
          : "The ratios around angle A differ, so the triangles are not similar. Slide E.",
        SSS: "E is built from the lengths k·AC and k·BC alone, and the angles come out equal.",
        Midsegment: "Both ratios are ½ around angle A, so DE = ½ BC and DE ∥ BC.",
      };
      g.label({ x: 0, y: -4.5 }, caption[m], { size: 14, color: similar ? C.ink : C.red });
    },

    readout() {
      const { d, e, ratios, similar } = measure();
      const deg = (angle: number): string => `${fmt(toDeg(angle))}^\\circ`;
      const ratio = (top: string, bottom: string, value: number): string =>
        `\\frac{${top}}{${bottom}} = ${fmt(value, 3)}`;
      const tone = holds(similar);
      const atD = angleAt(A, d, e);
      const atB = angleAt(A, B, V);
      const atE = angleAt(A, e, d);
      const atC = angleAt(A, V, B);
      return [
        { label: "Along $AB$", tex: ratio("AD", "AB", ratios[0]), tone },
        { label: "Along $AC$", tex: ratio("AE", "AC", ratios[1]), tone },
        { label: "Across", tex: ratio("DE", "BC", ratios[2]), tone },
        {
          label: "Angles at $D$ and $B$",
          tex: `\\angle ADE = ${deg(atD)},\\quad \\angle B = ${deg(atB)}`,
          tone: holds(agree(atD, atB)),
        },
        {
          label: "Angles at $E$ and $C$",
          tex: `\\angle AED = ${deg(atE)},\\quad \\angle C = ${deg(atC)}`,
          tone: holds(agree(atE, atC)),
        },
        {
          label: "Verdict",
          tex: similar ? "\\triangle ADE \\sim \\triangle ABC" : "\\text{not similar}",
          tone,
        },
      ];
    },
  };
});
