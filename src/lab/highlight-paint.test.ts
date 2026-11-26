// Painting what a hovered term lights (highlight-paint.ts): every kind of
// feature puts something on the canvas, each its own way, and leaves the
// context as it found it.

import { describe, expect, it } from "vitest";
import { paintHighlights } from "./highlight-paint.ts";
import type { Shape } from "./highlight.ts";

/** A 2D context that counts each call and rejects numbers that are not real. */
function counter(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) =>
      name in store
        ? store[name]
        : (...args: unknown[]) => {
            if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) throw new Error(`${name}: non-finite`);
            calls.push(name);
          },
    set: (store, name: string, value) => {
      store[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const P = (x: number, y: number) => ({ x, y });
const triangle = [P(0, 0), P(100, 0), P(0, 100)];

const EVERY_KIND: Shape[] = [
  { kind: "point", at: P(10, 10) },
  { kind: "segment", a: P(0, 0), b: P(100, 0) },
  { kind: "midpoint", at: P(50, 0), a: P(0, 0), b: P(100, 0) },
  { kind: "arc", center: P(0, 0), r: 50, from: 0, sweep: 1 },
  { kind: "circle", center: P(0, 0), r: 50 },
  { kind: "angle", vertex: P(0, 0), from: 0, sweep: -1, r: 26 },
  { kind: "polygon", corners: triangle },
  { kind: "area", outline: triangle },
  { kind: "label", at: P(10, 10), width: 30, height: 20 },
];

describe("paintHighlights", () => {
  it.each(EVERY_KIND.map((s) => [s.kind, s] as const))("paints a %s, balancing every save", (_, shape) => {
    const { ctx, calls } = counter();
    paintHighlights(ctx, [shape]);
    expect(calls.filter((c) => c === "stroke" || c === "fill").length).toBeGreaterThan(0);
    expect(calls.filter((c) => c === "save").length).toBe(calls.filter((c) => c === "restore").length);
  });

  it("paints each kind differently", () => {
    const looks = EVERY_KIND.map((shape) => {
      const { ctx, calls } = counter();
      paintHighlights(ctx, [shape]);
      return calls.join(" ");
    });
    expect(new Set(looks).size).toBe(EVERY_KIND.length);
  });

  it("paints nothing when nothing is lit", () => {
    const { ctx, calls } = counter();
    paintHighlights(ctx, []);
    expect(calls).toEqual([]);
  });
});
