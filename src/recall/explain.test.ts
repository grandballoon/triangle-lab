// Checking an explanation on a lesson page: the request as page and Worker
// read it, the explanation as it is written, checked and corrected, and as it
// is kept in the browser.

import { describe, expect, it } from "vitest";
import {
  askCheck,
  checkedAsItStands,
  editExplanation,
  EMPTY_EXPLANATION,
  keepExplanation,
  readExplainRequest,
  readExplanation,
  settleCheck,
  type Explanation,
} from "./explain.ts";
import { MAX_ANSWER, type Verdict } from "./deck.ts";

const verdict: Verdict = { grade: "shaky", feedback: "Nearly.", remarks: [{ quote: "incentre", note: "The centroid." }] };

describe("readExplainRequest", () => {
  it("reads a request about a lesson in the course, trimmed and capped", () => {
    expect(readExplainRequest({ lesson: "medians", step: " Step 2: Find the centroid ", text: " They meet. " })).toEqual({
      lesson: "medians",
      step: "Step 2: Find the centroid",
      text: "They meet.",
    });
    expect(readExplainRequest({ lesson: "medians", step: "", text: "x".repeat(MAX_ANSWER + 9) })?.text).toHaveLength(MAX_ANSWER);
  });

  it("refuses one with nothing to check, an unknown lesson, or the wrong shape", () => {
    expect(readExplainRequest({ lesson: "medians", step: "", text: "  " })).toBeNull();
    expect(readExplainRequest({ lesson: "nowhere", step: "", text: "Hi" })).toBeNull();
    expect(readExplainRequest({ lesson: "medians", text: "Hi" })).toBeNull();
    expect(readExplainRequest(null)).toBeNull();
  });
});

describe("an explanation, checked and corrected", () => {
  const written = editExplanation(EMPTY_EXPLANATION, "They meet at the incentre.");

  it("asks for a check of the explanation as it stands, once", () => {
    const asked = askCheck(written);
    expect(asked).toEqual({ text: written.text, review: { kind: "checking" }, sent: written.text });
    expect(askCheck(asked)).toBe(asked);
    expect(askCheck(EMPTY_EXPLANATION)).toBe(EMPTY_EXPLANATION);
    expect(askCheck(editExplanation(EMPTY_EXPLANATION, "  "))).toEqual(editExplanation(EMPTY_EXPLANATION, "  "));
  });

  it("takes in the check of the explanation as last sent, and keeps it through edits", () => {
    const asked = askCheck(written);
    const done = settleCheck(asked, written.text, { kind: "done", verdict });
    expect(done.review).toEqual({ kind: "done", verdict });
    expect(checkedAsItStands(done)).toBe(true);
    expect(askCheck(done)).toBe(done);

    const edited = editExplanation(done, "They meet at the centroid.");
    expect(edited.review).toEqual({ kind: "done", verdict });
    expect(checkedAsItStands(edited)).toBe(false);
    expect(askCheck(edited)).toMatchObject({ review: { kind: "checking" }, sent: "They meet at the centroid." });
  });

  it("drops a check of an explanation sent before the last", () => {
    const first = askCheck(written);
    const second = askCheck(editExplanation(settleCheck(first, written.text, { kind: "failed", error: "Offline." }), "Again."));
    expect(settleCheck(second, written.text, { kind: "done", verdict })).toBe(second);
  });

  it("asks again after a check failed", () => {
    const failed = settleCheck(askCheck(written), written.text, { kind: "failed", error: "Offline." });
    expect(askCheck(failed).review).toEqual({ kind: "checking" });
  });
});

describe("kept in the browser", () => {
  it("keeps a check that is done, and reads it back", () => {
    const done: Explanation = { text: "Edited since.", review: { kind: "done", verdict }, sent: "First." };
    expect(readExplanation(JSON.parse(JSON.stringify(keepExplanation(done))))).toEqual(done);
  });

  it("drops a check still under way, since its request went with the page", () => {
    const checking = askCheck(editExplanation(EMPTY_EXPLANATION, "Hi"));
    expect(keepExplanation(checking)).toEqual({ text: "Hi", review: null, sent: null });
  });

  it("reads anything else as an empty explanation, or the text alone", () => {
    expect(readExplanation(null)).toBe(EMPTY_EXPLANATION);
    expect(readExplanation({ text: 3 })).toBe(EMPTY_EXPLANATION);
    expect(readExplanation({ text: "Hi", review: { kind: "done" }, sent: "Hi" })).toEqual({ text: "Hi", review: null, sent: null });
  });
});
