// Identities and inverses, in clock tables. Adding or multiplying mod m is
// an operation on {0, …, m − 1}. An identity leaves everything alone, so its
// row and column copy the headers; an inverse undoes an element, so it is
// where that element's row meets the identity. Under addition every element
// has one; under multiplication only those sharing no factor with m.

import { C, tint } from "../draw.ts";
import { gcd, mod } from "../kit/integers.ts";
import { cellBox, drawTable } from "../kit/operations.ts";
import { lesson, type Readout } from "../scene.ts";
import timeZoneUndoImage from "../../images/time-zone-undo.svg";
import transposeBackImage from "../../images/transpose-back-semitones.svg";

const ROW = C.cyan;
const ID = C.gold;

type OpName = "+ mod m" | "× mod m";

export default lesson((s) => {
  const which = s.choice<OpName>("operation", ["+ mod m", "× mod m"]);
  const m = s.slider({ label: "m =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 2, max: 10, value: 8, step: 1 });
  const a = s.slider({ label: "a =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 0, max: 9, value: 3, step: 1 });

  const state = () => {
    const M = m.value;
    const plus = which.value === "+ mod m";
    const of = (x: number, y: number): number => mod(plus ? x + y : x * y, M);
    const set = Array.from({ length: M }, (_, k) => k);
    const e = plus ? 0 : 1;
    const X = mod(a.value, M);
    const inverse = set.find((y) => of(X, y) === e);
    return { M, plus, of, set, e, X, inverse, sign: plus ? "+" : "×" };
  };

  return {
    steps: [
      {
        title: "Clock tables",
        text: "Adding mod $m$ is an operation on $\\{0, 1, \\ldots, m - 1\\}$: add, then take the remainder on division by $m$, as a clock does. It is closed, commutative and associative, and so is multiplying mod $m$. In the addition table each row is the header row shifted along and wrapped round: mod 8, the row of 3 reads $3, 4, 5, 6, 7, 0, 1, 2$.",
      },
      {
        title: "An identity",
        text: "An identity for $\\ast$ is an element $e$ with $e \\ast a = a \\ast e = a$ for every $a$: combining with it changes nothing, so its row and column copy the headers. For addition mod $m$ the identity is 0; for multiplication mod $m$ it is 1. There is never more than one: if $e$ and $f$ are both identities, then $e = e \\ast f = f$.",
      },
      {
        title: "Inverses",
        text: "Given an identity $e$, an inverse of $a$ is an element $b$ with $a \\ast b = b \\ast a = e$: it undoes $a$. Under addition mod 8 the inverse of 3 is 5, since $3 + 5 = 8 \\equiv 0$. Every element has one, $m - a$, with 0 its own inverse, so 0 turns up exactly once in every row of the table.",
      },
      {
        title: "Not every element has one",
        text: "Switch to multiplication mod $m$ and set $m = 10$. There $3 \\cdot 7 = 21 \\equiv 1$, so 7 is the inverse of 3. But the row of 2 holds only even numbers and never 1, so 2 has no inverse. In general $a$ has an inverse mod $m$ exactly when $\\gcd(a, m) = 1$, so when $m$ is prime every element except 0 has one.",
      },
    ],

    draw(g, f) {
      const { M, of, set, e, X, inverse, sign } = state();
      const cell = 6.2 / (M + 1);
      const table = { at: { x: -7.4, y: 3.6 }, cell, set };
      const size = Math.round(Math.min(17, 11 + 30 / (M + 1)));

      drawTable(g, {
        ...table,
        of,
        symbol: sign,
        size,
        fill: (r, k) => {
          if (f.step === 1 && (r === e || k === e)) return tint(ID, 0.22);
          if (f.step >= 2 && r === X) return tint(ROW, 0.16);
          return undefined;
        },
        color: (r, k) => (f.step >= 2 && of(r, k) === e ? ID : undefined),
      });

      const note = (row: number, text: string, color: string, alpha = 1, size2 = 17): void => {
        g.label({ x: -0.4, y: 3 - row * 0.85 }, text, { color, size: size2, bold: true, align: "left", alpha });
      };
      note(0, `a ${sign} b mod ${M}`, C.ink);

      if (f.step === 0) {
        g.polygon(cellBox(table, X, set[0], 0).map((p, i) => (i === 1 || i === 2 ? { x: p.x + (M - 1) * cell, y: p.y } : p)), { color: ROW, width: 3, alpha: f.at(0) });
        note(1, `row ${X}: ${set.map((k) => of(X, k)).join(", ")}`, ROW, f.at(0), 15);
        note(2, "closed: every entry is a remainder", C.dim, f.at(0), 14);
        return;
      }
      if (f.step === 1) {
        note(1, `identity e = ${e}`, ID, f.at(1));
        note(2, `${e} ${sign} a = a ${sign} ${e} = a`, ID, f.at(1), 15);
        return;
      }
      if (inverse === undefined) {
        note(1, `row ${X} never reaches ${e}`, C.red, f.at(f.step));
        note(2, `${X} has no inverse mod ${M}`, C.red, f.at(f.step), 15);
        if (f.step === 3) note(3, `gcd(${X}, ${M}) = ${gcd(X, M)}`, C.red, f.at(3), 15);
        return;
      }
      g.polygon(cellBox(table, X, inverse, 0.03), { color: ID, width: 3, alpha: f.at(f.step) });
      note(1, `${X} ${sign} ${inverse} ≡ ${e}`, ID, f.at(f.step));
      note(2, `the inverse of ${X} is ${inverse}`, ID, f.at(f.step), 15);
      if (f.step === 3) {
        const units = set.filter((y) => set.some((z) => of(y, z) === e));
        note(3, `${units.length} of ${M} elements have inverses`, C.dim, f.at(3), 15);
        if (sign === "+") note(4, "pick × to see some without", C.dim, f.at(3), 14);
        else note(4, `gcd(${X}, ${M}) = ${gcd(X, M)}`, C.green, f.at(3), 15);
      }
    },

    readout(f) {
      const { M, plus, e, X, inverse } = state();
      const op = plus ? "+" : "\\cdot";
      const rows: Readout[] = [{ label: "Identity", tex: `e = ${e}` }];
      if (f.step >= 2) {
        rows.push(
          inverse === undefined
            ? { label: "Inverse", tex: `${X} ${op} b \\not\\equiv ${e} \\pmod{${M}} \\text{ for every } b`, tone: "warn" }
            : { label: "Inverse", tex: `${X} ${op} ${inverse} \\equiv ${e} \\pmod{${M}}`, tone: "good" },
        );
      }
      if (f.step === 3 && !plus) rows.push({ label: "Test", tex: `\\gcd(${X}, ${M}) = ${gcd(X, M)}`, tone: gcd(X, M) === 1 ? "good" : "warn" });
      return rows;
    },

    likes: [
      {
        title: "Doing nothing to a light switch",
        text: "Leaving a switch alone is the identity: whatever you do before or after, it changes nothing. Flipping it is its own inverse, since flipping twice puts the light back as it was.",
      },
      {
        title: "Undo in a document",
        text: "Each edit has an undo that puts the text back, and the two together are as good as doing nothing. Some actions, like printing a page, cannot be undone; they have no inverse.",
      },
    ],

    uses: [
      {
        title: "Turning the clocks back",
        text: "Hours on a 24-hour clock add mod 24, with 0 as the identity. Flying 5 time zones east puts the clock forward 5 hours; the inverse of 5 is 19, since $5 + 19 = 24 \\equiv 0$, so putting it forward 19 hours undoes the trip just as well as putting it back 5.",
        tags: ["travel"],
        image: {
          src: timeZoneUndoImage,
          caption: "On a 24-hour clock, 5 + 19 ≡ 0 (mod 24): going forward 19 hours brings the clock to the same reading as going back 5.",
          alt: "A 24-hour dial with an arc of 5 hours forward from 10:00 to 15:00 and a gold arc of 19 hours forward from 15:00 round to 10:00, beside 5 + 19 = 24 ≡ 0.",
        },
      },
      {
        title: "Transposing back",
        text: "Musical notes repeat every 12 semitones, so transposing adds mod 12 and 0 is the identity. Moving a tune up 7 semitones, a fifth, is undone by moving it down 7, or up 5 more, since $7 + 5 = 12 \\equiv 0$: the tune lands in its first key an octave higher.",
        tags: ["music"],
        image: {
          src: transposeBackImage,
          caption: "Up 7 semitones and then up 5 more is 12 semitones, an octave: in pitch, 7 + 5 ≡ 0 (mod 12).",
          alt: "A keyboard of 13 keys from C to the next C, with an arc of 7 semitones from C to G and a gold arc of 5 semitones from G to the upper C, above 7 + 5 = 12 ≡ 0.",
        },
      },
    ],
  };
});
