// Checking an explanation on a lesson page: the request as page and Worker
// read it, the explanation as it is written, checked and corrected, and as it
// is kept in the deck.

import { describe, expect, it } from "vitest";
import {
  afterDeckChange,
  askCheck,
  checkedAsItStands,
  editExplanation,
  EMPTY_EXPLANATION,
  explanationIn,
  keepExplanation,
  moveLocalExplanation,
  readExplainRequest,
  readLocalExplanation,
  settleCheck,
  type Explanation,
} from "./explain.ts";
import { EMPTY_DECK, explanationOf, loadDeck, MAX_ANSWER, saveDeck, setExplanation, type Verdict } from "./deck.ts";

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

describe("kept in the deck", () => {
  const T0 = 1_800_000_000_000;
  const done: Explanation = { text: "Edited since.", review: { kind: "done", verdict }, sent: "First." };

  it("keeps the text and a check that came back, and reads them back as the page shows them", () => {
    const deck = keepExplanation(EMPTY_DECK, "medians", done, T0);
    expect(explanationOf(deck, "medians")).toEqual({ lesson: "medians", text: "Edited since.", checked: { text: "First.", verdict }, updated: T0 });
    expect(explanationIn(loadDeck(JSON.parse(JSON.stringify(saveDeck(deck))))!, "medians")).toEqual(done);
    expect(explanationIn(deck, "altitudes")).toBe(EMPTY_EXPLANATION);
  });

  it("dates it only when what is kept changes", () => {
    const deck = keepExplanation(EMPTY_DECK, "medians", done, T0);
    expect(keepExplanation(deck, "medians", { ...done }, T0 + 1)).toBe(deck);
    expect(keepExplanation(EMPTY_DECK, "medians", EMPTY_EXPLANATION, T0)).toBe(EMPTY_DECK);
    expect(explanationOf(keepExplanation(deck, "medians", editExplanation(done, "Again."), T0 + 1), "medians")?.updated).toBe(T0 + 1);
  });

  it("keeps the last check that came back while another is under way or has failed", () => {
    const deck = keepExplanation(EMPTY_DECK, "medians", done, T0);
    const checking = askCheck(done);
    expect(keepExplanation(deck, "medians", checking, T0 + 1)).toBe(deck);
    const failed = settleCheck(checking, done.text, { kind: "failed", error: "Offline." });
    expect(keepExplanation(deck, "medians", failed, T0 + 1)).toBe(deck);
    expect(explanationOf(keepExplanation(EMPTY_DECK, "medians", askCheck(editExplanation(EMPTY_EXPLANATION, "Hi")), T0), "medians")?.checked).toBeNull();
  });

  it("caps the text kept, as a check would", () => {
    const long = editExplanation(EMPTY_EXPLANATION, "x".repeat(MAX_ANSWER + 10));
    expect(explanationOf(keepExplanation(EMPTY_DECK, "medians", long, T0), "medians")?.text).toHaveLength(MAX_ANSWER);
  });

  it("follows a change from another tab or device, and otherwise leaves the page's own, check under way and all", () => {
    const deck = keepExplanation(EMPTY_DECK, "medians", done, T0);
    const checking = askCheck(done);
    expect(afterDeckChange(deck, "medians", checking)).toBe(checking);
    const elsewhere = setExplanation(deck, { lesson: "medians", text: "From the phone.", checked: null, updated: T0 + 1 });
    expect(afterDeckChange(elsewhere, "medians", checking)).toEqual({ text: "From the phone.", review: null, sent: null });
  });
});

describe("moving an explanation kept in this browser alone into the deck", () => {
  it("moves it in, dated as early as can be, so anything written since wins", () => {
    const moved = moveLocalExplanation(EMPTY_DECK, "medians", { text: "Old.", review: { kind: "done", verdict }, sent: "Old." });
    expect(explanationOf(moved, "medians")).toEqual({ lesson: "medians", text: "Old.", checked: { text: "Old.", verdict }, updated: 0 });
  });

  it("leaves a lesson the deck already holds as it is", () => {
    const deck = setExplanation(EMPTY_DECK, { lesson: "medians", text: "New.", checked: null, updated: 5 });
    expect(moveLocalExplanation(deck, "medians", { text: "Old." })).toBe(deck);
  });

  it("reads anything else as an empty explanation, or the text alone, dropping a failed check", () => {
    expect(readLocalExplanation(null)).toBe(EMPTY_EXPLANATION);
    expect(readLocalExplanation({ text: 3 })).toBe(EMPTY_EXPLANATION);
    expect(readLocalExplanation({ text: "Hi", review: { kind: "done" }, sent: "Hi" })).toEqual({ text: "Hi", review: null, sent: null });
    expect(moveLocalExplanation(EMPTY_DECK, "medians", null)).toBe(EMPTY_DECK);
    const failed = moveLocalExplanation(EMPTY_DECK, "medians", { text: "Hi", review: { kind: "failed", error: "Offline." }, sent: "Hi" });
    expect(explanationOf(failed, "medians")?.checked).toBeNull();
  });
});
