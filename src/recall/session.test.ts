// A review sitting: asking, checking, grading, one more try after a first
// miss, cards deleted from under it, and Claude reading the answer checked.

import { describe, expect, it } from "vitest";
import type { Review } from "./check.ts";
import { dueAfter, editCard, newCard, removeCard, type Card, type Deck } from "./deck.ts";
import {
  askReview,
  currentCard,
  dropReview,
  gradeCurrent,
  loadSitting,
  progress,
  prune,
  reveal,
  reviseAnswer,
  settleReview,
  startSession,
  wantsReview,
} from "./session.ts";

const T0 = 1_800_000_000_000;
const here = { lesson: "medians", step: 0, stepTitle: "Draw the medians" };
const card = (id: string): Card => newCard(id, `Question ${id}?`, here, T0)!;
const deck: Deck = { cards: [card("a"), card("b")], removed: [] };
/** What Claude is asked to read: an answer to card `id`'s question as first worded. */
const of = (id: string, answer: string) => ({ id, question: `Question ${id}?`, answer });

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

describe("Claude reading the answer being checked", () => {
  const done: Review = { kind: "done", verdict: { grade: "shaky", feedback: "Nearly." } };
  const failed: Review = { kind: "failed", error: "Offline." };

  it("is wanted for a written answer, once", () => {
    const s = reveal(startSession(deck.cards), "At the centroid");
    expect(wantsReview(startSession(deck.cards))).toBe(false);
    expect(wantsReview(reveal(startSession(deck.cards), "  "))).toBe(false);
    expect(wantsReview(s)).toBe(true);

    const asked = askReview(s);
    expect(asked.review).toEqual({ kind: "checking" });
    expect(wantsReview(asked)).toBe(false);
    expect(askReview(asked)).toBe(asked);
  });

  it("takes in the reply for the answer asked about", () => {
    const asked = askReview(reveal(startSession(deck.cards), "At the centroid"));
    const settled = settleReview(asked, deck, of("a", "At the centroid"), done);
    expect(settled.review).toEqual(done);
    expect(askReview(settled)).toBe(settled);
  });

  it("drops a reply that comes after the sitting has moved on", () => {
    const asked = askReview(reveal(startSession(deck.cards), "At the centroid"));
    expect(settleReview(asked, deck, of("b", "At the centroid"), done)).toBe(asked);
    expect(settleReview(asked, deck, of("a", "Something else"), done)).toBe(asked);
    const { session: next } = gradeCurrent(asked, deck, "recalled", T0);
    expect(next.review).toBeNull();
    expect(settleReview(next, deck, of("a", "At the centroid"), done)).toBe(next);
  });

  it("is asked for again after a failure only when the learner says so", () => {
    const asked = askReview(reveal(startSession(deck.cards), "At the centroid"));
    const broke = settleReview(asked, deck, of("a", "At the centroid"), failed);
    expect(broke.review).toEqual(failed);
    expect(wantsReview(broke)).toBe(false);
    expect(askReview(broke).review).toEqual({ kind: "checking" });
  });

  it("is kept with the answer when the learner grades it missed or shaky", () => {
    const settled = settleReview(askReview(reveal(startSession(deck.cards), "x")), deck, of("a", "x"), done);
    expect(gradeCurrent(settled, deck, "shaky", T0).deck.cards[0].attempts).toEqual([
      { at: T0, answer: "x", grade: "shaky", claude: { grade: "shaky", feedback: "Nearly." } },
    ]);
    expect(gradeCurrent(settled, deck, "recalled", T0).deck.cards[0].attempts).toEqual([
      { at: T0, answer: "x", grade: "recalled" },
    ]);
    const broke = settleReview(askReview(reveal(startSession(deck.cards), "x")), deck, of("a", "x"), failed);
    expect(gradeCurrent(broke, deck, "missed", T0).deck.cards[0].attempts[0].claude).toBeUndefined();
  });

  it("is read afresh when the answer is reworded, and not when it is left as it was", () => {
    const settled = settleReview(askReview(reveal(startSession(deck.cards), "x")), deck, of("a", "x"), done);
    expect(reviseAnswer(settled, "x")).toBe(settled);
    const revised = reviseAnswer(settled, "x, because y");
    expect(revised).toMatchObject({ answer: "x, because y", review: null });
    expect(wantsReview(revised)).toBe(true);
    expect(wantsReview(reviseAnswer(settled, ""))).toBe(false);
    expect(reviseAnswer(startSession(deck.cards), "too soon").answer).toBe("");
  });

  it("is read afresh when the question is reworded, dropping a reply to the old wording", () => {
    const asked = askReview(reveal(startSession(deck.cards), "x"));
    const settled = settleReview(asked, deck, of("a", "x"), done);
    expect(dropReview(settled).review).toBeNull();
    expect(dropReview(startSession(deck.cards))).toEqual(startSession(deck.cards));

    const reworded = editCard(deck, "a", "Where exactly?", T0 + 1);
    expect(settleReview(asked, reworded, of("a", "x"), done)).toBe(asked);
    expect(settleReview(asked, reworded, { id: "a", question: "Where exactly?", answer: "x" }, done).review).toEqual(done);
  });

  it("goes with the card being checked when that card is deleted", () => {
    const settled = settleReview(askReview(reveal(startSession(deck.cards), "x")), deck, of("a", "x"), done);
    expect(prune(settled, removeCard(deck, "a", T0)).review).toBeNull();
    expect(prune(settled, removeCard(deck, "b", T0)).review).toEqual(done);
  });
});

describe("a sitting kept across a reload", () => {
  it("keeps Claude's reading, but asks again for one still under way", () => {
    const checked = reveal(startSession(deck.cards), "x");
    const done: Review = { kind: "done", verdict: { grade: "recalled", feedback: "Right." } };
    const keep = (review: Review) => loadSitting(JSON.parse(JSON.stringify({ session: { ...checked, review }, draft: "" })));
    expect(keep(done)?.session.review).toEqual(done);
    expect(keep({ kind: "failed", error: "Offline." })?.session.review).toEqual({ kind: "failed", error: "Offline." });
    expect(keep({ kind: "checking" })?.session.review).toBeNull();
    expect(keep({ kind: "done", verdict: { grade: "great", feedback: "?" } } as never)?.session.review).toBeNull();
  });

  it("reads back as it was kept", () => {
    const { session } = gradeCurrent(reveal(startSession(deck.cards), "x"), deck, "missed", T0);
    const kept = { session: reveal(session, "half"), draft: "half", editor: { kind: "new" as const, text: "Why?" } };
    expect(loadSitting(JSON.parse(JSON.stringify(kept)))).toEqual(kept);
  });

  it("keeps what was being written only while checking, and reads a sitting kept before there was any", () => {
    const editor = { kind: "answer", text: "half" };
    const asking = { session: startSession(deck.cards), draft: "", editor };
    expect(loadSitting(JSON.parse(JSON.stringify(asking)))?.editor).toBeNull();
    const checking = { session: reveal(startSession(deck.cards), "x"), draft: "" };
    expect(loadSitting(JSON.parse(JSON.stringify(checking)))?.editor).toBeNull();
    expect(loadSitting({ ...checking, editor: { kind: "poem", text: "" } })?.editor).toBeNull();
    expect(loadSitting({ ...checking, editor })?.editor).toEqual(editor);
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
