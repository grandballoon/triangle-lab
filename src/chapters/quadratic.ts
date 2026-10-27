import type { Lesson } from "./types.ts";

export const quadratic: Lesson[] = [
  {
    slug: "quadratic-falling-rock",
    part: "Quadratics · One",
    name: "Why Squares Appear",
    desc: "Throw a rock off a tower and see gravity bend its straight-line fall into a curve.",
    accent: "#fb923c",
    icon: `<rect x="4" y="8" width="5" height="20" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 8 Q20 9 27 27" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="21" cy="14" r="3" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "quadratic-factoring",
    part: "Quadratics · Two",
    name: "Roots From Factors",
    desc: "Drag a parabola's two roots and watch their sum and product appear in its coefficients.",
    accent: "#ffd43b",
    icon: `<line x1="3" y1="20" x2="29" y2="20" stroke="currentColor" stroke-width="1.5" />
      <path d="M5 6 Q16 34 27 6" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="9.5" cy="20" r="2.5" fill="currentColor" />
      <circle cx="22.5" cy="20" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "completing-the-square",
    part: "Quadratics · Three",
    name: "Completing the Square",
    desc: "Cut a strip in half, fold it round a square, and fill in the corner that is missing.",
    accent: "#22d3ee",
    icon: `<rect x="5" y="11" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="21" y="11" width="6" height="16" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="5" y="5" width="16" height="6" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="21" y="5" width="6" height="6" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "quadratic-formula",
    part: "Quadratics · Four",
    name: "The Quadratic Formula",
    desc: "Read the formula off the parabola: a mirror line, a reach either side, and a discriminant.",
    accent: "#c084fc",
    icon: `<line x1="3" y1="20" x2="29" y2="20" stroke="currentColor" stroke-width="1.5" />
      <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />
      <path d="M5 4 Q16 40 27 4" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="9" cy="20" r="2.5" fill="currentColor" />
      <circle cx="23" cy="20" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "extraneous-roots",
    part: "Variations · One",
    name: "Squaring Adds Answers",
    desc: "Square away a square root and catch the extra answer that sneaks in from the mirror image.",
    accent: "#ff8787",
    icon: `<path d="M4 16 Q4 5 28 4" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <path d="M4 16 Q4 27 28 28" fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />
      <line x1="3" y1="27" x2="29" y2="3" stroke="currentColor" stroke-width="2" />
      <circle cx="20" cy="12" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "hidden-quadratics",
    part: "Variations · Two",
    name: "Hidden Quadratics",
    desc: "Rename x² as z, solve the quadratic in z, and carry each answer back to x.",
    accent: "#38d9a9",
    icon: `<line x1="3" y1="22" x2="29" y2="22" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 4 C8 34 12 10 16 16 C20 10 24 34 28 4" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" />
      <path d="M16 22 Q19 15 22 22" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "polynomial-roots",
    part: "Variations · Three",
    name: "Beyond Quadratics",
    desc: "Give a polynomial three or four roots, then lift it off the axis and lose some of them.",
    accent: "#60a5fa",
    icon: `<line x1="3" y1="18" x2="29" y2="18" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 30 C8 0 13 4 16 18 C19 32 24 34 28 3" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" />`,
    lab: true,
  },
];
