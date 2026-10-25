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

// --- Congruence ---------------------------------------------------------------

/** How near a measured side, in units, must come to its given to match. */
export const SIDE_TOL = 0.07;
/** How near a measured angle, in degrees, must come to its given to match. */
export const ANGLE_TOL = 1.6;

export interface Check {
  /** The measurement as LaTeX: `AC` or `\angle A`. */
  name: string;
  kind: "side" | "angle";
  measured: number;
  given: number;
}

export function matches({ kind, measured, given }: Check): boolean {
  return Math.abs(measured - given) <= (kind === "side" ? SIDE_TOL : ANGLE_TOL);
}

export interface CongruenceCell {
  key: string;
  /** What is given, as label text: `$AB$, $AC$, $BC$`. */
  givens: string;
  /** Every given beyond the fixed base AB, as measured now. */
  checks: readonly Check[];
  /** Whether C sits on a spot where every given holds. */
  pinned: boolean;
  /** Whether the givens fit two different triangles (SSA). */
  twoTriangles: boolean;
}

/**
 * One cell's checklist: the base, always given, then each given measured
 * live and ticked once it matches; the label says what the cell is and, once
 * C is pinned, what that proves.
 */
export function congruenceReadout(cell: CongruenceCell): Readout {
  const checks = cell.checks.map((c) => {
    const unit = c.kind === "angle" ? "^\\circ" : "";
    const digits = c.kind === "angle" ? 0 : 2;
    const given = `${c.given.toFixed(digits)}${unit}`;
    return matches(c) ? `${c.name} = ${given}\\,\\checkmark` : `${c.name} = ${c.measured.toFixed(digits)}${unit} \\ne ${given}`;
  });
  const tex = ["AB = 4.00\\,\\checkmark", ...checks].join(",\\quad ");
  if (!cell.pinned) {
    const ask = cell.twoTriangles ? "how many places fit $C$?" : "drag $C$ until every given checks out";
    return { label: `${cell.key}: given ${cell.givens}; ${ask}`, tex };
  }
  if (cell.twoTriangles) return { label: `${cell.key}: same givens, two different triangles`, tex, tone: "warn" };
  return { label: `${cell.key} pins down this one triangle`, tex, tone: "good" };
}

// --- Similar triangles --------------------------------------------------------

/**
 * Each side ratio worked out in every triangle on the ray, hypotenuses `hyps`
 * with the learner's first, all at angle `theta` degrees: the sides differ,
 * the ratios agree.
 */
export function similarReadouts(theta: number, hyps: readonly number[]): Readout[] {
  const t = (theta * Math.PI) / 180;
  const sides = hyps.map((r) => ({ opp: r * Math.sin(t), adj: r * Math.cos(t), hyp: r }));
  const ratio = (label: string, top: "opp" | "adj", bottom: "adj" | "hyp"): Readout => ({
    label,
    tex: [
      `\\frac{\\text{${top}}}{\\text{${bottom}}}`,
      ...sides.map((s) => `\\frac{${s[top].toFixed(2)}}{${s[bottom].toFixed(2)}}`),
      (sides[0][top] / sides[0][bottom]).toFixed(3),
    ].join(" = "),
    tone: "good",
  });
  return [
    ratio("Opposite over hypotenuse, in yours and the other two", "opp", "hyp"),
    ratio("Adjacent over hypotenuse", "adj", "hyp"),
    ratio("Opposite over adjacent", "opp", "adj"),
    {
      label: "The same three angles, so all similar (AA)",
      tex: `90^\\circ,\\quad \\theta = ${theta.toFixed(1)}^\\circ,\\quad 90^\\circ - \\theta = ${(90 - theta).toFixed(1)}^\\circ`,
    },
  ];
}

// --- Naming the ratios --------------------------------------------------------

export interface RightTriangle {
  /** The acute angle the ratios are taken at. */
  focus: "A" | "B";
  /** BC, the leg opposite A. */
  a: number;
  /** AC, the leg opposite B. */
  b: number;
}

/**
 * The six ratios at the focused angle, from the lengths on the figure; then
 * the same sine read from the other corner as a cosine, and sin² + cos² = 1
 * as the Pythagorean theorem divided through by c².
 */
export function trigReadouts({ focus, a, b }: RightTriangle): Readout[] {
  const len: Record<Side, number> = { a, b, c: Math.hypot(a, b) };
  const other = focus === "A" ? "B" : "A";
  const [opp, adj]: Side[] = focus === "A" ? ["a", "b"] : ["b", "a"];
  const angle = (Math.atan2(len[opp], len[adj]) * 180) / Math.PI;
  const value = (p: Side, q: Side): string => (len[p] / len[q]).toFixed(3);
  const ratio = (fn: string, top: string, bottom: string, p: Side, q: Side): string =>
    `\\${fn} ${focus} = \\frac{\\text{${top}}}{\\text{${bottom}}} = \\frac{${p}}{${q}} = ` +
    `\\frac{${len[p].toFixed(2)}}{${len[q].toFixed(2)}} = ${value(p, q)}`;
  const flip = (fn: string, p: Side, q: Side): string => `\\${fn} ${focus} = \\frac{${p}}{${q}} = ${value(p, q)}`;
  return [
    {
      label: `Standing at $\\angle ${focus} = ${angle.toFixed(1)}^\\circ$, sine is opposite over hypotenuse`,
      tex: ratio("sin", "opp", "hyp", opp, "c"),
    },
    { label: "Cosine is adjacent over hypotenuse", tex: ratio("cos", "adj", "hyp", adj, "c") },
    { label: "Tangent is opposite over adjacent", tex: ratio("tan", "opp", "adj", opp, adj) },
    {
      label: "Flip each fraction upside down",
      tex: [flip("csc", "c", opp), flip("sec", "c", adj), flip("cot", adj, opp)].join(",\\quad "),
    },
    {
      label: `From the other corner, $\\angle ${other} = 90^\\circ - \\angle ${focus}$, the same leg is adjacent`,
      tex: `\\sin ${focus} = \\frac{${opp}}{c} = \\cos ${other} = ${value(opp, "c")}`,
      tone: "good",
    },
    {
      label: "The Pythagorean theorem, divided by $c^2$",
      tex:
        `\\sin^2 ${focus} + \\cos^2 ${focus} = \\frac{a^2 + b^2}{c^2} = ` +
        `\\frac{${(a * a).toFixed(2)} + ${(b * b).toFixed(2)}}{${(len.c * len.c).toFixed(2)}} = 1`,
      tone: "good",
    },
  ];
}

type Side = "a" | "b" | "c";

// --- The two special triangles ------------------------------------------------

/** How far a fold has gone: not begun, under way, or flat. */
export type Fold = "open" | "folding" | "folded";

export function foldOf(t: number): Fold {
  return t <= 0 ? "open" : t >= 1 ? "folded" : "folding";
}

const SQUARE: Record<Fold, string> = {
  open: "A square: four sides $a$, four right angles",
  folding: "Folding over the diagonal",
  folded: "The halves match, so the fold splits each right angle into $45^\\circ + 45^\\circ$",
};

/**
 * Half a square of side `a`: its hypotenuse by Pythagoras, then the six
 * ratios of 45°, in which the a's cancel.
 */
export function fortyFiveReadouts(a: number, fold: Fold): Readout[] {
  const hyp = a * Math.SQRT2;
  return [
    {
      label: SQUARE[fold],
      tex: `\\text{hyp} = \\sqrt{a^2 + a^2} = \\sqrt{${(2 * a * a).toFixed(2)}} = a\\sqrt{2} = ${hyp.toFixed(2)}`,
      tone: fold === "folded" ? "good" : "plain",
    },
    {
      label: "Sine and cosine: the $a$'s cancel",
      tex: `\\sin 45^\\circ = \\cos 45^\\circ = \\frac{a}{a\\sqrt{2}} = \\frac{${a.toFixed(2)}}{${hyp.toFixed(2)}} = \\frac{\\sqrt{2}}{2} \\approx 0.707`,
    },
    {
      label: "Tangent: leg over equal leg",
      tex: `\\tan 45^\\circ = \\frac{a}{a} = \\frac{${a.toFixed(2)}}{${a.toFixed(2)}} = 1`,
    },
    {
      label: "The flips: whatever the size, hypotenuse over leg is $\\sqrt{2}$",
      tex: `\\csc 45^\\circ = \\sec 45^\\circ = \\frac{a\\sqrt{2}}{a} = \\sqrt{2} \\approx 1.414,\\quad \\cot 45^\\circ = 1`,
    },
  ];
}

const EQUILATERAL: Record<Fold, string> = {
  open: "An equilateral triangle: three sides $2a$, three $60^\\circ$ angles",
  folding: "Folding over the altitude",
  folded: "The halves match (ASA), so the apex splits into $30^\\circ + 30^\\circ$",
};

/**
 * Half an equilateral triangle of side `2a`: its long leg by Pythagoras, the
 * ratio of its sides, and the six ratios of 30° and of 60°.
 */
export function thirtySixtyReadouts(a: number, fold: Fold): Readout[] {
  const long = a * Math.sqrt(3);
  return [
    {
      label: EQUILATERAL[fold],
      tex: `\\text{long leg} = \\sqrt{(2a)^2 - a^2} = \\sqrt{3a^2} = a\\sqrt{3} = ${long.toFixed(2)}`,
      tone: fold === "folded" ? "good" : "plain",
    },
    {
      label: "Short leg, long leg, hypotenuse: the hypotenuse is twice the short leg",
      tex: `a : a\\sqrt{3} : 2a = ${a.toFixed(2)} : ${long.toFixed(2)} : ${(2 * a).toFixed(2)} = 1 : \\sqrt{3} : 2`,
    },
    {
      label: "At $30^\\circ$ the short leg $a$ is opposite",
      tex:
        "\\sin 30^\\circ = \\frac{a}{2a} = \\frac{1}{2},\\quad " +
        "\\cos 30^\\circ = \\frac{a\\sqrt{3}}{2a} = \\frac{\\sqrt{3}}{2},\\quad " +
        "\\tan 30^\\circ = \\frac{a}{a\\sqrt{3}} = \\frac{\\sqrt{3}}{3}",
    },
    {
      label: "At $60^\\circ$ the long leg $a\\sqrt{3}$ is opposite",
      tex:
        "\\sin 60^\\circ = \\frac{a\\sqrt{3}}{2a} = \\frac{\\sqrt{3}}{2},\\quad " +
        "\\cos 60^\\circ = \\frac{a}{2a} = \\frac{1}{2},\\quad " +
        "\\tan 60^\\circ = \\frac{a\\sqrt{3}}{a} = \\sqrt{3}",
    },
    {
      label: "The flips",
      tex:
        "\\csc 30^\\circ = \\sec 60^\\circ = 2,\\quad " +
        "\\sec 30^\\circ = \\csc 60^\\circ = \\frac{2\\sqrt{3}}{3},\\quad " +
        "\\cot 30^\\circ = \\sqrt{3},\\quad \\cot 60^\\circ = \\frac{\\sqrt{3}}{3}",
    },
  ];
}

// --- The whole table ----------------------------------------------------------

/** The angles the dial snaps to, in degrees. */
export const LANDMARKS: readonly number[] = [0, 30, 45, 60, 90];

const FUNCTIONS = ["sin", "cos", "tan", "sec", "csc", "cot"] as const;

// Every entry derived in the previous lessons, by landmark; null is undefined.
const EXACT: Record<(typeof FUNCTIONS)[number], (string | null)[]> = {
  sin: ["0", "\\tfrac{1}{2}", "\\tfrac{\\sqrt{2}}{2}", "\\tfrac{\\sqrt{3}}{2}", "1"],
  cos: ["1", "\\tfrac{\\sqrt{3}}{2}", "\\tfrac{\\sqrt{2}}{2}", "\\tfrac{1}{2}", "0"],
  tan: ["0", "\\tfrac{\\sqrt{3}}{3}", "1", "\\sqrt{3}", null],
  sec: ["1", "\\tfrac{2\\sqrt{3}}{3}", "\\sqrt{2}", "2", null],
  csc: [null, "2", "\\sqrt{2}", "\\tfrac{2\\sqrt{3}}{3}", "1"],
  cot: [null, "\\sqrt{3}", "1", "\\tfrac{\\sqrt{3}}{3}", "0"],
};

const LANDMARK_LABEL = [
  "At $0^\\circ$: flat, the opposite leg is gone",
  "At $30^\\circ$: half an equilateral triangle",
  "At $45^\\circ$: half a square",
  "At $60^\\circ$: half an equilateral, stood on its short leg",
  "At $90^\\circ$: flat the other way, the adjacent leg is gone",
];

const HOLDING = [
  "Flat: $B$ and $C$ are the same point, and $AB$ lies on $AC$",
  "You are holding half an equilateral triangle, short leg opposite the $30^\\circ$",
  "You are holding half a square: two $45^\\circ$ angles, equal legs",
  "Half an equilateral again, long leg opposite the $60^\\circ$",
  "Flat the other way: $C$ slid back onto $A$",
];

/** The six ratios of sin and cos, in FUNCTIONS order; null where one divides by a leg of length 0. */
function live(sin: number, cos: number): (number | null)[] {
  const over = (p: number, q: number): number | null => (Math.abs(q) > 0.02 ? p / q : null);
  return [sin, cos, over(sin, cos), over(1, cos), over(1, sin), over(cos, sin)];
}

/** One column of the table, as `\sin = …,\ \cos = …`; null entries are undefined. */
function column(values: readonly (string | null)[]): string {
  return FUNCTIONS.map((fn, i) => `\\${fn} = ${values[i] ?? "\\text{undefined}"}`).join(",\\ ");
}

/**
 * On a hypotenuse of 1 at `theta` degrees, resting on landmark `snap` or
 * between landmarks (null): the six ratios now, exact at a landmark and as
 * decimals between, sin² + cos² = 1, then the whole table, one landmark a row,
 * with the one the dial rests on lit.
 */
export function tableReadouts(theta: number, snap: number | null): Readout[] {
  const t = (theta * Math.PI) / 180;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const at = snap === null ? -1 : LANDMARKS.indexOf(snap);
  const now =
    at >= 0
      ? column(FUNCTIONS.map((fn) => EXACT[fn][at]))
      : column(live(sin, cos).map((v) => (v === null ? null : v.toFixed(2))));
  const degenerate = snap === 0 || snap === 90;
  return [
    {
      label: at >= 0 ? HOLDING[at] : "Between the landmarks the ratios have no tidy exact forms",
      tex: `\\theta = ${at >= 0 ? snap : theta.toFixed(1)}^\\circ:\\quad ${now}`,
      tone: degenerate ? "warn" : at >= 0 ? "good" : "plain",
    },
    {
      label: "With a hypotenuse of $1$, this is the Pythagorean theorem",
      tex: `\\sin^2\\theta + \\cos^2\\theta = ${(sin * sin).toFixed(3)} + ${(cos * cos).toFixed(3)} = 1`,
      tone: "good",
    },
    ...LANDMARKS.map(
      (_, i): Readout => ({
        label: LANDMARK_LABEL[i],
        tex: column(FUNCTIONS.map((fn) => EXACT[fn][i])),
        tone: i === at ? "good" : "plain",
      }),
    ),
  ];
}

/** Up to two decimal places, without trailing zeros. */
function fmt(x: number): string {
  return String(Math.round(x * 100) / 100);
}
