// Dev-server half of the draft tab (src/dev/drafts/pane.ts): injects the tab
// into every page, reads a lesson's draft, and writes a save of it, with the
// author's Explain tab text, into lesson-drafts/. What a save writes is
// decided purely (src/dev/drafts/wire.ts, draftWrites); this only reads and
// writes the files. The tab is in pages under `vite dev` and in the staging
// build (devTools, staging-mode.ts), where the staging Worker serves its
// endpoint instead; a production build never contains it.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { missing, readJson, reply } from "./http.ts";
import { devTools } from "./staging-mode.ts";
import { lessonOf } from "../src/dev/lesson.ts";
import {
  draftFile,
  draftWrites,
  DRAFTS_ENDPOINT,
  filesOfSave,
  fromFile,
  MAX_DRAFT_BODY,
  parseDraftSave,
  type DraftListing,
  type DraftReply,
} from "../src/dev/drafts/wire.ts";

const TAB = "/src/dev/drafts/pane.ts";

/** Drafts are kept under `root`, the project. */
export function drafts(root: string): Plugin {
  // Saves run one at a time, so a save always reads what the one before wrote.
  let queue: Promise<unknown> = Promise.resolve();

  /** The file's text, or null when there is none. */
  const read = (file: string): Promise<string | null> =>
    readFile(join(root, file), "utf8").catch((err) => (missing(err) ? null : Promise.reject(err)));

  return {
    name: "drafts",
    apply: devTools,
    transformIndexHtml: {
      // Before Vite reads the page's scripts, so a staging build bundles it.
      order: "pre",
      handler: () => [{ tag: "script", attrs: { type: "module", src: TAB }, injectTo: "body" }],
    },
    configureServer(server) {
      server.middlewares.use(DRAFTS_ENDPOINT, async (req, res) => {
        if (req.method === "GET") {
          const lesson = lessonOf(new URL(req.url ?? "", "http://dev").searchParams.get("page") ?? "");
          if (!lesson) return reply(res, 404, { error: "This page shows no lesson." });
          try {
            const file = draftFile(lesson.slug);
            const text = await read(file);
            const body: DraftListing = { lesson: lesson.slug, file, text: text === null ? null : fromFile(text) };
            return reply(res, 200, body);
          } catch {
            return reply(res, 500, { error: "Could not read the draft." });
          }
        }
        if (req.method !== "POST") return reply(res, 405, { error: "GET or POST only." });

        const save = parseDraftSave(await readJson(req, MAX_DRAFT_BODY));
        if (!save) return reply(res, 400, { error: "Not a draft to save." });
        const files = filesOfSave(save);
        if (!files) return reply(res, 404, { error: "This page shows no lesson." });

        const done = queue.then(async () => {
          const current = new Map<string, string | null>();
          for (const file of files) current.set(file, await read(file));
          const writes = draftWrites(save, current);
          if (!writes.ok) return writes;
          for (const [file, text] of writes.written) {
            await mkdir(dirname(join(root, file)), { recursive: true });
            await writeFile(join(root, file), text);
          }
          return { ok: true as const, files: [...writes.written.keys()] };
        });
        queue = done.catch(() => {});
        try {
          const result = await done;
          if (!result.ok) return reply(res, result.status, { error: result.error });
          const body: DraftReply = { files: result.files, commit: null };
          return reply(res, 200, body);
        } catch (err) {
          server.config.logger.error(`drafts: ${String(err)}`);
          return reply(res, 500, { error: "Could not write the draft." });
        }
      });
    },
  };
}
