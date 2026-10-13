// One added parallel solves a ratio problem. E divides AB as 1 : m and D
// divides CB as 1 : n; the cevians AD and CE cross at F. Drawing DG parallel
// to AB makes triangle CDG a small copy of CBE, and then AEF and DGF similar
// (congruent for 1 : 3 and 1 : 2), which gives AF/FD and EF/FC whatever the
// shape of the triangle.

import { C, tint } from "../draw.ts";
import { centroid, dist, fmt, inBox, lerp, lineLine, vec } from "../geo.ts";
import { labelAway, ratio } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const GIVEN = C.gold; // AE, and DG once it is shown to match
const COPY = C.pink; // triangle CDG, the small copy of CBE
const TWIN = C.blue; // triangle DGF, the partner of AEF
const PARALLEL = C.violet;
const EQUAL = 1e-9;

export default lesson((s) => {
  // A above, B lower left, C lower right, in boxes that cannot line up.
  const A = s.point(-0.5, 3.8, { label: "A", constrain: inBox(-5, 5, 1.4, 4.2) });
  const B = s.point(-5.5, -2.6, { label: "B", constrain: inBox(-7, -1.5, -3, -0.8) });
  const P = s.point(5.5, -2.2, { label: "C", constrain: inBox(1.5, 7, -3, -0.8) });
  const ratioSlider = (label: string, x: number, value: number) =>
    s.slider({ label, at: vec(x, -4.3), width: 3.2, min: 1, max: 5, value, step: 1 });
  const mSlider = ratioSlider("AE : EB = 1 :", -7.4, 3);
  const nSlider = ratioSlider("CD : DB = 1 :", 1.6, 2);

  const figure = () => {
    const m = mSlider.value;
    const n = nSlider.value;
    const E = lerp(A, B, 1 / (m + 1));
    const D = lerp(P, B, 1 / (n + 1));
    const F = lineLine(A, D, P, E) ?? centroid([A, B, P]);
    // DG ∥ AB cuts CE in the same ratio as D cuts CB.
    const G = lerp(P, E, 1 / (n + 1));
    return { m, n, E, D, F, G };
  };

  return {
    steps: [
      {
        title: "Two cuts, one crossing",
        text: "$E$ cuts $AB$ with $AE : EB = 1 : 3$, and $D$ cuts $CB$ with $CD : DB = 1 : 2$. Drag the corners: the triangle changes shape, yet $F$ keeps dividing $AD$ and $CE$ in the same ratios. Why?",
      },
      {
        title: "Draw one parallel",
        text: "Ratios want similar triangles, and none are in sight — so make some. Through $D$ draw $DG$ parallel to $AB$, stopping on $CE$ at $G$.",
      },
      {
        title: "A small copy",
        text: "Since $DG \\parallel BE$, triangle $CDG$ has the same angles as triangle $CBE$. They are similar with ratio $\\frac{CD}{CB} = \\frac13$, so $DG = \\frac13 EB$ and $CG = \\frac13 CE$.",
      },
      {
        title: "A congruent pair",
        text: "$EB = 3\\,AE$, so $DG = AE$. The parallels also make alternate angles equal: at $A$ and $D$, and at $E$ and $G$. So triangles $AEF$ and $DGF$ are congruent (ASA), giving $AF = FD$ and $EF = FG$.",
      },
      {
        title: "Count along CE",
        text: "$G$ leaves $EG = \\frac23 CE$, and $F$ cuts that in half. So $EF = FG = GC$, and the answers are $\\dfrac{EF}{FC} = \\dfrac12$ and $\\dfrac{AF}{FD} = 1$.",
      },
      {
        title: "Change the givens",
        text: "Set the sliders to $1 : m$ and $1 : n$. Now $DG = \\frac{m}{n+1}AE$, so the pair is similar rather than congruent, and the same counting gives $\\dfrac{AF}{FD} = \\dfrac{n+1}{m}$ and $\\dfrac{EF}{FC} = \\dfrac{n}{m+1}$.",
      },
    ],

    draw(g, f) {
      const { m, n, E, D, F, G } = figure();
      const centre = centroid([A, B, P]);
      const twins = Math.abs(dist(A, E) - dist(D, G)) < EQUAL;

      if (f.at(2) > 0) {
        g.polygon([P, B, E], { fill: tint(COPY, 0.07), stroke: null, alpha: f.at(2) });
        g.polygon([P, D, G], { fill: tint(COPY, 0.3), stroke: null, alpha: f.at(2) * (1 - 0.6 * f.at(3)) });
      }
      if (f.at(3) > 0) {
        g.polygon([A, E, F], { fill: tint(GIVEN, 0.28), stroke: null, alpha: f.at(3) });
        g.polygon([D, G, F], { fill: tint(TWIN, 0.3), stroke: null, alpha: f.at(3) });
      }

      g.polygon([A, B, P], { color: C.ink });
      g.segment(A, D, { color: C.dim, width: 2.5 });
      g.segment(P, E, { color: C.dim, width: 2.5 });
      g.segment(A, E, { color: GIVEN, width: 5 });
      labelAway(g, lerp(A, E, 0.5), "1", centre, { color: GIVEN, bold: false, px: 16 });
      labelAway(g, lerp(E, B, 0.5), fmt(m), centre, { bold: false, px: 16 });
      labelAway(g, lerp(P, D, 0.5), "1", centre, { bold: false, px: 16 });
      labelAway(g, lerp(D, B, 0.5), fmt(n), centre, { bold: false, px: 16 });

      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.segment(D, G, { color: f.step >= 3 && twins ? GIVEN : PARALLEL, width: 4, alpha });
        g.chevrons(D, G, 1, { color: PARALLEL, alpha });
        g.chevrons(B, E, 1, { color: PARALLEL, alpha });
        g.point(G, { color: PARALLEL, alpha });
        labelAway(g, G, "G", D, { color: PARALLEL, alpha });
      }
      if (f.at(3) > 0) {
        const alpha = f.at(3);
        g.angle(E, A, F, { color: C.cyan, r: 26, width: 2, alpha });
        g.angle(G, D, F, { color: C.cyan, r: 26, width: 2, alpha });
        g.angle(A, E, F, { color: C.orange, r: 16, arcs: 2, width: 2, alpha });
        g.angle(D, G, F, { color: C.orange, r: 16, arcs: 2, width: 2, alpha });
        if (twins) {
          g.ticks(A, E, 1, { alpha });
          g.ticks(D, G, 1, { alpha });
        }
      }
      if (f.at(4) > 0) {
        const alpha = f.at(4);
        // Equal pieces of CE share a tick count.
        const pieces = [[E, F], [F, G], [G, P]] as const;
        const lengths = pieces.map(([p, q]) => dist(p, q));
        pieces.forEach(([p, q], i) => {
          const count = lengths.findIndex((l) => Math.abs(l - lengths[i]) < EQUAL) + 2;
          g.ticks(p, q, count, { color: C.green, alpha });
        });
      }

      g.point(E, { color: GIVEN });
      g.point(D);
      g.point(F, { color: g.accent, r: 5.5 });
      labelAway(g, E, "E", centre, { color: GIVEN });
      labelAway(g, D, "D", centre);
      labelAway(g, F, "F", lerp(E, D, 0.5), { color: g.accent, px: 20 });
    },

    readout(f) {
      const { m, n, E, D, F, G } = figure();
      const af = ratio(dist(A, F), dist(F, D));
      const ef = ratio(dist(E, F), dist(F, P));
      const general = f.step >= 5;
      const rows: Readout[] = [
        { label: "Given", tex: `AE : EB = 1 : ${fmt(m)},\\quad CD : DB = 1 : ${fmt(n)}` },
      ];
      if (f.step >= 2) {
        rows.push({
          label: "$\\triangle CDG \\sim \\triangle CBE$",
          tex: `\\frac{DG}{EB} = ${fmt(ratio(dist(D, G), dist(E, B)), 3)},\\quad \\frac{CD}{CB} = ${fmt(ratio(dist(P, D), dist(P, B)), 3)}`,
          tone: "good",
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: "$\\triangle AEF \\sim \\triangle DGF$",
          tex: `\\frac{AE}{DG} = ${fmt(ratio(dist(A, E), dist(D, G)), 3)},\\quad \\frac{EF}{FG} = ${fmt(ratio(dist(E, F), dist(F, G)), 3)}`,
          tone: "good",
        });
      }
      rows.push(
        {
          label: "Along $AD$",
          tex: `\\frac{AF}{FD} = ${fmt(af, 3)}` + (general ? `,\\quad \\frac{n+1}{m} = \\frac{${fmt(n + 1)}}{${fmt(m)}} = ${fmt((n + 1) / m, 3)}` : ""),
          tone: "good",
        },
        {
          label: "Along $CE$",
          tex: `\\frac{EF}{FC} = ${fmt(ef, 3)}` + (general ? `,\\quad \\frac{n}{m+1} = \\frac{${fmt(n)}}{${fmt(m + 1)}} = ${fmt(n / (m + 1), 3)}` : ""),
          tone: "good",
        },
        { label: "Their sum", tex: `\\frac{EF}{FC} + \\frac{AF}{FD} = ${fmt(ef + af, 3)}` },
      );
      return rows;
    },
  };
});
