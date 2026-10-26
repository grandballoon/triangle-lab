// A review sitting: asking, checking, grading, one more try after a first
// miss, and cards deleted from under it.

import { describe, expect, it } from "vitest";
import { dueAfter, newCard, removeCard, type Card, type Deck } from "./deck.ts";
import { currentCard, gradeCurrent, loadSitting, progress, prune, reveal, startSession } from "./session.ts";

const T0 = 1_800_000_000_000;
const here = { lesson: "medians", step: 0, stepTitle: "Draw the medians" };
const card = (id: string): Card => newCard(id, `Question ${id}?`, here, T0)!;
const deck: Deck = { cards: [card("a"), card("b")], removed: [] };

describe("a sitting", () => {
  it("asks the cards in order, answering, checking and grading each", () => {
    let s = startSession(deck.cards);
    expect(currentCard(s, deck)?.id).toBe("a");
    expect(s.phase).toBe("ask");

    s = reveal(s, "From memory");
    expect(s).toMatchObject({ phase: "check", answer: "From memory" });

    const graded = gradeCurrent(s, deck, "recalled", T0 + 1);
    expect(graded.session).toMatchObject({ queue: ["b"], phase: "ask", answer: "" });
    expect(graded.deck.cards[0]).toMatchObject({
      box: 1,
      due: dueAfter(1, T0 + 1),
      attempts: [{ at: T0 + 1, answer: "From memory", grade: "recalled" }],
    });
    expect(currentCard(graded.session, graded.deck)?.id).toBe("b");
    expect(progress(graded.session)).toEqual({ done: 1, total: 2 });
  });

  it("does not grade a card before it is checked", () => {
    const s = startSession(deck.cards);
    expect(gradeCurrent(s, deck, "recalled", T0)).toEqual({ session: s, deck });
  });

  it("asks a card missed for the first time once more, at the end", () => {
    let s = startSession(deck.cards);
    let d = deck;
    ({ session: s, deck: d } = gradeCurrent(reveal(s, ""), d, "missed", T0));
    expect(s.queue).toEqual(["b", "a"]);
    expect(progress(s)).toEqual({ done: 1, total: 3 });

    ({ session: s, deck: d } = gradeCurrent(reveal(s, ""), d, "shaky", T0));
    ({ session: s, deck: d } = gradeCurrent(reveal(s, "again"), d, "missed", T0));
    expect(s.queue).toEqual([]);
    expect(currentCard(s, d)).toBeNull();
    expect(s.tally).toEqual({ missed: 2, shaky: 1, recalled: 0 });
    expect(d.cards[0].attempts.map((a) => a.grade)).toEqual(["missed", "missed"]);
  });

  it("drops a card deleted mid-sitting, and the answer being checked with it", () => {
    const s = reveal(startSession(deck.cards), "half written");
    const without = removeCard(deck, "a", T0);
    expect(prune(s, without)).toMatchObject({ queue: ["b"], phase: "ask", answer: "" });
    expect(prune(s, deck)).toBe(s);
  });

  it("keeps the answer being checked when another card goes", () => {
    const s = reveal(startSession(deck.cards), "kept");
    expect(prune(s, removeCard(deck, "b", T0))).toMatchObject({ queue: ["a"], phase: "check", answer: "kept" });
  });
});

describe("a sitting kept across a reload", () => {
  it("reads back as it was kept", () => {
    const { session } = gradeCurrent(reveal(startSession(deck.cards), "x"), deck, "missed", T0);
    const kept = { session: reveal(session, "half"), draft: "half" };
    expect(loadSitting(JSON.parse(JSON.stringify(kept)))).toEqual(kept);
  });

  it("is not read from anything else", () => {
    const good = { session: startSession(deck.cards), draft: "" };
    for (const raw of [
      null,
      "sitting",
      {},
      { ...good, draft: 3 },
      { ...good, session: { ...good.session, queue: [1] } },
      { ...good, session: { ...good.session, phase: "done" } },
      { ...good, session: { ...good.session, tally: { missed: 0, shaky: -1, recalled: 0 } } },
      { ...good, session: { ...good.session, tally: undefined } },
    ]) {
      expect(loadSitting(raw)).toBeNull();
    }
  });
});
