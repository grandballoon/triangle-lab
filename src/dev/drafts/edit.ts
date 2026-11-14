// The draft tab's state and every decision it makes, as pure functions over
// values: the draft as kept in the repository, the author's text over it,
// and what a save sends. pane.ts holds a DraftState, renders it, and does the
// I/O (the save, keeping the text in this browser until it is saved).

import type { Deck } from "../../recall/deck.ts";
import type { DraftListing, DraftSave, KeptText } from "./wire.ts";

export interface DraftState {
  listing: DraftListing;
  /** The text as the author has it. */
  text: string;
}

/** Text kept in this browser while unsaved, with the saved draft it was written over. */
export interface Unsaved {
  base: string | null;
  text: string;
}

const saved = (listing: DraftListing): string => listing.text ?? "";

/**
 * The tab on `listing`, with the text `kept` in this browser from before when
 * it is unsaved; and whether the saved draft has changed under that text
 * since, so a save would replace a draft saved elsewhere.
 */
export function openDraft(listing: DraftListing, kept: unknown = null): { state: DraftState; replaces: boolean } {
  const { base, text } = (kept ?? {}) as Record<string, unknown>;
  const unsaved = typeof text === "string" && (base === null || typeof base === "string") && text !== saved(listing);
  if (!unsaved) return { state: { listing, text: saved(listing) }, replaces: false };
  return { state: { listing, text: text as string }, replaces: base !== listing.text };
}

export const editDraft = (state: DraftState, text: string): DraftState => (text === state.text ? state : { ...state, text });

/** Whether the text differs from the draft as saved. */
export const unsaved = (state: DraftState): boolean => state.text !== saved(state.listing);

/** Whether there is a draft to save: text that differs from the draft as saved, and is not blank, as a blank draft is never written (wire.ts). */
export const canSave = (state: DraftState): boolean => unsaved(state) && state.text.trim() !== "";

/** What to keep in this browser: the unsaved text, or nothing. */
export const keptOf = (state: DraftState): Unsaved | null => (unsaved(state) ? { base: state.listing.text, text: state.text } : null);

/** Every explanation `deck` holds with something written, by lesson. */
export const explanationsIn = (deck: Deck): KeptText[] =>
  (deck.explanations ?? []).filter((e) => e.text.trim() !== "").map(({ lesson, text }) => ({ lesson, text }));

/** The save of the draft as it stands, with the explanations in `deck`. */
export function saveOf(state: DraftState, page: string, deck: Deck): DraftSave {
  return { page, was: state.listing.text, text: state.text, explanations: explanationsIn(deck) };
}

/**
 * The tab after a save of `sent`: the draft now reads as sent, and what was
 * typed during the save stays. A blank draft is not written (wire.ts), so its
 * save leaves the tab as it was.
 */
export function afterSave(state: DraftState, sent: DraftSave): DraftState {
  if (sent.text.trim() === "") return state;
  const text = sent.text.replace(/\s+$/, "");
  return { listing: { ...state.listing, text }, text: state.text === sent.text ? text : state.text };
}

/** A block of the draft's preview: a heading, by its level, or a paragraph. */
export type Block = { kind: "heading"; level: 1 | 2 | 3; text: string } | { kind: "paragraph"; text: string };

/**
 * The draft as blocks to preview: paragraphs split at blank lines, and a
 * line starting with one to three `#` a heading. The rest of Markdown is
 * left as typed; the preview is to read the mathematics by.
 */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.length) blocks.push({ kind: "paragraph", text: lines.join(" ") });
    lines = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (line === "") flush();
    else lines.push(line);
  }
  flush();
  return blocks;
}
