// Solving two linear equations by substitution. A pair (x, y) solves both
// when it lies on both lines, at their crossing. Solving the first equation
// for x describes every point of the first line by its y alone; putting that
// into the second equation leaves one equation in one unknown, which a
// walker on the first line can satisfy by hand before the algebra does it.

import { C } from "../draw.ts";
import { clamp, fmt, project, type Vec } from "../geo.ts";
import { lineText, lineThrough, meet, texLine, type Line } from "../kit/algebra.ts";
import {
  clipLine,
  keepApart,
  lattice,
  pair,
  par,
  plane,
  settle,
  texPoint,
  texRatio,
  texSum,
} from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const FIRST = C.cyan;
const SECOND = C.orange;
const WALKER = C.ink;
const ANSWER = C.gold;

/**
 * The first equation solved for one variable: x when it has an x term, else
 * y. `other` is the variable left free.
 */
interface Isolated {
  solved: "x" | "y";
  other: "x" | "y";
  /** The solved variable as LaTeX in terms of the other. */
  tex: string;
}

function isolate(l: Line): Isolated {
  const [solved, other, k, m] = l.A !== 0 ? (["x", "y", l.A, l.B] as const) : (["y", "x", l.B, l.A] as const);
  // k·solved + m·other = C, so solved = (C − m·other) / k.
  const top = texSum([
    [l.C, ""],
    [-m, other],
  ]);
  return { solved, other, tex: `${solved} = ${k === 1 ? top : k === -1 ? `-(${top})` : `\\frac{${top}}{${fmt(k)}}`}` };
}

export default lesson((s) => {
  const P1 = s.point(3, 0, { color: FIRST });
  const Q1 = s.point(0, 3, { color: FIRST });
  const P2 = s.point(1, 0, { color: SECOND });
  const Q2 = s.point(4, 3, { color: SECOND });
  keepApart(P1, Q1, lattice);
  keepApart(P2, Q2, lattice);

  // T walks the first line, inside the visible part of it.
  const T = s.point(-1, 4, {
    label: "T",
    color: WALKER,
    constrain: (p): Vec => {
      const ends = clipLine(P1, Q1, 7, 4.4);
      if (!ends) return p;
      const q = project(p, P1, Q1);
      const [lo, hi] = [Math.min(ends[0].x, ends[1].x), Math.max(ends[0].x, ends[1].x)];
      if (hi - lo < 1e-9) return { x: P1.x, y: clamp(q.y, Math.min(ends[0].y, ends[1].y), Math.max(ends[0].y, ends[1].y)) };
      return project({ x: clamp(q.x, lo, hi), y: q.y }, P1, Q1);
    },
  });

  const first = (): Line => lineThrough(P1, Q1);
  const second = (): Line => lineThrough(P2, Q2);

  return {
    steps: [
      {
        title: "Both equations at once",
        text: "Each equation's solutions make a line; drag the dots to change either one. A pair $(x, y)$ that solves both must lie on both lines, so a system of two equations is solved where they cross.",
      },
      {
        title: "Solve one equation for x",
        text: "Rearrange the first equation to say what $x$ is in terms of $y$. Then every point of the first line is described by its $y$ alone: $T$ walks the first line, and its $x$ follows from its $y$.",
      },
      {
        title: "Substitute into the other",
        text: "Put that expression in place of $x$ in the second equation. What is left involves only $y$. Drag $T$ along the first line until the second equation holds: you have found the crossing by hand.",
      },
      {
        title: "Solve, then go back",
        text: "The substituted equation is linear in one unknown, so solve it as before. With $y$ known, the expression for $x$ from the first step gives $x$. (If the first equation has no $x$, solve it for $y$ instead.)",
      },
      {
        title: "Check in both",
        text: "Put the pair into both original equations. Make the lines parallel and the substitution ends in something false like $0 = 3$: no pair works.",
      },
    ],

    draw(g, f) {
      settle(T);
      T.hidden = f.step < 1;
      T.enabled = f.step >= 1;
      const l1 = first();
      const l2 = second();
      const meeting = meet(l1, l2);

      plane(g);
      g.line(P2, Q2, { color: SECOND });
      g.line(P1, Q1, { color: FIRST });
      if (f.step >= 1) {
        const holds = Math.abs(l2.A * T.x + l2.B * T.y - l2.C) < 0.05;
        g.label(T, pair(T, 2), { color: holds ? ANSWER : C.dim, size: 13, dx: 14, dy: 18, align: "left" });
      }
      if (f.at(3) > 0 && meeting.kind === "point") {
        g.point(meeting.at, { color: ANSWER, r: 8, alpha: f.at(3) });
        g.label(meeting.at, pair(meeting.at, 2), { color: ANSWER, size: 14, bold: true, dx: -14, dy: -20, align: "right", alpha: f.at(3) });
      }
      g.label({ x: -7.7, y: 4.5 }, `first: ${lineText(l1)}`, { color: FIRST, size: 17, bold: true, align: "left" });
      g.label({ x: -7.7, y: 3.9 }, `second: ${lineText(l2)}`, { color: SECOND, size: 17, bold: true, align: "left" });
    },

    readout(f) {
      const l1 = first();
      const l2 = second();
      const iso = isolate(l1);
      const meeting = meet(l1, l2);
      const system: Readout = { label: "The system", tex: `${texLine(l1)},\\quad ${texLine(l2)}` };
      if (f.step === 0) {
        return [
          system,
          meeting.kind === "point"
            ? { label: "Crossing", tex: texPoint(meeting.at, 2), tone: "good" }
            : { label: "Crossing", tex: meeting.kind === "none" ? "\\text{none: parallel}" : "\\text{the same line}", tone: "dim" },
        ];
      }

      const solvedRow: Readout = { label: `First, solved for ${iso.solved}`, tex: iso.tex };
      if (f.step === 1) return [system, solvedRow];

      // The second equation with the first's expression put in for iso.solved.
      const [cs, co] = iso.solved === "x" ? [l2.A, l2.B] : [l2.B, l2.A];
      const expr = iso.tex.slice(iso.tex.indexOf("=") + 2);
      const lead = cs === 1 ? "" : cs === -1 ? "-" : fmt(cs);
      const rest = co === 0 ? "" : ` ${co < 0 ? "-" : "+"} ${texSum([[Math.abs(co), iso.other]])}`;
      const substituted = `${lead}\\left(${expr}\\right)${rest} = ${fmt(l2.C)}`;
      const atT = l2.A * T.x + l2.B * T.y;
      const holds = Math.abs(atT - l2.C) < 0.05;
      const substitutedRow: Readout = { label: `Second, in ${iso.other} alone`, tex: substituted };
      if (f.step === 2) {
        return [
          solvedRow,
          substitutedRow,
          {
            label: holds ? "At T it holds" : "At T",
            tex: `${iso.other} = ${fmt(iso.other === "y" ? T.y : T.x, 2)}:\\quad ${fmt(atT, 2)} ${holds ? "=" : "\\ne"} ${fmt(l2.C)}`,
            tone: holds ? "good" : "plain",
          },
        ];
      }

      // Multiplying the substituted equation through by the first's
      // coefficient of iso.solved leaves det·other = rhs.
      const det = l1.A * l2.B - l2.A * l1.B;
      const [k, rhs] = iso.solved === "x" ? [det, l1.A * l2.C - l2.A * l1.C] : [-det, l1.B * l2.C - l2.B * l1.C];
      if (meeting.kind !== "point") {
        return [
          solvedRow,
          substitutedRow,
          meeting.kind === "same"
            ? { label: "The same line", tex: "0 = 0:\\ \\text{every point of the line works}", tone: "good" }
            : { label: "Parallel lines", tex: `0 = ${fmt(rhs)}:\\ \\text{no pair works}`, tone: "warn" },
        ];
      }
      const solvedOther: Readout = {
        label: `Solve for ${iso.other}`,
        tex: `${texSum([[k, iso.other]])} = ${fmt(rhs)} \\;\\Rightarrow\\; ${iso.other} = ${texRatio(rhs, k)}`,
      };
      const p = meeting.at;
      const back: Readout = {
        label: `Back for ${iso.solved}`,
        tex: `${iso.solved} = ${fmt(iso.solved === "x" ? p.x : p.y, 2)}`,
        tone: "good",
      };
      if (f.step === 3) return [solvedRow, substitutedRow, solvedOther, back];
      const check = (l: Line): string =>
        `${fmt(l.A)} \\cdot ${par(p.x, 2)} ${l.B < 0 ? "-" : "+"} ${fmt(Math.abs(l.B))} \\cdot ${par(p.y, 2)} = ${fmt(l.A * p.x + l.B * p.y, 2)}`;
      return [
        { label: "Solution", tex: texPoint(p, 2), tone: "good" },
        { label: "First equation", tex: check(l1), tone: "good" },
        { label: "Second equation", tex: check(l2), tone: "good" },
      ];
    },
  };
});
