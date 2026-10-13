/**
 * One-Euro filter (Casiez et al. 2012) for smoothing noisy 2D input like hand
 * landmarks. The cutoff adapts to speed: heavy smoothing when the hand is
 * still (kills jitter), light smoothing when it moves fast (kills lag). Pure —
 * usable on any pixel-space signal.
 */

interface XY {
  readonly x: number;
  readonly y: number;
}

export interface OneEuroParams {
  /** Baseline cutoff Hz: lower = smoother but laggier at rest. */
  minCutoff: number;
  /** Speed coefficient: higher = snappier tracking of fast motion. */
  beta: number;
  /** Cutoff for the derivative estimate; rarely needs tuning. */
  dCutoff: number;
}

/** Tuned for hand-landmark cursors in screen pixels at webcam framerates. */
export const HAND_CURSOR_PARAMS: OneEuroParams = {
  minCutoff: 1.2,
  beta: 0.02,
  dCutoff: 1.0,
};

class OneEuro1D {
  private xPrev: number | null = null;
  private dxPrev = 0;

  constructor(private readonly params: OneEuroParams) {}

  filter(x: number, dtSeconds: number): number {
    if (this.xPrev === null || dtSeconds <= 0) {
      this.xPrev = x;
      return x;
    }
    const dx = (x - this.xPrev) / dtSeconds;
    this.dxPrev = lowpass(dx, this.dxPrev, alpha(this.params.dCutoff, dtSeconds));
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.dxPrev);
    this.xPrev = lowpass(x, this.xPrev, alpha(cutoff, dtSeconds));
    return this.xPrev;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
  }
}

export class OneEuroFilter2D {
  private readonly fx: OneEuro1D;
  private readonly fy: OneEuro1D;
  private lastTimeMs: number | null = null;

  constructor(params: OneEuroParams = HAND_CURSOR_PARAMS) {
    this.fx = new OneEuro1D(params);
    this.fy = new OneEuro1D(params);
  }

  filter(p: XY, timeMs: number): { x: number; y: number } {
    const dt = this.lastTimeMs === null ? 0 : (timeMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = timeMs;
    return { x: this.fx.filter(p.x, dt), y: this.fy.filter(p.y, dt) };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.lastTimeMs = null;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function lowpass(x: number, prev: number, a: number): number {
  return a * x + (1 - a) * prev;
}
