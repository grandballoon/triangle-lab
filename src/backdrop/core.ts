// The decisions behind the photo backdrop, as pure functions over values:
// which file of a drop or paste is a photo, where the photo sits in the
// window, and how a drag, a pinch, the wheel, a button or a key moves it.
// The DOM is the shell's (index.ts, arrange.ts).

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the photo sits. At scale 1 it just covers the window, as the camera's
 * video does; `scale` multiplies that size. `x` and `y` are how far its centre
 * lies from the window's, in widths and heights of the photo at scale 1, so a
 * photo lined up with the figure stays roughly lined up when the window
 * changes shape.
 */
export interface Placement {
  x: number;
  y: number;
  scale: number;
}

/** A box on the screen, in pixels. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Centred, just covering the window. */
export const COVER: Placement = { x: 0, y: 0, scale: 1 };

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 8;

/** One press of a size button, or of + and −. */
export const ZOOM_STEP = 1.25;

/** How far an arrow key moves the photo, in pixels; with Shift held, further. */
const NUDGE = 10;
const NUDGE_FAR = 50;

/** The first image among these files, if there is one. */
export function firstImage<T extends { type: string }>(files: Iterable<T>): T | null {
  for (const file of files) if (file.type.startsWith("image/")) return file;
  return null;
}

/** Whether a drag carries files, rather than text or a link from the page. */
export function carriesFiles(types: readonly string[]): boolean {
  return types.includes("Files");
}

/** What the top-bar pill offers to do, given whether a photo is showing. */
export function pillLabel(showing: boolean): string {
  return showing ? "Arrange the background photo" : "Use a photo as the background";
}

/** The size at which a photo of this size just covers the window. */
export function coverSize(photo: Size, window: Size): Size {
  const k = Math.max(window.width / photo.width, window.height / photo.height);
  return { width: photo.width * k, height: photo.height * k };
}

/** Where a photo of this size is drawn in this window. */
export function photoBox(photo: Size, window: Size, at: Placement): Box {
  const base = coverSize(photo, window);
  const width = base.width * at.scale;
  const height = base.height * at.scale;
  const cx = window.width / 2 + at.x * base.width;
  const cy = window.height / 2 + at.y * base.height;
  return { left: cx - width / 2, top: cy - height / 2, width, height };
}

/** The photo moved by this many pixels. */
export function moveBy(at: Placement, by: Point, photo: Size, window: Size): Placement {
  const base = coverSize(photo, window);
  return { ...at, x: at.x + by.x / base.width, y: at.y + by.y / base.height };
}

/**
 * The photo resized by `factor`, within MIN_SCALE and MAX_SCALE, about the
 * window point `about`, which keeps its place on the photo.
 */
export function zoomAbout(at: Placement, factor: number, about: Point, photo: Size, window: Size): Placement {
  const scale = clampScale(at.scale * factor);
  const k = scale / at.scale;
  const base = coverSize(photo, window);
  const cx = window.width / 2 + at.x * base.width;
  const cy = window.height / 2 + at.y * base.height;
  return {
    x: (about.x + (cx - about.x) * k - window.width / 2) / base.width,
    y: (about.y + (cy - about.y) * k - window.height / 2) / base.height,
    scale,
  };
}

/** The photo resized by `factor` about the window's centre, as the size buttons do. */
export function zoomBy(at: Placement, factor: number, photo: Size, window: Size): Placement {
  return zoomAbout(at, factor, { x: window.width / 2, y: window.height / 2 }, photo, window);
}

/**
 * The photo after one of two pointers pinching it moved from `was` to `now`,
 * the other holding at `other`: resized by how much further apart they are,
 * about the point between them, and moved with that point.
 */
export function pinch(at: Placement, was: Point, now: Point, other: Point, photo: Size, window: Size): Placement {
  const apart = (p: Point): number => Math.hypot(p.x - other.x, p.y - other.y);
  const mid = (p: Point): Point => ({ x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 });
  const factor = apart(was) > 0 ? apart(now) / apart(was) : 1;
  const from = mid(was);
  const to = mid(now);
  return moveBy(zoomAbout(at, factor, from, photo, window), { x: to.x - from.x, y: to.y - from.y }, photo, window);
}

/**
 * How much one wheel event resizes the photo. A trackpad's pinch arrives as
 * the wheel, in pixels; a mouse's notches may come in lines.
 */
export function wheelFactor(deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.exp(-pixels * 0.002);
}

/** The size shown beside the size buttons, as a percentage of covering the window. */
export function percent(at: Placement): string {
  return `${Math.round(at.scale * 100)}%`;
}

/** What a key does while the photo is being arranged. */
export type KeyAction = { kind: "move"; by: Point } | { kind: "zoom"; factor: number } | { kind: "fit" } | { kind: "done" };

export function keyAction(key: string, shift: boolean): KeyAction | null {
  const step = shift ? NUDGE_FAR : NUDGE;
  switch (key) {
    case "ArrowLeft":
      return { kind: "move", by: { x: -step, y: 0 } };
    case "ArrowRight":
      return { kind: "move", by: { x: step, y: 0 } };
    case "ArrowUp":
      return { kind: "move", by: { x: 0, y: -step } };
    case "ArrowDown":
      return { kind: "move", by: { x: 0, y: step } };
    case "+":
    case "=":
      return { kind: "zoom", factor: ZOOM_STEP };
    case "-":
    case "_":
      return { kind: "zoom", factor: 1 / ZOOM_STEP };
    case "0":
      return { kind: "fit" };
    case "Escape":
    case "Enter":
      return { kind: "done" };
    default:
      return null;
  }
}

/** A placement read back from storage; anything garbled is taken as COVER. */
export function readPlacement(raw: unknown): Placement {
  if (!raw || typeof raw !== "object") return COVER;
  const { x, y, scale } = raw as Record<string, unknown>;
  const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (!finite(x) || !finite(y) || !finite(scale) || scale <= 0) return COVER;
  return { x, y, scale: clampScale(scale) };
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
