import type { Lesson } from "./types.ts";

export const potpourri: Lesson[] = [
  {
    slug: "shortest-path-reflection",
    part: "Classics · One",
    name: "The Shortest Detour",
    desc: "Slide the touch point along a line and find the shortest trip by mirroring the goal.",
    accent: "#22d3ee",
    icon: `<line x1="3" y1="20" x2="29" y2="20" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <polyline points="6,8 15,20 27,5" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round" />
      <line x1="15" y1="20" x2="22" y2="29" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "belt-pulleys",
    part: "Classics · Two",
    name: "A Belt on Two Wheels",
    desc: "Pull two wheels apart and measure the belt: two tangents and two arcs.",
    accent: "#fb923c",
    icon: `<circle cx="10" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="25" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="11.6" y1="9.2" x2="25.8" y2="12.6" stroke="currentColor" stroke-width="2" />
      <line x1="11.6" y1="22.8" x2="25.8" y2="19.4" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "incenter-arc-midpoint",
    part: "Classics · Three",
    name: "Incentre Meets Arc Midpoint",
    desc: "Slide a triangle's corners round its circle and watch three lengths stay equal.",
    accent: "#38d9a9",
    icon: `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2" />
      <polygon points="12,4.7 5.6,22 26.4,22" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linejoin="round" />
      <line x1="12" y1="4.7" x2="16" y2="28" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "lens-area",
    part: "Classics · Four",
    name: "The Area of a Lens",
    desc: "Overlap two circles and build the lens from two sectors minus two triangles.",
    accent: "#c084fc",
    icon: `<circle cx="12" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="20" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M 16 7.9 A 9 9 0 0 1 16 24.1 A 9 9 0 0 1 16 7.9 Z" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "paper-fold",
    part: "Classics · Five",
    name: "Folding a Corner",
    desc: "Drag a corner of a sheet onto any point and see the crease bisect its journey.",
    accent: "#f472b6",
    icon: `<polygon points="4,6 28,6 28,26 14,26 4,17" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="4,17 14,26 15,16" fill="currentColor" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "viviani",
    part: "Classics · Six",
    name: "Viviani's Theorem",
    desc: "Move a point inside an equilateral triangle; its three distances always stack to the altitude.",
    accent: "#ffd43b",
    icon: `<polygon points="16,4 29,26.5 3,26.5" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 14 19 L 14 26.5 M 14 19 L 8.8 16 M 14 19 L 22.7 14" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="14" cy="19" r="2.2" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "crossed-ladders",
    part: "Classics · Seven",
    name: "Crossed Ladders",
    desc: "Raise two posts and slide them apart; the crossing height obeys 1/x + 1/y = 1/z.",
    accent: "#60a5fa",
    icon: `<line x1="3" y1="27" x2="29" y2="27" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" />
      <line x1="6" y1="27" x2="6" y2="5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="26" y1="27" x2="26" y2="12" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <path d="M 6 5 L 26 27 M 26 12 L 6 27" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
];
