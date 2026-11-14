// Having Claude fact-check a lesson's copy as drafted in the copy editor: what
// the page sends (CheckRequest) and what comes back (CopyCheck), with the
// rules both ends read them by. Claude's remarks sit on the words they quote,
// as on an explanation (recall/remarks.ts), each with the words to put there
// instead where it has them.
//
// The request to Claude is worker/copy-check.ts's; the dev server and the
// staging Worker both make it. Shared by the page and both, so it stays free
// of DOM and Node APIs.

import { FIELDS, SECTIONS, type Field, type Section } from "./wire.ts";

/** A field of the copy, named as `steps.2.text`. */
export type FieldId = `${Section}.${number}.${Field}`;

export const fieldId = (section: Section, index: number, field: Field): FieldId => `${section}.${index}.${field}`;

/** The section, entry and field a field id names, or null if it names none. */
export function readFieldId(id: string): { section: Section; index: number; field: Field } | null {
  const [section, index, field, ...rest] = id.split(".");
  const n = Number(index);
  if (rest.length || !(SECTIONS as readonly string[]).includes(section) || !(FIELDS as readonly string[]).includes(field)) return null;
  return Number.isInteger(n) && n >= 0 && String(n) === index ? { section: section as Section, index: n, field: field as Field } : null;
}

/** One field of the copy as drafted. */
export interface CheckedField {
  id: FieldId;
  text: string;
}

/** What the page sends to have the copy fact-checked. */
export interface CheckRequest {
  /** The page the copy is on, from which the lesson is known. */
  page: string;
  /** Every field the editor can change, as drafted, in reading order. */
  fields: CheckedField[];
}

/** A remark of Claude's on some words of one field. */
export interface CopyRemark {
  field: FieldId;
  /** The words it is about, as written in the field. */
  quote: string;
  /** What is wrong there, in a sentence. */
  note: string;
  /** Words to put in place of the quote, or "" where the fix is the author's to word. */
  fix: string;
}

/** Claude's fact-check of the copy. */
export interface CopyCheck {
  /** A few sentences on the copy as a whole. */
  summary: string;
  remarks: CopyRemark[];
}

/** Longest a field may be, in characters. */
export const MAX_FIELD = 4000;
/** Most fields a check may carry. */
export const MAX_FIELDS = 300;
/** Largest request accepted, in characters of JSON. */
export const MAX_CHECK_BODY = 256 * 1024;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Read a request to fact-check copy, or null if `raw` is not one. */
export function readCheckRequest(raw: unknown): CheckRequest | null {
  if (!isObject(raw) || typeof raw.page !== "string" || !Array.isArray(raw.fields)) return null;
  if (raw.fields.length === 0 || raw.fields.length > MAX_FIELDS) return null;
  const fields: CheckedField[] = [];
  for (const f of raw.fields) {
    if (!isObject(f) || typeof f.id !== "string" || !readFieldId(f.id) || typeof f.text !== "string") return null;
    fields.push({ id: f.id as FieldId, text: f.text.slice(0, MAX_FIELD) });
  }
  return { page: raw.page, fields };
}

/**
 * Read a fact-check, or null if `raw` is not one. A remark on a field the
 * request did not carry (`known`), or without words to sit on, is dropped.
 */
export function readCopyCheck(raw: unknown, known: ReadonlySet<string>): CopyCheck | null {
  if (!isObject(raw) || typeof raw.summary !== "string" || !Array.isArray(raw.remarks)) return null;
  const remarks = raw.remarks.flatMap((r): CopyRemark[] => {
    if (!isObject(r) || typeof r.field !== "string" || !known.has(r.field)) return [];
    if (typeof r.quote !== "string" || !r.quote.trim() || typeof r.note !== "string") return [];
    return [{ field: r.field as FieldId, quote: r.quote, note: r.note, fix: typeof r.fix === "string" ? r.fix : "" }];
  });
  return { summary: raw.summary, remarks };
}
