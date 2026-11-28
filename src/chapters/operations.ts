import type { Lesson } from "./types.ts";

export const operations: Lesson[] = [
  {
    slug: "operation-table",
    part: "Operations · One",
    name: "Operations as Tables",
    desc: "Make up a rule a ∗ b, fill in its table, and see whether its answers stay in the set.",
    accent: "#4dabf7",
    icon: `<rect x="4" y="4" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 12 H28 M4 20 H28 M12 4 V28 M20 4 V28" stroke="currentColor" stroke-width="1.2" />
      <rect x="4" y="4" width="8" height="8" fill="currentColor" fill-opacity="0.35" />
      <rect x="20" y="20" width="8" height="8" fill="currentColor" fill-opacity="0.8" />`,
    lab: true,
  },
  {
    slug: "commutative-associative",
    part: "Operations · Two",
    name: "Commutative and Associative",
    desc: "Fold the table across its diagonal to test swapping; chase entries to test regrouping.",
    accent: "#f783ac",
    icon: `<rect x="4" y="4" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 4 L28 28" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
      <rect x="19" y="7" width="6" height="6" fill="currentColor" fill-opacity="0.7" />
      <rect x="7" y="19" width="6" height="6" fill="currentColor" fill-opacity="0.7" />`,
    lab: true,
  },
  {
    slug: "identity-inverse",
    part: "Operations · Three",
    name: "Identities and Inverses",
    desc: "In clock tables, find the element that changes nothing and the one that undoes each other.",
    accent: "#ffd43b",
    icon: `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 16 L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M16 16 L22 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="16" cy="4" r="2" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "relations-arrows",
    part: "Operations · Four",
    name: "Relations as Arrows",
    desc: "Draw a relation as arrows and spot reflexive loops, two-way arrows and missing shortcuts.",
    accent: "#69db7c",
    icon: `<circle cx="7" cy="24" r="2.5" fill="currentColor" /><circle cx="25" cy="24" r="2.5" fill="currentColor" /><circle cx="16" cy="7" r="2.5" fill="currentColor" />
      <path d="M9 21 L14 10 M18 10 L23 21" stroke="currentColor" stroke-width="1.5" />
      <path d="M10 24 H22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
      <circle cx="16" cy="3.5" r="2" fill="none" stroke="currentColor" stroke-width="1.2" />`,
    lab: true,
  },
  {
    slug: "equivalence-classes",
    part: "Operations · Five",
    name: "Equivalence Classes",
    desc: "Sort 1 to 12 by remainder into classes that never overlap, and see what goes wrong without transitivity.",
    accent: "#b197fc",
    icon: `<rect x="3" y="5" width="7" height="22" rx="2" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" />
      <rect x="12.5" y="5" width="7" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="22" y="5" width="7" height="22" rx="2" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
];
