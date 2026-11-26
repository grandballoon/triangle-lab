import { describe, expect, it } from "vitest";
import { clampHeight, dragged, fromShare, keyed, parseShare, tapped, toShare } from "./sheet.ts";

const RANGE = { min: 96, max: 400 };

describe("sizing the steps on a phone", () => {
  it("keeps a height within the range", () => {
    expect(clampHeight(50, RANGE)).toBe(96);
    expect(clampHeight(250.4, RANGE)).toBe(250);
    expect(clampHeight(900, RANGE)).toBe(400);
  });

  it("grows the steps as the grip is dragged up, and shrinks them as it is dragged down", () => {
    expect(dragged(200, 500, 420, RANGE)).toBe(280);
    expect(dragged(200, 500, 560, RANGE)).toBe(140);
    expect(dragged(200, 500, 0, RANGE)).toBe(400);
  });

  it("opens the steps all the way on a tap, and gives them back their own height on the next", () => {
    expect(tapped(null, RANGE)).toBe(400);
    expect(tapped(250, RANGE)).toBe(400);
    expect(tapped(400, RANGE)).toBeNull();
  });

  it("moves with the arrow keys, Home and End, and taps on Enter and Space", () => {
    expect(keyed(200, null, "ArrowUp", RANGE)).toBe(232);
    expect(keyed(200, null, "ArrowDown", RANGE)).toBe(168);
    expect(keyed(200, null, "Home", RANGE)).toBe(96);
    expect(keyed(200, null, "End", RANGE)).toBe(400);
    expect(keyed(200, null, "Enter", RANGE)).toBe(400);
    expect(keyed(400, 400, " ", RANGE)).toBeNull();
    expect(keyed(200, null, "a", RANGE)).toBeUndefined();
  });

  it("keeps the height as a share of the window, so it survives turning the phone", () => {
    expect(toShare(300, 600)).toBe(0.5);
    expect(fromShare(0.5, 800)).toBe(400);
    expect(toShare(null, 600)).toBeNull();
    expect(fromShare(null, 600)).toBeNull();
  });

  it("reads back only a share that makes sense", () => {
    expect(parseShare("0.4")).toBe(0.4);
    for (const bad of [null, "", "abc", "0", "1.5", "-0.2", "NaN"]) expect(parseShare(bad)).toBeNull();
  });
});
