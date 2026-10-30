// The staging Worker (`env.staging` in wrangler.jsonc): the production Worker
// (index.ts), with its own deck, plus the endpoints the dev tools in the
// staging build talk to. A step edit is committed to the staging branch on
// GitHub, which redeploys staging (.github/workflows/staging.yml); a UI
// comment is kept in a Durable Object until `npm run staging:pull` appends it
// to the local ui-feedback.md.
//
// Cloudflare Access guards the whole staging host; these endpoints also check
// the token Access forwards, so nothing reaches them past it. The decisions
// are in staging-rules.ts and the step rewriting in src/dev/steps/source.ts;
// this does the I/O.

import { DurableObject } from "cloudflare:workers";
import { parseEntry, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { homeOf, listing, rewriteStep, stepsIn } from "../src/dev/steps/source.ts";
import { parseEdit, type Listing, type SaveReply, type StepEdit } from "../src/dev/steps/wire.ts";
import production, { RecallDeck } from "./index.ts";
import {
  certsUrl,
  commitBody,
  commitLink,
  commitMessage,
  contentsUrl,
  decideStaging,
  githubHeaders,
  JWT_ALG,
  MAX_STAGING_BODY,
  readContents,
  readJwt,
  STAGING_PATHS,
  type GitHub,
  type InboxItem,
} from "./staging-rules.ts";

export { RecallDeck };

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
      case "list-steps": {
        const home = homeOf(decision.page);
        if (!home) return reply(404, { error: "This page has no steps." });
        const file = await readFile(github, home.file);
        if ("error" in file) return reply(file.status, { error: file.error });
        const body: Listing = { file: home.file, steps: listing(stepsIn(file.text, home.key)) };
        return reply(200, body);
      }
      case "edit-step": {
        const edit = parseEdit(parseJson(await bodyOf(request)));
        if (!edit) return reply(400, { error: "Not a step edit." });
        const saved = await commitEdit(github, edit);
        return "error" in saved ? reply(saved.status, { error: saved.error }) : reply(200, saved);
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

async function bodyOf(request: Request): Promise<string> {
  const text = await request.text();
  return text.length > MAX_STAGING_BODY ? "" : text;
}

async function readFile(github: GitHub, file: string): Promise<{ text: string; sha: string } | Failure> {
  if (!github.token) return { status: 503, error: "Staging has no GITHUB_TOKEN, so it cannot read the lessons' source." };
  const res = await fetch(contentsUrl(github, file, true), { headers: githubHeaders(github) });
  if (res.status === 404) return { status: 404, error: `There is no ${file} on ${github.branch}.` };
  const contents = res.ok ? readContents(await res.json()) : null;
  if (!contents) {
    console.error("Reading from GitHub failed:", res.status, file);
    return { status: 502, error: `GitHub would not give ${file} (${res.status}).` };
  }
  return contents;
}

/** Times a commit is tried again when the branch moved between reading the file and writing it. */
const COMMIT_TRIES = 3;

/**
 * Commit `edit` to the branch: read the file, rewrite the step, and write it
 * over the version read. If the file changed meanwhile, GitHub refuses, and
 * the edit is made again on the newer version, which still holds the step
 * only if nobody changed it.
 */
async function commitEdit(github: GitHub, edit: StepEdit): Promise<SaveReply | Failure> {
  const home = homeOf(edit.page);
  if (!home) return { status: 404, error: "This page has no steps." };
  for (let attempt = 0; attempt < COMMIT_TRIES; attempt++) {
    const file = await readFile(github, home.file);
    if ("error" in file) return file;
    const result = rewriteStep(file.text, home.key, edit);
    if (!result.ok) return { status: 409, error: result.error };
    if (!result.changed) return { file: home.file, changed: false, commit: null };
    const res = await fetch(contentsUrl(github, home.file, false), {
      method: "PUT",
      headers: { ...githubHeaders(github), "Content-Type": "application/json" },
      body: JSON.stringify(commitBody(github, result.source, file.sha, commitMessage(edit, home))),
    });
    if (res.ok) return { file: home.file, changed: true, commit: commitLink(await res.json()) ?? "" };
    if (res.status !== 409) {
      console.error("Committing to GitHub failed:", res.status, home.file);
      return { status: 502, error: `GitHub would not take the commit (${res.status}).` };
    }
  }
  return { status: 409, error: `${home.file} keeps changing on ${github.branch}; try again.` };
}

/** Access's signing keys, kept for a while: they change rarely, and every request needs them. */
let certs: { issuer: string; keys: JsonWebKey[]; until: number } | null = null;
const CERTS_TTL_MS = 10 * 60 * 1000;

async function signingKeys(issuer: string, refresh: boolean): Promise<JsonWebKey[]> {
  if (!refresh && certs?.issuer === issuer && certs.until > Date.now()) return certs.keys;
  const res = await fetch(certsUrl(issuer));
  const body = res.ok ? ((await res.json()) as { keys?: JsonWebKey[] }) : {};
  const keys = Array.isArray(body.keys) ? body.keys : [];
  certs = { issuer, keys, until: Date.now() + CERTS_TTL_MS };
  return keys;
}

/** The claims of an Access token whose signature holds, or null. */
async function verifiedClaims(token: string | null, issuer: string): Promise<Record<string, unknown> | null> {
  const jwt = readJwt(token);
  if (!jwt || jwt.header.alg !== JWT_ALG) return null;
  const find = (keys: JsonWebKey[]) => keys.find((k) => (k as { kid?: unknown }).kid === jwt.header.kid);
  // A key not seen yet may be a new one Access has rotated in.
  const jwk = find(await signingKeys(issuer, false)) ?? find(await signingKeys(issuer, true));
  if (!jwk) return null;
  const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
  return (await crypto.subtle.verify(algorithm, key, jwt.signature, jwt.signed)) ? jwt.claims : null;
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
