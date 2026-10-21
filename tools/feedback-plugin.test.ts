// The UI feedback plugin on a real dev server: every page gets the overlay,
// and posted comments land in the feedback file under its header.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { FEEDBACK_ENDPOINT, FEEDBACK_HEADER, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { uiFeedback } from "./feedback-plugin.ts";

let server: ViteDevServer;
let dir: string;
let file: string;
let base: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ui-feedback-"));
  file = join(dir, "ui-feedback.md");
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, ".."),
    logLevel: "silent",
    plugins: [uiFeedback(file)],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  base = server.resolvedUrls!.local[0].replace(/\/$/, "");
});

afterAll(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

const entry: FeedbackEntry = {
  comment: "Card titles wrap too early.",
  page: "/index.html",
  selector: "#menu > a.card:nth-of-type(2)",
  element: `<a class="card"> "Angles"`,
  point: { x: 4, y: 8 },
  size: { width: 240, height: 120 },
  viewport: { width: 1280, height: 800 },
};

const post = (body: unknown) =>
  fetch(base + FEEDBACK_ENDPOINT, { method: "POST", body: JSON.stringify(body) });

it("injects the overlay into every page", async () => {
  for (const page of ["/", "/lab.html", "/isosceles.html"]) {
    const html = await (await fetch(base + page)).text();
    expect(html, page).toContain(`src="/src/dev/feedback/overlay.ts"`);
  }
});

it("appends posted comments to the feedback file", async () => {
  expect((await post(entry)).status).toBe(204);
  expect((await post({ ...entry, comment: "Second one." })).status).toBe(204);
  const text = await readFile(file, "utf8");
  expect(text.startsWith(FEEDBACK_HEADER)).toBe(true);
  expect(text.match(/^## \[ \] /gm)).toHaveLength(2);
  expect(text).toContain("> Card titles wrap too early.");
  expect(text).toContain("> Second one.");
});

it("rejects anything that is not an entry", async () => {
  expect((await post({ comment: "no context" })).status).toBe(400);
  expect((await fetch(base + FEEDBACK_ENDPOINT, { method: "POST", body: "{" })).status).toBe(400);
  expect((await fetch(base + FEEDBACK_ENDPOINT)).status).toBe(405);
});
