// Solving two linear equations by elimination. Multiplying an equation by a
// number leaves its line alone, and adding two equations gives a third that
// every common solution still satisfies — so its line pivots about the
// crossing as the multipliers change. Choosing them so that y cancels leaves
// a vertical line, x = something, through the crossing. Parallel lines have
// no crossing, and there the same choice cancels everything: 0 = 3, or 0 = 0.

import { C } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { combine, lineText, lineThrough, meet, pointsOf, texLine, type Line } from "../kit/algebra.ts";
import { INSIDE, keepApart, lattice, pair, plane, texPoint, texRatio } from "../kit/coordinates.ts";
import { lesson, type Handle, type Readout } from "../scene.ts";

const FIRST = C.cyan;
const SECOND = C.orange;
const SUM = C.gold;
const RANGE = 14;

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Multipliers that cancel the coefficients p (first) and q (second): q·first − p·second. */
function cancelling(p: number, q: number): [number, number] {
  const k = gcd(p, q) || 1;
  return [q / k + 0, -p / k + 0];
}

const isInside = (v: Vec): boolean => {
  const q = INSIDE(v);
  return q.x === v.x && q.y === v.y;
};

/** Put a handle somewhere directly, past its constraint (the places chosen are already legal). */
const place = (h: Handle, v: Vec): void => {
  h.x = v.x;
  h.y = v.y;
};

// The system starts as 2x + 3y = −1 and 3x − 4y = 7, which cross at (1, −1).
export default lesson((s) => {
  const P1 = s.point(-2, 1, { color: FIRST });
  const Q1 = s.point(4, -3, { color: FIRST });
  const P2 = s.point(1, -1, { color: SECOND });
  const Q2 = s.point(5, 2, { color: SECOND });
  keepApart(P1, Q1, lattice);
  keepApart(P2, Q2, lattice);

  const k1 = s.slider({ label: "k₁ =", at: { x: -7.6, y: -4.3 }, width: 4, min: -RANGE, max: RANGE, value: 1, step: 1 });
  const k2 = s.slider({ label: "k₂ =", at: { x: -1.6, y: -4.3 }, width: 4, min: -RANGE, max: RANGE, value: 1, step: 1 });

  const first = (): Line => lineThrough(P1, Q1);
  const second = (): Line => lineThrough(P2, Q2);
  const sum = (): Line => combine(first(), k1.value, second(), k2.value);

  s.button("Cancel y", () => {
    [k1.value, k2.value] = cancelling(first().B, second().B);
  });
  s.button("Cancel x", () => {
    [k1.value, k2.value] = cancelling(first().A, second().A);
  });
  s.button("Make them parallel", () => {
    const g = gcd(Q1.x - P1.x, Q1.y - P1.y) || 1;
    const d = { x: (Q1.x - P1.x) / g, y: (Q1.y - P1.y) / g };
    const l1 = first();
    const offLine = (v: Vec): boolean => l1.A * v.x + l1.B * v.y !== l1.C;
    const start = [P2, { x: P2.x, y: P2.y + 1 }, { x: P2.x, y: P2.y - 1 }, { x: P2.x + 1, y: P2.y }, { x: P2.x - 1, y: P2.y }].find(
      (v) => isInside(v) && offLine(v),
    );
    if (!start) return;
    const end = [1, -1, 2, -2, 3, -3]
      .map((m) => ({ x: start.x + m * d.x, y: start.y + m * d.y }))
      .find(isInside);
    if (!end) return;
    place(P2, start);
    place(Q2, end);
  });
  s.button("Make them the same line", () => {
    const g = gcd(Q1.x - P1.x, Q1.y - P1.y) || 1;
    const d = { x: (Q1.x - P1.x) / g, y: (Q1.y - P1.y) / g };
    const ahead = { x: P1.x + d.x, y: P1.y + d.y };
    const behind = { x: P1.x - d.x, y: P1.y - d.y };
    const [a, b] = isInside(behind) ? [behind, ahead] : [P1, Q1];
    place(P2, a);
    place(Q2, b);
  });

  return {
    steps: [
      {
        title: "Scaling keeps the line",
        text: "Set $k_2 = 0$ and turn $k_1$. The gold equation is $k_1$ times the first, and its line is the first line again: multiplying both sides by the same nonzero number changes no solution.",
      },
      {
        title: "Adding keeps the crossing",
        text: "Now turn both. The gold equation is $k_1$ times the first plus $k_2$ times the second. A point on both lines satisfies both, so it satisfies their sum too: the gold line pivots about the crossing.",
      },
      {
        title: "Cancel a variable",
        text: "Multiply the first equation by the second's $y$ coefficient, and the second by minus the first's. Press “Cancel y”: the $y$ terms cancel, the gold line stands upright, and its equation is $x = $ the crossing's $x$.",
      },
      {
        title: "Then the other",
        text: "Put that $x$ back into either equation to find $y$, or press “Cancel x” to make the gold line lie flat through the crossing at its height. Either way, check the pair in both equations.",
      },
      {
        title: "Parallel: 0 = 3",
        text: "Press “Make them parallel”, then “Cancel y”. Now $x$ cancels too, and the sum reads $0 = $ some other number. No point satisfies that, so the gold line is gone: the system has no solution.",
      },
      {
        title: "The same line: 0 = 0",
        text: "Press “Make them the same line”, then cancel again. Everything cancels and the sum reads $0 = 0$, true for every point. The two equations say the same thing, and every point of the line solves both.",
      },
    ],

    draw(g) {
      const l1 = first();
      const l2 = second();
      const total = sum();
      const meeting = meet(l1, l2);

      plane(g);
      g.line(P2, Q2, { color: SECOND });
      g.line(P1, Q1, { color: FIRST });
      const ends = pointsOf(total);
      if (ends) g.line(ends[0], ends[1], { color: SUM, width: 4, dash: [10, 7] });
      if (meeting.kind === "point") {
        g.point(meeting.at, { color: SUM, r: 7 });
        g.label(meeting.at, pair(meeting.at, 2), { color: SUM, size: 14, dx: 14, dy: 20, align: "left" });
      }

      g.label({ x: -7.7, y: 4.5 }, `first: ${lineText(l1)}`, { color: FIRST, size: 17, bold: true, align: "left" });
      g.label({ x: -7.7, y: 3.9 }, `second: ${lineText(l2)}`, { color: SECOND, size: 17, bold: true, align: "left" });
      const sumText = ends ? lineText(total) : `0 = ${fmt(total.C)}`.replace("-", "−");
      g.label({ x: -7.7, y: 3.3 }, `${k1.value}·first + ${k2.value}·second: ${sumText}`.replace(/-/g, "−"), {
        color: SUM,
        size: 15,
        align: "left",
      });
    },

    readout(f) {
      const l1 = first();
      const l2 = second();
      const total = sum();
      const meeting = meet(l1, l2);
      const scaled = (k: number, l: Line): string => `${fmt(k)}\\,(${texLine(l)})`;
      const rows: Readout[] = [
        { label: "k₁ × first", tex: scaled(k1.value, l1) },
        { label: "k₂ × second", tex: scaled(k2.value, l2) },
      ];
      const nothing = total.A === 0 && total.B === 0;
      rows.push(
        nothing
          ? total.C === 0
            ? { label: "Sum: everything cancels", tex: "0 = 0:\\ \\text{true for every point}", tone: "good" }
            : { label: "Sum: everything cancels", tex: `0 = ${fmt(total.C)}:\\ \\text{true for no point}`, tone: "warn" }
          : { label: "Sum", tex: texLine(total) },
      );
      if (f.step >= 2 && !nothing && (total.A === 0 || total.B === 0)) {
        const [v, k] = total.B === 0 ? ["x", total.A] : ["y", total.B];
        rows.push({ label: `${v === "x" ? "y" : "x"} cancelled`, tex: `${v} = ${texRatio(total.C, k)}`, tone: "good" });
      }
      rows.push(
        meeting.kind === "point"
          ? { label: "Crossing", tex: texPoint(meeting.at, 2), tone: f.step >= 1 ? "good" : "plain" }
          : { label: "Crossing", tex: meeting.kind === "none" ? "\\text{none: parallel}" : "\\text{the whole line}", tone: "dim" },
      );
      return rows;
    },

    uses: [
      {
        title: "Two receipts",
        text: "Three coffees and two muffins cost 16; one coffee and two muffins cost 9. Subtract the second receipt from the first and the muffins cancel: two coffees cost 7. So a coffee is 3.50, and putting that back in, a muffin is 2.75.",
      },
      {
        title: "A fix from two bearings",
        text: "A sailor takes compass bearings on a lighthouse and a church spire and draws a line on the chart through each, along its bearing. The boat is on both lines, so it is where they cross. Landmarks in nearly the same direction give nearly parallel lines and a poor fix, so navigators pick ones far apart in bearing.",
      },
      {
        title: "A receipt that tells you nothing new",
        text: "Suppose the second receipt had been six coffees and four muffins for 32: the first one doubled. Eliminating then leaves $0 = 0$. Endless pairs of prices fit both, and only a genuinely different purchase can pin them down.",
      },
    ],
  };
});
