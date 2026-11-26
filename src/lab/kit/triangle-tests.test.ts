import { describe, expect, it } from "vitest";
import { angleAt, dist, toDeg } from "../geo.ts";
import {
  AAA_K, example, isFlat, measure, SIMILAR_K, snapRight, ssaCorners, TESTS, works, type Part, type Tri,
} from "./triangle-tests.ts";

// The lesson's starting triangle: scalene, no right angle, smallest angle at C.
const SCALENE: Tri = { A: { x: -6.6, y: -3.2 }, B: { x: -1, y: -3.2 }, C: { x: -5.2, y: 2.6 } };
// Right at C: a 3-4-5 triangle.
const RIGHT: Tri = { A: { x: -6, y: -3 }, B: { x: -2, y: -3 }, C: { x: -6 + 3.2 * 0.8, y: -3 + 3.2 * 0.6 } };
const FLAT: Tri = { A: { x: -6, y: 0 }, B: { x: -2, y: 0 }, C: { x: -4, y: 0.01 } };

const SIDES: Part[] = [
  { kind: "side", ends: ["B", "C"] },
  { kind: "side", ends: ["C", "A"] },
  { kind: "side", ends: ["A", "B"] },
];
const ANGLES: Part[] = (["A", "B", "C"] as const).map((at) => ({ kind: "angle", at }));

const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6);

describe("TESTS", () => {
  it("says what each test proves", () => {
    expect(Object.fromEntries(TESTS.map((t) => [t.key, t.proves]))).toEqual({
      SSS: "congruence",
      SAS: "congruence",
      ASA: "congruence",
      AAS: "congruence",
      HL: "congruence",
      SSA: "nothing",
      AAA: "similarity",
      "AA~": "similarity",
      "SSS~": "similarity",
      "SAS~": "similarity",
      "SSA~": "nothing",
    });
  });

  it("counts a test as working when it proves what its family asks", () => {
    expect(TESTS.filter((t) => !works(t)).map((t) => t.key)).toEqual(["SSA", "AAA", "SSA~"]);
  });
});

describe("example", () => {
  it("pins a copy of the triangle for every congruence test that works", () => {
    for (const test of TESTS.filter((t) => t.family === "congruence" && works(t) && t.key !== "HL")) {
      const ex = example(SCALENE, test.key);
      expect(ex.status, test.key).toBe("pinned");
      expect(ex.impostor).toBeNull();
      for (const part of [...SIDES, ...ANGLES]) close(measure(ex.copy!, part), measure(SCALENE, part));
    }
  });

  it("pins a copy scaled by k for every similarity test that works", () => {
    for (const test of TESTS.filter((t) => t.family === "similarity" && works(t))) {
      const ex = example(SCALENE, test.key);
      expect(ex.status, test.key).toBe("pinned");
      expect(ex.k).toBe(SIMILAR_K);
      for (const part of SIDES) close(measure(ex.copy!, part) / measure(SCALENE, part), SIMILAR_K);
      for (const part of ANGLES) close(measure(ex.copy!, part), measure(SCALENE, part));
    }
  });

  it("asks for a right angle at C before HL, and pins the copy once there is one", () => {
    expect(example(SCALENE, "HL")).toMatchObject({ status: "needs-right", copy: null });
    const ex = example(RIGHT, "HL");
    expect(ex.status).toBe("pinned");
    close(measure(ex.copy!, { kind: "angle", at: "C" }), 90);
  });

  it("finds an SSA impostor that shares the given parts but not the third side", () => {
    const ex = example(SCALENE, "SSA");
    expect(ex.status).toBe("fooled");
    for (const part of ex.given) close(measure(ex.impostor!, part), measure(SCALENE, part));
    expect(Math.abs(measure(ex.impostor!, ex.tell!) - measure(SCALENE, ex.tell!))).toBeGreaterThan(0.3);
  });

  it("scales the SSA impostor with the copy for similarity, keeping the given ratios but not the third", () => {
    const ex = example(SCALENE, "SSA~");
    expect(ex.status).toBe("fooled");
    for (const part of ex.given) {
      const ratio = part.kind === "side" ? SIMILAR_K : 1;
      close(measure(ex.impostor!, part) / measure(SCALENE, part), ratio);
    }
    expect(Math.abs(measure(ex.impostor!, ex.tell!) / measure(SCALENE, ex.tell!) - SIMILAR_K)).toBeGreaterThan(0.05);
  });

  it("finds no second SSA triangle when the corner opposite the longest side is right", () => {
    expect(example(RIGHT, "SSA").status).toBe("unique-here");
  });

  it("nests a smaller AAA impostor with the same angles in the copy's corner A", () => {
    const ex = example(SCALENE, "AAA");
    expect(ex.status).toBe("fooled");
    expect(ex.impostor!.A).toEqual(ex.copy!.A);
    for (const part of ANGLES) close(measure(ex.impostor!, part), measure(SCALENE, part));
    close(measure(ex.impostor!, ex.tell!) / measure(SCALENE, ex.tell!), AAA_K);
  });

  it("tests nothing on a flat triangle", () => {
    expect(isFlat(FLAT)).toBe(true);
    for (const test of TESTS) expect(example(FLAT, test.key).status).toBe("flat");
  });

  it("builds every loci crossing on the copy", () => {
    for (const test of TESTS) {
      const ex = example(SCALENE, test.key);
      for (const locus of ex.loci) {
        if (locus.kind === "arc") for (const at of locus.at) close(dist(locus.center, at), locus.r);
      }
    }
  });
});

describe("ssaCorners", () => {
  it("sets the angle at the smallest corner, beside the longest side", () => {
    expect(ssaCorners(SCALENE)).toEqual({ v: "C", w: "B", u: "A" });
  });
});

describe("snapRight", () => {
  const a = { x: -2, y: 0 };
  const b = { x: 2, y: 0 };

  it("makes the angle at C exactly right when it is near", () => {
    const c = snapRight(a, b, { x: 0.5, y: 1.95 });
    close(toDeg(angleAt(a, c, b)), 90);
  });

  it("leaves C alone when the angle is far from right", () => {
    expect(snapRight(a, b, { x: 0, y: 4 })).toEqual({ x: 0, y: 4 });
  });
});

describe("the lesson's steps", () => {
  it("open with an introduction, then name one test a step, in TESTS order", async () => {
    const { Scene } = await import("../scene.ts");
    const { default: build } = await import("../lessons/triangle-tests.ts");
    const titles = build(new Scene("#38d9a9")).steps.map((s) => s.title);
    expect(titles.length).toBe(TESTS.length + 1);
    TESTS.forEach((test, i) => expect(titles[i + 1], test.key).toContain(test.key.replace("~", "")));
  });
});
