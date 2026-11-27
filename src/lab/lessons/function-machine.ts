// Inputs and outputs. A function is a rule that takes each allowed input to
// exactly one output: drawn as a machine with a slot in and a slot out, and
// as a mapping diagram with an arrow from every input. The inputs it accepts
// are its domain, the outputs it gives its range; two inputs may share an
// output, but one input with two outputs is not a function. Feeding one
// machine's output into another composes them, and the order matters.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { num } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";
import spreadsheetCellRuleImage from "../../images/spreadsheet-cell-rule.svg";
import doseByWeightTableImage from "../../images/dose-by-weight-table.svg";

const IN = C.blue;
const OUT = C.pink;
const BAD = C.red;
const GOLD = C.gold;

const RULES = ["2x + 1", "x²", "√x", "±√x"] as const;
type Rule = (typeof RULES)[number];

interface RuleInfo {
  /** Every output for input x: none outside the domain, two for ±√x. */
  outputs: (x: number) => number[];
  tex: string;
  domain: string;
  range: string;
  /** The inputs the mapping diagram shows. */
  sample: number[];
}

const INFO: Record<Rule, RuleInfo> = {
  "2x + 1": { outputs: (x) => [2 * x + 1], tex: "2x + 1", domain: "\\text{all real numbers}", range: "\\text{all real numbers}", sample: [-2, -1, 0, 1, 2] },
  "x²": { outputs: (x) => [x * x], tex: "x^2", domain: "\\text{all real numbers}", range: "y \\ge 0", sample: [-2, -1, 0, 1, 2] },
  "√x": { outputs: (x) => (x >= 0 ? [Math.sqrt(x)] : []), tex: "\\sqrt{x}", domain: "x \\ge 0", range: "y \\ge 0", sample: [0, 1, 4, 9] },
  "±√x": {
    outputs: (x) => (x > 0 ? [Math.sqrt(x), -Math.sqrt(x)] : x === 0 ? [0] : []),
    tex: "\\pm\\sqrt{x}",
    domain: "x \\ge 0",
    range: "\\text{not a function}",
    sample: [0, 1, 4, 9],
  },
};

/** A number in a bubble. */
function bubble(g: Draw, p: Vec, text: string, color: string, alpha = 1): void {
  g.circle(p, 0.72, { color, fill: tint(color, 0.18), width: 2.5, alpha });
  g.label(p, text, { color, size: text.length > 4 ? 14 : 17, bold: true, alpha });
}

/** A machine: a box with its name inside and its rule underneath. */
function machine(g: Draw, centre: Vec, name: string, rule: string, alpha = 1): void {
  const [w, h] = [2.7, 1.7];
  g.polygon(
    [
      { x: centre.x - w / 2, y: centre.y - h / 2 },
      { x: centre.x + w / 2, y: centre.y - h / 2 },
      { x: centre.x + w / 2, y: centre.y + h / 2 },
      { x: centre.x - w / 2, y: centre.y + h / 2 },
    ],
    { color: GOLD, fill: tint(GOLD, 0.12), width: 2.5, alpha },
  );
  g.label({ x: centre.x, y: centre.y + 0.32 }, name, { color: GOLD, size: 18, bold: true, alpha });
  g.label({ x: centre.x, y: centre.y - 0.36 }, rule, { color: C.ink, size: 15, bold: true, alpha });
}

/** An oval, for the sets of a mapping diagram. */
function oval(g: Draw, centre: Vec, rx: number, ry: number, color: string): void {
  const pts: Vec[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push({ x: centre.x + rx * Math.cos(t), y: centre.y + ry * Math.sin(t) });
  }
  g.polygon(pts, { color, fill: tint(color, 0.06), width: 2 });
}

/** Composition: x², then 2x + 1, and the other way round. */
const square = (x: number): number => x * x;
const double = (x: number): number => 2 * x + 1;

export default lesson((s) => {
  const rule = s.choice("Rule", RULES, "2x + 1");
  const input = s.slider({ label: "x =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -4, max: 9, value: 3, step: 0.5, format: (v) => num(v) });

  return {
    steps: [
      {
        title: "One output for each input",
        text: "A function is a rule that takes each input to exactly one output. Write it $f(x) = 2x + 1$: put $3$ in and $f(3) = 2 \\cdot 3 + 1 = 7$ comes out, every time. The letter $x$ only holds the input's place, so $f(t) = 2t + 1$ is the same function.",
      },
      {
        title: "Domain and range",
        text: "The inputs a function accepts are its domain; the outputs it actually gives are its range. Pick $\\sqrt{x}$: a negative input has no real square root, so its domain is $x \\ge 0$. Pick $x^2$: every number goes in, but no output is negative, so its range is $y \\ge 0$.",
      },
      {
        title: "Mapping inputs to outputs",
        text: "The mapping diagram draws one arrow from each input to its output. Two inputs may share an output: under $x^2$, both $2$ and $-2$ go to $4$. But an input may never have two arrows. Pick $\\pm\\sqrt{x}$: it sends $4$ to both $2$ and $-2$, so it is not a function.",
      },
      {
        title: "One machine after another",
        text: "Feed the output of $g(x) = x^2$ into $f(x) = 2x + 1$ and you get the composition $f(g(x)) = 2x^2 + 1$. The other order gives $g(f(x)) = (2x + 1)^2$, a different function: at $x = 3$ the first gives $19$ and the second $49$. Read $f(g(x))$ from the inside out: $g$ acts first.",
      },
    ],

    draw(g, f) {
      const x = input.value;

      if (f.step === 3) {
        const rows: [number, string, (v: number) => number, string, string, (v: number) => number, string, string][] = [
          [2.6, "g", square, "x²", "f", double, "2x + 1", "f(g(x))"],
          [-0.9, "f", double, "2x + 1", "g", square, "x²", "g(f(x))"],
        ];
        rows.forEach(([y, n1, f1, r1, n2, f2, r2, name], i) => {
          const alpha = i === 0 ? 1 : f.at(3);
          const mid = f1(x);
          const end = f2(mid);
          bubble(g, { x: -7, y }, num(x), IN, alpha);
          g.arrow({ x: -6.2, y }, { x: -5.4, y }, { color: C.dim, width: 2.5, alpha });
          machine(g, { x: -4, y }, n1, r1, alpha);
          g.arrow({ x: -2.6, y }, { x: -1.2, y }, { color: C.dim, width: 2.5, alpha });
          g.label({ x: -1.9, y }, num(mid, 2), { color: C.ink, size: 15, bold: true, dy: 16, alpha });
          machine(g, { x: 0.2, y }, n2, r2, alpha);
          g.arrow({ x: 1.6, y }, { x: 2.5, y }, { color: C.dim, width: 2.5, alpha });
          bubble(g, { x: 3.3, y }, num(end, 2), i === 0 ? GOLD : OUT, alpha);
          g.label({ x: 4.3, y }, `= ${name}`, { color: i === 0 ? GOLD : OUT, size: 17, bold: true, align: "left", alpha });
        });
        return;
      }

      // The machine.
      const info = INFO[rule.value];
      const outs = info.outputs(x);
      const Y = 2.4;
      g.label({ x: -6.6, y: Y + 1.25 }, "input", { color: IN, size: 14, bold: true });
      bubble(g, { x: -6.6, y: Y }, num(x), IN);
      g.arrow({ x: -5.8, y: Y }, { x: -5.15, y: Y }, { color: C.dim, width: 2.5 });
      machine(g, { x: -3.75, y: Y }, "f", rule.value);
      g.label({ x: -1.2, y: Y + 1.25 }, outs.length > 1 ? "outputs" : "output", { color: outs.length > 1 ? BAD : OUT, size: 14, bold: true });
      if (outs.length === 0) {
        g.label({ x: -1.2, y: Y }, "none", { color: BAD, size: 16, bold: true });
        g.label({ x: -3.75, y: Y - 1.45 }, `${num(x)} is not in the domain`, { color: BAD, size: 14, bold: true });
      } else {
        outs.forEach((v, i) => {
          const p = { x: -1.2, y: Y + (outs.length > 1 ? (i === 0 ? 0.8 : -0.8) : 0) };
          g.arrow({ x: -2.35, y: Y }, { x: p.x - 0.75, y: p.y }, { color: outs.length > 1 ? BAD : C.dim, width: 2.5 });
          bubble(g, p, num(v, 2), outs.length > 1 ? BAD : OUT);
        });
        if (outs.length > 1) g.label({ x: -3.75, y: Y - 1.45 }, "two outputs: not a function", { color: BAD, size: 14, bold: true });
      }

      // Domain and range, under the machine.
      const alpha = f.at(1);
      if (alpha > 0) {
        const words: Record<Rule, [string, string]> = {
          "2x + 1": ["every number", "every number"],
          "x²": ["every number", "0 and above"],
          "√x": ["0 and above", "0 and above"],
          "±√x": ["0 and above", "(not a function)"],
        };
        const [dom, ran] = words[rule.value];
        g.label({ x: -7.4, y: -0.6 }, `domain: ${dom}`, { color: IN, size: 15, bold: true, align: "left", alpha });
        g.label({ x: -7.4, y: -1.5 }, `range: ${ran}`, { color: OUT, size: 15, bold: true, align: "left", alpha });
      }

      // The mapping diagram.
      const sample = info.sample;
      const values = [...new Set(sample.flatMap(info.outputs))].sort((a, b) => b - a);
      const top = 3.5;
      const bottom = -2.2;
      const rowY = (i: number, n: number): number => (n === 1 ? (top + bottom) / 2 : top - ((top - bottom) * i) / (n - 1));
      oval(g, { x: 2, y: (top + bottom) / 2 }, 0.9, (top - bottom) / 2 + 0.6, IN);
      oval(g, { x: 6.2, y: (top + bottom) / 2 }, 0.9, (top - bottom) / 2 + 0.6, OUT);
      g.label({ x: 2, y: top + 0.95 }, "inputs", { color: IN, size: 14, bold: true });
      g.label({ x: 6.2, y: top + 0.95 }, "outputs", { color: OUT, size: 14, bold: true });
      const inY = new Map(sample.map((v, i) => [v, rowY(i, sample.length)]));
      const outY = new Map(values.map((v, i) => [v, rowY(i, values.length)]));
      for (const v of sample) {
        const lit = v === x;
        const outsV = info.outputs(v);
        for (const w of outsV) {
          g.arrow({ x: 2.5, y: inY.get(v)! }, { x: 5.7, y: outY.get(w)! }, { color: outsV.length > 1 ? BAD : lit ? GOLD : C.dim, width: lit ? 3 : 2, alpha: f.at(2) * 0.7 + 0.3 });
        }
        g.label({ x: 2, y: inY.get(v)! }, num(v), { color: lit ? GOLD : IN, size: 16, bold: true });
      }
      for (const w of values) g.label({ x: 6.2, y: outY.get(w)! }, num(w), { color: OUT, size: 16, bold: true });
    },

    readout(f) {
      const x = input.value;
      if (f.step === 3) {
        return [
          { label: "g first", tex: `f(g(${fmt(x)})) = 2 \\cdot ${fmt(x * x, 2)} + 1 = ${fmt(double(square(x)), 2)}`, tone: "good" },
          { label: "f first", tex: `g(f(${fmt(x)})) = (${fmt(double(x), 2)})^2 = ${fmt(square(double(x)), 2)}` },
        ];
      }
      const info = INFO[rule.value];
      const outs = info.outputs(x);
      const arg = x < 0 ? `(${fmt(x)})` : fmt(x);
      const rows: Readout[] = [];
      if (outs.length === 0) rows.push({ label: "Output", tex: `${fmt(x)} \\text{ is not in the domain}`, tone: "warn" });
      else if (outs.length > 1) rows.push({ label: "Outputs", tex: `${info.tex.replace("x", arg)} = ${fmt(outs[0], 2)} \\text{ or } ${fmt(outs[1], 2)}`, tone: "warn" });
      else rows.push({ label: "Output", tex: `f(${fmt(x)}) = ${info.tex.replace("x", arg)} = ${fmt(outs[0], 2)}`, tone: "good" });
      if (f.step >= 1) {
        rows.push({ label: "Domain", tex: info.domain });
        rows.push({ label: "Range", tex: info.range, tone: rule.value === "±√x" ? "warn" : "plain" });
      }
      return rows;
    },

    likes: [
      {
        title: "A vending machine",
        text: "Press B4 and you get the same snack every time; that is what makes the machine useful. Two buttons may sell the same snack, as two inputs may share an output. A button that sometimes gave crisps and sometimes a drink would be broken, as a rule with two outputs for one input is not a function.",
      },
      {
        title: "Washing, then drying",
        text: "Washing a shirt and then drying it is not the same as drying it and then washing it. Doing one job to the result of another is composition, and as with $f(g(x))$ and $g(f(x))$, the order you do them in changes what you end up with.",
      },
    ],

    uses: [
      {
        title: "A formula in a spreadsheet",
        text: "A spreadsheet cell holding the formula =2*A1+1 is the function $f(x) = 2x + 1$, with cell A1 as its input. Change A1 and the cell recomputes; the same A1 always gives the same answer. A cell whose formula uses another formula cell is a composition, worked out from the inside first.",
        tags: ["computing"],
        image: {
          src: spreadsheetCellRuleImage,
          caption: "The formula =2*A1+1 is the function f(x) = 2x + 1: put 3 in cell A1 and the cell shows 7.",
          alt: "A spreadsheet with 3 in cell A1 and 7 in cell B1, the formula bar reading =2*A1+1, and an arrow from A1 through a box labelled f to B1.",
        },
      },
      {
        title: "A dose by body weight",
        text: "A children's medicine may be dosed at 15 mg for each kilogram of body weight, so the dose is the function $d(w) = 15w$ mg. Each weight gives exactly one dose, which is why the chart can be read without doubt; a 20 kg child gets 300 mg. Its domain is limited to the weights the medicine is approved for.",
        tags: ["health"],
        image: {
          src: doseByWeightTableImage,
          caption: "A dose of 15 mg per kilogram is the function d(w) = 15w: each weight maps to one dose, so 20 kg gives 300 mg.",
          alt: "A mapping diagram from weights 10, 15, 20 and 25 kg to doses 150, 225, 300 and 375 mg, the arrow from 20 to 300 in gold, beside a medicine bottle.",
        },
      },
    ],
  };
});
