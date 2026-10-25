// Keeping the standalone figures usable on a small touch screen: how near a
// finger must come to grab a knob, how far fixed-size captions shrink, and
// where a captioned figure sits. Pure, except `fillFitted`, which measures
// and draws with a canvas.

export interface Vec {
  x: number;
  y: number;
}

/** The least grab radius, in CSS px, for a finger or a hand: the lab's pick radii (lab/shell.ts). */
const REACH: Record<string, number> = { touch: 36, hand: 46 };

/** How near a pointer of `pointerType` must come to grab a knob: the lesson's own `radius`, widened for a finger or a hand. */
export function grabRadius(pointerType: string, radius: number): number {
  return Math.max(radius, REACH[pointerType] ?? 0);
}

/** The index of the point nearest `p` and within `radius` of it, or -1 when none is. */
export function nearest(p: Vec, points: readonly Vec[], radius: number): number {
  let best = -1;
  let bestD = radius;
  points.forEach((q, i) => {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** How much fixed-size captions and the gaps around them shrink on a `w`×`h` canvas: not at all on a desktop, to 0.68 on a phone. */
export function captionScale(w: number, h: number): number {
  return Math.min(1, Math.max(0.68, Math.min(w, h) / 520));
}

/**
 * The y of the centre of a figure reaching `reach` px above and below it,
 * with `below` px of caption under it, on a canvas `h` px tall whose top
 * `top` px belong to the top bar: the canvas's middle, moved just enough to
 * clear both, or halfway between when it cannot clear both.
 */
export function centreY(h: number, top: number, reach: number, below: number): number {
  const lo = top + reach;
  const hi = h - below - reach;
  return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, h / 2));
}

export interface FittedText {
  size: number;
  lines: string[];
}

/**
 * The font size and lines that fit `text` into `room` px across: its own
 * `size` when it fits, else smaller, down to `min`, and below that wrapped
 * onto as many lines as it takes at `min`. `measure(text, size)` is the
 * width of `text` drawn at `size`.
 */
export function fitText(
  text: string,
  size: number,
  min: number,
  room: number,
  measure: (text: string, size: number) => number,
): FittedText {
  const width = measure(text, size);
  if (width <= room) return { size, lines: [text] };
  // Text grows in proportion to its size.
  const shrunk = Math.floor((size * room) / width);
  if (shrunk >= min) return { size: shrunk, lines: [text] };
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const longer = line ? `${line} ${word}` : word;
    if (line && measure(longer, min) > room) {
      lines.push(line);
      line = word;
    } else {
      line = longer;
    }
  }
  lines.push(line);
  return { size: min, lines };
}

export interface TextStyle {
  /** The font at a size in px, as a canvas font string. */
  font: (px: number) => string;
  /** The size to draw at when the text fits. */
  size: number;
  /** The least size to shrink to before wrapping; 70% of `size`, but never under 10 px, by default. */
  min?: number;
  /** Which way further lines go from the first: down, or up for a caption on a bottom edge. */
  grow?: "down" | "up";
}

/**
 * Fill `text` at (x, y), fitted into `room` px across (fitText), using the
 * context's alignment and fill. Any further lines stack 1.25 sizes apart.
 */
export function fillFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  room: number,
  { font, size, min = Math.max(10, Math.ceil(size * 0.7)), grow = "down" }: TextStyle,
): void {
  const measure = (t: string, px: number): number => {
    ctx.font = font(px);
    return ctx.measureText(t).width;
  };
  const fitted = fitText(text, size, min, room, measure);
  const step = fitted.size * 1.25;
  const first = grow === "up" ? y - (fitted.lines.length - 1) * step : y;
  ctx.font = font(fitted.size);
  fitted.lines.forEach((line, i) => ctx.fillText(line, x, first + i * step));
}
