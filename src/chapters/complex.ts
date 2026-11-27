import type { Lesson } from "./types.ts";

export const complex: Lesson[] = [
  {
    slug: "complex-i",
    part: "Complex · One",
    name: "The Square Root of −1",
    desc: "See multiplying by −1 as a half turn, and find the number that makes a quarter turn.",
    accent: "#ffd43b",
    icon: `<path d="M3 16 H29 M16 3 V29" stroke="currentColor" stroke-width="1.5" />
      <path d="M26 16 A10 10 0 0 0 16 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="16" cy="6" r="3" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "complex-add",
    part: "Complex · Two",
    name: "Adding on the Plane",
    desc: "Plot a + bi as a point, and add complex numbers by laying their arrows head to tail.",
    accent: "#22d3ee",
    icon: `<path d="M4 28 L12 14 L27 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 28 L27 8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
      <circle cx="27" cy="8" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "complex-multiply",
    part: "Complex · Three",
    name: "Multiplying Complex Numbers",
    desc: "Multiply term by term, then watch the product stretch and turn: lengths multiply, angles add.",
    accent: "#f472b6",
    icon: `<path d="M4 28 L14 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M4 28 L18 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M4 28 L16 4" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <path d="M12 26 A9 9 0 0 0 9 19" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "complex-conjugate",
    part: "Complex · Four",
    name: "Conjugates and Division",
    desc: "Mirror a number in the real axis, multiply to get a real length, and divide like rationalizing.",
    accent: "#c084fc",
    icon: `<path d="M3 16 H29" stroke="currentColor" stroke-width="1.5" />
      <path d="M6 16 L24 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M6 16 L24 26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3" />
      <path d="M24 6 V26" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />`,
    lab: true,
  },
  {
    slug: "complex-square-root",
    part: "Complex · Five",
    name: "Square Roots of Complex Numbers",
    desc: "Solve two real equations for a complex root, and see the two roots at half the angle.",
    accent: "#38d9a9",
    icon: `<path d="M3 16 H29 M16 3 V29" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 16 L26 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M16 16 L25 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M16 16 L7 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
];
