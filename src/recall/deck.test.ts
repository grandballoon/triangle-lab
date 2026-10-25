// The recall deck's rules: making, rewording and removing cards, the Leitner
// schedule, and reading a stored or imported deck back.

import { describe, expect, it } from "vitest";
import {
  addCard,
  answerCard,
  DAY_MS,
  dueAfter,
  dueCards,
  editCard,
  EMPTY_DECK,
  lessonCards,
  loadDeck,
  MAX_QUESTION,
  mergeDecks,
  newCard,
  nextBox,
  nextDue,
  removeCard,
  saveDeck,
  type Card,
  type Deck,
} from "./deck.ts";

const HOUR = 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const here = { lesson: "medians", step: 1, stepTitle: "Find the centroid" };

function card(id: string, patch: Partial<Card> = {}): Card {
  return { ...newCard(id, `Question ${id}?`, here, T0)!, ...patch };
}

const deckOf = (...cards: Card[]): Deck => ({ cards });

describe("newCard", () => {
  it("keeps the question, trimmed, with where it was asked, due at once", () => {
    expect(newCard("a", "  Why do medians meet?\n", here, T0)).toEqual({
      id: "a",
      question: "Why do medians meet?",
      lesson: "medians",
      step: 1,
      stepTitle: "Find the centroid",
      created: T0,
      updated: T0,
      box: 0,
      due: T0,
      attempts: [],
    });
  });

  it("makes no card of a blank question", () => {
    expect(newCard("a", " \n\t", here, T0)).toBeNull();
  });

  it("caps a very long question", () => {
    expect(newCard("a", "x".repeat(MAX_QUESTION + 50), here, T0)!.question).toHaveLength(MAX_QUESTION);
  });
});

describe("editing the deck", () => {
  it("adds a card, replacing one with the same id", () => {
    const a = card("a");
    const a2 = card("a", { question: "Reworded?" });
    expect(addCard(addCard(EMPTY_DECK, a), card("b")).cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(addCard(deckOf(a), a2)).toEqual(deckOf(a2));
  });

  it("rewords a card and marks it changed", () => {
    expect(editCard(deckOf(card("a")), "a", " New wording ", T0 + 5).cards[0]).toMatchObject({
      question: "New wording",
      updated: T0 + 5,
    });
  });

  it("ignores a blank or unchanged rewording", () => {
    const deck = deckOf(card("a"));
    expect(editCard(deck, "a", "   ", T0 + 5)).toBe(deck);
    expect(editCard(deck, "a", "Question a?", T0 + 5).cards[0].updated).toBe(T0);
  });

  it("removes a card", () => {
    expect(removeCard(deckOf(card("a"), card("b")), "a")).toEqual(deckOf(card("b")));
  });
});

describe("the schedule", () => {
  it("moves a recalled card up a box, to the top and no further", () => {
    expect([0, 1, 4, 5].map((b) => nextBox(b, "recalled"))).toEqual([1, 2, 5, 5]);
  });

  it("moves a shaky card down a box, but not back to the start", () => {
    expect([0, 1, 3, 5].map((b) => nextBox(b, "shaky"))).toEqual([1, 1, 2, 4]);
  });

  it("sends a missed card back to the start", () => {
    expect([0, 3, 5].map((b) => nextBox(b, "missed"))).toEqual([0, 0, 0]);
  });

  it("asks box 0 again at once, and later boxes some days on, a few hours early", () => {
    expect(dueAfter(0, T0)).toBe(T0);
    expect(dueAfter(1, T0)).toBe(T0 + DAY_MS - 6 * HOUR);
    expect(dueAfter(2, T0)).toBe(T0 + 3 * DAY_MS - 6 * HOUR);
  });

  it("records an answer and schedules the next asking", () => {
    const after = answerCard(deckOf(card("a")), "a", "  Two thirds of the way  ", "recalled", T0 + HOUR);
    expect(after.cards[0]).toMatchObject({
      box: 1,
      due: dueAfter(1, T0 + HOUR),
      updated: T0 + HOUR,
      attempts: [{ at: T0 + HOUR, answer: "Two thirds of the way", grade: "recalled" }],
    });
  });

  it("lists the cards due, longest waiting first", () => {
    const deck = deckOf(
      card("later", { due: T0 + DAY_MS }),
      card("b", { due: T0 - HOUR, created: T0 - 2 }),
      card("a", { due: T0 - 2 * HOUR }),
      card("c", { due: T0 - HOUR, created: T0 - 1 }),
    );
    expect(dueCards(deck, T0).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("knows when the next card not yet due falls due", () => {
    const deck = deckOf(card("a"), card("b", { due: T0 + 3 * DAY_MS }), card("c", { due: T0 + DAY_MS }));
    expect(nextDue(deck, T0)).toBe(T0 + DAY_MS);
    expect(nextDue(deckOf(card("a")), T0)).toBeNull();
  });
});

describe("lessonCards", () => {
  it("lists one lesson's cards in step order, then as asked", () => {
    const deck = deckOf(
      card("late", { step: 2 }),
      card("other", { lesson: "altitudes" }),
      card("second", { step: 0, created: T0 + 1 }),
      card("first", { step: 0 }),
    );
    expect(lessonCards(deck, "medians").map((c) => c.id)).toEqual(["first", "second", "late"]);
  });
});

describe("mergeDecks", () => {
  it("keeps every card from both, and the copy changed last of any in both", () => {
    const old = card("a");
    const newer = card("a", { question: "Newer?", updated: T0 + 9 });
    const merged = mergeDecks(deckOf(old, card("b", { created: T0 + 1 })), deckOf(newer, card("c", { created: T0 + 2 })));
    expect(merged.cards.map((c) => [c.id, c.question])).toEqual([
      ["a", "Newer?"],
      ["b", "Question b?"],
      ["c", "Question c?"],
    ]);
    expect(mergeDecks(deckOf(newer), deckOf(old)).cards[0]).toBe(newer);
  });
});

describe("the stored form", () => {
  it("reads back what it saves", () => {
    const deck = answerCard(deckOf(card("a"), card("b")), "a", "yes", "shaky", T0 + 1);
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(deck))))).toEqual(deck);
  });

  it("is not fooled by something that is not a saved deck", () => {
    for (const raw of [null, 3, "deck", [], {}, { cards: [] }, { kind: "other", cards: [] }]) {
      expect(loadDeck(raw)).toBeNull();
    }
  });

  it("drops cards that make no sense and repairs what it can", () => {
    const good = card("good", { attempts: [{ at: T0, answer: "x", grade: "missed" }] });
    const loaded = loadDeck({
      kind: "triangle-lab/recall",
      version: 1,
      cards: [
        good,
        { ...good, id: "" },
        { ...good, id: "blank", question: "  " },
        { ...good, id: "no-time", created: "yesterday" },
        { ...good, id: "odd", step: -2, box: 99, due: null, updated: undefined, stepTitle: 4 },
        { ...good, id: "bad-attempts", attempts: [{ at: T0, grade: "great" }, { at: T0, grade: "shaky" }] },
        good,
      ],
    });
    expect(loaded!.cards.map((c) => c.id)).toEqual(["good", "odd", "bad-attempts"]);
    expect(loaded!.cards[1]).toMatchObject({ step: 0, box: 5, due: T0, updated: T0, stepTitle: "" });
    expect(loaded!.cards[2].attempts).toEqual([{ at: T0, answer: "", grade: "shaky" }]);
  });
});
