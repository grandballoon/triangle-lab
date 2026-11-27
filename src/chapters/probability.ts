import type { Lesson } from "./types.ts";

export const probability: Lesson[] = [
  {
    slug: "mean-median-mode",
    part: "Probability · One",
    name: "Mean, Median and Mode",
    desc: "Drag dots on a line: the mean balances them, the median sits in the middle, the mode stacks highest.",
    accent: "#22d3ee",
    icon: `<path d="M3 24 H29" stroke="currentColor" stroke-width="1.5" />
      <circle cx="7" cy="20" r="2.5" fill="currentColor" /><circle cx="12" cy="20" r="2.5" fill="currentColor" /><circle cx="12" cy="14" r="2.5" fill="currentColor" />
      <circle cx="17" cy="20" r="2.5" fill="currentColor" /><circle cx="26" cy="20" r="2.5" fill="currentColor" fill-opacity="0.45" />
      <path d="M15 25 L13 29 H17 Z" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "dice-outcomes",
    part: "Probability · Two",
    name: "Equally Likely Outcomes",
    desc: "The 36 ways two dice land: favourable over possible, uneven sums, and the complement.",
    accent: "#ffd43b",
    icon: `<rect x="3" y="3" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M3 11.7 H29 M3 20.3 H29 M11.7 3 V29 M20.3 3 V29" stroke="currentColor" stroke-width="1" stroke-opacity="0.5" />
      <rect x="3" y="20.3" width="8.7" height="8.7" fill="currentColor" fill-opacity="0.6" /><rect x="11.7" y="11.7" width="8.6" height="8.6" fill="currentColor" fill-opacity="0.6" /><rect x="20.3" y="3" width="8.7" height="8.7" fill="currentColor" fill-opacity="0.6" />`,
    lab: true,
  },
  {
    slug: "multiplying-probabilities",
    part: "Probability · Three",
    name: "Multiplying Probabilities",
    desc: "Probability as area in a unit square: independent events multiply, and so do chances that depend on the last.",
    accent: "#f472b6",
    icon: `<rect x="3" y="3" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="3" y="17" width="13" height="12" fill="currentColor" fill-opacity="0.7" />
      <rect x="3" y="3" width="13" height="14" fill="currentColor" fill-opacity="0.25" /><rect x="16" y="17" width="13" height="12" fill="currentColor" fill-opacity="0.25" />`,
    lab: true,
  },
  {
    slug: "probability-casework",
    part: "Probability · Four",
    name: "Casework",
    desc: "Split an event into cases that do not overlap, count or weigh each, and add.",
    accent: "#38d9a9",
    icon: `<rect x="3" y="3" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="3" y="20" width="8.7" height="9" fill="currentColor" fill-opacity="0.3" /><rect x="11.7" y="11.7" width="8.6" height="17.3" fill="currentColor" fill-opacity="0.55" />
      <rect x="20.3" y="3" width="8.7" height="26" fill="currentColor" fill-opacity="0.8" />`,
    lab: true,
  },
  {
    slug: "odds-probability",
    part: "Probability · Five",
    name: "Odds and Probability",
    desc: "Part to part against part to whole: odds in favour, odds against, and a fair bet.",
    accent: "#fb923c",
    icon: `<circle cx="7" cy="16" r="4" fill="currentColor" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.5" /><circle cx="25" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M3 25 H11 M13 25 H29" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "expected-value",
    part: "Probability · Six",
    name: "Expected Value",
    desc: "The long-run average of a game: outcomes weighted by their chances, balanced on a beam.",
    accent: "#c084fc",
    icon: `<path d="M3 20 H29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <rect x="4" y="9" width="6" height="11" fill="currentColor" fill-opacity="0.7" /><rect x="23" y="15" width="5" height="5" fill="currentColor" fill-opacity="0.45" />
      <path d="M12 21 L9 28 H15 Z" fill="currentColor" />`,
    lab: true,
  },
];
