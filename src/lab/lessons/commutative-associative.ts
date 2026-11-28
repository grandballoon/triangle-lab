// Commutative and associative. An operation is commutative when swapping the
// inputs never changes the answer, which in its table is symmetry across the
// main diagonal. It is associative when regrouping never does, which the
// table shows only by chasing one entry into another. Neither property
// follows from the other.

import { C, tint } from "../draw.ts";
import { cellAt, cellBox, drawTable, num, ungrouped, unswapped, type Operation } from "../kit/operations.ts";
import { lesson, type Readout } from "../scene.ts";
import rockPaperScissorsImage from "../../images/rock-paper-scissors-table.svg";
import discountOrderImage from "../../images/discount-order-checkout.svg";

const SET = [0, 1, 2, 3, 4] as const;
const FIRST = C.cyan;
const SECOND = C.pink;
const GOLD = C.gold;

const RULES = {
  "a − b": { name: "a − b", tex: "a - b", of: (a, b) => a - b },
  "a + b": { name: "a + b", tex: "a + b", of: (a, b) => a + b },
  "2a + b": { name: "2a + b", tex: "2a + b", of: (a, b) => 2 * a + b },
  "|a − b|": { name: "|a − b|", tex: "|a - b|", of: (a, b) => Math.abs(a - b) },
  first: { name: "a (the first)", tex: "a", of: (a) => a },
  "a + b + ab": { name: "a + b + ab", tex: "a + b + ab", of: (a, b) => a + b + a * b },
} satisfies Record<string, Operation>;
type RuleName = keyof typeof RULES;

const onTable = (v: number): boolean => (SET as readonly number[]).includes(v);

export default lesson((s) => {
  const rule = s.choice("a ∗ b =", Object.keys(RULES) as RuleName[], "a − b");
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 0, max: 4, value: 4, step: 1 });
  const b = s.slider({ label: "b =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 0, max: 4, value: 2, step: 1 });
  const c = s.slider({ label: "c =", at: { x: 0, y: -4.3 }, width: 2.8, min: 0, max: 4, value: 1, step: 1 });

  return {
    steps: [
      {
        title: "Swapping the inputs",
        text: "An operation is commutative when $a \\ast b = b \\ast a$ for every $a$ and $b$. In the table, $a \\ast b$ sits in row $a$, column $b$ and $b \\ast a$ in row $b$, column $a$: mirror images across the diagonal from top left to bottom right. So the operation is commutative exactly when its table is symmetric about that diagonal. Addition is; subtraction is not, since $4 - 2 = 2$ but $2 - 4 = -2$.",
      },
      {
        title: "Regrouping",
        text: "An operation is associative when $(a \\ast b) \\ast c = a \\ast (b \\ast c)$ for every $a$, $b$ and $c$. Subtraction is not: $(4 - 2) - 1 = 1$ but $4 - (2 - 1) = 3$. The table cannot show this at a glance; you work one entry out, then look it up again in another row or column.",
      },
      {
        title: "One without the other",
        text: "The two properties are separate. $a \\ast b = |a - b|$ is commutative, but $(1 \\ast 2) \\ast 3 = 1 \\ast 3 = 2$ while $1 \\ast (2 \\ast 3) = 1 \\ast 1 = 0$. Keeping the first input, $a \\ast b = a$, is associative, since both groupings give $a$, but $1 \\ast 2 = 1$ and $2 \\ast 1 = 2$.",
      },
      {
        title: "Any order, any grouping",
        text: "When an operation has both properties, as $+$ and $\\times$ do, a long string of it can be reordered and regrouped at will, which is why $7 + 9 + 3$ may be added as $(7 + 3) + 9$. One counterexample is enough to show a property fails, but showing it holds takes an argument for all inputs: $a + b + ab$ has both, because $a \\ast b + 1 = (a + 1)(b + 1)$.",
      },
    ],

    draw(g, f) {
      const op = RULES[rule.value];
      const [X, Y, Z] = [a.value, b.value, c.value];
      const table = { at: { x: -7.4, y: 3.4 }, cell: 0.85, set: SET };

      const note = (row: number, text: string, color: string, alpha = 1, size = 17): void => {
        g.label({ x: -1.6, y: 3 - row * 0.85 }, text, { color, size, bold: true, align: "left", alpha });
      };

      const mirrored = f.step === 0 || f.step === 3;
      drawTable(g, {
        ...table,
        of: op.of,
        symbol: "∗",
        size: 15,
        color: (r, k) => (mirrored && op.of(r, k) !== op.of(k, r) ? C.red : undefined),
        fill: (r, k) => (mirrored && r === k ? tint(C.ink, 0.06) : undefined),
      });

      if (mirrored) {
        const n = SET.length;
        const from = { x: table.at.x + table.cell, y: table.at.y - table.cell };
        const to = { x: table.at.x + (n + 1) * table.cell, y: table.at.y - (n + 1) * table.cell };
        g.segment(from, to, { color: GOLD, width: 2, dash: [6, 5], alpha: f.at(0) });
        g.polygon(cellBox(table, X, Y, 0.04), { color: FIRST, width: 3 });
        g.polygon(cellBox(table, Y, X, 0.1), { color: SECOND, width: 3 });
        const [p, q] = [op.of(X, Y), op.of(Y, X)];
        note(0, `a ∗ b = ${op.name}`, C.ink);
        note(1, `${X} ∗ ${Y} = ${num(p)}`, FIRST);
        note(2, `${Y} ∗ ${X} = ${num(q)}`, SECOND);
        const bad = unswapped(op, SET);
        note(3, bad.length === 0 ? "symmetric: commutative" : `${bad.length} of 10 mirror pairs differ`, bad.length === 0 ? C.green : C.red, f.at(f.step), 16);
        if (f.step === 3) {
          const ungroupedCount = ungrouped(op, SET).length;
          note(4, ungroupedCount === 0 ? "every regrouping agrees" : `${ungroupedCount} of 125 regroupings differ`, ungroupedCount === 0 ? C.green : C.red, f.at(3), 16);
          note(5, "(checked on 0 to 4)", C.dim, f.at(3), 14);
        }
        return;
      }

      // Chase both groupings through the table.
      const ab = op.of(X, Y);
      const bc = op.of(Y, Z);
      const left = op.of(ab, Z);
      const right = op.of(X, bc);
      g.polygon(cellBox(table, X, Y, 0.04), { color: FIRST, width: 3 });
      if (onTable(ab)) g.polygon(cellBox(table, ab, Z, 0.04), { color: FIRST, width: 3, dash: [5, 4], alpha: f.at(f.step) });
      g.polygon(cellBox(table, Y, Z, 0.1), { color: SECOND, width: 3 });
      if (onTable(bc)) g.polygon(cellBox(table, X, bc, 0.1), { color: SECOND, width: 3, dash: [5, 4], alpha: f.at(f.step) });
      if (onTable(ab)) g.arrow(cellAt(table, X, Y), cellAt(table, ab, Z), { color: FIRST, width: 2, alpha: f.at(f.step) * 0.8 });
      if (onTable(bc)) g.arrow(cellAt(table, Y, Z), cellAt(table, X, bc), { color: SECOND, width: 2, alpha: f.at(f.step) * 0.8 });

      note(0, `a ∗ b = ${op.name}`, C.ink);
      note(1, `(${X} ∗ ${Y}) ∗ ${Z} = ${num(ab)} ∗ ${Z} = ${num(left)}`, FIRST);
      note(2, `${X} ∗ (${Y} ∗ ${Z}) = ${X} ∗ ${num(bc)} = ${num(right)}`, SECOND);
      note(3, left === right ? "these agree" : "these differ: not associative", left === right ? C.green : C.red, f.at(f.step), 16);
      if (!onTable(ab) || !onTable(bc)) note(4, "an answer is off the table: work it out", C.dim, f.at(f.step), 14);
      if (f.step === 2) {
        const swaps = unswapped(op, SET).length;
        note(5, swaps === 0 ? "and the table is symmetric" : "and the table is not symmetric", swaps === 0 ? C.green : C.orange, f.at(2), 15);
      }
    },

    readout(f) {
      const op = RULES[rule.value];
      const [X, Y, Z] = [a.value, b.value, c.value];
      const rows: Readout[] = [{ label: "Rule", tex: `a \\ast b = ${op.tex}` }];
      if (f.step === 0) {
        const [p, q] = [op.of(X, Y), op.of(Y, X)];
        rows.push({ label: "Swap", tex: `${X} \\ast ${Y} = ${p}, \\quad ${Y} \\ast ${X} = ${q}`, tone: p === q ? "good" : "warn" });
      } else {
        const [l, r] = [op.of(op.of(X, Y), Z), op.of(X, op.of(Y, Z))];
        rows.push({ label: "Regroup", tex: `(${X} \\ast ${Y}) \\ast ${Z} = ${l}, \\quad ${X} \\ast (${Y} \\ast ${Z}) = ${r}`, tone: l === r ? "good" : "warn" });
      }
      const comm = unswapped(op, SET).length === 0;
      const assoc = ungrouped(op, SET).length === 0;
      rows.push({ label: "On 0 to 4", tex: `\\text{commutative: ${comm ? "yes" : "no"}, associative: ${assoc ? "yes" : "no"}}`, tone: "dim" });
      return rows;
    },

    likes: [
      {
        title: "Socks and shoes",
        text: "Putting on socks and then shoes is not the same as shoes and then socks: dressing is not commutative. Pouring milk into tea or tea into milk ends in the same cup, and that one is.",
      },
      {
        title: "Loading a dishwasher",
        text: "Whether you add the forks to the spoons and then the knives, or the spoons and knives first and the forks after, the same cutlery ends up in the basket. Grouping does not matter, which is what associative means.",
      },
    ],

    uses: [
      {
        title: "Rock, paper, scissors",
        text: "Let $a \\ast b$ be the winner of $a$ against $b$, or $a$ itself on a tie. The table is symmetric, since a match has the same winner whichever player is named first, so the operation is commutative. It is not associative: $(\\text{rock} \\ast \\text{paper}) \\ast \\text{scissors}$ is scissors, but $\\text{rock} \\ast (\\text{paper} \\ast \\text{scissors})$ is rock. That is why a three-player knockout depends on who plays first.",
        tags: ["game-design"],
        image: {
          src: rockPaperScissorsImage,
          caption: "The winner of a game of rock, paper, scissors does not depend on who is named first, but in a knockout of three the order of the games decides who wins.",
          alt: "A three-by-three table of rock, paper and scissors, symmetric about a gold diagonal, beside (rock ∗ paper) ∗ scissors = scissors and rock ∗ (paper ∗ scissors) = rock.",
        },
      },
      {
        title: "Stacking two discounts",
        text: "A shop offers 20% off and a 10-dollar coupon. On a 50-dollar item, taking 20% off first leaves 40, then the coupon leaves 30; the coupon first leaves 40, then 20% off leaves 32. Applying discounts in turn is an operation on prices that is not commutative, so the order at the till matters.",
        tags: ["money"],
        image: {
          src: discountOrderImage,
          caption: "On a 50-dollar item, 20% off then 10 dollars off comes to 30 dollars; 10 dollars off then 20% off comes to 32 dollars.",
          alt: "Two receipts for a 50-dollar item. The first takes 20% off then 10 dollars off and ends at a gold 30; the second takes 10 dollars off then 20% off and ends at 32.",
        },
      },
    ],
  };
});
