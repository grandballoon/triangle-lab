// Triangles, part two: lab lessons on the centres of a triangle, the
// Pythagorean theorem and its converse, and the remaining congruence and
// similarity tests.

import type { Lesson } from "./types.ts";

export const trianglesCentres: Lesson[] = [
  {
    slug: "incircle",
    part: "Centres · One",
    name: "The Incircle",
    desc: "Slide a point along an angle bisector, then watch three bisectors meet at the incenter.",
    accent: "#38d9a9",
    icon: `<polygon points="16,5 28,26 4,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="16" cy="19" r="6.4" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "circumcircle",
    part: "Centres · Two",
    name: "The Circumcircle",
    desc: "Drag a corner through a right angle and follow the circumcenter in, onto and out of the triangle.",
    accent: "#60a5fa",
    icon: `<circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" stroke-width="2" />
      <polygon points="12,5.2 26.5,20.6 5.5,20.6" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "pythagoras-square",
    part: "Pythagoras · One",
    name: "Four Triangles in a Square",
    desc: "Stretch the legs and fit four copies inside the square on the hypotenuse.",
    accent: "#ffd43b",
    icon: `<rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="23.2,18.6 18.6,8.8 8.8,13.4 13.4,23.2" fill="currentColor" opacity="0.55" />
      <path d="M 5 27 L 23.2 18.6 M 27 27 L 18.6 8.8 M 27 5 L 8.8 13.4 M 5 5 L 13.4 23.2"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "pythagoras-converse",
    part: "Pythagoras · Two",
    name: "Too Big, Too Small",
    desc: "Tilt an angle past 90° and see c² overshoot or fall short of a² + b².",
    accent: "#fb923c",
    icon: `<polygon points="4,25 17,25 25,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 17 25 L 25 25 L 25 8" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-dasharray="3 3" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "pythagorean-triples",
    part: "Pythagoras · Three",
    name: "Pythagorean Triples",
    desc: "Snap the legs to whole numbers and hunt for a whole-number hypotenuse.",
    accent: "#a3e635",
    icon: `<polygon points="6,26 26,26 6,11" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 11 26 V 23 M 16 26 V 23 M 21 26 V 23 M 6 21 H 9 M 6 16 H 9" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "right-congruence",
    part: "Congruence · One",
    name: "AAS, HL, LL and SA",
    desc: "Set a few parts of one triangle and watch a second one get built with no freedom left.",
    accent: "#c084fc",
    icon: `<polygon points="4,25 4,11 13,25" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="18,25 18,11 27,25" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 4 21.5 H 7.5 V 25 M 18 21.5 H 21.5 V 25" fill="none" stroke="currentColor"
        stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "isosceles-base-angles",
    part: "Congruence · Two",
    name: "Base Angles",
    desc: "Slide the apex of an isosceles triangle and prove sides and base angles match together.",
    accent: "#f472b6",
    icon: `<polygon points="16,5 26,26 6,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="5" x2="16" y2="26" stroke="currentColor" stroke-width="1.8"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "chord-bisector",
    part: "Congruence · Three",
    name: "Chords and the Centre",
    desc: "Swing a chord around a circle — the radius through its midpoint always stands square to it.",
    accent: "#22d3ee",
    icon: `<circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="6.5" y1="22.5" x2="25.5" y2="22.5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="16" y1="16" x2="16" y2="27.5" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "similarity-tests",
    part: "Similarity · One",
    name: "Three Tests for Similarity",
    desc: "Slide a point down one side and compare three ratios under AA, SAS and SSS.",
    accent: "#ff8787",
    icon: `<polygon points="14,4 28,27 4,27" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="9.4" y1="14.5" x2="20.4" y2="14.5" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
];
