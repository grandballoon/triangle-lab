// What the Worker does with a request to the deck or to Claude, decided from
// plain values: who is signed in (auth.ts), whether the request came from the
// site's own pages, is within the rate limit, and what was asked for.
// index.ts reads the request, follows the decision and does the I/O.
// Only the Worker's own paths reach it; the site's pages are served from
// its assets (wrangler.jsonc), on the same origin, so no page elsewhere is
// let in through CORS.
//
// The API:
//   GET  /deck   the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck   a SavedDeck to merge in; answers with the merged deck
//   POST /check  a CheckRequest (src/recall/check.ts); answers with Claude's Verdict
//   POST /associate  an AssociateRequest (src/recall/associate.ts); answers with Claude's Reading
//   POST /explain  an ExplainRequest (src/recall/explain.ts); answers with Claude's Verdict
// Every request carries the session cookie (auth.ts), so the deck and the
// calls to Claude, which cost money, are only for someone signed in, and
// `X-Requested-With`, which a page on another site cannot send without the
// CORS the Worker never grants, so no other site can make a signed-in
// learner's browser change their deck.
//
// Each learner has a deck of their own, named by the email they signed in
// with (`deckFor`), so a demo account starts with an empty deck and the
// owner's is never touched. The owner's deck keeps the name it had while the
// site had one learner (LEGACY_DECK), so nothing held there moved.

import { MAX_ASSOCIATE_BODY } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import { MAX_EXPLAIN_BODY } from "../src/recall/explain.ts";
import type { Deck } from "../src/recall/deck.ts";

/** Largest deck accepted, in characters of JSON: far above any real deck. */
export const MAX_BODY = 5_000_000;

/**
 * How far ahead of the Worker's clock a change may be dated. A merge takes
 * the latest change, so one dated far ahead would win every merge until
 * then; this leaves room only for a device's clock being a little off.
 */
export const CLOCK_SLACK_MS = 60 * 60 * 1000;

export interface Asked {
  method: string;
  path: string;
  /** The email of whoever is signed in, as auth.ts `signedInAs` gives it; null for no one. */
  email: string | null;
  /** Whether the request says it came from the site's own pages (`X-Requested-With`). */
  fromPage: boolean;
  /** The Content-Length header, if sent. */
  length: number | null;
  /** Whether the caller is within the rate limit. */
  withinLimit: boolean;
}

export interface Settings {
  /** Whether the Worker can call Claude: its ANTHROPIC_API_KEY is set. */
  claude: boolean;
  /** The email the site's owner signs in with; empty when the secret was never set. */
  owner: string;
}

export type Decision =
  | { kind: "read"; deck: string }
  | { kind: "merge"; deck: string }
  | { kind: "check" }
  | { kind: "associate" }
  | { kind: "explain" }
  | Refusal;

export interface Refusal {
  kind: "refuse";
  status: number;
  error: string;
}

/** What to do with `asked`. */
export function decide(asked: Asked, settings: Settings): Decision {
  const claude = CLAUDE_PATHS.find((c) => c.path === asked.path);
  if (asked.path !== "/deck" && !claude) return refuse(404, "There is nothing here but /deck, /check, /associate and /explain.");
  const methods = claude ? ["POST"] : ["GET", "POST"];
  if (!methods.includes(asked.method)) return refuse(405, `Use ${methods.join(" or ")}.`);
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  if (!asked.fromPage) return refuse(403, "Requests come from the site's own pages only.");
  if (asked.method === "POST" && asked.length !== null && asked.length > (claude?.max ?? MAX_BODY)) {
    return claude?.tooLarge ?? tooLarge;
  }
  if (!asked.email) return refuse(401, "Sign in first.");
  if (claude) {
    return settings.claude ? { kind: claude.kind } : refuse(503, `${claude.what} is off: the Worker has no ANTHROPIC_API_KEY.`);
  }
  const deck = deckFor(asked.email, settings.owner);
  if (typeof deck !== "string") return deck;
  return { kind: asked.method === "GET" ? "read" : "merge", deck };
}

/** The deck the site held while it had one learner, its owner, who keeps it. */
export const LEGACY_DECK = "deck";

/**
 * The name of the deck for `email`, a signed-in learner's, compared without
 * case: the owner's is LEGACY_DECK, everyone else's their own. With no owner
 * set there is none, so the owner's deck is never handed to anyone else.
 */
export function deckFor(email: string, owner: string): string | Refusal {
  if (!owner.trim()) return refuse(503, "The Worker's OWNER_EMAIL is not set, so it cannot tell whose deck is whose.");
  const wanted = email.trim().toLowerCase();
  return wanted === owner.trim().toLowerCase() ? LEGACY_DECK : `learner:${wanted}`;
}

/** Where answers are sent to be checked by Claude. */
export const CHECK_PATH = "/check";

/** The refusal for a deck over MAX_BODY, whether its size was declared or found on reading. */
export const tooLarge: Refusal = { kind: "refuse", status: 413, error: "That deck is too large." };

/** The same for an answer to check over MAX_CHECK_BODY. */
export const checkTooLarge: Refusal = { kind: "refuse", status: 413, error: "That answer is too long to check." };

/** Where free associations are sent to be read by Claude. */
export const ASSOCIATE_PATH = "/associate";

/** The same for a free association over MAX_ASSOCIATE_BODY. */
export const associateTooLarge: Refusal = { kind: "refuse", status: 413, error: "That is too long to read." };

/** Where explanations written on a lesson page are sent to be checked by Claude. */
export const EXPLAIN_PATH = "/explain";

/** The same for an explanation over MAX_EXPLAIN_BODY. */
export const explainTooLarge: Refusal = { kind: "refuse", status: 413, error: "That explanation is too long to check." };

/** The paths that call Claude, each paid for, so counted against a tighter rate limit too. */
export const CLAUDE_PATHS = [
  { path: CHECK_PATH, kind: "check", max: MAX_CHECK_BODY, tooLarge: checkTooLarge, what: "Answer checking" },
  { path: ASSOCIATE_PATH, kind: "associate", max: MAX_ASSOCIATE_BODY, tooLarge: associateTooLarge, what: "Reading free associations" },
  { path: EXPLAIN_PATH, kind: "explain", max: MAX_EXPLAIN_BODY, tooLarge: explainTooLarge, what: "Checking explanations" },
] as const;

/**
 * Whether any change in `deck` is dated further ahead of `now` than a
 * device's clock could be off by. Only the times merges compare are
 * checked: a card's `due` is in the future by design.
 */
export function datedAhead(deck: Deck, now: number): boolean {
  const limit = now + CLOCK_SLACK_MS;
  return (
    deck.cards.some((c) => c.updated > limit) ||
    deck.removed.some((r) => r.at > limit) ||
    (deck.writing?.updated ?? 0) > limit ||
    (deck.explanations ?? []).some((e) => e.updated > limit)
  );
}

function refuse(status: number, error: string): Refusal {
  return { kind: "refuse", status, error };
}
