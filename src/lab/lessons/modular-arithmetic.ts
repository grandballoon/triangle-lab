// Clock arithmetic. Walk a steps round a clock of m hours and you land on
// a mod m. Sums and products can be worked on the clock, wrapping as you
// go, and the powers of a number go round a cycle, which is how the last
// digit of a huge power is found.

import { C, tint } from "../draw.ts";
import { TAU } from "../geo.ts";
import { mod } from "../kit/integers.ts";
import { lesson, type Readout } from "../scene.ts";
import calendarWeekdayModImage from "../../images/calendar-weekday-mod.svg";
import circleOfFifthsImage from "../../images/circle-of-fifths.svg";

const A = C.cyan;
const B = C.pink;
const LAND = C.gold;
const CENTRE = { x: -3.6, y: 0.5 };
const R = 3.1;

const angle = (k: number, m: number): number => Math.PI / 2 - (k * TAU) / m;
const spot = (k: number, m: number, r = R): { x: number; y: number } => ({ x: CENTRE.x + r * Math.cos(angle(k, m)), y: CENTRE.y + r * Math.sin(angle(k, m)) });

/** The powers a¹, a², … mod m, up to the first repeat. */
function cycle(a: number, m: number): { seq: number[]; start: number } {
  const seq: number[] = [];
  let v = mod(a, m);
  while (!seq.includes(v)) {
    seq.push(v);
    v = mod(v * a, m);
  }
  return { seq, start: seq.indexOf(v) };
}

export default lesson((s) => {
  const m = s.slider({ label: "m =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: 2, max: 12, value: 12, step: 1 });
  const a = s.slider({ label: "a =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: 0, max: 40, value: 17, step: 1 });
  const b = s.slider({ label: "b =", at: { x: 0, y: -4.3 }, width: 2.8, min: 0, max: 40, value: 10, step: 1 });

  return {
    steps: [
      {
        title: "Wrapping round",
        text: "On a clock of $m$ hours, walk $a$ steps from 0. You land on the remainder of $a$ on division by $m$, written $a \\bmod m$: 17 hours after midnight the clock reads 5, since $17 = 1 \\cdot 12 + 5$. Numbers that land on the same hour are congruent modulo $m$, as in $17 \\equiv 5 \\pmod{12}$; their difference is a multiple of $m$.",
      },
      {
        title: "Adding",
        text: "To add, walk $a$ steps and then $b$ more. Where you land depends only on where $a$ and $b$ themselves land, so you can reduce first: $17 + 10 \\equiv 5 + 10 = 15 \\equiv 3 \\pmod{12}$. Seventeen hours and then ten more after midnight is 3 o'clock.",
      },
      {
        title: "Multiplying",
        text: "A product $ab$ is $b$ walks of $a$ steps each. Again only the remainders matter: $17 \\cdot 10 \\equiv 5 \\cdot 10 = 50 \\equiv 2 \\pmod{12}$, and indeed $170 = 14 \\cdot 12 + 2$. Reducing early keeps the numbers small however large they start.",
      },
      {
        title: "Powers go in cycles",
        text: "Multiply by $a$ again and again, wrapping each time. There are only $m$ hours, so the powers must repeat, and from then on they cycle. Modulo 10 the hour is the last digit: the powers of 7 end $7, 9, 3, 1, 7, \\ldots$, a cycle of 4, so $7^{100}$ ends in 1, since $100 = 25 \\cdot 4$. Set $m = 10$ to try other last digits.",
      },
    ],

    draw(g, f) {
      const [M, X, Y] = [m.value, a.value, b.value];

      // The clock face.
      g.circle(CENTRE, R, { color: C.dim, width: 2 });
      for (let k = 0; k < M; k++) {
        g.point(spot(k, M), { color: C.dim, r: 4 });
        g.label(spot(k, M, R + 0.5), String(k), { color: C.ink, size: 15, bold: true });
      }

      /** A walk of n steps from hour `from`, drawn as a spiral so each lap shows. */
      const walk = (from: number, n: number, color: string, r0: number, alpha = 1): void => {
        if (n === 0) return;
        const pts = [];
        const laps = Math.max(1, n / M);
        const steps = Math.max(24, Math.ceil(n * 8));
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * n;
          const r = r0 - (0.55 * (t / M)) / Math.max(1, laps / 3);
          pts.push(spot(from + t, M, r));
        }
        g.path(pts, { color, width: 2.5, alpha });
        const end = pts[pts.length - 1];
        const before = pts[pts.length - 2];
        g.arrow(before, end, { color, width: 2.5, alpha });
      };

      const right = (y: number, text: string, color: string, alpha = 1, size = 16) => g.label({ x: 1.2, y }, text, { color, size, bold: true, align: "left", alpha });

      if (f.step === 0) {
        walk(0, X, A, R - 0.35);
        g.point(spot(X, M), { color: LAND, r: 8 });
        right(2.4, `${X} steps from 0`, A);
        right(1.4, `${X} = ${Math.floor(X / M)} × ${M} + ${mod(X, M)}`, C.ink);
        right(0.4, `lands on ${mod(X, M)}`, LAND, f.at(0));
        return;
      }

      if (f.step === 1) {
        walk(0, X, A, R - 0.35);
        walk(X, Y, B, R - 0.8);
        g.point(spot(X, M), { color: A, r: 6 });
        g.point(spot(X + Y, M), { color: LAND, r: 8 });
        right(2.4, `${X} steps, then ${Y} more`, C.ink);
        right(1.4, `${X} + ${Y} = ${X + Y}`, C.ink);
        right(0.4, `≡ ${mod(X, M)} + ${mod(Y, M)} ≡ ${mod(X + Y, M)}`, LAND, f.at(1));
        return;
      }

      if (f.step === 2) {
        // b walks of a, each walk only its remainder in effect, marked hour by hour.
        const hops = Math.min(Y, 12);
        const r0 = mod(X, M);
        for (let i = 0; i < hops; i++) {
          const p = spot(i * r0, M, R - 0.4 - i * 0.12);
          const q = spot((i + 1) * r0, M, R - 0.4 - (i + 1) * 0.12);
          g.arrow(p, q, { color: tint(B, 0.4 + (0.6 * (i + 1)) / hops), width: 2 });
        }
        g.point(spot(X * Y, M), { color: LAND, r: 8 });
        right(2.4, `${Y} walks of ${X}${Y > 12 ? " (first 12 shown)" : ""}`, B, 1, Y > 12 ? 14 : 16);
        right(1.4, `${X} × ${Y} = ${X * Y}`, C.ink);
        right(0.4, `≡ ${r0} × ${mod(Y, M)} ≡ ${mod(X * Y, M)}`, LAND, f.at(2));
        return;
      }

      // Powers of a, joined in order round the clock.
      const { seq, start } = cycle(X, M);
      const pts = seq.map((v) => spot(v, M, R - 0.15));
      for (let i = 0; i < seq.length; i++) {
        const next = i + 1 < seq.length ? pts[i + 1] : pts[start];
        const inCycle = i >= start;
        g.arrow(pts[i], next, { color: inCycle ? LAND : C.dim, width: 2.5, alpha: f.at(3) });
      }
      seq.forEach((v, i) => g.point(spot(v, M), { color: i >= start ? LAND : A, r: 7 }));
      right(2.4, `powers of ${X} mod ${M}`, A);
      right(1.4, seq.slice(0, 10).join(", ") + (seq.length > 10 ? ", …" : ", …"), C.ink, 1, seq.length > 7 ? 14 : 16);
      right(0.4, `cycle of ${seq.length - start}`, LAND, f.at(3));
    },

    readout(f) {
      const [M, X, Y] = [m.value, a.value, b.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Lands on", tex: `${X} \\equiv ${mod(X, M)} \\pmod{${M}}`, tone: "good" });
      } else if (f.step === 1) {
        rows.push({ label: "Sum", tex: `${X} + ${Y} \\equiv ${mod(X, M)} + ${mod(Y, M)} \\equiv ${mod(X + Y, M)} \\pmod{${M}}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Product", tex: `${X} \\cdot ${Y} \\equiv ${mod(X, M)} \\cdot ${mod(Y, M)} \\equiv ${mod(X * Y, M)} \\pmod{${M}}`, tone: "good" });
      } else {
        const { seq, start } = cycle(X, M);
        const len = seq.length - start;
        const e = 100;
        const at = e - 1 < start ? seq[e - 1] : seq[start + ((e - 1 - start) % len)];
        rows.push({ label: "Powers", tex: seq.map((v, i) => `${X}^{${i + 1}} \\equiv ${v}`).slice(0, 5).join(",\\ ") + (seq.length > 5 ? ",\\ \\ldots" : "") });
        rows.push({ label: "So", tex: `${X}^{100} \\equiv ${at} \\pmod{${M}}`, tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "Turning on the spot",
        text: "Turning 450° ends you facing the same way as turning 90°: directions are angles modulo 360. A dancer's extra full turns change nothing about where they finish facing.",
      },
      {
        title: "Odd and even",
        text: "Odd and even are arithmetic modulo 2: odd plus odd is even, odd times odd is odd. You can tell $317 \\cdot 455 + 1$ is even without multiplying, since it is odd times odd, plus one.",
      },
    ],

    uses: [
      {
        title: "What day of the week?",
        text: "Weekdays repeat every 7 days, so a date's weekday is a remainder modulo 7. If today is a Monday, then in 100 days it will be a Wednesday, since $100 = 14 \\cdot 7 + 2$ and two days after Monday is Wednesday. Formulas for the weekday of any date work the same way.",
        tags: ["home"],
        image: {
          src: calendarWeekdayModImage,
          caption: "100 days after a Monday is a Wednesday: 100 = 14 × 7 + 2, fourteen whole weeks and two days more.",
          alt: "A week strip from Mon to Sun with Monday marked 0 and a gold arrow labelled +2 leading to Wednesday marked 100, with the lines 100 days = 14 weeks + 2 days and 100 = 14 × 7 + 2.",
        },
      },
      {
        title: "The circle of fifths",
        text: "Music has 12 notes to the octave, so pitch classes are arithmetic modulo 12. Going up a fifth is 7 semitones; since 7 and 12 have no common factor, stepping by 7 visits all 12 notes before returning home: $12 \\cdot 7 = 84 \\equiv 0 \\pmod{12}$, and no smaller number of fifths gets back.",
        tags: ["music"],
        image: {
          src: circleOfFifthsImage,
          caption: "Stepping 7 semitones at a time round 12 notes visits every note once before returning: the circle of fifths.",
          alt: "The twelve note names round a circle in chromatic order, joined by gold steps of 7 semitones from C into a twelve-pointed star: C, G, D and on round.",
        },
      },
    ],
  };
});
