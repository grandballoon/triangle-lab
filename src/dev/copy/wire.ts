// The copy editor's wire format, as the page (pane.ts) exchanges it with the
// dev server (tools/copy-editor-plugin.ts) or the staging Worker
// (worker/staging.ts). Shared by all three, so it stays free of DOM and Node
// APIs.
//
// A lesson's copy is what it says in words: its steps, then its asides, what
// its idea is like (`likes`) and what it is for (`uses`). Each is a list of
// entries with a title and a text, in the source as object literals.

/** Where the editor reads a page's copy (GET `?page=`) and saves edits to it (POST). */
export const COPY_ENDPOINT = "/__copy";
/** Where the editor has Claude fact-check the copy as drafted (POST a CheckRequest). */
export const CHECK_ENDPOINT = "/__copy/check";

export const SECTIONS = ["steps", "likes", "uses"] as const;
export type Section = (typeof SECTIONS)[number];

export const FIELDS = ["title", "text"] as const;
export type Field = (typeof FIELDS)[number];

/**
 * One entry as its source writes it: each field's text when the source has
 * it as a plain string literal, or null when code builds it and it can only
 * be changed by hand.
 */
export interface Entry {
  title: string | null;
  text: string | null;
}

/** A page's copy, section by section, with the file each is written in. */
export type CopyListing = Record<Section, { file: string; entries: Entry[] }>;

/** New text for some of one entry's fields. */
export interface EntryEdit {
  section: Section;
  /** The entry's place in its section. */
  index: number;
  /** The entry as the listing showed it, so the edit lands on that entry and no other. */
  was: Entry;
  /** The new text of each field changed, which may hold `$…$` LaTeX in a text. */
  to: Partial<Record<Field, string>>;
}

/** Every change made to a page's copy, saved together. */
export interface CopyEdit {
  /** Path and query of the page, e.g. `/lab.html?lesson=slope` or `/angles.html`. */
  page: string;
  edits: EntryEdit[];
}

/** What a save did. */
export interface SaveReply {
  /** The source files written, relative to the project root; empty when the copy already read so. */
  files: string[];
  /**
   * Where the edits were committed, on staging; null on the dev server,
   * which wrote the files itself and is about to reload the page.
   */
  commit: string | null;
}

/** Most entries one save may change. */
export const MAX_EDITS = 200;

const isText = (v: unknown): v is string | null => v === null || typeof v === "string";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isSection = (v: unknown): v is Section => (SECTIONS as readonly unknown[]).includes(v);

function readEntryEdit(value: unknown): EntryEdit | null {
  if (!isObject(value) || !isSection(value.section)) return null;
  const { index, was, to } = value;
  if (!Number.isInteger(index) || (index as number) < 0) return null;
  if (!isObject(was) || !isText(was.title) || !isText(was.text) || !isObject(to)) return null;
  const changed: Partial<Record<Field, string>> = {};
  for (const [key, text] of Object.entries(to)) {
    if (!(FIELDS as readonly string[]).includes(key) || typeof text !== "string" || text.trim() === "") return null;
    changed[key as Field] = text.trim();
  }
  if (Object.keys(changed).length === 0) return null;
  return { section: value.section, index: index as number, was: { title: was.title, text: was.text }, to: changed };
}

/** Accept a decoded request body only if it is a complete set of edits to one page. */
export function parseCopyEdit(value: unknown): CopyEdit | null {
  if (!isObject(value) || typeof value.page !== "string" || !Array.isArray(value.edits)) return null;
  if (value.edits.length === 0 || value.edits.length > MAX_EDITS) return null;
  const edits = value.edits.map(readEntryEdit);
  return edits.every((e) => e !== null) ? { page: value.page, edits: edits as EntryEdit[] } : null;
}
