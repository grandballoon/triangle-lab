// What the Worker does with a request, decided from plain values: whether
// the caller came through Cloudflare Access (access.ts), holds the key, is
// within the rate limit, and what was asked for. index.ts reads the request, follows the decision and does the I/O.
// Only /deck, /check, /associate and /explain reach the Worker; the site's pages are served from
// its assets (wrangler.jsonc), on the same origin, so no page elsewhere is
// let in through CORS.
//
// The API:
//   GET  /deck   the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck   a SavedDeck to merge in; answers with the merged deck
//   POST /check  a CheckRequest (src/recall/check.ts); answers with Claude's Verdict
//   POST /associate  an AssociateRequest (src/recall/associate.ts); answers with Claude's Reading
//   POST /explain  an ExplainRequest (src/recall/explain.ts); answers with Claude's Verdict
// Every request carries `Authorization: Bearer <RECALL_KEY>`, and the token
// Cloudflare Access forwards for the site's application, so the deck and the
// calls to Claude, which cost money, are only for someone Access let in.

import { MAX_ASSOCIATE_BODY } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import { MAX_EXPLAIN_BODY } from "../src/recall/explain.ts";
import type { Deck } from "../src/recall/deck.ts";
import type { Barred } from "../src/recall/sync.ts";
import { claimsProblem, waivedLocally, type Access } from "./access.ts";

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
  /** The hostname the request was made to. */
  hostname: string;
  /** The Access token's claims, once its signature is checked; null without a valid one. */
  claims: Record<string, unknown> | null;
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
  /** The Access application in front of the site; empty fields when it was never set. */
  access: Access;
}

export type Decision =
  | { kind: "read" }
  | { kind: "merge" }
  | { kind: "check" }
  | { kind: "associate" }
  | { kind: "explain" }
  | Refusal;

export interface Refusal {
  kind: "refuse";
  status: number;
  error: string;
  /**
   * On a 401, what the caller lacks: the sync key, or a Cloudflare Access
   * sign-in. Pages tell the two apart by it (src/recall/sync.ts `barredBy`):
   * a wrong key is not tried again, while a sign-in that has run out is.
   */
  reason?: Barred;
}

/** A refusal as the Worker sends it: its error, and why on a 401. */
export function refusalBody({ error, reason }: Refusal): { error: string; reason?: Barred } {
  return reason ? { error, reason } : { error };
}

/** What to do with `asked`, at `now` (ms), which an Access token must be in date for. */
export function decide(asked: Asked, settings: Settings, now: number): Decision {
  const claude = CLAUDE_PATHS.find((c) => c.path === asked.path);
  if (asked.path !== "/deck" && !claude) return refuse(404, "There is nothing here but /deck, /check, /associate and /explain.");
  const methods = claude ? ["POST"] : ["GET", "POST"];
  if (!methods.includes(asked.method)) return refuse(405, `Use ${methods.join(" or ")}.`);
  if (settings.key.length < MIN_KEY) {
    return refuse(503, `The Worker's RECALL_KEY is missing or shorter than ${MIN_KEY} characters.`);
  }
  // Before the key is checked, so guessing it is slowed too.
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  const screened = accessProblem(asked, settings.access, now);
  if (screened) return screened;
  if (asked.method === "POST" && asked.length !== null && asked.length > (claude?.max ?? MAX_BODY)) {
    return claude?.tooLarge ?? tooLarge;
  }
  if (!keyMatches(asked.authorization, settings.key)) return { ...refuse(401, "That key is not this deck's."), reason: "key" };
  if (claude) {
    return settings.claude ? { kind: claude.kind } : refuse(503, `${claude.what} is off: the Worker has no ANTHROPIC_API_KEY.`);
  }
  return { kind: asked.method === "GET" ? "read" : "merge" };
}

/**
 * Why `asked` did not come through Cloudflare Access, or null if it did, or
 * needs not (`waivedLocally`). Unset, Access refuses everything: a Worker
 * deployed without it fails closed.
 */
function accessProblem(asked: Asked, access: Access, now: number): Refusal | null {
  if (waivedLocally(asked.hostname)) return null;
  if (!access.issuer || !access.aud) {
    return refuse(503, "The Worker's ACCESS_ISSUER or ACCESS_AUD is not set, so it lets no one in.");
  }
  const problem = asked.claims ? claimsProblem(asked.claims, access, now) : "There is no valid Cloudflare Access token.";
  return problem ? { ...refuse(401, problem), reason: "access" } : null;
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
  return deck.cards.some((c) => c.updated > limit) || deck.removed.some((r) => r.at > limit) || (deck.writing?.updated ?? 0) > limit;
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
