// What a hovered term lights (highlight.ts): reading a mark as the feature a
// lesson says it shows, lighting each shape once, and where leaders end.

import { describe, expect, it } from "vitest";
import { arcPoints, asFeature, distinctShapes, leaderEnds, shapeKey, turn, type Highlight } from "./highlight.ts";

const P = (x: number, y: number) => ({ x, y });
const lit = (shape: Highlight["shape"], anchor = P(0, 0)): Highlight => ({ anchor, shape });

describe("asFeature", () => {
  const triangle = lit({ kind: "polygon", corners: [P(0, 0), P(10, 0), P(0, 10)] });

  it("leaves a mark as it is when no feature is named, or the feature is its own", () => {
    expect(asFeature(triangle, undefined)).toBe(triangle);
    expect(asFeature(triangle, "polygon")).toBe(triangle);
  });

  it("reads filled shapes as their area", () => {
    expect(asFeature(triangle, "area").shape).toEqual({ kind: "area", outline: [P(0, 0), P(10, 0), P(0, 10)] });
    const disc = asFeature(lit({ kind: "circle", center: P(0, 0), r: 10 }), "area").shape;
    expect(disc.kind).toBe("area");
    const wedge = asFeature(lit({ kind: "angle", vertex: P(0, 0), from: 0, sweep: Math.PI / 2, r: 10 }), "area").shape;
    if (wedge.kind !== "area") throw new Error(wedge.kind);
    expect(wedge.outline[0]).toEqual(P(0, 0));
    expect(wedge.outline[1]).toEqual(P(10, 0));
    expect(wedge.outline.at(-1)!.y).toBeCloseTo(-10);
  });

  it("reads a ring as the point inside it, and a segment as its midpoint", () => {
    expect(asFeature(lit({ kind: "circle", center: P(3, 4), r: 8 }), "point").shape).toEqual({ kind: "point", at: P(3, 4) });
    expect(asFeature(lit({ kind: "segment", a: P(0, 0), b: P(10, 4) }), "midpoint").shape).toEqual({
      kind: "midpoint",
      at: P(5, 2),
      a: P(0, 0),
      b: P(10, 4),
    });
  });

  it("keeps the leader where it was, and a mark it cannot read that way", () => {
    const side = lit({ kind: "segment", a: P(0, 0), b: P(10, 0) }, P(5, 0));
    expect(asFeature(side, "area")).toBe(side);
    expect(asFeature(lit({ kind: "circle", center: P(1, 1), r: 2 }, P(9, 9)), "point").anchor).toEqual(P(9, 9));
  });
});

describe("shapeKey", () => {
  it("is the same for a shape however it was traced", () => {
    expect(shapeKey({ kind: "segment", a: P(0, 0), b: P(10, 0) })).toBe(shapeKey({ kind: "segment", a: P(10, 0), b: P(0.2, 0) }));
    expect(shapeKey({ kind: "angle", vertex: P(0, 0), from: 1, sweep: -0.5, r: 26 })).toBe(
      shapeKey({ kind: "angle", vertex: P(0, 0), from: 0.5, sweep: 0.5, r: 40 }),
    );
    expect(shapeKey({ kind: "polygon", corners: [P(0, 0), P(1, 0), P(0, 1)] })).toBe(
      shapeKey({ kind: "polygon", corners: [P(0, 1), P(0, 0), P(1, 0)] }),
    );
  });

  it("tells different features on the same corners apart", () => {
    const corners = [P(0, 0), P(10, 0), P(0, 10)];
    expect(shapeKey({ kind: "polygon", corners })).not.toBe(shapeKey({ kind: "area", outline: corners }));
    expect(shapeKey({ kind: "point", at: P(1, 1) })).not.toBe(shapeKey({ kind: "point", at: P(9, 1) }));
  });
});

describe("distinctShapes and leaderEnds", () => {
  const wedge = { kind: "angle", vertex: P(0, 0), from: 0, sweep: 1, r: 26 } as const;

  it("light an angle's arc and its label as one wedge, reached by one leader", () => {
    const both = [lit(wedge, P(20, -10)), lit(wedge, P(40, -20))];
    expect(distinctShapes(both)).toEqual([wedge]);
    expect(leaderEnds(both)).toEqual([P(20, -10)]);
  });

  it("keep shapes in different places apart", () => {
    const two = [lit({ kind: "point", at: P(0, 0) }), lit({ kind: "point", at: P(200, 0) }, P(200, 0))];
    expect(distinctShapes(two)).toHaveLength(2);
    expect(leaderEnds(two)).toEqual([P(0, 0), P(200, 0)]);
  });
});

describe("directions", () => {
  it("turns the short way round", () => {
    expect(turn(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2);
    expect(turn(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });

  it("traces arcs counter-clockwise as the reader sees them, y down", () => {
    const [start, , end] = arcPoints(P(0, 0), 10, 0, Math.PI / 2, 2);
    expect(start).toEqual(P(10, 0));
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(-10);
  });
});
