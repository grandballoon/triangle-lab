import { describe, expect, it } from "vitest";
import { layoutChrome, type Box, type LayoutInput } from "./layout.ts";

const LAB = { rail: 0, formulas: true, controls: false, steps: 180 } as const;

const at = (width: number, height: number, more: Partial<LayoutInput> = {}): ReturnType<typeof layoutChrome> =>
  layoutChrome({ ...LAB, width, height, ...more });

describe("layoutChrome, wide", () => {
  it("puts the steps on the right, the band along the bottom and the figure between", () => {
    const l = at(1440, 900);
    expect(l.mode).toBe("wide");
    expect(l.compact).toBe(false);
    expect(l.steps).toEqual({ x: 1082, y: 60, width: 340, height: 688 });
    expect(l.formulas).toEqual({ x: 18, y: 766, width: 1404, height: 116 });
    expect(l.figure).toEqual({ x: 18, y: 104, width: 1046, height: 644 });
    expect(l.controls).toEqual({ x: 18, y: 60, width: 1046 });
    expect(l.canvas).toEqual({ x: 0, y: 0, width: 1064, height: 748 });
    expect(l.railBottom).toBe(152);
  });

  it("gives the steps and a standalone canvas the full height without a band", () => {
    const l = at(1440, 900, { formulas: false });
    expect(l.formulas).toBeNull();
    expect(l.steps.height).toBe(900 - 18 - 60);
    expect(l.canvas.height).toBe(900);
    expect(l.railBottom).toBeNull();
  });

  it("keeps clear of the docked rail", () => {
    const l = at(1440, 900, { rail: 278 });
    expect(l.figure.x).toBe(18 + 278);
    expect(l.canvas.x).toBe(278);
    expect(l.controls.x).toBe(18 + 278);
    expect(l.figure.x + l.figure.width).toBe(at(1440, 900).figure.x + at(1440, 900).figure.width);
  });

  it("is compact on a phone on its side", () => {
    const l = at(844, 390);
    expect(l.mode).toBe("wide");
    expect(l.compact).toBe(true);
    expect(l.edge).toBe(10);
    expect(l.formulas!.height).toBe(88);
  });
});

describe("layoutChrome, stacked", () => {
  it("stacks the band and as much room as the tallest step needs under the figure", () => {
    const l = at(390, 664, { controls: true });
    expect(l.mode).toBe("stacked");
    expect(l.steps).toEqual({ x: 10, y: 474, width: 370, height: 180 });
    expect(l.formulas).toEqual({ x: 10, y: 376, width: 370, height: 88 });
    expect(l.controls).toEqual({ x: 10, y: 76, width: 370 });
    expect(l.figure).toEqual({ x: 10, y: 120, width: 370, height: 246 });
    expect(l.canvas).toEqual({ x: 0, y: 12, width: 390, height: 354 });
    expect(l.railBottom).toBe(10);
  });

  it("starts the figure under the title when there are no controls", () => {
    expect(at(390, 664).figure.y).toBe(76);
  });

  it("keeps room for the pager and a few lines before the steps are measured", () => {
    expect(at(390, 664, { steps: 0 }).steps.height).toBe(96);
  });

  it("lets a long step take no more than a third of the window, and scroll", () => {
    expect(at(390, 1400, { steps: 1000 }).steps.height).toBe(476);
  });

  it("ignores the rail, which floats over a phone", () => {
    expect(at(390, 664, { rail: 278 }).figure.x).toBe(10);
  });
});

describe("layoutChrome, any window", () => {
  const sizes = [
    [320, 480], [360, 640], [375, 553], [390, 664], [430, 932], [699, 900],
    [700, 900], [844, 390], [1024, 768], [1440, 900], [2560, 1440],
  ] as const;
  const cases = sizes.flatMap(([w, h]) =>
    [true, false].flatMap((formulas) =>
      [true, false].flatMap((controls) => [0, 180, 2000].map((steps) => ({ w, h, formulas, controls, steps }))),
    ),
  );

  const overlap = (a: Box, b: Box): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const inside = (a: Box, w: number, h: number): boolean =>
    a.x >= 0 && a.y >= 0 && a.x + a.width <= w && a.y + a.height <= h;

  it.each(cases)("keeps the chrome and the figure apart at $w×$h", ({ w, h, formulas, controls, steps }) => {
    const l = at(w, h, { formulas, controls, steps });
    const pieces = [l.steps, l.figure, ...(l.formulas ? [l.formulas] : [])];
    for (const p of pieces) {
      expect(inside(p, w, h)).toBe(true);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) expect(overlap(pieces[i], pieces[j])).toBe(false);
    }
    expect(overlap(l.canvas, l.steps)).toBe(false);
    if (l.formulas) expect(overlap(l.canvas, l.formulas)).toBe(false);
  });
});
