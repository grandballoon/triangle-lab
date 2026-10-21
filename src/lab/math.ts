// Typeset mathematics for the formula panel and the step text. Lessons write
// LaTeX; KaTeX turns it into HTML. `strict` makes a malformed expression throw
// instead of rendering as red source text — the lesson tests use it so a typo
// fails the build rather than reaching the screen.

import katex from "katex";

// `\htmlData` is how formulas mark their terms (scene.ts `term`); it is the
// only HTML extension let through, and using it is not a strictness warning.
const KATEX_OPTIONS = {
  displayMode: false,
  trust: (context: { command: string }) => context.command === "\\htmlData",
  strict: (code: string) => (code === "htmlExtension" ? "ignore" : "warn"),
} as const;

export function texHtml(tex: string, strict = false): string {
  return katex.renderToString(tex, { ...KATEX_OPTIONS, throwOnError: strict });
}

/** Prose with `$…$` runs of LaTeX, as safe HTML. */
export function richHtml(text: string, strict = false): string {
  const parts = text.split("$");
  if (strict && parts.length % 2 === 0) throw new Error(`Unbalanced $ in: ${text}`);
  return parts.map((part, i) => (i % 2 === 1 ? texHtml(part, strict) : escapeHtml(part))).join("");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
