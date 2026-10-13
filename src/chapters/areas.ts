import type { Lesson } from "./types.ts";

export const areas: Lesson[] = [
  {
    slug: "area-scaling",
    part: "Similar Figures · One",
    name: "Scale Factor Squared",
    desc: "Slide the scale factor of a triangle, square or circle and watch its area grow by k².",
    accent: "#38d9a9",
    icon: `<rect x="4" y="19" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.2" />
      <rect x="12" y="5" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" />
      <path d="M 20 5 V 21 M 12 13 H 28" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "medial-triangle",
    part: "Similar Figures · Two",
    name: "The Midpoint Triangle",
    desc: "Drag a triangle's corners; the triangle on its midpoints always holds a quarter of the area.",
    accent: "#fbbf24",
    icon: `<polygon points="4,26 28,26 18,6" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linejoin="round" />
      <polygon points="16,26 23,16 11,16" fill="currentColor" fill-opacity="0.5" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "same-base-altitude",
    part: "Base and Altitude · One",
    name: "Same Base, Same Altitude",
    desc: "Split a triangle along its base and slide its apex along a parallel to see what changes the area.",
    accent: "#60a5fa",
    icon: `<polygon points="4,25 28,25 20,8" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linejoin="round" />
      <line x1="20" y1="8" x2="13" y2="25" stroke="currentColor" stroke-width="2" />
      <line x1="3" y1="8" x2="29" y2="8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "median-six-areas",
    part: "Base and Altitude · Two",
    name: "Six Equal Pieces",
    desc: "Reshape a triangle and watch its three medians keep cutting it into six equal areas.",
    accent: "#f472b6",
    icon: `<polygon points="4,26 28,26 13,6" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linejoin="round" />
      <path d="M 13 6 L 16 26 M 4 26 L 20.5 16 M 28 26 L 8.5 16" stroke="currentColor"
        stroke-width="1.8" />`,
    lab: true,
  },
  {
    slug: "trapezoid-diagonal-areas",
    part: "Base and Altitude · Three",
    name: "Areas Between Diagonals",
    desc: "Slide a trapezoid's corners and compare the four triangles its diagonals cut out.",
    accent: "#c084fc",
    icon: `<polygon points="11,8 21,8 28,25 4,25" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linejoin="round" />
      <path d="M 11 8 L 28 25 M 21 8 L 4 25" stroke="currentColor" stroke-width="1.8" />`,
    lab: true,
  },
  {
    slug: "octagon-from-square",
    part: "Cut and Paste · One",
    name: "Octagon From a Square",
    desc: "Drag a ring's radii, then size an octagon and find it as a square with its corners cut off.",
    accent: "#fb923c",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor"
      stroke-width="1.5" stroke-dasharray="3 3" />
      <polygon points="11.4,5 20.6,5 27,11.4 27,20.6 20.6,27 11.4,27 5,20.6 5,11.4" fill="none"
        stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "lune",
    part: "Cut and Paste · Two",
    name: "The Crescent and the Triangle",
    desc: "Resize a crescent built on a right triangle and find its area has no π in it.",
    accent: "#22d3ee",
    icon: `<path d="M 6 16 A 10 10 0 0 1 26 16 A 14.14 14.14 0 0 0 6 16 Z" fill="currentColor"
      fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <polygon points="6,16 26,16 16,26" fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "clover-leaves",
    part: "Cut and Paste · Three",
    name: "Four Leaves in a Square",
    desc: "Lay four semicircles over a square and count the layers to measure the leaves.",
    accent: "#a3e635",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" />
      <path d="M 5 27 A 11 11 0 0 1 27 27 M 5 5 A 11 11 0 0 0 27 5 M 5 5 A 11 11 0 0 1 5 27
        M 27 5 A 11 11 0 0 0 27 27" fill="none" stroke="currentColor" stroke-width="1.7" />`,
    lab: true,
  },
  {
    slug: "circle-leaves",
    part: "Cut and Paste · Four",
    name: "Leaves Between Circles",
    desc: "Grow four overlapping circles and split their leaves into sectors and equilateral triangles.",
    accent: "#ff8787",
    icon: `<circle cx="16" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="2.2" />
      <circle cx="16" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle cx="9.9" cy="20.5" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle cx="22.1" cy="20.5" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />`,
    lab: true,
  },
];
