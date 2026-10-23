// The written directions for the standalone lesson pages, keyed by slug. Each
// page shows its own in the step column on the right (page.ts), in the same
// format as a lab lesson's steps. Text may hold `$…$` LaTeX.
//
// The steps here only describe the figure; they do not drive it. A lab
// lesson's steps draw its construction in, but a standalone page has one
// bespoke interaction and shows all of it at once.

import type { Step } from "./lab/scene.ts";

export const directions: Record<string, Step[]> = {
  angles: [
    {
      title: "Drag the apex",
      text: "Grab the knob on the top corner and move it around. The base stays put, and each angle is coloured by its kind.",
    },
    {
      title: "Acute",
      text: "While all three angles are less than $90^\\circ$, the triangle is acute and every angle shares one colour.",
    },
    {
      title: "Right",
      text: "Bring one angle to exactly $90^\\circ$. The apex snaps there with a gold square in the corner: a right triangle.",
    },
    {
      title: "Obtuse",
      text: "Push one angle past $90^\\circ$. Its wedge fills in red. A triangle can only ever have one obtuse angle.",
    },
  ],
  equilateral: [
    {
      title: "Resize it",
      text: "Drag the knob on the corner. The triangle grows, shrinks and spins, but it stays equilateral.",
    },
    {
      title: "Three equal sides",
      text: "Every side carries the same tick and the same length, whatever size you choose.",
    },
    {
      title: "Three equal angles",
      text: "Every corner stays at $60^\\circ$, because the three angles share $180^\\circ$ equally.",
    },
  ],
  isosceles: [
    {
      title: "Pull the apex",
      text: "Drag the apex knob to make the triangle taller or shorter, or to spin it round.",
    },
    {
      title: "Pull a base corner",
      text: "Drag a base knob to widen or narrow the base.",
    },
    {
      title: "What stays equal",
      text: "The two legs share a colour and a tick, and so do the two base angles. However you drag, the legs stay equal and the base angles stay equal.",
    },
  ],
  scalene: [
    {
      title: "Drag any corner",
      text: "Every vertex has a knob. Move them anywhere you like.",
    },
    {
      title: "No two alike",
      text: "Whenever two sides are about to match, the corner skips past that spot. A scalene triangle can pass through an isosceles shape but never rest there.",
    },
    {
      title: "Sides face angles",
      text: "Each side shares its colour with the angle opposite it. The longest side always faces the largest angle.",
    },
  ],
  perimeter: [
    {
      title: "Walk the edge",
      text: "Each triangle has a knob parked on one corner. Drag it along the side to the next corner.",
    },
    {
      title: "Keep a running total",
      text: "Each side you finish adds its length to $p$ in that triangle's box.",
    },
    {
      title: "All the way round",
      text: "Bring the knob back to where it started. The perimeter is $p = a + b + c$, and the semiperimeter $s = \\frac{p}{2}$ joins it.",
    },
  ],
  medians: [
    {
      title: "Pull a knob across",
      text: "Each corner has a knob on a short stub. Drag one across the triangle toward the midpoint of the opposite side.",
    },
    {
      title: "Lock the median",
      text: "Land it on the midpoint and it locks into place. A median joins a vertex to the midpoint of the opposite side.",
    },
    {
      title: "Find the centroid",
      text: "Lock all three medians on a triangle. They cross at a single point, the centroid $G$. Try it on each triangle.",
    },
  ],
  bisectors: [
    {
      title: "Slide the knob",
      text: "On each triangle a line runs from the apex to a knob on the opposite side. Slide the knob along that side.",
    },
    {
      title: "Compare the halves",
      text: "The line splits the apex angle into two wedges. While they differ, one is warm and one is cool.",
    },
    {
      title: "Bisect the angle",
      text: "Slide until the two angles are equal. Both wedges turn the same colour and the apex pulses: the line is the angle bisector. Do the same on every triangle.",
    },
  ],
  altitudes: [
    {
      title: "Drop a perpendicular",
      text: "Each corner has a knob on a short stub. Drag one toward the line through the opposite side until it meets that line at a right angle.",
    },
    {
      title: "Lock the altitude",
      text: "At the foot it locks with a right-angle mark and is labelled $h$. On an obtuse triangle the foot can lie beyond the side, on a dashed extension.",
    },
    {
      title: "Find the orthocenter",
      text: "Lock all three altitudes and they meet at the orthocenter $H$: inside an acute triangle, on the right-angle corner of a right one, and outside an obtuse one.",
    },
    {
      title: "Scroll for more",
      text: "Scroll, or drag empty space, to pan through thirty triangles. The flatter the triangle, the farther $H$ flies.",
    },
  ],
  inequality: [
    {
      title: "Select a side",
      text: "Click any side of a triangle. It lights up, its ends grow knobs, and a dotted circle appears around each end.",
    },
    {
      title: "Swing an end",
      text: "Grab a knob. The side keeps its length and turns about its other end, so the third side stretches or shrinks.",
    },
    {
      title: "Watch the sums",
      text: "The panel checks $a + b > c$, $b + c > a$ and $c + a > b$ as you swing.",
    },
    {
      title: "Lie flat",
      text: "The red dots on the circle are where the triangle collapses into a straight line. There one side exactly equals the sum of the other two. The third side can never be longer than that.",
    },
  ],
  pythagoras: [
    {
      title: "Shape the triangle",
      text: "Drag the knobs on the left triangle. A square sits on every side, labelled with its area.",
    },
    {
      title: "Compare the areas",
      text: "The panel adds the two leg squares: $a^2 + b^2$ always equals $c^2$, the hypotenuse square.",
    },
    {
      title: "Scrub the proof",
      text: "On the right, slide the knob along its rail. The same four triangles move around inside one square of side $a + b$.",
    },
    {
      title: "Why it is true",
      text: "At one end the space left over is the two squares $a^2$ and $b^2$; at the other it is one tilted square $c^2$. Same box, same four triangles, so $a^2 + b^2 = c^2$.",
    },
  ],
  congruence: [
    {
      title: "Drag each C",
      text: "Each cell has the same fixed base $AB$ and a free corner $C$. The dashed circles and rays show where $C$ must go to match the given sides and angles.",
    },
    {
      title: "Meet the givens",
      text: "The checklist ticks each measurement as it matches. $C$ snaps onto the spots where the dashed lines cross.",
    },
    {
      title: "SSS, SAS, ASA",
      text: "These three leave $C$ only one place to land, so the givens fix a single triangle. SSS also shows its mirror image across $AB$, the same triangle flipped.",
    },
    {
      title: "Why not SSA",
      text: "In the SSA cell, the ray and the circle cross twice. Land $C$ on one spot and the other stays as a ghost: two different triangles from the same givens.",
    },
  ],
  similar: [
    {
      title: "Slide along the ray",
      text: "Drag the knob along the tilted ray. Each right triangle under it has angles $90^\\circ$, $\\theta$ and $90^\\circ - \\theta$, so they are all similar.",
    },
    {
      title: "Read the table",
      text: "As you slide, the sides change but the ratios $\\frac{\\text{opp}}{\\text{hyp}}$, $\\frac{\\text{adj}}{\\text{hyp}}$ and $\\frac{\\text{opp}}{\\text{adj}}$ hold still.",
    },
    {
      title: "Turn the dial",
      text: "Drag the knob on the arc to change $\\theta$. Now every ratio moves together: each ratio depends on the angle alone.",
    },
  ],
  trig: [
    {
      title: "Reshape the triangle",
      text: "Drag $B$. The opposite leg, the adjacent leg and the hypotenuse each keep their own colour.",
    },
    {
      title: "Six ratios",
      text: "The panel builds $\\sin$, $\\cos$ and $\\tan$ from the sides, and beneath them their flips $\\csc$, $\\sec$ and $\\cot$.",
    },
    {
      title: "Switch angles",
      text: "Click the other acute angle. Opposite and adjacent trade places, and $\\sin A = \\cos B$ because $A + B = 90^\\circ$.",
    },
    {
      title: "Always one",
      text: "The footer shows $\\sin^2 + \\cos^2 = \\frac{a^2 + b^2}{c^2} = 1$. That is the Pythagorean theorem again.",
    },
  ],
  fortyfive: [
    {
      title: "Fold the square",
      text: "Drag the flying corner across the diagonal. The two halves land exactly on each other.",
    },
    {
      title: "Bisect the right angle",
      text: "Matching halves mean the fold splits each right angle into $45^\\circ + 45^\\circ$, leaving a $45^\\circ$-$45^\\circ$-$90^\\circ$ triangle.",
    },
    {
      title: "Find the hypotenuse",
      text: "Both legs are $a$, so the Pythagorean theorem gives the hypotenuse $\\sqrt{a^2 + a^2} = a\\sqrt{2}$.",
    },
    {
      title: "Resize the square",
      text: "Drag the resize knob. Every length changes, but the $a$'s cancel in every ratio: $\\sin 45^\\circ = \\frac{a}{a\\sqrt{2}} = \\frac{\\sqrt{2}}{2}$.",
    },
  ],
  thirtysixty: [
    {
      title: "Fold the triangle",
      text: "Drag the flying corner across the altitude. The two halves of the equilateral triangle match exactly.",
    },
    {
      title: "Split it evenly",
      text: "The halves are congruent, so the base splits into $a + a$ and the top angle into $30^\\circ + 30^\\circ$. What remains is a $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle.",
    },
    {
      title: "Find the long leg",
      text: "The hypotenuse is $2a$ and the short leg is $a$, so the long leg is $\\sqrt{(2a)^2 - a^2} = a\\sqrt{3}$. The sides run $1 : \\sqrt{3} : 2$.",
    },
    {
      title: "Resize it",
      text: "Drag the resize knob. The lengths change, but every ratio of $30^\\circ$ and $60^\\circ$ holds, and the hypotenuse is always twice the side opposite $30^\\circ$.",
    },
  ],
  table: [
    {
      title: "A hypotenuse of 1",
      text: "The hypotenuse is pinned at length $1$, so the opposite leg is $\\sin\\theta$ and the adjacent leg is $\\cos\\theta$.",
    },
    {
      title: "Swing the dial",
      text: "Drag $B$ round the dial. It snaps at $0^\\circ$, $30^\\circ$, $45^\\circ$, $60^\\circ$ and $90^\\circ$, and the sides show their exact values.",
    },
    {
      title: "Read the table",
      text: "The table lists all six ratios at each landmark angle, with the column nearest the dial highlighted.",
    },
    {
      title: "The ends",
      text: "At $0^\\circ$ the opposite leg vanishes, so $\\sin 0^\\circ = 0$. At $90^\\circ$ the adjacent leg vanishes, and $\\tan 90^\\circ$ would divide by zero.",
    },
  ],
};
