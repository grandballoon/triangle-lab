// Tracing a found term to the marks that show it (figure.ts), on figures
// drawn with the real drawing vocabulary.

import { describe, expect, it } from "vitest";
import { Draw, toScreen, type View } from "./draw.ts";
import { numbersIn, resolveTerm, sameNumber, symbolsIn } from "./figure.ts";
import type { Vec } from "./geo.ts";

const VIEW: View = { scale: 50, ox: 500, oy: 350, width: 1000, height: 700 };
const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
const screen = (p: Vec): Vec => toScreen(VIEW, p);
const mid = (a: Vec, b: Vec): Vec => screen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const A = { x: 0, y: 0 };
const B = { x: 4, y: 0 };
const C = { x: 0, y: 3 };

/** A right triangle ABC with named corners, as a lesson would draw it. */
function triangle(): Draw {
  const g = new Draw(ctx, VIEW, "#38d9a9");
  g.polygon([A, B, C], { fill: "#123456" });
  g.angle(B, A, C, { label: true });
  g.angle(A, B, C, { label: "β" });
  g.along(A, B, "4");
  for (const [p, name] of [[A, "A"], [B, "B"], [C, "C"]] as const) g.point(p, { label: name });
  return g;
}

describe("resolveTerm", () => {
  it("finds named points by their labels", () => {
    expect(resolveTerm("pt:B", triangle().figure)).toEqual([screen(B)]);
    expect(resolveTerm("pt:Z", triangle().figure)).toEqual([]);
  });

  it("finds a segment on any drawn line through both ends, in either order", () => {
    const g = triangle();
    expect(resolveTerm("seg:A.B", g.figure)).toEqual([mid(A, B)]);
    expect(resolveTerm("seg:C.B", g.figure)).toEqual([mid(C, B)]);
    // A point partway along a drawn side.
    g.point({ x: 2, y: 0 }, { label: "M" });
    expect(resolveTerm("seg:A.M", g.figure)).toEqual([mid(A, { x: 2, y: 0 })]);
  });

  it("does not find a segment the figure never drew", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.point(A, { label: "A" });
    g.point(B, { label: "B" });
    expect(resolveTerm("seg:A.B", g.figure)).toEqual([]);
  });

  it("finds an arc between two named points when no line joins them", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.arc(A, 2, 0, Math.PI / 2);
    g.point({ x: 2, y: 0 }, { label: "P" });
    g.point({ x: 0, y: 2 }, { label: "Q" });
    const middle = screen({ x: 2 * Math.cos(Math.PI / 4), y: 2 * Math.sin(Math.PI / 4) });
    const [found] = resolveTerm("seg:P.Q", g.figure);
    expect(found.x).toBeCloseTo(middle.x);
    expect(found.y).toBeCloseTo(middle.y);
  });

  it("finds an angle's mark by its vertex and the points its sides pass", () => {
    const g = triangle();
    expect(resolveTerm("ang:B.A.C", g.figure)).toHaveLength(1);
    expect(resolveTerm("ang:C.A.B", g.figure)).toEqual(resolveTerm("ang:B.A.C", g.figure));
    expect(resolveTerm("ang:A", g.figure)).toEqual(resolveTerm("ang:B.A.C", g.figure));
    // The angle at C has no mark, but both its sides are drawn: lead into the corner.
    const [corner] = resolveTerm("ang:A.C.B", g.figure);
    const c = screen(C);
    expect(Math.hypot(corner.x - c.x, corner.y - c.y)).toBeCloseTo(28);
  });

  it("finds a polygon by its corners, in any order", () => {
    const g = triangle();
    const centre = screen({ x: 4 / 3, y: 1 });
    expect(resolveTerm("poly:C.A.B", g.figure)).toEqual([centre]);
    expect(resolveTerm("poly:A.B.C.D", g.figure)).toEqual([]);
  });

  it("finds symbols and numbers among the labels", () => {
    const g = triangle();
    expect(resolveTerm("sym:β", g.figure)).toHaveLength(1);
    expect(resolveTerm("num:90", g.figure)).toHaveLength(1);
    expect(resolveTerm("num:4", g.figure)).toHaveLength(1);
    expect(resolveTerm("num:5", g.figure)).toEqual([]);
  });

  it("ignores what was drawn invisible and the grid behind the figure", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.grid();
    g.axes();
    g.segment(A, B, { alpha: 0 });
    g.label(C, "7", { alpha: 0 });
    g.point(A, { label: "A" });
    g.point(B, { label: "B" });
    expect(resolveTerm("seg:A.B", g.figure)).toEqual([]);
    expect(resolveTerm("num:7", g.figure)).toEqual([]);
    expect(resolveTerm("num:2", g.figure)).toEqual([]);
  });

  it("finds nothing for a lesson's own ids", () => {
    expect(resolveTerm("alpha", triangle().figure)).toEqual([]);
  });
});

describe("reading labels", () => {
  it("takes Greek letters anywhere and lone Latin letters only from labels without words", () => {
    expect(symbolsIn("2π − 2α")).toEqual(["π", "α"]);
    expect(symbolsIn("r = 2.5")).toEqual(["r"]);
    expect(symbolsIn("r₁")).toEqual(["r₁"]);
    expect(symbolsIn("a fold")).toEqual([]);
  });

  it("takes numbers but not coefficients or indices", () => {
    expect(numbersIn("fence 6.28")).toEqual(["6.28"]);
    expect(numbersIn("G (2.1, 3.4)")).toEqual(["2.1", "3.4"]);
    expect(numbersIn("60°")).toEqual(["60"]);
    expect(numbersIn("3b")).toEqual([]);
  });

  it("matches a number printed to fewer places, but small whole numbers only exactly", () => {
    expect(sameNumber("37.4", "37")).toBe(true);
    expect(sameNumber("5.27", "5.3")).toBe(true);
    expect(sameNumber("37.6", "37")).toBe(false);
    expect(sameNumber("2.3", "2")).toBe(false);
    expect(sameNumber("2", "2")).toBe(true);
  });
});
