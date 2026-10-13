import type { Lesson } from "./types.ts";

export const polygons: Lesson[] = [
  {
    slug: "polygon-diagonals",
    part: "Polygons · One",
    name: "Counting Diagonals",
    desc: "Hop a vertex around an n-gon and count its diagonals — then find out why to halve.",
    accent: "#22d3ee",
    icon: `<polygon points="16,4 27.4,12.3 23,25.7 9,25.7 4.6,12.3" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 16 4 L 23 25.7 M 16 4 L 9 25.7" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "polygon-interior-sum",
    part: "Polygon Angles · One",
    name: "Interior Angle Sum",
    desc: "Drag a polygon's corners, then fan it into triangles to total its angles.",
    accent: "#ffd43b",
    icon: `<polygon points="5,24 8,10 19,5 28,15 22,27" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 5 24 L 19 5 M 5 24 L 28 15" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "polygon-exterior-sum",
    part: "Polygon Angles · Two",
    name: "Exterior Angle Sum",
    desc: "Shrink any polygon to a point and watch its exterior angles close into a full turn.",
    accent: "#f472b6",
    icon: `<polygon points="7,24 13,9 25,24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="25" y1="24" x2="31" y2="24" stroke="currentColor" stroke-width="2"
        stroke-dasharray="2.5 2.5" />
      <path d="M 29.5 24 A 4.5 4.5 0 0 0 22.2 20.5" fill="none" stroke="currentColor"
        stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "regular-polygon",
    part: "Regular Polygons · One",
    name: "Apothem and Circumradius",
    desc: "Resize a regular n-gon and cut it into right triangles to find its radii and area.",
    accent: "#38d9a9",
    icon: `<polygon points="16,4 26.4,10 26.4,22 16,28 5.6,22 5.6,10" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 16 16 L 26.4 10 M 16 16 L 26.4 16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "regular-hexagon",
    part: "Regular Polygons · Two",
    name: "The Regular Hexagon",
    desc: "Split a hexagon into six equilateral triangles and read off its diagonals and area.",
    accent: "#fb923c",
    icon: `<polygon points="28,16 22,26.4 10,26.4 4,16 10,5.6 22,5.6" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 4 16 L 28 16 M 10 5.6 L 22 26.4 M 22 5.6 L 10 26.4" fill="none"
        stroke="currentColor" stroke-width="1.8" />`,
    lab: true,
  },
];
