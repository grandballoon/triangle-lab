// Gives every page on the dev server the recall sync key of the Worker it
// talks to, the one `npm run preview` runs: RECALL_KEY in `file` (the
// project's .dev.vars). Then syncing, and Claude checking answers, work as
// soon as a page opens, with no key entered. Applies to `vite dev` only, so
// builds never contain the key.
//
// The file is read again for each page, so a changed key needs no restart.
// The key is put in the page's storage before its own scripts run, every
// time, so forgetting the key on the recall page lasts until a reload.

import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { SYNC_KEY_STORAGE } from "../src/recall/remote.ts";
import { devVar } from "./dev-vars.ts";

export { devVar };

/** A script that keeps `key` as this browser's sync key. */
export function keyScript(key: string): string {
  // `<` escaped, so nothing in the key can close the script.
  const args = JSON.stringify([SYNC_KEY_STORAGE, key]).replace(/</g, "\\u003c");
  return `try { localStorage.setItem(...${args}); } catch {}`;
}

/** The key is RECALL_KEY in `file`, an absolute path; with no such file or key, pages are left as they are. */
export function devSyncKey(file: string): Plugin {
  return {
    name: "dev-sync-key",
    apply: "serve",
    async transformIndexHtml() {
      const key = devVar(await readFile(file, "utf8").catch(() => ""), "RECALL_KEY");
      return key ? [{ tag: "script", children: keyScript(key), injectTo: "head-prepend" }] : [];
    },
  };
}
