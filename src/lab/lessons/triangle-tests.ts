// Every congruence and similarity test on one triangle. The learner shapes
// triangle ABC on the left; the step column lists the tests, the working ones
// and the ones that fail, one a step. Scrolling to a test builds, on the
// right, every triangle that shares with ABC the parts the test names: one
// copy when the test works, a copy and a different impostor when it fails.
// What fits is worked out by the pure kit/triangle-tests.ts; this file draws it.

import { C, tint, type Draw } from "../draw.ts";
import { add, centroid, dist, fmt, inBox, normalize, scale, sub, type Vec } from "../geo.ts";
import {
  example, measure, snapRight, testOf, TESTS, works,
  type Example, type Locus, type Name, type Part, type Proof, type Test, type TestKey, type Tri,
} from "../kit/triangle-tests.ts";
import { lesson, type Readout } from "../scene.ts";
import fireLookoutImage from "../../images/fire-lookout.svg";
import roofTrussImage from "../../images/roof-truss.svg";
import wheelchairRampImage from "../../images/wheelchair-ramp.svg";

// Each side is coloured by the corner opposite it (a = BC, b = CA, c = AB) and
// each angle by its corner, with ticks and arcs counted alike, so a part reads
// the same on every triangle it is marked on.
const SIDE: Record<Name, { color: string; ticks: number }> = {
  A: { color: C.gold, ticks: 1 },
  B: { color: C.cyan, ticks: 2 },
  C: { color: C.orange, ticks: 3 },
};
const ANGLE: Record<Name, { color: string; arcs: 1 | 2 | 3 }> = {
  A: { color: C.violet, arcs: 1 },
  B: { color: C.pink, arcs: 2 },
  C: { color: C.blue, arcs: 3 },
};
const NAMES: readonly Name[] = ["A", "B", "C"];
const DASH = [6, 5];
const LOCUS = { color: C.dim, width: 1.5, dash: DASH };
// How far past its crossing a ray runs, and how long each compass arc is, in stage units.
const RAY_OVERSHOOT = 1.2;
const ARC_LENGTH = 1.1;

// The learner's corners stay on the left half; the examples are built on the right.
const BOX = inBox(-7.6, -0.6, -3.8, 3.8);

const opposite = (part: Part & { kind: "side" }): Name => NAMES.find((n) => !part.ends.includes(n))!;
const sideColor = (part: Part & { kind: "side" }): string => SIDE[opposite(part)].color;

const TITLE: Record<TestKey, string> = {
  SSS: "SSS · side, side, side",
  SAS: "SAS · side, angle, side",
  ASA: "ASA · angle, side, angle",
  AAS: "AAS · angle, angle, side",
  HL: "HL · hypotenuse and leg",
  SSA: "SSA · does not prove congruence",
  AAA: "AAA · does not prove congruence",
  "AA~": "AA · similarity",
  "SSS~": "SSS · similarity",
  "SAS~": "SAS · similarity",
  "SSA~": "SSA · does not prove similarity",
};

/** The line under each test's step title: what matching those parts proves. */
const PROVES: Record<Proof, string> = {
  congruence: "Proves congruence and similarity",
  similarity: "Proves similarity only",
  nothing: "Proves nothing",
};
const proves = (key: TestKey): string => PROVES[testOf(key).proves];

/** A corner's name with primes, as TeX: A, A', A''. */
const named = (n: Name, primes: number): string => n + "'".repeat(primes);

/** A part as TeX, on a triangle whose corners carry `primes`. */
function partTex(part: Part, primes: (n: Name) => number): string {
  if (part.kind === "angle") return `\\angle ${named(part.at, primes(part.at))}`;
  return part.ends.map((n) => named(n, primes(n))).join("");
}

const triTex = (primes: (n: Name) => number): string =>
  `\\triangle ${NAMES.map((n) => named(n, primes(n))).join("")}`;

const value = (part: Part, v: number): string => (part.kind === "angle" ? `${fmt(v, 0)}^\\circ` : fmt(v, 2));

/** Mark the given parts on a triangle, in their colours. */
function marks(g: Draw, t: Tri, ex: Example, o: { alpha: number; numbers?: boolean }): void {
  for (const part of ex.given) {
    if (part.kind === "side") {
      const [p, q] = part.ends.map((n) => t[n]);
      const { color, ticks } = SIDE[opposite(part)];
      g.segment(p, q, { color, width: 4, alpha: o.alpha });
      g.ticks(p, q, ticks, { color, alpha: o.alpha });
      if (o.numbers) g.label(outside(t, p, q, 22), fmt(dist(p, q), 2), { color, size: 13, alpha: o.alpha });
    } else {
      const [p, q] = NAMES.filter((n) => n !== part.at).map((n) => t[n]);
      const { color, arcs } = ANGLE[part.at];
      g.angle(p, t[part.at], q, { color, fill: true, r: 24, arcs, label: o.numbers, alpha: o.alpha });
    }
  }
  for (const part of ex.derived) {
    if (part.kind !== "angle") continue;
    const [p, q] = NAMES.filter((n) => n !== part.at).map((n) => t[n]);
    const { color, arcs } = ANGLE[part.at];
    g.angle(p, t[part.at], q, { color, r: 24, arcs, dash: [3, 3], alpha: 0.7 * o.alpha });
  }
}

/** A point beside the middle of side pq, pushed `px` screen pixels away from the triangle. */
function outside(t: Tri, p: Vec, q: Vec, px: number): Vec {
  const m = scale(add(p, q), 0.5);
  const away = normalize(sub(m, centroid([t.A, t.B, t.C])));
  return add(m, scale(away, px / 50));
}

/** Name each corner just outside the triangle. */
function cornerLabels(g: Draw, t: Tri, text: (n: Name) => string | null, color: string, alpha: number): void {
  const middle = centroid([t.A, t.B, t.C]);
  for (const n of NAMES) {
    const label = text(n);
    if (!label) continue;
    const away = normalize(sub(t[n], middle));
    g.label(t[n], label, { color, alpha, size: 14, bold: true, dx: away.x * 16, dy: away.y * 16 });
  }
}

function drawLocus(g: Draw, locus: Locus, alpha: number): void {
  if (locus.kind === "ray") {
    const end = add(locus.from, scale(sub(locus.through, locus.from), RAY_OVERSHOOT));
    g.segment(locus.from, end, { ...LOCUS, alpha });
    return;
  }
  const half = ARC_LENGTH / 2 / locus.r;
  for (const at of locus.at) {
    const bearing = Math.atan2(at.y - locus.center.y, at.x - locus.center.x);
    g.arc(locus.center, locus.r, bearing - half, bearing + half, { ...LOCUS, alpha });
  }
}

/** The line under the figure saying what the test made of this triangle. */
function caption(test: Test, ex: Example): { text: string; color: string } {
  switch (ex.status) {
    case "flat":
      return { text: "Pull the corners of your triangle apart.", color: C.dim };
    case "needs-right":
      return { text: "HL is for right triangles. Drag C until the angle there is 90°; it snaps.", color: C.red };
    case "unique-here":
      return { text: "Here the arc only touches the ray, so one triangle fits. Reshape yours and a second appears.", color: C.gold };
    case "pinned":
      return test.family === "congruence"
        ? { text: "Only one triangle has these parts: a copy of yours. The test works.", color: C.green }
        : { text: `Every triangle with these is a scaled copy of yours, here ×${fmt(ex.k, 1)}. The test works.`, color: C.green };
    case "fooled":
      return test.key === "AAA"
        ? { text: "The red triangle has the same angles but another size. The test fails.", color: C.red }
        : { text: "The red triangle has every marked part too, but another shape. The test fails.", color: C.red };
  }
}

function readouts(test: Test, ex: Example, yours: Tri): Readout[] {
  if (ex.status === "flat") return [{ tex: "\\text{Pull the corners apart}", tone: "dim" }];
  if (ex.status === "needs-right") {
    const at = measure(yours, { kind: "angle", at: "C" });
    return [{ label: "HL needs a right angle", tex: `\\angle C = ${fmt(at, 1)}^\\circ \\ne 90^\\circ`, tone: "warn" }];
  }
  const similar = test.family === "similarity";
  const plain = (): number => 0;
  const copy = (): number => 1;
  const impostor = (n: Name): number => (ex.moved.includes(n) ? 2 : 1);
  // How each triangle on show names its corners: the copy, then any impostor.
  const shown = ex.impostor ? [copy, impostor] : [copy];

  const rows: Readout[] = ex.given.map((part) => {
    const mine = measure(yours, part);
    if (similar && part.kind === "side") {
      const ratios = shown.map((primes) => `\\frac{${partTex(part, primes)}}{${partTex(part, plain)}}`);
      return { tex: `${[...new Set(ratios)].join(" = ")} = ${fmt(measure(ex.copy!, part) / mine, 2)}`, tone: "good" };
    }
    const names = [partTex(part, plain), ...shown.map((primes) => partTex(part, primes))];
    return { tex: `${[...new Set(names)].join(" = ")} = ${value(part, mine)}`, tone: "good" };
  });

  if (ex.status === "fooled" && ex.tell && ex.impostor) {
    const part = ex.tell;
    const mine = measure(yours, part);
    const theirs = measure(ex.impostor, part);
    rows.push({
      label: "But",
      tex: similar
        ? `\\frac{${partTex(part, impostor)}}{${partTex(part, plain)}} = ${fmt(theirs / mine, 2)} \\ne ${fmt(ex.k, 1)}`
        : `${partTex(part, plain)} = ${value(part, mine)},\\quad ${partTex(part, impostor)} = ${value(part, theirs)}`,
      tone: "warn",
    });
    const relation = similar ? "\\nsim" : "\\ncong";
    rows.push({ label: "Verdict", tex: `${triTex(impostor)} ${relation} ${triTex(plain)}`, tone: "warn" });
  } else if (ex.status === "unique-here") {
    rows.push({ label: "Verdict", tex: "\\text{one triangle, this time}", tone: "dim" });
  } else {
    const relation = similar ? "\\sim" : "\\cong";
    rows.push({ label: "Verdict", tex: `${triTex(copy)} ${relation} ${triTex(plain)}`, tone: "good" });
  }
  return rows;
}

export default lesson((s) => {
  const A = s.point(-6.6, -3.2, { label: "A", constrain: BOX });
  const B = s.point(-1.0, -3.2, { label: "B", constrain: BOX });
  const V = s.point(-5.2, 2.6, { label: "C", constrain: (p) => BOX(snapRight(A, B, BOX(p))) });

  const yours = (): Tri => ({ A: { x: A.x, y: A.y }, B: { x: B.x, y: B.y }, C: { x: V.x, y: V.y } });
  /** The test on show: none on the opening step, then one a step, in TESTS order. */
  const testAt = (step: number): Test | null => TESTS[step - 1] ?? null;

  return {
    steps: [
      {
        title: "One triangle, every test",
        text: "Drag the corners of your triangle on the left. Each step below is one test for whether two triangles match, first for congruence and then for similarity. Scroll to a test and the right side builds every triangle that shares with yours the parts the test names: one, if the test works, and a second, different one in red if it fails.",
      },
      {
        title: "SSS: three sides",
        subtitle: proves("SSS"),
        text: "Give all three sides, $a$, $b$ and $c$. On the right, the base $c$ is laid down and compass arcs of radius $b$ and $a$ are swung from its ends. They cross at one point above the base, so only one triangle fits: a copy of yours. SSS proves congruence.",
      },
      {
        title: "SAS: two sides and the angle between",
        subtitle: proves("SAS"),
        text: "Give the sides $b$ and $c$ and the angle $A$ between them. The angle aims a ray out of the corner, and the length $b$ marks one point on it. Nothing is left to choose, so SAS proves congruence.",
      },
      {
        title: "ASA: two angles and the side between",
        subtitle: proves("ASA"),
        text: "Give the angles $A$ and $B$ and the side $c$ between them. Each angle aims a ray out of one end of the base, and two rays cross once. ASA proves congruence.",
      },
      {
        title: "AAS: two angles and a side not between",
        subtitle: proves("AAS"),
        text: "Give the angles $A$ and $B$ and the side $a$, which is not between them. The three angles add up to $180^\\circ$, so the angle $C$ is known too, faintly marked. Then $a$ lies between two known angles, and this is ASA in disguise.",
      },
      {
        title: "HL: the hypotenuse and a leg",
        subtitle: proves("HL"),
        text: "For right triangles only: drag $C$ until the corner there squares off, and it snaps at $90^\\circ$. Give the hypotenuse $c$ and the leg $a$. The arc of radius $c$ about the end of $a$ meets the perpendicular once, so HL proves congruence.",
      },
      {
        title: "SSA does not work",
        subtitle: proves("SSA"),
        text: "Give an angle, the side beside it and the side opposite it. The arc swung with the opposite side can cross the ray twice, and the red triangle has all three parts too, yet a different shape. The test is set at your smallest angle, where a second triangle appears unless the corner opposite your longest side is right: then the arc only touches the ray, and that one case is HL.",
      },
      {
        title: "AAA does not work",
        subtitle: proves("AAA"),
        text: "Give all three angles and no side. A smaller triangle nested in the corner has the very same angles, so the angles alone cannot say how big a triangle is. AAA does not prove congruence, though it does prove similarity.",
      },
      {
        title: "Similarity by AA",
        subtitle: proves("AA~"),
        text: "Similar triangles may differ in size but not in shape. Give two angles; the third is then forced. Every triangle with those angles is a scaled copy of yours, here by $k = 0.6$. AA proves similarity.",
      },
      {
        title: "Similarity by SSS",
        subtitle: proves("SSS~"),
        text: "Give three sides in one ratio, $\\tfrac{a'}{a} = \\tfrac{b'}{b} = \\tfrac{c'}{c} = k$. Shrink the copy by $\\tfrac1k$ and SSS makes it congruent to yours, so the angles match. SSS in proportion proves similarity.",
      },
      {
        title: "Similarity by SAS",
        subtitle: proves("SAS~"),
        text: "Give two sides in one ratio, $\\tfrac{b'}{b} = \\tfrac{c'}{c} = k$, around an equal angle $A$. Shrink by $\\tfrac1k$ and SAS applies, so the triangles are similar.",
      },
      {
        title: "SSA does not prove similarity",
        subtitle: proves("SSA~"),
        text: "Two sides in one ratio and an angle not between them fail for the same reason SSA fails. The red triangle has the same angle and both ratios, but its third side is in another ratio, and its angles differ.",
      },
    ],

    likes: [
      {
        title: "Describing a triangle over the phone",
        text: "Tell a friend over the phone how to cut a triangle that matches yours, and each test is a message. Three lengths, or two lengths and the angle between them, and they cut your triangle exactly. Give an angle and the wrong pair of lengths, and they may cut a different one, through no fault of their own.",
      },
      {
        title: "A photo and its enlargement",
        text: "An enlarged photo keeps every angle and stretches every length by the same factor. Knowing that only the angles match tells you it is an enlargement, but not how big. That is the gap between AAA, which fails for congruence, and AA, which works for similarity.",
      },
    ],

    uses: [
      {
        title: "Rigid frames",
        text: "A triangle of three bars bolted at the corners cannot change shape, because SSS leaves only one triangle with those lengths. That is why bridges, cranes and roof trusses are built from triangles, while a rectangle of four bars folds flat.",
        image: {
          src: roofTrussImage,
          caption: "A roof truss: each triangle of timbers holds its shape, so the roof keeps its pitch under load.",
        },
      },
      {
        title: "Fixing a position from two angles",
        text: "Two observers a known distance apart each measure the angle to a fire on a hillside. Two angles and the side between them fix one triangle by ASA, so its far corner, the fire, is pinned down. Forest lookouts and surveyors have long located things this way.",
        image: {
          src: fireLookoutImage,
          caption: "Two lookouts a known distance apart each measure the angle to a fire on a hillside, and those two angles fix where the fire is.",
          alt: "Two people stand on the ground some way apart, with a fire and smoke on a green hill to the right; a dashed gold triangle joins the two people to the fire, with angle marks at both people and ticks on the side between them.",
        },
      },
      {
        title: "Checking a ramp against a plan",
        text: "A wheelchair ramp is drawn as a right triangle with a given length of slope and a given rise. HL says any ramp built with that hypotenuse and that leg has the same angle, so an inspector who measures the two lengths knows the slope without measuring it.",
        image: {
          src: wheelchairRampImage,
          caption: "A wheelchair ramp: its slope and its rise fix its angle by HL, so measuring two lengths checks it.",
        },
      },
    ],

    draw(g, f) {
      const t = yours();
      const test = testAt(f.step);
      const ex = test ? example(t, test.key) : null;
      const alpha = f.at(f.step);

      g.segment({ x: 0, y: 4.2 }, { x: 0, y: -4.2 }, { color: C.faint, width: 1 });
      g.label({ x: -4.1, y: 4.55 }, "Your triangle", { color: C.dim, size: 14 });
      g.polygon([t.A, t.B, t.C], { fill: "rgba(255, 255, 255, 0.05)", color: C.ink, width: 2 });

      if (!test || !ex) {
        g.label({ x: 4.1, y: 0 }, "Scroll to a test", { color: C.dim, size: 16 });
        return;
      }
      g.label({ x: 4.1, y: 4.55 }, TITLE[test.key], { color: works(test) ? g.accent : C.red, size: 14, bold: true });
      marks(g, t, ex, { alpha: 1, numbers: true });
      if (ex.status === "needs-right") {
        g.angle(t.A, t.C, t.B, { color: C.red, fill: true, r: 24, label: true });
      }

      for (const locus of ex.loci) drawLocus(g, locus, alpha);

      if (ex.copy) {
        const good = ex.status === "pinned";
        const color = good ? C.green : ex.status === "unique-here" ? C.gold : C.ink;
        g.polygon([ex.copy.A, ex.copy.B, ex.copy.C], {
          fill: tint(color, good ? 0.16 : 0.08),
          color,
          width: 2.5,
          alpha,
        });
        marks(g, ex.copy, ex, { alpha });
        cornerLabels(g, ex.copy, (n) => `${n}′`, color, alpha);
      }
      if (ex.impostor) {
        const imp = ex.impostor;
        g.polygon([imp.A, imp.B, imp.C], { fill: tint(C.red, 0.14), color: C.red, width: 2.5, alpha });
        marks(g, imp, ex, { alpha });
        cornerLabels(g, imp, (n) => (ex.moved.includes(n) ? `${n}″` : null), C.red, alpha);
        if (ex.tell?.kind === "side" && ex.copy) {
          const [p, q] = ex.tell.ends;
          const color = sideColor(ex.tell);
          for (const tri of [ex.copy, imp]) {
            g.segment(tri[p], tri[q], { color: C.red, width: 2, dash: [4, 4], alpha });
            g.label(outside(tri, tri[p], tri[q], 20), fmt(dist(tri[p], tri[q]), 2), { color, size: 13, alpha });
          }
        }
      }

      const line = caption(test, ex);
      g.label({ x: 0, y: -4.6 }, line.text, { color: line.color, size: 14 });
    },

    readout(f) {
      const test = testAt(f.step);
      if (!test) return [{ tex: "\\text{Scroll to a test}", tone: "dim" }];
      return readouts(test, example(yours(), test.key), yours());
    },
  };
});
