import { describe, expect, it } from "vitest";
import { HandInterpreter, pinchThresholds, type HandReading } from "./interpreter.ts";
import { classifyPose, pinchRatio, videoToScreen, type HandFrame, type XYZ } from "./pose.ts";
import { bind, DEFAULT_SETTINGS, sanitize, setGrab, SettingsStore, type GestureSettings } from "./settings.ts";

// --- A synthetic hand ---------------------------------------------------------
//
// Upright, palm to the camera, in metres with y up. Each finger is either
// straight (tip well beyond its middle knuckle) or curled (tip back by the palm).

type Finger = "up" | "down";
type Thumb = "up" | "side" | "in";

function hand(fingers: [Finger, Finger, Finger, Finger], thumb: Thumb): HandFrame {
  const world: XYZ[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const columns = [-0.03, 0, 0.025, 0.045];
  fingers.forEach((state, i) => {
    const x = columns[i];
    const base = 5 + i * 4;
    world[base] = { x, y: 0.09, z: 0 };
    world[base + 1] = { x, y: state === "up" ? 0.13 : 0.12, z: 0 };
    world[base + 2] = { x, y: state === "up" ? 0.15 : 0.09, z: 0 };
    world[base + 3] = { x, y: state === "up" ? 0.17 : 0.07, z: 0 };
  });
  world[1] = { x: -0.03, y: 0.02, z: 0 };
  world[2] = { x: -0.04, y: 0.04, z: 0 };
  world[3] = { x: -0.05, y: 0.05, z: 0 };
  world[4] =
    thumb === "up" ? { x: -0.1, y: 0.1, z: 0 } : thumb === "side" ? { x: -0.11, y: 0.03, z: 0 } : { x: -0.02, y: 0.07, z: 0 };
  // Screen pixels: 1 mm per pixel, y down.
  const screen = world.map((p) => ({ x: 500 + p.x * 1000, y: 500 - p.y * 1000 }));
  return { side: "right", screen, world };
}

describe("classifyPose", () => {
  it("names the poses", () => {
    expect(classifyPose(hand(["down", "down", "down", "down"], "in"))).toBe("fist");
    expect(classifyPose(hand(["down", "down", "down", "down"], "up"))).toBe("thumbsUp");
    expect(classifyPose(hand(["up", "up", "down", "down"], "in"))).toBe("victory");
    expect(classifyPose(hand(["up", "down", "down", "down"], "in"))).toBe("point");
    expect(classifyPose(hand(["up", "up", "up", "up"], "up"))).toBe("open");
  });

  it("does not call a sideways thumb a thumbs-up", () => {
    expect(classifyPose(hand(["down", "down", "down", "down"], "side"))).toBeNull();
  });

  it("returns null for shapes it does not know", () => {
    expect(classifyPose(hand(["down", "up", "up", "down"], "in"))).toBeNull();
    expect(classifyPose(hand(["up", "up", "up", "down"], "in"))).toBeNull();
  });
});

describe("pinchRatio", () => {
  it("is small when thumb and index tips meet", () => {
    const h = hand(["up", "down", "down", "down"], "in");
    const pinched: HandFrame = { ...h, screen: h.screen.map((p, i) => (i === 4 ? h.screen[8] : p)) };
    expect(pinchRatio(pinched)).toBe(0);
    expect(pinchRatio(hand(["up", "up", "up", "up"], "up"))).toBeGreaterThan(0.6);
  });
});

describe("videoToScreen", () => {
  it("mirrors x and crops a wider video to cover the view", () => {
    const video = { width: 1600, height: 900 };
    const view = { width: 800, height: 900 };
    expect(videoToScreen({ x: 0.5, y: 0.5 }, video, view)).toEqual({ x: 400, y: 450 });
    // A landmark on the camera's left appears on the screen's right.
    expect(videoToScreen({ x: 0.25, y: 0 }, video, view)).toEqual({ x: 800, y: 0 });
  });
});

// --- Interpreter ----------------------------------------------------------------

const AT = { x: 100, y: 100 };
const reading = (over: Partial<HandReading>): HandReading => ({
  pose: null,
  pinchRatio: 1,
  pinchPoint: AT,
  palmPoint: AT,
  ...over,
});

describe("HandInterpreter", () => {
  const s = DEFAULT_SETTINGS;
  const { start, release } = pinchThresholds(s.pinchSensitivity);

  it("grabs with hysteresis", () => {
    const hi = new HandInterpreter();
    expect(hi.update(reading({ pinchRatio: start + 0.01 }), s, 0).grabbing).toBe(false);
    const down = hi.update(reading({ pinchRatio: start - 0.01 }), s, 16);
    expect(down.grabbing && down.grabStarted).toBe(true);
    // Between the thresholds the grab holds.
    const held = hi.update(reading({ pinchRatio: (start + release) / 2 }), s, 32);
    expect(held.grabbing && !held.grabStarted).toBe(true);
    const up = hi.update(reading({ pinchRatio: release + 0.01 }), s, 48);
    expect(!up.grabbing && up.grabEnded).toBe(true);
  });

  it("fires a held pose once, after the hold time", () => {
    const hi = new HandInterpreter();
    const fired: (string | null)[] = [];
    for (let t = 0; t <= s.holdMs + 400; t += 50) {
      fired.push(hi.update(reading({ pose: "thumbsUp" }), s, t).fired);
    }
    expect(fired.filter(Boolean)).toEqual(["next"]);
    expect(fired.indexOf("next")).toBe(s.holdMs / 50);
  });

  it("reports progress while a pose is held and forgets it when dropped", () => {
    const hi = new HandInterpreter();
    hi.update(reading({ pose: "victory" }), s, 0);
    const mid = hi.update(reading({ pose: "victory" }), s, s.holdMs / 2);
    expect(mid.hold).toEqual({ action: "previous", progress: 0.5 });
    expect(hi.update(reading({}), s, s.holdMs / 2 + 500).hold).toBeNull();
    // Starting again starts the clock again.
    expect(hi.update(reading({ pose: "victory" }), s, s.holdMs + 600).fired).toBeNull();
  });

  it("ignores poses while grabbing", () => {
    const hi = new HandInterpreter();
    for (let t = 0; t <= s.holdMs * 2; t += 50) {
      const state = hi.update(reading({ pose: "thumbsUp", pinchRatio: 0 }), s, t);
      expect(state.fired).toBeNull();
      expect(state.hold).toBeNull();
    }
  });

  it("can grab with a fist, riding out a dropped frame", () => {
    const fist: GestureSettings = setGrab(s, "fist");
    const hi = new HandInterpreter();
    expect(hi.update(reading({ pose: "fist" }), fist, 0).grabStarted).toBe(true);
    expect(hi.update(reading({ pose: null }), fist, 60).grabbing).toBe(true);
    expect(hi.update(reading({ pose: null }), fist, 400).grabEnded).toBe(true);
    // A pinch means nothing in fist mode.
    expect(hi.update(reading({ pinchRatio: 0 }), fist, 500).grabbing).toBe(false);
  });
});

// --- Settings ---------------------------------------------------------------------

describe("settings", () => {
  it("falls back to defaults for junk", () => {
    expect(sanitize(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitize({ holdMs: "soon", hands: "three", smoothing: 9 })).toEqual({
      ...DEFAULT_SETTINGS,
      smoothing: 1,
    });
  });

  it("gives each pose one job", () => {
    const moved = bind(DEFAULT_SETTINGS, "reset", "thumbsUp");
    expect(moved.bindings.reset).toBe("thumbsUp");
    expect(moved.bindings.next).toBeNull();

    const fistGrab = setGrab(bind(DEFAULT_SETTINGS, "reset", "fist"), "fist");
    expect(fistGrab.grab).toBe("fist");
    expect(fistGrab.bindings.reset).toBeNull();

    const fistAction = bind(fistGrab, "notes", "fist");
    expect(fistAction.grab).toBe("pinch");
    expect(fistAction.bindings.notes).toBe("fist");
  });

  it("persists through storage and notifies subscribers", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const store = new SettingsStore(storage);
    let seen = 0;
    store.subscribe(() => seen++);
    store.set({ ...store.get(), holdMs: 1200, hands: "left" });
    expect(seen).toBe(1);
    expect(new SettingsStore(storage).get()).toMatchObject({ holdMs: 1200, hands: "left" });
  });
});
