import type { Lesson } from "./types.ts";

export const integers: Lesson[] = [
  {
    slug: "division-remainder",
    part: "Integers · One",
    name: "Division with Remainder",
    desc: "Hops of b along the line: a quotient, a remainder smaller than b, and when b divides a.",
    accent: "#3bc9db",
    icon: `<path d="M3 26 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 26 Q8 16 12 26 Q16 16 20 26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M20 22 H25" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <circle cx="8" cy="10" r="2" fill="currentColor" /><circle cx="16" cy="10" r="2" fill="currentColor" /><circle cx="23" cy="10" r="2" fill="currentColor" fill-opacity="0.45" />`,
    lab: true,
  },
  {
    slug: "prime-factorization",
    part: "Integers · Two",
    name: "Primes and Factorization",
    desc: "Rectangles of dots, the sieve, and the one way to build a number from primes.",
    accent: "#fab005",
    icon: `<circle cx="16" cy="5" r="2.5" fill="currentColor" />
      <path d="M16 5 L9 15 M16 5 L23 15 M23 15 L18 26 M23 15 L28 26" stroke="currentColor" stroke-width="1.5" />
      <circle cx="9" cy="15" r="2.5" fill="currentColor" /><circle cx="23" cy="15" r="2.5" fill="currentColor" fill-opacity="0.45" />
      <circle cx="18" cy="26" r="2.5" fill="currentColor" /><circle cx="28" cy="26" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "gcd-lcm",
    part: "Integers · Three",
    name: "Common Factors and Multiples",
    desc: "The greatest common divisor by cutting squares, the least common multiple, and their product.",
    accent: "#f783ac",
    icon: `<rect x="3" y="8" width="26" height="17" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="3" y="8" width="17" height="17" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="8" width="9" height="9" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "number-bases",
    part: "Integers · Four",
    name: "Number Bases",
    desc: "Bundles of bundles: writing numbers in base 2, 5 or 60, and converting back to ten.",
    accent: "#69db7c",
    icon: `<rect x="3" y="10" width="8" height="12" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="10" width="8" height="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="21" y="10" width="8" height="12" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 27 H9 M14 27 H18 M23 27 H27" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "modular-arithmetic",
    part: "Integers · Five",
    name: "Clock Arithmetic",
    desc: "Remainders on a clock: adding, multiplying, and powers that go round in cycles.",
    accent: "#9775fa",
    icon: `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 16 V7 M16 16 L22 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="16" cy="4" r="1.5" fill="currentColor" /><circle cx="28" cy="16" r="1.5" fill="currentColor" /><circle cx="16" cy="28" r="1.5" fill="currentColor" /><circle cx="4" cy="16" r="1.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "divisibility-rules",
    part: "Integers · Six",
    name: "Divisibility Tricks",
    desc: "Last digits, digit sums and alternating sums: telling what divides a number at a glance.",
    accent: "#ff922b",
    icon: `<rect x="2" y="9" width="6" height="14" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="9" y="9" width="6" height="14" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="16" y="9" width="6" height="14" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="23" y="9" width="6" height="14" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="1.5" />
      <path d="M8 28 H23" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
];
