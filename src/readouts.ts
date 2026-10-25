// The live formulas of the standalone lessons that have a formula band
// (chrome.ts): plain values in, rows of LaTeX out. Pure, so the lessons'
// canvas code stays about drawing and the rows can be tested as text.

import type { Readout } from "./lab/scene.ts";

// --- Perimeter ----------------------------------------------------------------

export interface PerimeterWalk {
  name: string;
  /** The three side lengths in the order the knob walks them, as written on the figure. */
  sides: readonly [number, number, number];
  /** How many sides the knob has finished, 0 to 3. */
  walked: number;
  /** Whether the knob has walked half the perimeter. */
  halfway: boolean;
}

/**
 * One triangle's row: the sides walked so far adding up to p, the
 * semiperimeter once the knob is past halfway, and both in full once the
 * knob is home. Sums are of the lengths as written, so they add up on screen.
 */
export function perimeterReadout({ name, sides, walked, halfway }: PerimeterWalk): Readout {
  const label = `${name} triangle`;
  const done = sides.slice(0, Math.min(walked, 3));
  if (done.length === 0) return { label, tex: "p = 0", tone: "dim" };
  const p = done.reduce((x, y) => x + y, 0);
  const sum = done.length > 1 ? `${done.map((x) => x.toFixed(1)).join(" + ")} = ` : "";
  const perimeter = `p = ${sum}${p.toFixed(1)}`;
  const s = fmt(sides.reduce((x, y) => x + y, 0) / 2);
  if (walked >= 3) return { label, tex: `${perimeter},\\quad s = \\tfrac{p}{2} = ${s}`, tone: "good" };
  if (halfway) return { label, tex: `${perimeter},\\quad \\text{halfway round: } s = ${s}` };
  return { label, tex: perimeter };
}

// --- The triangle inequality --------------------------------------------------

/** Below this slack (sum of two sides minus the third) a triangle is a straight line. */
export const FLAT_SLACK = 0.01;
/** Below this slack a triangle is nearly flat and the warnings begin. */
export const TIGHT_SLACK = 0.55;

export type Tightness = "flat" | "tight" | "slack";

export function tightness(slack: number): Tightness {
  return slack <= FLAT_SLACK ? "flat" : slack < TIGHT_SLACK ? "tight" : "slack";
}

const VERDICT: Record<Tightness, string> = {
  flat: "degenerate: a straight line, not a triangle",
  tight: "nearly flat: one sum is barely winning",
  slack: "a real triangle: every sum wins",
};
const CHECK_LABEL: Record<Tightness, string> = {
  flat: "equal: the triangle lies flat",
  tight: "almost equal",
  slack: "holds",
};
const CHECK_TONE: Record<Tightness, Readout["tone"]> = { flat: "warn", tight: "plain", slack: "good" };

export interface SidesOf {
  name: string;
  a: number;
  b: number;
  c: number;
}

/**
 * The selected triangle's sides and its three inequalities, each toned by
 * how much room it has left; with nothing selected, the inequalities in
 * general and how to pick a triangle.
 */
export function inequalityReadouts(t: SidesOf | null): Readout[] {
  if (!t) {
    return [
      {
        label: "Click any side, then swing one of its round ends",
        tex: "a + b > c,\\quad b + c > a,\\quad c + a > b",
        tone: "dim",
      },
    ];
  }
  const len = { a: t.a, b: t.b, c: t.c };
  const checks = (
    [
      ["a", "b", "c"],
      ["b", "c", "a"],
      ["c", "a", "b"],
    ] as const
  ).map(([p, q, third]) => ({ p, q, third, sum: len[p] + len[q], slack: len[p] + len[q] - len[third] }));
  const verdict = VERDICT[tightness(Math.min(...checks.map((c) => c.slack)))];

  const rows: Readout[] = [
    { label: `${t.name}: ${verdict}`, tex: `a = ${t.a.toFixed(2)},\\ b = ${t.b.toFixed(2)},\\ c = ${t.c.toFixed(2)}` },
  ];
  for (const { p, q, third, sum, slack } of checks) {
    const kind = tightness(slack);
    rows.push({
      label: CHECK_LABEL[kind],
      tex: `${p} + ${q} = ${sum.toFixed(2)} ${kind === "flat" ? "=" : ">"} ${len[third].toFixed(2)} = ${third}`,
      tone: CHECK_TONE[kind],
    });
  }
  return rows;
}

// --- Pythagoras ---------------------------------------------------------------

/** The theorem with the live squares of legs `a` and `b`, and the hypotenuse it gives. */
export function pythagorasReadouts(a: number, b: number): Readout[] {
  const a2 = a * a;
  const b2 = b * b;
  const c2 = a2 + b2;
  return [
    { label: "Legs", tex: `a = ${a.toFixed(2)},\\ b = ${b.toFixed(2)}` },
    {
      label: "Squares on the sides",
      tex: `a^2 + b^2 = ${a2.toFixed(2)} + ${b2.toFixed(2)} = ${c2.toFixed(2)} = c^2`,
      tone: "good",
    },
    { label: "Hypotenuse", tex: `c = \\sqrt{${c2.toFixed(2)}} = ${Math.sqrt(c2).toFixed(2)}` },
  ];
}

/** Up to two decimal places, without trailing zeros. */
function fmt(x: number): string {
  return String(Math.round(x * 100) / 100);
}
