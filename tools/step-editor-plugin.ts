// Dev-server half of the step editor (src/dev/steps/editor.ts): injects the
// editor into every page, lists a page's steps as its source writes them, and
// writes an edited step back into that source. The finding and rewriting are
// pure (src/dev/steps/source.ts); this only reads and writes files. The
// editor is in pages under `vite dev` and in the staging build (devTools,
// staging-mode.ts), where the staging Worker serves its endpoint instead; a
// production build never contains it.
//
// Writing the file is the whole save: Vite sees the change and reloads the
// page, which then shows the step as the source now has it.

import { readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Plugin } from "vite";
import { devTools } from "./staging-mode.ts";
import { parseEdit, STEPS_ENDPOINT, type Listing, type SaveReply } from "../src/dev/steps/wire.ts";
import { homeOf, listing, rewriteStep, stepsIn } from "../src/dev/steps/source.ts";

const EDITOR = "/src/dev/steps/editor.ts";
const MAX_BODY = 64 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

const missing = (err: unknown) => (err as NodeJS.ErrnoException).code === "ENOENT";

/** Steps are read from and written to the source files under `root`, the project. */
export function stepEditor(root: string): Plugin {
  // Saves run one at a time, so two quick edits to one file both land.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: "step-editor",
    apply: devTools,
    transformIndexHtml: {
      // Before Vite reads the page's scripts, so a staging build bundles it.
      order: "pre",
      handler: () => [{ tag: "script", attrs: { type: "module", src: EDITOR }, injectTo: "body" }],
    },
    configureServer(server) {
      server.middlewares.use(STEPS_ENDPOINT, async (req, res) => {
        if (req.method === "GET") {
          const page = new URL(req.url ?? "", "http://dev").searchParams.get("page") ?? "";
          const home = homeOf(page);
          if (!home) return reply(res, 404, { error: "This page has no steps." });
          try {
            const source = await readFile(join(root, home.file), "utf8");
            const body: Listing = { file: home.file, steps: listing(stepsIn(source, home.key)) };
            return reply(res, 200, body);
          } catch (err) {
            return reply(res, missing(err) ? 404 : 500, { error: `Could not read ${home.file}.` });
          }
        }
        if (req.method !== "POST") return reply(res, 405, { error: "GET or POST only." });

        let edit;
        try {
          edit = parseEdit(JSON.parse(await readBody(req)));
        } catch {
          edit = null;
        }
        if (!edit) return reply(res, 400, { error: "Not a step edit." });
        const home = homeOf(edit.page);
        if (!home) return reply(res, 404, { error: "This page has no steps." });
        const path = join(root, home.file);

        const save = queue.then(async () => {
          const result = rewriteStep(await readFile(path, "utf8"), home.key, edit);
          if (result.ok && result.changed) await writeFile(path, result.source);
          return result;
        });
        queue = save.catch(() => {});
        try {
          const result = await save;
          if (!result.ok) return reply(res, 409, { error: result.error });
          const body: SaveReply = { file: home.file, changed: result.changed, commit: null };
          return reply(res, 200, body);
        } catch (err) {
          if (missing(err)) return reply(res, 404, { error: `There is no ${home.file}.` });
          server.config.logger.error(`step-editor: ${String(err)}`);
          return reply(res, 500, { error: `Could not write ${home.file}.` });
        }
      });
    },
  };
}
