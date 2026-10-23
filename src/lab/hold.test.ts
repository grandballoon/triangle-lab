// Holding the formula band still while the figure is dragged (hold.ts).

import { describe, expect, it } from "vitest";
import { liveHold, present, splitNumbers, type Hold } from "./hold.ts";
import type { Readout } from "./scene.ts";

const rows = (...tex: string[]): Readout[] => tex.map((t) => ({ tex: t }));
const texts = (shown: { rows: readonly Readout[] }): string[] => shown.rows.map((r) => r.tex);

/** Run `present` over a sequence of frames, each `[editing, readouts]`. */
function run(frames: [boolean, Readout[]][], hold: Hold = liveHold): { hold: Hold; rows: readonly Readout[] }[] {
  return frames.map(([editing, live]) => {
    const shown = present(hold, editing, live);
    hold = shown.hold;
    return shown;
  });
}

describe("present", () => {
  it("shows the readouts as they are while nothing is dragged", () => {
    const [a, b] = run([
      [false, rows("x = 1")],
      [false, rows("x = 2")],
    ]);
    expect(texts(a)).toEqual(["x = 1"]);
    expect(texts(b)).toEqual(["x = 2"]);
  });

  it("holds and greys the numbers a drag changes, at their value from before it", () => {
    const [, during, later] = run([
      [false, rows("a = 1.5,\\ b = 7")],
      [true, rows("a = 1.6,\\ b = 7")],
      [true, rows("a = 1.9,\\ b = 7")],
    ]);
    const held = "a = \\htmlClass{held held-new}{1.5},\\ b = 7";
    expect(texts(during)).toEqual([held]);
    // Nothing new is held, so the row is unchanged and not typeset afresh.
    expect(texts(later)).toEqual([held]);
  });

  it("keeps an already-grey number grey and fades in only the newly held one", () => {
    const [, , both] = run([
      [false, rows("a = 1,\\ b = 7")],
      [true, rows("a = 2,\\ b = 7")],
      [true, rows("a = 3,\\ b = 8")],
    ]);
    expect(texts(both)).toEqual(["a = \\htmlClass{held}{1},\\ b = \\htmlClass{held held-new}{7}"]);
  });

  it("holds a whole row whose shape changes", () => {
    const [, during] = run([
      [false, [{ tex: "a = 1", tone: "good" }]],
      [true, [{ tex: "a = 1 + 2", tone: "warn" }]],
    ]);
    expect(during.rows).toEqual([{ tex: "\\htmlClass{held held-new}{a = 1}", tone: "good" }]);
  });

  it("lets the new values settle in once the drag ends, until they change again", () => {
    const [, , settled, still, moved] = run([
      [false, rows("a = 1,\\ b = 7")],
      [true, rows("a = 2,\\ b = 7")],
      [false, rows("a = 4,\\ b = 7")],
      [false, rows("a = 4,\\ b = 7")],
      [false, rows("a = 5,\\ b = 7")],
    ]);
    expect(texts(settled)).toEqual(["a = \\htmlClass{settled}{4},\\ b = 7"]);
    expect(texts(still)).toEqual(texts(settled));
    expect(texts(moved)).toEqual(["a = 5,\\ b = 7"]);
  });

  it("holds from what was showing when a new drag starts while settling", () => {
    const [, , , again] = run([
      [false, rows("a = 1")],
      [true, rows("a = 2")],
      [false, rows("a = 3")],
      [true, rows("a = 4")],
    ]);
    expect(texts(again)).toEqual(["a = \\htmlClass{held held-new}{3}"]);
  });

  it("shows rows that appear mid-drag as they are", () => {
    const [, during] = run([
      [false, rows("a = 1")],
      [true, rows("a = 1", "b = 2")],
    ]);
    expect(texts(during)).toEqual(["a = 1", "b = 2"]);
  });
});

describe("splitNumbers", () => {
  it("cuts a formula at its numbers and degree signs, but not inside command names or term ids", () => {
    expect(splitNumbers("\\htmlData{term=side2}{4.5} + \\tfrac12 x = 30^\\circ")).toEqual({
      text: ["\\htmlData{term=side2}{", "} + \\tfrac", " x = ", ""],
      numbers: ["4.5", "12", "30^\\circ"],
    });
  });
});
