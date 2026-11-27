// The square root of −1, as a turn. Multiplying by −1 turns the number line
// half way round, so a number whose square is −1 must turn it a quarter of
// the way, off the line. Its powers then cycle with period 4.

import { C } from "../draw.ts";
import { fmt, polar } from "../geo.ts";
import { cx, plane, texCx, textCx, vector } from "../kit/complex.ts";
import { lesson, type Readout } from "../scene.ts";
import capacitorCurrentLeadImage from "../../images/capacitor-current-lead.svg";
import leftTurnsReturnImage from "../../images/left-turns-return.svg";

const R = 3;
const TURN = C.gold;
const QUARTER = Math.PI / 2;

/** i^k, exactly. */
const powerOfI = (k: number): { x: number; y: number } => [cx(1, 0), cx(0, 1), cx(-1, 0), cx(0, -1)][((k % 4) + 4) % 4];

export default lesson((s) => {
  const k = s.slider({ label: "k =", at: { x: -7.4, y: -4.3 }, width: 5, min: 0, max: 12, value: 2, step: 1 });
  const n = s.slider({ label: "n =", at: { x: 1.4, y: -4.3 }, width: 5, min: 1, max: 20, value: 9, step: 1 });

  return {
    steps: [
      {
        title: "Times −1 is a half turn",
        text: "On the number line, multiplying by $-1$ sends $3$ to $-3$: a half turn about 0. Doing it twice is a full turn, which is why $(-1)(-1) = 1$. So no number on the line squares to $-1$: any number times itself, positive or negative, comes out positive.",
      },
      {
        title: "A quarter turn",
        text: "Suppose a number $i$ had $i \\cdot i = -1$. Multiplying by $i$ twice would make a half turn, so multiplying by $i$ once is a quarter turn, which lifts the line off itself. That number is called $i$, the imaginary unit, and $i^2 = -1$. It sits one unit up, on a new axis.",
      },
      {
        title: "Powers of i go round",
        text: "Keep turning: $i^1 = i$, $i^2 = -1$, $i^3 = -i$, $i^4 = 1$, and then the cycle repeats. So $i^k$ depends only on the remainder when $k$ is divided by 4: $i^{11} = i^{8} \\cdot i^{3} = -i$. Drag $k$ to go round.",
      },
      {
        title: "Roots of negative numbers",
        text: "Now $\\sqrt{-9} = 3i$, since $(3i)^2 = 9i^2 = -9$; and $-3i$ squares to $-9$ too. In general $\\sqrt{-n} = i\\sqrt{n}$ for $n > 0$. Beware: $\\sqrt{-4}\\sqrt{-9} = 2i \\cdot 3i = -6$, not $\\sqrt{36} = 6$. The rule $\\sqrt{a}\\sqrt{b} = \\sqrt{ab}$ only holds when $a, b \\ge 0$.",
      },
    ],

    draw(g, f) {
      plane(g);

      if (f.step === 0) {
        g.arc({ x: 0, y: 0 }, R, 0, Math.PI, { color: TURN, width: 2.5, dash: [6, 5] });
        vector(g, cx(R, 0), { color: C.cyan, label: "3" });
        vector(g, cx(-R, 0), { color: C.pink, label: "−3" });
        g.label({ x: 0, y: R }, "× (−1)", { color: TURN, size: 15, bold: true, dy: 14 });
        return;
      }

      if (f.step < 3) {
        const steps = f.step === 1 ? Math.min(k.value, 2) : k.value;
        // One quarter-turn arc per factor of i, each a little further out.
        for (let j = 0; j < steps; j++) {
          const r = R - 0.25 + (j % 4) * 0.12 + Math.floor(j / 4) * 0.5;
          g.arc({ x: 0, y: 0 }, r, j * QUARTER + 0.05, (j + 1) * QUARTER - 0.05, { color: TURN, width: 2, alpha: 0.8 });
          const mid = polar({ x: 0, y: 0 }, r + 0.35, (j + 0.5) * QUARTER);
          if (j < 4) g.label(mid, "×i", { color: TURN, size: 13, bold: true, dy: -5 });
        }
        for (let j = 0; j < 4; j++) {
          const p = powerOfI(j);
          g.point({ x: R * p.x, y: R * p.y }, { color: C.dim, r: 4 });
        }
        const z = powerOfI(f.step === 1 ? Math.min(k.value, 2) : k.value);
        vector(g, cx(R * z.x, R * z.y), { color: C.cyan, label: `3·${textCx(z)}` });
        return;
      }

      // √(−n): both square roots on the imaginary axis.
      const root = Math.sqrt(n.value);
      vector(g, cx(0, root), { color: C.cyan, label: `${fmt(root, 2)}i` });
      vector(g, cx(0, -root), { color: C.pink, label: `−${fmt(root, 2)}i` });
    },

    readout(f) {
      if (f.step === 0) {
        return [
          { label: "Half a turn", tex: "3 \\cdot (-1) = -3" },
          { label: "Twice", tex: "(-1)(-1) = 1" },
        ];
      }
      if (f.step < 3) {
        const kk = f.step === 1 ? Math.min(k.value, 2) : k.value;
        const rows: Readout[] = [{ label: "The rule", tex: "i^2 = -1", tone: "good" }];
        const rem = kk % 4;
        rows.push({
          label: `${kk} quarter turns`,
          tex: kk >= 4 ? `i^{${kk}} = (i^4)^{${Math.floor(kk / 4)}} \\cdot i^{${rem}} = i^{${rem}} = ${texCx(powerOfI(kk))}` : `i^{${kk}} = ${texCx(powerOfI(kk))}`,
        });
        return rows;
      }
      const nn = n.value;
      const r = Math.sqrt(nn);
      const whole = Math.abs(r - Math.round(r)) < 1e-9;
      const rootTex = whole ? `${Math.round(r)}i` : `i\\sqrt{${nn}}`;
      return [
        { label: "Square root", tex: `\\sqrt{-${nn}} = ${rootTex}${whole ? "" : ` \\approx ${fmt(r, 3)}i`}`, tone: "good" },
        { label: "Check", tex: `(${rootTex})^2 = i^2 \\cdot ${nn} = -${nn}` },
        { label: "The other root", tex: `(-${rootTex})^2 = -${nn}\\ \\text{too}` },
      ];
    },

    likes: [
      {
        title: "About turn",
        text: "A soldier told \"about turn\" faces the opposite way: that is multiplying by $-1$. Told \"left turn\" twice, they end up the same way round. A left turn is a step that, done twice, makes an about turn, and that is exactly what multiplying by $i$ does to a direction.",
      },
      {
        title: "The days of the week",
        text: "Today's weekday in 100 days depends only on the remainder of 100 divided by 7, because the days repeat every 7. Powers of $i$ repeat every 4 in the same way, so $i^{100}$ is $i^0 = 1$: 100 divided by 4 leaves nothing over.",
      },
    ],

    uses: [
      {
        title: "Four left turns",
        text: "Walk round a block turning left at every corner. Each turn rotates your direction a quarter turn, which is multiplying it by $i$. After two turns you face back the way you came, $i^2 = -1$, and after four you face the way you started, $i^4 = 1$. Turning right is multiplying by $-i$.",
        tags: ["navigation", "travel"],
        image: {
          src: leftTurnsReturnImage,
          caption: "Four left turns bring a walker back to facing the way they started: each turn is a multiplication by i, and i⁴ = 1.",
          alt: "A city block seen from above with a walker's path going round it, turning left at each of the four corners, each corner arrow marked ×i.",
        },
      },
      {
        title: "A capacitor's quarter turn",
        text: "In an alternating-current circuit, the current through a capacitor peaks a quarter of a cycle before the voltage across it. Electrical engineers describe that quarter-cycle shift as multiplication by $j$, their name for $i$, since $i$ already means current. A coil shifts the current a quarter cycle the other way, $-j$.",
        tags: ["electrical"],
        image: {
          src: capacitorCurrentLeadImage,
          caption: "In a capacitor the current wave peaks a quarter cycle before the voltage wave; engineers write that quarter turn as a factor j.",
          alt: "Two sine waves beside a capacitor symbol, the gold current wave a quarter cycle ahead of the blue voltage wave, with a gold double arrow between their peaks.",
        },
      },
    ],
  };
});
