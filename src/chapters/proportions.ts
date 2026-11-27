import type { Lesson } from "./types.ts";

export const proportions: Lesson[] = [
  {
    slug: "direct-variation",
    part: "Proportions · One",
    name: "Direct Variation",
    desc: "Twice as much costs twice as much: a constant ratio, and a line through the origin.",
    accent: "#fab005",
    icon: `<path d="M4 28 H29 M4 28 V3" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 28 L27 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="12" cy="20" r="2.5" fill="currentColor" />
      <circle cx="20" cy="13" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "inverse-variation",
    part: "Proportions · Two",
    name: "Inverse Variation",
    desc: "Rectangles of one area: as one side doubles the other halves, along a hyperbola.",
    accent: "#4dabf7",
    icon: `<path d="M4 28 H29 M4 28 V3" stroke="currentColor" stroke-width="1.5" />
      <path d="M7 4 Q9 22 28 25" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M4 28 V16 H13 V28" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "equal-ratios",
    part: "Proportions · Three",
    name: "Working with Proportions",
    desc: "Cross-multiply, add tops and bottoms, and share a whole in a given ratio.",
    accent: "#69db7c",
    icon: `<path d="M4 28 L28 6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M13 28 V20 H28 V28" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 20 H13 V6 H4" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "conversion-factors",
    part: "Proportions · Four",
    name: "Conversion Factors",
    desc: "Change units by multiplying by one: inches to centimetres, chains of factors, square units.",
    accent: "#ff8787",
    icon: `<path d="M3 11 H29 M3 22 H29" stroke="currentColor" stroke-width="2" />
      <path d="M6 8 V14 M16 8 V14 M26 8 V14" stroke="currentColor" stroke-width="1.5" />
      <path d="M6 19 V25 M10 19 V25 M14 19 V25 M18 19 V25 M22 19 V25 M26 19 V25" stroke="currentColor" stroke-width="1.2" />`,
    lab: true,
  },
  {
    slug: "percent",
    part: "Proportions · Five",
    name: "Percent",
    desc: "Hundredths of a whole, percent changes as multipliers, and why changes don't simply add.",
    accent: "#da77f2",
    icon: `<circle cx="9" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="23" cy="23" r="4" fill="none" stroke="currentColor" stroke-width="2.5" />
      <path d="M25 5 L7 27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`,
    lab: true,
  },
];
