// The pigeonhole principle. Put more pigeons than holes and some hole holds
// two; put p pigeons in h holes and some hole holds at least ⌈p/h⌉. Each is a
// proof by contradiction in one line. The skill is in choosing the holes:
// remainders on division by h, or the four quarters of a square.

import { C, tint } from "../draw.ts";
import { clamp, dist, fmt, type Vec } from "../geo.ts";
import { mod } from "../kit/integers.ts";
import { box } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import compressionPigeonholeImage from "../../images/compression-pigeonhole.svg";
import hairCountTwinsImage from "../../images/hair-count-twins.svg";

const HOLE = C.blue;
const BIRD = C.cyan;
const FULL = C.gold;
const DOT = C.pink;

/** The numbers dropped into remainder holes, in order. */
const NUMS = [17, 42, 8, 33, 26, 51, 14, 60, 29, 5, 38, 47, 12, 71, 23, 56, 9, 64, 35, 18, 77, 44, 3, 90];

/** The square of side 2 for the last step, drawn at two stage units a unit. */
const SQ = { x: 1.6, y: -2.6, side: 4 };

export default lesson((s) => {
  const pigeons = s.slider({ label: "pigeons:", at: { x: -7.6, y: -4.3 }, width: 3.6, min: 1, max: 24, value: 7, step: 1 });
  const holes = s.slider({ label: "holes:", at: { x: 1.6, y: -4.3 }, width: 3.6, min: 1, max: 8, value: 5, step: 1 });
  const start: Vec[] = [
    { x: 2.3, y: 0.7 },
    { x: 4.6, y: 0.9 },
    { x: 2.6, y: -1.8 },
    { x: 4.9, y: -1.4 },
    { x: 3.9, y: -0.3 },
  ];
  const spots = start.map((p) =>
    s.point(p.x, p.y, {
      color: DOT,
      constrain: (q) => ({ x: clamp(q.x, SQ.x, SQ.x + SQ.side), y: clamp(q.y, SQ.y, SQ.y + SQ.side) }),
    }),
  );

  return {
    steps: [
      {
        title: "More pigeons than holes",
        text: "Put $p$ pigeons into $h$ holes with $p > h$. Then some hole holds at least two. Suppose not: then every hole holds at most one, so there are at most $h$ pigeons, fewer than $p$. That contradiction is the whole proof. With 13 people and 12 months, two people share a birth month.",
      },
      {
        title: "As evenly as you like",
        text: "However the pigeons are placed, some hole holds at least $\\lceil p/h \\rceil$, the quotient rounded up. If every hole held $\\lceil p/h \\rceil - 1$ or fewer, all the holes together would hold fewer than $p$. Spreading them evenly, as here, is the best anyone can do, and it still leaves a hole that full.",
      },
      {
        title: "Choosing the holes",
        text: "The principle is easy; the skill is choosing the holes. Let the holes be the remainders $0, 1, \\ldots, h - 1$ on division by $h$. Among any $h + 1$ whole numbers, two share a remainder, so their difference is divisible by $h$. Here each number drops into the hole of its remainder.",
      },
      {
        title: "Five points in a square",
        text: "Put five points anywhere in a square of side 2. Cut the square into four squares of side 1: five points, four holes, so two points share a small square, and they are at most its diagonal, $\\sqrt{2} \\approx 1.41$, apart. Drag the points; some pair in one small square is always that close.",
      },
    ],

    draw(g, f) {
      for (const h of spots) {
        h.hidden = f.step !== 3;
        h.enabled = f.step === 3;
      }
      if (f.step === 3) {
        const half = SQ.side / 2;
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            const a = { x: SQ.x + i * half, y: SQ.y + j * half };
            box(g, a, { x: a.x + half, y: a.y + half }, { color: HOLE, fill: tint(HOLE, 0.1), width: 2 });
          }
        }
        g.label({ x: SQ.x + half, y: SQ.y + SQ.side + 0.4 }, "side 2, cut into four of side 1", { color: C.dim, size: 13, bold: true });
        const cell = (p: Vec): number => Math.min(1, Math.floor((p.x - SQ.x) / half)) * 2 + Math.min(1, Math.floor((p.y - SQ.y) / half));
        let best: [Vec, Vec] | null = null;
        for (let i = 0; i < spots.length; i++) {
          for (let j = i + 1; j < spots.length; j++) {
            if (cell(spots[i]) !== cell(spots[j])) continue;
            if (!best || dist(spots[i], spots[j]) < dist(best[0], best[1])) best = [spots[i], spots[j]];
          }
        }
        if (best) {
          g.segment(best[0], best[1], { color: FULL, width: 3, alpha: f.at(3) });
          const d = dist(best[0], best[1]) / 2;
          g.label({ x: -3.6, y: 0.4 }, `same small square:`, { color: FULL, size: 16, bold: true, alpha: f.at(3) });
          g.label({ x: -3.6, y: -0.4 }, `${fmt(d, 2)} apart, at most 1.41`, { color: FULL, size: 16, bold: true, alpha: f.at(3) });
        }
        g.label({ x: -3.6, y: 2.0 }, "5 points, 4 squares", { color: C.ink, size: 18, bold: true });
        return;
      }

      const [P, H] = [pigeons.value, holes.value];
      const width = Math.min(3.2, 14.6 / H - 0.25);
      const room = 14.6 / H;
      const x0 = -7.3;
      const floor = -2.6;
      const tall = 3.9;
      const byRemainder = f.step === 2;

      // Which hole each pigeon goes in.
      const into = Array.from({ length: P }, (_, i) => (byRemainder ? mod(NUMS[i], H) : i % H));
      const count = Array.from({ length: H }, (_, j) => into.filter((k) => k === j).length);
      const most = Math.max(...count);
      const need = Math.ceil(P / H);

      // The first two numbers to share a hole.
      let pair: [number, number] | null = null;
      if (byRemainder) {
        const seen = new Map<number, number>();
        for (let i = 0; i < P && !pair; i++) {
          const r = into[i];
          if (seen.has(r)) pair = [seen.get(r)!, i];
          else seen.set(r, i);
        }
      }

      const cols = Math.max(1, Math.floor(width / (byRemainder ? 0.66 : 0.4)));
      for (let j = 0; j < H; j++) {
        const left = x0 + j * room + (room - width) / 2;
        const isFull = f.step >= 1 && count[j] === most && most >= 2;
        box(g, { x: left, y: floor }, { x: left + width, y: floor + tall }, { color: isFull ? FULL : HOLE, fill: tint(isFull ? FULL : HOLE, 0.08), width: 2 });
        g.label({ x: left + width / 2, y: floor }, byRemainder ? `r = ${j}` : String(count[j]), { color: isFull ? FULL : C.dim, size: 13, bold: true, dy: -14 });
        const rows = Math.max(1, Math.ceil(count[j] / cols));
        const rh = Math.min(byRemainder ? 0.44 : 0.4, (tall - 0.2) / rows);
        const cw = width / cols;
        let slot = 0;
        for (let i = 0; i < P; i++) {
          if (into[i] !== j) continue;
          const at = { x: left + cw * ((slot % cols) + 0.5), y: floor + 0.25 + rh * Math.floor(slot / cols) };
          slot++;
          const shown = Math.min(1, (f.step === 0 ? f.at(0) : byRemainder ? f.at(2) : 1) * P - i + 1);
          const inPair = pair !== null && (i === pair[0] || i === pair[1]);
          if (byRemainder) g.label(at, String(NUMS[i]), { color: inPair ? FULL : BIRD, size: 13, bold: true, alpha: shown });
          else g.point(at, { color: isFull ? FULL : BIRD, r: Math.min(6, rh * 14), alpha: shown });
        }
      }

      const head = (text: string, color: string, row = 0): void => {
        g.label({ x: 0, y: 3.9 - row * 0.7 }, text, { color, size: 17, bold: true });
      };
      if (f.step === 0) {
        head(`${P} pigeons, ${H} holes`, C.ink);
        head(P > H ? "more pigeons than holes: some hole holds two" : "no more pigeons than holes: no hole need hold two", P > H ? FULL : C.dim, 1);
      } else if (f.step === 1) {
        head(`${P} ÷ ${H} = ${fmt(P / H, 2)}, rounded up ${need}`, C.ink);
        head(`the fullest hole holds ${most}`, FULL, 1);
      } else if (pair) {
        const [a, b] = [NUMS[pair[0]], NUMS[pair[1]]];
        const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
        head(`${a} and ${b} both leave remainder ${mod(a, H)}`, C.ink);
        head(`${hi} − ${lo} = ${hi - lo} = ${H} × ${(hi - lo) / H}`, FULL, 1);
      } else {
        head(`${P} numbers, ${H} remainders`, C.ink);
        head("no two share a remainder yet", C.dim, 1);
      }
    },

    readout(f) {
      const [P, H] = [pigeons.value, holes.value];
      if (f.step === 3) {
        return [{ label: "Pigeonhole", tex: "5 \\text{ points} > 4 \\text{ squares}" }, { label: "So", tex: "\\text{two points within } \\sqrt{1^2 + 1^2} = \\sqrt{2}", tone: "good" }];
      }
      const rows: Readout[] = [{ label: "Fullest hole", tex: `\\ge \\left\\lceil \\frac{${P}}{${H}} \\right\\rceil = ${Math.ceil(P / H)}`, tone: P > H ? "good" : "dim" }];
      if (f.step === 2) rows.push({ label: "Holes", tex: `\\text{remainders } 0, \\ldots, ${H - 1}` });
      return rows;
    },

    likes: [
      {
        title: "Socks in the dark",
        text: "A drawer holds black socks and white socks. Pull out three without looking and two must match: three socks, two colours.",
      },
      {
        title: "Musical chairs",
        text: "With one chair fewer than players, someone is left standing, or, if everyone squeezes in, two share a chair. Nobody needs to watch the game to know it.",
      },
    ],

    uses: [
      {
        title: "No compressor shrinks everything",
        text: "There are $2^n$ files of $n$ bits but only $2^n - 1$ files shorter than that. A compressor that made every file shorter would have to send two different files to the same short file, and then it could not tell them apart when unpacking. So any lossless compressor makes some files longer; it wins only on files with patterns.",
        tags: ["computing"],
        image: {
          src: compressionPigeonholeImage,
          caption: "Eight 3-bit files, only seven shorter ones: two files would have to share a short file.",
          alt: "Eight 3-bit files on the left, 000 to 111, with arrows to the seven shorter files on the right: the empty file, 0, 1, 00, 01, 10 and 11. Two arrows, in gold, land on the same short file.",
        },
      },
      {
        title: "Two heads with the same hair count",
        text: "A human head has at most about 150,000 hairs, and a city of a million people has more people than possible hair counts. So at least two people in the city have exactly the same number of hairs, and in fact at least $\\lceil 1000000 / 150001 \\rceil = 7$ do, though nobody could find them.",
        tags: ["health"],
        image: {
          src: hairCountTwinsImage,
          caption: "A million people and at most 150,001 hair counts from 0 to 150,000: at least seven people share a count.",
          alt: "A crowd of small head outlines beside a row of numbered boxes from 0 to 150,000, with seven heads gathered into one box outlined in gold.",
        },
      },
    ],
  };
});
