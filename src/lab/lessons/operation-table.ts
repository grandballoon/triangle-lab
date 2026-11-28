// Operations as tables. An operation is a rule taking two inputs, in order,
// to one output. Made up by a formula, it can be worked like + or ×; on a
// small set it fits in a table, where closure means every entry is back in
// the set and an equation x ∗ b = c means looking down a column.

import { C, tint } from "../draw.ts";
import { cellAt, cellBox, drawTable, num, type Operation } from "../kit/operations.ts";
import { lesson, type Readout } from "../scene.ts";
import xorParityImage from "../../images/xor-parity-table.svg";
import paintMixAverageImage from "../../images/paint-mix-average.svg";

const SET = [0, 1, 2, 3, 4] as const;
const A = C.cyan;
const B = C.pink;
const OUT = C.gold;

interface Rule extends Operation {
  /** The working for one pair, as text. */
  work: (a: number, b: number) => string;
}

const RULES = {
  "2a + b": { name: "2a + b", tex: "2a + b", of: (a, b) => 2 * a + b, work: (a, b) => `2·${a} + ${b}` },
  "a + b + ab": { name: "a + b + ab", tex: "a + b + ab", of: (a, b) => a + b + a * b, work: (a, b) => `${a} + ${b} + ${a}·${b}` },
  "a − b": { name: "a − b", tex: "a - b", of: (a, b) => a - b, work: (a, b) => `${a} − ${b}` },
  larger: { name: "the larger", tex: "\\text{the larger of } a, b", of: (a, b) => Math.max(a, b), work: (a, b) => `larger of ${a}, ${b}` },
  "ab mod 5": { name: "ab mod 5", tex: "ab \\bmod 5", of: (a, b) => (a * b) % 5, work: (a, b) => `${a}·${b} mod 5` },
} satisfies Record<string, Rule>;
type RuleName = keyof typeof RULES;

const inSet = (v: number): boolean => (SET as readonly number[]).includes(v);

export default lesson((s) => {
  const rule = s.choice("a ∗ b =", Object.keys(RULES) as RuleName[], "2a + b");
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 4, value: 3, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 4, value: 1, step: 1 });

  return {
    steps: [
      {
        title: "Two numbers in, one out",
        text: "An operation is a rule that takes two numbers, in order, and gives back one. Addition and multiplication are operations, and we can make up new ones, such as $a \\ast b = 2a + b$. Then $3 \\ast 1 = 2 \\cdot 3 + 1 = 7$, but $1 \\ast 3 = 2 \\cdot 1 + 3 = 5$: which input comes first can matter.",
      },
      {
        title: "The whole table",
        text: "On a small set the whole operation fits in a table. The row gives the first input and the column the second, so row $a$, column $b$ holds $a \\ast b$. For $2a + b$ on $\\{0, 1, 2, 3, 4\\}$ the row of 3 reads $6, 7, 8, 9, 10$, each one more than the last. Pick other rules to see their tables.",
      },
      {
        title: "Closed or not",
        text: "An operation is closed on a set when every answer lands back in the set. $2a + b$ is not closed on $\\{0, 1, 2, 3, 4\\}$, since $3 \\ast 1 = 7$ is outside it; neither is $a - b$, which gives negatives. Taking the larger of the two is closed, and so is $ab$ reduced mod 5. Answers outside the set show in red.",
      },
      {
        title: "Solving for an input",
        text: "Equations with a made-up operation are solved like any other. For $2a + b$, the equation $x \\ast 2 = 10$ says $2x + 2 = 10$, so $x = 4$; in the table, the entry 10 sits in column 2 of row 4. Other rules can give several answers or none: with the larger of two, $x \\ast 3 = 3$ holds for $x = 0, 1, 2$ and 3.",
      },
    ],

    draw(g, f) {
      const op = RULES[rule.value];
      const [X, Y] = [a.value, b.value];
      const V = op.of(X, Y);

      const note = (row: number, text: string, color: string, alpha = 1, size = 18): void => {
        g.label({ x: 0.6, y: 3 - row * 0.9 }, text, { color, size, bold: true, align: "left", alpha });
      };

      if (f.step === 0) {
        // A machine: two inputs go in, one answer comes out.
        const box = (c: { x: number; y: number }, w: number, h: number, color: string, text: string, size = 22): void => {
          g.polygon([{ x: c.x - w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y + h / 2 }, { x: c.x - w / 2, y: c.y + h / 2 }], { color, fill: tint(color, 0.18), width: 2.5 });
          g.label(c, text, { color, size, bold: true });
        };
        const inA = { x: -6.6, y: 2 };
        const inB = { x: -6.6, y: -1 };
        const mid = { x: -4, y: 0.5 };
        const out = { x: -1.4, y: 0.5 };
        g.arrow({ x: inA.x + 0.6, y: inA.y - 0.3 }, { x: mid.x - 0.9, y: mid.y + 0.35 }, { color: A, width: 2.5 });
        g.arrow({ x: inB.x + 0.6, y: inB.y + 0.3 }, { x: mid.x - 0.9, y: mid.y - 0.35 }, { color: B, width: 2.5 });
        g.arrow({ x: mid.x + 0.9, y: mid.y }, { x: out.x - 0.75, y: out.y }, { color: OUT, width: 2.5, alpha: f.at(0) });
        box(inA, 1.2, 1, A, String(X));
        box(inB, 1.2, 1, B, String(Y));
        box(mid, 1.8, 1.6, C.ink, "∗", 30);
        box(out, 1.4, 1, OUT, num(V));
        g.label({ x: inA.x, y: inA.y + 0.85 }, "first", { color: A, size: 14, bold: true });
        g.label({ x: inB.x, y: inB.y - 0.85 }, "second", { color: B, size: 14, bold: true });
        note(0, `a ∗ b = ${op.name}`, C.ink);
        note(1, `${X} ∗ ${Y} = ${op.work(X, Y)} = ${num(V)}`, OUT, f.at(0));
        note(2, `${Y} ∗ ${X} = ${op.work(Y, X)} = ${num(op.of(Y, X))}`, C.dim, f.at(0), 16);
        return;
      }

      const table = { at: { x: -7.4, y: 3.4 }, cell: 0.95, set: SET };
      const column = f.step === 3;
      drawTable(g, {
        ...table,
        of: op.of,
        symbol: "∗",
        fill: (r, c) => (column && c === Y ? tint(B, 0.14) : !column && r === X ? tint(A, 0.12) : undefined),
        color: (r, c) => (f.step === 2 && !inSet(op.of(r, c)) ? C.red : f.step === 3 && op.of(r, c) === V ? OUT : undefined),
        size: 16,
      });
      // The chosen pair: its row and column headers, and its cell.
      g.polygon(cellBox(table, X, Y, 0.04), { color: OUT, width: 3, stroke: OUT });
      g.label({ x: table.at.x + table.cell / 2 - 0.62, y: cellAt(table, X, Y).y }, "a", { color: A, size: 14, bold: true });
      g.label({ x: cellAt(table, X, Y).x, y: table.at.y + 0.32 }, "b", { color: B, size: 14, bold: true });

      note(0, `a ∗ b = ${op.name}`, C.ink);
      if (f.step === 1) {
        note(1, `${X} ∗ ${Y} = ${num(V)}`, OUT, f.at(1));
        note(2, `row ${X}: ${SET.map((c) => num(op.of(X, c))).join(", ")}`, A, f.at(1), 16);
        return;
      }
      if (f.step === 2) {
        const outside = SET.flatMap((r) => SET.filter((c) => !inSet(op.of(r, c))).map((c) => [r, c] as const));
        const closed = outside.length === 0;
        note(1, closed ? "every answer is in {0, …, 4}" : `${outside.length} of 25 answers are outside`, closed ? C.green : C.red, f.at(2), 16);
        note(2, closed ? "closed" : "not closed", closed ? C.green : C.red, f.at(2), 20);
        if (!closed) {
          const [r, c] = outside[0];
          note(3, `e.g. ${r} ∗ ${c} = ${num(op.of(r, c))}`, C.red, f.at(2), 16);
        }
        return;
      }
      const rows = SET.filter((r) => op.of(r, Y) === V);
      note(1, `x ∗ ${Y} = ${num(V)}`, OUT, f.at(3));
      note(2, rows.length === 1 ? `one solution: x = ${rows[0]}` : `${rows.length} solutions: x = ${rows.join(", ")}`, rows.length === 1 ? C.green : C.orange, f.at(3), 16);
    },

    readout(f) {
      const op = RULES[rule.value];
      const [X, Y] = [a.value, b.value];
      const V = op.of(X, Y);
      const rows: Readout[] = [{ label: "Rule", tex: `a \\ast b = ${op.tex}` }];
      if (f.step === 3) {
        const sols = SET.filter((r) => op.of(r, Y) === V);
        rows.push({ label: "Solutions", tex: `x \\ast ${Y} = ${V} \\iff x \\in \\{${sols.join(", ")}\\}`, tone: "good" });
      } else if (f.step === 2) {
        const closed = SET.every((r) => SET.every((c) => inSet(op.of(r, c))));
        rows.push({ label: "Closed", tex: closed ? "\\text{yes: every entry is in } \\{0, \\ldots, 4\\}" : "\\text{no}", tone: closed ? "good" : "warn" });
      } else {
        rows.push({ label: "This pair", tex: `${X} \\ast ${Y} = ${V}`, tone: "good" });
        rows.push({ label: "Swapped", tex: `${Y} \\ast ${X} = ${op.of(Y, X)}`, tone: op.of(Y, X) === V ? "good" : "dim" });
      }
      return rows;
    },

    likes: [
      {
        title: "A recipe card",
        text: "A recipe takes ingredients and gives one dish, and the card says exactly what to do with them. Write a new card and you have a new dish; write a new rule for two numbers and you have a new operation.",
      },
      {
        title: "A mileage chart",
        text: "The distance chart in a road atlas is a table of an operation: find one town's row and the other's column, and the box where they cross holds the answer. Every pair has its box, so nothing needs working out on the road.",
      },
    ],

    uses: [
      {
        title: "Parity bits",
        text: "Computers combine bits with exclusive or: $a \\oplus b$ is 1 when exactly one of $a$ and $b$ is 1, and 0 otherwise. Its table on $\\{0, 1\\}$ is closed, and it is addition mod 2. A parity bit is the exclusive or of all the data bits, so flipping any single bit changes it and the error shows.",
        tags: ["computing"],
        image: {
          src: xorParityImage,
          caption: "Exclusive or on the bits 0 and 1 gives a bit back: 1 when exactly one input is 1. The parity bit of 1011 is 1 ⊕ 0 ⊕ 1 ⊕ 1 = 1.",
          alt: "A two-by-two table for exclusive or with rows and columns 0 and 1 and entries 0, 1, 1, 0, beside the bits 1 0 1 1 and a gold parity bit 1.",
        },
      },
      {
        title: "Mixing paint by halves",
        text: "Mix equal amounts of two greys and the shade lands halfway: on a scale from 0 (white) to 100 (black), $a \\ast b = \\frac{a + b}{2}$. Shades 20 and 60 make 40. Mixing is closed, since the result is always a grey between the two, and the order the tins are poured makes no difference.",
        tags: ["art", "home"],
        image: {
          src: paintMixAverageImage,
          caption: "Equal parts of shade 20 and shade 60 make shade 40, halfway between: mixing is the operation a ∗ b = (a + b) ÷ 2.",
          alt: "Two paint tins of light and dark grey labelled 20 and 60 pour into a gold-rimmed tin labelled 40, above a scale from 0 to 100 with 40 marked halfway between 20 and 60.",
        },
      },
    ],
  };
});
