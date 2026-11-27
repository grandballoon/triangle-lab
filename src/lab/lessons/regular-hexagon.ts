// The regular hexagon is six equilateral triangles around its centre. That
// one picture gives its circumradius, its area and its long diagonal; a
// 30-60-90 triangle gives the short diagonal; and three congruent corner
// triangles show that every other vertex makes an equilateral triangle.

import { C, tint } from "../draw.ts";
import { angleOf, dist, fmt, inRing, polygonArea, regularPolygon, sub, vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import hexMoveRangeImage from "../../images/hex-move-range.svg";
import hexNutSpannerImage from "../../images/hex-nut-spanner.svg";
import hexagonFloorTilesImage from "../../images/hexagon-floor-tiles.svg";
import offsetPlantingRowsImage from "../../images/offset-planting-rows.svg";

const O = vec(0, 0.3);
const SIDE = C.gold;
const SPOKE = C.blue;
const LONG = C.pink;
const SHORT = C.green;
const SQRT3 = Math.sqrt(3);
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

export default lesson((s) => {
  // One vertex sets the size and the tilt of the whole hexagon.
  const A = s.point(O.x - 3.2, O.y, { label: "A", constrain: inRing(O, 1.8, 3.8) });
  const corners = () => regularPolygon(O, dist(O, A), 6, angleOf(sub(A, O)));

  return {
    steps: [
      {
        title: "Six equal sides",
        text: "Drag $A$ to resize and turn the regular hexagon. Its six sides all have the same length $s$, and each interior angle is $120^\\circ$. What else is forced to be simple?",
      },
      {
        title: "Six equilateral triangles",
        text: "Join the centre $O$ to the vertices. Triangle $OAB$ is isosceles with $\\angle AOB = \\tfrac{360^\\circ}{6} = 60^\\circ$, so its base angles are $60^\\circ$ too: it is equilateral. The circumradius equals the side, $R = s$.",
      },
      {
        title: "Area",
        text: "An equilateral triangle of side $s$ has area $\\tfrac{\\sqrt3}{4}s^2$. Six of them fill the hexagon: its area is $6 \\cdot \\tfrac{\\sqrt3}{4}s^2 = \\tfrac{3\\sqrt3}{2}s^2$.",
      },
      {
        title: "The long diagonal",
        text: "$AD$ joins opposite vertices, straight through $O$. It is two triangle sides laid end to end, so $AD = 2s$.",
      },
      {
        title: "The short diagonal",
        text: "Isosceles triangle $ABC$ has a $120^\\circ$ apex, so $\\angle BAC = 30^\\circ$ and $\\angle CAF = 120^\\circ - 30^\\circ = 90^\\circ$. Right triangle $CAF$ has leg $AF = s$ and hypotenuse $CF = 2s$: it is 30-60-90, so $AC = s\\sqrt3$.",
      },
      {
        title: "Every other vertex",
        text: "Triangles $ABC$, $CDE$ and $EFA$ each have two sides $s$ around a $120^\\circ$ angle, so they are congruent (SAS). Their third sides match: $AC = CE = EA$, and triangle $ACE$ is equilateral.",
      },
    ],

    likes: [
      {
        title: "Six coins round one",
        text: "Lay one coin on the table and push six identical coins round it: they fit exactly, each touching the middle one and its two neighbours. Their centres are the vertices of a regular hexagon, and the middle coin's centre is $O$. Every centre-to-centre distance is two radii, so the side $s$ equals the circumradius $R$, and the hexagon is six equilateral triangles.",
      },
      {
        title: "Folding in every other corner",
        text: "Cut out a paper hexagon and fold corners $B$, $D$ and $F$ inwards along $AC$, $CE$ and $EA$. All three tips meet exactly at the centre $O$, because $ABCO$ is a rhombus with all sides $s$. What is left uncovered is triangle $ACE$, equilateral and exactly half the hexagon.",
      },
    ],

    uses: [
      {
        title: "Choosing a spanner",
        text: "A hex nut is sized by its width across the flats, which is the short diagonal $s\\sqrt3$. A $13$ mm nut therefore has sides of $\\tfrac{13}{\\sqrt3} \\approx 7.5$ mm and measures $2s \\approx 15$ mm across the corners, so a socket for it must grip $13$ mm flats while leaving room for $15$ mm corners to turn inside it.",
        tags: ["machines"],
        image: {
          src: hexNutSpannerImage,
          caption: "A spanner on a hex nut: its jaws grip the 13 mm flats, while the corners, 15 mm apart, need room to turn inside a socket.",
          alt: "A red open-ended spanner gripping the top and bottom flats of a steel hex nut, with a gold dashed hexagon over the nut, a 13 mark across the flats and a 15 mark across the corners.",
        },
      },
      {
        title: "Ordering hexagonal floor tiles",
        text: "A hexagonal tile with $10$ cm sides covers $\\tfrac{3\\sqrt3}{2} \\cdot 10^2 \\approx 260$ square centimetres, so a square metre of floor takes about $\\tfrac{10000}{260} \\approx 38.5$ tiles. Tilers work from that figure and add a margin for the cut pieces at the edges.",
        tags: ["building", "home"],
        image: {
          src: hexagonFloorTilesImage,
          caption: "A floor of hexagonal tiles: each tile with 10 cm sides covers about 260 square centimetres, so a square metre takes about 38 and a half tiles.",
          alt: "A honeycomb of cream, teal and grey hexagonal tiles filling a floor, with one tile outlined in dashed gold and its side marked 10.",
        },
      },
      {
        title: "Planting in offset rows",
        text: "Gardeners often set plants in offset rows, each at a corner of equilateral triangles, rather than in a square grid. At spacing $d$ each plant then has a hexagon of ground $d$ across its flats, so its side is $\\frac{d}{\\sqrt3}$ and its area is $\\frac{3\\sqrt3}{2} \\cdot \\frac{d^2}{3} \\approx 0.866\\,d^2$, against $d^2$ in a square grid. At $30$ cm spacing a $3$ m by $3$ m bed holds $100$ plants in squares but about $115$ in offset rows, every one still $30$ cm from its neighbours.",
        tags: ["gardening", "trade-tricks"],
        image: {
          src: offsetPlantingRowsImage,
          caption: "A bed planted in offset rows: each plant has a hexagon of ground 30 cm across its flats, so the bed holds about 15% more than a square grid.",
          alt: "A brown soil bed with four rows of green plants, every other row shifted half a space along. One plant sits in a dashed gold hexagon touching its neighbours' halfway points, and a gold line to the next plant is marked 30.",
        },
      },
      {
        title: "How far a piece reaches on hexes",
        text: "In board and video games played on hexes, a piece that can move $n$ steps reaches a big hexagon of cells around it. Like the hexagon in this lesson it splits into six triangular wedges, and ring $k$ out holds $6k$ cells, so the count is $1 + 6(1 + 2 + \\dots + n) = 3n(n + 1) + 1$. A move of $3$ reaches $37$ hexes and a move of $6$ reaches $127$, more than three times as many.",
        tags: ["game-design"],
        image: {
          src: hexMoveRangeImage,
          caption: "A playing piece on a hex grid: the cells it can reach in 3 moves make a big hexagon of six wedges, 37 cells in all.",
          alt: "A grid of small hexagons with a red playing piece on a cream cell in the middle, surrounded by rings of blue, teal and green cells. A dashed gold hexagon joins the six corner cells of the outer ring, with dashed gold spokes from the piece to each corner.",
        },
      },
    ],

    draw(g, f) {
      const pts = corners();
      const [, B, Cc, D, E, F] = pts;
      // A construction fades in on its own step and recedes once the story moves on.
      const during = (from: number, to: number): number => (f.step > to ? 0.22 : f.at(from));

      g.polygon(pts, { fill: "rgba(255, 255, 255, 0.05)" });

      if (f.at(2) > 0) {
        pts.forEach((p, i) => {
          const fill = tint(i % 2 ? SPOKE : SIDE, 0.2);
          g.polygon([O, p, pts[(i + 1) % 6]], { fill, stroke: null, alpha: during(2, 2) });
        });
      }
      if (f.at(1) > 0) {
        const alpha = during(1, 2);
        g.polygon([O, A, B], { fill: tint(SIDE, 0.18), stroke: null, alpha: during(1, 1) });
        for (const p of pts) g.segment(O, p, { color: SPOKE, width: 2.5, alpha });
        g.angle(A, O, B, { color: SPOKE, r: 26, label: "60°", alpha: during(1, 1) });
        g.ticks(O, A, 1, { color: SIDE, alpha: during(1, 1) });
        g.ticks(O, B, 1, { color: SIDE, alpha: during(1, 1) });
        g.point(O, { label: "O", alpha: f.at(1) });
      }
      if (f.at(3) > 0) {
        g.segment(A, D, { color: LONG, width: 4, alpha: during(3, 3) });
        g.along(O, D, "2s", { color: LONG, alpha: during(3, 3) });
      }
      if (f.at(5) > 0) {
        g.polygon([A, Cc, E], { fill: tint(SHORT, 0.2), color: SHORT, alpha: f.at(5) });
        for (const [p, q] of [[A, Cc], [Cc, E], [E, A]]) g.ticks(p, q, 2, { color: SHORT, alpha: f.at(5) });
        for (const [p, v, q] of [[A, B, Cc], [Cc, D, E], [E, F, A]]) {
          g.angle(p, v, q, { color: C.orange, r: 20, width: 2, alpha: f.at(5) });
        }
      }
      if (f.at(4) > 0) {
        const alpha = during(4, 4);
        g.polygon([Cc, A, F], { fill: tint(SHORT, 0.16), stroke: null, alpha });
        g.segment(Cc, F, { color: LONG, width: 2.5, dash: [7, 6], alpha });
        g.along(Cc, F, "2s", { color: LONG, alpha });
        g.segment(A, Cc, { color: SHORT, width: 4, alpha: f.at(4) });
        g.along(A, Cc, "s√3", { color: SHORT, alpha, offset: -18 });
        g.angle(B, A, Cc, { color: C.orange, r: 44, label: "30°", alpha });
        g.angle(Cc, A, F, { color: SHORT, r: 20, alpha });
      }

      pts.forEach((p, i) => {
        g.ticks(p, pts[(i + 1) % 6], 1, { color: SIDE });
        if (i > 0) g.point(p, { label: "ABCDEF"[i] });
      });
      g.along(A, B, "s", { color: SIDE, offset: -18 });
    },

    readout(f) {
      const pts = corners();
      const [, B, Cc, D, E] = pts;
      const side = dist(A, B);
      const rows: Readout[] = [{ label: "Side", tex: `s = AB = ${fmt(side, 2)}` }];
      if (f.step >= 1) {
        rows.push({ label: "Circumradius", tex: `R = OA = ${fmt(dist(O, A), 2)} = s`, tone: close(dist(O, A), side) ? "good" : "warn" });
      }
      if (f.step >= 2) {
        const area = ((3 * SQRT3) / 2) * side * side;
        rows.push({
          label: `Area (${fmt(polygonArea(pts), 2)} by coordinates)`,
          tex: `\\tfrac{3\\sqrt3}{2}(${fmt(side, 2)})^2 = ${fmt(area, 2)}`,
          tone: close(polygonArea(pts), area) ? "good" : "warn",
        });
      }
      if (f.step >= 3) {
        rows.push({
          label: "Long diagonal",
          tex: `AD = ${fmt(dist(A, D), 2)} = 2s`,
          tone: close(dist(A, D), 2 * side) ? "good" : "warn",
        });
      }
      if (f.step >= 4) {
        rows.push({
          label: "Short diagonal",
          tex: `AC = ${fmt(dist(A, Cc), 2)} = s\\sqrt3`,
          tone: close(dist(A, Cc), side * SQRT3) ? "good" : "warn",
        });
      }
      if (f.step >= 5) {
        rows.push({
          label: "Triangle ACE",
          tex: `CE = ${fmt(dist(Cc, E), 2)},\\; EA = ${fmt(dist(E, A), 2)}`,
          tone: close(dist(Cc, E), dist(E, A)) && close(dist(E, A), dist(A, Cc)) ? "good" : "warn",
        });
      }
      return rows;
    },
  };
});
