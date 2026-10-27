// Claude's remarks placed on the words they quote, afresh as the answer is
// corrected, the text cut into runs to highlight, the remark under the
// caret, and the margin's boxes stacked by their words.

import { describe, expect, it } from "vitest";
import { placeRemarks, remarkAt, runsOf, stack } from "./remarks.ts";

const remark = (quote: string) => ({ quote, note: `On “${quote}”.` });

describe("placeRemarks", () => {
  it("finds each remark's words in the answer", () => {
    const text = "The medians meet at the incentre, one third along.";
    expect(placeRemarks(text, [remark("incentre"), remark("one third")])).toEqual([
      { start: 24, end: 32 },
      { start: 34, end: 43 },
    ]);
  });

  it("matches spaces and line breaks loosely, since a quote may not copy them exactly", () => {
    expect(placeRemarks("meet at\nthe   incentre", [remark("the incentre")])).toEqual([{ start: 8, end: 22 }]);
    expect(placeRemarks("a (b) c*", [remark("(b) c*")])).toEqual([{ start: 2, end: 8 }]);
  });

  it("gives each remark words of its own, taking the next place for the same words", () => {
    expect(placeRemarks("two and two", [remark("two"), remark("two"), remark("two")])).toEqual([
      { start: 0, end: 3 },
      { start: 8, end: 11 },
      null,
    ]);
    expect(placeRemarks("abc", [remark("abc"), remark("b")])).toEqual([{ start: 0, end: 3 }, null]);
  });

  it("has no place for words the learner has since changed", () => {
    expect(placeRemarks("At the centroid", [remark("incentre")])).toEqual([null]);
    expect(placeRemarks("", [remark("incentre")])).toEqual([null]);
  });
});

describe("runsOf", () => {
  it("cuts the text at the remarks' places, in order, whatever order the remarks are in", () => {
    expect(runsOf("a bc d", [{ start: 5, end: 6 }, null, { start: 2, end: 4 }])).toEqual([
      { text: "a ", remark: null },
      { text: "bc", remark: 2 },
      { text: " ", remark: null },
      { text: "d", remark: 0 },
    ]);
  });

  it("is the whole text in one run with nothing to mark, even when empty", () => {
    expect(runsOf("plain", [null])).toEqual([{ text: "plain", remark: null }]);
    expect(runsOf("", [])).toEqual([{ text: "", remark: null }]);
  });
});

describe("remarkAt", () => {
  it("is the remark whose words the caret is in or at the edge of", () => {
    const places = [{ start: 2, end: 4 }, null, { start: 6, end: 9 }];
    expect(remarkAt(places, 0)).toBeNull();
    expect(remarkAt(places, 2)).toBe(0);
    expect(remarkAt(places, 4)).toBe(0);
    expect(remarkAt(places, 5)).toBeNull();
    expect(remarkAt(places, 9)).toBe(2);
  });
});

describe("stack", () => {
  it("puts each box by its words, pushed down below the one before where they would overlap", () => {
    expect(stack([0, 10, 100, 105], [40, 30, 20, 20], 10)).toEqual([0, 50, 100, 130]);
  });

  it("puts a box wanted nowhere in particular straight after the one before", () => {
    expect(stack([0, 0], [40, 30], 10)).toEqual([0, 50]);
    expect(stack([], [], 10)).toEqual([]);
  });
});
