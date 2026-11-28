import type { Lesson } from "./types.ts";

export const counting: Lesson[] = [
  {
    slug: "multiplication-principle",
    part: "Counting · One",
    name: "The Multiplication Principle",
    desc: "A tree of shirts and trousers: choices made in stages multiply, and a choice of one or the other adds.",
    accent: "#3bc9db",
    icon: `<circle cx="5" cy="16" r="2.5" fill="currentColor" />
      <path d="M5 16 L15 8 M5 16 L15 24 M15 8 L27 4 M15 8 L27 12 M15 24 L27 20 M15 24 L27 28" stroke="currentColor" stroke-width="1.5" />
      <circle cx="15" cy="8" r="2" fill="currentColor" /><circle cx="15" cy="24" r="2" fill="currentColor" />
      <circle cx="27" cy="4" r="2" fill="currentColor" fill-opacity="0.6" /><circle cx="27" cy="12" r="2" fill="currentColor" fill-opacity="0.6" />
      <circle cx="27" cy="20" r="2" fill="currentColor" fill-opacity="0.6" /><circle cx="27" cy="28" r="2" fill="currentColor" fill-opacity="0.6" />`,
    lab: true,
  },
  {
    slug: "counting-divisors",
    part: "Counting · Two",
    name: "Counting Divisors",
    desc: "Lay a number's divisors out on a grid of exponents and count (a + 1)(b + 1) cells.",
    accent: "#fab005",
    icon: `<rect x="4" y="4" width="8" height="8" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="4" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="4" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="12" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="12" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="12" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="20" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="20" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="20" y="20" width="8" height="8" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "permutations",
    part: "Counting · Three",
    name: "Permutations and Factorials",
    desc: "Line people up one place at a time: n!, a few places at a time, and rows with rules.",
    accent: "#f783ac",
    icon: `<rect x="2" y="12" width="8" height="10" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="12" width="8" height="10" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="22" y="12" width="8" height="10" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="6" cy="17" r="2.5" fill="currentColor" /><circle cx="16" cy="17" r="2.5" fill="currentColor" fill-opacity="0.6" />
      <circle cx="26" cy="17" r="2.5" fill="currentColor" fill-opacity="0.35" />
      <path d="M6 8 Q11 3 16 8 M16 8 Q21 3 26 8" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "combinations",
    part: "Counting · Four",
    name: "Overcounting and Choosing",
    desc: "Count committees in order, then divide by the orders each was counted in: n choose r.",
    accent: "#9775fa",
    icon: `<circle cx="6" cy="8" r="3" fill="currentColor" /><circle cx="16" cy="8" r="3" fill="currentColor" />
      <circle cx="26" cy="8" r="3" fill="currentColor" fill-opacity="0.35" />
      <rect x="3" y="18" width="16" height="9" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" />
      <path d="M6 12 L8 18 M16 12 L14 18" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "complementary-counting",
    part: "Counting · Five",
    name: "Counting What You Don't Want",
    desc: "At least one six on two dice: count the rolls with none and take them from the total.",
    accent: "#4dabf7",
    icon: `<rect x="4" y="4" width="24" height="24" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />
      <rect x="4" y="10" width="18" height="18" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "pascals-triangle",
    part: "Counting · Six",
    name: "Pascal's Triangle",
    desc: "Paths down a triangle of sums give n choose k, the coefficients of (x + y)ⁿ.",
    accent: "#69db7c",
    icon: `<circle cx="16" cy="5" r="2.2" fill="currentColor" />
      <circle cx="11" cy="12" r="2.2" fill="currentColor" /><circle cx="21" cy="12" r="2.2" fill="currentColor" />
      <circle cx="6" cy="19" r="2.2" fill="currentColor" /><circle cx="16" cy="19" r="2.2" fill="currentColor" fill-opacity="0.6" /><circle cx="26" cy="19" r="2.2" fill="currentColor" />
      <circle cx="1.5" cy="26" r="1.5" fill="currentColor" /><circle cx="11" cy="26" r="2.2" fill="currentColor" /><circle cx="21" cy="26" r="2.2" fill="currentColor" /><circle cx="30.5" cy="26" r="1.5" fill="currentColor" />`,
    lab: true,
  },
];
