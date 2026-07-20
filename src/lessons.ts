// The reading order for the whole project, in one place. The menu (index.ts)
// and the prev/next pager (nav.ts) both render from this list, so the order a
// reader pages through is by construction the order the menu shows.
//
// Adding a lesson: add an entry here, create <slug>.html next to index.html,
// and register the slug in vite.config.ts. The menu card and the pager links
// on the neighbouring lessons then appear on their own.

export interface Lesson {
  /** Page filename without the extension. Doubles as the link target. */
  slug: string;
  /** Section and position within it, e.g. "Trigonometry · Two". */
  part: string;
  name: string;
  /** One line on the menu card — what the reader does with their hands. */
  desc: string;
  accent: string;
  /** Inner markup of a `0 0 32 32` SVG. Strokes and fills use currentColor so
   *  the accent is set once, by whoever renders the icon. */
  icon: string;
}

export const lessons: Lesson[] = [
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
    name: "Perimeter & Semiperimeter",
    desc: "Drag the knob around the edge and watch p and s add up.",
    accent: "#60a5fa",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />`,
  },
  {
    slug: "medians",
    part: "Parts · Two",
    name: "Medians",
    desc: "Pull each vertex to the opposite midpoint until they meet at G.",
    accent: "#c084fc",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="2" />
      <circle cx="16" cy="19.3" r="2.4" fill="currentColor" />`,
  },
  {
    slug: "bisectors",
    part: "Parts · Three",
    name: "Angle Bisectors",
    desc: "Slide each knob until the two half-angles match.",
    accent: "#22d3ee",
    icon: `<polygon points="16,6 27,26 5,26" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor"
        stroke-width="2" stroke-dasharray="3 3" />`,
  },
  {
    slug: "altitudes",
    part: "Parts · Four",
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
];

/** Position of a lesson in the reading order, or -1 for an unknown slug. */
export function indexOfSlug(slug: string): number {
  return lessons.findIndex((l) => l.slug === slug);
}
