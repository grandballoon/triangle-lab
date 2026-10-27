// The equation lessons' shared algebra: sampling a curve into drawable runs,
// lines as Ax + By = C and where two meet, and the roots and coefficients of
// polynomials.

import { describe, expect, it } from "vitest";
import {
  combine,
  fromRoots,
  fromStage,
  lineText,
  lineThrough,
  meet,
  onStage,
  pieces,
  pointsOf,
  realRoots,
  signChanges,
  texLine,
  texPolynomial,
  type Graph,
} from "./algebra.ts";

describe("graphs", () => {
  const graph: Graph = { origin: { x: -7, y: -3 }, unit: { x: 0.5, y: 20 } };

  it("carries a point to the stage and back", () => {
    expect(onStage(graph, { x: 2, y: 100 })).toEqual({ x: -3, y: 2 });
    expect(fromStage(graph, { x: -3, y: 2 })).toEqual({ x: 2, y: 100 });
  });

  it("cuts a curve where it is undefined or far off screen", () => {
    const runs = pieces((x) => 1 / x, -4, 4, -5, 5, 80);
    expect(runs).toHaveLength(2);
    // No sample further out than half the window's height.
    for (const run of runs) for (const p of run) expect(Math.abs(p.y)).toBeLessThanOrEqual(10);
    expect(runs[0].every((p) => p.x < 0)).toBe(true);
    expect(runs[1].every((p) => p.x > 0)).toBe(true);
  });

  it("keeps a curve whole while it stays in reach", () => {
    expect(pieces((x) => x * x, -2, 2, -5, 5, 40)).toHaveLength(1);
    expect(pieces(Math.sqrt, -2, 2, -5, 5, 40)[0][0].x).toBe(0);
  });
});

describe("lines", () => {
  it("writes the line through two lattice points with no common factor and A > 0", () => {
    expect(lineThrough({ x: -2, y: 1 }, { x: 4, y: -3 })).toEqual({ A: 2, B: 3, C: -1 });
    expect(lineThrough({ x: 5, y: 2 }, { x: 1, y: -1 })).toEqual({ A: 3, B: -4, C: 7 });
    expect(lineThrough({ x: 0, y: 2 }, { x: 3, y: 2 })).toEqual({ A: 0, B: 1, C: 2 });
  });

  it("finds one crossing, none for parallels, or the whole line", () => {
    const first = { A: 2, B: 3, C: -1 };
    expect(meet(first, { A: 3, B: -4, C: 7 })).toEqual({ kind: "point", at: { x: 1, y: -1 } });
    expect(meet({ A: 2, B: -4, C: 7 }, { A: 1, B: -2, C: 2 })).toEqual({ kind: "none" });
    expect(meet({ A: 2, B: -2, C: 6 }, { A: 1, B: -1, C: 3 })).toEqual({ kind: "same" });
  });

  it("cancels a variable with the right multipliers, through the crossing", () => {
    const first = { A: 2, B: 3, C: -1 };
    const second = { A: 3, B: -4, C: 7 };
    // −3 × first + 2 × second cancels x: −17y = 17.
    expect(combine(first, -3, second, 2)).toEqual({ A: 0, B: -17, C: 17 });
    expect(combine({ A: 1, B: -2, C: 2 }, 2, { A: 2, B: -4, C: 7 }, -1)).toEqual({ A: 0, B: 0, C: -3 });
  });

  it("gives two points of a line, or none for 0 = C", () => {
    const l = { A: 2, B: 3, C: -1 };
    for (const p of pointsOf(l)!) expect(l.A * p.x + l.B * p.y).toBeCloseTo(l.C);
    expect(pointsOf({ A: 0, B: 0, C: 3 })).toBeNull();
  });

  it("writes a line as LaTeX and as canvas text", () => {
    expect(texLine({ A: 2, B: -3, C: -1 })).toBe("2x - 3y = -1");
    expect(lineText({ A: 1, B: 1, C: 3 })).toBe("x + y = 3");
    expect(lineText({ A: 2, B: -3, C: -1 })).toBe("2x − 3y = −1");
  });
});

describe("polynomials", () => {
  it("finds a quadratic's real roots, smallest first", () => {
    expect(realRoots(1, -3, 2)).toEqual([1, 2]);
    expect(realRoots(-1, 0, 4)).toEqual([-2, 2]);
    expect(realRoots(1, -4, 4)).toEqual([2]);
    expect(realRoots(1, 0, 1)).toEqual([]);
  });

  it("multiplies out a product of root factors", () => {
    expect(fromRoots([])).toEqual([1]);
    expect(fromRoots([2, 3])).toEqual([1, -5, 6]);
    expect(fromRoots([1, 2, 3])).toEqual([1, -6, 11, -6]);
    expect(texPolynomial(fromRoots([1, 2, 3]))).toBe("x^3 - 6x^2 + 11x - 6");
    expect(texPolynomial(fromRoots([0, 0]))).toBe("x^2");
  });

  it("counts sign changes, missing a curve that only touches", () => {
    expect(signChanges((x) => (x - 1) * (x - 2) * (x - 3), -10, 10)).toBe(3);
    expect(signChanges((x) => (x - 1) ** 2, -10, 10)).toBe(0);
    expect(signChanges((x) => x * x + 1, -10, 10)).toBe(0);
  });
});
