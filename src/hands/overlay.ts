// What the user sees of their own hands: a ring cursor per hand that fills
// while grabbing, an arc that sweeps round it while a pose is being held
// toward an action, and (optionally) the tracked skeleton. Drawn on its own
// click-through canvas above the page, so no lesson has to know about it.

import type { HandState } from "./interpreter.ts";
import type { HandFrame } from "./pose.ts";
import type { Action } from "./settings.ts";

export const ACTION_LABEL: Record<Action, string> = {
  next: "Next step",
  previous: "Previous step",
  reset: "Reset",
  notes: "Formulas",
};

export interface OverlayHand {
  readonly frame: HandFrame;
  readonly state: HandState;
}

const CURSOR = "#ffffff";
const GRAB = "#38d9a9";
const HOLD = "#ffd43b";
const RING_R = 13;

// Bones of the MediaPipe hand topology, as landmark index pairs.
const BONES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export class HandOverlay {
  private readonly canvas = document.createElement("canvas");
  private readonly ctx = this.canvas.getContext("2d")!;
  private dirty = false;

  constructor() {
    this.canvas.id = "hands-overlay";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.append(this.canvas);
  }

  render(hands: readonly OverlayHand[], showSkeleton: boolean): void {
    if (hands.length === 0 && !this.dirty) return;
    const { ctx } = this;
    this.fit();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.dirty = hands.length > 0;

    for (const { frame, state } of hands) {
      if (showSkeleton) this.skeleton(frame);
      this.cursor(state);
    }
  }

  private fit(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private skeleton(frame: HandFrame): void {
    const { ctx } = this;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    for (const [a, b] of BONES) {
      ctx.moveTo(frame.screen[a].x, frame.screen[a].y);
      ctx.lineTo(frame.screen[b].x, frame.screen[b].y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (const p of frame.screen) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private cursor(state: HandState): void {
    const { ctx } = this;
    const { x, y } = state.cursor;

    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 6;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = state.grabbing ? GRAB : CURSOR;
    ctx.beginPath();
    ctx.arc(x, y, RING_R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = state.grabbing ? GRAB : CURSOR;
    ctx.beginPath();
    ctx.arc(x, y, state.grabbing ? 7 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (!state.hold) return;
    // Sweeps clockwise from twelve o'clock; a full turn fires the action.
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = HOLD;
    ctx.beginPath();
    ctx.arc(x, y, RING_R + 9, -Math.PI / 2, -Math.PI / 2 + state.hold.progress * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";

    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(6, 10, 16, 0.8)";
    const label = ACTION_LABEL[state.hold.action];
    ctx.strokeText(label, x, y - RING_R - 18);
    ctx.fillStyle = HOLD;
    ctx.fillText(label, x, y - RING_R - 18);
  }
}
