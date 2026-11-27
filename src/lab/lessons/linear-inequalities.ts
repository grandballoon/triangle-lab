// Linear inequalities. p < q says p lies left of q on the number line.
// Adding the same number to both sides slides both points together and keeps
// the order; multiplying by a positive number stretches the line and keeps
// it, but multiplying by a negative one reflects the line through 0 and
// turns the order round. So a linear inequality solves like an equation,
// with the sign flipped whenever both sides are multiplied or divided by a
// negative number, and its solutions fill a ray.

import { C } from "../draw.ts";
import { clamp, fmt } from "../geo.ts";
import { texLinear } from "../kit/algebra.ts";
import { endpoint, num, numberLine, onLine, shade, type NumberLine } from "../kit/inequalities.ts";
import { lesson, type Readout } from "../scene.ts";
import diverAirReserveImage from "../../images/diver-air-reserve.svg";
import liftLoadLimitImage from "../../images/lift-load-limit.svg";

const P = C.cyan;
const Q = C.pink;
const GOLD = C.gold;
const UNIT = 0.48;
const TOP: NumberLine = { y: 2.2, from: -15, to: 15, unit: UNIT };
const BOTTOM: NumberLine = { y: -1.4, from: -15, to: 15, unit: UNIT };
const LIMIT = 7;

/** The order of two numbers as a sign. */
const rel = (a: number, b: number): string => (a < b ? "<" : a > b ? ">" : "=");

export default lesson((s) => {
  const snap = (p: { x: number }) => ({ x: clamp(Math.round(p.x / UNIT), -6, 6) * UNIT, y: TOP.y });
  const p = s.point(2 * UNIT, TOP.y, { label: "p", color: P, constrain: snap });
  const q = s.point(5 * UNIT, TOP.y, { label: "q", color: Q, constrain: snap });
  const c = s.slider({ label: "c =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: -5, max: 5, value: 3, step: 1 });
  const k = s.slider({ label: "k =", at: { x: 1.6, y: -4.3 }, width: 3.6, min: -3, max: 3, value: -2, step: 1 });
  const pv = (): number => Math.round(p.x / UNIT);
  const qv = (): number => Math.round(q.x / UNIT);

  return {
    steps: [
      {
        title: "Order on a number line",
        text: "$p < q$ says that $p$ lies to the left of $q$ on the number line; drag them. An inequality in $x$, such as $x > 2$, holds for a whole ray of numbers. An open dot at the end shows that $2$ itself is left out; a closed dot, as for $x \\ge 2$, shows that it is kept.",
      },
      {
        title: "Adding keeps the order",
        text: "Add the same number $c$ to both sides and both points slide the same distance the same way, so the left one stays on the left: if $p < q$ then $p + c < q + c$. Subtracting $c$ is adding $-c$, so it keeps the order too. With $2 < 5$ and $c = 3$, $5 < 8$.",
      },
      {
        title: "A negative factor flips it",
        text: "Multiplying both sides by a positive $k$ stretches the line away from $0$ and keeps the order. A negative $k$ also reflects the line through $0$, so the left point lands on the right: $2 < 5$, but $-2 \\cdot 2 = -4$ is greater than $-2 \\cdot 5 = -10$. Multiply or divide both sides by a negative number and the sign must turn round. Multiplying by $0$ makes the sides equal.",
      },
      {
        title: "Solving a linear inequality",
        text: "Solve as you would an equation, turning the sign round whenever you multiply or divide by a negative. For $3 - 2x \\le 7$, subtract 3 to get $-2x \\le 4$, then divide by $-2$ and flip: $x \\ge -2$. Set $k$ and $c$ to solve $kx + c \\le 7$, and drag $p$ to test a number.",
      },
    ],

    draw(g, f) {
      const [a, b, C0, K] = [pv(), qv(), c.value, k.value];

      if (f.step === 3) {
        numberLine(g, BOTTOM, { every: 5 });
        g.label({ x: 0, y: 4.2 }, `${texLinear(K, C0).replace(/-/g, "−")} ≤ ${LIMIT}`, { color: C.ink, size: 20, bold: true });
        const t = f.at(3);
        if (K === 0) {
          if (C0 <= LIMIT) shade(g, BOTTOM, -Infinity, Infinity, GOLD, t);
          g.label({ x: 0, y: 0.2 }, C0 <= LIMIT ? `${num(C0)} ≤ ${LIMIT}: every x works` : `${num(C0)} > ${LIMIT}: no x works`, { color: GOLD, size: 16, bold: true });
        } else {
          const edge = (LIMIT - C0) / K;
          if (K > 0) shade(g, BOTTOM, -Infinity, edge, GOLD, t);
          else shade(g, BOTTOM, edge, Infinity, GOLD, t);
          endpoint(g, BOTTOM, edge, true, GOLD, t);
          g.label(onLine(BOTTOM, edge), `x ${K > 0 ? "≤" : "≥"} ${num(edge, 2)}`, { color: GOLD, size: 16, bold: true, dy: 26, alpha: t });
        }
        numberLine(g, TOP, { every: 5 });
        const value = K * a + C0;
        const ok = value <= LIMIT;
        g.label(onLine(TOP, a), `${num(K)}·${num(a)} + ${num(C0)} = ${num(value)} ${ok ? "≤" : ">"} ${LIMIT}`, { color: ok ? C.green : C.red, size: 14, bold: true, dy: 30 });
        g.segment(onLine(TOP, a), onLine(BOTTOM, a), { color: P, width: 1.5, dash: [4, 4] });
        g.point(onLine(BOTTOM, a), { color: P, r: 4 });
        return;
      }

      numberLine(g, TOP, { every: 5 });
      if (f.step === 0) {
        // The ray x > p, with an open dot at p.
        numberLine(g, BOTTOM, { every: 5 });
        const t = f.at(0);
        shade(g, BOTTOM, a, Infinity, GOLD, t);
        endpoint(g, BOTTOM, a, false, GOLD, t);
        g.label(onLine(BOTTOM, a), `x > ${num(a)}`, { color: GOLD, size: 16, bold: true, dy: 26, alpha: t });
        g.label({ x: 0, y: 4.2 }, `${num(a)} ${rel(a, b)} ${num(b)}`, { color: C.ink, size: 20, bold: true });
        return;
      }

      // Both points carried to the lower line: by + c, or by × k.
      numberLine(g, BOTTOM, { every: 5 });
      const add = f.step === 1;
      const map = (v: number): number => (add ? v + C0 : K * v);
      const t = f.at(f.step);
      for (const [v, color, name] of [[a, P, "p"], [b, Q, "q"]] as const) {
        const to = map(v);
        const from = onLine(TOP, v);
        const end = onLine(BOTTOM, v + (to - v) * t);
        g.arrow({ x: from.x, y: from.y - 0.35 }, { x: end.x, y: end.y + 0.35 }, { color, width: 2, alpha: 0.7 });
        g.point(end, { color, r: 6 });
        g.label(end, add ? `${name} + c` : `k${name}`, { color, size: 14, bold: true, dy: 22 });
      }
      const [A, B] = [map(a), map(b)];
      const kept = rel(a, b) === rel(A, B);
      g.label({ x: 0, y: 4.2 }, `${num(a)} ${rel(a, b)} ${num(b)}`, { color: C.ink, size: 20, bold: true });
      g.label({ x: 0, y: -2.6 }, `${num(A)} ${rel(A, B)} ${num(B)}`, { color: kept ? C.ink : GOLD, size: 20, bold: true, alpha: t });
      if (!kept) g.label({ x: 0, y: 0.4 }, K === 0 ? "× 0: the sides are equal" : "× a negative: the order turns round", { color: GOLD, size: 15, bold: true, alpha: t });
    },

    readout(f) {
      const [a, b, C0, K] = [pv(), qv(), c.value, k.value];
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Order", tex: `${fmt(a)} ${rel(a, b)} ${fmt(b)}`, tone: "good" });
        rows.push({ label: "Solution set", tex: `x > ${fmt(a)}`, tone: "plain" });
      } else if (f.step === 1) {
        rows.push({ label: "Add c to both sides", tex: `${fmt(a)} + ${fmt(C0)} = ${fmt(a + C0)} ${rel(a + C0, b + C0)} ${fmt(b + C0)} = ${fmt(b)} + ${fmt(C0)}`.replace(/\+ -/g, "- "), tone: "good" });
      } else if (f.step === 2) {
        const kept = rel(a, b) === rel(K * a, K * b);
        rows.push({
          label: kept ? "Order kept" : K === 0 ? "Both sides 0" : "Order turned round",
          tex: `${fmt(K)} \\cdot ${fmt(a)} = ${fmt(K * a)} ${rel(K * a, K * b)} ${fmt(K * b)} = ${fmt(K)} \\cdot ${fmt(b)}`,
          tone: kept ? "good" : "warn",
        });
      } else {
        const lhs = texLinear(K, C0);
        rows.push({ label: "Solve", tex: `${lhs} \\le ${LIMIT}` });
        if (K !== 0) {
          rows.push({ label: "Subtract c", tex: `${texLinear(K, 0)} \\le ${fmt(LIMIT - C0)}` });
          rows.push({
            label: K < 0 ? "Divide by k < 0: flip" : "Divide by k > 0",
            tex: `x ${K > 0 ? "\\le" : "\\ge"} ${fmt((LIMIT - C0) / K, 2)}`,
            tone: "good",
          });
        } else {
          rows.push({ label: "No x left", tex: `${fmt(C0)} \\le ${LIMIT} \\text{ is ${C0 <= LIMIT ? "true" : "false"}}`, tone: C0 <= LIMIT ? "good" : "warn" });
        }
        const v = K * a + C0;
        rows.push({ label: v <= LIMIT ? "p is a solution" : "p is not a solution", tex: `${fmt(v)} ${v <= LIMIT ? "\\le" : ">"} ${LIMIT}`, tone: v <= LIMIT ? "good" : "warn" });
      }
      return rows;
    },

    likes: [
      {
        title: "Two runners on a track",
        text: "If one runner is ahead of another and both are carried forward the same distance by a moving walkway, the leader still leads. Turn the whole race round to face the other way, though, and the runner who was ahead is now behind. Adding keeps the order; multiplying by a negative is the turn.",
      },
      {
        title: "Debts and their sizes",
        text: "Owing 10 is worse than owing 4, even though 10 is more than 4. Writing debts as negatives, $-10 < -4$: putting a minus sign on both sides of $4 < 10$ turns the comparison round.",
      },
    ],

    uses: [
      {
        title: "A diver's reserve of air",
        text: "A tank starts at 200 bar and a diver breathes 15 bar a minute, keeping at least 50 bar in reserve. So $200 - 15t \\ge 50$, which gives $-15t \\ge -150$; dividing by $-15$ turns the sign round, $t \\le 10$. The dive may last up to 10 minutes.",
        tags: ["sport", "health"],
        image: {
          src: diverAirReserveImage,
          caption: "From 200 bar at 15 bar a minute, keeping 50 bar in reserve: 200 − 15t ≥ 50 gives t ≤ 10 minutes, the sign turned round when dividing by −15.",
          alt: "A pressure gauge on a dive tank with its needle at 200 and a gold band from 50 down to 0 marked reserve, beside the lines 200 − 15t ≥ 50, −15t ≥ −150 and t ≤ 10 minutes.",
        },
      },
      {
        title: "How many fit in a lift",
        text: "A lift may carry 630 kg and already holds a 150 kg cart. Allowing 75 kg a person, $75n + 150 \\le 630$, so $75n \\le 480$ and $n \\le 6.4$. People come whole, so at most 6 may get in.",
        tags: ["building", "machines"],
        image: {
          src: liftLoadLimitImage,
          caption: "A lift rated 630 kg holding a 150 kg cart: 75n + 150 ≤ 630 gives n ≤ 6.4, so 6 people.",
          alt: "An open lift holding a cart and six people, under a sign reading 630 kg, beside a number line with a gold ray running left from a closed dot at 6.4.",
        },
      },
    ],
  };
});
