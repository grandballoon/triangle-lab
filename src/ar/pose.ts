// Where the AR page's figure sheet sits in space, and what the learner's
// gestures do to it. Pure: a pose and a gesture in, a new pose out.
//
// The sheet is a flat rectangle, `Sheet` pixels in its own plane, that the
// learner moves, sizes and turns over the camera view as if it stood in the
// room. Its pose becomes one CSS `matrix3d` with the perspective folded in
// (`sheetMatrix`), so the browser draws the sheet in perspective, and the
// same matrix maps a pointer back onto the sheet (`unproject`), so a point
// drawn on it can still be grabbed.
//
// Screen coordinates are CSS pixels, x right and y down; z points from the
// screen toward the viewer, who looks from `focal` pixels in front of it.

import type { Vec } from "../lab/geo.ts";

export interface Pose {
  /** The sheet's centre, in pixels from the middle of the viewport. */
  x: number;
  y: number;
  /** Screen pixels per sheet pixel, before perspective. */
  scale: number;
  /** Lean about the horizontal axis, radians; positive tips the top away. */
  tilt: number;
  /** Lean about the vertical axis, radians; positive turns the right edge away. */
  turn: number;
  /** Turn within its own plane, radians counter-clockwise as seen. */
  spin: number;
  /** The camera's vertical field of view, radians. */
  fov: number;
}

export interface Size {
  width: number;
  height: number;
}

/** A 4×4 matrix, row by row. */
export type Matrix = readonly number[];

const DEG = Math.PI / 180;

export const LIMITS = {
  scale: { min: 0.1, max: 12 },
  lean: 85 * DEG,
  fov: { min: 10 * DEG, max: 120 * DEG },
} as const;

/** The nearest a sheet corner may come, as a share of the way to the viewer. */
const NEAREST = 0.8;

/** Radians of lean per pixel dragged. */
const LEAN_PER_PX = 0.008;

/** Where a sheet starts: centred, filling most of the window, lying back a little like a page on a desk. */
export function initialPose(view: Size, sheet: Size): Pose {
  return {
    x: 0,
    y: 0,
    scale: Math.min((0.86 * view.width) / sheet.width, (0.7 * view.height) / sheet.height),
    tilt: 30 * DEG,
    turn: 0,
    spin: 0,
    fov: 60 * DEG,
  };
}

/** How far in front of the screen the viewer's eye is, in pixels, for this field of view. */
export const focal = (view: Size, fov: number): number => view.height / 2 / Math.tan(fov / 2);

// --- Matrices ----------------------------------------------------------------

const multiply = (a: Matrix, b: Matrix): Matrix =>
  Array.from({ length: 16 }, (_, i) => {
    const r = Math.floor(i / 4);
    const c = i % 4;
    return a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + a[r * 4 + 3] * b[12 + c];
  });

const chain = (...ms: Matrix[]): Matrix => ms.reduce(multiply);

const translate = (x: number, y: number): Matrix => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, 0, 0, 0, 0, 1];
const scaling = (s: number): Matrix => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
const aboutX = (a: number): Matrix => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
};
const aboutY = (a: number): Matrix => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
};
const aboutZ = (a: number): Matrix => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};
const perspective = (d: number): Matrix => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / d, 1];

/**
 * Sheet pixels (origin top-left, y down) → homogeneous screen pixels. With y
 * down, a counter-clockwise spin as seen is a negative turn about z.
 */
export function sheetMatrix(pose: Pose, view: Size, sheet: Size): Matrix {
  return chain(
    translate(view.width / 2, view.height / 2),
    perspective(focal(view, pose.fov)),
    translate(pose.x, pose.y),
    aboutY(pose.turn),
    aboutX(pose.tilt),
    aboutZ(-pose.spin),
    scaling(pose.scale),
    translate(-sheet.width / 2, -sheet.height / 2),
  );
}

/** The matrix as a CSS transform, for an element whose transform origin is its top-left corner. */
export function cssMatrix(m: Matrix): string {
  const columns = [0, 1, 2, 3].flatMap((c) => [0, 1, 2, 3].map((r) => m[r * 4 + c]));
  return `matrix3d(${columns.map((n) => String(Math.round(n * 1e9) / 1e9)).join(",")})`;
}

/** Where a point of the sheet lands on screen, and its w (how far from the eye, 1 at the screen). */
export function project(m: Matrix, p: Vec): { at: Vec; w: number } {
  const x = m[0] * p.x + m[1] * p.y + m[3];
  const y = m[4] * p.x + m[5] * p.y + m[7];
  const w = m[12] * p.x + m[13] * p.y + m[15];
  return { at: { x: x / w, y: y / w }, w };
}

/**
 * The point of the sheet's plane under a screen point, or null where the
 * line of sight runs past the plane or meets it behind the eye.
 */
export function unproject(m: Matrix, s: Vec): Vec | null {
  // The plane z = 0 makes the matrix a homography over (x, y, 1).
  const [a, b, c] = [m[0], m[1], m[3]];
  const [d, e, f] = [m[4], m[5], m[7]];
  const [g, h, i] = [m[12], m[13], m[15]];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const u = ((e * i - f * h) * s.x + (c * h - b * i) * s.y + (b * f - c * e)) / det;
  const v = ((f * g - d * i) * s.x + (a * i - c * g) * s.y + (c * d - a * f)) / det;
  const w = ((d * h - e * g) * s.x + (b * g - a * h) * s.y + (a * e - b * d)) / det;
  if (Math.abs(w) < 1e-12) return null;
  const p = { x: u / w, y: v / w };
  // A plane point behind the eye projects to this screen point too.
  return project(m, p).w > 0 ? p : null;
}

/** Whether every corner of the sheet stays well in front of the eye. */
export function inView(pose: Pose, view: Size, sheet: Size): boolean {
  const m = sheetMatrix(pose, view, sheet);
  const corners = [
    { x: 0, y: 0 },
    { x: sheet.width, y: 0 },
    { x: 0, y: sheet.height },
    { x: sheet.width, y: sheet.height },
  ];
  return corners.every((p) => project(m, p).w >= 1 - NEAREST);
}

// --- Gestures ------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** An angle wrapped into (−π, π]. */
const wrap = (a: number): number => {
  const t = (a + Math.PI) % (2 * Math.PI);
  return (t <= 0 ? t + 2 * Math.PI : t) - Math.PI;
};

/** A pose kept within its limits. */
export function limited(pose: Pose): Pose {
  return {
    ...pose,
    scale: clamp(pose.scale, LIMITS.scale.min, LIMITS.scale.max),
    tilt: clamp(pose.tilt, -LIMITS.lean, LIMITS.lean),
    turn: clamp(pose.turn, -LIMITS.lean, LIMITS.lean),
    spin: wrap(pose.spin),
    fov: clamp(pose.fov, LIMITS.fov.min, LIMITS.fov.max),
  };
}

/**
 * `next` within limits, unless that would bring part of the sheet up to or
 * behind the eye, in which case the sheet stays as it was.
 */
export function settle(prev: Pose, next: Pose, view: Size, sheet: Size): Pose {
  const pose = limited(next);
  return inView(pose, view, sheet) ? pose : prev;
}

/** Slide the sheet across the screen. */
export const slid = (pose: Pose, dx: number, dy: number): Pose => ({ ...pose, x: pose.x + dx, y: pose.y + dy });

/** Lean the sheet as if rolling a ball under the pointer: the part dragged follows it. */
export const leaned = (pose: Pose, dx: number, dy: number): Pose => ({
  ...pose,
  tilt: pose.tilt - dy * LEAN_PER_PX,
  turn: pose.turn + dx * LEAN_PER_PX,
});

/** Size the sheet by `factor`, keeping the screen point `at` (from the viewport's middle) where it is. */
export const zoomed = (pose: Pose, factor: number, at: Vec): Pose => ({
  ...pose,
  scale: pose.scale * factor,
  x: at.x + (pose.x - at.x) * factor,
  y: at.y + (pose.y - at.y) * factor,
});

/**
 * Two pointers that held the sheet at `a0`, `b0` and now are at `a1`, `b1`
 * (from the viewport's middle): it slides, sizes and spins with them, as a
 * photo does under two fingers.
 */
export function pinched(pose: Pose, a0: Vec, b0: Vec, a1: Vec, b1: Vec): Pose {
  const span0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const span1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  if (span0 < 1 || span1 < 1) return pose;
  const k = span1 / span0;
  // Clockwise on screen, since y is down.
  const turn = Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x);
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
  const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const rx = (pose.x - m0.x) * k;
  const ry = (pose.y - m0.y) * k;
  return {
    ...pose,
    scale: pose.scale * k,
    spin: pose.spin - turn,
    x: m1.x + rx * c - ry * s,
    y: m1.y + rx * s + ry * c,
  };
}

/**
 * The sheet held by pointers, one of which moved from `from` to `to` (from
 * the viewport's middle) while `others` stayed put: alone it slides or leans
 * the sheet, and with another it pinches.
 */
export function dragged(pose: Pose, from: Vec, to: Vec, others: readonly Vec[], lean: boolean): Pose {
  if (others.length > 0) return pinched(pose, from, others[0], to, others[0]);
  return (lean ? leaned : slid)(pose, to.x - from.x, to.y - from.y);
}

// --- Picking -------------------------------------------------------------------

/**
 * The index of the grip nearest `at` on screen within `radius` pixels,
 * favouring later ones as the lab does (scene.ts `pick`), or -1.
 */
export function pickOnScreen(grips: readonly { at: Vec | null; enabled: boolean }[], at: Vec, radius: number): number {
  let best = -1;
  let bestD = radius;
  grips.forEach((g, i) => {
    if (!g.enabled || !g.at) return;
    const d = Math.hypot(g.at.x - at.x, g.at.y - at.y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/**
 * How many device pixels to give each sheet pixel so the sheet stays sharp
 * at its size on screen: in steps of a half, so small changes in size do not
 * reallocate the canvas, and never more than `maxWidth` device pixels across.
 */
export function sheetResolution(pose: Pose, dpr: number, sheet: Size, maxWidth: number): number {
  // Perspective enlarges the near edge; leave room for it.
  const wanted = dpr * Math.max(1, pose.scale * 1.3);
  return Math.min(Math.ceil(wanted * 2) / 2, Math.floor((maxWidth / sheet.width) * 2) / 2);
}
