// Where the question sheet sits and how big it is, once the learner has moved
// or resized it (capture.ts). Pure: boxes in, boxes out, in CSS pixels of the
// window. Until the learner takes hold of it the sheet has no box and opens
// under its pill at its natural size.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Gap kept between the sheet and the window's edges. */
export const GAP = 8;

/** The smallest the sheet can be made: room for its header, box and buttons. */
export const MIN: Size = { width: 260, height: 180 };

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

/**
 * `box` brought inside a window of size `view`: no smaller than MIN and no
 * larger than the window allows, and moved until the part of it on show —
 * `shown` pixels tall, as when folded to its header — is wholly on screen.
 */
export function fitBox(box: Box, view: Size, shown: number = box.height): Box {
  const width = clamp(box.width, Math.min(MIN.width, view.width - 2 * GAP), view.width - 2 * GAP);
  const height = clamp(box.height, Math.min(MIN.height, view.height - 2 * GAP), view.height - 2 * GAP);
  const tall = Math.min(shown, height);
  return {
    left: clamp(box.left, GAP, view.width - width - GAP),
    top: clamp(box.top, GAP, view.height - tall - GAP),
    width,
    height,
  };
}

/** `box` dragged by its header through (dx, dy), kept on screen. */
export function moveBox(box: Box, dx: number, dy: number, view: Size, shown: number = box.height): Box {
  return fitBox({ ...box, left: box.left + dx, top: box.top + dy }, view, shown);
}

/**
 * `box` resized from its bottom-right corner through (dx, dy). The top-left
 * corner stays put; the size stops at MIN and at the window's edges.
 */
export function resizeBox(box: Box, dx: number, dy: number, view: Size): Box {
  const width = clamp(box.width + dx, MIN.width, view.width - box.left - GAP);
  const height = clamp(box.height + dy, MIN.height, view.height - box.top - GAP);
  return fitBox({ ...box, width, height }, view);
}

/** A box as kept in storage, or null for one never set or not readable. */
export function parseBox(raw: string | null): Box | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { left, top, width, height } = value as Record<string, unknown>;
    const parts = [left, top, width, height];
    if (!parts.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return { left, top, width, height } as Box;
  } catch {
    return null;
  }
}
