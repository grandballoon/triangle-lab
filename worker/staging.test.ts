// The staging Worker running for real, in the local Workers runtime, from
// `env.staging` in wrangler.jsonc, against a stand-in for GitHub's contents
// API and for the Access team's signing keys: the production Worker's deck
// served beside the dev tools, nothing let in without a signed Access token,
// a page's steps listed from the branch, an edit committed over the file it
// was made on (and made again when the branch moved), and UI comments kept
// until pulled.

import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { createTestHarness, type TestHarness } from "wrangler";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FeedbackEntry } from "../src/dev/feedback/entry.ts";
import type { StepEdit } from "../src/dev/steps/wire.ts";
import { decodeContent, encodeContent } from "./staging-rules.ts";

const KEY = "a-test-key-long-enough-to-be-served";
const AUD = "staging-aud-tag";
const ROOT = resolve(__dirname, "..");
const LESSON = `export default lesson(() => ({
  steps: [
    { title: "Drag", text: "Move $A$." },
    { title: "Watch", text: "See it change." },
  ],
}));
`;

/** The stand-in GitHub branch: files by path, each with its sha, and the commits made to it. */
const github = {
  files: new Map<string, { text: string; sha: number }>(),
  commits: [] as { path: string; body: { message: string; content: string; sha: string; branch: string }; auth: string | undefined }[],
  /** Change the file under the next commit, as another edit landing first would. */
  raceNext: null as null | ((text: string) => string),
};

let keys: { privateKey: KeyObject; publicKey: KeyObject };
let standIn: Server;
let issuer: string;
let harness: TestHarness;
let base: string;
let dir: string;

beforeAll(async () => {
  keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  standIn = createServer((req, res) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      const url = new URL(req.url ?? "", "http://stand-in");
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === "/cdn-cgi/access/certs") {
        return send(200, { keys: [{ ...keys.publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" }] });
      }
      const path = /^\/repos\/owner\/repo\/contents\/(.+)$/.exec(url.pathname)?.[1];
      const file = path ? github.files.get(path) : undefined;
      if (!path || !file) return send(404, { message: "Not Found" });
      if (req.method === "GET") {
        if (url.searchParams.get("ref") !== "staging") return send(404, { message: "No such ref" });
        return send(200, { content: encodeContent(file.text).replace(/(.{60})/g, "$1\n"), sha: String(file.sha), encoding: "base64" });
      }
      const body = JSON.parse(text);
      if (github.raceNext) {
        github.files.set(path, { text: github.raceNext(file.text), sha: file.sha + 1 });
        github.raceNext = null;
      }
      const now = github.files.get(path)!;
      if (body.sha !== String(now.sha)) return send(409, { message: "sha does not match" });
      github.commits.push({ path, body, auth: req.headers.authorization });
      github.files.set(path, { text: decodeContent(body.content), sha: now.sha + 1 });
      return send(200, { commit: { html_url: `https://github.com/owner/repo/commit/${github.commits.length}` } });
    });
  });
  await new Promise<void>((done) => standIn.listen(0, "127.0.0.1", done));
  issuer = `http://127.0.0.1:${(standIn.address() as AddressInfo).port}`;

  dir = await mkdtemp(join(tmpdir(), "triangle-lab-staging-"));
  const assets = join(dir, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "index.html"), "<title>Lessons</title>");
  await writeFile(join(dir, ".dev.vars"), `RECALL_KEY=${KEY}\nANTHROPIC_API_KEY=k\nGITHUB_TOKEN=gh-token\n`);
  // The real staging configuration, with only the assets and the services swapped in.
  const path = join(ROOT, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(path, await readFile(path, "utf8"));
  if (error) throw new Error(String(error.messageText));
  const { env, ...top } = config;
  const staging = env.staging;
  harness = createTestHarness({
    root: dir,
    workers: [
      {
        config: {
          ...top,
          ...staging,
          name: "triangle-lab-staging",
          main: join(ROOT, staging.main),
          assets: { ...staging.assets, directory: assets },
          vars: { ...staging.vars, GITHUB_API_URL: issuer, GITHUB_REPO: "owner/repo", ACCESS_ISSUER: issuer, ACCESS_AUD: AUD },
        },
      },
    ],
  });
  await harness.listen();
}, 60_000);

beforeEach(async () => {
  github.files = new Map([
    ["src/lab/lessons/demo.ts", { text: LESSON, sha: 1 }],
    ["src/directions.ts", { text: `export const directions = {\n  angles: [{ title: "Drag the apex", text: "Grab it." }],\n};\n`, sha: 1 }],
  ]);
  github.commits = [];
  github.raceNext = null;
  await harness.reset();
  base = (await harness.listen()).url.href.replace(/\/$/, "");
});

afterAll(async () => {
  await harness?.close();
  await new Promise((done) => standIn?.close(done));
  await rm(dir, { recursive: true, force: true });
});

/** A token as Access would forward it, signed with the stand-in team's key. */
function token(claims: Record<string, unknown> = {}, signer = keys.privateKey): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = `${part({ alg: "RS256", kid: "k1" })}.${part({ iss: issuer, aud: [AUD], exp: now + 600, email: "me@example.com", ...claims })}`;
  return `${head}.${createSign("RSA-SHA256").update(head).sign(signer).toString("base64url")}`;
}

const call = (method: string, path: string, body?: unknown, jwt: string | null = token()) =>
  fetch(base + path, {
    method,
    headers: jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const steps = (page: string, jwt?: string | null) => call("GET", `/__step-source?page=${encodeURIComponent(page)}`, undefined, jwt);

describe("staging", () => {
  it("serves the site and its own deck as production does", async () => {
    expect(await (await fetch(`${base}/`)).text()).toBe("<title>Lessons</title>");
    const deck = await fetch(`${base}/deck`, { headers: { Authorization: `Bearer ${KEY}` } });
    expect(deck.status).toBe(200);
  });

  it("lets nothing reach the dev tools without a signed Access token for this application", async () => {
    const forged = token({}, generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey);
    for (const jwt of [null, "not.a.token", forged, token({ aud: ["other"] }), token({ exp: 1 })]) {
      expect((await steps("/angles", jwt)).status, String(jwt)).toBe(401);
      expect((await call("GET", "/__ui-feedback", undefined, jwt)).status).toBe(401);
    }
    expect(github.commits).toEqual([]);
  });
});

describe("the step editor on staging", () => {
  it("lists a page's steps from the staging branch", async () => {
    expect(await (await steps("/lab?lesson=demo")).json()).toEqual({
      file: "src/lab/lessons/demo.ts",
      steps: [
        { title: "Drag", text: "Move $A$." },
        { title: "Watch", text: "See it change." },
      ],
    });
    expect(await (await steps("/angles")).json()).toEqual({ file: "src/directions.ts", steps: [{ title: "Drag the apex", text: "Grab it." }] });
    expect((await steps("/lab?lesson=nowhere")).status).toBe(404);
    expect((await steps("/")).status).toBe(404);
  });

  const edit: StepEdit = { page: "/lab?lesson=demo", step: 1, was: { title: "Watch", text: "See it change." }, field: "text", to: "See $\\angle A$ change." };

  it("commits an edit over the file it was made on", async () => {
    const saved = await call("POST", "/__step-source", edit);
    expect(await saved.json()).toEqual({ file: "src/lab/lessons/demo.ts", changed: true, commit: "https://github.com/owner/repo/commit/1" });
    expect(github.commits).toEqual([
      {
        path: "src/lab/lessons/demo.ts",
        auth: "Bearer gh-token",
        body: {
          message: "Edit the text of step 2 in demo\n\nMade with the step editor on staging.\n",
          content: encodeContent(LESSON.replace(`"See it change."`, `"See $\\\\angle A$ change."`)),
          sha: "1",
          branch: "staging",
        },
      },
    ]);
    // The same edit again finds the step already reads so.
    expect(await (await call("POST", "/__step-source", { ...edit, was: { title: "Watch", text: edit.to } })).json()).toMatchObject({ changed: false });
    expect(github.commits).toHaveLength(1);
  });

  it("makes the edit again when the branch moved meanwhile, and refuses it when its step changed", async () => {
    github.raceNext = (text) => text.replace(`"Drag"`, `"Drag it"`);
    expect((await call("POST", "/__step-source", edit)).status).toBe(200);
    expect(github.files.get("src/lab/lessons/demo.ts")!.text).toBe(LESSON.replace(`"Drag"`, `"Drag it"`).replace(`"See it change."`, `"See $\\\\angle A$ change."`));

    github.raceNext = (text) => text.replace(`"Move $A$."`, `"Moved by someone else."`);
    const stale = await call("POST", "/__step-source", { ...edit, step: 0, was: { title: "Drag it", text: "Move $A$." }, to: "Mine." });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatch(/changed in the source/);
  });
});

describe("UI comments on staging", () => {
  const entry: FeedbackEntry = {
    comment: "The pill overlaps the rail.",
    page: "/lab?lesson=slope",
    selector: "button.se-toggle",
    element: `<button class="se-toggle"> "Edit steps"`,
    point: { x: 3, y: 4 },
    size: { width: 90, height: 28 },
    viewport: { width: 1280, height: 800 },
  };

  it("keeps comments until they are pulled", async () => {
    const saved = await call("POST", "/__ui-feedback", entry);
    expect(await saved.json()).toEqual({ where: "staging, for npm run staging:pull" });
    await call("POST", "/__ui-feedback", { ...entry, comment: "Second." });
    const kept = (await (await call("GET", "/__ui-feedback")).json()) as { id: number; at: number; entry: FeedbackEntry }[];
    expect(kept.map((k) => k.entry.comment)).toEqual(["The pill overlaps the rail.", "Second."]);
    expect(kept[0].entry).toEqual(entry);

    expect((await call("DELETE", `/__ui-feedback?through=${kept[0].id}`)).status).toBe(204);
    expect((await (await call("GET", "/__ui-feedback")).json()).map((k: { entry: FeedbackEntry }) => k.entry.comment)).toEqual(["Second."]);
    expect((await call("POST", "/__ui-feedback", { comment: "no context" })).status).toBe(400);
  });
});
