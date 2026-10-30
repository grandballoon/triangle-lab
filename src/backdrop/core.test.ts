// Where the photo backdrop sits, and how drags, pinches, the wheel and keys
// move it, checked by plain equality on the placements they return.

import { describe, expect, it } from "vitest";
import {
  COVER,
  MAX_SCALE,
  MIN_SCALE,
  carriesFiles,
  coverSize,
  firstImage,
  keyAction,
  moveBy,
  percent,
  photoBox,
  pinch,
  pillLabel,
  readPlacement,
  wheelFactor,
  zoomAbout,
  zoomBy,
} from "./core.ts";

// A landscape photo in a window of another shape: covering it takes the
// window's height, 1000 × 500 → 1600 × 800.
const photo = { width: 1000, height: 500 };
const window = { width: 1200, height: 800 };

describe("firstImage", () => {
  it("takes the first image and passes over other files", () => {
    const files = [{ type: "text/plain" }, { type: "image/png" }, { type: "image/jpeg" }];
    expect(firstImage(files)).toBe(files[1]);
  });

  it("finds nothing among no images", () => {
    expect(firstImage([{ type: "application/pdf" }, { type: "" }])).toBeNull();
    expect(firstImage([])).toBeNull();
  });
});

describe("carriesFiles", () => {
  it("tells a drag of files from one of text or a link", () => {
    expect(carriesFiles(["Files"])).toBe(true);
    expect(carriesFiles(["text/plain", "text/uri-list"])).toBe(false);
  });
});

describe("pillLabel", () => {
  it("offers a photo over the camera, and to arrange the photo once there is one", () => {
    expect(pillLabel(false)).toBe("Use a photo as the background");
    expect(pillLabel(true)).toBe("Arrange the background photo");
  });
});

describe("photoBox", () => {
  it("covers the window, centred, at first", () => {
    expect(coverSize(photo, window)).toEqual({ width: 1600, height: 800 });
    expect(photoBox(photo, window, COVER)).toEqual({ left: -200, top: 0, width: 1600, height: 800 });
  });

  it("moves and sizes by the placement", () => {
    expect(photoBox(photo, window, { x: 0.25, y: -0.5, scale: 0.5 })).toEqual({
      left: 600 + 400 - 400,
      top: 400 - 400 - 200,
      width: 800,
      height: 400,
    });
  });
});

describe("moveBy", () => {
  it("moves the photo by the pixels dragged", () => {
    const moved = moveBy(COVER, { x: 160, y: -80 }, photo, window);
    expect(moved).toEqual({ x: 0.1, y: -0.1, scale: 1 });
    expect(photoBox(photo, window, moved)).toEqual({ left: -40, top: -80, width: 1600, height: 800 });
  });
});

describe("zoomAbout", () => {
  it("keeps the point it zooms about in its place on the photo", () => {
    const about = { x: 300, y: 200 };
    const before = photoBox(photo, window, COVER);
    const after = photoBox(photo, window, zoomAbout(COVER, 2, about, photo, window));
    // The point lay this far across the photo before, and still does.
    const across = (b: typeof before) => [(about.x - b.left) / b.width, (about.y - b.top) / b.height];
    expect(after.width).toBe(3200);
    expect(across(after)).toEqual(across(before));
  });

  it("stops at the smallest and largest sizes", () => {
    expect(zoomAbout(COVER, 100, { x: 0, y: 0 }, photo, window).scale).toBe(MAX_SCALE);
    expect(zoomAbout(COVER, 0.01, { x: 0, y: 0 }, photo, window).scale).toBe(MIN_SCALE);
  });

  it("resizes about the window's centre for the size buttons, leaving a centred photo centred", () => {
    expect(zoomBy(COVER, 2, photo, window)).toEqual({ x: 0, y: 0, scale: 2 });
  });
});

describe("pinch", () => {
  it("doubles the photo when the fingers spread twice as far, keeping what lay between them", () => {
    const other = { x: 500, y: 400 };
    const pinched = pinch(COVER, { x: 700, y: 400 }, { x: 900, y: 400 }, other, photo, window);
    expect(pinched.scale).toBe(2);
    // The point between the fingers moves from 600 to 700, and the photo
    // with it: what lay under 600 before lies under 700 after.
    const under = (at: typeof pinched, x: number) => {
      const b = photoBox(photo, window, at);
      return (x - b.left) / b.width;
    };
    expect(under(pinched, 700)).toBeCloseTo(under(COVER, 600));
  });

  it("only moves the photo when the fingers keep their distance", () => {
    const pinched = pinch(COVER, { x: 700, y: 400 }, { x: 700, y: 480 }, { x: 500, y: 400 }, photo, window);
    expect(pinched.scale).toBeCloseTo(Math.hypot(200, 80) / 200);
  });
});

describe("wheelFactor", () => {
  it("grows the photo for a wheel turned up and shrinks it for one turned down", () => {
    expect(wheelFactor(-100, 0)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0)).toBeLessThan(1);
    expect(wheelFactor(0, 0)).toBe(1);
  });

  it("counts a line of a notched wheel as several pixels", () => {
    expect(wheelFactor(3, 1)).toBe(wheelFactor(48, 0));
  });
});

describe("percent", () => {
  it("shows the size as a share of covering the window", () => {
    expect(percent(COVER)).toBe("100%");
    expect(percent({ x: 0, y: 0, scale: 1.5625 })).toBe("156%");
  });
});

describe("keyAction", () => {
  it("nudges with the arrows, further with Shift", () => {
    expect(keyAction("ArrowLeft", false)).toEqual({ kind: "move", by: { x: -10, y: 0 } });
    expect(keyAction("ArrowDown", true)).toEqual({ kind: "move", by: { x: 0, y: 50 } });
  });

  it("resizes with + and −, fits with 0 and finishes with Escape or Enter", () => {
    expect(keyAction("+", false)).toEqual({ kind: "zoom", factor: 1.25 });
    expect(keyAction("-", false)).toEqual({ kind: "zoom", factor: 0.8 });
    expect(keyAction("0", false)).toEqual({ kind: "fit" });
    expect(keyAction("Escape", false)).toEqual({ kind: "done" });
    expect(keyAction("Enter", false)).toEqual({ kind: "done" });
    expect(keyAction("q", false)).toBeNull();
  });
});

describe("readPlacement", () => {
  it("reads a placement back as it was saved, keeping its size in bounds", () => {
    expect(readPlacement({ x: 0.1, y: -0.2, scale: 1.5 })).toEqual({ x: 0.1, y: -0.2, scale: 1.5 });
    expect(readPlacement({ x: 0, y: 0, scale: 50 })).toEqual({ x: 0, y: 0, scale: MAX_SCALE });
  });

  it("takes anything garbled, or nothing, as covering the window", () => {
    expect(readPlacement(undefined)).toEqual(COVER);
    expect(readPlacement({ x: "1", y: 0, scale: 1 })).toEqual(COVER);
    expect(readPlacement({ x: 0, y: 0, scale: 0 })).toEqual(COVER);
    expect(readPlacement({ x: NaN, y: 0, scale: 1 })).toEqual(COVER);
  });
});
