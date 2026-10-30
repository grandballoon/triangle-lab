// What the step editor makes of a draft as it is typed: the text it would
// save, the step text typeset as the column will show it, and what is wrong
// with it, if anything. The rules are the lesson tests' (lessons.test.ts):
// titles are plain text, and step text must typeset strictly.

import { linkTex } from "../../lab/link.ts";
import { richHtml } from "../../lab/math.ts";
import type { Field } from "./wire.ts";

export interface Draft {
  /** The text a save would write: one line, trimmed. */
  value: string;
  /** Step text as it will read in the column; null for a title. */
  preview: string | null;
  /** Why it cannot be saved, or null. */
  problem: string | null;
}

export function draft(field: Field, typed: string): Draft {
  const value = typed.replace(/\s*[\r\n]+\s*/g, " ").trim();
  if (value === "") return { value, preview: field === "text" ? "" : null, problem: `The ${field} cannot be empty.` };
  if (field === "title") {
    return { value, preview: null, problem: value.includes("$") ? "Titles are plain text, without $…$." : null };
  }
  try {
    return { value, preview: richHtml(value, true, linkTex), problem: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { value, preview: richHtml(value, false, linkTex), problem: message };
  }
}
