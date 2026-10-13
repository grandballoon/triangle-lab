import type { Lesson } from "./types.ts";

export const circles: Lesson[] = [
  {
    slug: "circle-parts",
    part: "Circles · One",
    name: "Parts of a Circle",
    desc: "Slide points round a circle and light up its radius, chords, tangent, arcs and sectors.",
    accent: "#22d3ee",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="16" y1="16" x2="25.5" y2="10.5" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />
      <line x1="7" y1="22.3" x2="24" y2="23.5" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "circle-pi",
    part: "Circles · Two",
    name: "Rolling Out Pi",
    desc: "Roll a wheel through one turn and count how many diameters fit along its trail.",
    accent: "#38d9a9",
    icon: `<circle cx="10" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="10" y1="6" x2="10" y2="20" stroke="currentColor" stroke-width="2" />
      <line x1="3" y1="25" x2="29" y2="25" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "circle-area",
    part: "Circles · Three",
    name: "Area of a Circle",
    desc: "Cut a disc into wedges and deal them into a rectangle of base πr and height r.",
    accent: "#ffd43b",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="5" y1="16" x2="27" y2="16" stroke="currentColor" stroke-width="2" />
      <line x1="10.5" y1="6.5" x2="21.5" y2="25.5" stroke="currentColor" stroke-width="2" />
      <line x1="21.5" y1="6.5" x2="10.5" y2="25.5" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "tangent-circles",
    part: "Circles · Four",
    name: "Tangent Circles",
    desc: "Push two circles together until they touch, then huddle three and solve for a radius.",
    accent: "#fb923c",
    icon: `<circle cx="11" cy="18" r="8" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="24" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="11" y1="18" x2="24" y2="12" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="2.5 2.5" />`,
    lab: true,
  },
];
