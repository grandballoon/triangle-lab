// The altitude to the hypotenuse of a right triangle cuts it into two smaller
// right triangles, each similar to the whole and so to each other. Reading the
// side ratios off those similarities gives h² = pq and leg² = hypotenuse ×
// adjacent segment. The right-angle vertex rides a semicircle on the hypotenuse.

import { C, tint } from "../draw.ts";
import { dist, fmt, toRad, vec } from "../geo.ts";
import { inSector, sq } from "../kit/triangles-measure.ts";
import { lesson, type Readout } from "../scene.ts";

const A = vec(-5.5, -2.6);
const B = vec(5.5, -2.6);
const O = vec(0, -2.6);
const RADIUS = 5.5;

const ALPHA = C.gold; // the angle at A, wherever it reappears
const BETA = C.blue; // the angle at B
const P = C.green; // the hypotenuse segment next to A
const Q = C.violet; // the hypotenuse segment next to B
const H = C.pink; // the altitude

export default lesson((s) => {
  // Kept off the ends of the diameter so neither leg vanishes.
  const V = s.point(-2.2, 2.44, {
    label: "C",
    constrain: inSector(O, RADIUS, RADIUS, toRad(22), toRad(158)),
  });

  const measure = () => {
    const D = vec(V.x, A.y);
    return { D, p: dist(A, D), q: dist(D, B), h: dist(V, D), a: dist(B, V), b: dist(A, V), c: dist(A, B) };
  };

  return {
    steps: [
      {
        title: "A right angle on a semicircle",
        text: "Drag $C$ along the arc: the angle at $C$ stays a right angle. The altitude from $C$ has length $h$ and cuts the hypotenuse into $p$ and $q$. Compare $h^2$ with $pq$ in the panel.",
      },
      {
        title: "Two smaller right triangles",
        text: "The altitude $CD$ meets $AB$ at a right angle, so it splits the triangle into two right triangles, $ACD$ and $CBD$.",
      },
      {
        title: "All three are similar",
        text: "Triangle $ACD$ has a right angle and shares $\\alpha$ with the big triangle, so its third angle is $\\beta$. Likewise $CBD$ shares $\\beta$ and its third angle is $\\alpha$. By AA, $\\triangle ACD \\sim \\triangle CBD \\sim \\triangle ABC$.",
      },
      {
        title: "The altitude is a geometric mean",
        text: "In $ACD$ and $CBD$, compare the side opposite $\\alpha$ with the side opposite $\\beta$: $\\dfrac{h}{p} = \\dfrac{q}{h}$. So $h^2 = pq$.",
      },
      {
        title: "Each leg, too",
        text: "In $ACD$ and $ABC$, compare the leg next to $\\alpha$ with the hypotenuse: $\\dfrac{p}{b} = \\dfrac{b}{c}$, so $b^2 = cp$. In the same way $a^2 = cq$. Adding them: $a^2 + b^2 = c(p + q) = c^2$.",
      },
    ],

    likes: [
      {
        title: "Cutting a sandwich from the corner",
        text: "Take a right-angled half of a sandwich and cut it from the square corner straight across to the long edge, meeting it at a right angle. Both pieces are the same shape as the whole half, only smaller. That is all three similar triangles: the cut is $CD$, and it shares the long edge out as $p$ and $q$.",
      },
      {
        title: "Swapping a long rug for a square one",
        text: "Suppose a hallway rug is $p$ by $q$ and you want a square rug that covers the same floor. Its side must be the number that sits halfway between $p$ and $q$ by multiplying rather than adding: $h$, with $h^2 = pq$. The altitude draws that side for you, without any arithmetic.",
      },
    ],

    uses: [
      {
        title: "Will the van fit through the arch?",
        text: "A semicircular tunnel is 8 metres across. A van 2.5 metres wide drives through the middle, so each side of the van is 2.75 metres from one end of the floor and 5.25 metres from the other. Any point on the arch makes a right angle with the two ends of the floor, so the height above each side of the van is $\\sqrt{2.75 \\cdot 5.25} \\approx 3.8$ metres, the tallest the van can be.",
      },
      {
        title: "The strongest beam from a log",
        text: "An old carpenters' rule cuts the strongest rectangular beam from a round log: divide a diameter into three equal parts and draw perpendiculars from the two dividing points to the rim. Joining the rim points to the ends of the diameter gives the beam. Each leg squared is the diameter times the piece of it beside that leg, so from a 30 centimetre log the beam is $\\sqrt{30 \\cdot 10} \\approx 17$ centimetres wide and $\\sqrt{30 \\cdot 20} \\approx 24.5$ centimetres deep.",
      },
    ],

    draw(g, f) {
      const { D } = measure();

      g.arc(O, RADIUS, 0, Math.PI, { color: C.faint, width: 2, dash: [6, 6] });
      if (f.at(1) > 0) {
        g.polygon([A, D, V], { fill: tint(P, 0.14), stroke: null, alpha: f.at(1) });
        g.polygon([D, B, V], { fill: tint(Q, 0.14), stroke: null, alpha: f.at(1) });
      }

      g.segment(A, V, { color: C.ink });
      g.segment(B, V, { color: C.ink });
      g.segment(A, D, { color: P, width: 4 });
      g.segment(D, B, { color: Q, width: 4 });
      g.segment(V, D, { color: H, dash: f.step === 0 ? [7, 5] : [] });
      g.angle(A, V, B, { color: C.ink, r: 20 });
      g.angle(V, D, B, { color: H, r: 16, width: 2 });

      g.angle(B, A, V, { color: ALPHA, fill: true, r: 36, label: "α" });
      g.angle(V, B, A, { color: BETA, fill: true, r: 36, arcs: 2, label: "β" });
      if (f.at(2) > 0) {
        g.angle(A, V, D, { color: BETA, fill: true, r: 40, arcs: 2, alpha: f.at(2) });
        g.angle(D, V, B, { color: ALPHA, fill: true, r: 40, alpha: f.at(2) });
      }

      g.along(A, D, "p", { color: P, offset: -16, size: 16 });
      g.along(D, B, "q", { color: Q, offset: -16, size: 16 });
      g.along(D, V, "h", { color: H, offset: -13, size: 16 });
      g.along(A, V, "b", { offset: 16, size: 16 });
      g.along(V, B, "a", { offset: 16, size: 16 });
      g.along(A, B, "c = p + q", { color: C.dim, offset: -38 });

      g.point(A, { r: 4 });
      g.point(B, { r: 4 });
      g.point(D, { color: H, r: 4 });
      g.label(A, "A", { dx: -16, dy: -4, bold: true });
      g.label(B, "B", { dx: 16, dy: -4, bold: true });
      g.label(D, "D", { dx: -13, dy: 14, bold: true, color: H });
    },

    readout(f) {
      const { p, q, h, a, b, c } = measure();
      const rows: Readout[] = [
        { label: "Pieces", tex: `p = ${fmt(p)},\\quad q = ${fmt(q)},\\quad h = ${fmt(h)}` },
        {
          label: "Altitude squared",
          tex: `h^2 = ${fmt(h * h)},\\qquad pq = ${fmt(p * q)}`,
          tone: "good",
        },
      ];
      if (f.step >= 4) {
        rows.push(
          { label: "Leg next to $p$", tex: `b^2 = ${fmt(b * b)},\\qquad cp = ${fmt(c * p)}`, tone: "good" },
          { label: "Leg next to $q$", tex: `a^2 = ${fmt(a * a)},\\qquad cq = ${fmt(c * q)}`, tone: "good" },
          {
            label: "Pythagoras falls out",
            tex: `a^2 + b^2 = ${fmt(sq(a) + sq(b))} = c^2`,
            tone: "good",
          },
        );
      }
      return rows;
    },
  };
});
