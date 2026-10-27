// Solving ax + b = cx + d. Each side of the equation is drawn as a line, so
// the solution is the x where the two lines cross. Every legal move — take the
// same amount from both sides, take the same multiple of x from both sides,
// divide both sides by the same number — moves both lines alike, and the
// crossing slides up and down but never sideways: the answer survives each
// move, until it can be read off as x = something.

import { C } from "../draw.ts";
import { fmt, mix } from "../geo.ts";
import { axes, onStage, texLinear, type Graph } from "../kit/algebra.ts";
import { texRatio } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

const LEFT = C.cyan;
const RIGHT = C.orange;
const ANSWER = C.gold;
/** The sides' values climb fast, so the vertical axis is squeezed fourfold. */
const GRAPH: Graph = { origin: { x: 0, y: 0 }, unit: { x: 1, y: 4 } };

/** One side of the equation, px + q. */
interface Side {
  p: number;
  q: number;
}
type Stage = [Side, Side];

const mixSide = (s: Side, t: Side, k: number): Side => ({ p: mix(s.p, t.p, k), q: mix(s.q, t.q, k) });

/** `- 5`, `+ 5` or nothing: taking `v` (times `variable`) away. */
function minus(v: number, variable = ""): string {
  if (v === 0) return "";
  const size = Math.abs(v) === 1 && variable ? "" : fmt(Math.abs(v));
  return ` ${v < 0 ? "+" : "-"} ${size}${variable}`;
}

export default lesson((s) => {
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 2.8, min: -3, max: 3, value: 3, step: 1 });
  const b = s.slider({ label: "b =", at: { x: -3.8, y: -4.3 }, width: 2.8, min: -12, max: 12, value: 5, step: 1 });
  const c = s.slider({ label: "c =", at: { x: 0, y: -4.3 }, width: 2.8, min: -3, max: 3, value: 1, step: 1 });
  const d = s.slider({ label: "d =", at: { x: 3.8, y: -4.3 }, width: 2.8, min: -12, max: 12, value: 11, step: 1 });
  s.button("Make the slopes equal", () => (c.value = a.value));

  /** The equation after each move: as given, minus b, minus cx, divided by a − c. */
  const stages = (): Stage[] => {
    const [A, B, Cc, D] = [a.value, b.value, c.value, d.value];
    const k = A - Cc;
    const s0: Stage = [{ p: A, q: B }, { p: Cc, q: D }];
    const s1: Stage = [{ p: A, q: 0 }, { p: Cc, q: D - B }];
    const s2: Stage = [{ p: k, q: 0 }, { p: 0, q: D - B }];
    const s3: Stage = k === 0 ? s2 : [{ p: 1, q: 0 }, { p: 0, q: (D - B) / k }];
    return [s0, s1, s2, s3];
  };

  return {
    steps: [
      {
        title: "Each side is a line",
        text: "Set the sliders to make an equation $ax + b = cx + d$. Each side gives a value for every $x$, and its graph is a line. A solution is an $x$ where the two sides are equal: where the lines cross.",
      },
      {
        title: "Take the same from both sides",
        text: "Subtract $b$ from both sides. Both lines drop by the same amount, so wherever they were equal they still are: the crossing slides down but stays above the same $x$.",
      },
      {
        title: "Gather the x terms",
        text: "Now subtract $cx$ from both sides. Both lines tilt by the same amount at every $x$, so the crossing again keeps its $x$. The right side is now a constant, a flat line.",
      },
      {
        title: "Divide by the coefficient",
        text: "Divide both sides by $a - c$. Both lines stretch toward the axis by the same factor, and the equation reads $x = \\frac{d - b}{a - c}$: the crossing's $x$ is written out for us.",
      },
      {
        title: "Check by substituting",
        text: "Put the answer back into the original equation. If both sides come out the same, the answer is right; a slip anywhere in the moves shows up here.",
      },
      {
        title: "When the slopes match",
        text: "Press “Make the slopes equal”. With $a = c$ the lines are parallel. Gathering the $x$ terms leaves $0 = d - b$: false, so no $x$ works, unless $d = b$, when the lines coincide and every $x$ works.",
      },
    ],

    draw(g, f) {
      const all = stages();
      let [left, right] = all[0];
      for (let k = 1; k < all.length; k++) {
        const t = f.at(k);
        if (t > 0) {
          left = mixSide(all[k - 1][0], all[k][0], t);
          right = mixSide(all[k - 1][1], all[k][1], t);
        }
      }
      const line = (side: Side, color: string): void =>
        g.line(onStage(GRAPH, { x: 0, y: side.q }), onStage(GRAPH, { x: 1, y: side.p + side.q }), { color });

      axes(g, GRAPH, { xName: "x" });
      line(right, RIGHT);
      line(left, LEFT);

      const k = a.value - c.value;
      if (k !== 0) {
        const x = (d.value - b.value) / k;
        const meet = onStage(GRAPH, { x, y: left.p * x + left.q });
        const foot = onStage(GRAPH, { x, y: 0 });
        g.segment(meet, foot, { color: ANSWER, width: 2, dash: [5, 5] });
        g.point(meet, { color: ANSWER, r: 7 });
        g.point(foot, { color: ANSWER, r: 5 });
        g.label(foot, `x = ${fmt(x, 2).replace("-", "−")}`, { color: ANSWER, size: 15, bold: true, dy: meet.y >= foot.y ? -22 : 22 });
      }

      const sideText = (side: Side): string => {
        const p = fmt(side.p, 2);
        const q = fmt(Math.abs(side.q), 2);
        const px = p === "0" ? "" : p === "1" ? "x" : p === "-1" ? "−x" : `${p.replace("-", "−")}x`;
        if (!px) return fmt(side.q, 2).replace("-", "−");
        return q === "0" ? px : `${px} ${side.q < 0 ? "−" : "+"} ${q}`;
      };
      g.label({ x: -7.7, y: 4.5 }, `left side: ${sideText(left)}`, { color: LEFT, size: 17, bold: true, align: "left" });
      g.label({ x: -7.7, y: 3.9 }, `right side: ${sideText(right)}`, { color: RIGHT, size: 17, bold: true, align: "left" });
    },

    readout(f) {
      const [A, B, Cc, D] = [a.value, b.value, c.value, d.value];
      const k = A - Cc;
      const given: Readout = { label: "The equation", tex: `${texLinear(A, B)} = ${texLinear(Cc, D)}` };
      const takeB: Readout = {
        label: "Subtract b from both sides",
        tex: `${texLinear(A, B)}${minus(B)} = ${texLinear(Cc, D)}${minus(B)} \\;\\Rightarrow\\; ${texLinear(A, 0)} = ${texLinear(Cc, D - B)}`,
      };
      const takeCx: Readout = {
        label: "Subtract cx from both sides",
        tex: `${texLinear(A, 0)}${minus(Cc, "x")} = ${texLinear(Cc, D - B)}${minus(Cc, "x")} \\;\\Rightarrow\\; ${texLinear(k, 0)} = ${fmt(D - B)}`,
      };
      const verdict: Readout =
        k !== 0
          ? {
              label: "Divide both sides by a − c",
              tex: `\\frac{${texLinear(k, 0)}}{${fmt(k)}} = \\frac{${fmt(D - B)}}{${fmt(k)}} \\;\\Rightarrow\\; x = ${texRatio(D - B, k)}`,
              tone: "good",
            }
          : D === B
            ? { label: "Parallel and the same line", tex: "0 = 0:\\ \\text{every } x \\text{ works}", tone: "good" }
            : { label: "Parallel lines", tex: `0 = ${fmt(D - B)}:\\ \\text{no } x \\text{ works}`, tone: "warn" };

      if (f.step === 0) return [given];
      if (f.step === 1) return [given, takeB];
      if (f.step === 2) return [given, takeB, takeCx];
      if (f.step === 3 || k === 0) return [given, takeCx, verdict];

      const x = (D - B) / k;
      const show = texRatio(D - B, k);
      const value = (p: number, q: number): string => fmt(p * x + q, 2);
      return [
        given,
        verdict,
        {
          label: "Left side at the answer",
          tex: `${fmt(A)}\\left(${show}\\right) ${B < 0 ? "-" : "+"} ${fmt(Math.abs(B))} = ${value(A, B)}`,
          tone: "good",
        },
        {
          label: "Right side at the answer",
          tex: `${fmt(Cc)}\\left(${show}\\right) ${D < 0 ? "-" : "+"} ${fmt(Math.abs(D))} = ${value(Cc, D)}`,
          tone: "good",
        },
      ];
    },

    uses: [
      {
        title: "Trim round a planter",
        text: "You have 120 cm of trim to run round the rim of a planter. A square planter of side $s$ uses $4s$ of it, so $4s = 120$ and $s = 30$ cm. A round one of diameter $d$ uses $\\pi d$, so $d = 120 \\div \\pi \\approx 38.2$ cm: for the same trim, the round planter can be wider across.",
      },
      {
        title: "Which phone plan is cheaper?",
        text: "One plan costs 20 a month plus 2 for each gigabyte; another costs 35 a month plus 0.50 a gigabyte. Setting the two bills equal, $2x + 20 = 0.5x + 35$, gives $x = 10$: under 10 GB a month the first plan is cheaper, over it the second.",
      },
      {
        title: "Equal shelves from one board",
        text: "A 90 cm board is to be cut into three equal shelves, and each of the two saw cuts turns 0.3 cm of wood to dust. So $3x + 0.6 = 90$, and each shelf is $x = 29.8$ cm. Marking off 30 cm for each would leave the last one short.",
      },
      {
        title: "Oven temperatures",
        text: "A recipe gives the oven in °F and your oven reads °C. Solving $F = \\tfrac95 C + 32$ for $C$ takes this lesson's two moves: subtract 32 from both sides, then divide both by $\\tfrac95$. For 350 °F that is about 177 °C.",
      },
    ],
  };
});
