// The five regular polyhedra. Each is built from its corners alone; faces,
// edges and vertices are then counted from the solid itself, so Euler's
// formula V − E + F = 2 is checked rather than quoted. The last step lays one
// corner flat to show why there can be no sixth.

import { C, tint } from "../draw.ts";
import { polar, toRad, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { faces, Orbit, p3, point3, polygon3, scale3, type P3 } from "../solid.ts";
import { convexHull, glass, len3, type Polyhedron } from "../kit/solids.ts";

const PHI = (1 + Math.sqrt(5)) / 2;
const SIGNS = [-1, 1];
const RADIUS = 2.7; // every solid is drawn inscribed in a sphere this big

/** (±a, ±b, ±c) in all three cyclic orders of the coordinates. */
function cyclic(a: number, b: number, c: number): P3[] {
  const pts: P3[] = [];
  for (const sa of a === 0 ? [1] : SIGNS) {
    for (const sb of b === 0 ? [1] : SIGNS) {
      for (const sc of c === 0 ? [1] : SIGNS) {
        const [x, y, z] = [sa * a, sb * b, sc * c];
        pts.push(p3(x, y, z), p3(z, x, y), p3(y, z, x));
      }
    }
  }
  return pts;
}

const cubeCorners = SIGNS.flatMap((x) => SIGNS.flatMap((y) => SIGNS.map((z) => p3(x, y, z))));

const CORNERS = {
  tetrahedron: [p3(1, 1, 1), p3(1, -1, -1), p3(-1, 1, -1), p3(-1, -1, 1)],
  cube: cubeCorners,
  octahedron: cyclic(1, 0, 0),
  // A cube's corners plus three golden rectangles' worth, one per axis.
  dodecahedron: [...cubeCorners, ...cyclic(0, 1 / PHI, PHI)],
  // The corners of three mutually perpendicular golden rectangles.
  icosahedron: cyclic(0, 1, PHI),
};

type Name = keyof typeof CORNERS;
const NAMES = Object.keys(CORNERS) as Name[];
const FACE_NAME: Record<number, string> = { 3: "triangles", 4: "squares", 5: "pentagons" };

interface Solid extends Polyhedron {
  /** Sides per face, and faces per corner. */
  p: number;
  q: number;
}

function build(corners: P3[]): Solid {
  const fitted = corners.map((v) => scale3(v, RADIUS / len3(v)));
  const hull = convexHull(fitted);
  return { ...hull, p: hull.faces[0].length, q: hull.faces.filter((face) => face.includes(0)).length };
}

const SOLIDS = Object.fromEntries(NAMES.map((name) => [name, build(CORNERS[name])])) as Record<Name, Solid>;

const SOLID_SHIFT = -1.6;
const FAN_CENTRE = { x: 5.2, y: 0.9 };
const FAN_EDGE = 1.05;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.45, 0.35, { x: 0, y: 0.5 }));
  const pick = s.choice("Solid", NAMES, "dodecahedron");

  /** The interior angle of a face, in degrees. */
  const corner = (p: number): number => 180 - 360 / p;

  return {
    steps: [
      {
        title: "Five regular solids",
        text: "Pick a solid and turn it. Every face is the same regular polygon and every corner looks alike. Count faces $F$, vertices $V$ and edges $E$ — and keep an eye on $V - E + F$ in the panel.",
      },
      {
        title: "Counting without counting",
        text: "Each of the $F$ faces has $p$ sides, and every edge is a side of two faces, so $E = \\tfrac{pF}{2}$. Each corner is shared by $q$ faces, so $V = \\tfrac{pF}{q}$.",
      },
      {
        title: "Euler's formula",
        text: "For all five, $V - E + F = 2$. This is no accident of regular solids: it holds for every convex polyhedron — boxes, prisms and pyramids included.",
      },
      {
        title: "Why only five",
        text: "Lay the faces round one corner flat. They must leave a gap, or the corner could not fold up: $q$ angles must total less than $360^\\circ$. Only 3, 4 or 5 triangles, 3 squares, or 3 pentagons manage it.",
      },
    ],

    draw(g, f) {
      const solid = SOLIDS[pick.value];
      // The solid slides aside to make room for the flattened corner.
      cam.center = { x: SOLID_SHIFT * f.at(3), y: 0.5 };
      const at = (face: number[]): P3[] => face.map((i) => solid.vertices[i]);
      faces(g, cam, solid.faces.map((face) => ({ pts: at(face), ...glass(g.accent) })));

      if (f.step === 1) {
        polygon3(g, cam, at(solid.faces[0]), { fill: tint(C.pink, 0.3), stroke: C.pink, width: 4, alpha: f.at(1) });
      }
      if (f.at(3) > 0) {
        for (const face of solid.faces.filter((face) => face.includes(0))) {
          polygon3(g, cam, at(face), { fill: tint(C.gold, 0.28), stroke: C.gold, alpha: f.at(3) });
        }
      }
      for (const v of solid.vertices) point3(g, cam, v, { r: 3 });
      if (f.at(3) > 0) point3(g, cam, solid.vertices[0], { color: C.gold, r: 6, alpha: f.at(3) });

      if (f.at(3) > 0) {
        // The same q faces, flat: regular p-gons fanned round one point.
        const alpha = f.at(3);
        const angle = toRad(corner(solid.p));
        const gap = 2 * Math.PI - solid.q * angle;
        const start = -Math.PI / 2 + gap / 2;
        for (let i = 0; i < solid.q; i++) {
          const pts: Vec[] = [FAN_CENTRE];
          let heading = start + i * angle;
          for (let k = 1; k < solid.p; k++) {
            pts.push(polar(pts[k - 1], FAN_EDGE, heading));
            heading += Math.PI - angle;
          }
          g.polygon(pts, { fill: tint(C.gold, 0.22), stroke: C.gold, width: 2, alpha });
        }
        g.angleMark(FAN_CENTRE, start - gap, start, { color: C.pink, r: 30, fill: true, square: false, alpha });
        g.point(FAN_CENTRE, { color: C.gold, r: 6, alpha });
        g.label({ x: FAN_CENTRE.x, y: FAN_CENTRE.y - 1.35 }, `gap ${Math.round((gap * 180) / Math.PI)}°`, {
          color: C.pink,
          size: 14,
          alpha,
        });
      }
    },

    readout(f) {
      const solid = SOLIDS[pick.value];
      const { p, q } = solid;
      const F = solid.faces.length;
      const V = solid.vertices.length;
      const E = solid.edges.length;
      const rows: Readout[] = [
        { label: "Faces", tex: `F = ${F} \\ \\text{${FACE_NAME[p]}}` },
        { label: "Vertices", tex: `V = ${V}` },
        { label: "Edges", tex: `E = ${E}` },
      ];
      if (f.step === 1) {
        rows.push({
          label: "Edges, from the faces",
          tex: `\\tfrac{pF}{2} = \\tfrac{${p} \\cdot ${F}}{2} = ${(p * F) / 2}`,
          tone: (p * F) / 2 === E ? "good" : "warn",
        });
        rows.push({
          label: "Vertices, from the faces",
          tex: `\\tfrac{pF}{q} = \\tfrac{${p} \\cdot ${F}}{${q}} = ${(p * F) / q}`,
          tone: (p * F) / q === V ? "good" : "warn",
        });
      }
      if (f.step >= 3) {
        const total = q * corner(p);
        rows.push({
          label: "Angles at a corner",
          tex: `${q} \\cdot ${corner(p)}^\\circ = ${total}^\\circ < 360^\\circ`,
          tone: total < 360 ? "good" : "warn",
        });
      }
      rows.push({
        label: "Euler",
        tex: `V - E + F = ${V} - ${E} + ${F} = ${V - E + F}`,
        tone: V - E + F === 2 ? "good" : "warn",
      });
      return rows;
    },
  };
});
