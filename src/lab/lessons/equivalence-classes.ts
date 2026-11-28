// Equivalence classes. A relation that is reflexive, symmetric and
// transitive sorts its set into classes of mutually related elements; two
// classes are equal or disjoint, so the classes partition the set. Without
// transitivity the "classes" overlap and no such sorting exists.

import { C, tint } from "../draw.ts";
import { lerp, type Vec } from "../geo.ts";
import { lesson, type Readout } from "../scene.ts";
import socksSortedImage from "../../images/socks-sorted-classes.svg";
import circuitNodesImage from "../../images/circuit-nodes-classes.svg";

const N = 12;
const SET = Array.from({ length: N }, (_, k) => k + 1);
const COLOURS = [C.cyan, C.pink, C.green, C.violet, C.orange, C.blue];
const GOLD = C.gold;
const ROW_Y = -1.4;

const inRow = (k: number): Vec => ({ x: -7.2 + (k - 1) * 0.85, y: ROW_Y });
const inColumn = (k: number, m: number): Vec => ({ x: -6.6 + ((k - 1) % m) * 1.55, y: 2.6 - Math.floor((k - 1) / m) * 0.95 });

/** An arch from p to q, rising with the distance between them. */
function arch(p: Vec, q: Vec): Vec[] {
  const h = Math.min(3, 0.45 * Math.abs(q.x - p.x));
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return { x: p.x + (q.x - p.x) * t, y: p.y + 0.25 + h * 4 * t * (1 - t) };
  });
}

export default lesson((s) => {
  const m = s.slider({ label: "m =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 6, value: 3, step: 1 });
  const a = s.slider({ label: "a =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 12, value: 5, step: 1 });

  const classOf = (k: number, M: number): number[] => SET.filter((j) => (j - k) % M === 0);

  return {
    steps: [
      {
        title: "Equivalence relations",
        text: "A relation that is reflexive, symmetric and transitive is an equivalence relation: it says two things are alike in some respect. Having the same remainder mod $m$ is one. On $\\{1, 2, \\ldots, 12\\}$ with $m = 3$ it relates 1, 4, 7 and 10 to one another, since they differ by multiples of 3, and every number to itself.",
      },
      {
        title: "Classes",
        text: "The equivalence class of $a$, written $[a]$, is the set of everything related to $a$. Mod 3, $[1] = \\{1, 4, 7, 10\\}$, $[2] = \\{2, 5, 8, 11\\}$ and $[3] = \\{3, 6, 9, 12\\}$. Within a class everything is related to everything else, by symmetry and transitivity, so $[4]$ is the same class as $[1]$: any member can name it.",
      },
      {
        title: "A partition",
        text: "Two classes are either the same or have nothing in common: if $c$ were in both $[a]$ and $[b]$, then $a \\sim c$ and $c \\sim b$, so $a \\sim b$ and $[a] = [b]$. So the classes cut the set into pieces that cover it without overlapping, a partition; mod $m$ there are $m$ of them, one for each remainder. Any partition works backwards too: being in the same piece is an equivalence relation.",
      },
      {
        title: "When transitivity fails",
        text: "Try $a \\sim b$ when $|a - b| \\le 1$. It is reflexive and symmetric but not transitive, and its would-be classes overlap: the numbers related to 5 are $\\{4, 5, 6\\}$, those related to 6 are $\\{5, 6, 7\\}$, and they share 5 and 6 without being equal. So this relation cannot sort the set into classes.",
      },
    ],

    draw(g, f) {
      const M = m.value;
      const A = a.value;
      const mine = classOf(A, M);
      const colour = (k: number): string => COLOURS[(k - 1) % M];

      const note = (row: number, text: string, color: string, alpha = 1, size = 17): void => {
        g.label({ x: 2.7, y: 3 - row * 0.85 }, text, { color, size, bold: true, align: "left", alpha });
      };

      if (f.step === 0) {
        for (const p of SET) {
          for (const q of SET) {
            if (q <= p || (q - p) % M !== 0) continue;
            const lit = mine.includes(p);
            g.path(arch(inRow(p), inRow(q)), { color: lit ? GOLD : C.faint, width: lit ? 2.5 : 1.5, alpha: lit ? f.at(0) : 1 });
          }
        }
        for (const k of SET) {
          g.point(inRow(k), { color: mine.includes(k) ? GOLD : C.ink, r: 7 });
          g.label(inRow(k), String(k), { color: mine.includes(k) ? GOLD : C.ink, size: 15, bold: true, dy: -20 });
        }
        note(0, `a ∼ b when ${M} divides a − b`, C.ink, 1, 15);
        note(1, `related to ${A}:`, GOLD, f.at(0), 15);
        note(2, mine.join(", "), GOLD, f.at(0));
        return;
      }

      if (f.step === 3) {
        const [p, q] = A < N ? [A, A + 1] : [A - 1, A];
        const near = (k: number): number[] => SET.filter((j) => Math.abs(j - k) <= 1);
        const P = near(p);
        const Q = near(q);
        const band = (ks: number[], y0: number, y1: number, color: string): void => {
          const x0 = inRow(ks[0]).x - 0.35;
          const x1 = inRow(ks[ks.length - 1]).x + 0.35;
          g.polygon([{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], { color, fill: tint(color, 0.14), width: 2.5 });
        };
        band(P, ROW_Y - 0.45, ROW_Y + 0.85, C.cyan);
        band(Q, ROW_Y - 0.85, ROW_Y + 0.45, C.pink);
        for (const k of SET) {
          const both = P.includes(k) && Q.includes(k);
          g.point(inRow(k), { color: both ? GOLD : C.ink, r: 7 });
          g.label(inRow(k), String(k), { color: both ? GOLD : C.ink, size: 15, bold: true, dy: 34 });
        }
        g.label({ x: inRow(P[0]).x - 0.2, y: ROW_Y + 1.25 }, `related to ${p}`, { color: C.cyan, size: 14, bold: true, align: "left" });
        g.label({ x: inRow(Q[Q.length - 1]).x + 0.2, y: ROW_Y - 1.35 }, `related to ${q}`, { color: C.pink, size: 14, bold: true, align: "right" });
        note(0, "a ∼ b when |a − b| ≤ 1", C.ink, 1, 15);
        note(1, `{${P.join(", ")}} and {${Q.join(", ")}}`, C.ink, f.at(3), 15);
        note(2, `share ${P.filter((k) => Q.includes(k)).join(" and ")}`, GOLD, f.at(3), 15);
        note(3, "but are not equal:", C.red, f.at(3), 15);
        note(4, "no classes", C.red, f.at(3), 20);
        return;
      }

      // Steps 1 and 2: the numbers walk from the row into their classes.
      const t = f.step === 1 ? f.at(1) : 1;
      if (f.step === 2) {
        for (let r = 0; r < M; r++) {
          const k = r + 1;
          const bottom = inColumn(classOf(k, M).at(-1)!, M);
          const top = inColumn(k, M);
          const w = 0.62;
          g.polygon([{ x: top.x - w, y: bottom.y - 0.45 }, { x: top.x + w, y: bottom.y - 0.45 }, { x: top.x + w, y: top.y + 0.75 }, { x: top.x - w, y: top.y + 0.75 }], { color: colour(k), fill: tint(colour(k), 0.12), width: 2, alpha: f.at(2) });
          g.label({ x: top.x, y: top.y + 0.42 }, `[${k}]`, { color: colour(k), size: 14, bold: true, alpha: f.at(2) });
        }
      }
      for (const k of SET) {
        const at = lerp(inRow(k), inColumn(k, M), t);
        const lit = mine.includes(k);
        g.point(at, { color: lit ? GOLD : colour(k), r: 6 });
        g.label(at, String(k), { color: lit ? GOLD : C.ink, size: 15, bold: true, dx: 18, align: "left" });
      }
      note(0, `same remainder mod ${M}`, C.ink, 1, 15);
      if (f.step === 1) {
        note(1, `[${A}] = {${mine.join(", ")}}`, GOLD, f.at(1), 16);
        note(2, `= [${mine[0]}]`, GOLD, f.at(1), 16);
      } else {
        note(1, `${M} classes, no overlaps`, C.green, f.at(2), 16);
        note(2, `sizes ${Array.from({ length: M }, (_, r) => classOf(r + 1, M).length).join(" + ")} = 12`, C.dim, f.at(2), 15);
      }
    },

    readout(f) {
      const M = m.value;
      const A = a.value;
      if (f.step === 3) {
        const x = Math.min(A, N - 2);
        return [
          { label: "Relation", tex: "a \\sim b \\iff |a - b| \\le 1" },
          { label: "Not transitive", tex: `${x} \\sim ${x + 1}, \\ ${x + 1} \\sim ${x + 2}, \\ \\text{but } ${x} \\not\\sim ${x + 2}`, tone: "warn" },
        ];
      }
      const rows: Readout[] = [
        { label: "Relation", tex: `a \\sim b \\iff ${M} \\mid a - b` },
        { label: "Class", tex: `[${A}] = \\{${classOf(A, M).join(", ")}\\}`, tone: "good" },
      ];
      if (f.step === 2) rows.push({ label: "Classes", tex: `${M} \\text{, one for each remainder}`, tone: "good" });
      return rows;
    },

    likes: [
      {
        title: "Sorting the recycling",
        text: "Put everything made of the same material in the same bin. Every item goes in exactly one bin, and two items share a bin exactly when they are alike in that one respect: the bins are the classes.",
      },
      {
        title: "Shirts of the same colour",
        text: "On a sports day, everyone wearing the same colour shirt is on the same team. Any player can stand for the team, and no player is on two teams at once.",
      },
    ],

    uses: [
      {
        title: "Pairing socks",
        text: "Call two socks related when they are of the same kind. That is an equivalence relation, so sorting a basket of washing into piles of matching socks always works: each sock lands in one pile, and any sock from a pile can be held up to find the rest of it. A pile of one is an odd sock, a class of its own.",
        tags: ["home"],
        image: {
          src: socksSortedImage,
          caption: "Matching kind is an equivalence relation, so a basket of socks sorts into piles that never overlap; an odd sock is a class of one.",
          alt: "A jumble of nine socks above three piles of striped, spotted and plain socks, and a single gold zigzag sock in a box of its own labelled class of 1.",
        },
      },
      {
        title: "Nodes in a circuit",
        text: "In a circuit diagram, call two points related when a wire joins them, directly or through other wires. That is an equivalence relation, and its classes are the circuit's nodes: every point of a node is at the same voltage, so a circuit with dozens of wire ends may have only three or four nodes to analyse.",
        tags: ["electrical"],
        image: {
          src: circuitNodesImage,
          caption: "Points joined by wire are at the same voltage. The classes of joined-by-wire are the nodes, here three: top, middle and the bottom rail.",
          alt: "A circuit with a battery and four resistors, its wires shaded by node: a white top wire, a gold middle node and a grey bottom rail, with ten wire ends marked.",
        },
      },
    ],
  };
});
