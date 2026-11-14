// The copy editor plugin on a real dev server: every page gets the editor, a
// page's copy is listed from its source, a save is written into every file it
// touches or into none, and a fact-check goes to Claude (a stand-in), in a
// copy of the project's layout made for the test.

import type Anthropic from "@anthropic-ai/sdk";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readHistory } from "../src/dev/copy/history.ts";
import { CHECK_ENDPOINT, COPY_ENDPOINT, type CopyEdit } from "../src/dev/copy/wire.ts";
import { copyEditor } from "./copy-editor-plugin.ts";

const LESSON = `export default lesson(() => ({
  steps: [
    { title: "Drag", text: "Move $A$." },
    { title: "Watch", text: "See it change." },
  ],
  likes: [{ title: "A ramp", text: "It rises." }],
  uses: [],
}));
`;
const DIRECTIONS = `export const directions = {
  angles: [{ title: "Drag the apex", text: "Grab the knob." }],
};
`;
const ASIDES = `export const asides = {
  angles: { likes: [{ title: "A door", text: "It opens." }], uses: [{ title: "Roofs", text: "Pitch." }] },
};
`;

/** What the stand-in Claude was asked, and what it says. */
const claude = { asked: [] as unknown[], reply: "" };
const standIn = {
  beta: {
    messages: {
      stream: (params: unknown) => {
        claude.asked.push(params);
        return { finalMessage: async () => ({ content: [{ type: "text", text: claude.reply }], stop_reason: "end_turn" }) };
      },
    },
  },
} as unknown as Anthropic;
let keyed = true;

let server: ViteDevServer;
let dir: string;
let base: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "copy-editor-"));
  await mkdir(join(dir, "src/lab/lessons"), { recursive: true });
  await writeFile(join(dir, "src/lab/lessons/demo.ts"), LESSON);
  await writeFile(join(dir, "src/directions.ts"), DIRECTIONS);
  await writeFile(join(dir, "src/asides.ts"), ASIDES);
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, ".."),
    logLevel: "silent",
    plugins: [copyEditor(dir, async () => (keyed ? standIn : null))],
    server: { host: "127.0.0.1", port: 0, watch: null },
  });
  await server.listen();
  base = server.resolvedUrls!.local[0].replace(/\/$/, "");
});

afterAll(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

const list = (page: string) => fetch(`${base}${COPY_ENDPOINT}?page=${encodeURIComponent(page)}`);
const post = (url: string, body: unknown) => fetch(base + url, { method: "POST", body: JSON.stringify(body) });

it("injects the editor into every page", async () => {
  for (const page of ["/", "/lab.html", "/isosceles.html"]) {
    const html = await (await fetch(base + page)).text();
    expect(html, page).toContain(`src="/src/dev/copy/pane.ts"`);
  }
});

it("lists a page's copy from its source", async () => {
  const lab = "src/lab/lessons/demo.ts";
  expect(await (await list("/lab.html?lesson=demo")).json()).toEqual({
    steps: {
      file: lab,
      entries: [
        { title: "Drag", text: "Move $A$." },
        { title: "Watch", text: "See it change." },
      ],
    },
    likes: { file: lab, entries: [{ title: "A ramp", text: "It rises." }] },
    uses: { file: lab, entries: [] },
  });
  expect(await (await list("/angles.html")).json()).toEqual({
    steps: { file: "src/directions.ts", entries: [{ title: "Drag the apex", text: "Grab the knob." }] },
    likes: { file: "src/asides.ts", entries: [{ title: "A door", text: "It opens." }] },
    uses: { file: "src/asides.ts", entries: [{ title: "Roofs", text: "Pitch." }] },
  });
  expect((await list("/index.html")).status).toBe(404);
  expect((await list("/lab.html?lesson=nowhere")).status).toBe(404);
});

it("writes a save into every file it touches, and what the copy read before into its history", async () => {
  const lab: CopyEdit = {
    page: "/lab.html?lesson=demo",
    edits: [
      { section: "steps", index: 1, was: { title: "Watch", text: "See it change." }, to: { text: "See $\\angle A$ change." } },
      { section: "likes", index: 0, was: { title: "A ramp", text: "It rises." }, to: { title: "A wheelchair ramp" } },
    ],
  };
  const saved = await post(COPY_ENDPOINT, lab);
  expect(saved.status).toBe(200);
  expect(await saved.json()).toEqual({ files: ["src/lab/lessons/demo.ts", "copy-history/demo.json"], commit: null });
  // A second save before the first is seen, to the other field of the same step, and one to two files at once.
  const both = await Promise.all([
    post(COPY_ENDPOINT, { page: lab.page, edits: [{ section: "steps", index: 0, was: { title: "Drag", text: "Move $A$." }, to: { title: "Drag it" } }] }),
    post(COPY_ENDPOINT, {
      page: "/angles.html",
      edits: [
        { section: "steps", index: 0, was: { title: "Drag the apex", text: "Grab the knob." }, to: { title: "Pull the apex" } },
        { section: "uses", index: 0, was: { title: "Roofs", text: "Pitch." }, to: { text: "A roof's pitch." } },
      ],
    }),
  ]);
  expect(both.map((r) => r.status)).toEqual([200, 200]);
  expect(await both[1].json()).toEqual({ files: ["src/directions.ts", "src/asides.ts", "copy-history/angles.json"], commit: null });
  expect(await readFile(join(dir, "src/lab/lessons/demo.ts"), "utf8")).toBe(
    LESSON.replace(`"See it change."`, `"See $\\\\angle A$ change."`).replace(`"Drag"`, `"Drag it"`).replace(`"A ramp"`, `"A wheelchair ramp"`),
  );
  expect(await readFile(join(dir, "src/directions.ts"), "utf8")).toBe(DIRECTIONS.replace("Drag the apex", "Pull the apex"));
  expect(await readFile(join(dir, "src/asides.ts"), "utf8")).toBe(ASIDES.replace(`"Pitch."`, `"A roof's pitch."`));
  const history = readHistory(await readFile(join(dir, "copy-history/demo.json"), "utf8"))!;
  expect(history.lesson).toBe("demo");
  expect(history.saves.map((save) => save.changes.map((c) => [c.field, c.was, c.now]))).toEqual([
    [
      ["steps.1.text", "See it change.", "See $\\angle A$ change."],
      ["likes.0.title", "A ramp", "A wheelchair ramp"],
    ],
    [["steps.0.title", "Drag", "Drag it"]],
  ]);
});

it("writes none of a save when one edit in it is stale, and refuses anything that is not a save", async () => {
  const before = await readFile(join(dir, "src/directions.ts"), "utf8");
  const stale = await post(COPY_ENDPOINT, {
    page: "/angles.html",
    edits: [
      { section: "steps", index: 0, was: { title: "Pull the apex", text: "Grab the knob." }, to: { title: "Lift the apex" } },
      { section: "likes", index: 0, was: { title: "Gone", text: "Old" }, to: { text: "New" } },
    ],
  });
  expect(stale.status).toBe(409);
  expect((await stale.json()).error).toMatch(/changed in the source/);
  expect(await readFile(join(dir, "src/directions.ts"), "utf8")).toBe(before);
  expect((await post(COPY_ENDPOINT, { page: "/angles.html", edits: [] })).status).toBe(400);
  expect((await fetch(base + COPY_ENDPOINT, { method: "POST", body: "{" })).status).toBe(400);
  expect((await fetch(base + COPY_ENDPOINT, { method: "PUT" })).status).toBe(405);
});

it("has Claude fact-check the copy as sent", async () => {
  const check = { summary: "One slip.", remarks: [{ field: "likes.0.text", quote: "opens", note: "Fine.", fix: "swings open" }] };
  claude.reply = JSON.stringify(check);
  const request = { page: "/angles.html", fields: [{ id: "likes.0.text", text: "It opens." }] };
  const checked = await post(CHECK_ENDPOINT, request);
  expect(checked.status).toBe(200);
  expect(await checked.json()).toEqual(check);
  expect(JSON.stringify(claude.asked.at(-1))).toContain('<field id=\\"likes.0.text\\"');

  expect((await post(CHECK_ENDPOINT, { page: "/angles.html", fields: [] })).status).toBe(400);
  expect((await fetch(base + CHECK_ENDPOINT)).status).toBe(405);
  keyed = false;
  const unkeyed = await post(CHECK_ENDPOINT, request);
  keyed = true;
  expect(unkeyed.status).toBe(503);
  expect((await unkeyed.json()).error).toMatch(/ANTHROPIC_API_KEY/);
});
