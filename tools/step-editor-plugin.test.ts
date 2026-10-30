// The step editor plugin on a real dev server: every page gets the editor, a
// page's steps are listed from its source, and a saved edit is written into
// that source, in a copy of the project's layout made for the test.

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { STEPS_ENDPOINT, type StepEdit } from "../src/dev/steps/wire.ts";
import { stepEditor } from "./step-editor-plugin.ts";

const LESSON = `export default lesson(() => ({
  steps: [
    { title: "Drag", text: "Move $A$." },
    { title: "Watch", text: "See it change." },
  ],
}));
`;
const DIRECTIONS = `export const directions = {
  angles: [{ title: "Drag the apex", text: "Grab the knob." }],
};
`;

let server: ViteDevServer;
let dir: string;
let base: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "step-editor-"));
  await mkdir(join(dir, "src/lab/lessons"), { recursive: true });
  await writeFile(join(dir, "src/lab/lessons/demo.ts"), LESSON);
  await writeFile(join(dir, "src/directions.ts"), DIRECTIONS);
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, ".."),
    logLevel: "silent",
    plugins: [stepEditor(dir)],
    server: { host: "127.0.0.1", port: 0, watch: null },
  });
  await server.listen();
  base = server.resolvedUrls!.local[0].replace(/\/$/, "");
});

afterAll(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

const list = (page: string) => fetch(`${base}${STEPS_ENDPOINT}?page=${encodeURIComponent(page)}`);
const post = (body: unknown) => fetch(base + STEPS_ENDPOINT, { method: "POST", body: JSON.stringify(body) });

it("injects the editor into every page", async () => {
  for (const page of ["/", "/lab.html", "/isosceles.html"]) {
    const html = await (await fetch(base + page)).text();
    expect(html, page).toContain(`src="/src/dev/steps/editor.ts"`);
  }
});

it("lists a page's steps from its source", async () => {
  expect(await (await list("/lab.html?lesson=demo")).json()).toEqual({
    file: "src/lab/lessons/demo.ts",
    steps: [
      { title: "Drag", text: "Move $A$." },
      { title: "Watch", text: "See it change." },
    ],
  });
  expect(await (await list("/angles.html")).json()).toEqual({
    file: "src/directions.ts",
    steps: [{ title: "Drag the apex", text: "Grab the knob." }],
  });
  expect((await list("/index.html")).status).toBe(404);
  expect((await list("/lab.html?lesson=nowhere")).status).toBe(404);
});

it("writes saved edits into the source", async () => {
  const edit: StepEdit = {
    page: "/lab.html?lesson=demo",
    step: 1,
    was: { title: "Watch", text: "See it change." },
    field: "text",
    to: "See $\\angle A$ change.",
  };
  const saved = await post(edit);
  expect(saved.status).toBe(200);
  expect(await saved.json()).toEqual({ file: "src/lab/lessons/demo.ts", changed: true, commit: null });
  // A second save before the first is seen, to the other field of the same step.
  const both = await Promise.all([
    post({ ...edit, step: 0, was: { title: "Drag", text: "Move $A$." }, field: "title", to: "Drag it" }),
    post({ page: "/angles.html", step: 0, was: { title: "Drag the apex", text: "Grab the knob." }, field: "title", to: "Pull the apex" }),
  ]);
  expect(both.map((r) => r.status)).toEqual([200, 200]);
  expect(await readFile(join(dir, "src/lab/lessons/demo.ts"), "utf8")).toBe(
    LESSON.replace(`"See it change."`, `"See $\\\\angle A$ change."`).replace(`"Drag"`, `"Drag it"`),
  );
  expect(await readFile(join(dir, "src/directions.ts"), "utf8")).toBe(DIRECTIONS.replace("Drag the apex", "Pull the apex"));
});

it("refuses a stale edit and anything that is not an edit", async () => {
  const stale = await post({ page: "/angles.html", step: 0, was: { title: "Gone", text: "Old" }, field: "text", to: "New" });
  expect(stale.status).toBe(409);
  expect((await stale.json()).error).toMatch(/changed in the source/);
  expect((await post({ page: "/angles.html", step: 0 })).status).toBe(400);
  expect((await fetch(base + STEPS_ENDPOINT, { method: "POST", body: "{" })).status).toBe(400);
  expect((await fetch(base + STEPS_ENDPOINT, { method: "PUT" })).status).toBe(405);
});
