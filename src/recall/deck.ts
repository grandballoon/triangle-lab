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
  /**
   * What Claude made of the answer (check.ts), kept when the learner graded
   * it missed or shaky, so the next try can work from it.
   */
  claude?: Verdict;
}

/** Claude's reading of an answer: the grade it would give, and why. */
export interface Verdict {
  grade: Grade;
  /** A few sentences to the learner, with `$…$` for mathematics. */
  feedback: string;
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

/**
 * A card taken out of the deck, and when. It is kept so that merging with a
 * copy made before the removal, such as another device's, does not bring
 * the card back.
 */
export interface Removal {
  id: string;
  at: number;
}

export interface Deck {
  cards: Card[];
  removed: Removal[];
}

export const EMPTY_DECK: Deck = { cards: [], removed: [] };

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
export const MAX_ANSWER = 4000;
export const MAX_FEEDBACK = 2000;

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
  return { ...deck, cards: [...deck.cards.filter((c) => c.id !== card.id), card] };
}

/** Reword a card's question. A blank rewording leaves it as it was. */
export function editCard(deck: Deck, id: string, question: string, now: number): Deck {
  const text = cleanQuestion(question);
  if (!text) return deck;
  return mapCard(deck, id, (c) => (c.question === text ? c : { ...c, question: text, updated: now }));
}

export function removeCard(deck: Deck, id: string, now: number): Deck {
  if (!deck.cards.some((c) => c.id === id)) return deck;
  return {
    cards: deck.cards.filter((c) => c.id !== id),
    removed: [...deck.removed.filter((r) => r.id !== id), { id, at: now }],
  };
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

/**
 * Record an answer to a card and schedule its next asking. Claude's verdict
 * on it, if there is one, is kept only with a grade of missed or shaky:
 * there it says what to work on, and a recalled answer needs nothing more.
 */
export function answerCard(
  deck: Deck,
  id: string,
  answer: string,
  grade: Grade,
  now: number,
  claude: Verdict | null = null,
): Deck {
  return mapCard(deck, id, (c) => {
    const box = nextBox(c.box, grade);
    const attempt: Attempt = { at: now, answer: answer.trim().slice(0, MAX_ANSWER), grade };
    if (claude && grade !== "recalled") attempt.claude = claude;
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
 * Two decks as one, as when importing a saved copy or syncing with another
 * device. Each question is taken from whichever deck changed it last: the
 * newer copy of a card, or its removal if that came later still.
 *
 * The order of the two decks never matters, and merging again changes
 * nothing, so devices that swap decks in any order end up holding the same.
 */
export function mergeDecks(ours: Deck, theirs: Deck): Deck {
  const latest = new Map<string, Entry>();
  for (const entry of [...entries(ours), ...entries(theirs)]) {
    const held = latest.get(entry.id);
    if (!held || later(entry, held)) latest.set(entry.id, entry);
  }
  const cards: Card[] = [];
  const removed: Removal[] = [];
  for (const entry of latest.values()) {
    if (entry.card) cards.push(entry.card);
    else removed.push({ id: entry.id, at: entry.at });
  }
  return { cards: cards.sort(byCreated), removed: removed.sort((a, b) => a.at - b.at || compare(a.id, b.id)) };
}

/** Whether `a` and `b` hold the same questions, in the same states. */
export function sameDeck(a: Deck, b: Deck): boolean {
  const keys = (d: Deck): string => entries(d).map(entryKey).sort().join("\n");
  return keys(a) === keys(b);
}

/** The questions whose state in `after` is not their state in `before`. */
export function changedSince(before: Deck, after: Deck): Deck {
  const held = new Set(entries(before).map(entryKey));
  const fresh = (e: Entry): boolean => !held.has(entryKey(e));
  return {
    cards: after.cards.filter((card) => fresh({ id: card.id, at: card.updated, card })),
    removed: after.removed.filter((r) => fresh({ ...r, card: null })),
  };
}

/** One question's state in a deck: a card, or the time it was removed. */
interface Entry {
  id: string;
  at: number;
  card: Card | null;
}

function entries(deck: Deck): Entry[] {
  return [
    ...deck.cards.map((card) => ({ id: card.id, at: card.updated, card })),
    ...deck.removed.map(({ id, at }) => ({ id, at, card: null })),
  ];
}

const entryKey = (e: Entry): string => (e.card ? JSON.stringify(e.card) : `${e.id} removed ${e.at}`);

/**
 * Whether `a` is the later state of a question than `b`. Ties go to a
 * removal, then to the larger copy as text, so the choice is the same
 * whichever deck each came from.
 */
function later(a: Entry, b: Entry): boolean {
  if (a.at !== b.at) return a.at > b.at;
  if (!a.card || !b.card) return !a.card && !!b.card;
  return JSON.stringify(a.card) > JSON.stringify(b.card);
}

// --- Stored form ------------------------------------------------------------

/** What is stored and exported, tagged so an unrelated file is not taken for a deck. */
export interface SavedDeck {
  kind: "triangle-lab/recall";
  version: 1;
  cards: Card[];
  /** Added after the first release; a deck saved before it has none. */
  removed: Removal[];
}

export function saveDeck(deck: Deck): SavedDeck {
  return { kind: "triangle-lab/recall", version: 1, cards: deck.cards, removed: deck.removed };
}

/**
 * Read a deck back from anything: stored text, an imported file. Cards that
 * do not make sense are dropped and the rest kept. Returns null when `raw` is
 * not a saved deck at all.
 */
export function loadDeck(raw: unknown): Deck | null {
  if (!isObject(raw) || raw.kind !== "triangle-lab/recall" || !Array.isArray(raw.cards)) return null;
  const cards = raw.cards.map(loadCard).filter((c): c is Card => c !== null);
  const removed = Array.isArray(raw.removed) ? raw.removed.map(loadRemoval).filter((r) => r !== null) : [];
  // A deck read back is merged with nothing, so it is in the shape a merge
  // makes: one state per question, the last one.
  return mergeDecks(EMPTY_DECK, { cards, removed });
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

function loadRemoval(raw: unknown): Removal | null {
  if (!isObject(raw) || typeof raw.id !== "string" || !raw.id || !isTime(raw.at)) return null;
  return { id: raw.id, at: raw.at };
}

function loadAttempt(raw: unknown): Attempt | null {
  if (!isObject(raw) || !isTime(raw.at) || !GRADES.includes(raw.grade as Grade)) return null;
  const attempt: Attempt = { at: raw.at, answer: typeof raw.answer === "string" ? raw.answer : "", grade: raw.grade as Grade };
  const claude = readVerdict(raw.claude);
  if (claude) attempt.claude = claude;
  return attempt;
}

/** Read a verdict, or null if `raw` is not one. */
export function readVerdict(raw: unknown): Verdict | null {
  if (!isObject(raw) || !GRADES.includes(raw.grade as Grade) || typeof raw.feedback !== "string") return null;
  const feedback = raw.feedback.trim().slice(0, MAX_FEEDBACK);
  return feedback ? { grade: raw.grade as Grade, feedback } : null;
}

// --- Helpers ----------------------------------------------------------------

function mapCard(deck: Deck, id: string, fn: (c: Card) => Card): Deck {
  return { ...deck, cards: deck.cards.map((c) => (c.id === id ? fn(c) : c)) };
}

const byDue = (a: Card, b: Card): number => a.due - b.due || a.created - b.created;

const byCreated = (a: Card, b: Card): number => a.created - b.created || compare(a.id, b.id);

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
