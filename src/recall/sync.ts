// Keeping the recall deck the same on every device the learner uses, through
// the site's Worker (worker/), which holds the deck at /deck. Each page sends its whole deck and takes back
// the Worker's merge of it with every other device's (mergeDecks).
//
// The Worker serves the deck of whoever is signed in (worker/auth.ts), and
// answers 401 to a page with no sign-in, or one that has run out. Staging
// also sits behind Cloudflare Access, which answers for itself once its own
// sign-in runs out: a 401 when the request says it is one
// (`X-Requested-With`), or a redirect to its sign-in page. Either way the
// deck is kept here and sent once the learner signs in, and syncing goes on
// trying (`signedOut`).
//
// Pure: what a reply means, whether there is anything to send, and how the
// state of things reads. remote.ts makes the requests and holds the state.

import { mergeDecks, sameDeck, loadDeck, type Deck } from "./deck.ts";

/** Status of a reply that was a redirect, which is only ever Access sending the page to sign in (remote.ts). */
export const REDIRECTED = 0;

/** Whether a reply says the learner is not signed in: a 401, or a redirect to sign in. */
export function signedOut(answer: { status: number }): boolean {
  return answer.status === 401 || answer.status === REDIRECTED;
}

/** How syncing stands, for the page to show. */
export type SyncState =
  | { kind: "syncing"; last: number | null }
  | { kind: "synced"; last: number }
  /** The Worker could not be reached; changes wait here until it can. */
  | { kind: "unreachable"; last: number | null }
  /** The learner is not signed in, or their sign-in has run out; changes wait here until they sign in. */
  | { kind: "signed-out"; last: number | null }
  /** The Worker answered, but not with a deck. */
  | { kind: "failed"; last: number | null; error: string };

/** What came back from sending the deck. */
export type Reply =
  | { kind: "deck"; deck: Deck }
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
  if (signedOut(answer)) return { kind: "signed-out" };
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
 * for questions, "later" when only writing has changed, the free association
 * or an explanation, since that changes with every key pressed, and null for
 * nothing new.
 */
export function sendWhen(deck: Deck, server: Deck | null): "soon" | "later" | null {
  if (!hasNews(deck, server)) return null;
  const writingOnly = server !== null && !hasNews({ ...deck, writing: server.writing, explanations: server.explanations }, server);
  return writingOnly ? "later" : "soon";
}

/** The sentence the recall page shows for `state`. */
export function syncLabel(state: SyncState, now: number): string {
  const since = (last: number | null): string => (last === null ? "" : ` Last synced ${ago(last, now)}.`);
  switch (state.kind) {
    // A sync after the first reads as the last success, so the line does
    // not flicker each time the tab is shown.
    case "syncing":
      return state.last === null ? "Syncing…" : `Synced with your other devices ${ago(state.last, now)}.`;
    case "synced":
      return `Synced with your other devices ${ago(state.last, now)}.`;
    case "unreachable":
      return `Can't reach the sync server. Changes are kept here and sent once it's back.${since(state.last)}`;
    case "signed-out":
      return state.last === null
        ? "Your questions are kept in this browser only. Sign in to keep them the same on every device you use."
        : `You're signed out. Changes are kept here and sent once you sign in again.${since(state.last)}`;
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
