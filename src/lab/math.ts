// Typeset mathematics for the formula panel and the step text. Lessons write
// LaTeX; KaTeX turns it into HTML. `strict` makes a malformed expression throw
// instead of rendering as red source text — the lesson tests use it so a typo
// fails the build rather than reaching the screen.

import katex from "katex";

// `\htmlData` is how formulas mark their terms (scene.ts `term`, link.ts) and
// `\htmlClass` how the formula band greys numbers mid-drag (hold.ts); they are
// the only HTML extensions let through, and using them is not a strictness
// warning.
const TRUSTED = new Set(["\\htmlData", "\\htmlClass"]);
const KATEX_OPTIONS = {
  displayMode: false,
  trust: (context: { command: string }) => TRUSTED.has(context.command),
  strict: (code: string) => (code === "htmlExtension" ? "ignore" : "warn"),
} as const;

export function texHtml(tex: string, strict = false): string {
  return katex.renderToString(tex, { ...KATEX_OPTIONS, throwOnError: strict });
}

/**
 * Prose with `$…$` runs of LaTeX, as safe HTML. `prepare` rewrites each run
 * before it is typeset (link.ts `linkTex`).
 */
export function richHtml(text: string, strict = false, prepare: (tex: string) => string = (tex) => tex): string {
  const parts = text.split("$");
  if (strict && parts.length % 2 === 0) throw new Error(`Unbalanced $ in: ${text}`);
  return parts.map((part, i) => (i % 2 === 1 ? texHtml(prepare(part), strict) : escapeHtml(part))).join("");
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
