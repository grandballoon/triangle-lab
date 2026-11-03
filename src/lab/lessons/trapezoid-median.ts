// The median of a trapezoid — the segment joining the midpoints of its legs —
// is parallel to the bases and as long as their average. The proof drops the
// two altitudes from the top base: they cut the median into a piece equal to
// the top base and two pieces that are half-scale copies of the overhangs.
// Turning the corners below the median up about its ends then shows the area
// is median × height.

import { C, tint } from "../draw.ts";
import { clamp, dist, fmt, mid, polygonArea, rotateAbout, vec } from "../geo.ts";
import { GLASS } from "../kit/quadrilaterals.ts";
import { lesson } from "../scene.ts";

const BASE_Y = -3.2;
const TOP_MIN = -0.6;
const TOP_MAX = 3.6;
const LEFT = -7.2;
const RIGHT = 7.2;
// The top base stays above the bottom one with at least this much overhang on
// each side, so both altitudes land inside the bottom base as the proof draws them.
const OVERHANG = 0.7;
const MIN_TOP = 1.6;

const BASE = C.blue;
const LEFT_PIECE = C.gold;
const MIDDLE_PIECE = C.green;
const RIGHT_PIECE = C.orange;
const MOVED = C.pink;

export default lesson((s) => {
  const D = s.point(-6.2, BASE_Y, { label: "D" });
  const Cc = s.point(6.6, BASE_Y, { label: "C" });
  const A = s.point(-3.2, 2.2, { label: "A" });
  const B = s.point(1.8, 2.2, { label: "B" });

  D.constrain = (p) => vec(clamp(p.x, LEFT, A.x - OVERHANG), BASE_Y);
  Cc.constrain = (p) => vec(clamp(p.x, B.x + OVERHANG, RIGHT), BASE_Y);
  // A and B share the top base, so lifting either one lifts the other with it.
  A.constrain = (p) => {
    B.y = clamp(p.y, TOP_MIN, TOP_MAX);
    return vec(clamp(p.x, D.x + OVERHANG, B.x - MIN_TOP), B.y);
  };
  B.constrain = (p) => {
    A.y = clamp(p.y, TOP_MIN, TOP_MAX);
    return vec(clamp(p.x, A.x + MIN_TOP, Cc.x - OVERHANG), A.y);
  };

  const measure = () => {
    const X = mid(A, D);
    const Y = mid(B, Cc);
    return {
      X,
      Y,
      E: vec(A.x, BASE_Y),
      F: vec(B.x, BASE_Y),
      W: vec(A.x, X.y),
      Z: vec(B.x, X.y),
      top: dist(A, B),
      bottom: dist(D, Cc),
      median: dist(X, Y),
      height: A.y - BASE_Y,
    };
  };

  return {
    steps: [
      {
        title: "The median of a trapezoid",
        text: "$X$ and $Y$ are the midpoints of the legs; $XY$ is the median. Drag the corners and compare the median's length with the average of the two bases in the panel.",
      },
      {
        title: "Parallel to the bases",
        text: "$X$ is halfway along $AD$, so it is half the trapezoid's height above $DC$. So is $Y$. Two points at the same height above $DC$ lie on a line parallel to it: $XY \\parallel DC \\parallel AB$.",
      },
      {
        title: "Drop two altitudes",
        text: "Draw $AE$ and $BF$ perpendicular to $DC$, crossing the median at $W$ and $Z$. Then $ABZW$ and $WZFE$ are rectangles, so $WZ = AB = EF$.",
      },
      {
        title: "Half-scale triangles",
        text: "$XW \\parallel DE$, so $\\triangle AXW \\sim \\triangle ADE$, and $AX$ is half of $AD$: the scale is $\\tfrac12$ and $XW = \\tfrac12 DE$. In the same way $ZY = \\tfrac12 FC$.",
      },
      {
        title: "Add the pieces",
        text: "$XY = XW + WZ + ZY = \\tfrac12 DE + AB + \\tfrac12 FC$. Since $DC = DE + AB + FC$, this is exactly $\\tfrac12(AB + DC)$: the average of the bases.",
      },
      {
        title: "Area is median times height",
        text: "Cut straight down from $X$ and $Y$ and turn each corner half a turn about its midpoint. It fills the gap above, leaving a rectangle as wide as the median and as tall as the trapezoid: area $= XY \\cdot h$.",
      },
    ],

    likes: [
      {
        title: "A ladder that narrows to the top",
        text: "Picture a ladder whose sides lean in evenly, $50$ cm apart at the foot and $30$ cm apart at the top. The rungs are all parallel to the top and bottom, and the rung halfway up is exactly $40$ cm wide, the average of the two ends: going up, the width shrinks by the same amount for every step, so halfway up it has lost half the difference. The sides of the ladder are the legs, the top and bottom rungs are the bases, and the middle rung is the median.",
      },
      {
        title: "Levelling a sloping trough of sand",
        text: "Seen from the side, sand in a trough that slopes evenly from $10$ cm deep at one end to $30$ cm at the other is a trapezoid whose parallel sides are the two ends. Rake it level and the sand from the deep half fills the shallow half exactly, leaving it $20$ cm deep everywhere, the depth it had in the middle. That is the last step: the area is the trough's length times the median.",
      },
    ],

    uses: [
      {
        title: "Digging a ditch",
        text: "A drainage ditch is often dug with sloping sides, say $1.2$ m wide at the top, $0.6$ m wide at the bottom and $1$ m deep. Its cross-section is a trapezoid of area $\\tfrac12(1.2 + 0.6) \\cdot 1 = 0.9$ square metres, so each metre of ditch means $0.9$ cubic metres of soil to dig out and carry away.",
      },
      {
        title: "Tiling a hipped roof",
        text: "On a hipped roof the two long faces are trapezoids: the eaves along the bottom, the ridge along the top. If the eaves are $10$ m long, the ridge $6$ m and the slope from eaves to ridge $4$ m, a roofer orders tiles for $\\tfrac12(10 + 6) \\cdot 4 = 32$ square metres on each face, before adding a margin for cuts.",
      },
      {
        title: "Measuring an irregular plot",
        text: "To find the area of land along a curving stream, surveyors run a straight baseline and measure how far the stream is from it at regular intervals. Each strip between two measurements is close to a trapezoid, so a strip $10$ m wide with offsets of $6$ m and $8$ m counts as $10 \\cdot \\tfrac12(6 + 8) = 70$ square metres. This is called the trapezoidal rule.",
      },
    ],

    draw(g, f) {
      const { X, Y, E, F, W, Z } = measure();
      const proof = 1 - f.at(5);

      g.polygon([D, Cc, B, A], { fill: GLASS, color: C.dim, width: 2 });
      g.segment(A, B, { color: BASE });
      g.segment(D, Cc, { color: BASE });
      g.chevrons(A, B, 1, { color: BASE });
      g.chevrons(D, Cc, 1, { color: BASE });
      g.ticks(A, X, 1);
      g.ticks(X, D, 1);
      g.ticks(B, Y, 2);
      g.ticks(Y, Cc, 2);

      // Step 1: both midpoints stand half the height above the bottom base.
      const drop = f.at(1) * (1 - f.at(2));
      if (drop > 0) {
        for (const M of [X, Y]) {
          const foot = vec(M.x, BASE_Y);
          g.segment(M, foot, { color: C.dim, width: 2, dash: [5, 5], alpha: drop });
          g.angle(M, foot, Cc, { color: C.dim, r: 14, width: 2, alpha: drop });
          g.along(M, foot, "½h", { color: C.dim, alpha: drop, offset: -20 });
        }
      }

      if (f.at(2) > 0) {
        const a = f.at(2) * proof;
        g.polygon([A, B, Z, W], { fill: tint(MIDDLE_PIECE, 0.12), stroke: null, alpha: a });
        g.polygon([W, Z, F, E], { fill: tint(MIDDLE_PIECE, 0.12), stroke: null, alpha: a });
        g.segment(A, E, { color: C.ink, width: 2, dash: [6, 5], alpha: a });
        g.segment(B, F, { color: C.ink, width: 2, dash: [6, 5], alpha: a });
        g.angle(A, E, Cc, { r: 14, width: 2, alpha: a });
        g.angle(B, F, Cc, { r: 14, width: 2, alpha: a });
        g.angle(A, W, Z, { r: 14, width: 2, alpha: a });
        g.angle(B, Z, Y, { r: 14, width: 2, alpha: a });
        for (const [p, name] of [[E, "E"], [F, "F"]] as const) {
          g.point(p, { alpha: a });
          g.label(p, name, { dy: -18, alpha: a });
        }
        for (const [p, name, dx] of [[W, "W", 14], [Z, "Z", -14]] as const) {
          g.point(p, { alpha: a });
          g.label(p, name, { dx, dy: 14, alpha: a });
        }
      }

      if (f.at(3) > 0) {
        const a = f.at(3) * proof;
        g.polygon([A, D, E], { fill: tint(LEFT_PIECE, 0.12), stroke: null, alpha: a });
        g.polygon([A, X, W], { fill: tint(LEFT_PIECE, 0.3), stroke: null, alpha: a });
        g.polygon([B, F, Cc], { fill: tint(RIGHT_PIECE, 0.12), stroke: null, alpha: a });
        g.polygon([B, Z, Y], { fill: tint(RIGHT_PIECE, 0.3), stroke: null, alpha: a });
      }

      if (f.at(4) > 0) {
        const a = f.at(4) * proof;
        const piece = { width: 6, alpha: a };
        g.segment(D, E, { ...piece, color: LEFT_PIECE });
        g.segment(E, F, { ...piece, color: MIDDLE_PIECE });
        g.segment(F, Cc, { ...piece, color: RIGHT_PIECE });
        g.segment(X, W, { ...piece, color: LEFT_PIECE });
        g.segment(W, Z, { ...piece, color: MIDDLE_PIECE });
        g.segment(Z, Y, { ...piece, color: RIGHT_PIECE });
        g.segment(A, B, { ...piece, color: MIDDLE_PIECE });
      }

      if (f.at(5) > 0) {
        const a = f.at(5);
        const turn = Math.PI * a;
        // The corner below the median outside X, turned about X, lands on the
        // matching gap above it (X is the midpoint of AD); likewise at Y.
        for (const [M, corner] of [[X, D], [Y, Cc]] as const) {
          const foot = vec(M.x, BASE_Y);
          g.polygon([corner, foot, M], { stroke: C.dim, width: 1.5, dash: [4, 4], alpha: a });
          g.polygon(
            [corner, foot, M].map((p) => rotateAbout(p, M, turn)),
            { fill: tint(MOVED, 0.3), stroke: MOVED, width: 2, alpha: a },
          );
        }
        g.polygon([vec(X.x, BASE_Y), vec(Y.x, BASE_Y), vec(Y.x, A.y), vec(X.x, A.y)], {
          fill: tint(g.accent, 0.1),
          stroke: g.accent,
          width: 2.5,
          alpha: a,
        });
        g.along(vec(Y.x, BASE_Y), vec(Y.x, A.y), "h", { color: g.accent, alpha: a, offset: -16 });
      }

      g.segment(X, Y, { color: g.accent, width: 4 });
      if (f.at(1) > 0) g.chevrons(X, Y, 1, { color: g.accent, alpha: f.at(1) });
      g.point(X, { color: g.accent });
      g.label(X, "X", { color: g.accent, dx: -16, dy: 12, bold: true });
      g.point(Y, { color: g.accent });
      g.label(Y, "Y", { color: g.accent, dx: 16, dy: 12, bold: true });
    },

    readout() {
      const m = measure();
      const average = (m.top + m.bottom) / 2;
      return [
        { label: "Bases", tex: `AB = ${fmt(m.top)},\\quad DC = ${fmt(m.bottom)}` },
        {
          label: "Their average",
          tex: `\\tfrac12(${fmt(m.top)} + ${fmt(m.bottom)}) = ${fmt(average, 2)}`,
        },
        { label: "Median, measured", tex: `XY = ${fmt(m.median, 2)}`, tone: "good" },
        { label: "Height", tex: `h = ${fmt(m.height)}` },
        {
          label: "Median × height",
          tex: `XY \\cdot h = ${fmt(m.median, 2)} \\cdot ${fmt(m.height)} = ${fmt(m.median * m.height)}`,
        },
        {
          label: "Area, measured",
          tex: `[ABCD] = ${fmt(polygonArea([D, Cc, B, A]))}`,
          tone: "good",
        },
      ];
    },
  };
});
