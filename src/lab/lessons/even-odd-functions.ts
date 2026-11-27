// Even and odd functions. f is even when f(−x) = f(x): its graph is its own
// mirror image in the y-axis. f is odd when f(−x) = −f(x): half a turn about
// the origin carries its graph onto itself. Most functions are neither, but
// every function is the sum of an even part and an odd part.

import { C } from "../draw.ts";
import { fmt } from "../geo.ts";
import { axes } from "../kit/algebra.ts";
import { num } from "../kit/coordinates.ts";
import { at, curve, evenPart, GRAPH, oddPart, parity, shown, WINDOW, type Fn } from "../kit/functions.ts";
import { lesson, type Readout } from "../scene.ts";
import archMirrorHalfImage from "../../images/arch-mirror-half.svg";
import midSideStereoImage from "../../images/mid-side-stereo.svg";

const P_COLOR = C.gold;
const Q_COLOR = C.violet;
const MIRROR = C.green;
const TURN = C.cyan;

const RULES = ["x² − 2", "x³ − 3x", "x²/4 + x", "x³ − 3x + 1"] as const;
type Rule = (typeof RULES)[number];

const FNS: Record<Rule, Fn> = {
  "x² − 2": (x) => x * x - 2,
  "x³ − 3x": (x) => x ** 3 - 3 * x,
  "x²/4 + x": (x) => (x * x) / 4 + x,
  "x³ − 3x + 1": (x) => x ** 3 - 3 * x + 1,
};

const TEX: Record<Rule, { f: string; even: string; odd: string }> = {
  "x² − 2": { f: "x^2 - 2", even: "x^2 - 2", odd: "0" },
  "x³ − 3x": { f: "x^3 - 3x", even: "0", odd: "x^3 - 3x" },
  "x²/4 + x": { f: "\\tfrac{1}{4}x^2 + x", even: "\\tfrac{1}{4}x^2", odd: "x" },
  "x³ − 3x + 1": { f: "x^3 - 3x + 1", even: "1", odd: "x^3 - 3x" },
};

export default lesson((s) => {
  const rule = s.choice("f(x) =", RULES, "x² − 2");
  const a = s.slider({ label: "a =", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 0, max: 3.5, value: 1.5, step: 0.25, format: (v) => num(v, 2) });

  return {
    steps: [
      {
        title: "Mirror in the y-axis",
        text: "A function is even when $f(-x) = f(x)$ for every $x$: the inputs $a$ and $-a$ give the same output. Then the graph is its own mirror image in the $y$-axis. For $f(x) = x^2 - 2$, $f(-a) = (-a)^2 - 2 = a^2 - 2 = f(a)$. Any function built from even powers of $x$ is even.",
      },
      {
        title: "Half a turn about the origin",
        text: "A function is odd when $f(-x) = -f(x)$: the outputs at $a$ and $-a$ are opposite. Then $(a, f(a))$ and $(-a, -f(a))$ are both on the graph, with the origin halfway between, and half a turn about the origin carries the graph onto itself. Pick $x^3 - 3x$: $f(2) = 2$ and $f(-2) = -2$. An odd function defined at $0$ has $f(0) = 0$.",
      },
      {
        title: "Neither",
        text: "Most functions are neither. Pick $\\tfrac{1}{4}x^2 + x$: $f(2) = 3$ but $f(-2) = -1$, which is neither $3$ nor $-3$, and one such input settles it. Its mirror image (green) and its half-turn (cyan) both miss the graph. Adding a constant spoils oddness too: $x^3 - 3x + 1$ is not odd.",
      },
      {
        title: "Even part plus odd part",
        text: "Every function splits as $f(x) = E(x) + O(x)$, where $E(x) = \\frac{f(x) + f(-x)}{2}$ is even and $O(x) = \\frac{f(x) - f(-x)}{2}$ is odd. For $\\tfrac{1}{4}x^2 + x$ the even part is $\\tfrac{1}{4}x^2$ and the odd part is $x$. For a polynomial, the even part is its even powers and the odd part its odd powers.",
      },
    ],

    draw(g, f) {
      const fn = FNS[rule.value];
      const mirror: Fn = (x) => fn(-x);
      const turned: Fn = (x) => -fn(-x);
      axes(g, GRAPH, { xName: "x", yName: "y" });
      const A = a.value;

      if (f.step === 0) g.segment(at(0, WINDOW.ymin), at(0, WINDOW.ymax), { color: MIRROR, width: 4, alpha: 0.5 });
      if (f.step === 1 || f.step === 2) g.point(at(0, 0), { color: TURN, r: 6 });

      if (f.step === 3) {
        curve(g, evenPart(fn), { color: MIRROR, width: 2.5, alpha: f.at(3) });
        curve(g, oddPart(fn), { color: TURN, width: 2.5, alpha: f.at(3) });
        g.label({ x: -7.4, y: 4.4 }, "even part E", { color: MIRROR, size: 15, bold: true, align: "left", alpha: f.at(3) });
        g.label({ x: -7.4, y: 3.7 }, "odd part O", { color: TURN, size: 15, bold: true, align: "left", alpha: f.at(3) });
      } else {
        if (f.step === 0 || f.step === 2) curve(g, mirror, { color: MIRROR, width: 2, dash: [8, 6] });
        if (f.step === 1 || f.step === 2) curve(g, turned, { color: TURN, width: 2, dash: [8, 6] });
      }
      curve(g, fn, { color: g.accent, width: 3 });

      // The pair of inputs a and −a.
      const [yp, yq] = [fn(A), fn(-A)];
      if (f.step === 0 && shown(A, yp)) {
        g.segment(at(A, yp), at(-A, yp), { color: MIRROR, width: 2, dash: [3, 5] });
        g.circle(at(-A, yp), g.px(10), { color: MIRROR, width: 2 });
      }
      if (f.step === 1 && shown(A, yp) && shown(-A, -yp)) {
        g.segment(at(A, yp), at(-A, -yp), { color: TURN, width: 2, dash: [3, 5] });
        g.circle(at(-A, -yp), g.px(10), { color: TURN, width: 2 });
      }
      if (f.step === 3) {
        const [e, o] = [evenPart(fn)(A), oddPart(fn)(A)];
        if (shown(A, e)) g.point(at(A, e), { color: MIRROR, r: 5 });
        if (shown(A, o)) g.point(at(A, o), { color: TURN, r: 5 });
      }
      if (shown(A, yp)) {
        g.point(at(A, yp), { color: P_COLOR, r: 7 });
        g.label(at(A, yp), `f(${num(A, 2)}) = ${num(yp, 2)}`, { color: P_COLOR, size: 14, bold: true, dx: 12, dy: 14, align: "left" });
      }
      if (shown(-A, yq) && A > 0) {
        g.point(at(-A, yq), { color: Q_COLOR, r: 7 });
        g.label(at(-A, yq), `f(${num(-A, 2)}) = ${num(yq, 2)}`, { color: Q_COLOR, size: 14, bold: true, dx: -12, dy: 14, align: "right" });
      }
    },

    readout(f) {
      const fn = FNS[rule.value];
      const A = a.value;
      const tex = TEX[rule.value];
      const rows: Readout[] = [{ label: "Function", tex: `f(x) = ${tex.f}` }];
      rows.push({ label: "At a and −a", tex: `f(${fmt(A, 2)}) = ${fmt(fn(A), 3)},\\quad f(${fmt(-A, 2)}) = ${fmt(fn(-A), 3)}` });
      const kind = parity(fn);
      if (f.step < 3) {
        const verdict = kind === "even" ? "\\text{even: } f(-x) = f(x)" : kind === "odd" ? "\\text{odd: } f(-x) = -f(x)" : "\\text{neither even nor odd}";
        rows.push({ label: "Symmetry", tex: verdict, tone: kind === "neither" ? "warn" : "good" });
      } else {
        rows.push({ label: "Even part", tex: `E(x) = ${tex.even}` });
        rows.push({ label: "Odd part", tex: `O(x) = ${tex.odd}` });
        rows.push({ label: "Sum", tex: `E(${fmt(A, 2)}) + O(${fmt(A, 2)}) = ${fmt(evenPart(fn)(A), 3)} + ${fmt(oddPart(fn)(A), 3)} = ${fmt(fn(A), 3)}`.replace("+ -", "- "), tone: "good" });
      }
      return rows;
    },

    likes: [
      {
        title: "A butterfly's wings",
        text: "A butterfly's left wing is the mirror image of its right, so knowing one tells you the other. An even function's graph is like that across the $y$-axis: draw the right half and the left half follows.",
      },
      {
        title: "A playing card's face",
        text: "Many playing cards look the same after you turn them upside down: each pip in the top half has a twin in the bottom half, opposite through the centre. An odd function's graph has that half-turn symmetry about the origin.",
      },
    ],

    uses: [
      {
        title: "Building half an arch",
        text: "An arch whose profile is an even function of the distance from its centre line is the same on both sides, so a mason cuts the curved template for one half and turns it over for the other. With the centre on the $y$-axis, $h(-x) = h(x)$: the height 1.5 m left of centre equals the height 1.5 m right of it.",
        tags: ["building", "carpentry"],
        image: {
          src: archMirrorHalfImage,
          caption: "An arch's profile is even about its centre line, h(−x) = h(x), so one template, flipped, cuts both halves.",
          alt: "A stone arch over a doorway with a dashed vertical centre line, the right half of its curve traced in gold and a template shape flipped across to the left half, with the label h(−x) = h(x).",
        },
      },
      {
        title: "Mid and side in stereo sound",
        text: "Sound engineers split a stereo recording with left channel $L$ and right channel $R$ into mid $M = \\frac{L + R}{2}$ and side $S = \\frac{L - R}{2}$. Swapping left and right leaves $M$ alone and flips the sign of $S$: they are the even and odd parts under that swap, and $L = M + S$, $R = M - S$ rebuild the original.",
        tags: ["music", "electrical"],
        image: {
          src: midSideStereoImage,
          caption: "Mid (L + R)/2 is unchanged when left and right swap, and side (L − R)/2 changes sign, so L = M + S and R = M − S.",
          alt: "Two loudspeakers labelled L and R feeding two boxes, mid (L + R)/2 and side (L − R)/2, with a note that swapping L and R keeps M and turns S to −S.",
        },
      },
    ],
  };
});
