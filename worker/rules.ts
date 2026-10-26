// What the recall Worker does with a request, decided from plain values: which
// pages may call it, whether the caller holds the key, and what was asked
// for. index.ts reads the request, follows the decision and does the I/O.
//
// The API is one resource, the deck:
//   GET  /deck  the deck as held, a SavedDeck (src/recall/deck.ts)
//   POST /deck  a SavedDeck to merge in; answers with the merged deck
// Every request carries `Authorization: Bearer <RECALL_KEY>`.

/** Largest deck accepted, in characters of JSON: far above any real deck. */
export const MAX_BODY = 5_000_000;

export interface Asked {
  method: string;
  path: string;
  /** The Origin header, if the request came from a page. */
  origin: string | null;
  authorization: string | null;
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
  | { kind: "refuse"; status: number; error: string };

export function decide(asked: Asked, settings: Settings): Decision {
  if (asked.path !== "/deck") return refuse(404, "There is nothing here but /deck.");
  if (asked.method === "OPTIONS") return { kind: "preflight" };
  if (asked.method !== "GET" && asked.method !== "POST") return refuse(405, "Use GET or POST.");
  if (!settings.key) return refuse(503, "The Worker has no RECALL_KEY set.");
  if (!keyMatches(asked.authorization, settings.key)) return refuse(401, "That key is not this deck's.");
  return { kind: asked.method === "GET" ? "read" : "merge" };
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

const refuse = (status: number, error: string): Decision => ({ kind: "refuse", status, error });
