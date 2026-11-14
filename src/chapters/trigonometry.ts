// Trigonometry: SOH CAH TOA on a right triangle, the exact values of the
// special angles, then the unit circle, where the ratios become coordinates
// and unroll into the sine, cosine and tangent waves, and last the sine area
// formula, which needs the sine of an obtuse angle. The first four are
// standalone pages (<slug>.html and src/<slug>.ts); the rest are lab lessons.

import type { Lesson } from "./types.ts";

export const trigonometry: Lesson[] = [
  {
    slug: "trig",
    part: "Trigonometry · One",
    name: "Naming the Ratios",
    desc: "sin, cos, tan and their three flips, read live off a triangle in your hand.",
    accent: "#38bdf8",
    icon: `<polygon points="4,26 28,26 28,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 12 26 A 8 8 0 0 0 10.8 21.7" fill="none" stroke="currentColor"
        stroke-width="2" />`,
  },
  {
    slug: "fortyfive",
    part: "Trigonometry · Two",
    name: "Folding the Square",
    desc: "Bisect a right angle into 45° + 45° — and every ratio's a cancels.",
    accent: "#e879f9",
    icon: `<rect x="6" y="6" width="20" height="20" fill="none" stroke="currentColor"
      stroke-width="1.5" stroke-dasharray="3 3" />
      <polygon points="6,26 26,26 26,6" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "thirtysixty",
    part: "Trigonometry · Three",
    name: "Folding the Equilateral",
    desc: "Congruent halves split the base evenly — 1 : √3 : 2 falls out.",
    accent: "#4ade80",
    icon: `<polygon points="16,5 28,27 4,27" fill="none" stroke="currentColor"
      stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="3 3" />
      <polygon points="16,5 28,27 16,27" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "table",
    part: "Trigonometry · Four",
    name: "The Whole Table",
    desc: "A unit hypotenuse on a dial — snap to 0°, 30°, 45°, 60°, 90° and read what you derived.",
    accent: "#f43f5e",
    icon: `<polygon points="4,26 24,26 24,12" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 14 26 A 10 10 0 0 0 12.7 21" fill="none" stroke="currentColor"
        stroke-width="2" />
      <circle cx="24" cy="12" r="2.2" fill="currentColor" />`,
  },
  {
    slug: "trig-identities",
    part: "Trigonometry · Five",
    name: "Identities from One Triangle",
    desc: "Turn one angle in a hypotenuse-1 triangle and read off the identities it forces.",
    accent: "#facc15",
    icon: `<polygon points="5,25 25,25 25,9" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 13 25 A 8 8 0 0 0 11.2 20" fill="none" stroke="currentColor" stroke-width="2" />
      <polyline points="21,25 21,21 25,21" fill="none" stroke="currentColor" stroke-width="1.8" />`,
    lab: true,
  },
  {
    slug: "trig-waves",
    part: "Trigonometry · Six",
    name: "From Circle to Waves",
    desc: "Turn a radius round the unit circle and watch its triangle unroll into the sine, cosine and tangent waves.",
    accent: "#818cf8",
    icon: `<circle cx="9" cy="16" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="9" y1="16" x2="13.6" y2="11.4" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />
      <path d="M 16 16 C 18.5 6, 21.5 6, 24 16 S 29.5 26, 31 16" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "area-sine",
    part: "Trigonometry · Seven",
    name: "Two Sides and an Angle",
    desc: "Swing one side about a corner and get the area from two sides and the sine between them.",
    accent: "#38bdf8",
    icon: `<polygon points="5,25 27,25 16,7" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 12 25 A 7 7 0 0 0 8.7 19" fill="currentColor" fill-opacity="0.35"
        stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
];
