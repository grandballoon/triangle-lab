// The parts of the drawing vocabulary that link a figure to its formulas and
// set pictures on it: focused terms, the anchors leader lines run to, and
// sprites.

import { describe, expect, it } from "vitest";
import { Draw, toScreen, type Picture, type View } from "./draw.ts";

const VIEW: View = { scale: 50, ox: 500, oy: 350, width: 1000, height: 700 };

/** A 2D context that remembers each call and each property set, in order. */
function recorder(): { ctx: CanvasRenderingContext2D; log: [string, unknown][] } {
  const log: [string, unknown][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) => (name in store ? store[name] : (...args: unknown[]) => log.push([name, args])),
    set: (store, name: string, value) => {
      store[name] = value;
      log.push([name, value]);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

const widths = (log: [string, unknown][]) => log.filter(([k]) => k === "lineWidth").map(([, v]) => v);
const blurs = (log: [string, unknown][]) => log.filter(([k]) => k === "shadowBlur").map(([, v]) => v);

describe("focus", () => {
  it("draws the focused term's marks heavier and glowing, and leaves the rest alone", () => {
    const { ctx, log } = recorder();
    const g = new Draw(ctx, VIEW, "#38d9a9", { focus: "side" });
    g.segment({ x: 0, y: 0 }, { x: 1, y: 0 }, { width: 2, term: "side" });
    g.segment({ x: 0, y: 0 }, { x: 0, y: 1 }, { width: 2, term: "other" });
    g.segment({ x: 0, y: 0 }, { x: 1, y: 1 }, { width: 2 });
    expect(widths(log)).toEqual([3.6, 2, 2]);
    expect(blurs(log)).toHaveLength(1);
  });

  it("changes nothing when no term is in focus", () => {
    const { ctx, log } = recorder();
    new Draw(ctx, VIEW, "#38d9a9").angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { term: "a", label: "α" });
    expect(blurs(log)).toHaveLength(0);
  });
});

describe("anchors", () => {
  it("notes where each term's visible marks are, once per place", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.point({ x: 2, y: 1 }, { term: "p", label: "P" });
    g.segment({ x: -2, y: 0 }, { x: 0, y: 0 }, { term: "p" });
    g.segment({ x: 4, y: 0 }, { x: 6, y: 0 }, { term: "p", alpha: 0 });
    g.segment({ x: 4, y: 0 }, { x: 6, y: 0 });
    expect(g.anchors("p")).toEqual([toScreen(VIEW, { x: 2, y: 1 }), toScreen(VIEW, { x: -1, y: 0 })]);
    expect(g.anchors("missing")).toEqual([]);
  });
});

describe("sprite", () => {
  const picture: Picture = { source: {} as CanvasImageSource, width: 200, height: 100 };

  it("draws a loaded image centred on its point, sized in stage units", () => {
    const { ctx, log } = recorder();
    const g = new Draw(ctx, VIEW, "#38d9a9", { pictures: { get: () => picture } });
    g.sprite("car.png", { x: 1, y: 2 }, { width: 2, rotate: Math.PI / 2, term: "car" });
    const at = toScreen(VIEW, { x: 1, y: 2 });
    expect(log).toContainEqual(["translate", [at.x, at.y]]);
    expect(log).toContainEqual(["rotate", [-Math.PI / 2]]);
    expect(log).toContainEqual(["drawImage", [picture.source, -50, -25, 100, 50]]);
    expect(g.anchors("car")).toEqual([at]);
  });

  it("draws nothing until the image has loaded", () => {
    const { ctx, log } = recorder();
    new Draw(ctx, VIEW, "#38d9a9", { pictures: { get: () => null } }).sprite("car.png", { x: 0, y: 0 });
    new Draw(ctx, VIEW, "#38d9a9").sprite("car.png", { x: 0, y: 0 });
    expect(log).toEqual([]);
  });
});
