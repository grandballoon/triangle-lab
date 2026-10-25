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

  it("keeps the room around each figure in figure units while it is drawn large", () => {
    // 1 unit of room each side of a 2-unit figure: 4 units per 400 px cell.
    const { scale } = grid(1, { x: 0, y: 0, w: 400, h: 400 }, { w: 2, h: 2 }, { units: 1, px: 20 });
    expect(scale).toBe(100);
  });

  it("keeps the room in screen pixels once the figure is drawn small", () => {
    // 1 unit would be 25 px; 40 px are kept instead, leaving 120 px for the figure.
    const { scale } = grid(1, { x: 0, y: 0, w: 200, h: 200 }, { w: 6, h: 6 }, { units: 1, px: 40 });
    expect(scale).toBe(20);
  });

  it("counts the pixel room when choosing the columns", () => {
    // Two wide figures stack when drawn bare, but 40 px of room around each
    // would leave stacked cells only 20 px for a figure 1 unit tall.
    const area = { x: 0, y: 0, w: 400, h: 200 };
    const wide = { w: 4, h: 1 };
    expect(new Set(grid(2, area, wide).cells.map((c) => c.cx)).size).toBe(1);
    expect(new Set(grid(2, area, wide, { units: 0, px: 40 }).cells.map((c) => c.cy)).size).toBe(1);
  });
});
