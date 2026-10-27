import type { Lesson } from "./types.ts";

export const linear: Lesson[] = [
  {
    slug: "linear-balance",
    part: "One Unknown · One",
    name: "Keep It Balanced",
    desc: "Draw both sides of an equation as lines and watch the crossing hold still while you solve.",
    accent: "#22d3ee",
    icon: `<line x1="5" y1="11" x2="27" y2="11" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <polygon points="16,11 11,27 21,27" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linejoin="round" />
      <path d="M3 18 L7 11 L11 18 Z M21 18 L25 11 L29 18 Z" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "linear-solution-sets",
    part: "One Unknown · Two",
    name: "What Makes It Linear",
    desc: "Hunt for points that solve an equation and see which equations line their answers up.",
    accent: "#a3e635",
    icon: `<line x1="4" y1="26" x2="28" y2="6" stroke="currentColor" stroke-width="1.5"
      stroke-dasharray="3 3" />
      <circle cx="8" cy="23" r="2.5" fill="currentColor" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      <circle cx="24" cy="9.5" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "linear-substitution",
    part: "Two Unknowns · One",
    name: "Substitution",
    desc: "Walk a point along one line until the other equation holds, then let the algebra do it.",
    accent: "#fb923c",
    icon: `<line x1="4" y1="26" x2="28" y2="6" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="4" y1="8" x2="28" y2="24" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />
      <circle cx="10" cy="21" r="3" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="16.4" cy="16.3" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "linear-elimination",
    part: "Two Unknowns · Two",
    name: "Elimination",
    desc: "Add multiples of two equations and swing their sum about the crossing until a variable cancels.",
    accent: "#ffd43b",
    icon: `<line x1="4" y1="22" x2="28" y2="10" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="4" y1="8" x2="28" y2="24" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "catching-up",
    part: "Word Problems · One",
    name: "Rate Times Time",
    desc: "Race a later, faster car against an earlier one and find where their distance lines cross.",
    accent: "#60a5fa",
    icon: `<polyline points="4,28 4,4" fill="none" stroke="currentColor" stroke-width="1.5" />
      <polyline points="4,28 28,28" fill="none" stroke="currentColor" stroke-width="1.5" />
      <line x1="4" y1="28" x2="28" y2="12" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="11" y1="28" x2="25" y2="5" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />
      <circle cx="19.4" cy="17.7" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "average-speed",
    part: "Word Problems · Two",
    name: "The Average Speed Trap",
    desc: "Drive out fast and back slow, and see why the average speed is not the average of the speeds.",
    accent: "#f472b6",
    icon: `<polyline points="4,28 13,16 28,5" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" />
      <line x1="4" y1="28" x2="28" y2="5" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />
      <circle cx="13" cy="16" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "work-rates",
    part: "Word Problems · Three",
    name: "Working Together",
    desc: "Open two pipes at once and add their rates to find when the pool is full.",
    accent: "#38d9a9",
    icon: `<line x1="4" y1="9" x2="28" y2="9" stroke="currentColor" stroke-width="1.5"
      stroke-dasharray="3 3" />
      <line x1="4" y1="28" x2="28" y2="16" stroke="currentColor" stroke-width="2" />
      <line x1="4" y1="28" x2="24" y2="13" stroke="currentColor" stroke-width="2" />
      <line x1="4" y1="28" x2="15" y2="9" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="15" cy="9" r="2.5" fill="currentColor" />`,
    lab: true,
  },
];
