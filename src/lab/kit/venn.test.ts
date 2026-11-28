import { describe, expect, it } from "vitest";
import { polygonArea } from "../geo.ts";
import { membership, patterns, region, spot, type Box, type Disc } from "./venn.ts";

const BOX: Box = { x0: -6, y0: -4, x1: 6, y1: 4 };
const TWO: Disc[] = [
  { c: { x: -1, y: 0 }, r: 2 },
  { c: { x: 1, y: 0 }, r: 2 },
];
const THREE: Disc[] = [
  { c: { x: -1, y: 0.6 }, r: 2 },
  { c: { x: 1, y: 0.6 }, r: 2 },
  { c: { x: 0, y: -1.1 }, r: 2 },
];

describe("venn", () => {
  it("lists every membership pattern once", () => {
    expect(patterns(2)).toEqual([[false, false], [true, false], [false, true], [true, true]]);
    expect(patterns(3)).toHaveLength(8);
  });

  for (const [name, discs] of [["two", TWO], ["three", THREE]] as const) {
    it(`cuts the box into regions that fill it exactly (${name} circles)`, () => {
      const total = patterns(discs.length).reduce((sum, m) => sum + polygonArea(region(discs, m, BOX)), 0);
      expect(total).toBeCloseTo(96, 1);
    });

    it(`puts each region's spot inside that region (${name} circles)`, () => {
      for (const m of patterns(discs.length)) expect(membership(spot(discs, m, BOX), discs)).toEqual(m);
    });
  }

  it("gives the lens of two circles its true area", () => {
    // Two radius-2 circles 2 apart overlap in 2r²·acos(d/2r) − (d/2)·√(4r² − d²).
    const lens = 8 * Math.acos(0.5) - Math.sqrt(12);
    expect(polygonArea(region(TWO, [true, true], BOX))).toBeCloseTo(lens, 2);
  });
});
