// Walking a knob round a triangle's edge, and a knob that locks onto a point of a side.

import { describe, expect, it } from "vitest";
import { vec } from "../geo.ts";
import { edgeAt, edgeDistanceOf, perimeterOf, slideToLock, walkedPath, walkOn, type Corners } from "./triangle-parts.ts";

// A 3-4-5 right triangle: AB = 3, BC = 5, CA = 4.
const T: Corners = [vec(0, 0), vec(3, 0), vec(0, 4)];

describe("walking the edge", () => {
  it("measures the way round, and finds the point any distance along it", () => {
    expect(perimeterOf(T)).toBe(12);
    expect(edgeAt(T, 0)).toEqual(vec(0, 0));
    expect(edgeAt(T, 1.5)).toEqual(vec(1.5, 0));
    expect(edgeAt(T, 5.5)).toEqual(vec(1.5, 2));
    expect(edgeAt(T, 10)).toEqual(vec(0, 2));
    expect(edgeAt(T, 99)).toEqual(vec(0, 0));
  });

  it("says how far along the walk the edge nearest a point is", () => {
    expect(edgeDistanceOf(T, vec(1.5, -1))).toBeCloseTo(1.5);
    expect(edgeDistanceOf(T, vec(2.3, 2.6))).toBeCloseTo(5.5);
    expect(edgeDistanceOf(T, vec(-1, 2))).toBeCloseTo(10);
  });

  it("keeps the walk going one way round, never jumping across its start", () => {
    expect(walkOn(2, 3, 12)).toBe(3);
    expect(walkOn(11.5, 0.2, 12)).toBe(12);
    expect(walkOn(0.3, 11.8, 12)).toBe(0);
    expect(walkOn(12, 11.5, 12)).toBe(11.5);
  });

  it("traces the edge walked, corner by corner", () => {
    expect(walkedPath(T, 1)).toEqual([vec(0, 0), vec(1, 0)]);
    expect(walkedPath(T, 5.5)).toEqual([vec(0, 0), vec(3, 0), vec(1.5, 2)]);
    expect(walkedPath(T, 12)).toEqual([vec(0, 0), vec(3, 0), vec(0, 4), vec(0, 0)]);
  });
});

describe("slideToLock", () => {
  const B = vec(0, 0);
  const C = vec(10, 0);
  const M = vec(5, 0);

  it("slides along the side, wherever it is pulled from", () => {
    expect(slideToLock(vec(2, 3), B, C, M, false, 0.5, 1.5)).toEqual({ at: vec(2, 0), locked: false });
    expect(slideToLock(vec(-4, 1), B, C, M, false, 0.5, 1.5)).toEqual({ at: B, locked: false });
  });

  it("locks onto its point when brought near, and lets go only when pulled well away", () => {
    expect(slideToLock(vec(5.4, 2), B, C, M, false, 0.5, 1.5)).toEqual({ at: M, locked: true });
    expect(slideToLock(vec(4, 0), B, C, M, false, 0.5, 1.5)).toEqual({ at: vec(4, 0), locked: false });
    expect(slideToLock(vec(4, 0), B, C, M, true, 0.5, 1.5)).toEqual({ at: M, locked: true });
    expect(slideToLock(vec(3, 0), B, C, M, true, 0.5, 1.5)).toEqual({ at: vec(3, 0), locked: false });
  });
});
