// Triangles, part one: the nine standalone triangle pages, each with its own
// HTML entry point (<slug>.html) and bespoke interaction in src/<slug>.ts, and
// the five triangle-parts lessons rebuilt in the lab. The trigonometry pages
// are in trigonometry.ts.

import type { Lesson } from "./types.ts";

export const trianglesClassic: Lesson[] = [
  {
    slug: "angles",
    part: "Classifying · One",
    name: "Angles",
    desc: "Acute, right & obtuse — drag the apex.",
    accent: "#38d9a9",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "equilateral",
    part: "Classifying · Two",
    name: "Equilateral",
    desc: "Resize a triangle whose sides stay equal.",
    accent: "#a5b4ff",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "isosceles",
    part: "Classifying · Three",
    name: "Isosceles",
    desc: "Pull the apex or a base corner — two sides stay equal.",
    accent: "#f472b6",
    icon: `<polygon points="16,5 26,27 6,27" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "scalene",
    part: "Classifying · Four",
    name: "Scalene",
    desc: "Drag any corner — it skips past equal sides.",
    accent: "#f59e0b",
    icon: `<polygon points="9,6 28,22 4,27" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "perimeter",
    part: "Parts · One",
    name: "Perimeter",
    desc: "Walk a knob all the way round the edge.",
    accent: "#60a5fa",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "semiperimeter",
    part: "Parts · Two",
    name: "Semiperimeter",
    desc: "Walk a knob halfway round the edge.",
    accent: "#ffd43b",
    icon: `<polyline points="27,26 5,26 16,6" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <line x1="16" y1="6" x2="27" y2="26" stroke="currentColor"
        stroke-width="1.5" stroke-dasharray="3 3" />
      <circle cx="16" cy="6" r="2.4" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "medians",
    part: "Parts · Three",
    name: "Medians",
    desc: "Lock a knob on a side's midpoint and join it to the corner opposite.",
    accent: "#c084fc",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "centroid",
    part: "Parts · Four",
    name: "Centroid",
    desc: "See the three medians meet at one point, G.",
    accent: "#fb923c",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="1.5" />
      <line x1="5" y1="26" x2="21.5" y2="16" stroke="currentColor" stroke-width="1.5" />
      <line x1="27" y1="26" x2="10.5" y2="16" stroke="currentColor" stroke-width="1.5" />
      <circle cx="16" cy="19.3" r="2.4" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "bisectors",
    part: "Parts · Five",
    name: "Angle Bisectors",
    desc: "Slide a knob until the two halves of an angle match.",
    accent: "#22d3ee",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor"
        stroke-width="2" stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "altitudes",
    part: "Parts · Six",
    name: "Altitudes",
    desc: "Drop a perpendicular from each vertex and find H.",
    accent: "#fb7185",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="2" />
      <polyline points="13,26 13,23 16,23" fill="none" stroke="currentColor"
        stroke-width="1.5" />`,
  },
  {
    slug: "inequality",
    part: "Constraints · One",
    name: "The Triangle Inequality",
    desc: "Swing a side on its dotted circle — the third side can't beat the sum.",
    accent: "#a3e635",
    icon: `<polygon points="13,8 24,24 6,24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="24" cy="24" r="7" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-dasharray="3 3" />`,
  },
  {
    slug: "pythagoras",
    part: "Constraints · Two",
    name: "The Pythagorean Theorem",
    desc: "Drag the legs, then scrub four sliding triangles to see why a² + b² = c².",
    accent: "#ffd43b",
    icon: `<polygon points="10,22 24,22 10,10" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <rect x="10" y="22" width="14" height="6" fill="none" stroke="currentColor"
        stroke-width="1.5" />
      <rect x="4" y="10" width="6" height="12" fill="none" stroke="currentColor"
        stroke-width="1.5" />`,
  },
  {
    slug: "congruence",
    part: "Matching · One",
    name: "Congruent Triangles",
    desc: "SSS, SAS, ASA leave C one landing spot. SSA leaves two — drag and see.",
    accent: "#f97316",
    icon: `<polygon points="4,26 16,26 8,14" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="16,26 28,26 20,14" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linejoin="round" stroke-dasharray="3 3" />`,
  },
  {
    slug: "similar",
    part: "Matching · Two",
    name: "Similar Triangles",
    desc: "Slide, and the sides change while the ratios refuse — they belong to the angle.",
    accent: "#2dd4bf",
    icon: `<polygon points="4,26 14,26 14,19" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="4,26 28,26 28,9" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="3 3" />`,
  },
];
