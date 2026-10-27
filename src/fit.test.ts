import { describe, expect, it } from "vitest";
import { captionScale, centreY, fitText, grabRadius, nearest, shareBox } from "./fit.ts";

describe("grabRadius", () => {
  it("keeps a lesson's own radius for a mouse", () => {
    expect(grabRadius("mouse", 26)).toBe(26);
  });

  it("widens it for a finger and further for a hand", () => {
    expect(grabRadius("touch", 26)).toBe(36);
    expect(grabRadius("hand", 26)).toBe(46);
  });

  it("never narrows a radius that is already wide", () => {
    expect(grabRadius("touch", 40)).toBe(40);
  });
});

describe("nearest", () => {
  const knobs = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
  ];

  it("picks the closer of two knobs in reach", () => {
    expect(nearest({ x: 20, y: 0 }, knobs, 36)).toBe(1);
    expect(nearest({ x: 10, y: 0 }, knobs, 36)).toBe(0);
  });

  it("finds nothing out of reach", () => {
    expect(nearest({ x: 0, y: 50 }, knobs, 36)).toBe(-1);
  });
});

describe("captionScale", () => {
  it("leaves desktop captions alone and shrinks them on a phone, within a floor", () => {
    expect(captionScale(1400, 700)).toBe(1);
    expect(captionScale(390, 420)).toBe(0.75);
    expect(captionScale(320, 240)).toBe(0.68);
  });
});

describe("centreY", () => {
  it("stays in the middle when there is room", () => {
    expect(centreY(800, 64, 200, 100)).toBe(400);
  });

  it("moves down out of the top bar and up off the bottom edge", () => {
    expect(centreY(400, 64, 150, 20)).toBe(214);
    expect(centreY(400, 64, 100, 120)).toBe(180);
  });

  it("splits the difference when the figure cannot clear both", () => {
    expect(centreY(300, 64, 100, 100)).toBe(132);
  });
});

describe("shareBox", () => {
  it("puts the figures side by side on a canvas wider than tall", () => {
    expect(shareBox({ x: 0, y: 64, w: 1000, h: 600 }, 0.5)).toEqual([
      { x: 0, y: 64, w: 500, h: 600 },
      { x: 500, y: 64, w: 500, h: 600 },
    ]);
  });

  it("puts one above the other on a canvas taller than wide", () => {
    expect(shareBox({ x: 0, y: 64, w: 375, h: 418 }, 0.5)).toEqual([
      { x: 0, y: 64, w: 375, h: 209 },
      { x: 0, y: 273, w: 375, h: 209 },
    ]);
  });
});

describe("fitText", () => {
  // Every character as wide as half the font size.
  const measure = (text: string, size: number): number => text.length * size * 0.5;

  it("keeps text that fits at its own size", () => {
    expect(fitText("a short caption", 16, 10, 200, measure)).toEqual({ size: 16, lines: ["a short caption"] });
  });

  it("shrinks text that is a little too wide", () => {
    // 20 characters at 16 px are 160 px.
    expect(fitText("twenty characters ok", 16, 10, 120, measure)).toEqual({
      size: 12,
      lines: ["twenty characters ok"],
    });
  });

  it("wraps text at the least size once shrinking is not enough", () => {
    const fitted = fitText("one two three four five six", 16, 10, 60, measure);
    expect(fitted.size).toBe(10);
    expect(fitted.lines).toEqual(["one two", "three four", "five six"]);
    for (const line of fitted.lines) expect(measure(line, 10)).toBeLessThanOrEqual(60);
  });
});
