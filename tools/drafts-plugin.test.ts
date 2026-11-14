// The drafts plugin on a real dev server: every page gets the draft tab, a
// lesson's draft is read from lesson-drafts/, and a save writes the draft and
// the explanations it keeps, or nothing when the draft has been saved since,
// in a directory made for the test.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { DRAFTS_ENDPOINT, explanationContent, type DraftSave } from "../src/dev/drafts/wire.ts";
import { drafts } from "./drafts-plugin.ts";

let server: ViteDevServer;
let dir: string;
let base: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "drafts-"));
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, ".."),
    logLevel: "silent",
    plugins: [drafts(dir)],
    server: { host: "127.0.0.1", port: 0, watch: null },
  });
  await server.listen();
  base = server.resolvedUrls!.local[0].replace(/\/$/, "");
});

afterAll(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

const list = (page: string) => fetch(`${base}${DRAFTS_ENDPOINT}?page=${encodeURIComponent(page)}`);
const post = (body: unknown) => fetch(base + DRAFTS_ENDPOINT, { method: "POST", body: JSON.stringify(body) });
const file = (path: string) => readFile(join(dir, path), "utf8");

it("injects the draft tab into every page", async () => {
  for (const page of ["/", "/lab.html", "/isosceles.html"]) {
    expect(await (await fetch(base + page)).text(), page).toContain(`src="/src/dev/drafts/pane.ts"`);
  }
});

it("writes a lesson's draft and the explanations it keeps, and reads the draft back", async () => {
  expect(await (await list("/lab.html?lesson=slope")).json()).toEqual({ lesson: "slope", file: "lesson-drafts/slope.md", text: null });

  const save: DraftSave = { page: "/lab.html?lesson=slope", was: null, text: "# Slope\n\nRise over run.", explanations: [{ lesson: "medians", text: "They meet." }] };
  const res = await post(save);
  expect(await res.json()).toEqual({ files: ["lesson-drafts/slope.md", "lesson-drafts/medians.explanation.md"], commit: null });
  expect(await file("lesson-drafts/slope.md")).toBe("# Slope\n\nRise over run.\n");
  expect(await file("lesson-drafts/medians.explanation.md")).toBe(explanationContent("They meet."));
  expect(await (await list("/slope.html")).json()).toEqual({ lesson: "slope", file: "lesson-drafts/slope.md", text: "# Slope\n\nRise over run." });

  // Saved again as it reads, nothing is written.
  expect(await (await post({ ...save, was: save.text })).json()).toEqual({ files: [], commit: null });
});

it("writes nothing over a draft saved since the save began, and refuses what is not a save", async () => {
  const res = await post({ page: "/lab.html?lesson=slope", was: null, text: "Mine.", explanations: [{ lesson: "angles", text: "Sum." }] });
  expect(res.status).toBe(409);
  expect(await file("lesson-drafts/slope.md")).toBe("# Slope\n\nRise over run.\n");
  await expect(file("lesson-drafts/angles.explanation.md")).rejects.toThrow();

  expect((await post({ page: "/x" })).status).toBe(400);
  expect((await post({ page: "/recall.html", was: null, text: "x", explanations: [] })).status).toBe(404);
  expect((await list("/index.html")).status).toBe(404);
  expect((await fetch(base + DRAFTS_ENDPOINT, { method: "DELETE" })).status).toBe(405);
});
