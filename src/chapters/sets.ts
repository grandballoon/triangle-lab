import type { Lesson } from "./types.ts";

export const sets: Lesson[] = [
  {
    slug: "sets-membership",
    part: "Sets · One",
    name: "Sets and Membership",
    desc: "Pick a rule and watch its set light up: x ∈ S, lists in braces, set-builder notation and ∅.",
    accent: "#4dabf7",
    icon: `<path d="M10 5 Q5 5 5 10 V13 Q5 16 2 16 Q5 16 5 19 V22 Q5 27 10 27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M22 5 Q27 5 27 10 V13 Q27 16 30 16 Q27 16 27 19 V22 Q27 27 22 27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="11" cy="12" r="2.5" fill="currentColor" /><circle cx="21" cy="12" r="2.5" fill="currentColor" /><circle cx="16" cy="21" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "set-operations",
    part: "Sets · Two",
    name: "Union, Intersection, Complement",
    desc: "Shade ∪, ∩, complements and differences on a Venn diagram, then De Morgan's laws.",
    accent: "#da77f2",
    icon: `<path d="M16 9.1 A8 8 0 0 1 16 22.9 A8 8 0 0 1 16 9.1 Z" fill="currentColor" fill-opacity="0.6" />
      <circle cx="12" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="20" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="1.8" />`,
    lab: true,
  },
  {
    slug: "inclusion-exclusion",
    part: "Sets · Three",
    name: "Counting with Two Circles",
    desc: "Set the count in each region: |A ∪ B| = |A| + |B| − |A ∩ B|, and how many are in neither.",
    accent: "#38d9a9",
    icon: `<circle cx="12" cy="16" r="8" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.8" />
      <circle cx="20" cy="16" r="8" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.8" />
      <path d="M14.5 16 H17.5 M16 14.5 V17.5" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "three-set-venn",
    part: "Sets · Four",
    name: "Three Circles",
    desc: "Seven regions to fill: add the sets, take off the pairs, add back the middle.",
    accent: "#ffa94d",
    icon: `<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="20" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="16" cy="19" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="16" cy="14.5" r="1.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "subsets",
    part: "Sets · Five",
    name: "Subsets",
    desc: "A yes or no for each element: a doubling tree and binary strings count 2ⁿ subsets.",
    accent: "#a9e34b",
    icon: `<path d="M16 5 L9 15 M16 5 L23 15 M9 15 L5 26 M9 15 L13 26 M23 15 L19 26 M23 15 L27 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="16" cy="5" r="2" fill="currentColor" /><circle cx="9" cy="15" r="2" fill="currentColor" /><circle cx="23" cy="15" r="2" fill="currentColor" />
      <circle cx="5" cy="26" r="2" fill="currentColor" /><circle cx="13" cy="26" r="2" fill="currentColor" /><circle cx="19" cy="26" r="2" fill="currentColor" /><circle cx="27" cy="26" r="2" fill="currentColor" />`,
    lab: true,
  },
];
