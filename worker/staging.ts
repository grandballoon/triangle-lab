// The staging Worker (`env.staging` in wrangler.jsonc): the production Worker
// (index.ts), with its own deck, plus the endpoints the dev tools in the
// staging build talk to. Copy edits are committed to the staging branch on
// GitHub, all of one save in one commit with what the copy read before
// (src/dev/copy/history.ts), which redeploys staging
// (.github/workflows/staging.yml); a lesson's draft is committed there too,
// with the Explain tab text it keeps (src/dev/drafts/wire.ts); a fact-check
// of the copy asks Claude
// (copy-check.ts); a UI comment is kept in a Durable Object until
// `npm run staging:pull` appends it to the local ui-feedback.md.
//
// Cloudflare Access guards the whole staging host; these endpoints also check
// the token Access forwards, so nothing reaches them past it. The decisions
// are in staging-rules.ts, the rewriting in src/dev/copy/source.ts and the
// fact-check in copy-check.ts; this does the I/O.

import Anthropic from "@anthropic-ai/sdk";
import { DurableObject } from "cloudflare:workers";
import { parseEntry, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { historyFile, recordSave } from "../src/dev/copy/history.ts";
import { entriesIn, filesOf, homesOf, lessonOf, listing, rewriteFile } from "../src/dev/copy/source.ts";
import { parseCopyEdit, SECTIONS, type CopyEdit, type CopyListing, type SaveReply } from "../src/dev/copy/wire.ts";
import {
  draftFile,
  draftWrites,
  filesOfSave,
  fromFile,
  MAX_DRAFT_BODY,
  parseDraftSave,
  type DraftListing,
  type DraftReply,
  type DraftSave,
} from "../src/dev/drafts/wire.ts";
import production, { Accounts, RecallDeck } from "./index.ts";
import { verifiedClaims } from "./access-keys.ts";
import { usageLine } from "./check.ts";
import { askCopyCheck } from "./copy-check.ts";
import {
  commitLink,
  commitMessage,
  commitUrl,
  commitsUrl,
  contentsUrl,
  decideStaging,
  githubHeaders,
  MAX_STAGING_BODY,
  readContents,
  refUrl,
  shaOf,
  STAGING_PATHS,
  treeBody,
  treeOf,
  treesUrl,
  type GitHub,
  type InboxItem,
} from "./staging-rules.ts";

export { Accounts, RecallDeck };

/** There is one reviewer, so one inbox. */
const INBOX_NAME = "inbox";

const reply = (status: number, body: unknown): Response => Response.json(body, { status });

type StagingEnv = Cloudflare.StagingEnv;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!STAGING_PATHS.includes(url.pathname)) return production.fetch(request, env);

    const access = { issuer: env.ACCESS_ISSUER, aud: env.ACCESS_AUD };
    const caller = { key: request.headers.get("CF-Connecting-IP") ?? "unknown" };
    const decision = decideStaging(
      {
        method: request.method,
        url,
        claims: access.issuer ? await verifiedClaims(request.headers.get("Cf-Access-Jwt-Assertion"), access.issuer) : null,
        withinLimit: (await env.LIMITER.limit(caller)).success,
        withinCheckLimit: (await env.CHECK_LIMITER.limit(caller)).success,
      },
      access,
      Date.now(),
    );
    // Typed by wrangler without its class, which only staging exports.
    const inbox = (env.INBOX as unknown as DurableObjectNamespace<StagingInbox>).getByName(INBOX_NAME);
    const github: GitHub = { api: env.GITHUB_API_URL, repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH, token: env.GITHUB_TOKEN ?? "" };

    switch (decision.kind) {
      case "refuse":
        return reply(decision.status, { error: decision.error });
      case "list-copy": {
        const listed = await listCopy(github, decision.page);
        return "error" in listed ? reply(listed.status, { error: listed.error }) : reply(200, listed);
      }
      case "save-copy": {
        const edit = parseCopyEdit(parseJson(await bodyOf(request)));
        if (!edit) return reply(400, { error: "Not a set of copy edits." });
        const saved = await commitCopy(github, edit);
        return "error" in saved ? reply(saved.status, { error: saved.error }) : reply(200, saved);
      }
      case "list-draft": {
        const listed = await listDraft(github, decision.page);
        return "error" in listed ? reply(listed.status, { error: listed.error }) : reply(200, listed);
      }
      case "save-draft": {
        const save = parseDraftSave(parseJson(await bodyOf(request, MAX_DRAFT_BODY)));
        if (!save) return reply(400, { error: "Not a draft to save." });
        const saved = await commitDraft(github, save);
        return "error" in saved ? reply(saved.status, { error: saved.error }) : reply(200, saved);
      }
      case "check-copy": {
        if (!env.ANTHROPIC_API_KEY) return reply(503, { error: "Staging has no ANTHROPIC_API_KEY, so it cannot ask Claude." });
        const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL });
        const outcome = await askCopyCheck(
          parseJson(await bodyOf(request)),
          (params) => client.beta.messages.stream(params).finalMessage(),
          (message) => console.log(JSON.stringify(usageLine("copy-check", "high", message))),
        );
        return "check" in outcome ? reply(200, outcome.check) : reply(outcome.status, { error: outcome.error });
      }
      case "add-feedback": {
        const entry = parseEntry(parseJson(await bodyOf(request)));
        if (!entry) return reply(400, { error: "Not a feedback entry." });
        await inbox.add(entry, Date.now());
        return reply(200, { where: "staging, for npm run staging:pull" });
      }
      case "list-feedback":
        return reply(200, await inbox.list());
      case "clear-feedback":
        await inbox.clear(decision.through);
        return new Response(null, { status: 204 });
    }
  },
} satisfies ExportedHandler<StagingEnv>;

type Failure = { status: number; error: string };

/** The request's body, or nothing when it is longer than `limit` characters. */
async function bodyOf(request: Request, limit = MAX_STAGING_BODY): Promise<string> {
  const text = await request.text();
  return text.length > limit ? "" : text;
}

async function getJson(github: GitHub, url: string, what: string): Promise<unknown | Failure> {
  if (!github.token) return { status: 503, error: "Staging has no GITHUB_TOKEN, so it cannot reach the lessons' source." };
  const res = await fetch(url, { headers: githubHeaders(github) });
  if (res.ok) return res.json();
  console.error("Reading from GitHub failed:", res.status, what);
  return { status: res.status === 404 ? 404 : 502, error: res.status === 404 ? `There is no ${what} on ${github.branch}.` : `GitHub would not give ${what} (${res.status}).` };
}

async function sendJson(github: GitHub, method: string, url: string, body: unknown): Promise<Response> {
  return fetch(url, { method, headers: { ...githubHeaders(github), "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

const isFailure = (v: unknown): v is Failure => typeof v === "object" && v !== null && "error" in v && "status" in v;

/** The commit the branch is at. */
async function headOf(github: GitHub): Promise<string | Failure> {
  const ref = await getJson(github, refUrl(github, true), `branch ${github.branch}`);
  if (isFailure(ref)) return ref;
  return shaOf(ref) ?? { status: 502, error: "GitHub's reply about the branch was unreadable." };
}

/** `file` as it is at commit `head`, or null when there is none. */
async function readFile(github: GitHub, file: string, head: string): Promise<string | null | Failure> {
  if (!github.token) return { status: 503, error: "Staging has no GITHUB_TOKEN, so it cannot reach the lessons' source." };
  const res = await fetch(contentsUrl(github, file, head), { headers: githubHeaders(github) });
  if (res.status === 404) return null;
  const text = res.ok ? readContents(await res.json()) : null;
  if (text !== null) return text;
  console.error("Reading from GitHub failed:", res.status, file);
  return { status: 502, error: `GitHub would not give ${file} (${res.status}).` };
}

/** Each of `files` as it is at commit `head`. */
async function readFiles(github: GitHub, files: readonly string[], head: string): Promise<Map<string, string> | Failure> {
  const read = new Map<string, string>();
  for (const file of files) {
    const body = await getJson(github, contentsUrl(github, file, head), file);
    if (isFailure(body)) return body;
    const text = readContents(body);
    if (text === null) return { status: 502, error: `GitHub's copy of ${file} was unreadable.` };
    read.set(file, text);
  }
  return read;
}

async function listCopy(github: GitHub, page: string): Promise<CopyListing | Failure> {
  const homes = homesOf(page);
  if (!homes) return { status: 404, error: "This page has no copy." };
  const head = await headOf(github);
  if (typeof head !== "string") return head;
  const files = await readFiles(github, filesOf(homes), head);
  if (files instanceof Map) {
    const section = (s: (typeof SECTIONS)[number]) => ({ file: homes[s].file, entries: listing(entriesIn(files.get(homes[s].file)!, homes[s], s)) });
    return { steps: section("steps"), likes: section("likes"), uses: section("uses") };
  }
  return files;
}

/** Times a commit is tried again when the branch moved between reading the files and moving it. */
const COMMIT_TRIES = 3;

/** What one commit writes, and its message; nothing written makes no commit. */
type Planned = { written: ReadonlyMap<string, string>; message: string };

/**
 * Commit what `plan` makes of the files at the branch's head, as one commit
 * on that head. If the branch moved meanwhile, GitHub will not move it to the
 * commit, and the plan is made again on the newer files; `busy` says so when
 * that keeps happening.
 */
async function commitPlanned(github: GitHub, plan: (head: string) => Promise<Planned | Failure>, busy: string): Promise<SaveReply | Failure> {
  for (let attempt = 0; attempt < COMMIT_TRIES; attempt++) {
    const head = await headOf(github);
    if (typeof head !== "string") return head;
    const planned = await plan(head);
    if (isFailure(planned)) return planned;
    const { written, message } = planned;
    if (written.size === 0) return { files: [], commit: null };

    const base = await getJson(github, commitUrl(github, head), "the head commit");
    if (isFailure(base)) return base;
    const baseTree = treeOf(base);
    if (!baseTree) return { status: 502, error: "GitHub's reply about the head commit was unreadable." };
    const tree = await sendJson(github, "POST", treesUrl(github), treeBody(baseTree, written));
    const treeSha = tree.ok ? shaOf(await tree.json()) : null;
    if (!treeSha) return gitFailed("tree", tree.status);
    const commit = await sendJson(github, "POST", commitsUrl(github), { message, tree: treeSha, parents: [head] });
    const made = commit.ok ? ((await commit.json()) as unknown) : null;
    const commitSha = shaOf(made);
    if (!commitSha) return gitFailed("commit", commit.status);
    const moved = await sendJson(github, "PATCH", refUrl(github, false), { sha: commitSha, force: false });
    if (moved.ok) return { files: [...written.keys()], commit: commitLink(made) ?? "" };
    // 422: not a fast-forward, as the branch has moved on since it was read.
    if (moved.status !== 422 && moved.status !== 409) return gitFailed("branch move", moved.status);
  }
  return { status: 409, error: busy };
}

/**
 * Commit `edit` to the branch, with what the copy read before (history.ts):
 * the edits are made on the files at the branch's head, which still hold the
 * entries only if nobody changed them since the editor listed them.
 */
async function commitCopy(github: GitHub, edit: CopyEdit): Promise<SaveReply | Failure> {
  const homes = homesOf(edit.page);
  const lesson = lessonOf(edit.page);
  if (!homes || !lesson) return { status: 404, error: "This page has no copy." };
  const plan = async (head: string): Promise<Planned | Failure> => {
    const files = await readFiles(github, filesOf(homes), head);
    if (!(files instanceof Map)) return files;
    const written = new Map<string, string>();
    for (const [file, text] of files) {
      const result = rewriteFile(text, file, homes, edit.edits);
      if (!result.ok) return { status: 409, error: result.error };
      if (result.changed) written.set(file, result.source);
    }
    const message = commitMessage(lesson.slug, edit.edits);
    if (written.size === 0) return { written, message };
    const kept = historyFile(lesson.slug);
    const existing = await readFile(github, kept, head);
    if (isFailure(existing)) return existing;
    const recorded = recordSave(existing, lesson.slug, edit.edits, new Date().toISOString());
    if (!recorded.ok) return { status: 409, error: recorded.error };
    if (recorded.text !== null) written.set(kept, recorded.text);
    return { written, message };
  };
  return commitPlanned(github, plan, `The copy keeps changing on ${github.branch}; try again.`);
}

/** A lesson's draft as it is on the branch. */
async function listDraft(github: GitHub, page: string): Promise<DraftListing | Failure> {
  const lesson = lessonOf(page);
  if (!lesson) return { status: 404, error: "This page shows no lesson." };
  const head = await headOf(github);
  if (typeof head !== "string") return head;
  const file = draftFile(lesson.slug);
  const text = await readFile(github, file, head);
  if (isFailure(text)) return text;
  return { lesson: lesson.slug, file, text: text === null ? null : fromFile(text) };
}

/** Commit a save of a draft, with the explanations it keeps (src/dev/drafts/wire.ts). */
async function commitDraft(github: GitHub, save: DraftSave): Promise<DraftReply | Failure> {
  const files = filesOfSave(save);
  if (!files) return { status: 404, error: "This page shows no lesson." };
  const plan = async (head: string): Promise<Planned | Failure> => {
    const current = new Map<string, string | null>();
    for (const file of files) {
      const text = await readFile(github, file, head);
      if (isFailure(text)) return text;
      current.set(file, text);
    }
    const writes = draftWrites(save, current);
    return writes.ok ? writes : { status: writes.status, error: writes.error };
  };
  return commitPlanned(github, plan, `The drafts keep changing on ${github.branch}; try again.`);
}

function gitFailed(what: string, status: number): Failure {
  console.error(`GitHub would not make the ${what}:`, status);
  return { status: 502, error: `GitHub would not make the ${what} (${status}).` };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class StagingInbox extends DurableObject<StagingEnv> {
  constructor(ctx: DurableObjectState, env: StagingEnv) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, entry TEXT NOT NULL)");
  }

  add(entry: FeedbackEntry, at: number): void {
    this.ctx.storage.sql.exec("INSERT INTO feedback (at, entry) VALUES (?, ?)", at, JSON.stringify(entry));
  }

  list(): InboxItem[] {
    return this.ctx.storage.sql
      .exec<{ id: number; at: number; entry: string }>("SELECT id, at, entry FROM feedback ORDER BY id")
      .toArray()
      .map((r) => ({ id: r.id, at: r.at, entry: JSON.parse(r.entry) as FeedbackEntry }));
  }

  clear(through: number): void {
    this.ctx.storage.sql.exec("DELETE FROM feedback WHERE id <= ?", through);
  }
}
