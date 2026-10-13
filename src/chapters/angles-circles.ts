import type { Lesson } from "./types.ts";

export const anglesCircles: Lesson[] = [
  {
    slug: "inscribed-angle",
    part: "Circle Angles · One",
    name: "The Inscribed Angle",
    desc: "Slide a corner round a circle and see it stay half the angle at the centre.",
    accent: "#22d3ee",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" />
      <polyline points="8,23.5 18,5.2 24,23.5" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "thales",
    part: "Circle Angles · Two",
    name: "The Angle in a Semicircle",
    desc: "Drag a corner along a circle over its diameter — it is always a right angle.",
    accent: "#ffd43b",
    icon: `<path d="M 5 21 A 11 11 0 0 1 27 21 Z" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" />
      <polyline points="5,21 11.5,11 27,21" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "chords-angle",
    part: "Circle Angles · Three",
    name: "Where Two Chords Cross",
    desc: "Move four points on a circle and read the crossing angle off two arcs.",
    accent: "#f472b6",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="6.5" y1="10.5" x2="26" y2="20.5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="9" y1="24.5" x2="22.5" y2="7" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "secants-angle",
    part: "Circle Angles · Four",
    name: "Two Secants From Outside",
    desc: "Pull a point away from a circle and weigh the far arc against the near one.",
    accent: "#38d9a9",
    icon: `<circle cx="20" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <polyline points="28,9 3,16 28,23" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "tangent-chord",
    part: "Circle Angles · Five",
    name: "Tangent Meets Chord",
    desc: "Swing a chord from the point of tangency and match its angle to one on the arc.",
    accent: "#fb923c",
    icon: `<circle cx="16" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="3" y1="24" x2="29" y2="24" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="16" y1="24" x2="25" y2="10" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
];
