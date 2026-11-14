// What the dev-server plugins that answer the dev-only tabs share
// (copy-editor-plugin.ts, drafts-plugin.ts): reading a request's JSON body,
// answering in JSON, and telling a missing file from a failed read.

import type { IncomingMessage, ServerResponse } from "node:http";

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

/** The request's body as JSON, or null when it is not JSON or longer than `limit` characters. */
export async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  try {
    return JSON.parse(await readBody(req, limit));
  } catch {
    return null;
  }
}

export function reply(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/** Whether `err` says the file is not there. */
export const missing = (err: unknown): boolean => (err as NodeJS.ErrnoException).code === "ENOENT";
