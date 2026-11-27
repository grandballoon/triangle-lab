import type { Lesson } from "./types.ts";

export const inequalities: Lesson[] = [
  {
    slug: "linear-inequalities",
    part: "Inequalities · One",
    name: "Linear Inequalities",
    desc: "Slide and stretch two points on a number line: adding keeps the order, a negative factor flips it.",
    accent: "#22d3ee",
    icon: `<path d="M3 20 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M11 20 H27" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" />
      <path d="M25 16 L29 20 L25 24" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="10" cy="20" r="3.5" fill="currentColor" />
      <path d="M8 8 L14 11 L8 14" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "quadratic-inequalities",
    part: "Inequalities · Two",
    name: "Quadratic Inequalities",
    desc: "Read the sign of a quadratic off its parabola: negative between the roots, positive outside.",
    accent: "#38d9a9",
    icon: `<path d="M2 18 H30" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 4 Q16 40 27 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M10 18 H22" stroke="currentColor" stroke-width="4" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "absolute-value-inequalities",
    part: "Inequalities · Three",
    name: "Absolute Value Inequalities",
    desc: "|x − a| < b as a distance: an interval centred on a, and its outside as two rays.",
    accent: "#c084fc",
    icon: `<path d="M3 26 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 6 L16 26 L28 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M3 14 H29" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M11 26 H21" stroke="currentColor" stroke-width="4" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "trivial-inequality",
    part: "Inequalities · Four",
    name: "The Trivial Inequality",
    desc: "No square is negative: a² + b² ≥ 2ab, and the least value of any quadratic.",
    accent: "#fb923c",
    icon: `<rect x="5" y="5" width="22" height="22" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5" />
      <path d="M10 9 L22 14 L10 19 M10 23 H22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "am-gm",
    part: "Inequalities · Five",
    name: "Arithmetic and Geometric Means",
    desc: "Four rectangles round a hole and a semicircle on x + y: the average beats the square root of the product.",
    accent: "#ffd43b",
    icon: `<path d="M3 26 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M3 26 A13 13 0 0 1 29 26" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M16 26 V13" stroke="currentColor" stroke-width="2" />
      <path d="M11 26 V14" stroke="currentColor" stroke-width="3" stroke-linecap="round" />`,
    lab: true,
  },
];
