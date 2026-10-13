// Four more congruence tests: AAS for any triangle, and HL, LL and SA for
// right triangles. The learner shapes triangle ABC; triangle DEF is then
// constructed from the given parts alone, and the construction leaves only one
// place for its last vertex — so the two triangles must match.

import { C, type Draw } from "../draw.ts";
import { add, angleAt, clamp, dist, fmt, normalize, polar, scale, sub, toDeg, type Vec } from "../geo.ts";
import { agree, holds } from "../kit/triangles-centres.ts";
import { lesson, type Readout } from "../scene.ts";

type Mode = "AAS" | "HL" | "LL" | "SA";
const MODES: readonly Mode[] = ["AAS", "HL", "LL", "SA"];

// A triangle's parts, named as in ABC: a = BC, b = CA, c = AB, β at B, γ at C.
type Part = "a" | "b" | "c" | "beta" | "gamma";
interface Triangle {
  A: Vec;
  B: Vec;
  C: Vec;
}

const GIVEN: Record<Mode, readonly Part[]> = {
  AAS: ["beta", "gamma", "c"],
  HL: ["c", "a"],
  LL: ["a", "b"],
  SA: ["beta", "c"],
};
const COLOR: Record<Part, string> = { a: C.gold, b: C.cyan, c: C.orange, beta: C.pink, gamma: C.violet };
const TICKS: Record<"a" | "b" | "c", number> = { a: 1, b: 2, c: 3 };
const FORCED = C.green;

const CAPTION: Record<Mode, { title: string; why: string }> = {
  AAS: {
    title: "AAS · two angles and a side not between them",
    why: "β and γ leave 180° − β − γ for the angle at D, which aims the last side at F.",
  },
  HL: {
    title: "HL · the hypotenuse and one leg",
    why: "The arc of radius c about E crosses the perpendicular at F only once above the base.",
  },
  LL: {
    title: "LL · the two legs",
    why: "The right angle lies between the legs, so marking b on the perpendicular fixes D.",
  },
  SA: {
    title: "SA · one side and one acute angle",
    why: "Angle β and length c fix D; the perpendicular dropped from D fixes F.",
  },
};

// The fixed corner C of the learner's triangle, and where its copy is built.
const CORNER = { x: -6.8, y: -2.2 };
const SHIFT = { x: 8, y: 0 };
const DASH = [6, 5];

/** A triangle with its given parts picked out in colour. */
function drawTriangle(g: Draw, t: Triangle, mode: Mode): void {
  const given = GIVEN[mode];
  g.polygon([t.A, t.B, t.C], { fill: "rgba(255, 255, 255, 0.05)", color: C.dim, width: 2 });
  if (given.includes("beta")) g.angle(t.A, t.B, t.C, { color: COLOR.beta, fill: true, r: 30, label: "β" });
  if (given.includes("gamma")) g.angle(t.A, t.C, t.B, { color: COLOR.gamma, fill: true, r: 30, label: "γ" });
  if (mode !== "AAS") g.angle(t.A, t.C, t.B, { r: 15, width: 2 });

  // Each side, directed so that a positive label offset points outward.
  const sides = { a: [t.B, t.C], b: [t.C, t.A], c: [t.A, t.B] } as const;
  for (const part of ["a", "b", "c"] as const) {
    if (!given.includes(part)) continue;
    const [p, q] = sides[part];
    g.segment(p, q, { color: COLOR[part], width: 4 });
    g.ticks(p, q, TICKS[part], { color: COLOR[part] });
    g.along(p, q, part, { color: COLOR[part], offset: 18 });
  }
}

export default lesson((s) => {
  const mode = s.choice("Criterion", MODES, "HL");

  const B = s.point(CORNER.x + 3.6, CORNER.y, {
    label: "B",
    constrain: (p) => ({ x: clamp(p.x, CORNER.x + 1.5, CORNER.x + 4.5), y: CORNER.y }),
  });
  // For the right-triangle tests A stays directly above C. For AAS it roams,
  // and `lean` remembers how far it sits to the right of C.
  let lean = 1.6;
  const A = s.point(CORNER.x, CORNER.y + 3.2, {
    label: "A",
    constrain: (p) => {
      const y = clamp(p.y, CORNER.y + 1.5, CORNER.y + 4.6);
      if (mode.value !== "AAS") return { x: CORNER.x, y };
      const x = clamp(p.x, CORNER.x + 0.5, Math.min(CORNER.x + 4.5, B.x + 1));
      lean = x - CORNER.x;
      return { x, y };
    },
  });
  const placeA = (): void => A.set({ x: mode.value === "AAS" ? CORNER.x + lean : CORNER.x, y: A.y });

  const measure = () => ({
    a: dist(B, CORNER),
    b: dist(A, CORNER),
    c: dist(A, B),
    beta: angleAt(A, B, CORNER),
    gamma: angleAt(A, CORNER, B),
  });

  /** Triangle DEF, built from nothing but the parts the criterion grants. */
  const construct = (): Triangle => {
    const { a, b, c, beta, gamma } = measure();
    const F = add(CORNER, SHIFT);
    const E = add(B, SHIFT);
    switch (mode.value) {
      case "LL":
        return { A: { x: F.x, y: F.y + b }, B: { x: F.x + a, y: F.y }, C: F };
      case "HL":
        return { A: { x: F.x, y: F.y + Math.sqrt(Math.max(c * c - a * a, 0)) }, B: { x: F.x + a, y: F.y }, C: F };
      case "SA": {
        const D = polar(E, c, Math.PI - beta);
        return { A: D, B: E, C: { x: D.x, y: E.y } };
      }
      case "AAS": {
        // Law of sines in DEF, whose angle at D is what β and γ leave over.
        const EF = (c * Math.sin(Math.PI - beta - gamma)) / Math.sin(gamma);
        return { A: polar(E, c, Math.PI - beta), B: E, C: { x: E.x - EF, y: E.y } };
      }
    }
  };

  return {
    steps: [
      {
        title: "Which parts are enough?",
        text: "Choose a criterion, then drag $A$ and $B$. The coloured parts of triangle $ABC$ are the given ones. Triangle $DEF$ is built from those parts alone, yet it always comes out the same.",
      },
      {
        title: "AAS is ASA in disguise",
        text: "Choose AAS. Two angles fix the third, because all three add up to $180^\\circ$. So the given side does lie between two known angles after all, and ASA applies.",
      },
      {
        title: "LL is SAS",
        text: "Choose LL. The two legs of a right triangle enclose its right angle, so the triangles agree in two sides and the angle between them.",
      },
      {
        title: "SA is ASA again",
        text: "Choose SA. The right angle and one acute angle $\\beta$ leave $90^\\circ - \\beta$ for the last angle, so all the angles match. Any one pair of matching sides then gives ASA.",
      },
      {
        title: "HL needs the right angle",
        text: "Choose HL. Two sides and an angle not between them usually allow two triangles. Here the arc from $E$ meets the perpendicular once on each side of the base, and those are mirror images, so $DF = \\sqrt{c^2 - a^2}$ either way.",
      },
    ],

    draw(g) {
      placeA();
      const m = mode.value;
      const { b, c } = measure();
      const abc: Triangle = { A, B, C: CORNER };
      const def = construct();
      const { A: D, B: E, C: F } = def;
      const locus = { color: C.dim, width: 1.5, dash: DASH };
      const towardD = normalize(sub(D, E));
      const bearing = Math.atan2(towardD.y, towardD.x);

      // The loci the construction draws, before the triangle itself.
      if (m === "LL" || m === "HL") {
        g.segment({ x: F.x, y: F.y - 0.9 }, { x: F.x, y: 3.1 }, locus);
        if (m === "LL") g.arc(F, b, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, { color: COLOR.b, width: 2, dash: DASH });
        else g.arc(E, c, bearing - 0.4, bearing + 0.4, { color: COLOR.c, width: 2, dash: DASH });
      } else {
        g.segment({ x: 0.7, y: E.y }, { x: E.x + 0.6, y: E.y }, locus);
        g.segment(E, add(D, scale(towardD, 0.8)), locus);
        g.arc(E, c, bearing - 0.3, bearing + 0.3, { color: COLOR.c, width: 2, dash: DASH });
        if (m === "SA") {
          g.segment({ x: D.x, y: D.y + 0.6 }, { x: D.x, y: F.y - 0.6 }, { ...locus, color: FORCED });
        } else {
          const pastF = add(F, scale(normalize(sub(F, D)), 0.7));
          g.segment(D, pastF, { ...locus, color: FORCED });
          g.angle(E, D, F, { color: FORCED, fill: true, r: 24 });
        }
      }

      drawTriangle(g, abc, m);
      drawTriangle(g, def, m);

      const forced = m === "LL" || m === "HL" ? D : F;
      g.circle(forced, g.px(12), { color: FORCED, width: 2.5 });
      g.label(CORNER, "C", { bold: true, dx: -14, dy: -14 });
      g.label(D, "D", { bold: true, dy: 20 });
      g.label(E, "E", { bold: true, dx: 14, dy: -14 });
      g.label(F, "F", { bold: true, dx: -14, dy: -14 });
      for (const p of [CORNER, D, E, F]) g.point(p, { r: 3.5 });

      g.label({ x: CORNER.x + 2.4, y: -3.4 }, "the given parts are coloured", { color: C.dim, size: 13 });
      g.label({ x: CORNER.x + SHIFT.x + 2.4, y: -3.4 }, "built from those parts alone", { color: C.dim, size: 13 });
      g.label({ x: 0, y: 4.5 }, CAPTION[m].title, { size: 17, bold: true, color: g.accent });
      g.label({ x: 0, y: 3.9 }, CAPTION[m].why, { size: 14 });
    },

    readout() {
      placeA();
      const { a, b, c, beta, gamma } = measure();
      const { A: D, B: E, C: F } = construct();
      const deg = (angle: number): string => `${fmt(toDeg(angle))}^\\circ`;
      const given: Record<Mode, string> = {
        AAS: `\\beta = ${deg(beta)},\\ \\gamma = ${deg(gamma)},\\ c = ${fmt(c, 2)}`,
        HL: `\\angle C = 90^\\circ,\\ c = ${fmt(c, 2)},\\ a = ${fmt(a, 2)}`,
        LL: `\\angle C = 90^\\circ,\\ a = ${fmt(a, 2)},\\ b = ${fmt(b, 2)}`,
        SA: `\\angle C = 90^\\circ,\\ \\beta = ${deg(beta)},\\ c = ${fmt(c, 2)}`,
      };
      const forced: Record<Mode, string> = {
        AAS: `\\angle D = 180^\\circ - \\beta - \\gamma = ${deg(Math.PI - beta - gamma)}`,
        HL: `DF = \\sqrt{c^2 - a^2} = ${fmt(dist(D, F), 2)}`,
        LL: `DE = \\sqrt{a^2 + b^2} = ${fmt(dist(D, E), 2)}`,
        SA: `\\angle D = 90^\\circ - \\beta = ${deg(Math.PI / 2 - beta)}`,
      };
      const pair = (label: string, first: string, x: number, second: string, y: number): Readout => ({
        label,
        tex: `${first} = ${fmt(x, 2)},\\quad ${second} = ${fmt(y, 2)}`,
        tone: holds(agree(x, y)),
      });
      const matches = agree(a, dist(E, F)) && agree(b, dist(F, D)) && agree(c, dist(D, E));
      return [
        { label: "Given", tex: given[mode.value] },
        { label: "Forced by the givens", tex: forced[mode.value] },
        pair("First sides", "BC", a, "EF", dist(E, F)),
        pair("Second sides", "CA", b, "FD", dist(F, D)),
        pair("Third sides", "AB", c, "DE", dist(D, E)),
        { label: "Verdict", tex: "\\triangle ABC \\cong \\triangle DEF", tone: holds(matches) },
      ];
    },
  };
});
