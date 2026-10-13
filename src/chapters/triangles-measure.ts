import type { Lesson } from "./types.ts";

export const trianglesMeasure: Lesson[] = [
  {
    slug: "altitude-on-hypotenuse",
    part: "Similarity · Two",
    name: "Altitude to the Hypotenuse",
    desc: "Slide the right angle round a semicircle and watch three similar triangles trade ratios.",
    accent: "#fb923c",
    icon: `<polygon points="4,25 28,25 11,10" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="11" y1="10" x2="11" y2="25" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 2.5" />`,
    lab: true,
  },
  {
    slug: "angle-bisector-theorem",
    part: "Similarity · Three",
    name: "The Angle Bisector Theorem",
    desc: "Move the apex and see the bisector split the far side in the ratio of the near sides.",
    accent: "#a78bfa",
    icon: `<polygon points="4,25 28,25 12,6" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="12" y1="6" x2="14.5" y2="25" stroke="currentColor" stroke-width="2" />
      <circle cx="14.5" cy="25" r="2.2" fill="currentColor" />`,
    lab: true,
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
    slug: "area-base-height",
    part: "Area · One",
    name: "Half Base Times Height",
    desc: "Drag the apex past the ends of the base and watch right triangles add, then subtract.",
    accent: "#34d399",
    icon: `<rect x="5" y="9" width="22" height="16" fill="none" stroke="currentColor"
      stroke-width="1.6" stroke-dasharray="3 2.5" />
      <polygon points="5,25 27,25 18,9" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "area-sine",
    part: "Area · Two",
    name: "Two Sides and an Angle",
    desc: "Swing one side about a corner and get the area from two sides and the sine between them.",
    accent: "#38bdf8",
    icon: `<polygon points="5,25 27,25 16,7" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <path d="M 12 25 A 7 7 0 0 0 8.7 19" fill="currentColor" fill-opacity="0.35"
        stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "area-inradius",
    part: "Area · Three",
    name: "Inradius Times Semiperimeter",
    desc: "Cut a triangle into three from its incentre, then run the formula backwards to find r.",
    accent: "#a3e635",
    icon: `<polygon points="4,26 28,26 14,5" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="15" cy="18.5" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="15" cy="18.5" r="1.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "right-angle-tests",
    part: "Toolbox · One",
    name: "Spotting a Right Triangle",
    desc: "Drag a triangle until a corner clicks square and four different tests light up at once.",
    accent: "#22d3ee",
    icon: `<circle cx="16" cy="17" r="11" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-dasharray="3 2.5" />
      <polygon points="5,17 27,17 10.5,7.5" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "parallel-trick",
    part: "Toolbox · Two",
    name: "The Parallel Line Trick",
    desc: "Add one parallel to a tangle of ratios and reshape the triangle: the answer never moves.",
    accent: "#fb7185",
    icon: `<polygon points="4,26 28,26 13,5" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="13" y1="5" x2="12" y2="26" stroke="currentColor" stroke-width="1.6" />
      <line x1="28" y1="26" x2="10.8" y2="10.3" stroke="currentColor" stroke-width="1.6" />`,
    lab: true,
  },
];
