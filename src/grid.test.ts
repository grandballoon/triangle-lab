import { describe, expect, it } from "vitest";
import { grid } from "./grid.ts";

const square = { w: 1, h: 1 };

describe("grid", () => {
  it("lays three figures in a row across a wide strip", () => {
    const { cells, scale } = grid(3, { x: 0, y: 0, w: 900, h: 300 }, square);
    expect(cells.map((c) => [c.cx, c.cy])).toEqual([
      [150, 150],
      [450, 150],
      [750, 150],
    ]);
    expect(scale).toBe(300);
  });

  it("stacks them in a column down a tall strip", () => {
    const { cells } = grid(3, { x: 0, y: 0, w: 300, h: 900 }, square);
    expect(cells.map((c) => [c.cx, c.cy])).toEqual([
      [150, 150],
      [150, 450],
      [150, 750],
    ]);
  });

  it("uses two rows in a square area, centring the short last row", () => {
    const { cells, scale } = grid(3, { x: 10, y: 20, w: 800, h: 800 }, square);
    expect(cells.map((c) => [c.cx, c.cy])).toEqual([
      [210, 220],
      [610, 220],
      [410, 620],
    ]);
    expect(scale).toBe(400);
  });

  it("weighs the figure's own proportions", () => {
    // A figure four times wider than tall fits a square area best one per row.
    const { cells } = grid(3, { x: 0, y: 0, w: 800, h: 800 }, { w: 4, h: 1 });
    expect(new Set(cells.map((c) => c.cx)).size).toBe(1);
  });
});
