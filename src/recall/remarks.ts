// Claude's remarks on an answer, placed on the words they quote, as comments
// are on a document: the recall page highlights those words in the answer
// and shows each remark beside them, or under the answer on a narrow screen.
//
// The answer can be edited while the remarks are shown, so they are placed
// afresh against the text as it stands: a remark whose words the learner has
// changed is no longer on the text, which is how they see it dealt with.
//
// Pure: where each remark goes, the text split into the runs to highlight,
// the remark under the caret, and where the remarks go down the margin.

import type { Remark } from "./deck.ts";

/** Where a remark's words are in the text, as offsets; null once they are not there. */
export type Place = { start: number; end: number } | null;

/**
 * Where each of `remarks` is in `text`: the first place its quote is that no
 * earlier remark has taken. Spaces and line breaks in a quote match any run
 * of them, since Claude may not copy those exactly.
 */
export function placeRemarks(text: string, remarks: readonly Remark[]): Place[] {
  const taken: { start: number; end: number }[] = [];
  return remarks.map(({ quote }) => {
    const words = quote.trim().split(/\s+/).map(escape).join("\\s+");
    const pattern = new RegExp(words, "g");
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const at = { start: match.index, end: match.index + match[0].length };
      if (taken.every((t) => at.end <= t.start || at.start >= t.end)) {
        taken.push(at);
        return at;
      }
      pattern.lastIndex = match.index + 1;
    }
    return null;
  });
}

/** A stretch of the text, under the remark it is marked with, if any. */
export interface Run {
  text: string;
  /** The index of the remark these words are under, or null. */
  remark: number | null;
}

/** `text` cut into runs at the places of its remarks, in order. */
export function runsOf(text: string, places: readonly Place[]): Run[] {
  const marked = places
    .map((place, remark) => (place ? { ...place, remark } : null))
    .filter((p) => p !== null)
    .sort((a, b) => a.start - b.start);
  const runs: Run[] = [];
  let at = 0;
  for (const { start, end, remark } of marked) {
    if (start > at) runs.push({ text: text.slice(at, start), remark: null });
    runs.push({ text: text.slice(start, end), remark });
    at = end;
  }
  if (at < text.length || runs.length === 0) runs.push({ text: text.slice(at), remark: null });
  return runs;
}

/** The remark whose words the caret is in or at the edge of, or null. */
export function remarkAt(places: readonly Place[], caret: number): number | null {
  const found = places.findIndex((p) => p !== null && caret >= p.start && caret <= p.end);
  return found === -1 ? null : found;
}

/**
 * Where boxes go down a margin, each as near as it can be to where it is
 * wanted without overlapping the one before it: `wanted` the tops asked for,
 * in the order the boxes are to go, and `heights` theirs.
 */
export function stack(wanted: readonly number[], heights: readonly number[], gap: number): number[] {
  const tops: number[] = [];
  let below = 0;
  wanted.forEach((top, i) => {
    const at = Math.max(top, i === 0 ? 0 : below + gap);
    tops.push(at);
    below = at + heights[i];
  });
  return tops;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
