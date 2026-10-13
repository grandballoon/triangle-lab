// MediaPipe HandLandmarker wrapper. Owns the model lifecycle and converts each
// video frame into HandFrames in screen pixels; nothing downstream sees a
// MediaPipe type.
//
// The library, its WASM runtime and the ~8 MB model load lazily on first use,
// the latter two from CDNs. If any of that fails (offline, blocked) the caller
// reports it and the page stays fully usable with the pointer.

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { videoToScreen, type HandFrame } from "./pose.ts";

// The runtime must match the installed package exactly, so the version comes
// from node_modules at build time (vite.config.ts) rather than a literal here.
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export class HandTracker {
  private lastVideoTime = -1;
  private lastResult: HandFrame[] = [];

  private constructor(private readonly landmarker: HandLandmarker) {}

  static async create(): Promise<HandTracker> {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
    return new HandTracker(landmarker);
  }

  /**
   * Hands in the current video frame. Safe to call every animation frame: it
   * returns [] until the video has pixels and reuses the last result when the
   * camera has not produced a new frame yet.
   */
  detect(video: HTMLVideoElement, nowMs: number): HandFrame[] {
    if (video.readyState < 2 || video.videoWidth === 0) return [];
    if (video.currentTime === this.lastVideoTime) return this.lastResult;
    this.lastVideoTime = video.currentTime;

    const result = this.landmarker.detectForVideo(video, nowMs);
    const videoSize = { width: video.videoWidth, height: video.videoHeight };
    const view = { width: window.innerWidth, height: window.innerHeight };
    this.lastResult = result.landmarks.map((landmarks, i) => ({
      // MediaPipe labels handedness as if the image were already mirrored. We
      // feed it the raw camera frame, so its "Left" is the user's right hand.
      side: result.handedness[i]?.[0]?.categoryName === "Left" ? "right" : "left",
      screen: landmarks.map((l) => videoToScreen(l, videoSize, view)),
      world: result.worldLandmarks[i] ?? landmarks,
    }));
    return this.lastResult;
  }
}
