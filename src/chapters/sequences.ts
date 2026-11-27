import type { Lesson } from "./types.ts";

export const sequences: Lesson[] = [
  {
    slug: "arithmetic-series",
    part: "Sequences · One",
    name: "Arithmetic Series",
    desc: "Stand the terms as a staircase, turn a copy over on top, and halve the rectangle they make.",
    accent: "#22d3ee",
    icon: `<path d="M4 28 V22 H10 V16 H16 V10 H22 V4 H28 V28 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 22 V4 H22 M10 16 V4 M16 10 V4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />`,
    lab: true,
  },
  {
    slug: "geometric-series",
    part: "Sequences · Two",
    name: "Geometric Series",
    desc: "Multiply a sum by its ratio, slide it one place along, and subtract: all but two terms cancel.",
    accent: "#fb923c",
    icon: `<rect x="3" y="6" width="6" height="6" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <rect x="10" y="6" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="17" y="6" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="10" y="20" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="17" y="20" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="24" y="20" width="6" height="6" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <path d="M11 13 L15 19 M18 13 L22 19" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "infinite-geometric-series",
    part: "Sequences · Three",
    name: "Infinite Geometric Series",
    desc: "Shade half a square, then half the rest, forever, and see the pieces add up to exactly one.",
    accent: "#38d9a9",
    icon: `<rect x="4" y="4" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="4" width="12" height="24" fill="currentColor" fill-opacity="0.45" />
      <rect x="16" y="4" width="12" height="12" fill="currentColor" fill-opacity="0.3" />
      <rect x="16" y="16" width="6" height="12" fill="currentColor" fill-opacity="0.2" />
      <path d="M16 4 V28 M16 16 H28 M22 16 V28" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "sigma-notation",
    part: "Sequences · Four",
    name: "Σ Notation",
    desc: "Step the index along a row of terms with a running total, then split, shift and close up sums.",
    accent: "#c084fc",
    icon: `<path d="M24 6 H8 L17 16 L8 26 H24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "recursive-sequences",
    part: "Sequences · Five",
    name: "Sequences by Rule",
    desc: "Make each term from the last, follow a cobweb to the fixed point, and meet the Fibonacci numbers.",
    accent: "#f472b6",
    icon: `<path d="M4 28 L28 4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
      <path d="M4 22 L28 10" stroke="currentColor" stroke-width="1.5" />
      <path d="M7 28 V20.5 H20 V14 H17 V15.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "sequence-means",
    part: "Sequences · Six",
    name: "Sequences and Means",
    desc: "Fill in the terms between two numbers by equal steps or equal ratios, and see why √(ab) ≤ (a + b)/2.",
    accent: "#fab005",
    icon: `<path d="M3 26 A13 13 0 0 1 29 26 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 26 V13" stroke="currentColor" stroke-width="2" />
      <path d="M10 26 V14.5" stroke="currentColor" stroke-width="2.5" />`,
    lab: true,
  },
];
