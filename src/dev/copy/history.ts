// What the copy editor keeps of the text it replaces: every save adds to its
// lesson's history file (copy-history/<slug>.json) what each changed field
// read before and after, so the original wording stays in the repository
// beside the source, not only in git's history. A field's original is the
// `was` of its first change.
//
// The history file is written with the source it records, in the same write
// on the dev server (tools/copy-editor-plugin.ts) and the same commit on
// staging (worker/staging.ts). Pure, and shared by both, so it stays free of
// DOM and Node APIs.

import { fieldId, type FieldId } from "./check.ts";
import { entryName } from "./source.ts";
import { FIELDS, type EntryEdit } from "./wire.ts";

/** Where the history files are, relative to the project root. */
export const HISTORY_DIR = "copy-history";

/** The history file of lesson `slug`. */
export const historyFile = (slug: string): string => `${HISTORY_DIR}/${slug}.json`;

/** One field changed by a save. */
export interface Change {
  field: FieldId;
  /** The entry, as the author sees it named when saving: "step 2". */
  entry: string;
  was: string;
  now: string;
}

/** One save, and when it was made. */
export interface Save {
  /** An ISO 8601 time. */
  saved: string;
  changes: Change[];
}

/** A lesson's history file. */
export interface History {
  lesson: string;
  /** Oldest first. */
  saves: Save[];
}

/** The fields `edits` change, each from what it read when listed. */
export function changesOf(edits: readonly EntryEdit[]): Change[] {
  return edits.flatMap((edit) =>
    FIELDS.flatMap((field): Change[] => {
      const was = edit.was[field];
      const now = edit.to[field];
      if (now === undefined || was === null || was === now) return [];
      return [{ field: fieldId(edit.section, edit.index, field), entry: entryName(edit.section, edit.index), was, now }];
    }),
  );
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Read a history file, or null if `text` is not one. */
export function readHistory(text: string): History | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw) || typeof raw.lesson !== "string" || !Array.isArray(raw.saves)) return null;
  const saves = raw.saves as unknown[];
  const ok = saves.every((s) => isObject(s) && typeof s.saved === "string" && Array.isArray(s.changes));
  return ok ? { lesson: raw.lesson, saves: saves as Save[] } : null;
}

export type Recorded = { ok: true; text: string | null } | { ok: false; error: string };

/**
 * Lesson `slug`'s history file with a save of `edits` at `saved` added: the
 * text to write, or null when the save changes nothing; refused when the file
 * there (`existing`, null when there is none) cannot be read, rather than
 * written over.
 */
export function recordSave(existing: string | null, slug: string, edits: readonly EntryEdit[], saved: string): Recorded {
  const history = existing === null ? { lesson: slug, saves: [] } : readHistory(existing);
  if (!history) return { ok: false, error: `${historyFile(slug)} is not a copy history; mend it by hand before saving.` };
  const changes = changesOf(edits);
  if (changes.length === 0) return { ok: true, text: null };
  const next: History = { lesson: history.lesson, saves: [...history.saves, { saved, changes }] };
  return { ok: true, text: JSON.stringify(next, null, 2) + "\n" };
}
