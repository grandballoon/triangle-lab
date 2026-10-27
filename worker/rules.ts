// What the Worker does with a request, decided from plain values: whether
// the caller holds the key, is within the rate limit, and what was asked
// for. index.ts reads the request, follows the decision and does the I/O.
// Only /deck, /check and /material reach the Worker; the site's pages are
// served from its assets (wrangler.jsonc), on the same origin, so no page
// elsewhere is let in through CORS.
//
// The API:
//   GET  /deck      the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck      a SavedDeck to merge in; answers with the merged deck
//   POST /check     a CheckRequest (src/recall/check.ts); answers with Claude's Verdict
//   GET  /material  the key facts and reference answers, a MaterialView (src/recall/material.ts)
//   POST /material  a Command to change one; answers with the Item it changed
// Requests to /deck and /check carry `Authorization: Bearer <RECALL_KEY>`,
// and requests to /material, the admin page's, `Bearer <ADMIN_KEY>`: the
// learner's key cannot change what answers are graded against.

import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import type { Deck } from "../src/recall/deck.ts";
import { MAX_STYLE } from "../src/recall/material.ts";

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
  /** The key every request to the deck must carry; empty when the secret was never set. */
  key: string;
  /** The key every request to the material must carry; empty when the secret was never set. */
  admin: string;
  /** Whether the Worker can call Claude: its ANTHROPIC_API_KEY is set. */
  claude: boolean;
}

export type Decision =
  | { kind: "read" }
  | { kind: "merge" }
  | { kind: "check" }
  | { kind: "material" }
  | { kind: "command" }
  | Refusal;

export interface Refusal {
  kind: "refuse";
  status: number;
  error: string;
}

export function decide(asked: Asked, settings: Settings): Decision {
  const route = ROUTES[asked.path];
  if (!route) return refuse(404, "There is nothing here but /deck, /check and /material.");
  if (!route.methods.includes(asked.method)) return refuse(405, `Use ${route.methods.join(" or ")}.`);
  const key = route.admin ? settings.admin : settings.key;
  if (key.length < MIN_KEY) {
    return refuse(503, `The Worker's ${route.admin ? "ADMIN_KEY" : "RECALL_KEY"} is missing or shorter than ${MIN_KEY} characters.`);
  }
  // Before the key is checked, so guessing it is slowed too.
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  if (asked.method === "POST" && asked.length !== null && asked.length > route.max) return route.tooLarge;
  if (!keyMatches(asked.authorization, key)) {
    return refuse(401, route.admin ? "That key is not the admin key." : "That key is not this deck's.");
  }
  switch (asked.path) {
    case CHECK_PATH:
      return settings.claude ? { kind: "check" } : claudeOff;
    case MATERIAL_PATH:
      return { kind: asked.method === "GET" ? "material" : "command" };
    default:
      return { kind: asked.method === "GET" ? "read" : "merge" };
  }
}

/** Where answers are sent to be checked by Claude. */
export const CHECK_PATH = "/check";

/** Where the admin page reads and changes the recall material. */
export const MATERIAL_PATH = "/material";

/** Largest command accepted, in characters of JSON: the house style at its longest, escaped. */
export const MAX_COMMAND_BODY = 6 * MAX_STYLE + 1000;

/**
 * Which tighter rate limit, beside the one every request is counted
 * against, a request is also counted against: each check, and each command
 * to the material, may be a paid call to Claude.
 */
export function limitOf(method: string, path: string): "check" | "write" | null {
  if (method !== "POST") return null;
  return path === CHECK_PATH ? "check" : path === MATERIAL_PATH ? "write" : null;
}

/** The refusal for a request that needs Claude when the Worker has no key to call it with. */
export const claudeOff: Refusal = { kind: "refuse", status: 503, error: "Claude is off: the Worker has no ANTHROPIC_API_KEY." };

/** The refusal for a deck over MAX_BODY, whether its size was declared or found on reading. */
export const tooLarge: Refusal = { kind: "refuse", status: 413, error: "That deck is too large." };

/** The same for an answer to check over MAX_CHECK_BODY. */
export const checkTooLarge: Refusal = { kind: "refuse", status: 413, error: "That answer is too long to check." };

/** The same for a command over MAX_COMMAND_BODY. */
export const commandTooLarge: Refusal = { kind: "refuse", status: 413, error: "That is too long to keep." };

interface Route {
  methods: string[];
  /** Whether it takes the admin key, not the deck's. */
  admin: boolean;
  /** The largest body it takes, and the refusal for one larger. */
  max: number;
  tooLarge: Refusal;
}

const ROUTES: Record<string, Route> = {
  "/deck": { methods: ["GET", "POST"], admin: false, max: MAX_BODY, tooLarge },
  [CHECK_PATH]: { methods: ["POST"], admin: false, max: MAX_CHECK_BODY, tooLarge: checkTooLarge },
  [MATERIAL_PATH]: { methods: ["GET", "POST"], admin: true, max: MAX_COMMAND_BODY, tooLarge: commandTooLarge },
};

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
