import { describe, expect, it } from "vitest";
import {
  angleAt,
  circleCircle,
  circumcenter,
  dist,
  fmt,
  incenter,
  lineCircle,
  lineLine,
  onCircle,
  onSegment,
  orthocenter,
  polygonArea,
  project,
  reflect,
  regularPolygon,
  tangentPoints,
  vec,
} from "./geo.ts";

const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 9);

describe("geo", () => {
  const A = vec(0, 0);
  const B = vec(4, 0);
  const P = vec(0, 3);

  it("measures angles", () => {
    close(angleAt(B, A, P), Math.PI / 2);
    close(angleAt(A, B, P), Math.atan2(3, 4));
  });

  it("projects and reflects", () => {
    expect(project(vec(2, 5), A, B)).toEqual(vec(2, 0));
    expect(reflect(vec(2, 5), A, B)).toEqual(vec(2, -5));
  });

  it("intersects lines and circles", () => {
    expect(lineLine(A, B, vec(1, -1), vec(1, 1))).toEqual(vec(1, 0));
    expect(lineLine(A, B, vec(0, 1), vec(4, 1))).toBeNull();
    const hits = lineCircle(vec(-5, 0), vec(5, 0), A, 2);
    expect(hits.map((h) => h.x)).toEqual([-2, 2]);
    expect(lineCircle(vec(-5, 3), vec(5, 3), A, 2)).toEqual([]);
    const lens = circleCircle(A, 5, vec(8, 0), 5);
    expect(lens).toHaveLength(2);
    for (const p of lens) {
      close(p.x, 4);
      close(Math.abs(p.y), 3);
    }
  });

  it("finds tangent points at right angles to the radius", () => {
    const from = vec(5, 0);
    const pts = tangentPoints(from, A, 3);
    expect(pts).toHaveLength(2);
    for (const t of pts) {
      close(dist(t, A), 3);
      close(dist(t, from), 4);
    }
    expect(tangentPoints(vec(1, 0), A, 3)).toEqual([]);
  });

  it("finds triangle centres", () => {
    // 3-4-5 right triangle: circumcentre at the hypotenuse midpoint,
    // orthocentre at the right angle, inradius 1.
    expect(circumcenter(A, B, P)).toEqual(vec(2, 1.5));
    const h = orthocenter(A, B, P);
    close(h.x, 0);
    close(h.y, 0);
    const i = incenter(A, B, P);
    close(i.x, 1);
    close(i.y, 1);
  });

  it("measures polygons", () => {
    close(polygonArea([A, B, P]), 6);
    close(polygonArea(regularPolygon(A, 1, 4)), 2);
  });

  it("constrains points", () => {
    const c = onCircle(A, 2)(vec(10, 0));
    expect(c).toEqual(vec(2, 0));
    expect(onSegment(A, B)(vec(9, 9))).toEqual(B);
    // Constraints can follow moving points.
    const centre = vec(0, 0);
    const follow = onCircle(() => centre, 1);
    centre.x = 5;
    expect(follow(vec(9, 0))).toEqual(vec(6, 0));
  });

  it("formats numbers", () => {
    expect(fmt(2)).toBe("2");
    expect(fmt(2.04)).toBe("2");
    expect(fmt(2.25, 2)).toBe("2.25");
    expect(fmt(-0.01)).toBe("0");
    expect(fmt(10)).toBe("10");
  });
});
