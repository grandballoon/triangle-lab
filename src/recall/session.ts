// One sitting of active recall, as a pure state machine over the deck.
//
// Each card is first asked: the learner answers from memory, in writing or in
// their head. Then they check, against their earlier answers and the lesson
// step the question came from, and grade themselves; the grade is recorded on
// the card (deck.ts) and decides when it is asked again. A card missed for the
// first time this sitting goes to the back of the queue for one more try.
//
// A written answer can also be read by Claude while the learner checks it
// (check.ts): the review rides along with the card being checked, and is
// dropped as soon as that card is graded or gone.

import { loadReview, type Review } from "./check.ts";
import { answerCard, GRADES, type Card, type Deck, type Grade } from "./deck.ts";

export interface Session {
  /** Ids of the cards still to ask; the first is being asked now. */
  queue: string[];
  /** Cards already put back once after a miss. */
  retried: string[];
  /** Asking for an answer, or checking the one given. */
  phase: "ask" | "check";
  /** What the learner wrote for the current card, once they check it. */
  answer: string;
  /** Answers graded so far this sitting, by grade. */
  tally: Record<Grade, number>;
  /** Claude's reading of the answer being checked, once asked for. */
  review: Review | null;
}

export function startSession(cards: readonly Card[]): Session {
  return {
    queue: cards.map((c) => c.id),
    retried: [],
    phase: "ask",
    answer: "",
    tally: { missed: 0, shaky: 0, recalled: 0 },
    review: null,
  };
}

/** The card being asked, or null once the sitting is over. */
export function currentCard(session: Session, deck: Deck): Card | null {
  const id = session.queue[0];
  return id === undefined ? null : (deck.cards.find((c) => c.id === id) ?? null);
}

/** How many answers this sitting has graded, and how many it will in all. */
export function progress(session: Session): { done: number; total: number } {
  const done = session.tally.missed + session.tally.shaky + session.tally.recalled;
  return { done, total: done + session.queue.length };
}

/** Stop answering and check: the answer is kept as written. */
export function reveal(session: Session, answer: string): Session {
  return session.phase === "ask" ? { ...session, phase: "check", answer } : session;
}

/**
 * Whether the answer being checked is waiting to be read by Claude: it is
 * written, and Claude has not been asked yet. A check that failed is asked
 * again only when the learner says so (`askReview`).
 */
export function wantsReview(session: Session): boolean {
  return session.phase === "check" && session.answer.trim() !== "" && session.review === null;
}

/** Ask for the answer being checked to be read, afresh if an earlier ask failed. */
export function askReview(session: Session): Session {
  const asked = session.review !== null && session.review.kind !== "failed";
  if (session.phase !== "check" || !session.answer.trim() || asked) return session;
  return { ...session, review: { kind: "checking" } };
}

/**
 * Take in Claude's reading of `id`'s answer `answer`. It is dropped if the
 * sitting has moved on since it was asked for.
 */
export function settleReview(session: Session, id: string, answer: string, review: Review): Session {
  const current = session.queue[0] === id && session.phase === "check" && session.answer === answer;
  return current && session.review?.kind === "checking" ? { ...session, review } : session;
}

/**
 * Grade the card being checked: record the answer on it and move on. A first
 * miss puts the card back at the end of the queue.
 */
export function gradeCurrent(
  session: Session,
  deck: Deck,
  grade: Grade,
  now: number,
): { session: Session; deck: Deck } {
  const [id, ...rest] = session.queue;
  if (id === undefined || session.phase !== "check") return { session, deck };
  const retry = grade === "missed" && !session.retried.includes(id);
  return {
    deck: answerCard(deck, id, session.answer, grade, now),
    session: {
      queue: retry ? [...rest, id] : rest,
      retried: retry ? [...session.retried, id] : session.retried,
      phase: "ask",
      answer: "",
      tally: { ...session.tally, [grade]: session.tally[grade] + 1 },
      review: null,
    },
  };
}

/** Drop cards no longer in the deck, as when one is deleted in another tab. */
export function prune(session: Session, deck: Deck): Session {
  const ids = new Set(deck.cards.map((c) => c.id));
  const queue = session.queue.filter((id) => ids.has(id));
  if (queue.length === session.queue.length) return session;
  // The card being checked is gone, so its answer and review are too.
  if (queue[0] === session.queue[0]) return { ...session, queue };
  return { ...session, queue, phase: "ask", answer: "", review: null };
}

// --- Kept across a reload ---------------------------------------------------

/**
 * A sitting as kept for the tab, with what was being written. A phone often
 * reloads a tab left in the background (as when the learner checks an answer
 * in the lesson, in another tab), and the sitting carries on from here.
 */
export interface Sitting {
  session: Session;
  draft: string;
}

/** Read a kept sitting back, or null if `raw` is not one. */
export function loadSitting(raw: unknown): Sitting | null {
  if (!isObject(raw) || typeof raw.draft !== "string" || !isObject(raw.session)) return null;
  const { queue, retried, phase, answer, tally, review } = raw.session;
  if (!isIds(queue) || !isIds(retried) || (phase !== "ask" && phase !== "check") || typeof answer !== "string") {
    return null;
  }
  if (!isObject(tally) || !GRADES.every((g) => Number.isInteger(tally[g]) && (tally[g] as number) >= 0)) return null;
  const counts = tally as Record<Grade, number>;
  return {
    session: {
      queue,
      retried,
      phase,
      answer,
      tally: { missed: counts.missed, shaky: counts.shaky, recalled: counts.recalled },
      // Kept only while checking: a review is of the answer being checked.
      review: phase === "check" ? loadReview(review) : null,
    },
    draft: raw.draft,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((id) => typeof id === "string");
