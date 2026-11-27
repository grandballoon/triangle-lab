// Multiplying probabilities. A unit square stands for every outcome, with
// area as probability. An event A takes a strip of width p; an independent
// event B cuts every column at the same height q, so A and B together take a
// rectangle of area pq. Neither happening is (1 − p)(1 − q), and at least
// one is 1 minus that. When the second chance depends on the first, as in
// drawing without replacement, the columns are cut at different heights, but
// each piece is still the first probability times the second.

import { C, tint, type Draw } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import backupPumpFailureImage from "../../images/backup-pump-failure.svg";
import fourRollsNoSixImage from "../../images/four-rolls-no-six.svg";

const A = C.cyan;
const B = C.pink;
const BOTH = C.gold;
const NONE = C.violet;

const O: Vec = { x: -7.2, y: -2.6 };
const SIDE = 5.6;

const at = (u: number, v: number): Vec => ({ x: O.x + u * SIDE, y: O.y + v * SIDE });

/** The part of the unit square from (u0, v0) to (u1, v1). */
function piece(g: Draw, u0: number, v0: number, u1: number, v1: number, color: string, alpha: number, name?: string): void {
  if (u1 - u0 < 1e-9 || v1 - v0 < 1e-9) return;
  box(g, at(u0, v0), at(u1, v1), { color, fill: tint(color, 0.4), width: 2, alpha });
  if (name && (u1 - u0) * SIDE > 1.2 && (v1 - v0) * SIDE > 0.5) {
    g.label(at((u0 + u1) / 2, (v0 + v1) / 2), name, { color: C.ink, size: 14, bold: true, alpha });
  }
}

export default lesson((s) => {
  const p = s.slider({ label: "P(A) =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 1, value: 0.5, step: 0.05, format: (v) => fmt(v, 2) });
  const q = s.slider({ label: "P(B) =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 1, value: 0.4, step: 0.05, format: (v) => fmt(v, 2) });

  return {
    steps: [
      {
        title: "Probability as area",
        text: "Let a unit square stand for every possible outcome, so that the probability of an event is the area it covers. An event $A$ with probability $p$ takes a strip of width $p$ and height 1; the rest, of area $1 - p$, is $\\text{not } A$.",
      },
      {
        title: "Independent events multiply",
        text: "Events are independent when one happening does not change the chance of the other. Then $B$ takes the same fraction $q$ of every column, so $A$ and $B$ together take a $p \\times q$ rectangle: $P(A \\text{ and } B) = P(A) \\cdot P(B)$. A coin landing heads and a die showing 6 have probability $\\frac{1}{2} \\cdot \\frac{1}{6} = \\frac{1}{12}$.",
      },
      {
        title: "Neither, and at least one",
        text: "The corner where neither happens has area $(1 - p)(1 - q)$, so $P(\\text{at least one}) = 1 - (1 - p)(1 - q)$. With $p = 0.5$ and $q = 0.4$, neither has probability $0.5 \\cdot 0.6 = 0.3$ and at least one $0.7$, not $0.5 + 0.4 = 0.9$: adding counts the corner where both happen twice.",
      },
      {
        title: "When the second depends on the first",
        text: "Draw two marbles without putting the first back, from a bag of 3 red and 2 blue. The first is red with probability $\\frac{3}{5}$; then 2 of the 4 left are red. So $P(\\text{both red}) = \\frac{3}{5} \\cdot \\frac{2}{4} = \\frac{3}{10}$. Each column is cut at its own height, but each piece is still the first probability times the second, given the first. The sliders rest in this step.",
      },
    ],

    draw(g, f) {
      const [P, Q] = [p.value, q.value];
      box(g, at(0, 0), at(1, 1), { color: C.dim, width: 2 });
      g.label(at(0, 0), "0", { color: C.dim, size: 12, dy: -14 });
      g.label(at(1, 0), "1", { color: C.dim, size: 12, dy: -14 });
      g.label(at(0, 1), "1", { color: C.dim, size: 12, dx: -12 });

      const note = (row: number, text: string, color: string, alpha = 1): void => {
        g.label({ x: -0.8, y: 3.4 - row * 0.8 }, text, { color, size: 17, bold: true, align: "left", alpha });
      };

      if (f.step === 3) {
        const [w, hRed, hBlue] = [3 / 5, 2 / 4, 3 / 4];
        piece(g, 0, 0, w, hRed, BOTH, 1, "red, red");
        piece(g, 0, hRed, w, 1, A, 1, "red, blue");
        piece(g, w, 0, 1, hBlue, B, 1, "blue, red");
        piece(g, w, hBlue, 1, 1, NONE, 1, "blue, blue");
        g.label(at(w / 2, 1), "first red 3/5", { color: C.ink, size: 13, bold: true, dy: 12 });
        g.label(at((1 + w) / 2, 1), "blue 2/5", { color: C.ink, size: 13, bold: true, dy: 12 });
        note(0, "3 red, 2 blue, no replacing", C.ink);
        note(1, "red then red: 3/5 × 2/4 = 3/10", BOTH, f.at(3));
        note(2, "blue then red: 2/5 × 3/4 = 3/10", B, f.at(3));
        note(3, "red then blue: 3/5 × 2/4 = 3/10", A, f.at(3));
        note(4, "blue then blue: 2/5 × 1/4 = 1/10", NONE, f.at(3));
        return;
      }

      if (f.step === 0) {
        piece(g, 0, 0, P, 1, A, f.at(0), "A");
        piece(g, P, 0, 1, 1, C.faint, f.at(0), "not A");
        g.label(at(P / 2, 0), `p = ${fmt(P, 2)}`, { color: A, size: 13, bold: true, dy: -28 });
        note(0, `P(A) = ${fmt(P, 2)}`, A);
        note(1, `P(not A) = 1 − ${fmt(P, 2)} = ${fmt(1 - P, 2)}`, C.dim, f.at(0));
        return;
      }

      // A by columns, B by rows.
      piece(g, 0, 0, P, Q, BOTH, 1, "A and B");
      piece(g, 0, Q, P, 1, A, 1, "A only");
      piece(g, P, 0, 1, Q, B, 1, "B only");
      piece(g, P, Q, 1, 1, f.step === 2 ? NONE : C.faint, 1, "neither");
      g.label(at(P / 2, 0), `p = ${fmt(P, 2)}`, { color: A, size: 13, bold: true, dy: -28 });
      g.label(at(1, Q / 2), `q = ${fmt(Q, 2)}`, { color: B, size: 13, bold: true, dx: 10, align: "left" });

      if (f.step === 1) {
        note(0, `P(A and B) = ${fmt(P, 2)} × ${fmt(Q, 2)} = ${fmt(P * Q, 4)}`, BOTH, f.at(1));
        note(1, "B takes the same share of each column", C.dim, f.at(1));
        return;
      }
      const none = (1 - P) * (1 - Q);
      note(0, `neither: ${fmt(1 - P, 2)} × ${fmt(1 - Q, 2)} = ${fmt(none, 4)}`, NONE, f.at(2));
      note(1, `at least one: 1 − ${fmt(none, 4)} = ${fmt(1 - none, 4)}`, C.ink, f.at(2));
      note(2, `not p + q = ${fmt(P + Q, 2)}`, C.dim, f.at(2));
    },

    readout(f) {
      const [P, Q] = [p.value, q.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Complement", tex: `P(\\text{not } A) = 1 - ${fmt(P, 2)} = ${fmt(1 - P, 2)}` });
      } else if (f.step === 1) {
        rows.push({ label: "Both", tex: `P(A \\text{ and } B) = ${fmt(P, 2)} \\cdot ${fmt(Q, 2)} = ${fmt(P * Q, 4)}`, tone: "good" });
      } else if (f.step === 2) {
        const none = (1 - P) * (1 - Q);
        rows.push({ label: "Neither", tex: `(1 - ${fmt(P, 2)})(1 - ${fmt(Q, 2)}) = ${fmt(none, 4)}` });
        rows.push({ label: "At least one", tex: `1 - ${fmt(none, 4)} = ${fmt(1 - none, 4)}`, tone: "good" });
      } else {
        rows.push({ label: "Both red", tex: "\\frac{3}{5} \\cdot \\frac{2}{4} = \\frac{3}{10}", tone: "good" });
        rows.push({ label: "All four", tex: "\\frac{3}{10} + \\frac{3}{10} + \\frac{3}{10} + \\frac{1}{10} = 1" });
      }
      return rows;
    },

    likes: [
      {
        title: "Two traffic lights",
        text: "If one light is green half the time and the next, timed on its own, is green 40% of the time, you meet both green on 20% of trips. If the lights are timed together, the second chance depends on the first and the plain product no longer applies.",
      },
      {
        title: "Picking socks in the dark",
        text: "With 3 black socks and 2 white in a drawer, the first sock you pull out changes what is left for the second. That is why two black socks come out with probability $\\frac{3}{5} \\cdot \\frac{2}{4}$ rather than $\\frac{3}{5} \\cdot \\frac{3}{5}$.",
      },
    ],

    uses: [
      {
        title: "A backup pump",
        text: "A sump with two pumps, each failing on a given day with probability 0.01 and independently of the other, floods only when both fail: $0.01 \\times 0.01 = 0.0001$, once in 10000 days rather than once in 100. The product holds only if the failures are independent; a shared power supply would make them fail together.",
        tags: ["plumbing", "machines"],
        image: {
          src: backupPumpFailureImage,
          caption: "Two independent pumps, each failing with probability 0.01, both fail with probability 0.01 × 0.01 = 0.0001.",
          alt: "Two pumps side by side in a sump, each labelled fails 0.01, joined by a gold line to the result both fail 0.0001, one day in 10000.",
        },
      },
      {
        title: "A gambler's old question",
        text: "A seventeenth-century gambler bet on at least one 6 in four rolls of a die. No 6 in a roll has probability $\\frac{5}{6}$, the rolls are independent, so no 6 in four has probability $\\left(\\frac{5}{6}\\right)^4 = \\frac{625}{1296}$, and at least one has $1 - \\frac{625}{1296} = \\frac{671}{1296} \\approx 0.518$: a bet that wins slightly more often than it loses.",
        tags: ["game-design", "money"],
        image: {
          src: fourRollsNoSixImage,
          caption: "At least one 6 in four rolls: 1 − (5/6)⁴ = 671/1296, about 0.518.",
          alt: "Four dice in a row, each labelled no six 5/6, with the line (5/6)⁴ = 625/1296 and the gold result 1 − 625/1296 ≈ 0.518.",
        },
      },
    ],
  };
});
