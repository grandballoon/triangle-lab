// Laying out several figures of one size side by side, for the standalone
// pages that show a few triangles at once. Pure: the page measures its
// canvas and draws; this only decides where each figure goes and how large.

/** A rectangle in screen pixels, by its top-left corner. */
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One figure's cell, by its centre. */
export interface Cell {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface Grid {
  cells: Cell[];
  /** Screen pixels per figure unit: the largest at which `content` fits a cell. */
  scale: number;
}

/**
 * Split `area` into `count` equal cells, with as many columns as lets a
 * figure `content` units across and tall be drawn largest. A short last row
 * is centred under the full rows above it.
 */
export function grid(count: number, area: Area, content: { w: number; h: number }): Grid {
  let best = { cols: 1, scale: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const scale = Math.min(area.w / cols / content.w, area.h / rows / content.h);
    if (scale > best.scale) best = { cols, scale };
  }

  const { cols, scale } = best;
  const rows = Math.ceil(count / cols);
  const w = area.w / cols;
  const h = area.h / rows;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const col = i % cols;
    cells.push({
      cx: area.x + area.w / 2 + (col - (inRow - 1) / 2) * w,
      cy: area.y + (row + 0.5) * h,
      w,
      h,
    });
  }
  return { cells, scale };
}
