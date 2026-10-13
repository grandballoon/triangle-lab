import type { Lesson } from "./types.ts";

export const chasing: Lesson[] = [
  {
    slug: "chase-isosceles-chain",
    part: "Angle Chasing · One",
    name: "A Chain of Equal Links",
    desc: "Open a zigzag of four equal segments until its triangle turns isosceles, then chase the angle.",
    accent: "#ffd43b",
    icon: `<polyline points="3,16 29,9" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" />
      <polyline points="3,16 29,23" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />
      <polyline points="13,13.3 21,20.8 28,9.3 29,23" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "chase-square-triangle",
    part: "Angle Chasing · Two",
    name: "Square Meets Triangle",
    desc: "Turn a square carrying an equilateral triangle and chase the angles of the sliver between them.",
    accent: "#60a5fa",
    icon: `<rect x="8" y="3" width="16" height="16" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polyline points="8,19 16,30 24,19" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <line x1="16" y1="30" x2="8" y2="3" stroke="currentColor" stroke-width="1.8" />`,
    lab: true,
  },
  {
    slug: "chase-trisectors",
    part: "Angle Chasing · Three",
    name: "Trisected Corners",
    desc: "Drag a quadrilateral's corners and see the angles between its trisectors stay put.",
    accent: "#c084fc",
    icon: `<polygon points="4,26 9,7 23,5 28,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 4 26 L 17 20 L 28 26 M 4 26 L 17 12 L 28 26" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />`,
    lab: true,
  },
];
