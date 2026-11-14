// Figures held between two hands. Each function reads the hands a frame saw
// and says where the figure's points go, or null while two hands are not in
// view, when the lesson leaves its points to be dragged. Pure.

import { lerp, mid, type Vec } from "../geo.ts";
import type { HandPoints } from "../scene.ts";

// MediaPipe landmarks.
const WRIST = 0;
const THUMB_BASE = 2;
const INDEX_BASE = 5;
const INDEX_TIP = 8;

/** The first two hands in view, left one first on screen; null with fewer. */
export function handPair(hands: readonly HandPoints[]): readonly [HandPoints, HandPoints] | null {
  if (hands.length < 2) return null;
  const [a, b] = hands;
  return a.points[WRIST].x <= b.points[WRIST].x ? [a, b] : [b, a];
}

/**
 * An angle opened between two hands, heels together like a book: the vertex
 * between the wrists, one arm out to each index fingertip. `P` is on the
 * right-hand arm and `Q` on the left, so the angle runs P, V, Q.
 */
export function protractorOf(hands: readonly HandPoints[]): { V: Vec; P: Vec; Q: Vec } | null {
  const pair = handPair(hands);
  if (!pair) return null;
  const [left, right] = pair;
  return {
    V: mid(left.points[WRIST], right.points[WRIST]),
    P: right.points[INDEX_TIP],
    Q: left.points[INDEX_TIP],
  };
}

/** The web between a hand's thumb and index finger. */
const web = (hand: HandPoints): Vec => lerp(hand.points[THUMB_BASE], hand.points[INDEX_BASE], 0.5);

/**
 * A triangle framed by two hands, index fingertips touching above and thumbs
 * below: `A` and `B` at the left and right webs between thumb and finger, `C`
 * where the index fingertips meet.
 */
export function triangleOf(hands: readonly HandPoints[]): { A: Vec; B: Vec; C: Vec } | null {
  const pair = handPair(hands);
  if (!pair) return null;
  const [left, right] = pair;
  return { A: web(left), B: web(right), C: mid(left.points[INDEX_TIP], right.points[INDEX_TIP]) };
}
