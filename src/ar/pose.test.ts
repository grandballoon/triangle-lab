import { describe, expect, it } from "vitest";
import {
  cssMatrix,
  dragged,
  focal,
  initialPose,
  inView,
  leaned,
  limited,
  LIMITS,
  pickOnScreen,
  pinched,
  project,
  settle,
  sheetMatrix,
  sheetResolution,
  slid,
  unproject,
  zoomed,
  type Pose,
} from "./pose.ts";

const VIEW = { width: 1200, height: 800 };
const SHEET = { width: 960, height: 600 };
const DEG = Math.PI / 180;
const flat: Pose = { x: 0, y: 0, scale: 1, tilt: 0, turn: 0, spin: 0, fov: 60 * DEG };

const round = (p: { x: number; y: number }): { x: number; y: number } => ({
  x: Math.round(p.x * 1e6) / 1e6,
  y: Math.round(p.y * 1e6) / 1e6,
});
const at = (pose: Pose, p: { x: number; y: number }) => round(project(sheetMatrix(pose, VIEW, SHEET), p).at);

describe("sheetMatrix", () => {
  it("lays a flat sheet at scale 1 centred in the viewport, pixel for pixel", () => {
    expect(at(flat, { x: 0, y: 0 })).toEqual({ x: 120, y: 100 });
    expect(at(flat, { x: 960, y: 600 })).toEqual({ x: 1080, y: 700 });
  });

  it("slides and sizes about the sheet's centre", () => {
    const pose = { ...flat, x: 50, y: -20, scale: 0.5 };
    expect(at(pose, { x: 480, y: 300 })).toEqual({ x: 650, y: 380 });
    expect(at(pose, { x: 0, y: 0 })).toEqual({ x: 410, y: 230 });
  });

  it("spins counter-clockwise as seen", () => {
    // The right edge's middle swings up the screen.
    const p = at({ ...flat, spin: 90 * DEG }, { x: 960, y: 300 });
    expect(p).toEqual({ x: 600, y: -80 });
  });

  it("tipping the top away shrinks the top edge and grows the bottom", () => {
    const pose = { ...flat, tilt: 40 * DEG };
    const top = at(pose, { x: 960, y: 0 }).x - at(pose, { x: 0, y: 0 }).x;
    const bottom = at(pose, { x: 960, y: 600 }).x - at(pose, { x: 0, y: 600 }).x;
    expect(top).toBeLessThan(960);
    expect(bottom).toBeGreaterThan(960);
  });

  it("turning the right edge away shrinks it", () => {
    const pose = { ...flat, turn: 40 * DEG };
    const right = at(pose, { x: 960, y: 600 }).y - at(pose, { x: 960, y: 0 }).y;
    const left = at(pose, { x: 0, y: 600 }).y - at(pose, { x: 0, y: 0 }).y;
    expect(right).toBeLessThan(600);
    expect(left).toBeGreaterThan(600);
  });

  it("is written column by column for CSS", () => {
    const rows = Array.from({ length: 16 }, (_, i) => i);
    expect(cssMatrix(rows)).toBe("matrix3d(0,4,8,12,1,5,9,13,2,6,10,14,3,7,11,15)");
    // The perspective row, w = 1 − z / focal, comes out as the fourth column.
    const m = sheetMatrix(flat, VIEW, SHEET);
    expect(m.slice(12)).toEqual([0, 0, -1 / focal(VIEW, flat.fov), 1]);
  });
});

describe("unproject", () => {
  const poses: Pose[] = [
    flat,
    { ...flat, tilt: 50 * DEG, x: 30 },
    { ...flat, turn: -60 * DEG, spin: 1.2, scale: 0.7, y: 90 },
    { ...flat, tilt: -70 * DEG, turn: 30 * DEG, scale: 0.4, fov: 100 * DEG },
  ];

  it.each(poses.map((p, i) => [i, p] as const))("finds the sheet point under its own projection (pose %i)", (_, pose) => {
    const m = sheetMatrix(pose, VIEW, SHEET);
    for (const p of [{ x: 0, y: 0 }, { x: 480, y: 300 }, { x: 900, y: 37 }, { x: -200, y: 750 }]) {
      expect(round(unproject(m, project(m, p).at)!)).toEqual(round(p));
    }
  });

  it("finds nothing where the line of sight misses the plane in front of the eye", () => {
    // Leaning back steeply, the plane's horizon is on screen; above it there is no plane.
    const m = sheetMatrix({ ...flat, tilt: 85 * DEG, scale: 0.3 }, VIEW, SHEET);
    expect(unproject(m, { x: 600, y: -5000 })).toBeNull();
  });
});

describe("gestures", () => {
  it("slides by the pointer's movement", () => {
    expect(slid(flat, 12, -7)).toEqual({ ...flat, x: 12, y: -7 });
  });

  it("leans the way it is dragged: dragging up tips the top away, dragging right turns the right edge away", () => {
    const pose = leaned(flat, 10, -10);
    expect(pose.tilt).toBeGreaterThan(0);
    expect(pose.turn).toBeGreaterThan(0);
  });

  it("zooms about the point under the pointer", () => {
    expect(zoomed({ ...flat, x: 100 }, 2, { x: 0, y: 0 })).toEqual({ ...flat, x: 200, scale: 2 });
    expect(zoomed({ ...flat, x: 100 }, 2, { x: 100, y: 0 })).toEqual({ ...flat, x: 100, scale: 2 });
  });

  it("follows two pointers: spreading sizes, twisting spins, moving both slides", () => {
    const o = { x: 0, y: 0 };
    expect(pinched(flat, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: -20, y: 0 }, { x: 20, y: 0 })).toEqual({
      ...flat,
      scale: 2,
      x: 0,
      y: 0,
    });
    const slidPose = pinched(flat, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: 40, y: 5 }, { x: 60, y: 5 });
    expect(round(slidPose)).toEqual({ x: 50, y: 5 });
    // Clockwise on screen (y down) is a negative spin.
    const twisted = pinched(flat, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: -10 }, { x: 0, y: 10 });
    expect(twisted.spin).toBeCloseTo(-Math.PI / 2);
    expect(round(twisted)).toEqual(o);
  });

  it("keeps a point under the pinch fixed on the sheet", () => {
    const pose = { ...flat, x: 80, y: 40, scale: 0.8, spin: 0.3 };
    const a0 = { x: 20, y: 10 };
    const b0 = { x: 140, y: 90 };
    const a1 = { x: 0, y: 30 };
    const b1 = { x: 190, y: 60 };
    const before = unproject(sheetMatrix(pose, VIEW, SHEET), { x: a0.x + 600, y: a0.y + 400 })!;
    const after = unproject(sheetMatrix(pinched(pose, a0, b0, a1, b1), VIEW, SHEET), { x: a1.x + 600, y: a1.y + 400 })!;
    expect(round(after)).toEqual(round(before));
  });

  it("slides or leans under one pointer, and pinches under two", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    expect(dragged(flat, from, to, [], false)).toEqual(slid(flat, 10, 0));
    expect(dragged(flat, from, to, [], true)).toEqual(leaned(flat, 10, 0));
    expect(dragged(flat, from, to, [{ x: -10, y: 0 }], true)).toEqual(
      pinched(flat, from, { x: -10, y: 0 }, to, { x: -10, y: 0 }),
    );
  });

  it("keeps size, lean and field of view within limits, and spin within a turn", () => {
    const pose = limited({ ...flat, scale: 99, tilt: 3, turn: -3, spin: 7, fov: 0 });
    expect(pose.scale).toBe(LIMITS.scale.max);
    expect(pose.tilt).toBe(LIMITS.lean);
    expect(pose.turn).toBe(-LIMITS.lean);
    expect(pose.spin).toBeCloseTo(7 - 2 * Math.PI);
    expect(pose.fov).toBe(LIMITS.fov.min);
  });

  it("refuses a pose that brings the sheet up to the eye, and takes any other", () => {
    const close = { ...flat, scale: 6, tilt: 80 * DEG };
    expect(inView(close, VIEW, SHEET)).toBe(false);
    expect(settle(flat, close, VIEW, SHEET)).toBe(flat);
    const fine = { ...flat, tilt: 20 * DEG };
    expect(settle(flat, fine, VIEW, SHEET)).toEqual(fine);
  });

  it("starts within view, filling most of the window", () => {
    const pose = initialPose(VIEW, SHEET);
    expect(inView(pose, VIEW, SHEET)).toBe(true);
    expect(pose.scale).toBeCloseTo(Math.min((0.86 * 1200) / 960, (0.7 * 800) / 600));
  });
});

describe("pickOnScreen", () => {
  it("takes the nearest enabled grip within reach, favouring later ones on a tie", () => {
    const grips = [
      { at: { x: 0, y: 0 }, enabled: true },
      { at: { x: 10, y: 0 }, enabled: false },
      { at: { x: 0, y: 10 }, enabled: true },
      { at: null, enabled: true },
    ];
    expect(pickOnScreen(grips, { x: 0, y: 5 }, 20)).toBe(2);
    expect(pickOnScreen(grips, { x: 9, y: 0 }, 20)).toBe(0);
    expect(pickOnScreen(grips, { x: 100, y: 100 }, 20)).toBe(-1);
  });
});

describe("sheetResolution", () => {
  it("rises with the sheet's size on screen in half steps, up to a ceiling", () => {
    expect(sheetResolution({ ...flat, scale: 0.5 }, 2, SHEET, 4096)).toBe(2);
    expect(sheetResolution({ ...flat, scale: 1 }, 2, SHEET, 4096)).toBe(3);
    expect(sheetResolution({ ...flat, scale: 5 }, 2, SHEET, 4096)).toBe(4);
  });
});
