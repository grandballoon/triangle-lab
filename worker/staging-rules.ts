// What the staging Worker (staging.ts) does with a request to the dev tools'
// endpoints, decided from plain values: which tool and action it is, whether
// the caller's Cloudflare Access token holds up (access.ts), and the GitHub
// requests that read a lesson's source and commit edits to it. staging.ts
// reads the request, checks the token's signature, follows the decision and
// does the I/O.
//
// The endpoints, beside everything the production Worker serves:
//   GET    /__copy?page=          a page's copy from its source (CopyListing, src/dev/copy/wire.ts)
//   POST   /__copy                a CopyEdit, committed to the staging branch in one commit; answers with a SaveReply
//   POST   /__copy/check          a CheckRequest (src/dev/copy/check.ts); answers with Claude's CopyCheck
//   GET    /__drafts?page=        a lesson's draft (DraftListing, src/dev/drafts/wire.ts)
//   POST   /__drafts              a DraftSave, committed with the explanations it keeps in one commit; answers with a DraftReply
//   POST   /__ui-feedback         a FeedbackEntry (src/dev/feedback/entry.ts), kept until pulled
//   GET    /__ui-feedback         the comments kept, oldest first (InboxItem[])
//   DELETE /__ui-feedback?through=<id>   forget the comments pulled, up to and including `id`
// Each must carry a Cloudflare Access token for this application
// (Cf-Access-Jwt-Assertion): a browser signed in through Access, or
// `npm run staging:pull` with a service token.

import { FEEDBACK_ENDPOINT, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { CHECK_ENDPOINT, COPY_ENDPOINT } from "../src/dev/copy/wire.ts";
import { DRAFTS_ENDPOINT } from "../src/dev/drafts/wire.ts";
import { entryName } from "../src/dev/copy/source.ts";
import type { EntryEdit } from "../src/dev/copy/wire.ts";
import { claimsProblem, type Access } from "./access.ts";
import type { Refusal } from "./rules.ts";

/** The paths the staging Worker answers itself; everything else is the production Worker's. */
export const STAGING_PATHS: readonly string[] = [COPY_ENDPOINT, CHECK_ENDPOINT, DRAFTS_ENDPOINT, FEEDBACK_ENDPOINT];

/** Largest body accepted on these paths, in characters; a draft's save may be larger (MAX_DRAFT_BODY). */
export const MAX_STAGING_BODY = 256 * 1024;

export type StagingDecision =
  | { kind: "list-copy"; page: string }
  | { kind: "save-copy" }
  | { kind: "check-copy" }
  | { kind: "list-draft"; page: string }
  | { kind: "save-draft" }
  | { kind: "add-feedback" }
  | { kind: "list-feedback" }
  | { kind: "clear-feedback"; through: number }
  | Refusal;

export interface StagingAsked {
  method: string;
  url: URL;
  /** The Access token's claims, once its signature is checked; null without a valid one. */
  claims: Record<string, unknown> | null;
  /** Whether the caller is within the rate limit. */
  withinLimit: boolean;
  /** Whether the caller is within the tighter limit on calls to Claude, which cost money. */
  withinCheckLimit: boolean;
}

export function decideStaging(asked: StagingAsked, access: Access, now: number): StagingDecision {
  const { method, url } = asked;
  if (!access.issuer || !access.aud) {
    return refuse(503, "Staging's ACCESS_ISSUER or ACCESS_AUD is not set, so its dev tools are off.");
  }
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  const problem = asked.claims ? claimsProblem(asked.claims, access, now) : "There is no valid Cloudflare Access token.";
  if (problem) return refuse(401, problem);
  if (url.pathname === COPY_ENDPOINT) {
    if (method === "GET") return { kind: "list-copy", page: url.searchParams.get("page") ?? "" };
    if (method === "POST") return { kind: "save-copy" };
    return refuse(405, "Use GET or POST.");
  }
  if (url.pathname === DRAFTS_ENDPOINT) {
    if (method === "GET") return { kind: "list-draft", page: url.searchParams.get("page") ?? "" };
    if (method === "POST") return { kind: "save-draft" };
    return refuse(405, "Use GET or POST.");
  }
  if (url.pathname === CHECK_ENDPOINT) {
    if (method !== "POST") return refuse(405, "Use POST.");
    return asked.withinCheckLimit ? { kind: "check-copy" } : refuse(429, "Too many checks. Try again in a minute.");
  }
  if (method === "POST") return { kind: "add-feedback" };
  if (method === "GET") return { kind: "list-feedback" };
  if (method === "DELETE") {
    const through = Number(url.searchParams.get("through"));
    return Number.isInteger(through) && through > 0 ? { kind: "clear-feedback", through } : refuse(400, "Say which comments were pulled: ?through=<id>.");
  }
  return refuse(405, "Use GET, POST or DELETE.");
}

// --- GitHub ------------------------------------------------------------------

export interface GitHub {
  /** The API's base URL; tests stand one in. */
  api: string;
  /** `owner/name`. */
  repo: string;
  branch: string;
  token: string;
}

/** The URL of `path` under the repository, in the REST API. */
const repoUrl = (github: GitHub, path: string): string => `${github.api.replace(/\/$/, "")}/repos/${github.repo}/${path}`;

/** Where the branch's head is read (GET) and moved (PATCH). */
export const refUrl = (github: GitHub, read: boolean): string =>
  repoUrl(github, `git/${read ? "ref" : "refs"}/heads/${encodeURIComponent(github.branch)}`);

/** The URL of a file as it is at commit `ref`, for the contents API. */
export function contentsUrl(github: GitHub, file: string, ref: string): string {
  const path = file.split("/").map(encodeURIComponent).join("/");
  return `${repoUrl(github, `contents/${path}`)}?ref=${encodeURIComponent(ref)}`;
}

export const commitUrl = (github: GitHub, sha: string): string => repoUrl(github, `git/commits/${sha}`);
export const treesUrl = (github: GitHub): string => repoUrl(github, "git/trees");
export const commitsUrl = (github: GitHub): string => repoUrl(github, "git/commits");

export function githubHeaders(github: GitHub): Record<string, string> {
  return {
    Authorization: `Bearer ${github.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "triangle-lab-staging",
  };
}

/** Text as the contents API sends it, base64 of UTF-8. */
export function decodeContent(base64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
}

export function encodeContent(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** A file as read from the contents API, or null when the reply is not one. */
export function readContents(body: unknown): string | null {
  const b = body as { content?: unknown; encoding?: unknown } | null;
  if (typeof b?.content !== "string" || b.encoding !== "base64") return null;
  try {
    return decodeContent(b.content);
  } catch {
    return null;
  }
}

/** The sha an API reply names: a ref's `object.sha`, or a commit's or tree's own `sha`. */
export function shaOf(body: unknown): string | null {
  const b = body as { sha?: unknown; object?: { sha?: unknown } } | null;
  const sha = b?.object?.sha ?? b?.sha;
  return typeof sha === "string" ? sha : null;
}

/** The tree a commit, as the API sends it, points at. */
export function treeOf(body: unknown): string | null {
  const sha = (body as { tree?: { sha?: unknown } } | null)?.tree?.sha;
  return typeof sha === "string" ? sha : null;
}

/** The body that makes a tree of `files` over `base`, the tree of the commit they were read at. */
export function treeBody(base: string, files: ReadonlyMap<string, string>): Record<string, unknown> {
  return {
    base_tree: base,
    tree: [...files].map(([path, content]) => ({ path, mode: "100644", type: "blob", content })),
  };
}

/** The commit message for `edits` to the copy of `lesson`. */
export function commitMessage(lesson: string, edits: readonly EntryEdit[]): string {
  const names = edits.map((e) => entryName(e.section, e.index));
  const what = names.length <= 3 ? names.join(", ") : `${names.length} entries`;
  return `Edit the copy of ${lesson}: ${what}\n\nMade with the copy editor on staging.\n`;
}

/** Where a commit can be seen, from the API's reply that made it. */
export function commitLink(body: unknown): string | null {
  const url = (body as { html_url?: unknown } | null)?.html_url;
  return typeof url === "string" ? url : null;
}

// --- Kept comments -------------------------------------------------------------

/** A comment kept on staging until `npm run staging:pull` takes it. */
export interface InboxItem {
  id: number;
  /** When it was left, ms since the epoch. */
  at: number;
  entry: FeedbackEntry;
}

function refuse(status: number, error: string): Refusal {
  return { kind: "refuse", status, error };
}
