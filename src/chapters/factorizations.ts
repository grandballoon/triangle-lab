import type { Lesson } from "./types.ts";

export const factorizations: Lesson[] = [
  {
    slug: "square-of-sum",
    part: "Factorizations · One",
    name: "Squaring a Sum",
    desc: "(a + b)² as a square cut in four: the strips people forget, and squaring in your head.",
    accent: "#3bc9db",
    icon: `<rect x="4" y="4" width="16" height="16" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="4" width="8" height="16" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="20" width="16" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="20" width="8" height="8" fill="currentColor" fill-opacity="0.7" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "difference-of-squares",
    part: "Factorizations · Two",
    name: "Difference of Squares",
    desc: "Cut a corner from a square and slide the strip: a² − b² = (a + b)(a − b).",
    accent: "#9775fa",
    icon: `<path d="M4 28 V4 H18 V16 H28 V28 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <rect x="18" y="4" width="10" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "sum-of-cubes",
    part: "Factorizations · Three",
    name: "Sums and Differences of Cubes",
    desc: "A cube with a corner gone splits into three slabs: a³ − b³ = (a − b)(a² + ab + b²).",
    accent: "#f783ac",
    icon: `<path d="M16 3 L28 9 L28 23 L16 29 L4 23 L4 9 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 3 L22 6 L22 12 L16 15 L10 12 L10 6 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
      <path d="M4 9 L16 15 L28 9 M16 15 V29" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "completing-rectangle",
    part: "Factorizations · Four",
    name: "Completing the Rectangle",
    desc: "Add the missing corner to xy + ax + by and whole-number solutions come from factor pairs.",
    accent: "#fab005",
    icon: `<rect x="4" y="12" width="16" height="16" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="4" width="16" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="12" width="8" height="16" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="4" width="8" height="8" fill="currentColor" fill-opacity="0.7" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "sums-and-products",
    part: "Factorizations · Five",
    name: "Sums and Products",
    desc: "From x + y and xy alone: the sum of squares, the numbers themselves, and every power sum.",
    accent: "#69db7c",
    icon: `<path d="M3 24 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 6 Q16 40 27 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="9.5" cy="24" r="2.5" fill="currentColor" /><circle cx="22.5" cy="24" r="2.5" fill="currentColor" />`,
    lab: true,
  },
];
