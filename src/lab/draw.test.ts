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

describe("noting and painting apart", () => {
  const A = { x: 0, y: 0 };
  const B = { x: 2, y: 0 };

  it("notes marks drawn with noteOnly for terms, and paints none of them", () => {
    const { ctx, log } = recorder();
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.noteOnly((canvas) => {
      canvas.fillRect(0, 0, 10, 10);
      g.segment(A, B);
      g.label(B, "B");
    });
    expect(log).toEqual([]);
    expect(g.anchors("pt:B")).toEqual([toScreen(VIEW, B)]);
    expect(g.anchors("seg:A.B")).toHaveLength(0);
    g.label(A, "A");
    expect(g.anchors("seg:A.B")).toHaveLength(1);
  });

  it("paints marks drawn with unnoted and leaves them out of the figure index", () => {
    const { ctx, log } = recorder();
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.unnoted(() => g.label(B, "B"));
    expect(log.some(([name]) => name === "fillText")).toBe(true);
    expect(g.anchors("pt:B")).toEqual([]);
    g.label(B, "B");
    expect(g.anchors("pt:B")).toHaveLength(1);
  });
});

describe("text on a narrow figure", () => {
  const PHONE: View = { scale: 20, ox: 160, oy: 200, width: 320, height: 400, room: { left: 10, right: 310 } };
  const lines = (log: [string, unknown][]) =>
    log.filter(([k]) => k === "fillText").map(([, args]) => args as [string, number, number]);

  it("leaves text that fits as it is", () => {
    const { ctx, log } = recorder();
    new Draw(ctx, PHONE, "#38d9a9").label({ x: 0, y: 0 }, "A");
    expect(lines(log)).toEqual([["A", 160, 200]]);
  });

  it("moves a label over the figure's edge back inside it", () => {
    const { ctx, log } = recorder();
    // 0.6 of 15 px a character, the guess when nothing measures.
    new Draw(ctx, PHONE, "#38d9a9").label({ x: 7.5, y: 0 }, "b = 3");
    const [[, x]] = lines(log);
    expect(x + (5 * 9) / 2).toBeCloseTo(304);
  });

  it("wraps a sentence too wide for the figure, line under line, all inside it", () => {
    const { ctx, log } = recorder();
    const text = "Median: a segment from a corner to the midpoint of the opposite side.";
    new Draw(ctx, PHONE, "#38d9a9").label({ x: 0, y: 0 }, text);
    const drawn = lines(log);
    expect(drawn.length).toBeGreaterThan(1);
    expect(drawn.map(([line]) => line).join(" ")).toBe(text);
    const ys = drawn.map(([, , y]) => y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect((ys[0] + ys.at(-1)!) / 2).toBeCloseTo(200);
    for (const [line, x] of drawn) {
      const w = [...line].length * 12 * 0.6;
      expect(x - w / 2).toBeGreaterThanOrEqual(16 - 1e-9);
      expect(x + w / 2).toBeLessThanOrEqual(304 + 1e-9);
    }
  });
});

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

describe("axes", () => {
  const numbers = (log: [string, unknown][]) =>
    log.filter(([k]) => k === "fillText").map(([, args]) => (args as unknown[])[0] as string);

  it("numbers each axis in the units one stage unit stands for", () => {
    const { ctx, log } = recorder();
    new Draw(ctx, VIEW, "#38d9a9").axes({ units: { x: 0.5, y: 20 } });
    const text = numbers(log);
    expect(text).toContain("0.5");
    expect(text).toContain("−1.5");
    expect(text).toContain("60");
    expect(text).toContain("−100");
  });

  it("keeps only the positive halves when asked", () => {
    const { ctx, log } = recorder();
    new Draw(ctx, VIEW, "#38d9a9").axes({ origin: { x: -4, y: -3 }, positive: true });
    const text = numbers(log);
    expect(text).toContain("1");
    expect(text.some((t) => t.startsWith("−"))).toBe(false);
  });
});

describe("what a term's marks light", () => {
  const V = (x: number, y: number) => ({ x, y });
  const at = (x: number, y: number) => toScreen(VIEW, V(x, y));
  const kinds = (g: Draw, ...terms: string[]) => g.shapes(...terms).map((s) => s.kind);

  it("lights each mark by its own shape", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.segment(V(0, 0), V(2, 0), { term: "side" });
    g.point(V(1, 1), { term: "dot" });
    g.polygon([V(0, 0), V(2, 0), V(0, 2)], { term: "shape" });
    g.circle(V(0, 0), 1, { term: "ring" });
    g.arc(V(0, 0), 1, 0, 1, { term: "bend" });
    g.angle(V(1, 0), V(0, 0), V(0, 1), { term: "turn" });
    g.label(V(3, 3), "k", { term: "name" });
    expect(g.shapes("side")).toEqual([{ kind: "segment", a: at(0, 0), b: at(2, 0) }]);
    expect(g.shapes("dot")).toEqual([{ kind: "point", at: at(1, 1) }]);
    expect(g.shapes("shape")).toEqual([{ kind: "polygon", corners: [at(0, 0), at(2, 0), at(0, 2)] }]);
    expect(g.shapes("ring")).toEqual([{ kind: "circle", center: at(0, 0), r: 50 }]);
    expect(g.shapes("bend")).toEqual([{ kind: "arc", center: at(0, 0), r: 50, from: 0, sweep: 1 }]);
    expect(g.shapes("turn")).toEqual([{ kind: "angle", vertex: at(0, 0), from: 0, sweep: Math.PI / 2, r: 26 }]);
    expect(kinds(g, "name")).toEqual(["label"]);
  });

  it("lights what a label names, not the label: an angle's measure, a side's length, a point's name", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.angle(V(1, 0), V(0, 0), V(1, 1), { term: "a", label: true });
    g.along(V(0, 0), V(2, 0), "4", { term: "s" });
    g.point(V(1, 1), { term: "p", label: "P" });
    expect(kinds(g, "a")).toEqual(["angle"]);
    expect(kinds(g, "s")).toEqual(["segment"]);
    expect(kinds(g, "p")).toEqual(["point"]);
    // The arc and its label are one place for the leader.
    expect(g.anchors("a")).toHaveLength(1);
  });

  it("lights the feature a lesson says a mark stands for", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.polygon([V(0, 0), V(2, 0), V(0, 2)], { fill: "#123456", term: "region", feature: "area" });
    g.circle(V(1, 1), 0.2, { term: "spot", feature: "point" });
    g.sector(V(0, 0), 1, 0, Math.PI / 2, { term: "slice", feature: "area" });
    g.segment(V(0, 0), V(2, 0), { term: "half", feature: "midpoint" });
    expect(g.shapes("region")).toEqual([{ kind: "area", outline: [at(0, 0), at(2, 0), at(0, 2)] }]);
    expect(g.shapes("spot")).toEqual([{ kind: "point", at: at(1, 1) }]);
    expect(kinds(g, "slice")).toEqual(["area"]);
    expect(g.shapes("half")).toEqual([{ kind: "midpoint", at: at(1, 0), a: at(0, 0), b: at(2, 0) }]);
  });

  it("lights a polyline piece by piece, from one leader", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.path([V(0, 0), V(1, 0), V(1, 1)], { term: "walk" });
    expect(kinds(g, "walk")).toEqual(["segment", "segment"]);
    expect(g.anchors("walk")).toEqual([at(1, 0)]);
  });

  it("joins a lesson's marks and what the figure shows for a found term", () => {
    const g = new Draw(recorder().ctx, VIEW, "#38d9a9");
    g.segment(V(0, 0), V(2, 0));
    g.point(V(0, 0), { label: "A" });
    g.point(V(2, 0), { label: "B" });
    g.point(V(1, 0), { label: "M" });
    expect(g.shapes("pt:M")).toEqual([{ kind: "midpoint", at: at(1, 0), a: at(0, 0), b: at(2, 0) }]);
    expect(kinds(g, "seg:A.B", "seg:A.M")).toEqual(["segment", "segment"]);
  });
});
