// The angle bisector: a knob D slides along the base AB, and the segment CD
// splits the angle at C in two. Where the two parts are equal D locks, and
// holds on firmly, and CD is the bisector of the angle at C. Then the edge
// case: in an isosceles triangle, the bisector of the apex angle meets the
// base square on, at its midpoint.

import { C as COLOR } from "../draw.ts";
import { angleAt, dist, fmt, lerp } from "../geo.ts";
import { degTex } from "../kit/circle-angles.ts";
import { baseKnob, CAPTION_AT, overMidpoint, stageTriangle } from "../kit/triangle-stage.ts";
import { lesson, type Readout } from "../scene.ts";

const TERMS = ["angle bisector", "isosceles apex"] as const;

const CAPTION: Record<(typeof TERMS)[number], string> = {
  "angle bisector": "Angle bisector: a line that splits an angle into two equal angles.",
  "isosceles apex": "Isosceles: the apex angle's bisector meets the base at right angles, at its midpoint.",
};

export default lesson((s) => {
  const term = s.terms("Term", TERMS);
  const isosceles = (): boolean => term.value === "isosceles apex";
  const t = stageTriangle(s, (p, base) => (isosceles() ? overMidpoint(p, base) : p));
  // Where the bisector from C lands: it cuts AB in the ratio CA : CB.
  const foot = () => lerp(t.A, t.B, dist(t.C, t.A) / (dist(t.C, t.A) + dist(t.C, t.B)));
  const D = baseKnob(s, t, foot, 0.3, 1.2, 0.2);

  const settle = (): void => {
    t.C.set(t.C);
    D.follow();
  };

  return {
    steps: [
      {
        title: "Split the angle in half",
        text: "Slide the knob $D$ along $AB$. The segment $CD$ splits the angle at $C$ into two parts, coloured differently while they differ. Where they are equal, $D$ locks, and $CD$ is the angle bisector: it cuts the angle at $C$ exactly in half. Drag the corners and it stays locked.",
      },
      {
        title: "From the apex of an isosceles triangle",
        text: "Now $C$ is held over the middle of $AB$, so $CA = CB$ and the triangle is isosceles. Lock $D$ on the bisector again. The bisector of the apex angle meets the base at a right angle, and lands on its midpoint, so $AD = DB$.",
      },
    ],

    likes: [
      {
        title: "Halving a slice of pie",
        text: "To share a slice of pie, cut it from the tip so both pieces have the same angle at the point. That cut is the angle bisector. The comparison stops at the crust: if the slice is lopsided, with one straight edge longer than the other, the two pieces get the same angle but not the same amount of pie.",
      },
      {
        title: "Walking out of a room's corner",
        text: "Stand in the corner of a room and walk out so that you always stay as far from one wall as from the other. Your path is the angle bisector of the corner. Every point on it is the same distance from both walls, and every point off it is closer to one wall.",
      },
    ],

    uses: [
      {
        title: "Mitring a picture frame",
        text: "Each corner of a picture frame is $90^\\circ$, and the two pieces of moulding meet along the corner's bisector, each cut at $45^\\circ$. Cutting both at half the corner angle makes their ends exactly the same length, so the decorative profile lines up all the way round the joint.",
      },
      {
        title: "Where a goalkeeper stands",
        text: "Goalkeepers in football and hockey are coached to stand on the line that bisects the angle between the ball and the two goalposts. From the ball's point of view, the keeper then covers the same angle of goal on each side, leaving no easier side to shoot at.",
      },
    ],

    draw(g) {
      settle();
      const { A, B, C } = t;
      const at = D.knob;
      const locked = D.locked();
      const hot = g.accent;
      g.polygon([A, B, C], { color: COLOR.dim, width: 2.5, fill: "rgba(255, 255, 255, 0.04)" });
      g.angle(A, C, at, { color: locked ? hot : COLOR.blue, r: 40, fill: true, square: false });
      g.angle(at, C, B, { color: locked ? hot : COLOR.orange, r: locked ? 40 : 46, fill: true, square: false });
      g.segment(C, at, locked ? { color: hot, width: 4 } : { color: COLOR.ink, width: 2.5 });
      g.label(at, "D", { color: locked ? hot : COLOR.ink, dy: -20 });
      if (isosceles()) {
        g.ticks(C, A, 2, { color: COLOR.dim });
        g.ticks(C, B, 2, { color: COLOR.dim });
        if (locked) {
          g.ticks(A, at, 1, { color: hot });
          g.ticks(at, B, 1, { color: hot });
          g.angle(C, at, B, { color: hot, r: 18 });
        }
      }
      g.label(CAPTION_AT, CAPTION[term.value], { size: 16 });
    },

    readout() {
      settle();
      const { A, B, C } = t;
      const at = D.knob;
      const tone = D.locked() ? "good" : "dim";
      const rows: Readout[] = [{ label: "The two parts of the angle at C", tex: `\\angle ACD = ${degTex(angleAt(A, C, at))},\\ \\angle DCB = ${degTex(angleAt(at, C, B))}`, tone }];
      if (isosceles()) {
        rows.push({ label: "Where the bisector meets the base", tex: `\\angle CDB = ${degTex(angleAt(C, at, B))}`, tone });
        rows.push({ label: "Halves of the base", tex: `AD = ${fmt(dist(A, at), 2)},\\ DB = ${fmt(dist(at, B), 2)}`, tone });
      }
      return rows;
    },
  };
});
