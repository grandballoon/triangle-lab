// What the recall Worker does with a request, decided from plain values: which
// pages may call it, whether the caller holds the key, and what was asked
// for. index.ts reads the request, follows the decision and does the I/O.
//
// The API is one resource, the deck:
//   GET  /deck  the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck  a SavedDeck to merge in; answers with the merged deck
// Every request carries `Authorization: Bearer <RECALL_KEY>`.

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
  /** The Origin header, if the request came from a page. */
  origin: string | null;
  authorization: string | null;
  /** The Content-Length header, if sent. */
  length: number | null;
  /** Whether the caller is within the rate limit; asked of every request but a preflight. */
  withinLimit: boolean;
}

export interface Settings {
  /** The key every request must carry; empty when the secret was never set. */
  key: string;
  /** Origins allowed to call from a page, separated by spaces. */
  origins: string;
}

export type Decision =
  | { kind: "preflight" }
  | { kind: "read" }
  | { kind: "merge" }
  | Refusal;

export interface Refusal {
  kind: "refuse";
  status: number;
  error: string;
}

export function decide(asked: Asked, settings: Settings): Decision {
  if (asked.path !== "/deck") return refuse(404, "There is nothing here but /deck.");
  if (asked.method === "OPTIONS") return { kind: "preflight" };
  if (asked.method !== "GET" && asked.method !== "POST") return refuse(405, "Use GET or POST.");
  if (settings.key.length < MIN_KEY) {
    return refuse(503, `The Worker's RECALL_KEY is missing or shorter than ${MIN_KEY} characters.`);
  }
  // Before the key is checked, so guessing it is slowed too.
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  if (asked.method === "POST" && asked.length !== null && asked.length > MAX_BODY) return tooLarge;
  if (!keyMatches(asked.authorization, settings.key)) return refuse(401, "That key is not this deck's.");
  return { kind: asked.method === "GET" ? "read" : "merge" };
}

/** The refusal for a deck over MAX_BODY, whether its size was declared or found on reading. */
export const tooLarge: Refusal = { kind: "refuse", status: 413, error: "That deck is too large." };

/**
 * Whether any change in `deck` is dated further ahead of `now` than a
 * device's clock could be off by. Only the times merges compare are
 * checked: a card's `due` is in the future by design.
 */
export function datedAhead(deck: Deck, now: number): boolean {
  const limit = now + CLOCK_SLACK_MS;
  return deck.cards.some((c) => c.updated > limit) || deck.removed.some((r) => r.at > limit);
}

/**
 * The CORS headers for a response to `origin`: none for a page not allowed,
 * so its browser keeps the response from it.
 */
export function corsHeaders(origin: string | null, origins: string): Record<string, string> {
  if (!origin || !origins.split(/\s+/).includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
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
