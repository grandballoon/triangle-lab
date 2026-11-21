import { describe, expect, it } from "vitest";
import { answerDocument, sameOutline } from "./answers.ts";
import {
  addCard,
  answerCard,
  changedSince,
  EMPTY_DECK,
  loadDeck,
  MAX_RESPONSE,
  mergeDecks,
  newCard,
  removeCard,
  responseText,
  saveDeck,
  setResponse,
  type Deck,
} from "./deck.ts";
import { sendWhen } from "./sync.ts";

const T0 = 1_000_000;

const place = (lesson: string, step: number) => ({ lesson, step, stepTitle: "" });

const withCards = (...cards: [string, string, string, number][]): Deck =>
  cards.reduce((deck, [id, question, lesson, step]) => addCard(deck, newCard(id, question, place(lesson, step), T0)!), EMPTY_DECK);

const one = withCards(["a", "What is a median?", "medians", 0]);
const cardA = (deck: Deck) => deck.cards.find((c) => c.id === "a")!;

describe("the standing answer", () => {
  it("starts as the last answer written at a review, passing over one given in the head", () => {
    const answered = answerCard(answerCard(one, "a", "Vertex to midpoint", "shaky", T0 + 1), "a", "", "recalled", T0 + 2);
    expect(responseText(answered, cardA(answered))).toBe("Vertex to midpoint");
  });

  it("stays as edited when a later review gives another answer", () => {
    const edited = setResponse(one, "a", "My worked answer", T0 + 1);
    const reviewed = answerCard(edited, "a", "Quick answer", "recalled", T0 + 2);
    expect(responseText(reviewed, cardA(reviewed))).toBe("My worked answer");
  });

  it("can be cleared, without the last review's answer coming back", () => {
    const answered = answerCard(one, "a", "Vertex to midpoint", "shaky", T0 + 1);
    const cleared = setResponse(answered, "a", "", T0 + 2);
    expect(responseText(cleared, cardA(cleared))).toBe("");
  });

  it("leaves the card and its attempts as they were", () => {
    const answered = answerCard(one, "a", "Vertex to midpoint", "shaky", T0 + 1);
    expect(setResponse(answered, "a", "Edited", T0 + 2).cards).toEqual(answered.cards);
  });

  it("changes nothing for an unknown card or the same text", () => {
    expect(setResponse(one, "nope", "Text", T0)).toBe(one);
    expect(setResponse(one, "a", "", T0)).toBe(one);
  });

  it("is capped", () => {
    const long = setResponse(one, "a", "x".repeat(MAX_RESPONSE + 5), T0);
    expect(responseText(long, cardA(long)).length).toBe(MAX_RESPONSE);
  });

  it("moves forward in time even on a clock running behind", () => {
    const first = setResponse(one, "a", "First", T0 + 10);
    expect(setResponse(first, "a", "Second", T0).responses).toEqual([{ card: "a", text: "Second", updated: T0 + 11 }]);
  });

  it("survives being saved and read back", () => {
    const edited = setResponse(one, "a", "Kept", T0);
    expect(loadDeck(JSON.parse(JSON.stringify(saveDeck(edited))))?.responses).toEqual(edited.responses);
  });

  it("drops a stored entry that makes no sense", () => {
    const saved = { ...saveDeck(one), responses: [{ card: "a", text: 3, updated: T0 }, null] };
    expect(loadDeck(saved)?.responses).toBeUndefined();
  });
});

describe("merging standing answers", () => {
  it("keeps the later edit, whichever deck it is in", () => {
    const older = setResponse(one, "a", "Older", T0 + 1);
    const newer = setResponse(one, "a", "Newer", T0 + 2);
    expect(mergeDecks(older, newer).responses).toEqual(newer.responses);
    expect(mergeDecks(newer, older).responses).toEqual(newer.responses);
  });

  it("keeps both an edit on one device and a grade on another", () => {
    const edited = setResponse(one, "a", "Edited", T0 + 5);
    const graded = answerCard(one, "a", "Given", "recalled", T0 + 1);
    const merged = mergeDecks(edited, graded);
    expect(cardA(merged).attempts.map((a) => a.answer)).toEqual(["Given"]);
    expect(responseText(merged, cardA(merged))).toBe("Edited");
  });

  it("drops the answer of a removed question, even from a copy made before", () => {
    const edited = setResponse(one, "a", "Edited", T0 + 1);
    const gone = removeCard(edited, "a", T0 + 2);
    expect(gone.responses).toBeUndefined();
    expect(mergeDecks(edited, gone).responses).toBeUndefined();
    expect(mergeDecks(gone, edited).responses).toBeUndefined();
  });

  it("reports only the answers that changed", () => {
    const before = setResponse(withCards(["a", "A", "medians", 0], ["b", "B", "medians", 1]), "a", "Same", T0);
    const after = setResponse(before, "b", "New", T0 + 1);
    expect(changedSince(before, after).responses).toEqual([{ card: "b", text: "New", updated: T0 + 1 }]);
  });

  it("waits to send a change that is only to an answer, as it changes with every key", () => {
    expect(sendWhen(setResponse(one, "a", "Typing", T0 + 1), one)).toBe("later");
  });
});

describe("the answers document", () => {
  it("has a part per lesson and a section per question, in the order of the steps", () => {
    const deck = setResponse(
      withCards(["late", "Second step", "medians", 2], ["early", "First step", "medians", 0], ["alt", "Altitude?", "altitudes", 0]),
      "early",
      "Written",
      T0,
    );
    const doc = answerDocument(deck);
    expect(doc.map((part) => part.lesson).sort()).toEqual(["altitudes", "medians"]);
    expect(doc.find((part) => part.lesson === "medians")!.sections).toEqual([
      { id: "early", question: "First step", text: "Written" },
      { id: "late", question: "Second step", text: "" },
    ]);
  });

  it("has the same outline when only an answer differs, and not when a question does", () => {
    const doc = answerDocument(one);
    expect(sameOutline(doc, answerDocument(setResponse(one, "a", "Text", T0)))).toBe(true);
    expect(sameOutline(doc, answerDocument(withCards(["a", "Reworded", "medians", 0])))).toBe(false);
  });
});
