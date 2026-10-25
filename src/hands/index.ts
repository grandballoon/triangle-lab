// Hand input for a lesson page, in one call. Wires the pieces together —
// tracker → pose → interpreter → pointer bridge + overlay — and runs the
// per-frame loop. Everything a page needs to know about hands is the options
// and the handle below; the rest of src/hands is private to this module.

import { HandInterpreter, type HandState } from "./interpreter.ts";
import { HandOverlay, type OverlayHand } from "./overlay.ts";
import { HandsPanel, type CameraControl, type HandsStatus } from "./panel.ts";
import { PointerBridge, type HandKey } from "./pointerBridge.ts";
import {
  classifyPose,
  palmPoint,
  pinchPoint,
  pinchRatio,
  type HandFrame,
  type XY,
} from "./pose.ts";
import { defaultSettings, SettingsStore, type Action } from "./settings.ts";
import { HandTracker } from "./tracker.ts";

export type { Action } from "./settings.ts";
export type { HandFrame } from "./pose.ts";
export { HAND_POINTER_TYPE } from "./pointerBridge.ts";

export interface HandsOptions {
  /** The page's webcam <video>, mirrored and covering the viewport. */
  video: HTMLVideoElement;
  /** Whether both hands may drag at once (see PointerBridge). */
  multiPointer: boolean;
  /** Called when a held pose fires its bound action. */
  onAction?: (action: Action) => void;
  /** The page's camera, for the settings sheet to turn on and off. */
  camera?: CameraControl;
}

export interface Hands {
  /** Hands seen in the latest frame, in screen pixels. Empty when off. */
  frames(): readonly HandFrame[];
}

// MediaPipe drops single frames routinely; a hand keeps its grab this long
// after vanishing so a drag is not flung loose mid-gesture.
const VANISH_GRACE_MS = 250;

interface Live {
  readonly interpreter: HandInterpreter;
  lastSeenMs: number;
  lastCursor: XY;
}

export function startHands(options: HandsOptions): Hands {
  const touchFirst = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const store = new SettingsStore(undefined, defaultSettings(touchFirst));
  const panel = new HandsPanel(store, options.camera);
  const overlay = new HandOverlay();
  const bridge = new PointerBridge(options.multiPointer);
  const live = new Map<HandKey, Live>();

  let tracker: HandTracker | null = null;
  let loading = false;
  let failed = false;
  let frames: HandFrame[] = [];

  function status(): HandsStatus {
    if (!store.get().enabled) return "off";
    if (options.camera && !options.camera.on()) return "noCamera";
    if (failed) return "failed";
    if (tracker) return "ready";
    return options.video.readyState >= 2 ? "loading" : "camera";
  }

  function ensureTracker(): void {
    if (tracker || loading || failed || options.video.readyState < 2) return;
    loading = true;
    HandTracker.create()
      .then((t) => (tracker = t))
      .catch((err) => {
        failed = true;
        console.error("Hand tracking unavailable:", err);
      })
      .finally(() => (loading = false));
  }

  function tick(nowMs: number): void {
    const settings = store.get();
    if (settings.enabled) ensureTracker();
    panel.setStatus(status());

    frames = settings.enabled && tracker ? tracker.detect(options.video, nowMs) : [];
    const shown: OverlayHand[] = [];

    for (const frame of frames) {
      if (settings.hands !== "both" && settings.hands !== frame.side) continue;
      let hand = live.get(frame.side);
      if (!hand) {
        hand = { interpreter: new HandInterpreter(), lastSeenMs: nowMs, lastCursor: { x: 0, y: 0 } };
        live.set(frame.side, hand);
      }
      const state: HandState = hand.interpreter.update(
        {
          pose: classifyPose(frame),
          pinchRatio: pinchRatio(frame),
          pinchPoint: pinchPoint(frame),
          palmPoint: palmPoint(frame),
        },
        settings,
        nowMs,
      );
      hand.lastSeenMs = nowMs;
      hand.lastCursor = state.cursor;
      bridge.update(frame.side, state.cursor, {
        started: state.grabStarted,
        ended: state.grabEnded,
        active: state.grabbing,
      });
      if (state.fired) options.onAction?.(state.fired);
      shown.push({ frame, state });
    }

    for (const [key, hand] of live) {
      if (nowMs - hand.lastSeenMs <= VANISH_GRACE_MS) continue;
      bridge.drop(key, hand.lastCursor);
      live.delete(key);
    }

    overlay.render(shown, settings.showSkeleton);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return { frames: () => frames };
}
