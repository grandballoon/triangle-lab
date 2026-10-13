// How a line can sit relative to a plane — in it, through it, or alongside it
// — what it means for the line to be perpendicular to the plane, how far a
// point is from a plane, and how two lines in space can miss each other
// without being parallel. One line, steered by three sliders, shows them all.

import { C, tint } from "../draw.ts";
import { fmt, toRad } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import { add3, dist3, label3, Orbit, p3, point3, polygon3, scale3, segment3 } from "../solid.ts";
import { dot3, rightAngle3 } from "../kit/solids.ts";

const PLANE_HALF = 4.6;
const REACH = 3; // how far the line is drawn either side of P
const SPOKE = 1.7;
const SPOKE_BEARINGS = [0, 60, 120];
const EPS = 1e-6;

const PLANE = C.blue;
const DROP = C.gold;
const SLANT = C.pink;
const OTHER = C.green;

export default lesson((s) => {
  const cam = s.orbit(new Orbit(0.5, 0.42, { x: 0, y: -0.2 }));
  const tilt = s.slider({
    label: "tilt",
    at: { x: -7.6, y: -4.3 },
    width: 3.4,
    min: 0,
    max: 90,
    value: 45,
    step: 15,
    format: (v) => `${v}°`,
  });
  const turn = s.slider({
    label: "turn",
    at: { x: -3.2, y: -4.3 },
    width: 3.4,
    min: 0,
    max: 180,
    value: 30,
    step: 15,
    format: (v) => `${v}°`,
  });
  const lift = s.slider({ label: "lift", at: { x: 1.2, y: -4.3 }, width: 3.4, min: 0, max: 1.2, value: 1, step: 0.2 });

  const preset = (label: string, t: number, l: number): void => {
    s.button(label, () => {
      tilt.value = t;
      lift.value = l;
    });
  };
  preset("In the plane", 0, 0);
  preset("Through it", 45, 1);
  preset("Parallel", 0, 1);
  preset("Perpendicular", 90, 1);

  // The line passes through P, held `lift` above the plane's centre O.
  const model = () => {
    const theta = toRad(tilt.value);
    const phi = toRad(turn.value);
    const h = lift.value;
    const d = p3(Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi));
    const P = p3(0, h, 0);
    const rises = d.y > EPS;
    // Where the line pierces the plane y = 0, when it does so at one point.
    const F = rises ? add3(P, scale3(d, -h / d.y)) : null;
    const inPlane = !rises && h < EPS;
    return { theta, h, d, P, F, inPlane };
  };

  // Against the fixed line m (the x-axis, in the plane).
  const twoLines = (): string => {
    const { d, h } = model();
    const sameDirection = Math.abs(d.y) < EPS && Math.abs(d.z) < EPS;
    if (sameDirection) return h < EPS ? "the same line" : "parallel";
    return Math.abs(h * d.z) < EPS ? "intersecting" : "skew";
  };

  return {
    steps: [
      {
        title: "A line and a plane",
        text: "Tilt, turn and lift the line, or press a chip. A line can lie in a plane, pierce it at exactly one point, or never touch it — then it is parallel to the plane. Drag empty space to look around.",
      },
      {
        title: "Perpendicular to a plane",
        text: "Three lines of the plane pass through the piercing point $F$. Our line is perpendicular to the plane only if it makes a right angle with every line through $F$. One right angle is not enough — raise the tilt to $90^\\circ$.",
      },
      {
        title: "From a point to a plane",
        text: "The distance from $P$ to the plane is the perpendicular segment $PH$. Any slanted route $PF$ is the hypotenuse of right triangle $PHF$, so it is longer.",
      },
      {
        title: "Two lines in space",
        text: "Line $m$ lies in the plane. Two lines that point the same way are parallel. Lines that point different ways and still never meet are skew — impossible on flat paper, common in space.",
      },
    ],

    draw(g, f) {
      const { h, d, P, F } = model();
      const O = p3(0, 0, 0);
      const corners = [
        p3(-PLANE_HALF, 0, PLANE_HALF),
        p3(PLANE_HALF, 0, PLANE_HALF),
        p3(PLANE_HALF, 0, -PLANE_HALF),
        p3(-PLANE_HALF, 0, -PLANE_HALF),
      ];
      // Whatever is under the plane is drawn first, so the sheet tints it.
      const below = F ? add3(F, scale3(d, -1)) : null;
      const seenFromAbove = cam.pitch > 0;
      const under = (): void => {
        if (F && below) segment3(g, cam, F, below, { color: tint(g.accent, 0.55), width: 4 });
      };
      if (seenFromAbove) under();
      polygon3(g, cam, corners, { fill: tint(PLANE, 0.13), stroke: tint(PLANE, 0.8), width: 2 });
      if (!seenFromAbove) under();

      if (f.at(3) > 0) {
        const m0 = p3(-PLANE_HALF + 0.4, 0, 0);
        const m1 = p3(PLANE_HALF - 0.4, 0, 0);
        segment3(g, cam, m0, m1, { color: OTHER, width: 4, alpha: f.at(3) });
        label3(g, cam, m1, "m", { color: OTHER, dy: 14, alpha: f.at(3) });
        if (twoLines() === "parallel") {
          g.chevrons(cam.project(m0), cam.project(m1), 1, { color: OTHER, alpha: f.at(3) });
          g.chevrons(cam.project(add3(P, scale3(d, -REACH))), cam.project(add3(P, scale3(d, REACH))), 1, {
            color: g.accent,
            alpha: f.at(3),
          });
        }
      }

      if (f.at(1) > 0 && F) {
        for (const bearing of SPOKE_BEARINGS) {
          const u = p3(Math.cos(toRad(bearing)), 0, Math.sin(toRad(bearing)));
          const end = add3(F, scale3(u, SPOKE));
          const angle = Math.acos(Math.min(1, Math.abs(dot3(d, u))));
          const right = Math.abs(angle - Math.PI / 2) < 1e-3;
          const color = right ? C.green : C.dim;
          segment3(g, cam, add3(F, scale3(u, -SPOKE)), end, { color, width: 2, alpha: f.at(1) });
          label3(g, cam, add3(F, scale3(u, SPOKE + 0.45)), `${fmt((angle * 180) / Math.PI, 0)}°`, {
            color: right ? C.green : C.ink,
            size: 13,
            alpha: f.at(1),
          });
          if (right) rightAngle3(g, cam, F, end, add3(F, d), { color: C.green, alpha: f.at(1) });
        }
      }

      // The part of the line on or above the plane.
      const from = F ?? add3(P, scale3(d, -REACH));
      segment3(g, cam, from, add3(P, scale3(d, REACH)), { color: g.accent, width: 4 });

      if (f.at(2) > 0 && h > EPS) {
        segment3(g, cam, P, O, { color: DROP, width: 4, alpha: f.at(2) });
        label3(g, cam, O, "H", { color: DROP, dx: -13, dy: -11, alpha: f.at(2) });
        if (F && dist3(F, O) > EPS) {
          segment3(g, cam, O, F, { color: C.dim, width: 2, dash: [6, 5], alpha: f.at(2) });
          segment3(g, cam, P, F, { color: SLANT, width: 5, alpha: f.at(2) });
          rightAngle3(g, cam, O, P, F, { color: DROP, alpha: f.at(2) }, 0.22);
        } else {
          rightAngle3(g, cam, O, P, p3(1, 0, 0), { color: DROP, alpha: f.at(2) }, 0.22);
        }
      }

      if (F) point3(g, cam, F, { color: C.ink, label: "F" });
      point3(g, cam, P, { color: g.accent, label: "P" });
      label3(g, cam, corners[2], "plane", { color: PLANE, size: 13, dx: -30, dy: -12 });
    },

    readout(f) {
      const { theta, h, F, inPlane } = model();
      const meets = inPlane
        ? "\\text{the line lies in the plane}"
        : F
          ? "\\text{they meet at one point, } F"
          : "\\text{parallel: they never meet}";
      const rows: Readout[] = [
        { label: "Line and plane", tex: meets, tone: "good" },
        { label: "Angle between them", tex: `${tilt.value}^\\circ` },
      ];
      if (f.step >= 1) {
        const perpendicular = tilt.value === 90;
        rows.push({
          label: "Perpendicular to the plane?",
          tex: perpendicular ? "\\text{yes: every angle at } F \\text{ is } 90^\\circ" : "\\text{no}",
          tone: perpendicular ? "good" : "plain",
        });
      }
      if (f.step >= 2) {
        rows.push({ label: "Distance from P to the plane", tex: `PH = ${fmt(h)}` });
        if (F && h > EPS) {
          rows.push({
            label: "Slanted route",
            tex: `PF = \\frac{PH}{\\sin ${tilt.value}^\\circ} = ${fmt(h / Math.sin(theta), 2)} \\ge PH`,
          });
        }
      }
      if (f.step >= 3) {
        const kind = twoLines();
        rows.push({
          label: "Our line and m",
          tex: `\\text{${kind}}`,
          tone: kind === "skew" ? "good" : "plain",
        });
      }
      return rows;
    },
  };
});
