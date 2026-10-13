import type { Lesson } from "./types.ts";

export const power: Lesson[] = [
  {
    slug: "power-chords",
    part: "Power of a Point · One",
    name: "Crossing Chords",
    desc: "Cross two chords and multiply the pieces of each — the products always match.",
    accent: "#60a5fa",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="6" y1="12" x2="26.5" y2="19" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="11" y1="25.5" x2="19" y2="5.5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="15.3" cy="15.2" r="2.2" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "power-secants",
    part: "Power of a Point · Two",
    name: "Tangent and Secant",
    desc: "From a point outside, square the tangent and compare it with a secant's product.",
    accent: "#f472b6",
    icon: `<circle cx="20" cy="18" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="3" y1="20" x2="16.5" y2="9.7" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="3" y1="20" x2="28.5" y2="21" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "two-tangents",
    part: "Power of a Point · Three",
    name: "Two Equal Tangents",
    desc: "Drag a point round a circle; its two tangents stay equal and the centre line splits them.",
    accent: "#38d9a9",
    icon: `<circle cx="21" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="2" />
      <polyline points="18.2,8.5 3,16 18.2,23.5" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "power-of-a-point",
    part: "Power of a Point · Four",
    name: "The Power of a Point",
    desc: "Put a point anywhere, spin a line through it, and watch one product refuse to change.",
    accent: "#ffd43b",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="3" y1="24" x2="29" y2="10" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="19.7" cy="15" r="2.6" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "incircle-tangent-lengths",
    part: "Tangent Lengths · One",
    name: "Tangents to the Incircle",
    desc: "Reshape a triangle and see its incircle cut the sides into three matching pairs.",
    accent: "#c084fc",
    icon: `<polygon points="4,26 28,26 12,5" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="14" cy="19" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "tangential-quadrilateral",
    part: "Tangent Lengths · Two",
    name: "Four Sides Round a Circle",
    desc: "Slide four tangent points and compare the sums of opposite sides.",
    accent: "#fb923c",
    icon: `<polygon points="16,2.5 29.5,16 16,29.5 2.5,16" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
];
