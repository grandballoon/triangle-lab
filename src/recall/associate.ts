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
// Pure, and shared by the page and the Worker, so both read the request and
// the reading by the same rules.

import { lessons } from "../lessons.ts";
import { MAX_FEEDBACK, type Deck, type Remark } from "./deck.ts";

/** Longest writing sent: pages of it, but not a stray paste of a book. */
export const MAX_WRITING = 20_000;
/** Most remarks kept on one reading: a long piece of writing has many lines. */
export const MAX_NOTES = 40;
/** Most lessons suggested as next steps. */
export const MAX_NEXT = 3;

/** What the page sends to have a free association read. */
export interface AssociateRequest {
  /** What the learner wrote; never empty. */
  text: string;
  /** Slugs of the lessons the learner has noted questions in, in reading order. */
  noted: string[];
}

/** A remark on the writing, with the lesson that teaches the point where there is one. */
export interface Note extends Remark {
  /** The slug of the lesson to look at, if any. */
  lesson?: string;
}

/** A lesson to take next, and why it is a short step from what the learner knows. */
export interface NextStep {
  lesson: string;
  /** One or two sentences to the learner, with `$…$` for mathematics. */
  why: string;
}

/** Claude's reading of a free association. */
export interface Reading {
  /** A few sentences to the learner on what they know and where it is thin. */
  feedback: string;
  /** What is wrong, on the words of the writing it quotes. */
  remarks: Note[];
  /** The shortest next steps, nearest first. */
  next: NextStep[];
}

/** Where the page stands on having the writing read by Claude. */
export type ReadingState =
  | { kind: "reading" }
  | { kind: "done"; reading: Reading }
  | { kind: "failed"; error: string };

/** The free association being written, kept in the browser between visits. */
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

/** Read Claude's reading, or null if `raw` is not one. Remarks and steps that are not one, or name no lesson in the course, are dropped. */
export function readReading(raw: unknown): Reading | null {
  if (!isObject(raw) || typeof raw.feedback !== "string") return null;
  const feedback = raw.feedback.trim().slice(0, MAX_FEEDBACK);
  if (!feedback) return null;
  const remarks = (Array.isArray(raw.remarks) ? raw.remarks : []).flatMap(readNote).slice(0, MAX_NOTES);
  const next = (Array.isArray(raw.next) ? raw.next : []).flatMap(readStep);
  const once = next.filter((s, i) => next.findIndex((t) => t.lesson === s.lesson) === i).slice(0, MAX_NEXT);
  return { feedback, remarks, next: once };
}

function readNote(raw: unknown): Note[] {
  if (!isObject(raw) || typeof raw.quote !== "string" || typeof raw.note !== "string") return [];
  const note = raw.note.trim().slice(0, MAX_FEEDBACK);
  if (!raw.quote.trim() || raw.quote.length > MAX_WRITING || !note) return [];
  return typeof raw.lesson === "string" && SLUGS.has(raw.lesson)
    ? [{ quote: raw.quote, note, lesson: raw.lesson }]
    : [{ quote: raw.quote, note }];
}

function readStep(raw: unknown): NextStep[] {
  if (!isObject(raw) || typeof raw.lesson !== "string" || !SLUGS.has(raw.lesson) || typeof raw.why !== "string") return [];
  const why = raw.why.trim().slice(0, MAX_FEEDBACK);
  return why ? [{ lesson: raw.lesson, why }] : [];
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

/** Whether the writing was sent to be read and no reading is held, as after a reload that came while Claude was reading. */
export function wantsReading(a: Association): boolean {
  return a.sent !== null && a.state === null && a.text.trim() !== "";
}

/**
 * Read an association kept in the browser, or the empty one. A reading still
 * under way is dropped: its request went with the page, so the page asks again.
 */
export function loadAssociation(raw: unknown): Association {
  if (!isObject(raw) || typeof raw.text !== "string") return EMPTY_ASSOCIATION;
  const sent = typeof raw.sent === "string" ? raw.sent : null;
  return { text: raw.text.slice(0, MAX_WRITING), state: sent === null ? null : loadState(raw.state), sent };
}

function loadState(raw: unknown): ReadingState | null {
  if (!isObject(raw)) return null;
  if (raw.kind === "done") {
    const reading = readReading(raw.reading);
    return reading ? { kind: "done", reading } : null;
  }
  if (raw.kind === "failed" && typeof raw.error === "string") return { kind: "failed", error: raw.error };
  return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
