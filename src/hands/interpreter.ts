// One hand's gesture state machine: feed it a reading per video frame and it
// answers the three questions a page needs — where is the cursor, is the hand
// "holding the button down", and did a held pose just fire an action. Pure:
// the caller supplies readings and the clock.

import type { XY } from "./pose.ts";
import type { Action, GestureSettings, Pose } from "./settings.ts";
import { ACTIONS } from "./settings.ts";
import { OneEuroFilter2D, type OneEuroParams } from "./smoothing.ts";

/** What pose.ts measured for one hand this frame. */
export interface HandReading {
  readonly pose: Pose | null;
  readonly pinchRatio: number;
  readonly pinchPoint: XY;
  readonly palmPoint: XY;
}

export interface HandState {
  /** Smoothed cursor position in CSS pixels. */
  readonly cursor: XY;
  readonly grabbing: boolean;
  /** True only on the frame the grab engaged / let go. */
  readonly grabStarted: boolean;
  readonly grabEnded: boolean;
  /** A bound pose being held, with progress 0–1 toward firing. */
  readonly hold: { readonly action: Action; readonly progress: number } | null;
  /** The action that fired on this frame, if any. */
  readonly fired: Action | null;
}

// Pinch engages below `start` and releases only above `start + gap`. A single
// threshold flickers when the fingers hover at the boundary and drops grabs
// mid-drag. Sensitivity 0.5 gives 0.32 / 0.48 of palm length.
const PINCH_START_MIN = 0.2;
const PINCH_START_SPAN = 0.24;
const PINCH_RELEASE_GAP = 0.16;

// Pose classification drops the odd frame. A fist grab survives gaps this
// long, and so does a pose being held toward an action.
const POSE_GRACE_MS = 120;

// Smoothing 0 → responsive but jittery, 1 → steady but trailing. 0.5 gives
// the 1.2 Hz baseline that suits a hand cursor at webcam frame rates.
const MIN_CUTOFF_FAST = 2.0;
const MIN_CUTOFF_STEADY = 0.4;

export function pinchThresholds(sensitivity: number): { start: number; release: number } {
  const start = PINCH_START_MIN + PINCH_START_SPAN * sensitivity;
  return { start, release: start + PINCH_RELEASE_GAP };
}

export class HandInterpreter {
  private readonly params: OneEuroParams = { minCutoff: 1.2, beta: 0.02, dCutoff: 1 };
  private readonly filter = new OneEuroFilter2D(this.params);
  private grabbing = false;
  private lastFistMs = -Infinity;
  private held: { action: Action; sinceMs: number; lastMs: number; fired: boolean } | null = null;

  update(r: HandReading, s: GestureSettings, nowMs: number): HandState {
    const wasGrabbing = this.grabbing;
    this.grabbing = this.nextGrab(r, s, nowMs);

    // The cursor rides the point that stays put while the grab closes: the
    // fingertips for a pinch, the palm for a fist.
    this.params.minCutoff =
      MIN_CUTOFF_FAST + (MIN_CUTOFF_STEADY - MIN_CUTOFF_FAST) * s.smoothing;
    const cursor = this.filter.filter(s.grab === "fist" ? r.palmPoint : r.pinchPoint, nowMs);

    const { hold, fired } = this.nextHold(r.pose, s, nowMs);
    return {
      cursor,
      grabbing: this.grabbing,
      grabStarted: this.grabbing && !wasGrabbing,
      grabEnded: !this.grabbing && wasGrabbing,
      hold,
      fired,
    };
  }

  /** Whether this hand is mid-grab (so a vanished hand can be released). */
  get isGrabbing(): boolean {
    return this.grabbing;
  }

  private nextGrab(r: HandReading, s: GestureSettings, nowMs: number): boolean {
    if (s.grab === "fist") {
      if (r.pose === "fist") this.lastFistMs = nowMs;
      return nowMs - this.lastFistMs <= (this.grabbing ? POSE_GRACE_MS : 0);
    }
    const { start, release } = pinchThresholds(s.pinchSensitivity);
    return this.grabbing ? r.pinchRatio <= release : r.pinchRatio < start;
  }

  private nextHold(
    pose: Pose | null,
    s: GestureSettings,
    nowMs: number,
  ): Pick<HandState, "hold" | "fired"> {
    // A hand that is dragging something is busy; poses mean nothing until it
    // lets go.
    const action = this.grabbing || !pose ? undefined : ACTIONS.find((a) => s.bindings[a] === pose);

    if (!action) {
      if (this.held && nowMs - this.held.lastMs > POSE_GRACE_MS) this.held = null;
    } else if (this.held?.action === action) {
      this.held.lastMs = nowMs;
    } else {
      this.held = { action, sinceMs: nowMs, lastMs: nowMs, fired: false };
    }
    if (!this.held) return { hold: null, fired: null };

    const progress = Math.min(1, (nowMs - this.held.sinceMs) / s.holdMs);
    // Fires once per hold: the pose must be dropped before it can fire again.
    const fires = progress >= 1 && !this.held.fired;
    if (fires) this.held.fired = true;
    return {
      hold: this.held.fired && !fires ? null : { action: this.held.action, progress },
      fired: fires ? this.held.action : null,
    };
  }
}
