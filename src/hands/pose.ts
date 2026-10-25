// Reading a hand: turns one frame of 21 landmarks into the few facts the rest
// of the app cares about — where the cursor is, how closed the pinch is, and
// which static pose (if any) the hand is making. Pure: no MediaPipe, no DOM.
//
// Two landmark sets come in per hand. `screen` is in CSS pixels, already
// mirrored to match the selfie view, and is used for anything positional.
// `world` is MediaPipe's metric 3D estimate centred on the hand; finger curl
// is judged there so it does not change with distance or perspective.

import type { Pose } from "./settings.ts";

export interface XY {
  readonly x: number;
  readonly y: number;
}

export interface XYZ extends XY {
  readonly z: number;
}

export interface HandFrame {
  /** The user's own hand, not MediaPipe's mirrored label. */
  readonly side: "left" | "right";
  readonly screen: readonly XY[];
  readonly world: readonly XYZ[];
}

/** Indices into the 21-point MediaPipe hand topology. */
export const LM = {
  WRIST: 0,
  THUMB_MCP: 2,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;

const FINGERS = [
  { pip: LM.INDEX_PIP, tip: LM.INDEX_TIP },
  { pip: LM.MIDDLE_PIP, tip: LM.MIDDLE_TIP },
  { pip: LM.RING_PIP, tip: LM.RING_TIP },
  { pip: LM.PINKY_PIP, tip: LM.PINKY_TIP },
] as const;

// A straight finger puts its tip ~1.3× as far from the wrist as its middle
// knuckle; a curled one brings the tip back inside the knuckle (~0.7×). The
// band between the two thresholds is "neither", which keeps half-bent fingers
// (a pinching index, a relaxed hand) from flickering between poses.
const EXTENDED_RATIO = 1.2;
const CURLED_RATIO = 1.0;
// Thumb tip to index knuckle, as a fraction of palm length.
const THUMB_OUT_RATIO = 0.65;
const THUMB_IN_RATIO = 0.5;
// A thumbs-up must actually point up: tip this far above its base on screen.
const THUMB_UP_RISE = 0.3;

type Curl = "extended" | "curled" | "between";

const d2 = (a: XY, b: XY): number => Math.hypot(a.x - b.x, a.y - b.y);
const d3 = (a: XYZ, b: XYZ): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function fingerCurl(world: readonly XYZ[], pip: number, tip: number): Curl {
  const wrist = world[LM.WRIST];
  const ratio = d3(world[tip], wrist) / Math.max(d3(world[pip], wrist), 1e-9);
  if (ratio > EXTENDED_RATIO) return "extended";
  if (ratio < CURLED_RATIO) return "curled";
  return "between";
}

function thumbCurl(world: readonly XYZ[]): Curl {
  const palm = Math.max(d3(world[LM.WRIST], world[LM.MIDDLE_MCP]), 1e-9);
  const ratio = d3(world[LM.THUMB_TIP], world[LM.INDEX_MCP]) / palm;
  if (ratio > THUMB_OUT_RATIO) return "extended";
  if (ratio < THUMB_IN_RATIO) return "curled";
  return "between";
}

/** The static pose this hand is making, or null when it is none of them. */
export function classifyPose(hand: HandFrame): Pose | null {
  const [index, middle, ring, pinky] = FINGERS.map((f) => fingerCurl(hand.world, f.pip, f.tip));
  const thumb = thumbCurl(hand.world);
  const up = (c: Curl): boolean => c === "extended";
  const down = (c: Curl): boolean => c === "curled";

  if (down(index) && down(middle) && down(ring) && down(pinky)) {
    if (thumb === "extended") {
      const rise = hand.screen[LM.THUMB_MCP].y - hand.screen[LM.THUMB_TIP].y;
      return rise > THUMB_UP_RISE * palmLength(hand) ? "thumbsUp" : null;
    }
    return "fist";
  }
  if (up(index) && up(middle) && up(ring) && up(pinky)) return thumb === "extended" ? "open" : null;
  if (up(index) && up(middle) && !up(ring) && !up(pinky)) return "victory";
  if (up(index) && down(middle) && down(ring) && down(pinky)) return "point";
  return null;
}

/** Wrist to middle knuckle on screen: the hand's apparent size in pixels. */
export function palmLength(hand: HandFrame): number {
  return d2(hand.screen[LM.WRIST], hand.screen[LM.MIDDLE_MCP]);
}

/**
 * Thumb-tip to index-tip distance as a fraction of palm length, so the same
 * threshold works at any distance from the camera. Infinity for a degenerate
 * palm, which reads as "not pinching".
 */
export function pinchRatio(hand: HandFrame): number {
  const palm = palmLength(hand);
  return palm > 0
    ? d2(hand.screen[LM.THUMB_TIP], hand.screen[LM.INDEX_TIP]) / palm
    : Number.POSITIVE_INFINITY;
}

/** Midpoint of thumb and index tips: where a pinch "is". */
export function pinchPoint(hand: HandFrame): XY {
  const t = hand.screen[LM.THUMB_TIP];
  const i = hand.screen[LM.INDEX_TIP];
  return { x: (t.x + i.x) / 2, y: (t.y + i.y) / 2 };
}

/** Centre of the palm: steady while the fingers close into a fist. */
export function palmPoint(hand: HandFrame): XY {
  const pts = [LM.WRIST, LM.INDEX_MCP, LM.PINKY_MCP].map((i) => hand.screen[i]);
  return {
    x: (pts[0].x + pts[1].x + pts[2].x) / 3,
    y: (pts[0].y + pts[1].y + pts[2].y) / 3,
  };
}

/**
 * Map a normalised video landmark to CSS pixels of an `object-fit: cover`
 * video that fills the viewport — the layout every lesson page uses — shown
 * mirrored (a camera facing the user) or as it is (one facing away).
 */
export function videoToScreen(
  norm: XY,
  video: { width: number; height: number },
  view: { width: number; height: number },
  mirrored = true,
): XY {
  const scale = Math.max(view.width / video.width, view.height / video.height);
  const shownW = video.width * scale;
  const shownH = video.height * scale;
  const x = norm.x * shownW - (shownW - view.width) / 2;
  const y = norm.y * shownH - (shownH - view.height) / 2;
  return { x: mirrored ? view.width - x : x, y };
}
