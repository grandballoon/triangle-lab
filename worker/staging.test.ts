// The staging Worker running for real, in the local Workers runtime, from
// `env.staging` in wrangler.jsonc, against stand-ins for GitHub's API, the
// Claude API and the Access team's signing keys: the production Worker's
// deck served beside the dev tools, to a learner signed in as on production,
// nothing let into the dev tools without a signed Access token, a page's copy
// listed from the branch, a save committed in one commit on the head it was
// made on (and made again when the branch moved), a fact-check through
// Claude, and UI comments kept until pulled.

import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { createTestHarness, type TestHarness } from "wrangler";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FeedbackEntry } from "../src/dev/feedback/entry.ts";
import type { CopyEdit } from "../src/dev/copy/wire.ts";
import { readHistory } from "../src/dev/copy/history.ts";
import { encodeContent } from "./staging-rules.ts";

const AUD = "staging-aud-tag";
const ROOT = resolve(__dirname, "..");
const LESSON = `export default lesson(() => ({
  steps: [
    { title: "Drag", text: "Move $A$." },
    { title: "Watch", text: "See it change." },
  ],
  likes: [{ title: "A ramp", text: "It rises." }],
  uses: [],
}));
`;
const DIRECTIONS = `export const directions = {\n  angles: [{ title: "Drag the apex", text: "Grab it." }],\n};\n`;
const ASIDES = `export const asides = {\n  angles: { likes: [{ title: "A door", text: "It opens." }], uses: [] },\n};\n`;

type Files = Map<string, string>;

/**
 * The stand-in GitHub repository, as much of the Git Data API as a commit
 * needs: commits and trees by sha, the staging branch's head, and the
 * commits the branch was moved to.
 */
const github = {
  commits: new Map<string, { files: Files; parent: string | null }>(),
  trees: new Map<string, Files>(),
  head: "",
  made: [] as { message: string; files: Record<string, string>; auth: string | undefined }[],
  /** Change a file on the branch just before it is next moved, as another save landing first would. */
  raceNext: null as null | ((files: Files) => Files),
  count: 0,
};
const files = (): Files => github.commits.get(github.head)!.files;

/** What the stand-in Claude was asked, and what it says. */
const claude = { asked: [] as { body: Record<string, unknown>; key: string | undefined }[], reply: "" };

/** The commits made but not yet on the branch, by sha. */
const pending = new Map<string, (typeof github.made)[number]>();

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
      if (url.pathname === "/v1/messages") {
        claude.asked.push({ body: JSON.parse(text), key: req.headers.authorization });
        // Streamed, as the check asks for it.
        const message = { id: "msg", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } };
        const events = [
          ["message_start", { type: "message_start", message }],
          ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
          ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: claude.reply } }],
          ["content_block_stop", { type: "content_block_stop", index: 0 }],
          ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } }],
          ["message_stop", { type: "message_stop" }],
        ] as const;
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        return res.end(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(""));
      }
      const repo = "/repos/owner/repo/";
      if (!url.pathname.startsWith(repo)) return send(404, { message: "Not Found" });
      const route = `${req.method} ${url.pathname.slice(repo.length)}`;
      const body = text ? JSON.parse(text) : null;
      if (route === "GET git/ref/heads/staging") return send(200, { object: { sha: github.head } });
      const contents = /^GET contents\/(.+)$/.exec(route);
      if (contents) {
        const at = github.commits.get(url.searchParams.get("ref") ?? "");
        const file = at?.files.get(contents[1]);
        if (file === undefined) return send(404, { message: "Not Found" });
        return send(200, { content: encodeContent(file).replace(/(.{60})/g, "$1\n"), encoding: "base64" });
      }
      const commit = /^GET git\/commits\/(.+)$/.exec(route);
      if (commit) return github.commits.has(commit[1]) ? send(200, { sha: commit[1], tree: { sha: `tree-of-${commit[1]}` } }) : send(404, {});
      if (route === "POST git/trees") {
        const base = github.commits.get(String(body.base_tree).replace(/^tree-of-/, ""));
        if (!base) return send(422, { message: "No base tree" });
        const tree = new Map(base.files);
        for (const entry of body.tree) tree.set(entry.path, entry.content);
        const sha = `t${++github.count}`;
        github.trees.set(sha, tree);
        return send(201, { sha });
      }
      if (route === "POST git/commits") {
        const sha = `c${++github.count}`;
        github.commits.set(sha, { files: github.trees.get(body.tree)!, parent: body.parents[0] });
        const changed = Object.fromEntries([...github.trees.get(body.tree)!].filter(([path, t]) => github.commits.get(body.parents[0])?.files.get(path) !== t));
        pending.set(sha, { message: body.message, files: changed, auth: req.headers.authorization });
        return send(201, { sha, html_url: `https://github.com/owner/repo/commit/${sha}` });
      }
      if (route === "PATCH git/refs/heads/staging") {
        if (github.raceNext) {
          const sha = `c${++github.count}`;
          github.commits.set(sha, { files: github.raceNext(new Map(files())), parent: github.head });
          github.head = sha;
          github.raceNext = null;
        }
        if (body.force !== false || github.commits.get(body.sha)?.parent !== github.head) return send(422, { message: "Update is not a fast forward" });
        github.head = body.sha;
        github.made.push(pending.get(body.sha)!);
        return send(200, { object: { sha: body.sha } });
      }
      return send(404, { message: "Not Found" });
    });
  });
  await new Promise<void>((done) => standIn.listen(0, "127.0.0.1", done));
  issuer = `http://127.0.0.1:${(standIn.address() as AddressInfo).port}`;

  dir = await mkdtemp(join(tmpdir(), "triangle-lab-staging-"));
  const assets = join(dir, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "index.html"), "<title>Lessons</title>");
  await writeFile(join(dir, ".dev.vars"), `ANTHROPIC_API_KEY=k\nOWNER_EMAIL=owner@example.com\nINVITES=-\nGITHUB_TOKEN=gh-token\n`);
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
          vars: { ...staging.vars, SENDER: "signin@example.com", ANTHROPIC_BASE_URL: issuer, GITHUB_API_URL: issuer, GITHUB_REPO: "owner/repo", ACCESS_ISSUER: issuer, ACCESS_AUD: AUD },
        },
      },
    ],
  });
  await harness.listen();
}, 60_000);

beforeEach(async () => {
  const start = new Map([
    ["src/lab/lessons/demo.ts", LESSON],
    ["src/directions.ts", DIRECTIONS],
    ["src/asides.ts", ASIDES],
    ["README.md", "Untouched."],
  ]);
  github.commits = new Map([["c0", { files: start, parent: null }]]);
  github.trees = new Map();
  github.head = "c0";
  github.made = [];
  github.raceNext = null;
  pending.clear();
  claude.asked = [];
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

/** What the page's own requests carry (worker/rules.ts). */
const FROM_PAGE = { "X-Requested-With": "XMLHttpRequest" };

/** The link in the sign-in email the local runtime last wrote out, waiting a moment for it. */
async function sentLink(): Promise<string | null> {
  const root = join(dir, ".wrangler", "tmp", "email");
  for (let i = 0; i < 40; i++) {
    const files = (await readdir(root, { recursive: true }).catch(() => [] as string[])).filter((f) => f.includes("email-text") && f.endsWith(".txt"));
    if (files.length) return /https?:\/\/\S+/.exec(await readFile(join(root, files[0]), "utf8"))?.[0] ?? null;
    await new Promise((done) => setTimeout(done, 25));
  }
  return null;
}

const copy = (page: string, jwt?: string | null) => call("GET", `/__copy?page=${encodeURIComponent(page)}`, undefined, jwt);

describe("staging", () => {
  it("serves the site and its own deck as production does, to whoever signed in", async () => {
    expect(await (await fetch(`${base}/`)).text()).toBe("<title>Lessons</title>");
    const deck = (cookie: string | null) =>
      fetch(`${base}/deck`, { headers: { ...FROM_PAGE, ...(cookie ? { Cookie: cookie } : {}) } });
    expect((await deck(null)).status).toBe(401);

    const asked = await fetch(`${base}/auth/link`, { method: "POST", headers: FROM_PAGE, body: JSON.stringify({ email: "owner@example.com" }) });
    expect(asked.status).toBe(202);
    const link = await sentLink();
    expect(link).toMatch(new RegExp(`^${base}/signin\\.html\\?token=`));
    const session = await fetch(`${base}/auth/session`, { method: "POST", headers: FROM_PAGE, body: JSON.stringify({ token: new URL(link!).searchParams.get("token") }) });
    expect(session.status).toBe(200);
    expect((await deck(session.headers.get("Set-Cookie")!.split(";")[0])).status).toBe(200);
  });

  it("lets nothing reach the dev tools without a signed Access token for this application", async () => {
    const forged = token({}, generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey);
    for (const jwt of [null, "not.a.token", forged, token({ aud: ["other"] }), token({ exp: 1 })]) {
      expect((await copy("/angles", jwt)).status, String(jwt)).toBe(401);
      expect((await call("POST", "/__copy/check", { page: "/angles", fields: [{ id: "steps.0.text", text: "x" }] }, jwt)).status).toBe(401);
      expect((await call("GET", "/__ui-feedback", undefined, jwt)).status).toBe(401);
    }
    expect(github.made).toEqual([]);
    expect(claude.asked).toEqual([]);
  });
});

describe("the copy editor on staging", () => {
  it("lists a page's copy from the staging branch", async () => {
    const lab = "src/lab/lessons/demo.ts";
    expect(await (await copy("/lab?lesson=demo")).json()).toEqual({
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
    expect(await (await copy("/angles")).json()).toEqual({
      steps: { file: "src/directions.ts", entries: [{ title: "Drag the apex", text: "Grab it." }] },
      likes: { file: "src/asides.ts", entries: [{ title: "A door", text: "It opens." }] },
      uses: { file: "src/asides.ts", entries: [] },
    });
    expect((await copy("/lab?lesson=nowhere")).status).toBe(404);
    expect((await copy("/")).status).toBe(404);
  });

  const save: CopyEdit = {
    page: "/angles",
    edits: [
      { section: "steps", index: 0, was: { title: "Drag the apex", text: "Grab it." }, to: { text: "Grab $C$." } },
      { section: "likes", index: 0, was: { title: "A door", text: "It opens." }, to: { title: "A swinging door" } },
    ],
  };

  it("commits a save to every file it touches in one commit, with its history, on the head it was made on", async () => {
    const saved = await call("POST", "/__copy", save);
    const head = github.head;
    expect(await saved.json()).toEqual({
      files: ["src/directions.ts", "src/asides.ts", "copy-history/angles.json"],
      commit: `https://github.com/owner/repo/commit/${head}`,
    });
    expect(github.made).toEqual([
      {
        message: "Edit the copy of angles: step 1, likeness 1\n\nMade with the copy editor on staging.\n",
        auth: "Bearer gh-token",
        files: {
          "src/directions.ts": DIRECTIONS.replace(`"Grab it."`, `"Grab $C$."`),
          "src/asides.ts": ASIDES.replace(`"A door"`, `"A swinging door"`),
          "copy-history/angles.json": expect.any(String),
        },
      },
    ]);
    const history = () => readHistory(files().get("copy-history/angles.json")!)!;
    expect(history().saves.map((s) => s.changes.map((c) => [c.field, c.was, c.now]))).toEqual([
      [
        ["steps.0.text", "Grab it.", "Grab $C$."],
        ["likes.0.title", "A door", "A swinging door"],
      ],
    ]);
    expect(files().get("README.md")).toBe("Untouched.");
    // The same save again finds the copy already reads so.
    const again = { page: "/angles", edits: [{ ...save.edits[0], was: { title: "Drag the apex", text: "Grab $C$." } }] };
    expect(await (await call("POST", "/__copy", again)).json()).toEqual({ files: [], commit: null });
    expect(github.made).toHaveLength(1);
    // A later save adds to the history, keeping the original.
    await call("POST", "/__copy", { page: "/angles", edits: [{ section: "likes", index: 0, was: { title: "A swinging door", text: "It opens." }, to: { title: "A door ajar" } }] });
    expect(history().saves.map((s) => s.changes.map((c) => [c.was, c.now]))).toEqual([
      [
        ["Grab it.", "Grab $C$."],
        ["A door", "A swinging door"],
      ],
      [["A swinging door", "A door ajar"]],
    ]);
  });

  it("makes the save again when the branch moved meanwhile, and refuses it when its copy changed", async () => {
    github.raceNext = (now) => now.set("src/asides.ts", now.get("src/asides.ts")!.replace("uses: []", 'uses: [{ title: "Roofs", text: "Pitch." }]'));
    expect((await call("POST", "/__copy", save)).status).toBe(200);
    expect(files().get("src/asides.ts")).toBe(ASIDES.replace(`"A door"`, `"A swinging door"`).replace("uses: []", 'uses: [{ title: "Roofs", text: "Pitch." }]'));
    expect(files().get("src/directions.ts")).toBe(DIRECTIONS.replace(`"Grab it."`, `"Grab $C$."`));

    github.raceNext = (now) => now.set("src/directions.ts", now.get("src/directions.ts")!.replace("Grab $C$.", "Someone else's."));
    const before = github.made.length;
    const stale = await call("POST", "/__copy", { page: "/angles", edits: [{ section: "steps", index: 0, was: { title: "Drag the apex", text: "Grab $C$." }, to: { text: "Mine." } }] });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatch(/changed in the source/);
    expect(github.made).toHaveLength(before);
  });

  it("has Claude fact-check the copy, with staging's key", async () => {
    const check = { summary: "Holds up.", remarks: [] };
    claude.reply = JSON.stringify(check);
    const checked = await call("POST", "/__copy/check", { page: "/angles", fields: [{ id: "likes.0.text", text: "It opens." }] });
    expect(checked.status).toBe(200);
    expect(await checked.json()).toEqual(check);
    expect(claude.asked).toHaveLength(1);
    expect(claude.asked[0].key).toBe("Bearer k");
    expect(JSON.stringify(claude.asked[0].body.messages)).toContain('<field id=\\"likes.0.text\\"');
    expect((await call("POST", "/__copy/check", { page: "/angles", fields: [] })).status).toBe(400);
  });
});

describe("UI comments on staging", () => {
  const entry: FeedbackEntry = {
    comment: "The pill overlaps the rail.",
    page: "/lab?lesson=slope",
    selector: "button.column-tab",
    element: `<button class="column-tab"> "Copy"`,
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
