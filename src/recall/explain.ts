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
// Each lesson's explanation, and Claude's last check of it, are kept in the
// browser (explain-panel.ts), to come back to; whether a check is under way
// belongs to the page that asked, and is not kept.
//
// Pure, and shared by the page and the Worker, so both read the request by
// the same rules.

import { lessons } from "../lessons.ts";
import { loadReview, type Review } from "./check.ts";
import { MAX_ANSWER, type Grade } from "./deck.ts";

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

// --- Kept in the browser ------------------------------------------------------

/** The explanation as kept: a check still under way is dropped, since its request went with the page. */
export function keepExplanation(e: Explanation): Explanation {
  return e.review?.kind === "checking" ? { ...e, review: null, sent: null } : e;
}

/** Read an explanation as kept, or the empty one if `raw` is not one. */
export function readExplanation(raw: unknown): Explanation {
  if (!isObject(raw) || typeof raw.text !== "string") return EMPTY_EXPLANATION;
  const review = loadReview(raw.review);
  const sent = review && typeof raw.sent === "string" ? raw.sent : null;
  return { text: raw.text.slice(0, MAX_ANSWER), review: sent === null ? null : review, sent };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
