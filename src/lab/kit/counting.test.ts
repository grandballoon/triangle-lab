import { describe, expect, it } from "vitest";
import { arrangements, big, choose, factorial, ordering, orderings, pascalRow, subsets, texBig } from "./counting.ts";

describe("counting", () => {
  it("multiplies down for factorials and ordered choices", () => {
    expect([0, 1, 5, 10].map(factorial)).toEqual([1, 1, 120, 3628800]);
    expect(arrangements(5, 3)).toBe(60);
    expect(arrangements(8, 3)).toBe(336);
    expect(arrangements(3, 4)).toBe(0);
  });

  it("chooses without order", () => {
    expect(choose(5, 3)).toBe(10);
    expect(choose(49, 6)).toBe(13983816);
    expect(choose(8, 3)).toBe(56);
    expect(choose(4, 5)).toBe(0);
    expect(pascalRow(4)).toEqual([1, 4, 6, 4, 1]);
  });

  it("lists orderings and subsets", () => {
    expect(orderings(["a", "b", "c"]).map((o) => o.join(""))).toEqual(["abc", "acb", "bac", "bca", "cab", "cba"]);
    const all = orderings([1, 2, 3, 4]);
    expect(all.map((_, i) => ordering([1, 2, 3, 4], i))).toEqual(all);
    expect(subsets([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
    expect(subsets([1, 2, 3, 4, 5], 3).length).toBe(10);
  });

  it("prints big counts in groups of three", () => {
    expect(big(17576000)).toBe("17 576 000");
    expect(texBig(1296)).toBe("1{,}296");
    expect(texBig(671)).toBe("671");
  });
});
