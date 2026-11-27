// Arcs, sectors and circular segments. An arc has a measure (its central
// angle θ) and a length (rθ, the same fraction of the circumference that θ is
// of a full turn). The sector is that fraction of the disc, ½r²θ, and the
// circular segment is the sector with triangle AOB taken off — or put on, once
// the arc passes a half turn.

import { C, tint } from "../draw.ts";
import { angleOf, clamp, fmt, onSegment, polar, sub, TAU, toDeg, vec, wrapAngle } from "../geo.ts";
import { arcPoints } from "../kit/circles.ts";
import { lesson, term, type Frame } from "../scene.ts";
import oilTankSegmentImage from "../../images/oil-tank-segment.svg";
import runningTrackStaggerImage from "../../images/running-track-stagger.svg";
import spiderOrbWebImage from "../../images/spider-orb-web.svg";
import sprinklerLawnSectorImage from "../../images/sprinkler-lawn-sector.svg";
import vinylRecordGrooveImage from "../../images/vinyl-record-groove.svg";

const O = vec(0, 0.4);
const R_MIN = 1.6;
const R_MAX = 3.5;
const MIN_ARC = 0.2; // radians: the arc is never empty and never the whole circle
const SECTOR = C.gold;
const TRIANGLE = C.blue;
const SEGMENT = C.pink;
/** Above this opacity a shaded region counts as on the figure (draw.ts marks nothing fainter). */
const SHOWN = 0.05;

/** The sector shows on step 2 and gives way to the segment and triangle on step 3. */
const sectorAlpha = (f: Frame): number => f.at(2) * (1 - f.at(3));

export default lesson((s) => {
  const A = s.point(O.x + 2.8, O.y, {
    label: "A",
    constrain: onSegment(vec(O.x + R_MIN, O.y), vec(O.x + R_MAX, O.y)),
  });
  const radius = (): number => A.x - O.x;
  const B = s.point(O.x - 1, O.y + 2.6, {
    label: "B",
    constrain: (p) => polar(O, radius(), clamp(wrapAngle(angleOf(sub(p, O))), MIN_ARC, TAU - MIN_ARC)),
  });

  /** Radius and central angle, with B brought back onto the resized circle. */
  const figure = () => {
    B.set(B);
    const r = radius();
    const theta = wrapAngle(angleOf(sub(B, O)));
    const sector = (r * r * theta) / 2;
    const triangle = (r * r * Math.abs(Math.sin(theta))) / 2;
    const minor = theta <= Math.PI;
    return { r, theta, minor, sector, triangle, segment: minor ? sector - triangle : sector + triangle };
  };

  return {
    steps: [
      {
        title: "Measure and length",
        text: "Drag $B$ round the circle and $A$ in and out. The arc's measure is its central angle $\\theta$, which ignores the radius; the arc's length grows with both.",
      },
      {
        title: "Arc length",
        text: "The arc is the fraction $\\frac{\\theta}{2\\pi}$ of the whole circumference $2\\pi r$, so its length is $r\\theta$ with $\\theta$ in radians. At one radian the arc is exactly as long as the radius.",
      },
      {
        title: "Sector area",
        text: "The sector is the same fraction of the whole disc: $\\frac{\\theta}{2\\pi} \\cdot \\pi r^2 = \\tfrac12 r^2\\theta$.",
      },
      {
        title: "Circular segment",
        text: "Cut triangle $AOB$ off the sector and the piece between chord and arc remains: sector minus triangle. Past a half turn the triangle is added instead.",
      },
    ],

    likes: [
      {
        title: "Cutting a slice of cake",
        text: "Cut a slice with a $60^\\circ$ angle and you have one sixth of the cake, whatever its size: the angle sets the fraction, just as $\\theta$ sets the arc's measure. The cake's size then decides how much that fraction is: a bigger cake gives a longer edge, growing with $r$, and more cake, growing with $r^2$.",
      },
      {
        title: "Swinging a gate",
        text: "A gate swinging open a quarter turn sweeps a quarter-circle sector across the path. The latch at the far end travels much further than a point near the hinge, though both turn through the same angle: arc length is the radius times the angle.",
      },
    ],

    uses: [
      {
        title: "Staggered starts on a running track",
        text: "On a standard track each lane is $1.22$ metres wider than the last, so on each half-circle bend a runner one lane out goes about $\\pi \\times 1.22 \\approx 3.8$ metres further. That is why the $400$ metre start is staggered: outer runners start ahead, so everyone runs the same distance.",
        tags: ["sport"],
        image: {
          src: runningTrackStaggerImage,
          caption: "A running track's bend: each outer lane's half-circle is about 3.8 metres longer, so the 400 metre start is staggered to even out the distance.",
          alt: "Top-down view of a red running track bending round a green infield, with four runners starting at staggered marks and the inner and outer lane half-circles traced in gold.",
        },
      },
      {
        title: "A sprinkler in a corner",
        text: "A sprinkler in the corner of a lawn, set to sweep a quarter turn, $\\frac{\\pi}{2}$, with a $6$ metre throw, waters a sector of $\\tfrac12 \\cdot 6^2 \\cdot \\frac{\\pi}{2} \\approx 28$ square metres.",
        tags: ["gardening"],
        image: {
          src: sprinklerLawnSectorImage,
          caption: "A corner sprinkler sweeping a quarter turn with a 6 metre throw waters a quarter-circle sector of lawn, about 28 square metres.",
          alt: "Top-down rectangular lawn with a sprinkler in one corner and a blue quarter-circle of watered grass outlined in gold, its radius marked 6.",
        },
      },
      {
        title: "Oil in a lying tank",
        text: "A cylindrical tank lying on its side, like a home heating oil tank, has a circular end. When it is partly full, the liquid's end face is a circular segment: sector minus triangle. Dip charts that turn a depth reading into litres are worked out this way.",
        tags: ["home", "plumbing"],
        image: {
          src: oilTankSegmentImage,
          caption: "A heating oil tank lying on its side: the oil's end face is a circular segment, the sector minus the triangle, which is how dip charts turn depth into litres.",
          alt: "A cylindrical tank on two supports, its round end showing oil in the bottom, with the sector from the centre and the chord at the oil's surface traced in gold.",
        },
      },
      {
        title: "How fast a record's groove runs",
        text: "An LP turns at $33\\tfrac13$ turns a minute, so each second it turns $33\\tfrac13 \\div 60$ of a turn, $200^\\circ$, or about $3.49$ radians. Near the rim, $14.6$ cm from the centre, that is an arc of $14.6 \\times 3.49 \\approx 51$ cm of groove passing the needle every second; near the label, $6$ cm out, it is only about $21$ cm. The music at the end of a side is packed into less than half as much groove, which is why it can sound a little less crisp.",
        tags: ["music"],
        image: {
          src: vinylRecordGrooveImage,
          caption: "An LP at 33⅓ turns a minute: each second it turns 200°, so the groove passing the needle is a 200° arc, about 51 cm long near the rim and 21 cm near the label.",
          alt: "A black vinyl record with a red label and a tonearm resting near its rim. Two dashed gold arcs of 200° run round it, one near the rim marked 51 and one near the label marked 21.",
        },
      },
      {
        title: "The gaps in a spider's web",
        text: "An orb-weaving spider spins its radii out from the hub like spokes, then lays a spiral of sticky thread across them. In a web with $30$ radii spread evenly, neighbours are $12^\\circ$ apart, $\\frac{\\pi}{15}$ radians, so the spiral's span between two of them $15$ cm out is $15 \\times \\frac{\\pi}{15} = \\pi \\approx 3.1$ cm, but only about $0.6$ cm at $3$ cm from the hub. The same angle opens onto a longer arc the further out it is measured, so the gaps between radii widen towards the edge.",
        tags: ["nature"],
        image: {
          src: spiderOrbWebImage,
          caption: "An orb web: neighbouring radii are the same angle apart all the way out, so the arc between them grows with its distance from the hub.",
          alt: "A spider's orb web hanging from a branch, with thirty pale radii and rings of spiral thread, and a brown spider at the hub. Two neighbouring radii are traced as dashed gold lines, with short solid gold arcs between them near the rim, marked 3.1, and near the hub, marked 0.6.",
        },
      },
    ],

    draw(g, f) {
      const { r, theta } = figure();

      g.circle(O, r, { color: C.faint, width: 2 });

      if (f.at(2) > 0) {
        g.sector(O, r, 0, theta, { fill: tint(SECTOR, 0.3), stroke: null, alpha: sectorAlpha(f), term: "sector", feature: "area" });
      }
      if (f.at(3) > 0) {
        g.polygon(arcPoints(O, r, 0, theta), { fill: tint(SEGMENT, 0.4), stroke: null, alpha: f.at(3), term: "segment", feature: "area" });
        g.polygon([O, A, B], { fill: tint(TRIANGLE, 0.4), stroke: null, alpha: f.at(3), term: "triangle", feature: "area" });
        g.segment(A, B, { color: C.ink, width: 2, alpha: f.at(3) });
      }

      g.segment(O, A, { color: C.ink });
      g.segment(O, B, { color: C.ink });
      g.along(O, A, `r = ${fmt(r, 2)}`, { offset: -16 });
      g.arc(O, r, 0, theta, { color: g.accent, width: 5 });
      g.label(polar(O, r + g.px(24), theta / 2), fmt(r * theta, 2), { color: g.accent });
      g.angleMark(O, 0, theta, { color: SECTOR, r: 30, label: `${fmt(toDeg(theta))}°`, square: false });
      g.point(O, { label: "O" });
    },

    readout(f) {
      const { r, theta, minor, sector, triangle, segment } = figure();
      // A region's area is linked to it while the figure shows it.
      const shaded = (id: string, alpha: number, tex: string): string => (alpha > SHOWN ? term(id, tex) : tex);
      const deg = toDeg(theta);
      return [
        { label: "Arc measure", tex: `\\theta = ${fmt(deg)}^\\circ = ${fmt(theta, 2)} \\text{ rad}` },
        { label: "Arc length", tex: `r\\theta = (${fmt(r, 2)})(${fmt(theta, 2)}) = ${fmt(r * theta, 2)}` },
        {
          label: "As a fraction of the circumference",
          tex: `\\tfrac{${fmt(deg)}^\\circ}{360^\\circ} \\cdot 2\\pi r = ${fmt((deg / 360) * TAU * r, 2)}`,
          tone: "good",
        },
        { label: "Sector", tex: `\\tfrac12 r^2\\theta = ${shaded("sector", sectorAlpha(f), fmt(sector, 2))}` },
        {
          label: "Triangle AOB",
          tex: `\\tfrac12 r^2 ${minor ? "\\sin\\theta" : "|\\sin\\theta|"} = ${shaded("triangle", f.at(3), fmt(triangle, 2))}`,
        },
        {
          label: minor ? "Segment = sector − triangle" : "Segment = sector + triangle",
          tex: `${fmt(sector, 2)} ${minor ? "-" : "+"} ${fmt(triangle, 2)} = ${shaded("segment", f.at(3), fmt(segment, 2))}`,
        },
      ];
    },
  };
});
