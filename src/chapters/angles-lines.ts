import type { Lesson } from "./types.ts";

export const anglesLines: Lesson[] = [
  {
    slug: "angle-kinds",
    part: "Measuring · One",
    name: "Kinds of Angle",
    desc: "Swing a ray all the way round and read the angle in degrees, radians and minutes.",
    accent: "#ffd43b",
    icon: `<polyline points="27,20 14,20 6,9" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M 21 20 A 7 7 0 1 1 9.9 14.3" fill="none" stroke="currentColor"
        stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "hand-protractor",
    part: "Measuring · Two",
    name: "Your Hand, a Protractor",
    desc: "Spread thumb and finger at the camera and read the angle between them.",
    accent: "#38d9a9",
    icon: `<polyline points="26,24 6,24 20,8" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M 16 24 A 10 10 0 0 0 12.6 16.5" fill="none" stroke="currentColor"
        stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "angle-pairs",
    part: "Measuring · Three",
    name: "Vertical Angles",
    desc: "Turn two crossing lines and see why the angles facing each other must match.",
    accent: "#60a5fa",
    icon: `<line x1="5" y1="9" x2="27" y2="23" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="5" y1="23" x2="27" y2="9" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <path d="M 9.7 12 A 7.5 7.5 0 0 0 9.7 20" fill="none" stroke="currentColor"
        stroke-width="2" />
      <path d="M 22.3 12 A 7.5 7.5 0 0 1 22.3 20" fill="none" stroke="currentColor"
        stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "parallel-transversal",
    part: "Parallels · One",
    name: "Parallels and a Transversal",
    desc: "Swing a line across two parallels, then tilt one and watch the equal angles break.",
    accent: "#c084fc",
    icon: `<line x1="4" y1="10" x2="28" y2="10" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="4" y1="22" x2="28" y2="22" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <line x1="11" y1="28" x2="21" y2="4" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />`,
    lab: true,
  },
  {
    slug: "triangle-angle-sum",
    part: "Parallels · Two",
    name: "Angles of a Triangle",
    desc: "Carry two angles up to the third along a parallel — they make a straight line.",
    accent: "#f472b6",
    icon: `<polygon points="5,25 27,25 19,9" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="7" y1="9" x2="29" y2="9" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" />`,
    lab: true,
  },
  {
    slug: "exterior-angle",
    part: "Parallels · Three",
    name: "The Exterior Angle",
    desc: "Extend a side of a triangle and match the outside angle to the two far corners.",
    accent: "#38d9a9",
    icon: `<polygon points="4,24 20,24 13,9" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="20" y1="24" x2="29" y2="24" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <path d="M 26 24 A 6 6 0 0 0 17.5 18.6" fill="none" stroke="currentColor"
        stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "arcs-sectors",
    part: "Arcs · One",
    name: "Arcs, Sectors, Segments",
    desc: "Drag an arc's endpoint and radius to see its length, its sector and its segment.",
    accent: "#fb923c",
    icon: `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-dasharray="3 3" />
      <path d="M 16 16 L 27 16 A 11 11 0 0 0 10.5 6.5 Z" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linejoin="round" />`,
    lab: true,
  },
];
