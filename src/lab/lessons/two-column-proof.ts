// Writing a proof. The vertical angles theorem is set out the way a proof is
// written: what is given, what is to be proved, then numbered statements each
// with a reason. The formula panel is the proof itself, built up a line per
// step, with the reason as each line's label; the figure lights the angles and
// the straight line each statement is about. The last step adds the measured
// angles and says why they are a check, not a reason.

import { C } from "../draw.ts";
import { angleAt, angleOf, fmt, onCircle, sub, toDeg, vec } from "../geo.ts";
import { onCircleClearOf } from "../kit/circles.ts";
import { lesson, type Readout } from "../scene.ts";
import beamCalculationSheetImage from "../../images/beam-calculation-sheet.svg";
import programAssertionsImage from "../../images/program-assertions.svg";

const O = vec(0, 0);
const REACH = 3.4;
const MIN_ANGLE = 0.35; // radians kept between the two lines
const GOAL = C.gold; // ∠AOB and ∠COD, the two angles the proof is about
const MIDDLE = C.blue; // ∠BOC, the neighbour both are measured against
const LINE_AC = C.green;
const LINE_BD = C.violet;

export default lesson((s) => {
  const A = s.point(-3.1, 1.4, { label: "A", color: LINE_AC, constrain: onCircle(O, REACH) });
  const B = s.point(1.0, 3.25, {
    label: "B",
    color: LINE_BD,
    constrain: onCircleClearOf(
      O,
      () => REACH,
      () => [angleOf(sub(A, O)), angleOf(sub(O, A))],
      MIN_ANGLE,
    ),
  });

  const figure = () => {
    B.set(B); // A may have swung onto B's line
    const Cp = sub(O, sub(A, O));
    const D = sub(O, sub(B, O));
    return {
      Cp,
      D,
      aob: toDeg(angleAt(A, O, B)),
      boc: toDeg(angleAt(B, O, Cp)),
      cod: toDeg(angleAt(Cp, O, D)),
    };
  };

  return {
    steps: [
      {
        title: "Given, and what to prove",
        text: "A proof starts by writing down what we are told and what we must show. Given: $AC$ and $BD$ are straight lines crossing at $O$. Prove: $\\angle AOB = \\angle COD$. Drag $A$ or $B$: the proof has to work for every crossing, not just the one drawn.",
      },
      {
        title: "A statement and its reason",
        text: "The proof is a list of statements, each with a reason beside it. A reason must be a given, a definition, or a result already proved. Statement 1: $\\angle AOB + \\angle BOC = 180^\\circ$, because $AOC$ is a straight line and angles that fill one side of a line add to $180^\\circ$.",
      },
      {
        title: "Use the other given",
        text: "Statement 2: $\\angle BOC + \\angle COD = 180^\\circ$, for the same reason, now on the straight line $BOD$. Each given gets used, and each statement says which one it rests on.",
      },
      {
        title: "Chain to the goal",
        text: "Statement 3: $\\angle AOB + \\angle BOC = \\angle BOC + \\angle COD$, since both sides equal $180^\\circ$ by statements 1 and 2. Statement 4: $\\angle AOB = \\angle COD$, by taking $\\angle BOC$ from both sides. The last statement is the goal, so the proof is finished.",
      },
      {
        title: "Measuring is not a reason",
        text: "The measured angles agree, but a protractor checks one figure, and only as finely as it can be read. The four reasons hold for every pair of crossing lines at once. That is why each line needs a reason, and why “it looks equal” is never one.",
      },
    ],

    likes: [
      {
        title: "Making a case in court",
        text: "A prosecutor cannot just say the accused did it. Each claim (they were in town, they had a key, the door was not forced) must rest on a piece of evidence or on a claim already established, and the jury checks every link. A proof puts the same burden on a statement: no reason, no step.",
      },
      {
        title: "An expense claim with receipts",
        text: "An expense claim lists amounts down one side and the receipt for each down the other, and the total at the bottom is only accepted if every line above it has its receipt. A two-column proof is the same form: statements down one side, the reason for each down the other, and the goal at the bottom.",
      },
    ],

    uses: [
      {
        title: "A beam calculation for a building",
        text: "Before a beam goes into a building, an engineer writes a calculation: the loads and sizes given, the check required, then line after line, each with the formula or the clause of the building code it comes from. A checker, or the building inspector, can then follow every line without redoing the design, and a wrong line is easy to find.",
        tags: ["building"],
        image: {
          src: beamCalculationSheetImage,
          caption: "A beam calculation is set out like a proof: given values, the check required, and each line with its reason, ending in the result.",
          alt: "A calculation sheet in two columns, with given loads at the top, numbered lines of working on the left, the formula or code clause for each on the right, and the final line, beam is adequate, marked in gold.",
        },
      },
      {
        title: "Checking that a program is right",
        text: "Software that flies aircraft or runs medical devices is often checked by writing, beside each line of code, what is true at that point and why the line keeps it true. The first comment is the given, the last is what the program must achieve, and each one in between has to follow from the one before.",
        tags: ["computing"],
        image: {
          src: programAssertionsImage,
          caption: "A short loop with a claim beside each line: every claim follows from the one before, so the last one, the goal, is proved.",
          alt: "A few lines of code that add up a list, each with a comment on the right stating what is true there; the last comment, total is the sum of the list, is in gold.",
        },
      },
    ],

    draw(g, f) {
      const { Cp, D } = figure();
      const exploring = f.step === 0;
      const measured = f.step === 0 || f.step === 4;
      const show = (n: number): number => (exploring ? 1 : f.at(n));

      g.line(A, Cp, { color: C.ink });
      g.line(B, D, { color: C.ink });
      // Statement 1 is about line AOC, statement 2 about line BOD.
      if (f.step === 1 || f.step === 3) g.segment(A, Cp, { color: LINE_AC, width: 5, alpha: f.step === 1 ? f.at(1) : 0.5 });
      if (f.step === 2 || f.step === 3) g.segment(B, D, { color: LINE_BD, width: 5, alpha: f.step === 2 ? f.at(2) : 0.5 });

      const label = (text: string): string | boolean => (measured ? true : text);
      g.angle(A, O, B, { color: GOAL, fill: true, r: 44, arcs: 2, label: label("∠AOB"), alpha: f.step === 2 ? 0.35 : 1 });
      g.angle(B, O, Cp, { color: MIDDLE, fill: true, r: 40, label: label("∠BOC"), alpha: show(1) });
      g.angle(Cp, O, D, { color: GOAL, fill: true, r: 44, arcs: 2, label: label("∠COD"), alpha: f.step === 1 ? 0.35 : 1 });

      g.point(Cp, { label: "C", color: LINE_AC });
      g.point(D, { label: "D", color: LINE_BD });
      g.point(O, { label: "O" });
    },

    readout(f) {
      const { aob, boc, cod } = figure();
      const rows: Readout[] = [
        { label: "Given", tex: "AC \\text{ and } BD \\text{ are straight lines crossing at } O" },
        { label: "Prove", tex: "\\angle AOB = \\angle COD" },
      ];
      if (f.step >= 1) {
        rows.push({ label: "Reason: AOC is a straight line (given)", tex: "1.\\;\\; \\angle AOB + \\angle BOC = 180^\\circ" });
      }
      if (f.step >= 2) {
        rows.push({ label: "Reason: BOD is a straight line (given)", tex: "2.\\;\\; \\angle BOC + \\angle COD = 180^\\circ" });
      }
      if (f.step >= 3) {
        rows.push({ label: "Reason: both equal 180° (1 and 2)", tex: "3.\\;\\; \\angle AOB + \\angle BOC = \\angle BOC + \\angle COD" });
        rows.push({ label: "Reason: take ∠BOC from both sides of 3", tex: "4.\\;\\; \\angle AOB = \\angle COD \\quad \\blacksquare", tone: "good" });
      }
      if (f.step === 0 || f.step === 4) {
        rows.push({
          label: "A check on this figure, not a reason",
          tex: `\\angle AOB = ${fmt(aob)}^\\circ,\\;\\; \\angle BOC = ${fmt(boc)}^\\circ,\\;\\; \\angle COD = ${fmt(cod)}^\\circ`,
          tone: "dim",
        });
      }
      return rows;
    },
  };
});
