// The recall deck's rules: making, rewording and removing cards, the Leitner
// schedule, the free association kept with the cards, and reading a stored
// or imported deck back.

import { describe, expect, it } from "vitest";
import {
  addCard,
  answerCard,
  changedSince,
  DAY_MS,
  dueAfter,
  dueCards,
  editCard,
  EMPTY_DECK,
  lessonCards,
  loadDeck,
  markRevisit,
  MAX_QUESTION,
  mergeDecks,
  newCard,
  nextBox,
  nextDue,
  setWriting,
  removeCard,
  revisitCards,
  sameDeck,
  saveDeck,
  type Card,
  type Writing,
  type Deck,
} from "./deck.ts";

const HOUR = 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const here = { lesson: "medians", step: 1, stepTitle: "Find the centroid" };

function card(id: string, patch: Partial<Card> = {}): Card {
  return { ...newCard(id, `Question ${id}?`, here, T0)!, ...patch };
}

const deckOf = (...cards: Card[]): Deck => ({ cards, removed: [] });

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

  it("removes a card, noting when", () => {
    expect(removeCard(deckOf(card("a"), card("b")), "a", T0 + 5)).toEqual({
      cards: [card("b")],
      removed: [{ id: "a", at: T0 + 5 }],
    });
    const deck = deckOf(card("a"));
    expect(removeCard(deck, "gone", T0 + 5)).toBe(deck);
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

  it("keeps Claude's verdict with an answer graded missed or shaky, and not with one recalled", () => {
    const claude = { grade: "shaky" as const, feedback: "Say where on each median: two thirds of the way." };
    const answered = (grade: "missed" | "shaky" | "recalled") =>
      answerCard(deckOf(card("a")), "a", "In the middle", grade, T0, claude).cards[0].attempts;
    expect(answered("missed")).toEqual([{ at: T0, answer: "In the middle", grade: "missed", claude }]);
    expect(answered("shaky")).toEqual([{ at: T0, answer: "In the middle", grade: "shaky", claude }]);
    expect(answered("recalled")).toEqual([{ at: T0, answer: "In the middle", grade: "recalled" }]);
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

describe("marking cards to revisit", () => {
  it("marks a card, keeping its first mark, and takes the mark off", () => {
    const marked = markRevisit(deckOf(card("a")), "a", true, T0 + HOUR);
    expect(marked.cards[0]).toMatchObject({ revisit: T0 + HOUR, updated: T0 + HOUR });
    expect(markRevisit(marked, "a", true, T0 + 2 * HOUR)).toBe(marked);
    const cleared = markRevisit(marked, "a", false, T0 + 3 * HOUR);
    expect(cleared.cards[0]).toEqual({ ...card("a"), updated: T0 + 3 * HOUR });
    expect("revisit" in cleared.cards[0]).toBe(false);
  });

  it("leaves the schedule alone, and is kept through an answer", () => {
    const marked = markRevisit(deckOf(card("a")), "a", true, T0);
    const answered = answerCard(marked, "a", "", "recalled", T0 + HOUR);
    expect(answered.cards[0]).toMatchObject({ box: 1, revisit: T0 });
  });

  it("lists the marked cards, longest marked first", () => {
    let deck = deckOf(card("a"), card("b"), card("c"));
    deck = markRevisit(deck, "c", true, T0 + HOUR);
    deck = markRevisit(deck, "a", true, T0 + 2 * HOUR);
    expect(revisitCards(deck).map((c) => c.id)).toEqual(["c", "a"]);
  });

  it("syncs as any change to a card does: the later copy wins", () => {
    const ours = markRevisit(deckOf(card("a")), "a", true, T0 + HOUR);
    const theirs = markRevisit(ours, "a", false, T0 + 2 * HOUR);
    expect(mergeDecks(ours, theirs).cards[0].revisit).toBeUndefined();
    expect(mergeDecks(theirs, ours).cards[0].revisit).toBeUndefined();
  });

  it("is read back from the stored form, and a mark that is not a time is dropped", () => {
    const marked = markRevisit(deckOf(card("a")), "a", true, T0);
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(marked))))!.cards[0].revisit).toBe(T0);
    const odd = { ...saveDeck(deckOf(card("a"))), cards: [{ ...card("a"), revisit: "soon" }] };
    expect("revisit" in loadDeck(odd)!.cards[0]).toBe(false);
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

  it("does not bring back a card removed after the other copy was made", () => {
    const before = deckOf(card("a"), card("b"));
    const after = removeCard(before, "a", T0 + 5);
    expect(mergeDecks(before, after)).toEqual(after);
    expect(mergeDecks(after, before)).toEqual(after);
  });

  it("keeps a card changed after its removal elsewhere", () => {
    const removed = removeCard(deckOf(card("a")), "a", T0 + 5);
    const answered = answerCard(deckOf(card("a")), "a", "yes", "recalled", T0 + 9);
    expect(mergeDecks(removed, answered)).toEqual(answered);
    expect(mergeDecks(answered, removed)).toEqual(answered);
  });

  it("ends the same whichever order decks meet in, and merging again changes nothing", () => {
    const base = deckOf(card("a"), card("b", { created: T0 + 1 }), card("c", { created: T0 + 2 }));
    const phone = removeCard(editCard(base, "a", "Phone?", T0 + 3), "c", T0 + 4);
    const laptop = editCard(answerCard(base, "b", "", "shaky", T0 + 3), "c", "Laptop?", T0 + 3);
    const tie = editCard(base, "a", "Tied?", T0 + 3);
    const decks = [base, phone, laptop, tie];
    const everyOrder = [decks, [...decks].reverse(), [tie, base, laptop, phone]].map((ds) => ds.reduce(mergeDecks));
    expect(everyOrder[1]).toEqual(everyOrder[0]);
    expect(everyOrder[2]).toEqual(everyOrder[0]);
    expect(mergeDecks(everyOrder[0], phone)).toEqual(everyOrder[0]);
    expect(everyOrder[0].removed).toEqual([{ id: "c", at: T0 + 4 }]);
  });
});

describe("changedSince", () => {
  it("is the questions added, changed or removed since", () => {
    const before = deckOf(card("a"), card("b"), card("c"));
    const after = removeCard(editCard(addCard(before, card("d")), "a", "New?", T0 + 1), "c", T0 + 2);
    expect(changedSince(before, after)).toEqual({
      cards: [after.cards.find((c) => c.id === "a"), card("d")],
      removed: [{ id: "c", at: T0 + 2 }],
    });
    expect(changedSince(after, after)).toEqual({ cards: [], removed: [] });
  });
});

describe("sameDeck", () => {
  it("compares the questions and their changes, not the order they are held in", () => {
    const a = card("a");
    const b = card("b", { created: T0 + 1 });
    expect(sameDeck(deckOf(a, b), deckOf(b, a))).toBe(true);
    expect(sameDeck(deckOf(a), deckOf(a, b))).toBe(false);
    expect(sameDeck(deckOf(a), editCard(deckOf(a), "a", "New?", T0 + 1))).toBe(false);
    expect(sameDeck(deckOf(a), removeCard(deckOf(a), "a", T0 + 1))).toBe(false);
  });
});

describe("the stored form", () => {
  it("reads back what it saves", () => {
    const deck = answerCard(deckOf(card("a"), card("b")), "a", "yes", "shaky", T0 + 1);
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(deck))))).toEqual(deck);
  });

  it("reads back removals, and a deck saved before there were any", () => {
    const deck = removeCard(deckOf(card("a"), card("b")), "a", T0 + 1);
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(deck))))).toEqual(deck);
    const { removed: _, ...older } = saveDeck(deckOf(card("b")));
    expect(loadDeck(older)).toEqual(deckOf(card("b")));
    expect(loadDeck({ ...older, removed: [{ id: "x", at: "soon" }, { id: "", at: T0 }, 4] })).toEqual(deckOf(card("b")));
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
        {
          ...good,
          id: "bad-attempts",
          attempts: [
            { at: T0, grade: "great" },
            { at: T0, grade: "shaky", claude: { grade: "great", feedback: "?" } },
            { at: T0 + 1, answer: "y", grade: "missed", claude: { grade: "missed", feedback: " No. " } },
          ],
        },
        good,
      ],
    });
    const byId = (id: string) => loaded!.cards.find((c) => c.id === id)!;
    expect(loaded!.cards.map((c) => c.id).sort()).toEqual(["bad-attempts", "good", "odd"]);
    expect(byId("odd")).toMatchObject({ step: 0, box: 5, due: T0, updated: T0, stepTitle: "" });
    expect(byId("bad-attempts").attempts).toEqual([
      { at: T0, answer: "", grade: "shaky" },
      { at: T0 + 1, answer: "y", grade: "missed", claude: { grade: "missed", feedback: "No." } },
    ]);
  });
});

describe("the free association in the deck", () => {
  const reading = { feedback: "Good.", remarks: [], next: [] };
  const written = (text: string, updated: number): Writing => ({ text, read: null, updated });

  it("is kept, and left as it is for none or the same", () => {
    const w = written("Hi", T0);
    const deck = setWriting(deckOf(card("a")), w);
    expect(deck.writing).toBe(w);
    expect(setWriting(deck, undefined)).toBe(deck);
    expect(setWriting(deck, w)).toBe(deck);
    expect(removeCard(deck, "a", T0 + 1).writing).toBe(w);
  });

  it("merges as the copy changed last, a deck without one undoing nothing, in any order", () => {
    const base = deckOf(card("a"));
    const older = setWriting(base, written("Older", T0 + 1));
    const newer = setWriting(base, written("", T0 + 2));
    const tie = setWriting(base, written("Tied", T0 + 2));
    expect(mergeDecks(older, newer).writing).toEqual(written("", T0 + 2));
    expect(mergeDecks(newer, older).writing).toEqual(written("", T0 + 2));
    expect(mergeDecks(base, older).writing).toEqual(written("Older", T0 + 1));
    expect(mergeDecks(older, base).writing).toEqual(written("Older", T0 + 1));
    expect(mergeDecks(newer, tie)).toEqual(mergeDecks(tie, newer));
    expect(mergeDecks(base, base).writing).toBeUndefined();
  });

  it("counts as a change to compare and to send", () => {
    const deck = deckOf(card("a"));
    const w = written("Hi", T0);
    expect(sameDeck(deck, setWriting(deck, w))).toBe(false);
    expect(sameDeck(setWriting(deck, w), setWriting(deck, { ...w }))).toBe(true);
    expect(changedSince(deck, setWriting(deck, w))).toEqual({ cards: [], removed: [], writing: w });
    expect(changedSince(setWriting(deck, w), setWriting(deck, w))).toEqual({ cards: [], removed: [] });
  });

  it("is saved and read back with its last reading, and a deck saved without one reads as having none", () => {
    const deck = setWriting(deckOf(card("a")), { text: "Hi", read: { text: "Hi", reading }, updated: T0 });
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(deck))))).toEqual(deck);
    expect("writing" in saveDeck(deckOf(card("a")))).toBe(false);
    expect(loadDeck(saveDeck(deckOf(card("a"))))?.writing).toBeUndefined();
  });

  it("drops a reading that is not one, and a free association that is not one", () => {
    const saved = { ...saveDeck(deckOf(card("a"))), writing: { text: "Hi", read: { text: "Hi", reading: {} }, updated: T0 } };
    expect(loadDeck(saved)?.writing).toEqual({ text: "Hi", read: null, updated: T0 });
    expect(loadDeck({ ...saved, writing: { text: "Hi" } })?.writing).toBeUndefined();
  });
});
