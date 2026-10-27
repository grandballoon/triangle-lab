// Factoring a quadratic. A product is zero only when one of its factors is,
// so y = a(x − r)(x − s) meets the x-axis exactly at r and s. Multiplying out
// shows the roots' sum and product sitting in the coefficients; factoring is
// that multiplication run backwards — two numbers from their sum and product —
// and three special shapes are worth knowing on sight.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { axes, plot, texQuadratic, onStage, type Graph } from "../kit/algebra.ts";
import { lesson, type Readout } from "../scene.ts";

const ROOT = C.gold;
const TARGET = C.ink;
const GRAPH: Graph = { origin: { x: 0, y: 0 }, unit: { x: 1, y: 2 } };

/** Quadratics with whole-number roots to factor, as x² + bx + c. */
const TARGETS = [
  { name: "x² − 3x + 2", b: -3, c: 2 },
  { name: "x² + 9x + 18", b: 9, c: 18 },
  { name: "x² − x − 30", b: -1, c: -30 },
  { name: "x² − 9", b: 0, c: -9 },
  { name: "x² − 4x + 4", b: -4, c: 4 },
] as const;
const NONE = "none";
const LEADS = ["1", "2", "−1"] as const;

/** `(x - 3)`, `(x + 2)`, or `x` for a root at 0. */
const factor = (r: number): string => (r === 0 ? "x" : `(x ${r > 0 ? "-" : "+"} ${fmt(Math.abs(r))})`);

/** The roots' factors multiplied, a root at 0 written first: `x(x - 3)`, `(x + 1)^2`. */
function texFactors(r: number, s: number): string {
  if (r === s) return r === 0 ? "x^2" : `${factor(r)}^2`;
  return s === 0 ? `${factor(s)}${factor(r)}` : `${factor(r)}${factor(s)}`;
}

/** The same for a canvas label: "(x − 1)(x − 2)". */
const factorText = (r: number, s: number): string => texFactors(r, s).replace(/-/g, "−").replace("^2", "²");

/** Which of the three special shapes a pair of roots makes, if any. */
function shape(r: number, s: number): Readout | null {
  if (r === s) return { label: "Perfect square: one double root", tex: texFactors(r, s), tone: "good" };
  if (r === 0 || s === 0) return { label: "No constant term: x is a factor", tex: texFactors(r, s), tone: "good" };
  if (r === -s) return { label: "Difference of squares", tex: `x^2 - ${fmt(r * r)} = (x - ${fmt(Math.abs(r))})(x + ${fmt(Math.abs(r))})`, tone: "good" };
  return null;
}

export default lesson((s) => {
  const lead = s.choice("a", LEADS);
  const target = s.choice("Factor", [NONE, ...TARGETS.map((t) => t.name)]);
  const onAxis = (p: { x: number; y: number }) => ({ x: clamp(Math.round(p.x), -7, 7), y: 0 });
  const R = s.point(-1, 0, { label: "r", color: ROOT, constrain: onAxis });
  const S = s.point(3, 0, { label: "s", color: ROOT, constrain: onAxis });

  const a = (): number => (lead.value === "2" ? 2 : lead.value === "−1" ? -1 : 1);
  const goal = () => TARGETS.find((t) => t.name === target.value) ?? null;
  const coefficients = (): [number, number, number] => {
    const k = a();
    return [k, -k * (R.x + S.x) + 0, k * R.x * S.x + 0];
  };

  return {
    steps: [
      {
        title: "Zero only when a factor is",
        text: "Drag the roots $r$ and $s$ along the axis. The curve is $y = a(x - r)(x - s)$, and a product is zero only when one of its factors is. So it meets the $x$-axis exactly where $x = r$ or $x = s$, and nowhere else. Changing $a$ stretches it but moves neither root.",
      },
      {
        title: "Multiply it out",
        text: "Distributing gives $(x - r)(x - s) = x^2 - (r + s)x + rs$. With $a = 1$, the $x$ coefficient is minus the sum of the roots and the constant is their product.",
      },
      {
        title: "Factoring runs it backwards",
        text: "To factor $x^2 + bx + c$, find two numbers with sum $-b$ and product $c$. Pick a quadratic to factor and drag the roots until your curve lies on the dashed one. A positive $c$ means the roots share a sign; a negative one means they differ.",
      },
      {
        title: "Three shapes to know",
        text: "Put a root at $0$: the constant vanishes and $x$ is a factor. Put the roots at $\\pm r$: the middle term vanishes, leaving $x^2 - r^2 = (x - r)(x + r)$. Put them together: a perfect square $(x - r)^2$, and the curve only touches the axis.",
      },
    ],

    draw(g, f) {
      const [A, B, Cc] = coefficients();
      const t = goal();
      axes(g, GRAPH, { xName: "x" });
      if (t && f.step >= 2) plot(g, GRAPH, (x) => x * x + t.b * x + t.c, { color: TARGET, width: 2, dash: [8, 6] });
      plot(g, GRAPH, (x) => A * x * x + B * x + Cc, { color: g.accent });
      for (const p of [R, S]) g.label(onStage(GRAPH, p), fmt(p.x), { color: ROOT, size: 14, bold: true, dy: R.x === S.x && p === S ? -48 : -26 });
      if (t && f.step >= 2) {
        const done = A === 1 && B === t.b && Cc === t.c;
        g.label({ x: -7.7, y: 4.5 }, done ? `${t.name} = ${factorText(R.x, S.x)}` : `factor ${t.name}`, {
          color: done ? ROOT : TARGET,
          size: 18,
          bold: true,
          align: "left",
        });
      }
    },

    readout(f) {
      const [A, B, Cc] = coefficients();
      const lead = A === 1 ? "" : A === -1 ? "-" : fmt(A);
      const factored: Readout = { label: "Factored", tex: `y = ${lead}${texFactors(R.x, S.x)}` };
      const expanded: Readout = { label: "Multiplied out", tex: `y = ${texQuadratic(A, B, Cc)}` };
      const rows = [factored, expanded];
      if (f.step >= 1) {
        rows.push({
          label: "Sum and product of the roots",
          tex: `r + s = ${fmt(R.x + S.x)} = -\\tfrac{b}{a},\\quad rs = ${fmt(R.x * S.x)} = \\tfrac{c}{a}`,
        });
      }
      const t = goal();
      if (f.step >= 2 && t) {
        const done = A === 1 && B === t.b && Cc === t.c;
        rows.push({
          label: done ? "Factored it" : "Looking for",
          tex: `\\text{sum } ${fmt(-t.b)},\\ \\text{product } ${fmt(t.c)}`,
          tone: done ? "good" : "plain",
        });
      }
      if (f.step >= 3) {
        rows.push(shape(R.x, S.x) ?? { label: "Special shape", tex: "\\text{none here}", tone: "dim" });
      }
      return rows;
    },

    uses: [
      {
        title: "A frame for a picture",
        text: "A 20 by 30 cm print goes in a frame with a border $w$ wide all round, and the whole frame should cover 1200 cm² of wall. Then $(20 + 2w)(30 + 2w) = 1200$, which tidies up to $w^2 + 25w - 150 = 0$ and factors as $(w + 30)(w - 5) = 0$. A border of $-30$ cm makes no sense, so it is 5 cm.",
      },
      {
        title: "Chairs in rows",
        text: "48 chairs are to be set out in rows, each row two chairs longer than there are rows. With $r$ rows, $r(r + 2) = 48$, so $r^2 + 2r - 48 = (r + 8)(r - 6) = 0$: 6 rows of 8.",
      },
    ],
  };
});
