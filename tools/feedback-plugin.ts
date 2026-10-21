// Dev-server half of the UI feedback overlay (src/dev/feedback/overlay.ts):
// injects the overlay into every page and appends each comment it posts to a
// Markdown file. Applies to `vite dev` only, so builds never contain either.

import { appendFile, writeFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";
import { FEEDBACK_ENDPOINT, FEEDBACK_HEADER, formatEntry, parseEntry } from "../src/dev/feedback/entry.ts";

const OVERLAY = "/src/dev/feedback/overlay.ts";
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

/** Append a formatted entry to `file`, starting the file with its header. */
async function record(file: string, text: string): Promise<void> {
  try {
    await writeFile(file, FEEDBACK_HEADER + text, { flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    await appendFile(file, text);
  }
}

/** Comments are written to `file`, an absolute path. */
export function uiFeedback(file: string): Plugin {
  return {
    name: "ui-feedback",
    apply: "serve",
    transformIndexHtml: () => [{ tag: "script", attrs: { type: "module", src: OVERLAY }, injectTo: "body" }],
    configureServer(server) {
      server.middlewares.use(FEEDBACK_ENDPOINT, async (req, res) => {
        const reply = (status: number, text = "") => {
          res.statusCode = status;
          res.end(text);
        };
        if (req.method !== "POST") return reply(405, "POST only");
        let entry;
        try {
          entry = parseEntry(JSON.parse(await readBody(req)));
        } catch {
          entry = null;
        }
        if (!entry) return reply(400, "not a feedback entry");
        try {
          await record(file, formatEntry(entry, new Date()));
          reply(204);
        } catch (err) {
          server.config.logger.error(`ui-feedback: ${String(err)}`);
          reply(500, "could not write the feedback file");
        }
      });
    },
  };
}
