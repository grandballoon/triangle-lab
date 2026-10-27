// Having Claude check an answer: the request and verdict as the page and the
// Worker read them, and what a reply from /check means.

import { describe, expect, it } from "vitest";
import { loadReview, readCheckReply, readCheckRequest } from "./check.ts";
import { MAX_ANSWER, MAX_FEEDBACK, readVerdict } from "./deck.ts";

const request = { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2", answer: "At the centroid" };

describe("readCheckRequest", () => {
  it("reads a question, where it was asked and a written answer, trimmed and capped", () => {
    expect(readCheckRequest(request)).toEqual(request);
    expect(readCheckRequest({ ...request, answer: `  ${"x".repeat(MAX_ANSWER + 5)} ` })?.answer).toHaveLength(MAX_ANSWER);
  });

  it("reads the card asked, which finds its material, and leaves out one that makes no sense", () => {
    const card = { id: "c1", lesson: "medians", step: 1 };
    expect(readCheckRequest({ ...request, card })).toEqual({ ...request, card });
    for (const bad of [{ ...card, id: "" }, { ...card, step: -1 }, { ...card, step: 1.5 }, { id: "c1" }, "c1"]) {
      expect(readCheckRequest({ ...request, card: bad })).toEqual(request);
    }
  });

  it("is not read from anything else, nor with nothing to check", () => {
    for (const raw of [null, "answer", {}, { ...request, answer: 3 }, { ...request, where: undefined }, { ...request, answer: " " }, { ...request, question: "" }]) {
      expect(readCheckRequest(raw)).toBeNull();
    }
  });
});

describe("readVerdict", () => {
  it("reads a grade and feedback", () => {
    expect(readVerdict({ grade: "shaky", feedback: " Close. " })).toEqual({ grade: "shaky", feedback: "Close." });
    expect(readVerdict({ grade: "recalled", feedback: "y".repeat(MAX_FEEDBACK + 1) })?.feedback).toHaveLength(MAX_FEEDBACK);
  });

  it("is not read without a known grade and some feedback", () => {
    for (const raw of [null, { grade: "great", feedback: "Yes" }, { grade: "missed" }, { grade: "missed", feedback: "  " }]) {
      expect(readVerdict(raw)).toBeNull();
    }
  });
});

describe("readCheckReply", () => {
  it("reads Claude's verdict from a reply that worked", () => {
    expect(readCheckReply({ status: 200, body: { grade: "recalled", feedback: "Right." } })).toEqual({
      kind: "done",
      verdict: { grade: "recalled", feedback: "Right." },
    });
  });

  it("says why there is no verdict", () => {
    expect(readCheckReply(null)).toEqual({ kind: "failed", error: "Can't reach the server to check this." });
    expect(readCheckReply({ status: 401, body: null })).toMatchObject({ error: expect.stringContaining("sync key") });
    expect(readCheckReply({ status: 502, body: { error: "Claude is busy." } })).toEqual({ kind: "failed", error: "Claude is busy." });
    expect(readCheckReply({ status: 500, body: null })).toEqual({ kind: "failed", error: "The server answered 500." });
    expect(readCheckReply({ status: 200, body: { grade: "?" } })).toEqual({ kind: "failed", error: "The check came back unreadable." });
  });
});

describe("loadReview", () => {
  it("keeps a finished review, and drops one under way or unreadable", () => {
    const done = { kind: "done", verdict: { grade: "missed", feedback: "No." } };
    expect(loadReview(done)).toEqual(done);
    expect(loadReview({ kind: "failed", error: "Offline." })).toEqual({ kind: "failed", error: "Offline." });
    for (const raw of [null, { kind: "checking" }, { kind: "done" }, { kind: "failed" }]) expect(loadReview(raw)).toBeNull();
  });
});
