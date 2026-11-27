import type { Lesson } from "./types.ts";

export const functions: Lesson[] = [
  {
    slug: "function-machine",
    part: "Functions · One",
    name: "Inputs and Outputs",
    desc: "Feed numbers through a function machine, map inputs to outputs, and chain two machines together.",
    accent: "#4dabf7",
    icon: `<rect x="10" y="9" width="12" height="14" rx="2" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="2" />
      <line x1="2" y1="16" x2="9" y2="16" stroke="currentColor" stroke-width="2" />
      <polyline points="6,13 9,16 6,19" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <line x1="23" y1="16" x2="30" y2="16" stroke="currentColor" stroke-width="2" />
      <polyline points="27,13 30,16 27,19" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "function-graphs",
    part: "Functions · Two",
    name: "Graphs and the Vertical Line Test",
    desc: "Slide a vertical line across a graph to read its values, and catch a circle giving two answers at once.",
    accent: "#69db7c",
    icon: `<line x1="4" y1="26" x2="28" y2="26" stroke="currentColor" stroke-width="2" />
      <path d="M4 8 Q16 40 28 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <line x1="21" y1="4" x2="21" y2="28" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
      <circle cx="21" cy="17.6" r="2.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "even-odd-functions",
    part: "Functions · Three",
    name: "Even and Odd Functions",
    desc: "Mirror a graph in the y-axis, turn it half a turn about the origin, and split any function into an even and an odd part.",
    accent: "#da77f2",
    icon: `<line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M4 6 Q16 40 28 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="8" cy="14.5" r="2.5" fill="currentColor" />
      <circle cx="24" cy="14.5" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "absolute-value-piecewise",
    part: "Functions · Four",
    name: "Absolute Value and Pieces",
    desc: "Bend a number line into the V of |x|, slide its corner, and build a function from pieces with open and filled dots.",
    accent: "#ffa94d",
    icon: `<polyline points="3,6 14,24 25,6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <line x1="2" y1="27" x2="30" y2="27" stroke="currentColor" stroke-width="1.5" />
      <circle cx="14" cy="24" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "floor-function",
    part: "Functions · Five",
    name: "The Floor Function",
    desc: "Round down along a staircase, round up with the ceiling, and see what is left over in the fractional part.",
    accent: "#ff8787",
    icon: `<line x1="3" y1="26" x2="11" y2="26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <line x1="12" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <line x1="21" y1="10" x2="29" y2="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="12" cy="18" r="2.2" fill="currentColor" />
      <circle cx="21" cy="10" r="2.2" fill="currentColor" />
      <circle cx="20" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="11" cy="26" r="2" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "graph-transformations",
    part: "Functions · Six",
    name: "Transforming a Graph",
    desc: "Shift, stretch and flip a graph with four sliders, and follow each point to y = a·f(b(x − h)) + k.",
    accent: "#38d9a9",
    icon: `<path d="M3 4 Q9 28 15 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M15 10 Q22 36 29 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <line x1="9" y1="16" x2="19" y2="21" stroke="currentColor" stroke-width="2" />
      <polyline points="16,23 19.5,21.3 17.5,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
];
