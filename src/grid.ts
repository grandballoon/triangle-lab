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
  /** Screen pixels per figure unit: the largest at which the figure and its room fit a cell. */
  scale: number;
}

/**
 * Room kept free around a figure on every side, for its labels and knobs:
 * the larger of `units` figure units and `px` screen pixels. Labels drawn at
 * a fixed screen size need the pixels once the figure is drawn small.
 */
export interface Room {
  units: number;
  px: number;
}

const NO_ROOM: Room = { units: 0, px: 0 };

/**
 * Split `area` into `count` equal cells, with as many columns as lets a
 * figure `content` units across and tall, with `room` around it, be drawn
 * largest. A short last row is centred under the full rows above it.
 */
export function grid(count: number, area: Area, content: { w: number; h: number }, room: Room = NO_ROOM): Grid {
  let best = { cols: 1, scale: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const scale = Math.min(fit(area.w / cols, content.w, room), fit(area.h / rows, content.h, room));
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

/** Screen pixels per unit at which `size` units, with `room` on both sides, fill `length` pixels. */
function fit(length: number, size: number, room: Room): number {
  return Math.min(length / (size + 2 * room.units), (length - 2 * room.px) / size);
}
