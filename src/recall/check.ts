// Claude reading a written answer in a review sitting, and saying how it
// went. The recall page sends the question, where it was asked and the
// answer to the site's Worker at /check (worker/check.ts), which asks Claude;
// the reply is a suggested grade and a few sentences on what was right and
// what was missing. The learner still grades themselves: the suggestion only
// marks one of the grade buttons.
//
// When the learner grades an answer missed or shaky, Claude's verdict is
// kept with it in the deck (deck.ts `Attempt.claude`, where `Verdict` lives),
// so the next try, and the question's history, can show what it said.
//
// Pure, and shared by the page and the Worker, so both read the request and
// the verdict by the same rules.

import { MAX_ANSWER, MAX_QUESTION, readVerdict, type Verdict } from "./deck.ts";

/** What the page sends to have an answer checked. */
export interface CheckRequest {
  question: string;
  /** Where the question was asked: "Triangles · Medians · Step 2: Find the centroid". */
  where: string;
  /** The learner's answer, as written; never empty. */
  answer: string;
}

/** Where a sitting stands on having the answer being checked read by Claude. */
export type Review =
  | { kind: "checking" }
  | { kind: "done"; verdict: Verdict }
  | { kind: "failed"; error: string };

const MAX_WHERE = 300;

/** Largest request accepted, in characters of JSON: the three fields at their longest, escaped. */
export const MAX_CHECK_BODY = 6 * (MAX_QUESTION + MAX_WHERE + MAX_ANSWER);

/** Read a check request, or null if `raw` is not one. Each field is trimmed and capped. */
export function readCheckRequest(raw: unknown): CheckRequest | null {
  if (!isObject(raw)) return null;
  const { question, where, answer } = raw;
  if (typeof question !== "string" || typeof where !== "string" || typeof answer !== "string") return null;
  const request = {
    question: question.trim().slice(0, MAX_QUESTION),
    where: where.trim().slice(0, MAX_WHERE),
    answer: answer.trim().slice(0, MAX_ANSWER),
  };
  return request.question && request.answer ? request : null;
}

/**
 * What a reply from /check means: its HTTP status and its body as parsed, or
 * null for a request that never got one, as when offline.
 */
export function readCheckReply(answer: { status: number; body: unknown } | null): Review {
  if (!answer) return { kind: "failed", error: "Can't reach the server to check this." };
  const { status, body } = answer;
  if (status === 401) return { kind: "failed", error: "The server doesn't take this browser's sync key." };
  if (status >= 200 && status < 300) {
    const verdict = readVerdict(body);
    return verdict ? { kind: "done", verdict } : { kind: "failed", error: "The check came back unreadable." };
  }
  const said = isObject(body) && typeof body.error === "string" ? body.error : "";
  return { kind: "failed", error: said || `The server answered ${status}.` };
}

/**
 * Read a review kept with a sitting, or null if there is none to keep. One
 * still checking is dropped: its request went with the page, so the page asks
 * again.
 */
export function loadReview(raw: unknown): Review | null {
  if (!isObject(raw)) return null;
  if (raw.kind === "done") {
    const verdict = readVerdict(raw.verdict);
    return verdict ? { kind: "done", verdict } : null;
  }
  if (raw.kind === "failed" && typeof raw.error === "string") return { kind: "failed", error: raw.error };
  return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
