// Tracing a found term to the marks that show it (figure.ts), on figures
// drawn with the real drawing vocabulary.

import { describe, expect, it } from "vitest";
import { Draw, toScreen, type View } from "./draw.ts";
import { numbersIn, resolveTerm, sameNumber, symbolsIn, type FigureIndex } from "./figure.ts";
import type { Vec } from "./geo.ts";
import type { Shape } from "./highlight.ts";

const VIEW: View = { scale: 50, ox: 500, oy: 350, width: 1000, height: 700 };
const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
const screen = (p: Vec): Vec => toScreen(VIEW, p);
const mid = (a: Vec, b: Vec): Vec => screen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
/** Where leaders to term `id` end. */
const ends = (id: string, figure: FigureIndex): Vec[] => resolveTerm(id, figure).map((h) => h.anchor);
/** What term `id` lights. */
const shapes = (id: string, figure: FigureIndex): Shape[] => resolveTerm(id, figure).map((h) => h.shape);

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
    expect(ends("pt:B", triangle().figure)).toEqual([screen(B)]);
    expect(ends("pt:Z", triangle().figure)).toEqual([]);
  });

  it("finds a segment on any drawn line through both ends, in either order", () => {
    const g = triangle();
    expect(ends("seg:A.B", g.figure)).toEqual([mid(A, B)]);
    expect(ends("seg:C.B", g.figure)).toEqual([mid(C, B)]);
    // A point partway along a drawn side.
    g.point({ x: 2, y: 0 }, { label: "M" });
    expect(ends("seg:A.M", g.figure)).toEqual([mid(A, { x: 2, y: 0 })]);
  });

  it("does not find a segment the figure never drew", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.point(A, { label: "A" });
    g.point(B, { label: "B" });
    expect(ends("seg:A.B", g.figure)).toEqual([]);
  });

  it("finds an arc between two named points when no line joins them", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.arc(A, 2, 0, Math.PI / 2);
    g.point({ x: 2, y: 0 }, { label: "P" });
    g.point({ x: 0, y: 2 }, { label: "Q" });
    const middle = screen({ x: 2 * Math.cos(Math.PI / 4), y: 2 * Math.sin(Math.PI / 4) });
    const [found] = ends("seg:P.Q", g.figure);
    expect(found.x).toBeCloseTo(middle.x);
    expect(found.y).toBeCloseTo(middle.y);
  });

  it("finds an angle's mark by its vertex and the points its sides pass", () => {
    const g = triangle();
    expect(ends("ang:B.A.C", g.figure)).toHaveLength(1);
    expect(ends("ang:C.A.B", g.figure)).toEqual(ends("ang:B.A.C", g.figure));
    expect(ends("ang:A", g.figure)).toEqual(ends("ang:B.A.C", g.figure));
    // The angle at C has no mark, but both its sides are drawn: lead into the corner.
    const [corner] = ends("ang:A.C.B", g.figure);
    const c = screen(C);
    expect(Math.hypot(corner.x - c.x, corner.y - c.y)).toBeCloseTo(28);
  });

  it("finds a polygon by its corners, in any order", () => {
    const g = triangle();
    const centre = screen({ x: 4 / 3, y: 1 });
    expect(ends("poly:C.A.B", g.figure)).toEqual([centre]);
    expect(ends("poly:A.B.C.D", g.figure)).toEqual([]);
  });

  it("finds symbols and numbers among the labels", () => {
    const g = triangle();
    expect(ends("sym:β", g.figure)).toHaveLength(1);
    expect(ends("num:90", g.figure)).toHaveLength(1);
    expect(ends("num:4", g.figure)).toHaveLength(1);
    expect(ends("num:5", g.figure)).toEqual([]);
  });

  it("ignores what was drawn invisible and the grid behind the figure", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.grid();
    g.axes();
    g.segment(A, B, { alpha: 0 });
    g.label(C, "7", { alpha: 0 });
    g.point(A, { label: "A" });
    g.point(B, { label: "B" });
    expect(ends("seg:A.B", g.figure)).toEqual([]);
    expect(ends("num:7", g.figure)).toEqual([]);
    expect(ends("num:2", g.figure)).toEqual([]);
  });

  it("finds nothing for a lesson's own ids", () => {
    expect(ends("alpha", triangle().figure)).toEqual([]);
  });
});

describe("what a term lights", () => {
  const near = (p: Vec, q: Vec): boolean => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;

  it("rings a point", () => {
    expect(shapes("pt:B", triangle().figure)).toEqual([{ kind: "point", at: screen(B) }]);
  });

  it("lights a segment from end to end, between the named points even on a longer line", () => {
    const g = triangle();
    expect(shapes("seg:B.A", g.figure)).toEqual([{ kind: "segment", a: screen(B), b: screen(A) }]);
    g.point({ x: 1, y: 0 }, { label: "P" });
    expect(shapes("seg:P.B", g.figure)).toEqual([{ kind: "segment", a: screen({ x: 1, y: 0 }), b: screen(B) }]);
  });

  it("lights an arc that names a segment by the arc itself", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    g.arc(A, 2, 0, Math.PI / 2);
    g.point({ x: 2, y: 0 }, { label: "P" });
    g.point({ x: 0, y: 2 }, { label: "Q" });
    expect(shapes("seg:P.Q", g.figure)).toEqual([{ kind: "arc", center: screen(A), r: 100, from: 0, sweep: Math.PI / 2 }]);
  });

  it("marks a point halfway along a drawn segment as its midpoint, with both halves", () => {
    const g = triangle();
    const M = { x: 2, y: 0 };
    g.point(M, { label: "M" });
    expect(shapes("pt:M", g.figure)).toEqual([{ kind: "midpoint", at: screen(M), a: screen(A), b: screen(B) }]);
    // A point a quarter of the way along is only a point.
    g.point({ x: 1, y: 0 }, { label: "Q" });
    expect(shapes("pt:Q", g.figure).map((s) => s.kind)).toEqual(["point"]);
  });

  it("finds a midpoint whose halves were drawn as two segments", () => {
    const g = new Draw(ctx, VIEW, "#38d9a9");
    const M = { x: 2, y: 1 };
    g.segment(A, M);
    g.segment(M, { x: 4, y: 2 });
    g.point(M, { label: "M" });
    expect(shapes("pt:M", g.figure)).toEqual([{ kind: "midpoint", at: screen(M), a: screen(A), b: screen({ x: 4, y: 2 }) }]);
  });

  it("fills an angle's wedge from its mark, whichever way it is named", () => {
    const g = triangle();
    const [wedge] = shapes("ang:C.A.B", g.figure);
    expect(wedge).toMatchObject({ kind: "angle", vertex: screen(A), r: 26 });
    expect(shapes("ang:A", g.figure)).toEqual([wedge]);
  });

  it("opens an unmarked corner between its drawn sides", () => {
    const g = triangle();
    for (const id of ["ang:A.C.B", "ang:C"]) {
      const [corner] = shapes(id, g.figure);
      if (corner.kind !== "angle") throw new Error(`${id} lit a ${corner.kind}`);
      expect(corner.vertex).toEqual(screen(C));
      // The corner of the right triangle at C, between CA (down) and CB.
      expect(Math.abs(corner.sweep)).toBeCloseTo(Math.atan2(4, 3));
    }
  });

  it("outlines a polygon and fills an area, on the shape's own corners", () => {
    const g = triangle();
    const corners = [screen(A), screen(B), screen(C)];
    expect(shapes("poly:B.C.A", g.figure)).toEqual([{ kind: "polygon", corners }]);
    expect(shapes("area:C.B.A", g.figure)).toEqual([{ kind: "area", outline: corners }]);
    expect(ends("area:A.B.C", g.figure)).toEqual(ends("poly:A.B.C", g.figure));
  });

  it("lights the mark a symbol or number labels: an angle's wedge, a side, or else the label's box", () => {
    const g = triangle();
    g.label({ x: 3, y: 3 }, "k = 7");
    expect(shapes("sym:β", g.figure)[0].kind).toBe("angle");
    expect(shapes("num:90", g.figure)[0].kind).toBe("angle");
    expect(shapes("num:4", g.figure)).toEqual([{ kind: "segment", a: screen(A), b: screen(B) }]);
    const [box] = shapes("num:7", g.figure);
    expect(box.kind).toBe("label");
    if (box.kind === "label") expect(near(box.at, screen({ x: 3, y: 3 }))).toBe(true);
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
