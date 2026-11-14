// The copy editor's state and every decision it makes, as pure functions over
// values: the copy as the source writes it, the author's drafts over it, and
// Claude's fact-check of it. pane.ts holds a CopyState, renders it, and does
// the I/O these functions ask for (the save, the check, keeping the drafts).
//
// A draft remembers the source text it was written over (`base`), so drafts
// kept across a reload are dropped, not saved over, when the source has
// changed under them meanwhile. A check is of the copy as it was sent; its
// remarks are placed afresh on the copy as it stands (recall/remarks.ts), so a
// remark whose words have since changed shows as dealt with.

import { placeRemarks, type Place } from "../../recall/remarks.ts";
import { fieldId, type CheckedField, type CheckRequest, type CopyCheck, type CopyRemark, type FieldId } from "./check.ts";
import { draft, type Draft as Typed } from "./draft.ts";
import { FIELDS, SECTIONS, type CopyEdit, type CopyListing, type EntryEdit, type Field, type Section } from "./wire.ts";

/** One field of the copy as the source writes it. */
export interface FieldInfo {
  id: FieldId;
  section: Section;
  index: number;
  field: Field;
  /** Its text in the source, or null when code builds it and only a hand can change it. */
  source: string | null;
}

/** A field as the author has changed it, over the source text it was written on. */
export interface Draft {
  base: string;
  text: string;
}

export type Check =
  | { kind: "none" }
  | { kind: "checking"; sent: string }
  | { kind: "done"; sent: string; result: CopyCheck }
  | { kind: "failed"; sent: string; error: string };

export interface CopyState {
  listing: CopyListing;
  /** The fields changed, by id. */
  drafts: Readonly<Record<string, Draft>>;
  check: Check;
}

/** Every field of `listing`, in reading order. */
export function fieldsOf(listing: CopyListing): FieldInfo[] {
  return SECTIONS.flatMap((section) =>
    listing[section].entries.flatMap((entry, index) =>
      FIELDS.map((field) => ({ id: fieldId(section, index, field), section, index, field, source: entry[field] })),
    ),
  );
}

const sourceOf = (listing: CopyListing, id: string): FieldInfo | undefined => fieldsOf(listing).find((f) => f.id === id);

/**
 * `drafts` over `listing`: each dropped once the source reads as it does,
 * and counted as dropped when the source has changed under it.
 */
function rebase(drafts: Readonly<Record<string, Draft>>, listing: CopyListing): { drafts: Record<string, Draft>; dropped: number } {
  const kept: Record<string, Draft> = {};
  let dropped = 0;
  for (const [id, d] of Object.entries(drafts)) {
    const info = sourceOf(listing, id);
    if (!info || info.source === null) {
      dropped++;
      continue;
    }
    if (draft(info.field, d.text).value === info.source) continue;
    if (d.base === info.source) kept[id] = d;
    else dropped++;
  }
  return { drafts: kept, dropped };
}

/** Drafts as kept, or nothing if `raw` is not drafts. */
function readDrafts(raw: unknown): Record<string, Draft> {
  if (typeof raw !== "object" || raw === null) return {};
  const drafts: Record<string, Draft> = {};
  for (const [id, d] of Object.entries(raw as Record<string, unknown>)) {
    const { base, text } = (d ?? {}) as Record<string, unknown>;
    if (typeof base === "string" && typeof text === "string") drafts[id] = { base, text };
  }
  return drafts;
}

/** The editor on `listing`, with the drafts `kept` from before where they still apply; and how many did not. */
export function openCopy(listing: CopyListing, kept: unknown = null): { state: CopyState; dropped: number } {
  const { drafts, dropped } = rebase(readDrafts(kept), listing);
  return { state: { listing, drafts, check: { kind: "none" } }, dropped };
}

/** The editor on `listing`, fresh from the source, as after a save: drafts it now holds are done. */
export function reopen(state: CopyState, listing: CopyListing): { state: CopyState; dropped: number } {
  const { drafts, dropped } = rebase(state.drafts, listing);
  return { state: { ...state, listing, drafts }, dropped };
}

/** A field's text as it stands: the draft, or the source. */
export function valueOf(state: CopyState, id: string): string {
  return state.drafts[id]?.text ?? sourceOf(state.listing, id)?.source ?? "";
}

/** Change a field's text; back to the source's, it is no longer a draft. */
export function editField(state: CopyState, id: string, text: string): CopyState {
  const info = sourceOf(state.listing, id);
  if (!info || info.source === null || valueOf(state, id) === text) return state;
  const { [id]: _, ...rest } = state.drafts;
  return { ...state, drafts: text === info.source ? rest : { ...rest, [id]: { base: info.source, text } } };
}

/** Drop every draft. */
export const discardAll = (state: CopyState): CopyState => (Object.keys(state.drafts).length ? { ...state, drafts: {} } : state);

/** What a field as it stands would save as, preview as and be refused for. */
export function typedOf(state: CopyState, info: FieldInfo): Typed {
  return draft(info.field, valueOf(state, info.id));
}

/** The fields whose text would change on saving. */
export function changed(state: CopyState): FieldInfo[] {
  return fieldsOf(state.listing).filter((f) => f.source !== null && f.id in state.drafts && typedOf(state, f).value !== f.source);
}

/** The changed fields that cannot be saved as they stand, with why. */
export function problems(state: CopyState): { info: FieldInfo; problem: string }[] {
  return changed(state).flatMap((info) => {
    const { problem } = typedOf(state, info);
    return problem ? [{ info, problem }] : [];
  });
}

/** The save of every change to `page`'s copy, or null when there is none, or one cannot be saved. */
export function saveOf(state: CopyState, page: string): CopyEdit | null {
  const fields = changed(state);
  if (fields.length === 0 || problems(state).length > 0) return null;
  const edits = new Map<string, EntryEdit>();
  for (const info of fields) {
    const key = `${info.section}.${info.index}`;
    const entry = state.listing[info.section].entries[info.index];
    const edit = edits.get(key) ?? { section: info.section, index: info.index, was: entry, to: {} };
    edit.to[info.field] = typedOf(state, info).value;
    edits.set(key, edit);
  }
  return { page, edits: [...edits.values()] };
}

// --- The fact-check ---------------------------------------------------------

/** The request to fact-check `page`'s copy as it stands. */
export function checkOf(state: CopyState, page: string): CheckRequest {
  const fields: CheckedField[] = fieldsOf(state.listing)
    .filter((f) => f.source !== null)
    .map((f) => ({ id: f.id, text: typedOf(state, f).value }));
  return { page, fields };
}

const sentOf = (request: CheckRequest): string => JSON.stringify(request.fields);

/** Whether the check on show is of the copy as it stands. */
export function checkedAsItStands(state: CopyState, page: string): boolean {
  return state.check.kind !== "none" && state.check.sent === sentOf(checkOf(state, page));
}

/**
 * Ask for the copy to be checked as it stands: the state while it is, and
 * the request to send; null when it has been checked or is being checked as
 * it stands, unless that check failed.
 */
export function askCheck(state: CopyState, page: string): { state: CopyState; request: CheckRequest } | null {
  if (state.check.kind === "checking") return null;
  if (checkedAsItStands(state, page) && state.check.kind !== "failed") return null;
  const request = checkOf(state, page);
  return { state: { ...state, check: { kind: "checking", sent: sentOf(request) } }, request };
}

/** Take in what came of checking `request`: dropped if another check has been asked for since. */
export function settleCheck(state: CopyState, request: CheckRequest, outcome: { check: CopyCheck } | { error: string }): CopyState {
  const sent = sentOf(request);
  if (state.check.kind !== "checking" || state.check.sent !== sent) return state;
  return { ...state, check: "check" in outcome ? { kind: "done", sent, result: outcome.check } : { kind: "failed", sent, error: outcome.error } };
}

/** A remark of the check, where its words are in its field as it stands. */
export interface Placed {
  remark: CopyRemark;
  /** Its place in the check's list, which `applyFix` takes. */
  index: number;
  /** Where its words are, or null once they have been changed. */
  place: Place;
}

/** The check's remarks, field by field, each in the order its words come in the field. */
export function remarksOf(state: CopyState): Map<string, Placed[]> {
  const by = new Map<string, Placed[]>();
  if (state.check.kind !== "done") return by;
  const all = state.check.result.remarks.map((remark, index) => ({ remark, index }));
  for (const id of new Set(all.map((r) => r.remark.field))) {
    const mine = all.filter((r) => r.remark.field === id);
    const places = placeRemarks(valueOf(state, id), mine.map((r) => r.remark));
    const placed = mine.map((r, i) => ({ ...r, place: places[i] }));
    by.set(id, placed.sort((a, b) => (a.place?.start ?? Infinity) - (b.place?.start ?? Infinity)));
  }
  return by;
}

/** Put remark `index`'s fix in place of its words, where both still are. */
export function applyFix(state: CopyState, index: number): CopyState {
  if (state.check.kind !== "done") return state;
  const remark = state.check.result.remarks[index];
  const placed = remark && remarksOf(state).get(remark.field)?.find((p) => p.index === index);
  if (!placed?.place || !remark.fix) return state;
  const text = valueOf(state, remark.field);
  return editField(state, remark.field, text.slice(0, placed.place.start) + remark.fix + text.slice(placed.place.end));
}
