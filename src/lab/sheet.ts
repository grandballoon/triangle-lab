// How the reader sizes the step column on a phone, where it sits under the
// figure like a sheet: the grip on its top edge is dragged, tapped or keyed,
// and each gives the height it leaves the steps. Pure: heights in CSS px in,
// a height out, or null for the height the steps would take of themselves
// (layout.ts). sheet-grip.ts holds the grip and hears the pointer.

/** The heights the steps may be given (layout.ts `stepsRange`). */
export interface Range {
  min: number;
  max: number;
}

/** A press that moves less than this, in px, is a tap rather than a drag. */
export const TAP_PX = 6;

/** How far one press of an arrow key moves the grip, in px. */
const KEY_STEP_PX = 32;

export const clampHeight = (height: number, range: Range): number =>
  Math.round(Math.min(range.max, Math.max(range.min, height)));

/** The height after the grip, pressed at `startY` on steps `start` tall, is dragged to `y`. */
export const dragged = (start: number, startY: number, y: number, range: Range): number =>
  clampHeight(start + startY - y, range);

/**
 * A tap on the grip opens the steps as tall as they go, and a second tap
 * gives them back the height they would take of themselves.
 */
export const tapped = (chosen: number | null, range: Range): number | null =>
  chosen !== null && chosen >= range.max ? null : range.max;

/**
 * The height after a key pressed on the grip, with the steps `shown` tall
 * and the reader's `chosen` height, or undefined for a key it does not use.
 * Enter and Space act as a tap.
 */
export function keyed(shown: number, chosen: number | null, key: string, range: Range): number | null | undefined {
  switch (key) {
    case "ArrowUp":
      return clampHeight(shown + KEY_STEP_PX, range);
    case "ArrowDown":
      return clampHeight(shown - KEY_STEP_PX, range);
    case "End":
      return range.max;
    case "Home":
      return range.min;
    case "Enter":
    case " ":
      return tapped(chosen, range);
    default:
      return undefined;
  }
}

/**
 * The chosen height as a share of the window, the way it is kept between
 * visits, so that it still fits when the phone is turned or the window
 * changes; null stays null.
 */
export const toShare = (chosen: number | null, windowHeight: number): number | null =>
  chosen === null || !(windowHeight > 0) ? null : chosen / windowHeight;

export const fromShare = (share: number | null, windowHeight: number): number | null =>
  share === null ? null : Math.round(share * windowHeight);

/** A share read back from storage, or null when there is none or it is not one. */
export function parseShare(stored: string | null): number | null {
  if (stored === null) return null;
  const share = Number(stored);
  return Number.isFinite(share) && share > 0 && share < 1 ? share : null;
}
