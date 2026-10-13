import type { Lesson } from "./types.ts";

export const transformations: Lesson[] = [
  {
    slug: "translation",
    part: "Rigid Motions · One",
    name: "Slide by an Arrow",
    desc: "Drag one arrow and watch every corner of the triangle move by it.",
    accent: "#38d9a9",
    icon: `<polygon points="4,24 14,24 8,13" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linejoin="round" opacity="0.55" />
      <polygon points="17,17 27,17 21,6" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <line x1="10" y1="19" x2="16" y2="15" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "rotation",
    part: "Rigid Motions · Two",
    name: "Turn About a Point",
    desc: "Swing a triangle round a centre and prove that lines stay lines.",
    accent: "#a78bfa",
    icon: `<circle cx="8" cy="25" r="2.2" fill="currentColor" />
      <path d="M 26 25 A 18 18 0 0 0 16.4 9.1" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" />
      <line x1="8" y1="25" x2="26" y2="25" stroke="currentColor" stroke-width="2"
        opacity="0.55" />
      <line x1="8" y1="25" x2="16.4" y2="9.1" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "reflection",
    part: "Rigid Motions · Three",
    name: "Flip Over a Mirror",
    desc: "Tilt the mirror line and see it bisect every jump at right angles.",
    accent: "#22d3ee",
    icon: `<line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="2"
      stroke-dasharray="3 3" />
      <polygon points="4,23 12,23 12,10" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="28,23 20,23 20,10" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" opacity="0.55" />`,
    lab: true,
  },
  {
    slug: "point-reflection",
    part: "Rigid Motions · Four",
    name: "Through a Point",
    desc: "Send grid points through a centre and compute where they land.",
    accent: "#f472b6",
    icon: `<circle cx="16" cy="16" r="2.4" fill="currentColor" />
      <line x1="6" y1="24" x2="26" y2="8" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />
      <circle cx="6" cy="24" r="3" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="26" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2.5" />`,
    lab: true,
  },
  {
    slug: "distortion",
    part: "Changing Size · One",
    name: "Stretch and Squeeze",
    desc: "Pull a figure in one direction and slice it to see its area grow.",
    accent: "#fb923c",
    icon: `<circle cx="9" cy="16" r="5" fill="none" stroke="currentColor"
      stroke-width="2" opacity="0.55" />
      <ellipse cx="19" cy="16" rx="10" ry="5" fill="none" stroke="currentColor"
        stroke-width="2.5" />
      <line x1="4" y1="5" x2="4" y2="27" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "dilation",
    part: "Changing Size · Two",
    name: "Grow From a Centre",
    desc: "Scale a triangle from a point and prove its sides stay parallel.",
    accent: "#ffd43b",
    icon: `<circle cx="5" cy="24" r="2.2" fill="currentColor" />
      <polygon points="11,21 16,21 13,16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" opacity="0.55" />
      <polygon points="17,18 27,18 21,8" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <line x1="5" y1="24" x2="27" y2="18" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "what-is-preserved",
    part: "What Stays the Same · One",
    name: "What Survives?",
    desc: "Switch between five transformations and test what each one keeps.",
    accent: "#4ade80",
    icon: `<polygon points="5,14 15,14 9,5" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polyline points="6,23 10,27 17,19" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="21" y1="19" x2="28" y2="26" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="28" y1="19" x2="21" y2="26" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "polygon-symmetry",
    part: "What Stays the Same · Two",
    name: "Symmetries of a Polygon",
    desc: "Turn and flip a regular polygon until it lands on itself.",
    accent: "#60a5fa",
    icon: `<polygon points="16,4 27.4,12.3 23.1,25.7 8.9,25.7 4.6,12.3" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />`,
    lab: true,
  },
];
