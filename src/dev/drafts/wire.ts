// The draft tab's wire format and the files it keeps, as the page (pane.ts)
// exchanges them with the dev server (tools/drafts-plugin.ts) or the staging
// Worker (worker/staging.ts), and the rules both servers save by. Shared by
// all three, so it stays free of DOM and Node APIs.
//
// A draft is new text for a lesson, written by hand to replace its steps one
// day: Markdown, with mathematics in LaTeX between dollar signs. Each
// lesson's draft is kept in the repository, in lesson-drafts/<slug>.md, and
// every save also keeps what the author has written in the Explain tab of
// each lesson, in lesson-drafts/<slug>.explanation.md, as the understanding
// the drafts are written from.

import { lessonOf, SLUG } from "../lesson.ts";

/** Where the tab reads a lesson's draft (GET `?page=`) and saves it (POST a DraftSave). */
export const DRAFTS_ENDPOINT = "/__drafts";

/** Where the drafts are kept, relative to the project root. */
export const DRAFTS_DIR = "lesson-drafts";
export const draftFile = (slug: string): string => `${DRAFTS_DIR}/${slug}.md`;
export const explanationFile = (slug: string): string => `${DRAFTS_DIR}/${slug}.explanation.md`;

/** A lesson's draft as kept. */
export interface DraftListing {
  lesson: string;
  file: string;
  /** The draft, or null before the first is saved. */
  text: string | null;
}

/** What the author has written in a lesson's Explain tab. */
export interface KeptText {
  lesson: string;
  text: string;
}

/** A save of one lesson's draft, with every explanation the author's deck holds. */
export interface DraftSave {
  /** Path and query of the page, which names the lesson. */
  page: string;
  /** The draft as it was listed when the author began, so a save never lands over one made since. */
  was: string | null;
  text: string;
  explanations: KeptText[];
}

/** What a save did. */
export interface DraftReply {
  /** The files written, relative to the project root; empty when all already read so. */
  files: string[];
  /** Where they were committed, on staging; null on the dev server. */
  commit: string | null;
}

/** Longest draft accepted, in characters. */
export const MAX_DRAFT = 200_000;
/** Most explanations one save may keep. */
export const MAX_EXPLANATIONS = 200;
/** Longest explanation accepted, in characters (recall/deck.ts MAX_ANSWER, with room). */
export const MAX_EXPLANATION = 8000;
/** Largest save accepted, in characters of JSON. */
export const MAX_DRAFT_BODY = 2 * 1024 * 1024;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Accept a decoded request body only if it is a complete save. */
export function parseDraftSave(value: unknown): DraftSave | null {
  if (!isObject(value) || typeof value.page !== "string" || typeof value.text !== "string") return null;
  if (value.was !== null && typeof value.was !== "string") return null;
  if (value.text.length > MAX_DRAFT || !Array.isArray(value.explanations) || value.explanations.length > MAX_EXPLANATIONS) return null;
  const explanations: KeptText[] = [];
  for (const e of value.explanations) {
    if (!isObject(e) || typeof e.lesson !== "string" || !SLUG.test(e.lesson) || typeof e.text !== "string") return null;
    if (e.text.length > MAX_EXPLANATION) return null;
    explanations.push({ lesson: e.lesson, text: e.text });
  }
  return { page: value.page, was: value.was, text: value.text, explanations };
}

/** A draft as its file holds it: trailing space trimmed, ending in a newline. */
export const toFile = (text: string): string => text.replace(/\s+$/, "") + "\n";
/** A draft file's text as the tab shows it. */
export const fromFile = (content: string): string => content.replace(/\n$/, "");

/** A lesson's explanation as its file holds it. */
export function explanationContent(text: string): string {
  return `<!-- Written in this lesson's Explain tab, and kept here by the draft tab (src/dev/drafts) each time a draft is saved. -->\n\n${toFile(text)}`;
}

/** The files a save of `save` reads and may write, or null when its page shows no lesson. */
export function filesOfSave(save: DraftSave): string[] | null {
  const lesson = lessonOf(save.page);
  if (!lesson) return null;
  return [...new Set([draftFile(lesson.slug), ...kept(save).map((e) => explanationFile(e.lesson))])];
}

/** The explanations a save keeps: those with something written. */
const kept = (save: DraftSave): KeptText[] => save.explanations.filter((e) => e.text.trim() !== "");

export type DraftWrites = { ok: true; written: Map<string, string>; message: string } | { ok: false; status: number; error: string };

/**
 * What saving `save` writes, given each file it reads as it is now
 * (`current`, null for one there is none of): the draft, unless it is blank,
 * and each explanation, where they differ from what is there. Refused when
 * the draft has changed since the author began.
 */
export function draftWrites(save: DraftSave, current: ReadonlyMap<string, string | null>): DraftWrites {
  const lesson = lessonOf(save.page);
  if (!lesson) return { ok: false, status: 404, error: "This page shows no lesson." };
  const file = draftFile(lesson.slug);
  const now = current.get(file) ?? null;
  if ((now === null ? null : fromFile(now)) !== save.was) {
    return { ok: false, status: 409, error: "The draft has been saved from elsewhere since you began. Copy your text somewhere safe and reload the page." };
  }
  const written = new Map<string, string>();
  if (save.text.trim() !== "" && toFile(save.text) !== now) written.set(file, toFile(save.text));
  for (const e of kept(save)) {
    const path = explanationFile(e.lesson);
    const content = explanationContent(e.text);
    if (content !== (current.get(path) ?? null)) written.set(path, content);
  }
  const drafted = written.has(file);
  const explained = [...written.keys()].filter((f) => f !== file).length;
  const what = [drafted ? `Draft the text of ${lesson.slug}` : null, explained ? `keep ${explained} explanation${explained === 1 ? "" : "s"}` : null].filter(Boolean).join(", and ");
  const message = `${what.charAt(0).toUpperCase()}${what.slice(1)}\n\nMade with the draft tab on staging.\n`;
  return { ok: true, written, message };
}
