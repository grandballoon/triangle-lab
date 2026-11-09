// Checking understanding on the lesson page itself: beside the steps, the
// learner explains the lesson's idea in their own words, and Claude reads the
// explanation against what the lesson teaches. What comes back is a check's
// `Verdict` (check.ts): how well it shows the idea is understood, a few
// sentences of feedback, and remarks on the words they are about, placed on
// the explanation as they are on a review answer (remarks.ts). As on the
// recall page, the learner corrects the explanation in place and has it
// checked again; a check is of the explanation as it was sent.
//
// The page sends the lesson, the step on show and the explanation to the
// Worker's /explain (worker/explain.ts), which tells Claude what the lesson
// teaches from the syllabus.
//
// Each lesson's explanation, and Claude's last check of it that came back,
// are kept in the recall deck (deck.ts KeptExplanation), which syncs them to
// every device the learner uses; a check under way, or one that failed,
// belongs to the page that asked, and is not kept.
//
// Pure, and shared by the page and the Worker, so both read the request by
// the same rules.

import { lessons } from "../lessons.ts";
import { loadReview, type Review } from "./check.ts";
import { explanationOf, MAX_ANSWER, setExplanation, type Deck, type Grade, type KeptExplanation } from "./deck.ts";

/** What the page sends to have an explanation checked. */
export interface ExplainRequest {
  /** The lesson's slug. */
  lesson: string;
  /** The step on show as the learner wrote: "Step 2: Find the centroid". */
  step: string;
  /** The learner's explanation, as written; never empty. */
  text: string;
}

/** The explanation on show for a lesson, as written and checked so far. */
export interface Explanation {
  text: string;
  /** Claude's latest check, once asked for. */
  review: Review | null;
  /** The explanation as Claude was last asked to check it; the check is of this. */
  sent: string | null;
}

export const EMPTY_EXPLANATION: Explanation = { text: "", review: null, sent: null };

/** How well a check says the explanation shows the idea is understood, by the grade Claude gives. */
export const UNDERSTANDING: Record<Grade, string> = {
  recalled: "Understood",
  shaky: "Partly there",
  missed: "Not yet",
};

const MAX_STEP = 300;

/** Largest request accepted, in characters of JSON: the fields at their longest, escaped. */
export const MAX_EXPLAIN_BODY = 6 * (MAX_ANSWER + MAX_STEP) + 200;

const SLUGS: ReadonlySet<string> = new Set(lessons.map((l) => l.slug));

/** Read a request to check an explanation, or null if `raw` is not one, or is about no lesson in the course. */
export function readExplainRequest(raw: unknown): ExplainRequest | null {
  if (!isObject(raw)) return null;
  const { lesson, step, text } = raw;
  if (typeof lesson !== "string" || typeof step !== "string" || typeof text !== "string" || !SLUGS.has(lesson)) return null;
  const request = { lesson, step: step.trim().slice(0, MAX_STEP), text: text.trim().slice(0, MAX_ANSWER) };
  return request.text ? request : null;
}

// --- The explanation, as the learner writes and corrects it -----------------

/** Change the explanation. Claude's check stays, of the explanation as it was sent, until it is checked again. */
export function editExplanation(e: Explanation, text: string): Explanation {
  return text === e.text ? e : { ...e, text };
}

/**
 * Ask for the explanation to be checked, as it now stands. Nothing is asked
 * for an empty one, or one already checked or being checked as it stands,
 * unless that check failed.
 */
export function askCheck(e: Explanation): Explanation {
  if (!e.text.trim()) return e;
  const asked = e.sent === e.text && e.review !== null && e.review.kind !== "failed";
  return asked ? e : { ...e, review: { kind: "checking" }, sent: e.text };
}

/** Take in Claude's check of `sent`: dropped if the explanation has been sent again since. */
export function settleCheck(e: Explanation, sent: string, review: Review): Explanation {
  return e.sent === sent && e.review?.kind === "checking" ? { ...e, review } : e;
}

/** Whether Claude's check is of the explanation as it now stands. */
export function checkedAsItStands(e: Explanation): boolean {
  return e.review !== null && e.sent === e.text;
}

// --- Kept in the deck -------------------------------------------------------

/** The explanation of `lesson` the deck holds, as the page shows it. */
export function explanationIn(deck: Deck, lesson: string): Explanation {
  const kept = explanationOf(deck, lesson);
  if (!kept) return EMPTY_EXPLANATION;
  const { text, checked } = kept;
  return checked ? { text, review: { kind: "done", verdict: checked.verdict }, sent: checked.text } : { text, review: null, sent: null };
}

/**
 * Keep `e` as the explanation of `lesson` in the deck, dated `now` if what is
 * kept changes. Only a check that came back is kept: while one is under way,
 * or after one has failed, the deck keeps the last that came back.
 */
export function keepExplanation(deck: Deck, lesson: string, e: Explanation, now: number): Deck {
  const held = explanationOf(deck, lesson);
  const text = e.text.slice(0, MAX_ANSWER);
  const checked: KeptExplanation["checked"] =
    e.review?.kind === "done" && e.sent !== null ? { text: e.sent.slice(0, MAX_ANSWER), verdict: e.review.verdict } : (held?.checked ?? null);
  const same = held ? held.text === text && JSON.stringify(held.checked) === JSON.stringify(checked) : !text && !checked;
  return same ? deck : setExplanation(deck, { lesson, text, checked, updated: now });
}

/**
 * The explanation of `lesson` to show once the deck has changed, as from
 * another tab or device: `e` while the deck still holds what it keeps of it,
 * so a check under way goes on, and otherwise the deck's.
 */
export function afterDeckChange(deck: Deck, lesson: string, e: Explanation): Explanation {
  return keepExplanation(deck, lesson, e, 0) === deck ? e : explanationIn(deck, lesson);
}

/**
 * Move an explanation an earlier version of the page kept in this browser
 * alone into the deck, unless the deck holds one for the lesson. It is dated
 * as early as can be, so any explanation written since, on any device, wins
 * a merge with it.
 */
export function moveLocalExplanation(deck: Deck, lesson: string, raw: unknown): Deck {
  return explanationOf(deck, lesson) ? deck : keepExplanation(deck, lesson, readLocalExplanation(raw), 0);
}

/** Read an explanation as an earlier version kept it in this browser, or the empty one if `raw` is not one. */
export function readLocalExplanation(raw: unknown): Explanation {
  if (!isObject(raw) || typeof raw.text !== "string") return EMPTY_EXPLANATION;
  const review = loadReview(raw.review);
  const sent = review && typeof raw.sent === "string" ? raw.sent : null;
  return { text: raw.text.slice(0, MAX_ANSWER), review: sent === null ? null : review, sent };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
