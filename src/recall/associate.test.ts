// Free association: the request and Claude's reading as the page and the
// Worker read them, what a reply from /associate means, and the writing as it
// is read, corrected and read again.

import { describe, expect, it } from "vitest";
import {
  askReading,
  EMPTY_ASSOCIATION,
  editWriting,
  loadAssociation,
  MAX_NEXT,
  MAX_NOTES,
  MAX_WRITING,
  notedLessons,
  readAsWritten,
  readAssociateReply,
  readAssociateRequest,
  readReading,
  settleReading,
  wantsReading,
  type Association,
  type Reading,
} from "./associate.ts";
import { EMPTY_DECK, newCard, type Deck } from "./deck.ts";

const reading: Reading = {
  feedback: "You know the centres well; similarity is thin.",
  remarks: [{ quote: "the incentre", note: "Medians meet at the centroid.", lesson: "medians" }],
  next: [{ lesson: "similar", why: "It builds on the angle sum you know." }],
};

describe("notedLessons", () => {
  it("lists each lesson with a question noted in it once, in reading order", () => {
    const place = (lesson: string) => ({ lesson, step: 0, stepTitle: "" });
    const deck: Deck = {
      ...EMPTY_DECK,
      cards: [newCard("a", "Why?", place("pythagoras"), 0)!, newCard("b", "How?", place("medians"), 0)!, newCard("c", "Who?", place("pythagoras"), 0)!],
    };
    expect(notedLessons(deck)).toEqual(["medians", "pythagoras"]);
  });

  it("leaves out lessons no longer in the course", () => {
    expect(notedLessons({ ...EMPTY_DECK, cards: [newCard("a", "Why?", { lesson: "gone", step: 0, stepTitle: "" }, 0)!] })).toEqual([]);
  });
});

describe("readAssociateRequest", () => {
  it("reads the writing, trimmed and capped, and the lessons noted in, dropping any not in the course", () => {
    expect(readAssociateRequest({ text: " The medians meet at G. ", noted: ["medians", "nowhere", 3, "medians"] })).toEqual({
      text: "The medians meet at G.",
      noted: ["medians"],
    });
    expect(readAssociateRequest({ text: "x".repeat(MAX_WRITING + 5), noted: [] })?.text).toHaveLength(MAX_WRITING);
  });

  it("is not read from anything else, nor with nothing written", () => {
    for (const raw of [null, "text", {}, { text: "Hi" }, { text: 3, noted: [] }, { text: "  ", noted: [] }]) {
      expect(readAssociateRequest(raw)).toBeNull();
    }
  });
});

describe("readReading", () => {
  it("reads feedback, remarks with the lesson that teaches each, and next steps", () => {
    expect(readReading(reading)).toEqual(reading);
  });

  it("drops a remark's lesson that is not in the course, keeping the remark", () => {
    const raw = { ...reading, remarks: [{ quote: "x", note: "y", lesson: "" }, { quote: "z", note: "w", lesson: "nowhere" }] };
    expect(readReading(raw)?.remarks).toEqual([
      { quote: "x", note: "y" },
      { quote: "z", note: "w" },
    ]);
  });

  it("drops remarks and steps that are not one, a step repeated, and any over the limits", () => {
    const raw = {
      feedback: " Good. ",
      remarks: [{ quote: " ", note: "n" }, { quote: "q", note: "" }, "x", ...Array.from({ length: MAX_NOTES + 3 }, (_, i) => ({ quote: `q${i}`, note: "n" }))],
      next: [
        { lesson: "nowhere", why: "w" },
        { lesson: "medians", why: " " },
        { lesson: "medians", why: "First." },
        { lesson: "medians", why: "Again." },
        { lesson: "bisectors", why: "b" },
        { lesson: "incircle", why: "i" },
        { lesson: "altitudes", why: "a" },
      ],
    };
    const read = readReading(raw)!;
    expect(read.feedback).toBe("Good.");
    expect(read.remarks).toHaveLength(MAX_NOTES);
    expect(read.remarks[0]).toEqual({ quote: "q0", note: "n" });
    expect(read.next.map((s) => s.lesson)).toEqual(["medians", "bisectors", "incircle"].slice(0, MAX_NEXT));
    expect(read.next[0].why).toBe("First.");
  });

  it("is not read without feedback", () => {
    for (const raw of [null, {}, { ...reading, feedback: " " }, { ...reading, feedback: 3 }]) expect(readReading(raw)).toBeNull();
  });

  it("reads missing lists as empty", () => {
    expect(readReading({ feedback: "Fine." })).toEqual({ feedback: "Fine.", remarks: [], next: [] });
  });
});

describe("readAssociateReply", () => {
  it("reads Claude's reading from a reply that worked", () => {
    expect(readAssociateReply({ status: 200, body: reading })).toEqual({ kind: "done", reading });
  });

  it("says why there is no reading", () => {
    expect(readAssociateReply(null)).toEqual({ kind: "failed", error: "Can't reach the server to read this." });
    expect(readAssociateReply({ status: 401, body: null })).toMatchObject({ error: expect.stringContaining("sync key") });
    expect(readAssociateReply({ status: 502, body: { error: "Claude is busy." } })).toEqual({ kind: "failed", error: "Claude is busy." });
    expect(readAssociateReply({ status: 500, body: null })).toEqual({ kind: "failed", error: "The server answered 500." });
    expect(readAssociateReply({ status: 200, body: {} })).toMatchObject({ error: expect.stringContaining("unreadable") });
  });
});

describe("the writing, read and corrected", () => {
  const written = editWriting(EMPTY_ASSOCIATION, "Medians meet at the incentre.");

  it("asks for writing to be read as it stands, once, and not when empty", () => {
    expect(askReading(EMPTY_ASSOCIATION)).toBe(EMPTY_ASSOCIATION);
    const asked = askReading(written);
    expect(asked).toEqual({ text: written.text, state: { kind: "reading" }, sent: written.text });
    expect(askReading(asked)).toBe(asked);
    expect(readAsWritten(asked)).toBe(true);
  });

  it("takes the reading of the writing as last sent, and keeps it as the writing is corrected", () => {
    const asked = askReading(written);
    const done = settleReading(asked, written.text, { kind: "done", reading });
    expect(done.state).toEqual({ kind: "done", reading });
    expect(settleReading(done, written.text, { kind: "failed", error: "late" })).toBe(done);

    const corrected = editWriting(done, "Medians meet at the centroid.");
    expect(corrected.state).toEqual({ kind: "done", reading });
    expect(readAsWritten(corrected)).toBe(false);
    expect(askReading(corrected)).toMatchObject({ state: { kind: "reading" }, sent: "Medians meet at the centroid." });
  });

  it("drops a reply to writing sent again since", () => {
    const first = askReading(written);
    const again = askReading(editWriting({ ...first, state: { kind: "failed", error: "busy" } }, "Changed."));
    expect(settleReading(again, written.text, { kind: "done", reading })).toBe(again);
  });

  it("asks again after a failure, even unchanged", () => {
    const failed: Association = { ...askReading(written), state: { kind: "failed", error: "busy" } };
    expect(askReading(failed).state).toEqual({ kind: "reading" });
  });
});

describe("loadAssociation", () => {
  it("keeps the writing and a finished reading", () => {
    const kept: Association = { text: "Hi", state: { kind: "done", reading }, sent: "Hi" };
    expect(loadAssociation(JSON.parse(JSON.stringify(kept)))).toEqual(kept);
    expect(wantsReading(kept)).toBe(false);
  });

  it("drops a reading under way, so the page asks again", () => {
    const loaded = loadAssociation({ text: "Hi", state: { kind: "reading" }, sent: "Hi" });
    expect(loaded).toEqual({ text: "Hi", state: null, sent: "Hi" });
    expect(wantsReading(loaded)).toBe(true);
  });

  it("starts empty from anything else", () => {
    for (const raw of [null, "x", {}, { text: 3 }]) expect(loadAssociation(raw)).toEqual(EMPTY_ASSOCIATION);
    expect(wantsReading(EMPTY_ASSOCIATION)).toBe(false);
  });
});
