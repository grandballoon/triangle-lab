import type { Lesson } from "./types.ts";

export const proof: Lesson[] = [
  {
    slug: "proof-in-words",
    part: "Proof · One",
    name: "Proof in Words",
    desc: "Why two odd numbers always add to an even one: dots in pairs, then letters, then sentences.",
    accent: "#3bc9db",
    icon: `<circle cx="6" cy="10" r="2.5" fill="currentColor" /><circle cx="6" cy="17" r="2.5" fill="currentColor" />
      <circle cx="13" cy="10" r="2.5" fill="currentColor" /><circle cx="13" cy="17" r="2.5" fill="currentColor" />
      <circle cx="20" cy="10" r="2.5" fill="currentColor" fill-opacity="0.5" /><circle cx="20" cy="17" r="2.5" fill="currentColor" fill-opacity="0.5" />
      <rect x="16.5" y="6.5" width="7" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M4 25 H28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "infinitely-many-primes",
    part: "Proof · Two",
    name: "Infinitely Many Primes",
    desc: "Suppose a list held every prime, multiply them and add one, and watch the list fail.",
    accent: "#fab005",
    icon: `<rect x="3" y="5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="12.5" y="5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="22" y="5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M2 14 L30 3" stroke="currentColor" stroke-width="1.5" />
      <rect x="10" y="19" width="12" height="9" rx="2" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "converse-contrapositive",
    part: "Proof · Three",
    name: "Converses and Contrapositives",
    desc: "If P then Q as one circle inside another, and a truth table for what swapping and denying do.",
    accent: "#c084fc",
    icon: `<circle cx="17" cy="16" r="12" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5" />
      <circle cx="13" cy="16" r="5.5" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "induction-dominoes",
    part: "Proof · Four",
    name: "Induction",
    desc: "Knock over the first domino, make each one topple the next, and prove 1 + 2 + … + n = n(n + 1)/2.",
    accent: "#60a5fa",
    icon: `<rect x="3" y="12" width="3.5" height="14" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2" transform="rotate(35 6.5 26)" />
      <rect x="11" y="12" width="3.5" height="14" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2" transform="rotate(20 14.5 26)" />
      <rect x="19" y="12" width="3.5" height="14" fill="none" stroke="currentColor" stroke-width="1.2" />
      <rect x="26" y="12" width="3.5" height="14" fill="none" stroke="currentColor" stroke-width="1.2" />
      <path d="M2 26 H30" stroke="currentColor" stroke-width="1.5" />`,
    lab: true,
  },
  {
    slug: "pigeonhole",
    part: "Proof · Five",
    name: "The Pigeonhole Principle",
    desc: "More pigeons than holes means a crowded hole: slide both and find the fullest one.",
    accent: "#38d9a9",
    icon: `<rect x="3" y="12" width="8" height="15" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="12" y="12" width="8" height="15" fill="none" stroke="currentColor" stroke-width="1.5" />
      <rect x="21" y="12" width="8" height="15" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="7" cy="23" r="2.2" fill="currentColor" /><circle cx="16" cy="23" r="2.2" fill="currentColor" />
      <circle cx="25" cy="23" r="2.2" fill="currentColor" /><circle cx="25" cy="17" r="2.2" fill="currentColor" />
      <path d="M25 4 V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "convincing-but-wrong",
    part: "Proof · Six",
    name: "Convincing but Wrong",
    desc: "A pattern that breaks at six points, a square that vanishes, and a proof that 2 = 1.",
    accent: "#ff6b6b",
    icon: `<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 4 L27 20 L5 20 Z M16 4 L16 28 M5 20 L27 20 M27 20 L16 28 L5 20" fill="none" stroke="currentColor" stroke-width="1.2" />
      <circle cx="16" cy="4" r="2" fill="currentColor" /><circle cx="27" cy="20" r="2" fill="currentColor" />
      <circle cx="5" cy="20" r="2" fill="currentColor" /><circle cx="16" cy="28" r="2" fill="currentColor" />`,
    lab: true,
  },
];
