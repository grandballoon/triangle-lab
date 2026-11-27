import type { Lesson } from "./types.ts";

export const numbers: Lesson[] = [
  {
    slug: "number-sets",
    part: "Numbers · One",
    name: "Closing the Gaps",
    desc: "Counting numbers, integers, rationals, reals and complex numbers: each answers a question the last could not.",
    accent: "#22d3ee",
    icon: `<rect x="3" y="3" width="26" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="5" y="9" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5" />
      <rect x="7" y="15" width="10" height="10" rx="2" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "lowest-terms",
    part: "Numbers · Two",
    name: "Lowest Terms",
    desc: "Fractions as lattice points: equal fractions share a line, lowest terms is the first point on it.",
    accent: "#c084fc",
    icon: `<path d="M4 28 H28 M4 28 V4" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 28 L28 12" stroke="currentColor" stroke-width="1.5" />
      <circle cx="13" cy="22" r="2.5" fill="currentColor" />
      <circle cx="22" cy="16" r="2" fill="currentColor" fill-opacity="0.5" />`,
    lab: true,
  },
  {
    slug: "repeating-decimals",
    part: "Numbers · Three",
    name: "Repeating Decimals",
    desc: "Long division can only leave so many remainders, so a fraction's decimal stops or repeats.",
    accent: "#ffd43b",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M16 5 L25 12 L22 24 L10 24 L7 12 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" />
      <circle cx="16" cy="5" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "irrational-root-two",
    part: "Numbers · Four",
    name: "The Square Root of 2",
    desc: "Why no fraction squares to 2, shown by counting factors and by squares inside squares.",
    accent: "#f472b6",
    icon: `<rect x="4" y="4" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="11" width="17" height="17" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" />
      <rect x="11" y="4" width="17" height="17" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5" />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" fill-opacity="0.6" />`,
    lab: true,
  },
];
