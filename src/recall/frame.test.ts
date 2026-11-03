// Where the question sheet goes when the learner moves or sizes it.

import { describe, expect, it } from "vitest";
import { fitBox, GAP, MIN, moveBox, parseBox, resizeBox, type Box } from "./frame.ts";

const view = { width: 1000, height: 800 };
const box: Box = { left: 100, top: 100, width: 400, height: 300 };

describe("fitBox", () => {
  it("leaves a box that fits alone", () => {
    expect(fitBox(box, view)).toEqual(box);
  });

  it("moves a box back inside the window, keeping the gap", () => {
    expect(fitBox({ ...box, left: -50, top: 900 }, view)).toEqual({ ...box, left: GAP, top: 800 - 300 - GAP });
    expect(fitBox({ ...box, left: 900 }, view).left).toBe(1000 - 400 - GAP);
  });

  it("keeps a box between its smallest and the window's size", () => {
    expect(fitBox({ ...box, width: 10, height: 10 }, view)).toEqual({ ...box, ...MIN });
    expect(fitBox({ ...box, width: 5000, height: 5000 }, view)).toEqual({
      left: GAP,
      top: GAP,
      width: 1000 - 2 * GAP,
      height: 800 - 2 * GAP,
    });
  });

  it("shrinks below its smallest only for a window smaller still", () => {
    expect(fitBox(box, { width: 200, height: 150 })).toEqual({ left: GAP, top: GAP, width: 184, height: 134 });
  });

  it("folded, only needs its header on screen", () => {
    const low = { ...box, top: 760 };
    expect(fitBox(low, view, 40)).toEqual({ ...box, top: 800 - 40 - GAP });
    expect(fitBox(low, view, 40).height).toBe(300);
  });
});

describe("moveBox", () => {
  it("follows the drag", () => {
    expect(moveBox(box, 30, -20, view)).toEqual({ ...box, left: 130, top: 80 });
  });

  it("stops at the window's edges", () => {
    expect(moveBox(box, -500, -500, view)).toEqual({ ...box, left: GAP, top: GAP });
  });

  it("folded, can go lower than the unfolded sheet would fit", () => {
    expect(moveBox(box, 0, 900, view, 40).top).toBe(800 - 40 - GAP);
  });
});

describe("resizeBox", () => {
  it("grows and shrinks from the bottom-right corner", () => {
    expect(resizeBox(box, 50, 60, view)).toEqual({ ...box, width: 450, height: 360 });
    expect(resizeBox(box, -50, -60, view)).toEqual({ ...box, width: 350, height: 240 });
  });

  it("stops at its smallest, and at the window's edges", () => {
    expect(resizeBox(box, -1000, -1000, view)).toEqual({ ...box, ...MIN });
    expect(resizeBox(box, 1000, 1000, view)).toEqual({ ...box, width: 1000 - 100 - GAP, height: 800 - 100 - GAP });
  });
});

describe("parseBox", () => {
  it("reads back a kept box", () => {
    expect(parseBox(JSON.stringify(box))).toEqual(box);
  });

  it("reads nothing from nothing, or from anything else", () => {
    for (const raw of [null, "", "not json", "null", "[]", '{"left":1}', '{"left":1,"top":2,"width":"3","height":4}']) {
      expect(parseBox(raw)).toBeNull();
    }
  });
});
