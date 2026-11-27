import type { Lesson } from "./types.ts";

export const exponents: Lesson[] = [
  {
    slug: "exponent-product-rule",
    part: "Exponents · One",
    name: "Counting Factors",
    desc: "Lay powers out as rows of factors, and watch the exponents add when they multiply.",
    accent: "#22d3ee",
    icon: `<rect x="3" y="12" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="12.5" y="12" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="22" y="12" width="7" height="7" fill="currentColor" />
      <path d="M3 24 H29" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "exponent-zero-negative",
    part: "Exponents · Two",
    name: "Zero and Negative Powers",
    desc: "Climb down a ladder of powers, dividing at each rung, past 1 and into fractions.",
    accent: "#c084fc",
    icon: `<path d="M9 3 V29 M23 3 V29" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M9 8 H23 M9 14 H23 M9 20 H23 M9 26 H23" stroke="currentColor" stroke-width="2" />
      <rect x="9" y="18" width="14" height="4" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "exponent-power-of-power",
    part: "Exponents · Three",
    name: "Powers of Powers",
    desc: "Stack copies of a power into a grid and count it to see why the exponents multiply.",
    accent: "#38d9a9",
    icon: `<rect x="4" y="6" width="6" height="6" fill="currentColor" />
      <rect x="13" y="6" width="6" height="6" fill="currentColor" />
      <rect x="22" y="6" width="6" height="6" fill="currentColor" />
      <rect x="4" y="15" width="6" height="6" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="13" y="15" width="6" height="6" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="22" y="15" width="6" height="6" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M4 26 H28" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "exponent-fractional",
    part: "Exponents · Four",
    name: "Roots as Powers",
    desc: "Read the curve of a power between whole numbers, and find square and cube roots there.",
    accent: "#60a5fa",
    icon: `<path d="M4 28 H29 M4 28 V3" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 26 Q18 24 27 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="14" cy="22" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "radical-simplify",
    part: "Radicals · One",
    name: "Simplifying Square Roots",
    desc: "Cut a square of area 72 into a grid of smaller squares, and read 6√2 off its side.",
    accent: "#ffd43b",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" />
      <path d="M12.3 5 V27 M19.7 5 V27 M5 12.3 H27 M5 19.7 H27" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "radical-rationalize",
    part: "Radicals · Two",
    name: "Rationalizing Denominators",
    desc: "See 1/√2 and √2/2 as the same half-diagonal, then clear roots from any denominator.",
    accent: "#fb923c",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M5 27 L16 16 L27 27 Z" fill="currentColor" />
      <path d="M5 5 L27 27 M27 5 L5 27" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "logarithms",
    part: "Logarithms · One",
    name: "Logarithms",
    desc: "Ask what power makes a number, and mirror the exponential curve to answer it.",
    accent: "#f472b6",
    icon: `<path d="M3 29 L29 3" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M6 30 Q8 14 28 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M2 26 Q18 24 22 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />`,
    lab: true,
  },
];
