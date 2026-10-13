import type { Lesson } from "./types.ts";

export const quadrilaterals: Lesson[] = [
  {
    slug: "quad-angle-sum",
    part: "Fundamentals · One",
    name: "Angles of a Quadrilateral",
    desc: "Drag four corners, dent the shape, and cut it into two triangles: always 360°.",
    accent: "#f472b6",
    icon: `<polygon points="5,25 27,23 23,7 9,10" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="5" y1="25" x2="23" y2="7" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "trapezoid-median",
    part: "Trapezoids · One",
    name: "The Median of a Trapezoid",
    desc: "Stretch the bases and watch the median stay at their average, then turn it into area.",
    accent: "#38d9a9",
    icon: `<polygon points="4,25 28,25 21,8 11,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="7.5" y1="16.5" x2="24.5" y2="16.5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "isosceles-trapezoid",
    part: "Trapezoids · Two",
    name: "The Isosceles Trapezoid",
    desc: "Slide the top base until legs, base angles and diagonals all match at once.",
    accent: "#ffd43b",
    icon: `<polygon points="4,25 28,25 22,8 10,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="4" y1="25" x2="22" y2="8" stroke="currentColor" stroke-width="1.5" />
      <line x1="28" y1="25" x2="10" y2="8" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "parallelogram",
    part: "Parallelograms · One",
    name: "Inside a Parallelogram",
    desc: "Reshape a parallelogram and see its sides, angles and diagonals pair up.",
    accent: "#60a5fa",
    icon: `<polygon points="4,25 22,25 28,8 10,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="4" y1="25" x2="28" y2="8" stroke="currentColor" stroke-width="1.5" />
      <line x1="22" y1="25" x2="10" y2="8" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "parallelogram-area",
    part: "Parallelograms · Two",
    name: "Area of a Parallelogram",
    desc: "Slide the top side and the area holds still; cut off a corner to make a rectangle.",
    accent: "#fb923c",
    icon: `<polygon points="4,25 20,25 28,8 12,8" fill="currentColor" fill-opacity="0.2"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <line x1="12" y1="8" x2="12" y2="25" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "rhombus",
    part: "Rhombuses · One",
    name: "Four Equal Sides",
    desc: "Swing four hinged rods and find the diagonals always crossing at right angles.",
    accent: "#c084fc",
    icon: `<polygon points="3,16 16,6 29,16 16,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" stroke-width="1.5" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "rectangle-square",
    part: "Rectangles and Squares · One",
    name: "Rectangles and Squares",
    desc: "Stretch a rectangle into a square, then find the square hiding between its midpoints.",
    accent: "#22d3ee",
    icon: `<rect x="6" y="6" width="20" height="20" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="16,6 26,16 16,26 6,16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "quad-converses",
    part: "Converses · One",
    name: "Diagonals Decide",
    desc: "Hold the two diagonals, switch conditions on, and see which shape they force.",
    accent: "#ff8787",
    icon: `<line x1="4" y1="20" x2="28" y2="12" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="12" y1="5" x2="19" y2="27" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <polygon points="4,20 19,27 28,12 12,5" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-dasharray="3 3" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "varignon",
    part: "Converses · Two",
    name: "The Midpoint Parallelogram",
    desc: "Pull a quadrilateral into any shape: its midpoints always make a parallelogram.",
    accent: "#a3e635",
    icon: `<polygon points="4,24 26,27 29,9 10,5" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linejoin="round" />
      <polygon points="15,25.5 27.5,18 19.5,7 7,14.5" fill="currentColor" fill-opacity="0.25"
        stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />`,
    lab: true,
  },
];
