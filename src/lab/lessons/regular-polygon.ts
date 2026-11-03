// The anatomy of a regular n-gon: one centre, a circumradius R out to the
// vertices and an apothem r out to the sides. Radii and apothems cut it into
// 2n congruent right triangles with angle 180°/n at the centre, which relate
// the side l to r and R and give the area as ½ · perimeter · apothem.

import { C, tint } from "../draw.ts";
import {
  add, angleAt, angleOf, dist, fmt, inRing, mid, normalize, polygonArea, regularPolygon, scale, sub, toDeg, vec,
} from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";

const O = vec(0, 0.5);
const CIRCUM = C.blue;
const APOTHEM = C.green;
const HALF_SIDE = C.gold;
const THETA = C.pink;

export default lesson((s) => {
  const sides = s.slider({ label: "n =", at: vec(-7.4, -4.3), width: 4.5, min: 3, max: 12, value: 5, step: 1 });
  // One vertex sets the size and the tilt of the whole polygon.
  const A = s.point(O.x - 1.9, O.y + 2.5, { label: "A", constrain: inRing(O, 1.8, 3.4) });

  const figure = () => {
    const n = sides.value;
    const pts = regularPolygon(O, dist(O, A), n, angleOf(sub(A, O)));
    const X = mid(pts[0], pts[1]);
    return { n, pts, B: pts[1], X, R: dist(O, pts[0]), r: dist(O, X), side: dist(pts[0], pts[1]) };
  };

  return {
    steps: [
      {
        title: "All sides, all angles",
        text: "Drag $A$ to resize and turn the polygon; slide $n$. Every side and every angle matches, so each interior angle is $\\tfrac{180^\\circ(n-2)}{n}$ and each exterior angle is $\\tfrac{360^\\circ}{n}$.",
      },
      {
        title: "One centre, two circles",
        text: "A regular polygon has a centre $O$. It is the same distance $R$ from every vertex (the circumradius) and the same distance $r$ from every side (the apothem), reaching each side at its midpoint at a right angle.",
      },
      {
        title: "2n right triangles",
        text: "The radii and apothems cut the polygon into $2n$ congruent right triangles like $OXA$. Their angles at $O$ share a full turn equally, so $\\theta = \\tfrac{360^\\circ}{2n} = \\tfrac{180^\\circ}{n}$.",
      },
      {
        title: "Side, apothem, circumradius",
        text: "Triangle $OXA$ has legs $r$ and $\\tfrac{l}{2}$ and hypotenuse $R$, where $l$ is the side. Opposite over adjacent gives $\\tan\\theta = \\tfrac{l/2}{r}$; opposite over hypotenuse gives $\\sin\\theta = \\tfrac{l/2}{R}$.",
      },
      {
        title: "Area",
        text: "Each right triangle has area $\\tfrac12 \\cdot \\tfrac{l}{2} \\cdot r$. There are $2n$ of them, so the area is $\\tfrac12 (nl) r$: half the perimeter times the apothem.",
      },
    ],

    likes: [
      {
        title: "Cutting a cake into equal slices",
        text: "Cut a round cake into $n$ equal slices from the centre and the cuts meet the edge at the corners of a regular $n$-gon. The centre of the cake is $O$, each cut is a circumradius $R$, and each slice's point is $\\tfrac{360^\\circ}{n}$. Halve a slice down its middle and you get one of the lesson's right triangles, with angle $\\tfrac{180^\\circ}{n}$ at $O$.",
      },
      {
        title: "Laying the slices in a row",
        text: "Take the $n$ triangular slices of a regular polygon and lay them in a row, alternately point up and point down. They fit together into a parallelogram whose height is the apothem $r$ and whose length is half the perimeter, so the area is $\\tfrac12 (nl) r$. This works neatly when $n$ is even, though the area is the same either way.",
      },
    ],

    uses: [
      {
        title: "Cutting mitres for an octagonal frame",
        text: "To make an eight-sided frame, each corner must be $\\tfrac{180^\\circ \\cdot 6}{8} = 135^\\circ$, so the frame turns through an exterior angle of $45^\\circ$ there, and each of the two pieces meeting at it is cut $22.5^\\circ$ off square. That is the angle set on the mitre saw; for any regular $n$-sided frame it is $\\tfrac{180^\\circ}{n}$.",
      },
      {
        title: "Flooring an octagonal gazebo",
        text: "A regular octagonal gazebo floor with sides of $1.5$ m has apothem $r = \\tfrac{0.75}{\\tan 22.5^\\circ} \\approx 1.81$ m and perimeter $12$ m. Its area is $\\tfrac12 \\cdot 12 \\cdot 1.81 \\approx 10.9$ square metres, which is how much decking to order before allowing for waste.",
      },
    ],

    draw(g, f) {
      const { n, pts, B, X, R, r } = figure();

      g.polygon(pts, { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.step === 0) {
        const beyond = add(B, scale(normalize(sub(B, A)), g.px(64)));
        g.segment(B, beyond, { color: C.dim, width: 2, dash: [6, 5] });
        g.angle(beyond, B, pts[2 % n], { color: C.orange, fill: true, r: 30, label: true, square: false });
        g.angle(pts[n - 1], A, B, { color: g.accent, fill: true, r: 30, label: true, square: false });
      }
      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.circle(O, R, { color: tint(CIRCUM, 0.7), width: 2, dash: [7, 6], alpha });
        g.circle(O, r, { color: tint(APOTHEM, 0.7), width: 2, dash: [7, 6], alpha });
      }
      if (f.at(2) > 0) {
        const alpha = f.at(2);
        for (let i = 0; i < n; i++) {
          g.segment(O, pts[i], { color: tint(CIRCUM, 0.5), width: 1.5, alpha });
          g.segment(O, mid(pts[i], pts[(i + 1) % n]), { color: tint(APOTHEM, 0.5), width: 1.5, alpha });
        }
        g.polygon([O, X, A], { fill: tint(THETA, 0.22), stroke: null, alpha });
        g.angle(X, O, A, { color: THETA, r: 34, label: "θ", square: false, alpha });
      }
      if (f.at(4) > 0) g.polygon(pts, { color: HALF_SIDE, width: 4, alpha: f.at(4) });
      if (f.at(1) > 0) {
        const alpha = f.at(1);
        g.segment(O, A, { color: CIRCUM, alpha });
        g.along(A, O, "R", { color: CIRCUM, alpha });
        g.segment(O, X, { color: APOTHEM, alpha });
        g.along(O, X, "r", { color: APOTHEM, alpha });
        g.angle(O, X, A, { color: APOTHEM, r: 16, width: 2, alpha });
        g.point(X, { label: "X", alpha });
        g.point(O, { label: "O", alpha });
      }
      if (f.at(3) > 0) {
        g.segment(X, A, { color: HALF_SIDE, width: 4.5, alpha: f.at(3) });
        g.along(X, A, "l/2", { color: HALF_SIDE, alpha: f.at(3) });
      }
    },

    readout(f) {
      const { n, pts, X, R, r, side } = figure();
      const theta = Math.PI / n;
      const half = side / 2;
      const perimeter = n * side;
      const rows: Readout[] = [
        {
          label: "Interior angle",
          tex: `\\frac{180^\\circ(${n} - 2)}{${n}} = ${fmt((180 * (n - 2)) / n)}^\\circ`,
          tone: Math.abs(toDeg(angleAt(pts[n - 1], pts[0], pts[1])) - (180 * (n - 2)) / n) < 1e-6 ? "good" : "warn",
        },
        { label: "Exterior angle", tex: `\\frac{360^\\circ}{${n}} = ${fmt(360 / n)}^\\circ` },
      ];
      if (f.step >= 2) {
        rows.push({
          label: "Angle at O, measured",
          tex: `\\theta = ${fmt(toDeg(angleAt(X, O, pts[0])))}^\\circ = \\frac{180^\\circ}{${n}}`,
        });
      }
      if (f.step >= 3) {
        rows.push(
          {
            label: "Apothem",
            tex: `\\frac{l/2}{r} = \\frac{${fmt(half, 2)}}{${fmt(r, 2)}} = ${fmt(half / r, 3)} = \\tan\\theta`,
            tone: Math.abs(half / r - Math.tan(theta)) < 1e-6 ? "good" : "warn",
          },
          {
            label: "Circumradius",
            tex: `\\frac{l/2}{R} = \\frac{${fmt(half, 2)}}{${fmt(R, 2)}} = ${fmt(half / R, 3)} = \\sin\\theta`,
            tone: Math.abs(half / R - Math.sin(theta)) < 1e-6 ? "good" : "warn",
          },
        );
      }
      if (f.step >= 4) {
        rows.push({
          label: `Area (${fmt(polygonArea(pts), 2)} by coordinates)`,
          tex: `\\tfrac12 (${fmt(perimeter, 2)})(${fmt(r, 2)}) = ${fmt((perimeter * r) / 2, 2)}`,
          tone: Math.abs(polygonArea(pts) - (perimeter * r) / 2) < 1e-6 ? "good" : "warn",
        });
      }
      return rows;
    },
  };
});
