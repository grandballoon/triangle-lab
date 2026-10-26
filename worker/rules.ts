// What the Worker does with a request, decided from plain values: whether
// the caller holds the key, is within the rate limit, and what was asked
// for. index.ts reads the request, follows the decision and does the I/O.
// Only /deck and /check reach the Worker; the site's pages are served from
// its assets (wrangler.jsonc), on the same origin, so no page elsewhere is
// let in through CORS.
//
// The API:
//   GET  /deck   the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck   a SavedDeck to merge in; answers with the merged deck
//   POST /check  a CheckRequest (src/recall/check.ts); answers with Claude's Verdict
// Every request carries `Authorization: Bearer <RECALL_KEY>`.

import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import type { Deck } from "../src/recall/deck.ts";

/** Largest deck accepted, in characters of JSON: far above any real deck. */
export const MAX_BODY = 5_000_000;

/**
 * Shortest key the Worker will serve with: the key is all that guards the
 * deck, so it must be too long to guess (`openssl rand -base64 24` gives 32).
 */
export const MIN_KEY = 32;

/**
 * How far ahead of the Worker's clock a change may be dated. A merge takes
 * the latest change, so one dated far ahead would win every merge until
 * then; this leaves room only for a device's clock being a little off.
 */
export const CLOCK_SLACK_MS = 60 * 60 * 1000;

export interface Asked {
  method: string;
  path: string;
  authorization: string | null;
  /** The Content-Length header, if sent. */
  length: number | null;
  /** Whether the caller is within the rate limit. */
  withinLimit: boolean;
}

export interface Settings {
  /** The key every request must carry; empty when the secret was never set. */
  key: string;
  /** Whether the Worker can call Claude: its ANTHROPIC_API_KEY is set. */
  claude: boolean;
}

export type Decision =
  | { kind: "read" }
  | { kind: "merge" }
  | { kind: "check" }
  | Refusal;

export interface Refusal {
  kind: "refuse";
  status: number;
  error: string;
}

export function decide(asked: Asked, settings: Settings): Decision {
  const check = asked.path === CHECK_PATH;
  if (asked.path !== "/deck" && !check) return refuse(404, "There is nothing here but /deck and /check.");
  const methods = check ? ["POST"] : ["GET", "POST"];
  if (!methods.includes(asked.method)) return refuse(405, `Use ${methods.join(" or ")}.`);
  if (settings.key.length < MIN_KEY) {
    return refuse(503, `The Worker's RECALL_KEY is missing or shorter than ${MIN_KEY} characters.`);
  }
  // Before the key is checked, so guessing it is slowed too.
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  if (asked.method === "POST" && asked.length !== null && asked.length > (check ? MAX_CHECK_BODY : MAX_BODY)) {
    return check ? checkTooLarge : tooLarge;
  }
  if (!keyMatches(asked.authorization, settings.key)) return refuse(401, "That key is not this deck's.");
  if (check) {
    return settings.claude ? { kind: "check" } : refuse(503, "Answer checking is off: the Worker has no ANTHROPIC_API_KEY.");
  }
  return { kind: asked.method === "GET" ? "read" : "merge" };
}

/** Where answers are sent to be checked by Claude. */
export const CHECK_PATH = "/check";

/** The refusal for a deck over MAX_BODY, whether its size was declared or found on reading. */
export const tooLarge: Refusal = { kind: "refuse", status: 413, error: "That deck is too large." };

/** The same for an answer to check over MAX_CHECK_BODY. */
export const checkTooLarge: Refusal = { kind: "refuse", status: 413, error: "That answer is too long to check." };

/**
 * Whether any change in `deck` is dated further ahead of `now` than a
 * device's clock could be off by. Only the times merges compare are
 * checked: a card's `due` is in the future by design.
 */
export function datedAhead(deck: Deck, now: number): boolean {
  const limit = now + CLOCK_SLACK_MS;
  return deck.cards.some((c) => c.updated > limit) || deck.removed.some((r) => r.at > limit);
}

/** Whether `authorization` is `Bearer <key>`, compared in constant time. */
export function keyMatches(authorization: string | null, key: string): boolean {
  const given = /^Bearer (.+)$/.exec(authorization ?? "")?.[1] ?? "";
  if (!key || given.length !== key.length) return false;
  let differ = 0;
  for (let i = 0; i < key.length; i++) differ |= given.charCodeAt(i) ^ key.charCodeAt(i);
  return differ === 0;
}

function refuse(status: number, error: string): Refusal {
  return { kind: "refuse", status, error };
}
