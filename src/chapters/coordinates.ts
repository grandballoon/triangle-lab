import type { Lesson } from "./types.ts";

export const coordinates: Lesson[] = [
  {
    slug: "coordinate-plane",
    part: "The Plane · One",
    name: "Two Addresses for a Point",
    desc: "Drag a point and read it as (x, y) or as (r, θ); freeze a coordinate to trace a line or a circle.",
    accent: "#38d9a9",
    icon: `<line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" stroke-width="2" />
      <line x1="12" y1="4" x2="12" y2="28" stroke="currentColor" stroke-width="2" />
      <line x1="12" y1="20" x2="23" y2="9" stroke="currentColor" stroke-width="2"
        stroke-dasharray="3 3" />
      <circle cx="23" cy="9" r="3" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "slope",
    part: "Lines · One",
    name: "Rise over Run",
    desc: "Tilt a line through two points and watch its slope turn positive, negative, zero or undefined.",
    accent: "#60a5fa",
    icon: `<line x1="4" y1="26" x2="28" y2="8" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <polyline points="8,23 24,23 24,11" fill="none" stroke="currentColor"
        stroke-width="2" stroke-dasharray="3 3" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "line-equation",
    part: "Lines · Two",
    name: "The Equation of a Line",
    desc: "Slide the y-intercept and a second point to write the line as y = mx + b and as Ax + By = C.",
    accent: "#ffd43b",
    icon: `<line x1="10" y1="4" x2="10" y2="28" stroke="currentColor" stroke-width="2" />
      <line x1="4" y1="24" x2="28" y2="24" stroke="currentColor" stroke-width="2" />
      <line x1="4" y1="20" x2="28" y2="6" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="10" cy="16.5" r="3" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "parallel-perpendicular-slopes",
    part: "Lines · Three",
    name: "Parallel and Perpendicular Slopes",
    desc: "Slide a slope triangle to a parallel line, or turn it a quarter turn to a perpendicular one.",
    accent: "#c084fc",
    icon: `<line x1="4" y1="24" x2="24" y2="10" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <line x1="12" y1="6" x2="24" y2="23" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <polyline points="14.6,13.5 17.3,17.3 21,14.7" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-linejoin="round" />`,
    lab: true,
  },
  {
    slug: "distance-formula",
    part: "Distance · One",
    name: "The Distance Formula",
    desc: "Stretch a segment across the grid and measure it as the hypotenuse of a right triangle.",
    accent: "#fb923c",
    icon: `<polyline points="6,24 26,24 26,8" fill="none" stroke="currentColor"
      stroke-width="2" stroke-dasharray="3 3" stroke-linejoin="round" />
      <line x1="6" y1="24" x2="26" y2="8" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" />
      <circle cx="6" cy="24" r="2.5" fill="currentColor" />
      <circle cx="26" cy="8" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "midpoint-formula",
    part: "Distance · Two",
    name: "Midpoints and Fractions of the Way",
    desc: "Average two endpoints to land halfway, then slide to any fraction of the way along.",
    accent: "#f472b6",
    icon: `<line x1="5" y1="25" x2="27" y2="7" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" />
      <circle cx="5" cy="25" r="2.5" fill="currentColor" />
      <circle cx="27" cy="7" r="2.5" fill="currentColor" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="2" />`,
    lab: true,
  },
  {
    slug: "circle-equation",
    part: "Circles · One",
    name: "The Equation of a Circle",
    desc: "Move a circle's centre and rim, then test whether a point falls inside, on or outside it.",
    accent: "#22d3ee",
    icon: `<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="16" y1="16" x2="23" y2="9" stroke="currentColor" stroke-width="2" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "line-circle-intersection",
    part: "Circles · Two",
    name: "Where a Line Meets a Circle",
    desc: "Swing a line across a circle and let a quadratic's discriminant count the crossings.",
    accent: "#a3e635",
    icon: `<circle cx="16" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="2.5" />
      <line x1="3" y1="20" x2="29" y2="7" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" />
      <circle cx="8.1" cy="17.4" r="2.5" fill="currentColor" />
      <circle cx="22.6" cy="10.2" r="2.5" fill="currentColor" />`,
    lab: true,
  },
  {
    slug: "centroid-coordinates",
    part: "Proofs · One",
    name: "The Centroid by Coordinates",
    desc: "Lay a triangle on the axes and prove its three medians meet at the average of its vertices.",
    accent: "#ff8787",
    icon: `<polygon points="5,25 27,25 12,6" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linejoin="round" />
      <line x1="5" y1="25" x2="19.5" y2="15.5" stroke="currentColor" stroke-width="1.5" />
      <line x1="27" y1="25" x2="8.5" y2="15.5" stroke="currentColor" stroke-width="1.5" />
      <circle cx="14.7" cy="18.7" r="2.5" fill="currentColor" />`,
    lab: true,
  },
];
