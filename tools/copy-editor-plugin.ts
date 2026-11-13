// Dev-server half of the copy editor (src/dev/copy/pane.ts): injects the
// editor into every page, lists a page's copy as its source writes it, writes
// edits back into that source, and has Claude fact-check the copy as drafted.
// The finding and rewriting are pure (src/dev/copy/source.ts), and so is the
// request to Claude (worker/copy-check.ts); this only reads and writes files
// and makes the call. The editor is in pages under `vite dev` and in the
// staging build (devTools, staging-mode.ts), where the staging Worker serves
// its endpoints instead; a production build never contains it.
//
// Writing the files is the whole save: Vite sees the change and reloads the
// page, which then shows the copy as the source now has it. The fact-check
// calls Claude with the ANTHROPIC_API_KEY in .dev.vars, as the local Worker
// does.

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Plugin } from "vite";
import { devVar } from "./dev-vars.ts";
import { devTools } from "./staging-mode.ts";
import { askCopyCheck } from "../worker/copy-check.ts";
import { MAX_CHECK_BODY } from "../src/dev/copy/check.ts";
import { CHECK_ENDPOINT, COPY_ENDPOINT, parseCopyEdit, SECTIONS, type CopyListing, type SaveReply } from "../src/dev/copy/wire.ts";
import { entriesIn, filesOf, homesOf, listing, rewriteFile } from "../src/dev/copy/source.ts";

const EDITOR = "/src/dev/copy/pane.ts";
const MAX_SAVE_BODY = 256 * 1024;

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > limit) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  try {
    return JSON.parse(await readBody(req, limit));
  } catch {
    return null;
  }
}

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

const missing = (err: unknown) => (err as NodeJS.ErrnoException).code === "ENOENT";

/**
 * Copy is read from and written to the source files under `root`, the
 * project; `claude` makes the fact-check's calls, by default with the key in
 * `root`'s .dev.vars.
 */
export function copyEditor(root: string, claude: () => Promise<Anthropic | null> = () => clientFrom(root)): Plugin {
  // Saves run one at a time, so two quick saves both land.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: "copy-editor",
    apply: devTools,
    transformIndexHtml: {
      // Before Vite reads the page's scripts, so a staging build bundles it.
      order: "pre",
      handler: () => [{ tag: "script", attrs: { type: "module", src: EDITOR }, injectTo: "body" }],
    },
    configureServer(server) {
      server.middlewares.use(CHECK_ENDPOINT, async (req, res) => {
        if (req.method !== "POST") return reply(res, 405, { error: "POST only." });
        const client = await claude();
        if (!client) return reply(res, 503, { error: "Set ANTHROPIC_API_KEY in .dev.vars to have Claude check the copy." });
        const outcome = await askCopyCheck(await readJson(req, MAX_CHECK_BODY), (params) => client.beta.messages.stream(params).finalMessage());
        return "check" in outcome ? reply(res, 200, outcome.check) : reply(res, outcome.status, { error: outcome.error });
      });

      // After the check's, whose path is under this one and which answers every request to it.
      server.middlewares.use(COPY_ENDPOINT, async (req, res) => {
        if (req.method === "GET") {
          const page = new URL(req.url ?? "", "http://dev").searchParams.get("page") ?? "";
          const homes = homesOf(page);
          if (!homes) return reply(res, 404, { error: "This page has no copy." });
          try {
            const texts = new Map<string, string>();
            for (const file of filesOf(homes)) texts.set(file, await readFile(join(root, file), "utf8"));
            const body = Object.fromEntries(
              SECTIONS.map((s) => [s, { file: homes[s].file, entries: listing(entriesIn(texts.get(homes[s].file)!, homes[s], s)) }]),
            ) as CopyListing;
            return reply(res, 200, body);
          } catch (err) {
            return reply(res, missing(err) ? 404 : 500, { error: "Could not read the lesson's source." });
          }
        }
        if (req.method !== "POST") return reply(res, 405, { error: "GET or POST only." });

        const edit = parseCopyEdit(await readJson(req, MAX_SAVE_BODY));
        if (!edit) return reply(res, 400, { error: "Not a set of copy edits." });
        const homes = homesOf(edit.page);
        if (!homes) return reply(res, 404, { error: "This page has no copy." });

        const save = queue.then(async () => {
          // Every file is rewritten before any is written, so a refused edit leaves them all alone.
          const written = new Map<string, string>();
          for (const file of filesOf(homes)) {
            const result = rewriteFile(await readFile(join(root, file), "utf8"), file, homes, edit.edits);
            if (!result.ok) return result;
            if (result.changed) written.set(file, result.source);
          }
          for (const [file, text] of written) await writeFile(join(root, file), text);
          return { ok: true as const, files: [...written.keys()] };
        });
        queue = save.catch(() => {});
        try {
          const result = await save;
          if (!result.ok) return reply(res, 409, { error: result.error });
          const body: SaveReply = { files: result.files, commit: null };
          return reply(res, 200, body);
        } catch (err) {
          if (missing(err)) return reply(res, 404, { error: "The lesson's source file is missing." });
          server.config.logger.error(`copy-editor: ${String(err)}`);
          return reply(res, 500, { error: "Could not write the lesson's source." });
        }
      });
    },
  };
}

/** A client with the Claude API key in `root`'s .dev.vars, or null without one. */
async function clientFrom(root: string): Promise<Anthropic | null> {
  const vars = await readFile(join(root, ".dev.vars"), "utf8").catch(() => "");
  const apiKey = devVar(vars, "ANTHROPIC_API_KEY");
  return apiKey ? new Anthropic({ apiKey }) : null;
}
