// Figures held between two hands.

import { describe, expect, it } from "vitest";
import { vec, type Vec } from "../geo.ts";
import type { HandPoints } from "../scene.ts";
import { handPair, protractorOf, triangleOf } from "./two-hands.ts";

/** A hand with every landmark at `rest`, except the ones given. */
function hand(side: "left" | "right", rest: Vec, at: Record<number, Vec>): HandPoints {
  return { side, points: Array.from({ length: 21 }, (_, i) => at[i] ?? rest) };
}

const LEFT = hand("left", vec(-2, 0), { 0: vec(-0.5, -3), 2: vec(-2, -2), 5: vec(-2, -1), 8: vec(-0.2, 2) });
const RIGHT = hand("right", vec(2, 0), { 0: vec(0.5, -3), 2: vec(2, -2), 5: vec(2, -1), 8: vec(0.2, 2) });

describe("two hands", () => {
  it("are needed: none or one leaves the figure to be dragged", () => {
    expect(handPair([])).toBeNull();
    expect(protractorOf([RIGHT])).toBeNull();
    expect(triangleOf([LEFT])).toBeNull();
  });

  it("are taken left to right on screen, whatever order they were found in", () => {
    expect(handPair([RIGHT, LEFT])).toEqual([LEFT, RIGHT]);
    expect(handPair([LEFT, RIGHT])).toEqual([LEFT, RIGHT]);
  });

  it("open an angle from between the wrists to each index fingertip", () => {
    expect(protractorOf([RIGHT, LEFT])).toEqual({ V: vec(0, -3), P: vec(0.2, 2), Q: vec(-0.2, 2) });
  });

  it("frame a triangle with the webs of the hands below and the fingertips above", () => {
    expect(triangleOf([RIGHT, LEFT])).toEqual({ A: vec(-2, -1.5), B: vec(2, -1.5), C: vec(0, 2) });
  });
});
