// The step editor's wire format, as the page (editor.ts) exchanges it with the
// dev server (tools/step-editor-plugin.ts) or the staging Worker
// (worker/staging.ts). Shared by all three, so it stays free of DOM and Node
// APIs.

/** Where the editor reads a page's steps (GET `?page=`) and saves an edit (POST). */
export const STEPS_ENDPOINT = "/__step-source";

export type Field = "title" | "text";

/**
 * One step as its source writes it: each field's text when the source has it
 * as a plain string literal, or null when code builds it and it can only be
 * changed by hand.
 */
export interface SourceStep {
  title: string | null;
  text: string | null;
}

/** A page's steps, from the file that holds them. */
export interface Listing {
  /** The source file, relative to the project root. */
  file: string;
  steps: SourceStep[];
}

export interface StepEdit {
  /** Path and query of the page, e.g. `/lab.html?lesson=slope` or `/angles.html`. */
  page: string;
  /** The step's place in the page's list. */
  step: number;
  /** The step as the listing showed it, so the edit lands on that step and no other. */
  was: SourceStep;
  field: Field;
  /** The new text, which may hold `$…$` LaTeX. */
  to: string;
}

/** What a save did. */
export interface SaveReply {
  /** The source file, relative to the project root. */
  file: string;
  /** False when the step already read so, and nothing was written. */
  changed: boolean;
  /**
   * Where the edit was committed, on staging; null on the dev server, which
   * wrote the file itself and is about to reload the page.
   */
  commit: string | null;
}

const isText = (v: unknown): v is string | null => v === null || typeof v === "string";

/** Accept a decoded request body only if it is a complete edit. */
export function parseEdit(value: unknown): StepEdit | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  const was = e.was as Record<string, unknown> | null;
  const ok =
    typeof e.page === "string" &&
    Number.isInteger(e.step) && (e.step as number) >= 0 &&
    typeof was === "object" && was !== null && isText(was.title) && isText(was.text) &&
    (e.field === "title" || e.field === "text") &&
    typeof e.to === "string" && e.to.trim() !== "";
  if (!ok) return null;
  return {
    page: e.page as string,
    step: e.step as number,
    was: { title: was.title as string | null, text: was.text as string | null },
    field: e.field as Field,
    to: (e.to as string).trim(),
  };
}

/**
 * Which of a listing's steps a shown step is, by its title: the step at the
 * same place when the titles agree, otherwise the only one with that title.
 * Null when neither finds one, as when code builds the title.
 */
export function pairStep(steps: readonly SourceStep[], index: number, title: string): number | null {
  if (steps[index]?.title === title) return index;
  const same = steps.flatMap((s, i) => (s.title === title ? [i] : []));
  return same.length === 1 ? same[0] : null;
}
