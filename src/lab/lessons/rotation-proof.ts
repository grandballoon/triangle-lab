// A proof by motion. Equilateral triangles ABD and ACE stand outward on two
// sides of a triangle ABC. A 60° turn about A carries D to B and C to E, so it
// carries segment DC onto segment BE: the two are equal because a rotation
// keeps lengths, and they cross at 60° because it turns every line by its
// angle. The vertices are held in three boxes that keep ABC counter-clockwise
// (A above line BC, B left of C), so the turn is always anticlockwise and the
// outward triangles stay on the stage.

import { C, tint } from "../draw.ts";
import { angleAt, angleOf, dist, fmt, inBox, lineLine, rotateAbout, toDeg, toRad, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import fermatHubRoadsImage from "../../images/fermat-hub-roads.svg";
import rotaryTableHexagonImage from "../../images/rotary-table-hexagon.svg";

const TURN = toRad(60);
const FIRST = C.gold; // segment DC, and the triangle ADC that turns
const SECOND = C.orange; // segment BE, where DC lands
const ON_AB = C.blue; // equilateral triangle ABD
const ON_AC = C.green; // equilateral triangle ACE
const MOVING = C.pink;

export default lesson((s) => {
  const A = s.point(0.2, 1.6, { label: "A", constrain: inBox(-1, 1, 0.8, 2) });
  const B = s.point(-2.4, -2.2, { label: "B", constrain: inBox(-3.6, -1.2, -2.6, -1.4) });
  const Cv = s.point(2.6, -1.9, { label: "C", constrain: inBox(1.2, 3.6, -2.6, -1.4) });

  const figure = () => {
    // ABC runs anticlockwise, so outward on AB is clockwise from B, and on AC anticlockwise from C.
    const D = rotateAbout(B, A, -TURN);
    const E = rotateAbout(Cv, A, TURN);
    const P = lineLine(D, Cv, B, E);
    return { D, E, P };
  };

  return {
    steps: [
      {
        title: "Equilateral triangles on two sides",
        text: "On sides $AB$ and $AC$ of a triangle, stand equilateral triangles $ABD$ and $ACE$, pointing outward. Drag $A$, $B$ and $C$: the segments $DC$ and $BE$ always come out the same length. Why?",
      },
      {
        title: "Find the motion",
        text: "Turn the whole picture $60^\\circ$ anticlockwise about $A$. Since $AD = AB$ and $\\angle DAB = 60^\\circ$, the turn carries $D$ onto $B$. Since $AC = AE$ and $\\angle CAE = 60^\\circ$, it carries $C$ onto $E$.",
      },
      {
        title: "A turn keeps lengths",
        text: "A turn that sends $D$ to $B$ and $C$ to $E$ sends the segment $DC$ onto the segment $BE$. A rotation keeps every length, so $DC = BE$. Triangle $ADC$ lands on triangle $ABE$, so those two are congruent as well.",
      },
      {
        title: "It also gives the angle",
        text: "A rotation through $60^\\circ$ turns every line through $60^\\circ$. Line $DC$ is turned onto line $BE$, so the two lines cross at $60^\\circ$: where they meet at $P$, $\\angle DPB = 60^\\circ$ for every triangle.",
      },
      {
        title: "Writing it up",
        text: "The proof is short once the motion is found: let $R$ be the $60^\\circ$ turn about $A$; then $R(D) = B$ and $R(C) = E$, so $R$ maps $DC$ onto $BE$, and $DC = BE$. Checking triangles $ADC$ and $ABE$ by SAS proves the length too, but the turn is what tells you which triangles to compare, and it gives the $60^\\circ$ for free.",
      },
    ],

    likes: [
      {
        title: "Tracing paper and a pin",
        text: "Trace the figure onto tracing paper, push a pin through at $A$, and turn the paper a sixth of a full turn. The traced $D$ sits on $B$, the traced $C$ sits on $E$, so the traced segment $DC$ lies exactly along $BE$. Nothing stretched, so they must be the same length.",
      },
      {
        title: "Blades of a ceiling fan",
        text: "Turn a three-bladed fan a third of a turn and each blade lands where the next one was. So without measuring, you know all three blades are the same length and are spaced equally: the turn moved one onto the other, and turning does not change lengths or angles.",
      },
    ],

    uses: [
      {
        title: "Joining three towns with the least road",
        text: "Three towns want a hub with a straight road to each, using as little road as possible. Turn the triangle made by the hub $P$ and towns $A$ and $B$ through $60^\\circ$ about $A$: the three road lengths become a broken path from town $C$ to the corner $D$ of the equilateral triangle on $AB$. A path is shortest when straight, so the best hub lies on line $DC$, and when every corner of the triangle is under $120^\\circ$ the three roads meet at $120^\\circ$ to each other.",
        tags: ["travel", "building"],
        image: {
          src: fermatHubRoadsImage,
          caption: "The best hub for three towns sits where the roads meet at 120°; a 60° turn about one town proves it lies on the line from the far town to the outer corner of an equilateral triangle.",
          alt: "Three towns joined to a central hub by three roads at 120° to one another, with a dashed equilateral triangle standing on the side between two towns; a dashed gold line runs from its outer corner up to the hub and on along the road to the third town.",
        },
      },
      {
        title: "Cutting a hexagon on a rotary table",
        text: "To mill a hexagonal part, a machinist cuts one flat, then turns the rotary table exactly $60^\\circ$ and cuts again, six times. Each flat is the first one carried round by a turn, so all six are the same length and meet at the same angle, without measuring any of them.",
        tags: ["machines"],
        image: {
          src: rotaryTableHexagonImage,
          caption: "On a rotary table each new flat is the last one turned 60°, so all six flats of the hexagon come out equal.",
          alt: "A round rotary table seen from above with a hexagonal part clamped in the middle; one flat, beside the round cutter, is gold, and a curved arrow marked 60° shows the turn that brings the next flat to the cutter.",
        },
      },
    ],

    draw(g, f) {
      const { D, E, P } = figure();
      const tri = [A, B, Cv];

      g.polygon(tri, { fill: tint(C.ink, 0.06), color: C.ink, width: 3 });
      g.polygon([A, D, B], { fill: tint(ON_AB, 0.14), color: ON_AB, width: 2 });
      g.polygon([A, Cv, E], { fill: tint(ON_AC, 0.14), color: ON_AC, width: 2 });

      // The two segments the proof compares.
      const second = f.step === 1 ? 0.45 : 1;
      g.segment(D, Cv, { color: FIRST, width: 4 });
      g.segment(B, E, { color: SECOND, width: 4, alpha: second });
      if (f.step === 0) {
        g.along(D, Cv, fmt(dist(D, Cv)), { color: FIRST, offset: -16 });
        g.along(B, E, fmt(dist(B, E)), { color: SECOND, offset: 16 });
      }

      if (f.step >= 1) {
        // Triangle ADC turning about A, with the paths D → B and C → E.
        const t = f.at(1);
        const turned = [A, D, Cv].map((p) => rotateAbout(p, A, TURN * t));
        for (const [from, r] of [
          [D, dist(A, D)],
          [Cv, dist(A, Cv)],
        ] as [Vec, number][]) {
          const a = angleOf({ x: from.x - A.x, y: from.y - A.y });
          if (t > 0.01) g.arc(A, r, a, a + TURN * t, { color: C.dim, width: 2, dash: [5, 5] });
        }
        g.polygon(turned, { fill: tint(MOVING, 0.18), color: MOVING, width: 2, alpha: f.step >= 2 ? 0.6 : 1 });
        g.angle(D, A, B, { color: ON_AB, r: 30, label: "60°", alpha: f.step === 1 ? 1 : 0.5 });
        g.angle(Cv, A, E, { color: ON_AC, r: 30, label: "60°", alpha: f.step === 1 ? 1 : 0.5 });
      }

      if (f.step >= 2) {
        const a = f.at(2);
        g.ticks(D, Cv, 2, { color: FIRST, alpha: a });
        g.ticks(B, E, 2, { color: SECOND, alpha: a });
      }

      if (f.step >= 3 && P) {
        const a = f.at(3);
        g.angle(D, P, B, { color: C.gold, fill: true, r: 34, label: "60°", alpha: a });
        g.point(P, { label: "P", alpha: a });
      }

      g.point(D, { label: "D", color: ON_AB });
      g.point(E, { label: "E", color: ON_AC });
    },

    readout(f) {
      const { D, E, P } = figure();
      const dc = dist(D, Cv);
      const be = dist(B, E);
      if (f.step === 4) {
        return [
          { label: "Let R be the 60° turn about A", tex: "R:\\; \\text{rotation through } 60^\\circ \\text{ about } A" },
          { label: "AD = AB and ∠DAB = 60°", tex: "R(D) = B" },
          { label: "AC = AE and ∠CAE = 60°", tex: "R(C) = E" },
          { label: "R maps the segment between them", tex: "R(DC) = BE" },
          { label: "A rotation keeps lengths", tex: `DC = BE = ${fmt(be)}`, tone: "good" },
          { label: "A 60° rotation turns lines by 60°", tex: "\\angle DPB = 60^\\circ", tone: "good" },
        ];
      }
      const rows: Readout[] = [
        { label: "The two segments", tex: `DC = ${fmt(dc)},\\quad BE = ${fmt(be)}`, tone: f.step >= 2 ? "good" : "plain" },
        { label: "D turns onto B", tex: `AD = AB = ${fmt(dist(A, B))},\\quad \\angle DAB = ${fmt(toDeg(angleAt(D, A, B)))}^\\circ` },
        { label: "C turns onto E", tex: `AC = AE = ${fmt(dist(A, Cv))},\\quad \\angle CAE = ${fmt(toDeg(angleAt(Cv, A, E)))}^\\circ` },
      ];
      if (f.step >= 3 && P) {
        rows.push({ label: "Where the lines cross", tex: `\\angle DPB = ${fmt(toDeg(angleAt(D, P, B)))}^\\circ`, tone: "good" });
      }
      return rows;
    },
  };
});
