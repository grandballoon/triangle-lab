// One sitting of active recall, as a pure state machine over the deck.
//
// Each card is first asked: the learner answers from memory, in writing or in
// their head. Then they check, against their earlier answers and the lesson
// step the question came from, and correct their answer in place until they
// have it right, then say how it went, which is recorded on the card (deck.ts)
// and decides when it is asked again: right first time (recalled), right once
// corrected (shaky), or still struggling (missed). A card can also be skipped,
// which leaves it out of this sitting and the deck as it was, so it is still
// due as before.
//
// A written answer can also be read by Claude while the learner checks it
// (check.ts), and read again whenever they ask, as they correct it. The
// review rides along with the card being checked, and is of the answer as it
// was sent (`read`); it is dropped as soon as that card is graded or gone, or
// its question is reworded, which has it read afresh.

import { loadReview, type Review } from "./check.ts";
import { answerCard, GRADES, type Card, type Deck, type Grade } from "./deck.ts";

export interface Session {
  /** Ids of the cards still to ask; the first is being asked now. */
  queue: string[];
  /** Asking for an answer, or checking the one given. */
  phase: "ask" | "check";
  /** What the learner has written for the current card, once they check it; they may go on correcting it. */
  answer: string;
  /** Answers graded so far this sitting, by grade. */
  tally: Record<Grade, number>;
  /** Cards skipped so far this sitting, left in the deck as they were. */
  skipped: number;
  /** Claude's latest reading of the answer being checked, once asked for. */
  review: Review | null;
  /** The answer as Claude was last asked to read it; the review is of this. */
  read: string | null;
  /** The grade Claude gave the answer being checked when it first read it. */
  first: Grade | null;
}

export function startSession(cards: readonly Card[]): Session {
  return {
    queue: cards.map((c) => c.id),
    phase: "ask",
    answer: "",
    tally: { missed: 0, shaky: 0, recalled: 0 },
    skipped: 0,
    review: null,
    read: null,
    first: null,
  };
}

/** The card being asked, or null once the sitting is over. */
export function currentCard(session: Session, deck: Deck): Card | null {
  const id = session.queue[0];
  return id === undefined ? null : (deck.cards.find((c) => c.id === id) ?? null);
}

/** How many cards this sitting has graded or skipped, and how many it will in all. */
export function progress(session: Session): { done: number; total: number } {
  const done = session.tally.missed + session.tally.shaky + session.tally.recalled + session.skipped;
  return { done, total: done + session.queue.length };
}

/** Stop answering and check: the answer is kept as written. */
export function reveal(session: Session, answer: string): Session {
  return session.phase === "ask" ? { ...session, phase: "check", answer } : session;
}

/**
 * Correct the answer being checked. Claude's reading stays, of the answer as
 * it was sent, until the learner has it read again (`askReview`).
 */
export function editAnswer(session: Session, answer: string): Session {
  return session.phase === "check" && answer !== session.answer ? { ...session, answer } : session;
}

/**
 * Drop Claude's reading of the answer being checked, as when its question
 * has been reworded, so it is read afresh against the new wording.
 */
export function dropReview(session: Session): Session {
  return session.phase === "check" && session.review !== null ? { ...session, review: null, read: null } : session;
}

/**
 * Whether the answer being checked is waiting to be read by Claude without
 * being asked: it is written, and Claude has not been asked yet. After that it
 * is read again only when the learner says so (`askReview`).
 */
export function wantsReview(session: Session): boolean {
  return session.phase === "check" && session.answer.trim() !== "" && session.review === null;
}

/**
 * Ask for the answer being checked to be read, as it now stands. Nothing is
 * asked for an empty answer, or one already read or being read as it stands,
 * unless that reading failed.
 */
export function askReview(session: Session): Session {
  if (session.phase !== "check" || !session.answer.trim()) return session;
  const asked = session.read === session.answer && session.review !== null && session.review.kind !== "failed";
  return asked ? session : { ...session, review: { kind: "checking" }, read: session.answer };
}

/** Whether Claude's reading is of the answer as it now stands. */
export function readAsItStands(session: Session): boolean {
  return session.review !== null && session.read === session.answer;
}

/** What Claude was asked to read: a card's question, as worded then, and an answer to it. */
export interface Asked {
  id: string;
  question: string;
  answer: string;
}

/**
 * Take in Claude's reading of the answer `asked`. It is dropped if the
 * sitting has moved on since it was asked for, the question has been
 * reworded, or the answer has been sent to be read again since.
 */
export function settleReview(session: Session, deck: Deck, asked: Asked, review: Review): Session {
  const card = currentCard(session, deck);
  const current =
    session.phase === "check" && session.read === asked.answer && card?.id === asked.id && card.question === asked.question;
  if (!current || session.review?.kind !== "checking") return session;
  const first = session.first ?? (review.kind === "done" ? review.verdict.grade : null);
  return { ...session, review, first };
}

/**
 * The outcome Claude's readings point to, once it has read the answer as it
 * stands and found it right: right first time if it was right when first
 * read, right once corrected if not. Null while it is not yet right, or not
 * read as it stands, since only the learner knows when they are struggling.
 */
export function suggestedGrade(session: Session): Grade | null {
  const { review } = session;
  if (!readAsItStands(session) || review?.kind !== "done" || review.verdict.grade !== "recalled") return null;
  return session.first === "recalled" ? "recalled" : "shaky";
}

/**
 * Grade the card being checked: record the answer on it, as it now stands,
 * and move on. Claude's reading is kept with it when it is of that answer.
 */
export function gradeCurrent(
  session: Session,
  deck: Deck,
  grade: Grade,
  now: number,
): { session: Session; deck: Deck } {
  const [id, ...rest] = session.queue;
  if (id === undefined || session.phase !== "check") return { session, deck };
  const verdict = readAsItStands(session) && session.review?.kind === "done" ? session.review.verdict : null;
  return {
    deck: answerCard(deck, id, session.answer, grade, now, verdict),
    session: {
      queue: rest,
      phase: "ask",
      answer: "",
      tally: { ...session.tally, [grade]: session.tally[grade] + 1 },
      skipped: session.skipped,
      review: null,
      read: null,
      first: null,
    },
  };
}

/**
 * Skip the card being asked or checked: move on without recording anything
 * on it, so the deck is untouched and the card stays due as it was.
 */
export function skipCurrent(session: Session): Session {
  const [id, ...rest] = session.queue;
  if (id === undefined) return session;
  return { ...session, queue: rest, phase: "ask", answer: "", skipped: session.skipped + 1, review: null, read: null, first: null };
}

/** Drop cards no longer in the deck, as when one is deleted in another tab. */
export function prune(session: Session, deck: Deck): Session {
  const ids = new Set(deck.cards.map((c) => c.id));
  const queue = session.queue.filter((id) => ids.has(id));
  if (queue.length === session.queue.length) return session;
  // The card being checked is gone, so its answer and review are too.
  if (queue[0] === session.queue[0]) return { ...session, queue };
  return { ...session, queue, phase: "ask", answer: "", review: null, read: null, first: null };
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
  /** What is being written while the answer is checked, if anything. */
  editor: Editor | null;
}

/**
 * Writing done while an answer is checked, beside the answer itself:
 * rewording its question, or a new question from the same step, as from
 * Claude's feedback.
 */
export interface Editor {
  kind: "question" | "new";
  text: string;
}

const EDITOR_KINDS: readonly Editor["kind"][] = ["question", "new"];

/** Read a kept sitting back, or null if `raw` is not one. */
export function loadSitting(raw: unknown): Sitting | null {
  if (!isObject(raw) || typeof raw.draft !== "string" || !isObject(raw.session)) return null;
  const { queue, phase, answer, tally, skipped, review, read, first } = raw.session;
  if (!isIds(queue) || (phase !== "ask" && phase !== "check") || typeof answer !== "string") return null;
  if (!isObject(tally) || !GRADES.every((g) => Number.isInteger(tally[g]) && (tally[g] as number) >= 0)) return null;
  const counts = tally as Record<Grade, number>;
  return {
    session: {
      queue,
      phase,
      answer,
      tally: { missed: counts.missed, shaky: counts.shaky, recalled: counts.recalled },
      // Absent from a sitting kept before cards could be skipped.
      skipped: Number.isInteger(skipped) && (skipped as number) >= 0 ? (skipped as number) : 0,
      // Kept only while checking: a review is of the answer being checked.
      // One kept before readings were tied to what was sent is of the answer as kept.
      ...readBack(phase === "check" ? loadReview(review) : null, read, answer),
      first: phase === "check" && GRADES.includes(first as Grade) ? (first as Grade) : null,
    },
    draft: raw.draft,
    // Kept only while checking, and absent from a sitting kept before there were editors.
    editor: phase === "check" ? loadEditor(raw.editor) : null,
  };
}

/** A kept review and the answer it is of, or neither. */
function readBack(review: Review | null, read: unknown, answer: string): Pick<Session, "review" | "read"> {
  if (!review) return { review: null, read: null };
  return { review, read: typeof read === "string" ? read : answer };
}

function loadEditor(raw: unknown): Editor | null {
  if (!isObject(raw) || !EDITOR_KINDS.includes(raw.kind as Editor["kind"]) || typeof raw.text !== "string") return null;
  return { kind: raw.kind as Editor["kind"], text: raw.text };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((id) => typeof id === "string");
