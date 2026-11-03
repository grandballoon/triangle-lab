// Keeping the recall deck the same on every device the learner uses, through
// the site's Worker (worker/), which holds the deck at /deck. Each page sends its whole deck and takes back
// the Worker's merge of it with every other device's (mergeDecks).
//
// The site sits behind Cloudflare Access, whose sign-in runs out. Once it
// has, Access answers the page's requests itself, before the Worker sees
// them: a 401 when the request says it is one (`X-Requested-With`), or a
// redirect to its sign-in page. Either way that is not the key being wrong:
// the deck is kept here and sent once the learner signs in again, and
// syncing goes on trying (`barredBy`).
//
// Pure: what a reply means, whether there is anything to send, and how the
// state of things reads. remote.ts makes the requests and holds the state.

import { mergeDecks, sameDeck, loadDeck, type Deck } from "./deck.ts";

/** What a refused request lacked: the sync key, or a Cloudflare Access sign-in. */
export type Barred = "key" | "access";

/** Status of a reply that was a redirect, which is only ever Access sending the page to sign in (remote.ts). */
export const REDIRECTED = 0;

/**
 * What kept a reply from being answered, or null if nothing did. Only a 401
 * the Worker marks as the key's fault is; any other 401, or a redirect, is
 * Access wanting the learner to sign in again, so it is tried again later
 * rather than taken as a wrong key.
 */
export function barredBy(answer: { status: number; body: unknown }): Barred | null {
  if (answer.status === REDIRECTED) return "access";
  if (answer.status !== 401) return null;
  const { body } = answer;
  return typeof body === "object" && body !== null && "reason" in body && body.reason === "key" ? "key" : "access";
}

/** How syncing stands, for the page to show. */
export type SyncState =
  /** This browser has not been given the key. */
  | { kind: "no-key" }
  | { kind: "syncing"; last: number | null }
  | { kind: "synced"; last: number }
  /** The Worker could not be reached; changes wait here until it can. */
  | { kind: "unreachable"; last: number | null }
  /** The Worker does not take this browser's key. */
  | { kind: "refused" }
  /** The site's Cloudflare Access sign-in has run out; changes wait here until the learner signs in again. */
  | { kind: "signed-out"; last: number | null }
  /** The Worker answered, but not with a deck. */
  | { kind: "failed"; last: number | null; error: string };

/** What came back from sending the deck. */
export type Reply =
  | { kind: "deck"; deck: Deck }
  | { kind: "refused" }
  | { kind: "signed-out" }
  | { kind: "unreachable" }
  | { kind: "failed"; error: string };

/**
 * Read a reply: its HTTP status and its body as parsed, or null for a
 * request that never got one, as when offline.
 */
export function readReply(answer: { status: number; body: unknown } | null): Reply {
  if (!answer) return { kind: "unreachable" };
  const { status, body } = answer;
  const barred = barredBy(answer);
  if (barred) return { kind: barred === "key" ? "refused" : "signed-out" };
  if (status >= 200 && status < 300) {
    const deck = loadDeck(body);
    return deck ? { kind: "deck", deck } : { kind: "failed", error: "The sync server sent back something odd." };
  }
  const said = typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
  return { kind: "failed", error: said || `The sync server answered ${status}.` };
}

/** The state after `reply`, with `last` the time of the last success and `now` this one's. */
export function afterReply(reply: Reply, last: number | null, now: number): SyncState {
  switch (reply.kind) {
    case "deck":
      return { kind: "synced", last: now };
    case "refused":
      return { kind: "refused" };
    case "signed-out":
      return { kind: "signed-out", last };
    case "unreachable":
      return { kind: "unreachable", last };
    case "failed":
      return { kind: "failed", last, error: reply.error };
  }
}

/** When the last success was, if the state says. */
export function lastSynced(state: SyncState): number | null {
  return "last" in state ? state.last : null;
}

/** Whether `deck` holds anything the Worker's copy, as last heard, lacks. */
export function hasNews(deck: Deck, server: Deck | null): boolean {
  if (!server) return true;
  return !sameDeck(mergeDecks(server, deck), server);
}

/**
 * How soon to send what `deck` holds that the Worker's copy lacks: "soon"
 * for questions, "later" when only the free association has changed, since
 * it changes with every key pressed, and null for nothing new.
 */
export function sendWhen(deck: Deck, server: Deck | null): "soon" | "later" | null {
  if (!hasNews(deck, server)) return null;
  const writingOnly = server !== null && !hasNews({ ...deck, writing: server.writing }, server);
  return writingOnly ? "later" : "soon";
}

/** The sentence the recall page shows for `state`. */
export function syncLabel(state: SyncState, now: number): string {
  const since = (last: number | null): string => (last === null ? "" : ` Last synced ${ago(last, now)}.`);
  switch (state.kind) {
    case "no-key":
      return "Your questions are kept in this browser only. Enter your sync key to keep them the same on every device you use.";
    // A sync after the first reads as the last success, so the line does
    // not flicker each time the tab is shown.
    case "syncing":
      return state.last === null ? "Syncing…" : `Synced with your other devices ${ago(state.last, now)}.`;
    case "synced":
      return `Synced with your other devices ${ago(state.last, now)}.`;
    case "unreachable":
      return `Can't reach the sync server. Changes are kept here and sent once it's back.${since(state.last)}`;
    case "refused":
      return "The sync server doesn't take that key. Your questions are kept in this browser until you enter the right one.";
    case "signed-out":
      return `Your sign-in to the site has run out. Changes are kept here and sent once you sign in again.${since(state.last)}`;
    case "failed":
      return `Syncing went wrong: ${state.error} Changes are kept here.${since(state.last)}`;
  }
}

function ago(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
