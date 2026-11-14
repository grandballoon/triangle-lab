import { describe, expect, it } from "vitest";
import { TAU, vec } from "../geo.ts";
import {
  angleFrom,
  asymptotes,
  MAX_STEP_SECONDS,
  quadrantOf,
  ratiosOf,
  signOf,
  tanBranches,
  turned,
  wave,
} from "./unit-circle.ts";

const deg = (d: number): number => (d * Math.PI) / 180;

describe("the unit circle", () => {
  it("reads sin as the height, cos as the width and tan as their ratio", () => {
    const r = ratiosOf(deg(30));
    expect(r.sin).toBeCloseTo(0.5);
    expect(r.cos).toBeCloseTo(Math.sqrt(3) / 2);
    expect(r.tan).toBeCloseTo(1 / Math.sqrt(3));
  });

  it("leaves tan undefined where the radius is vertical", () => {
    expect(ratiosOf(deg(90)).tan).toBeNull();
    expect(ratiosOf(deg(270)).tan).toBeNull();
    expect(ratiosOf(deg(180)).tan).toBeCloseTo(0);
  });

  it("numbers the quadrants counter-clockwise from the positive x-axis", () => {
    expect([10, 100, 190, 280, 360].map((d) => quadrantOf(deg(d)))).toEqual([1, 2, 3, 4, 1]);
    expect(quadrantOf(-deg(10))).toBe(4);
  });

  it("measures a point's angle in [0, 2π)", () => {
    expect(angleFrom(vec(1, 1), vec(1, 3))).toBeCloseTo(Math.PI / 2);
    expect(angleFrom(vec(0, 0), vec(1, -1))).toBeCloseTo(deg(315));
  });

  it("signs a coordinate", () => {
    expect([signOf(0.2), signOf(-0.2), signOf(0)]).toEqual(["+", "−", "+"]);
  });
});

describe("turning", () => {
  it("advances counter-clockwise at the given speed", () => {
    expect(turned(1, 0.05, 2)).toBeCloseTo(1.1);
  });

  it("starts again after a full turn", () => {
    expect(turned(TAU - 0.05, 0.05, 2)).toBeCloseTo(0.05);
  });

  it("never jumps after a long gap or runs backwards", () => {
    expect(turned(1, 30, 2)).toBeCloseTo(1 + MAX_STEP_SECONDS * 2);
    expect(turned(1, -1, 2)).toBe(1);
  });
});

describe("waves", () => {
  it("samples a function from one angle to another", () => {
    const pts = wave(Math.sin, 0, Math.PI, 4);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts.at(-1)!.x).toBeCloseTo(Math.PI);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(1);
    expect(wave(Math.sin, 1, 1)).toEqual([]);
  });

  it("finds the asymptotes of tan at the odd multiples of 90°", () => {
    expect(asymptotes(0, TAU).map((a) => Math.round((a * 180) / Math.PI))).toEqual([90, 270]);
    expect(asymptotes(0, deg(80))).toEqual([]);
  });

  it("cuts tan into branches between asymptotes, clipped to the band", () => {
    const branches = tanBranches(0, TAU, 2);
    expect(branches).toHaveLength(3); // 0–90°, 90°–270°, 270°–360°
    for (const b of branches) {
      for (const p of b) expect(Math.abs(p.y)).toBeLessThanOrEqual(2);
    }
    expect(branches[0][0]).toEqual({ x: 0, y: 0 });
    expect(branches[0].at(-1)!.y).toBeCloseTo(2);
    expect(branches[1][0].y).toBeCloseTo(-2);
    expect(branches[2].at(-1)!.x).toBeCloseTo(TAU);
  });

  it("draws only as much tan as has been traced", () => {
    const branches = tanBranches(0, deg(45), 2);
    expect(branches).toHaveLength(1);
    expect(branches[0].at(-1)!.y).toBeCloseTo(1);
  });
});
