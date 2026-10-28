// Free association: the learner writes down everything they can remember of
// the course so far, in as much detail as they can, and Claude reads it all.
// Claude marks up what is wrong, line by line, as it marks a review answer
// (remarks.ts places its remarks on the words they quote), each remark with
// the lesson that teaches the point where there is one, and picks the
// lessons that are the shortest next step from what the learner knows.
//
// The page sends the writing, and the lessons the learner has noted questions
// in, to the Worker's /associate (worker/associate.ts), which asks Claude. As
// in a sitting, the learner can correct the writing in place and have it read
// again; a reading is of the writing as it was sent.
//
// The writing and Claude's last reading are kept in the deck (deck.ts
// `Writing`), so they sync to every device; whether a reading is under way,
// or failed, belongs to the page that asked, and is not kept.
//
// Pure, and shared by the page and the Worker, so both read the request and
// the reading by the same rules.

import { lessons } from "../lessons.ts";
import { MAX_WRITING, readReading, type Deck, type Reading, type Writing } from "./deck.ts";

/** What the page sends to have a free association read. */
export interface AssociateRequest {
  /** What the learner wrote; never empty. */
  text: string;
  /** Slugs of the lessons the learner has noted questions in, in reading order. */
  noted: string[];
}

/** Where the page stands on having the writing read by Claude. */
export type ReadingState =
  | { kind: "reading" }
  | { kind: "done"; reading: Reading }
  | { kind: "failed"; error: string };

/** The free association on show, as written and read so far. */
export interface Association {
  text: string;
  /** Claude's latest reading, once asked for. */
  state: ReadingState | null;
  /** The writing as Claude was last asked to read it; the reading is of this. */
  sent: string | null;
}

export const EMPTY_ASSOCIATION: Association = { text: "", state: null, sent: null };

/** Largest request accepted, in characters of JSON: the writing at its longest, escaped, and every slug. */
export const MAX_ASSOCIATE_BODY = 6 * MAX_WRITING + 50 * lessons.length;

const SLUGS: ReadonlySet<string> = new Set(lessons.map((l) => l.slug));

/** The lessons with questions noted in them, once each, in reading order. */
export function notedLessons(deck: Deck): string[] {
  const noted = new Set(deck.cards.map((c) => c.lesson));
  return lessons.filter((l) => noted.has(l.slug)).map((l) => l.slug);
}

/** Read a request to read a free association, or null if `raw` is not one. Unknown lessons are dropped. */
export function readAssociateRequest(raw: unknown): AssociateRequest | null {
  if (!isObject(raw) || typeof raw.text !== "string" || !Array.isArray(raw.noted)) return null;
  const text = raw.text.trim().slice(0, MAX_WRITING);
  const noted = [...new Set(raw.noted.filter((s): s is string => typeof s === "string" && SLUGS.has(s)))];
  return text ? { text, noted } : null;
}

/**
 * What a reply from /associate means: its HTTP status and its body as
 * parsed, or null for a request that never got one, as when offline.
 */
export function readAssociateReply(answer: { status: number; body: unknown } | null): ReadingState {
  if (!answer) return { kind: "failed", error: "Can't reach the server to read this." };
  const { status, body } = answer;
  if (status === 401) return { kind: "failed", error: "The server doesn't take this browser's sync key." };
  if (status >= 200 && status < 300) {
    const reading = readReading(body);
    return reading ? { kind: "done", reading } : { kind: "failed", error: "The reading came back unreadable." };
  }
  const said = isObject(body) && typeof body.error === "string" ? body.error : "";
  return { kind: "failed", error: said || `The server answered ${status}.` };
}

// --- The association, as the learner writes and corrects it -------------------

/** Change the writing. Claude's reading stays, of the writing as it was sent, until it is read again. */
export function editWriting(a: Association, text: string): Association {
  return text === a.text ? a : { ...a, text };
}

/**
 * Ask for the writing to be read, as it now stands. Nothing is asked for
 * empty writing, or writing already read or being read as it stands, unless
 * that reading failed.
 */
export function askReading(a: Association): Association {
  if (!a.text.trim()) return a;
  const asked = a.sent === a.text && a.state !== null && a.state.kind !== "failed";
  return asked ? a : { ...a, state: { kind: "reading" }, sent: a.text };
}

/** Take in Claude's reading of `sent`: dropped if the writing has been sent again since. */
export function settleReading(a: Association, sent: string, state: ReadingState): Association {
  return a.sent === sent && a.state?.kind === "reading" ? { ...a, state } : a;
}

/** Whether Claude's reading is of the writing as it now stands. */
export function readAsWritten(a: Association): boolean {
  return a.state !== null && a.sent === a.text;
}

// --- Kept in the deck ------------------------------------------------------------

/** The association as kept in the deck, as when the page opens or another device's copy arrives. */
export function fromWriting(writing: Writing | undefined): Association {
  if (!writing) return EMPTY_ASSOCIATION;
  const { text, read } = writing;
  return read ? { text, state: { kind: "done", reading: read.reading }, sent: read.text } : { text, state: null, sent: null };
}

/**
 * The writing to keep in the deck for `a`, given the copy `kept` there now:
 * `kept` itself if nothing that is kept has changed, else a copy dated `now`,
 * or just after `kept` if this device's clock is behind it, so the change
 * wins the merge. While a reading is under way, or failed, the last one kept
 * stays. Nothing is kept before anything is written.
 */
export function toWriting(a: Association, kept: Writing | undefined, now: number): Writing | undefined {
  const { state, sent } = a;
  const read =
    state?.kind === "done" && sent !== null ? { text: sent, reading: state.reading } : state === null ? null : (kept?.read ?? null);
  if (!kept && !a.text && !read) return undefined;
  if (kept && kept.text === a.text && JSON.stringify(kept.read) === JSON.stringify(read)) return kept;
  return { text: a.text, read, updated: kept ? Math.max(now, kept.updated + 1) : now };
}

/**
 * The writing kept by an earlier version of the page, in the browser alone
 * rather than the deck, dated `now` so it is synced; null if there is none.
 */
export function readLocalAssociation(raw: unknown, now: number): Writing | null {
  if (!isObject(raw) || typeof raw.text !== "string") return null;
  const reading = isObject(raw.state) && raw.state.kind === "done" ? readReading(raw.state.reading) : null;
  const read = reading && typeof raw.sent === "string" ? { text: raw.sent, reading } : null;
  return raw.text || read ? { text: raw.text.slice(0, MAX_WRITING), read, updated: now } : null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
