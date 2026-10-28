// Reading the project's .dev.vars, where the local Worker's secrets are kept
// (wrangler.jsonc): the dev server's sync key (sync-key-plugin.ts) and the
// Claude API key the syllabus refresh uses (syllabus.ts).

/** The value `name` is given in `text`, a .dev.vars file, or null if none. */
export function devVar(text: string, name: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1] !== name) continue;
    const quoted = /^(["'])(.*)\1$/.exec(match[2]);
    return quoted ? quoted[2] : match[2];
  }
  return null;
}
