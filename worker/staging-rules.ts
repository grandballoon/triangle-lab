// What the staging Worker (staging.ts) does with a request to the dev tools'
// endpoints, decided from plain values: which tool and action it is, whether
// the caller's Cloudflare Access token holds up (access.ts), and the GitHub
// requests that read a lesson's source and commit an edit to it. staging.ts reads the
// request, checks the token's signature, follows the decision and does the
// I/O.
//
// The endpoints, beside everything the production Worker serves:
//   GET    /__step-source?page=   a page's steps from its source (Listing, src/dev/steps/wire.ts)
//   POST   /__step-source         a StepEdit, committed to the staging branch; answers with a SaveReply
//   POST   /__ui-feedback         a FeedbackEntry (src/dev/feedback/entry.ts), kept until pulled
//   GET    /__ui-feedback         the comments kept, oldest first (InboxItem[])
//   DELETE /__ui-feedback?through=<id>   forget the comments pulled, up to and including `id`
// Each must carry a Cloudflare Access token for this application
// (Cf-Access-Jwt-Assertion): a browser signed in through Access, or
// `npm run staging:pull` with a service token.

import { FEEDBACK_ENDPOINT, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { STEPS_ENDPOINT, type StepEdit } from "../src/dev/steps/wire.ts";
import type { StepHome } from "../src/dev/steps/source.ts";
import { claimsProblem, type Access } from "./access.ts";
import type { Refusal } from "./rules.ts";

/** The paths the staging Worker answers itself; everything else is the production Worker's. */
export const STAGING_PATHS: readonly string[] = [STEPS_ENDPOINT, FEEDBACK_ENDPOINT];

/** Largest body accepted on these paths, in characters. */
export const MAX_STAGING_BODY = 64 * 1024;

export type StagingDecision =
  | { kind: "list-steps"; page: string }
  | { kind: "edit-step" }
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
}

export function decideStaging(asked: StagingAsked, access: Access, now: number): StagingDecision {
  const { method, url } = asked;
  if (!access.issuer || !access.aud) {
    return refuse(503, "Staging's ACCESS_ISSUER or ACCESS_AUD is not set, so its dev tools are off.");
  }
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  const problem = asked.claims ? claimsProblem(asked.claims, access, now) : "There is no valid Cloudflare Access token.";
  if (problem) return refuse(401, problem);
  if (url.pathname === STEPS_ENDPOINT) {
    if (method === "GET") return { kind: "list-steps", page: url.searchParams.get("page") ?? "" };
    if (method === "POST") return { kind: "edit-step" };
    return refuse(405, "Use GET or POST.");
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

/** The URL of a file on the branch, for the contents API. */
export function contentsUrl(github: GitHub, file: string, read: boolean): string {
  const path = file.split("/").map(encodeURIComponent).join("/");
  const url = `${github.api.replace(/\/$/, "")}/repos/${github.repo}/contents/${path}`;
  return read ? `${url}?ref=${encodeURIComponent(github.branch)}` : url;
}

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
export function readContents(body: unknown): { text: string; sha: string } | null {
  const b = body as { content?: unknown; sha?: unknown; encoding?: unknown } | null;
  if (typeof b?.content !== "string" || typeof b.sha !== "string" || b.encoding !== "base64") return null;
  try {
    return { text: decodeContent(b.content), sha: b.sha };
  } catch {
    return null;
  }
}

/** The commit message for an edit. */
export function commitMessage(edit: StepEdit, home: StepHome): string {
  const lesson = home.key ?? home.file.replace(/^.*\/(.+)\.ts$/, "$1");
  return `Edit the ${edit.field} of step ${edit.step + 1} in ${lesson}\n\nMade with the step editor on staging.\n`;
}

/** The body of the contents API request that commits `text` over the file at `sha`. */
export function commitBody(github: GitHub, text: string, sha: string, message: string): Record<string, string> {
  return { message, content: encodeContent(text), sha, branch: github.branch };
}

/** Where a commit can be seen, from the contents API's reply. */
export function commitLink(body: unknown): string | null {
  const url = (body as { commit?: { html_url?: unknown } } | null)?.commit?.html_url;
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
