// Statements, converses and contrapositives. "If P, then Q" draws as the
// set where P holds sitting inside the set where Q holds. The converse swaps
// them and may be false; the contrapositive, "if not Q, then not P", is true
// exactly when the statement is. When a statement and its converse both
// hold, P and Q are the same condition: P if and only if Q.

import { C, tint } from "../draw.ts";
import type { Vec } from "../geo.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import batteryCarStartImage from "../../images/battery-car-start.svg";
import screeningTestConverseImage from "../../images/screening-test-converse.svg";

const P = C.cyan;
const Q = C.violet;
const OUT = C.dim;
const PICK = C.gold;
const BAD = C.red;

const QC: Vec = { x: -4, y: 0.8 };
const QR = 2.7;
const PC: Vec = { x: -4.85, y: 0.8 };
const PR = 1.3;

/** Where each number from 1 to 20 sits: multiples of 4 in P, other evens in Q, odds outside. */
const SPOT: Record<number, Vec> = {};
{
  const inP: Vec[] = [
    { x: -5.4, y: 1.3 },
    { x: -4.3, y: 1.3 },
    { x: -4.85, y: 0.8 },
    { x: -5.4, y: 0.3 },
    { x: -4.3, y: 0.3 },
  ];
  const inQ: Vec[] = [
    { x: -2.9, y: 2.0 },
    { x: -2.0, y: 1.3 },
    { x: -2.9, y: 0.8 },
    { x: -2.0, y: 0.2 },
    { x: -2.9, y: -0.4 },
  ];
  const xs = [-7.0, -5.5, -4.0, -2.5, -1.0];
  const outside: Vec[] = [...xs.map((x) => ({ x, y: 4.1 })), ...xs.map((x) => ({ x, y: -2.35 }))];
  for (let v = 1; v <= 20; v++) {
    SPOT[v] = v % 4 === 0 ? inP[v / 4 - 1] : v % 2 === 0 ? inQ[(v - 2) / 4] : outside[(v - 1) / 2];
  }
}

const ROWS: [boolean, boolean][] = [
  [true, true],
  [true, false],
  [false, true],
  [false, false],
];
const COLUMNS: { head: string; value: (p: boolean, q: boolean) => boolean; step: number }[] = [
  { head: "P", value: (p) => p, step: 0 },
  { head: "Q", value: (_, q) => q, step: 0 },
  { head: "P ⇒ Q", value: (p, q) => !p || q, step: 0 },
  { head: "Q ⇒ P", value: (p, q) => !q || p, step: 1 },
  { head: "¬Q ⇒ ¬P", value: (p, q) => q || !p, step: 2 },
  { head: "P ⇔ Q", value: (p, q) => p === q, step: 3 },
];

const tf = (b: boolean): string => (b ? "T" : "F");

export default lesson((s) => {
  const n = s.slider({ label: "n =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 20, value: 6, step: 1 });

  return {
    steps: [
      {
        title: "If P, then Q",
        text: "Take the statement: if $n$ is a multiple of 4, then $n$ is even. Call the first part $P$ and the second $Q$, and write $P \\Rightarrow Q$. As a picture, the numbers where $P$ holds sit inside the numbers where $Q$ holds. The statement is false only when $P$ is true and $Q$ false, and no number lands there.",
      },
      {
        title: "The converse",
        text: "Swap the parts: if $n$ is even, then $n$ is a multiple of 4. This is the converse, $Q \\Rightarrow P$, and it is false: 6 is even but not a multiple of 4. A true statement can have a false converse, and its truth table column differs, so proving a statement never proves its converse.",
      },
      {
        title: "The contrapositive",
        text: "Swap the parts and deny both: if $n$ is not even, then $n$ is not a multiple of 4. Outside the even circle means outside the inner circle too. The column of $\\neg Q \\Rightarrow \\neg P$ matches that of $P \\Rightarrow Q$ in every row, so a statement and its contrapositive are true or false together, and proving either one proves the other.",
      },
      {
        title: "If and only if",
        text: "When a statement and its converse are both true, $P$ and $Q$ hold for exactly the same cases, written $P \\Leftrightarrow Q$: $P$ if and only if $Q$. For instance, $n$ is even if and only if $n^2$ is even. Proving an if and only if takes two proofs, one in each direction, as Pythagoras' theorem and its converse do.",
      },
    ],

    draw(g, f) {
      const v = n.value;
      const [p, q] = [v % 4 === 0, v % 2 === 0];

      // The Venn picture on the left.
      box(g, { x: -7.8, y: -2.8 }, { x: -0.2, y: 4.6 }, { color: C.faint, width: 1.5 });
      const outsideLit = f.step === 2;
      if (outsideLit) box(g, { x: -7.8, y: -2.8 }, { x: -0.2, y: 4.6 }, { color: C.faint, fill: tint(C.orange, 0.12 * f.at(2)), stroke: null });
      g.circle(QC, QR, { color: Q, fill: tint(Q, f.step === 1 ? 0.12 + 0.18 * f.at(1) : 0.14), width: 2.5 });
      if (outsideLit) g.circle(QC, QR, { color: Q, fill: "#131a23", stroke: null, alpha: 0.8 * f.at(2) });
      g.circle(PC, PR, { color: P, fill: tint(P, 0.3), width: 2.5 });
      g.label({ x: QC.x + 1.6, y: QC.y + QR - 0.2 }, "Q: even", { color: Q, size: 15, bold: true, align: "left" });
      g.label({ x: PC.x, y: PC.y + PR + 0.25 }, "P: multiple of 4", { color: P, size: 13, bold: true });

      for (let k = 1; k <= 20; k++) {
        const kp = k % 4 === 0;
        const kq = k % 2 === 0;
        const counter = f.step === 1 && kq && !kp;
        const color = k === v ? PICK : counter ? BAD : kp ? P : kq ? Q : OUT;
        if (k === v) g.circle(SPOT[k], 0.3, { color: PICK, width: 2.5 });
        g.label(SPOT[k], String(k), { color, size: 15, bold: true });
      }

      // The truth table on the right.
      const cols = COLUMNS.filter((c) => c.step <= f.step);
      const cw = 1.2;
      const x0 = 0.5;
      const y0 = 3.6;
      const rh = 0.8;
      cols.forEach((c, j) => {
        const alpha = c.step === f.step && f.step > 0 ? f.at(f.step) : 1;
        const x = x0 + j * cw + cw / 2;
        g.label({ x, y: y0 }, c.head, { color: j < 2 ? (j === 0 ? P : Q) : C.ink, size: 14, bold: true, alpha });
        ROWS.forEach(([rp, rq], i) => {
          const val = c.value(rp, rq);
          g.label({ x, y: y0 - (i + 1) * rh }, tf(val), { color: val ? C.green : BAD, size: 16, bold: true, alpha });
        });
      });
      g.segment({ x: x0, y: y0 - rh / 2 }, { x: x0 + cols.length * cw, y: y0 - rh / 2 }, { color: C.dim, width: 1.5 });
      const row = ROWS.findIndex(([rp, rq]) => rp === p && rq === q);
      const ry = y0 - (row + 1) * rh;
      box(g, { x: x0 - 0.05, y: ry - rh / 2 + 0.08 }, { x: x0 + cols.length * cw + 0.05, y: ry + rh / 2 - 0.08 }, { color: PICK, width: 2 });
      g.label({ x: x0, y: y0 - 4.9 * rh }, "no number lands in row T F", { color: C.dim, size: 13, bold: true, align: "left" });
      if (f.step === 2) {
        g.label({ x: x0, y: y0 - 5.7 * rh }, "columns P ⇒ Q and ¬Q ⇒ ¬P agree", { color: PICK, size: 14, bold: true, align: "left", alpha: f.at(2) });
      } else if (f.step === 1) {
        g.label({ x: x0, y: y0 - 5.7 * rh }, "even, not a multiple of 4: converse fails", { color: BAD, size: 14, bold: true, align: "left", alpha: f.at(1) });
      } else if (f.step === 3) {
        g.label({ x: x0, y: y0 - 5.7 * rh }, "P ⇔ Q needs both P ⇒ Q and Q ⇒ P", { color: PICK, size: 14, bold: true, align: "left", alpha: f.at(3) });
      }
    },

    readout(f) {
      const v = n.value;
      const [p, q] = [v % 4 === 0, v % 2 === 0];
      const said = (b: boolean): string => (b ? "\\text{true}" : "\\text{false}");
      const rows: Readout[] = [
        { label: `For n = ${v}`, tex: `P \\text{ is } ${said(p)}, \\quad Q \\text{ is } ${said(q)}` },
        { label: "Statement", tex: `P \\Rightarrow Q: ${said(!p || q)}`, tone: "good" },
      ];
      if (f.step >= 1) rows.push({ label: "Converse", tex: `Q \\Rightarrow P: ${said(!q || p)}`, tone: !q || p ? "good" : "warn" });
      if (f.step >= 2) rows.push({ label: "Contrapositive", tex: `\\neg Q \\Rightarrow \\neg P: ${said(q || !p)}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "Every dog is a mammal",
        text: "If it is a dog, it is a mammal; but a cat is a mammal that is not a dog, so the converse fails. If it is not a mammal, it is not a dog: that contrapositive is just as sure as the original.",
      },
      {
        title: "Wet streets",
        text: "If it rained, the streets are wet. Wet streets do not prove it rained, since a street cleaner may have passed. Dry streets do prove it did not rain: the contrapositive.",
      },
    ],

    uses: [
      {
        title: "Finding a fault",
        text: "If the battery is flat, the car will not start. A mechanic cannot run that backwards: a car that will not start may have a good battery and a bad starter. But the contrapositive is safe: a car that starts does not have a flat battery, so that part can be ruled out at once.",
        tags: ["machines"],
        image: {
          src: batteryCarStartImage,
          caption: "A flat battery means no start, but no start does not mean a flat battery; a car that starts rules the battery out.",
          alt: "A car battery with an arrow to a car that will not start, labelled true; the reversed arrow labelled not always; and a gold arrow from a running car to a good battery, labelled the contrapositive.",
        },
      },
      {
        title: "Reading a test result",
        text: "A screening test may be positive for nearly everyone who has a condition, yet a positive result is a different claim: the converse. When the condition is rare, most positives can come from healthy people, so doctors confirm with a second test rather than reading the first one backwards.",
        tags: ["health"],
        image: {
          src: screeningTestConverseImage,
          caption: "If you have the condition the test is positive; a positive test does not show you have it, the converse.",
          alt: "A grid of 100 small people, one with the condition outlined in gold. The test marks that one and several healthy people positive, so most positive results are healthy people.",
        },
      },
    ],
  };
});
