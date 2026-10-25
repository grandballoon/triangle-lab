// The recall deck: questions a learner leaves themselves while working
// through a lesson, to answer from memory later, and when each is next due.
//
// Pure: the time and new ids come in as arguments, so every rule here is
// tested by equality on values. store.ts persists a deck and shares it
// between tabs, capture.ts adds to it from a lesson page, and the recall page
// (page.ts) reviews it.
//
// Scheduling is a Leitner system. Each card sits in a box; recalling it moves
// it up a box and further out, a shaky answer moves it down one, and a miss
// sends it back to the start, due again at once.

/** How an answer went, as the learner judged it after checking. */
export type Grade = "missed" | "shaky" | "recalled";

export const GRADES: readonly Grade[] = ["missed", "shaky", "recalled"];

/** One go at answering a card. */
export interface Attempt {
  at: number;
  /** What the learner wrote from memory; may be empty if they only thought it. */
  answer: string;
  grade: Grade;
}

/** Where a question was asked: a lesson and the step it had current. */
export interface Place {
  /** The lesson's slug (lessons.ts). */
  lesson: string;
  /** The step, counted from 0. */
  step: number;
  /** The step's title at the time, kept in case the lesson's steps change. */
  stepTitle: string;
}

export interface Card extends Place {
  id: string;
  question: string;
  created: number;
  /** Last edit or answer, so the newer of two copies wins a merge. */
  updated: number;
  /** Leitner box: 0 until first recalled, rising with each success. */
  box: number;
  /** When the card is next asked. Due once this is not after now. */
  due: number;
  attempts: Attempt[];
}

export interface Deck {
  cards: Card[];
}

export const EMPTY_DECK: Deck = { cards: [] };

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days from an answer until a card in each box is asked again. Box 0 is due
 * at once: a new card, or one just missed.
 */
export const INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 16, 35];

const TOP_BOX = INTERVAL_DAYS.length - 1;

/**
 * A card answered in the evening should be ready the next morning, not only
 * at the same hour a day later, so each interval falls due this much early.
 */
const EARLY_MS = 6 * 60 * 60 * 1000;

/** Longest question kept, so a stray paste cannot bloat storage. */
export const MAX_QUESTION = 2000;
const MAX_ANSWER = 4000;

/** A question as it will be stored: trimmed and capped. Empty means none. */
export function cleanQuestion(text: string): string {
  return text.trim().slice(0, MAX_QUESTION);
}

/** A new card for `question`, due at once, or null for a blank question. */
export function newCard(id: string, question: string, place: Place, now: number): Card | null {
  const text = cleanQuestion(question);
  if (!text) return null;
  return {
    id,
    question: text,
    lesson: place.lesson,
    step: place.step,
    stepTitle: place.stepTitle,
    created: now,
    updated: now,
    box: 0,
    due: now,
    attempts: [],
  };
}

export function addCard(deck: Deck, card: Card): Deck {
  return { cards: [...deck.cards.filter((c) => c.id !== card.id), card] };
}

/** Reword a card's question. A blank rewording leaves it as it was. */
export function editCard(deck: Deck, id: string, question: string, now: number): Deck {
  const text = cleanQuestion(question);
  if (!text) return deck;
  return mapCard(deck, id, (c) => (c.question === text ? c : { ...c, question: text, updated: now }));
}

export function removeCard(deck: Deck, id: string): Deck {
  return { cards: deck.cards.filter((c) => c.id !== id) };
}

/** The box a card moves to after an answer graded `grade`. */
export function nextBox(box: number, grade: Grade): number {
  if (grade === "recalled") return Math.min(box + 1, TOP_BOX);
  if (grade === "shaky") return Math.max(1, box - 1);
  return 0;
}

/** When a card in `box`, answered at `now`, is next due. */
export function dueAfter(box: number, now: number): number {
  const days = INTERVAL_DAYS[box] ?? 0;
  return days === 0 ? now : now + days * DAY_MS - EARLY_MS;
}

/** Record an answer to a card and schedule its next asking. */
export function answerCard(deck: Deck, id: string, answer: string, grade: Grade, now: number): Deck {
  return mapCard(deck, id, (c) => {
    const box = nextBox(c.box, grade);
    const attempt: Attempt = { at: now, answer: answer.trim().slice(0, MAX_ANSWER), grade };
    return { ...c, box, due: dueAfter(box, now), updated: now, attempts: [...c.attempts, attempt] };
  });
}

/** Cards due at `now`, longest waiting first. */
export function dueCards(deck: Deck, now: number): Card[] {
  return deck.cards.filter((c) => c.due <= now).sort(byDue);
}

/** When the next card not yet due falls due, or null when none is waiting. */
export function nextDue(deck: Deck, now: number): number | null {
  const later = deck.cards.filter((c) => c.due > now).map((c) => c.due);
  return later.length > 0 ? Math.min(...later) : null;
}

/** A lesson's cards, in the order its steps run and then as asked. */
export function lessonCards(deck: Deck, lesson: string): Card[] {
  return deck.cards.filter((c) => c.lesson === lesson).sort((a, b) => a.step - b.step || a.created - b.created);
}

/**
 * Two decks as one, as when importing a saved copy: every card from either,
 * and where both hold a card, the copy changed last.
 */
export function mergeDecks(ours: Deck, theirs: Deck): Deck {
  const byId = new Map(ours.cards.map((c) => [c.id, c]));
  for (const card of theirs.cards) {
    const mine = byId.get(card.id);
    if (!mine || card.updated > mine.updated) byId.set(card.id, card);
  }
  return { cards: [...byId.values()].sort((a, b) => a.created - b.created) };
}

// --- Stored form ------------------------------------------------------------

/** What is stored and exported, tagged so an unrelated file is not taken for a deck. */
export interface SavedDeck {
  kind: "triangle-lab/recall";
  version: 1;
  cards: Card[];
}

export function saveDeck(deck: Deck): SavedDeck {
  return { kind: "triangle-lab/recall", version: 1, cards: deck.cards };
}

/**
 * Read a deck back from anything: stored text, an imported file. Cards that
 * do not make sense are dropped and the rest kept. Returns null when `raw` is
 * not a saved deck at all.
 */
export function loadDeck(raw: unknown): Deck | null {
  if (!isObject(raw) || raw.kind !== "triangle-lab/recall" || !Array.isArray(raw.cards)) return null;
  const cards = raw.cards.map(loadCard).filter((c): c is Card => c !== null);
  return { cards: [...new Map(cards.map((c) => [c.id, c])).values()] };
}

function loadCard(raw: unknown): Card | null {
  if (!isObject(raw)) return null;
  const { id, question, lesson, step, stepTitle, created, updated, box, due, attempts } = raw;
  if (typeof id !== "string" || !id || typeof question !== "string" || typeof lesson !== "string") return null;
  const text = cleanQuestion(question);
  if (!text || !isTime(created)) return null;
  return {
    id,
    question: text,
    lesson,
    step: typeof step === "number" && Number.isInteger(step) && step >= 0 ? step : 0,
    stepTitle: typeof stepTitle === "string" ? stepTitle : "",
    created,
    updated: isTime(updated) ? updated : created,
    box: typeof box === "number" && Number.isInteger(box) ? Math.min(TOP_BOX, Math.max(0, box)) : 0,
    due: isTime(due) ? due : created,
    attempts: Array.isArray(attempts) ? attempts.map(loadAttempt).filter((a): a is Attempt => a !== null) : [],
  };
}

function loadAttempt(raw: unknown): Attempt | null {
  if (!isObject(raw) || !isTime(raw.at) || !GRADES.includes(raw.grade as Grade)) return null;
  return { at: raw.at, answer: typeof raw.answer === "string" ? raw.answer : "", grade: raw.grade as Grade };
}

// --- Helpers ----------------------------------------------------------------

function mapCard(deck: Deck, id: string, fn: (c: Card) => Card): Deck {
  return { cards: deck.cards.map((c) => (c.id === id ? fn(c) : c)) };
}

const byDue = (a: Card, b: Card): number => a.due - b.due || a.created - b.created;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
