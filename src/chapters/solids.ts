import type { Lesson } from "./types.ts";

export const solids: Lesson[] = [
  {
    slug: "lines-and-planes",
    part: "Space · One",
    name: "Lines and Planes",
    desc: "Tilt and lift a line over a plane: in it, through it, parallel, perpendicular, or skew.",
    accent: "#22d3ee",
    icon: `<polygon points="3,22 11,12 29,12 21,22" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linejoin="round" />
      <line x1="20" y1="4" x2="14" y2="17" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="12.5" y1="22" x2="11" y2="28" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-dasharray="2 3" />`,
    lab: true,
  },
  {
    slug: "sphere",
    part: "Spheres · One",
    name: "Slicing a Sphere",
    desc: "Slide a plane through a sphere and find the radius of the circle it cuts.",
    accent: "#f472b6",
    icon: `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.5" />
      <ellipse cx="16" cy="11" rx="10.9" ry="3" fill="none" stroke="currentColor"
        stroke-width="2" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "cube",
    part: "Cubes and Boxes · One",
    name: "Inside a Cube",
    desc: "Find the cube's diagonals, then two equilateral triangles hiding among its corners.",
    accent: "#ffd43b",
    icon: `<polygon points="5,12 19,12 19,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linejoin="round" />
      <polyline points="5,12 12,5 26,5 26,19 19,26" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />
      <line x1="19" y1="12" x2="26" y2="5" stroke="currentColor" stroke-width="2" />
      <polygon points="5,12 19,26 26,5" fill="currentColor" fill-opacity="0.3"
        stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "box-diagonal",
    part: "Cubes and Boxes · Two",
    name: "The Diagonal of a Box",
    desc: "Turn a box in your hand and cross it corner to corner with Pythagoras, twice.",
    accent: "#60a5fa",
    icon: `<polygon points="5,12 19,12 19,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linejoin="round" />
      <polyline points="5,12 12,6 26,6 26,20 19,26" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />
      <line x1="19" y1="12" x2="26" y2="6" stroke="currentColor" stroke-width="2" />
      <line x1="5" y1="26" x2="26" y2="6" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "painted-cube",
    part: "Cubes and Boxes · Three",
    name: "The Painted Cube",
    desc: "Paint a cube, saw it into blocks, and pull them apart to count the painted faces.",
    accent: "#ff6b6b",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 12.3 5 V 27 M 19.7 5 V 27 M 5 12.3 H 27 M 5 19.7 H 27" fill="none"
        stroke="currentColor" stroke-width="1.5" />
      <rect x="12.3" y="12.3" width="7.4" height="7.4" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "prism-cylinder",
    part: "Prisms and Cylinders · One",
    name: "Unrolling a Can",
    desc: "Unwrap the wall of a prism or cylinder into a rectangle and walk the shortest way round.",
    accent: "#38d9a9",
    icon: `<ellipse cx="16" cy="8" rx="9" ry="3.5" fill="none" stroke="currentColor"
      stroke-width="2.5" />
      <path d="M 7 8 V 24 A 9 3.5 0 0 0 25 24 V 8" fill="none" stroke="currentColor"
        stroke-width="2.5" />
      <path d="M 7 9 C 12 20 20 14 25 25" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "pyramid",
    part: "Pyramids and Cones · One",
    name: "Pyramids",
    desc: "Shape a regular pyramid, weigh it against its prism, and measure its slant height.",
    accent: "#fb923c",
    icon: `<polygon points="16,4 4,22 15,28 28,21" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="4" x2="15" y2="28" stroke="currentColor" stroke-width="2" />
      <line x1="16" y1="4" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "cone",
    part: "Pyramids and Cones · Two",
    name: "Unrolling a Cone",
    desc: "Cut a cone along its slant and lay it flat: the sector's area is the cone's.",
    accent: "#c084fc",
    icon: `<path d="M 6 24 L 16 4 L 26 24" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linejoin="round" />
      <ellipse cx="16" cy="24" rx="10" ry="3.5" fill="none" stroke="currentColor"
        stroke-width="2.5" />
      <line x1="16" y1="4" x2="16" y2="24" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "tetrahedron-volume",
    part: "Polyhedra · One",
    name: "Volume of a Tetrahedron",
    desc: "Drop the altitude of a regular tetrahedron onto its base's centroid and find its volume.",
    accent: "#a3e635",
    icon: `<polygon points="16,4 4,23 18,28 28,19" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="4" x2="18" y2="28" stroke="currentColor" stroke-width="2" />
      <line x1="4" y1="23" x2="28" y2="19" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "octahedron-volume",
    part: "Polyhedra · Two",
    name: "Volume of an Octahedron",
    desc: "Split a regular octahedron into two square pyramids and stack up their volume.",
    accent: "#facc15",
    icon: `<polygon points="16,3 4,16 16,29 28,16" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polyline points="4,16 13,19 28,16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />
      <line x1="16" y1="3" x2="13" y2="19" stroke="currentColor" stroke-width="2" />
      <line x1="13" y1="19" x2="16" y2="29" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "platonic-solids",
    part: "Polyhedra · Three",
    name: "The Five Regular Solids",
    desc: "Turn each regular solid, count its faces, corners and edges, and test Euler's formula.",
    accent: "#818cf8",
    icon: `<polygon points="16,3 27.3,9.5 27.3,22.5 16,29 4.7,22.5 4.7,9.5" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="16,10 22,14.4 19.7,21.5 12.3,21.5 10,14.4" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M 16 10 V 3 M 22 14.4 L 27.3 9.5 M 19.7 21.5 L 22 26 M 12.3 21.5 L 10 26 M 10 14.4 L 4.7 9.5"
        fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
];
