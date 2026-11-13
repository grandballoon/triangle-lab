// The staging Worker's decisions: routing to the dev tools behind Access, and
// the GitHub requests that read a lesson's source and commit edits to it.

import { describe, expect, it } from "vitest";
import type { EntryEdit } from "../src/dev/copy/wire.ts";
import {
  commitLink,
  commitMessage,
  commitUrl,
  commitsUrl,
  contentsUrl,
  decideStaging,
  decodeContent,
  encodeContent,
  readContents,
  refUrl,
  shaOf,
  treeBody,
  treeOf,
  treesUrl,
  type GitHub,
} from "./staging-rules.ts";

const ACCESS = { issuer: "https://team.cloudflareaccess.com", aud: "aud-tag" };
const NOW = 1_700_000_000_000;
const CLAIMS = { iss: ACCESS.issuer, aud: [ACCESS.aud], exp: NOW / 1000 + 600, nbf: NOW / 1000 - 10 };
const GITHUB: GitHub = { api: "https://api.github.com", repo: "owner/repo", branch: "staging", token: "t" };

const ask = (method: string, path: string, over: { claims?: Record<string, unknown> | null; withinLimit?: boolean; withinCheckLimit?: boolean } = {}) =>
  decideStaging({ method, url: new URL(path, "https://staging.test"), claims: CLAIMS, withinLimit: true, withinCheckLimit: true, ...over }, ACCESS, NOW);

describe("decideStaging", () => {
  it("routes the copy editor and the feedback inbox", () => {
    expect(ask("GET", "/__copy?page=%2Fangles")).toEqual({ kind: "list-copy", page: "/angles" });
    expect(ask("POST", "/__copy")).toEqual({ kind: "save-copy" });
    expect(ask("POST", "/__copy/check")).toEqual({ kind: "check-copy" });
    expect(ask("POST", "/__ui-feedback")).toEqual({ kind: "add-feedback" });
    expect(ask("GET", "/__ui-feedback")).toEqual({ kind: "list-feedback" });
    expect(ask("DELETE", "/__ui-feedback?through=7")).toEqual({ kind: "clear-feedback", through: 7 });
  });

  it("refuses without a good token, over the limit, unconfigured, or asked wrongly", () => {
    expect(ask("GET", "/__ui-feedback", { claims: null })).toMatchObject({ kind: "refuse", status: 401 });
    expect(ask("GET", "/__ui-feedback", { claims: { ...CLAIMS, aud: "other" } })).toMatchObject({ status: 401, error: "The Access token is for another application." });
    expect(ask("GET", "/__ui-feedback", { withinLimit: false })).toMatchObject({ status: 429 });
    expect(ask("POST", "/__copy/check", { withinCheckLimit: false })).toMatchObject({ status: 429, error: "Too many checks. Try again in a minute." });
    expect(ask("POST", "/__copy/check", { claims: null })).toMatchObject({ status: 401 });
    expect(
      decideStaging({ method: "GET", url: new URL("https://s.test/__ui-feedback"), claims: CLAIMS, withinLimit: true, withinCheckLimit: true }, { issuer: "", aud: "" }, NOW),
    ).toMatchObject({ status: 503 });
    expect(ask("PUT", "/__copy")).toMatchObject({ status: 405 });
    expect(ask("GET", "/__copy/check")).toMatchObject({ status: 405 });
    expect(ask("PUT", "/__ui-feedback")).toMatchObject({ status: 405 });
    expect(ask("DELETE", "/__ui-feedback")).toMatchObject({ status: 400 });
    expect(ask("DELETE", "/__ui-feedback?through=-1")).toMatchObject({ status: 400 });
  });
});

describe("GitHub", () => {
  it("addresses the branch, a file at a commit, and the Git Data API", () => {
    expect(refUrl(GITHUB, true)).toBe("https://api.github.com/repos/owner/repo/git/ref/heads/staging");
    expect(refUrl(GITHUB, false)).toBe("https://api.github.com/repos/owner/repo/git/refs/heads/staging");
    expect(contentsUrl(GITHUB, "src/lab/lessons/slope.ts", "abc")).toBe("https://api.github.com/repos/owner/repo/contents/src/lab/lessons/slope.ts?ref=abc");
    expect(commitUrl(GITHUB, "abc")).toBe("https://api.github.com/repos/owner/repo/git/commits/abc");
    expect(treesUrl(GITHUB)).toBe("https://api.github.com/repos/owner/repo/git/trees");
    expect(commitsUrl({ ...GITHUB, api: "https://api.github.com/" })).toBe("https://api.github.com/repos/owner/repo/git/commits");
  });

  it("reads content as base64 of UTF-8", () => {
    const text = "Drag $A$ — 90° · π\n";
    expect(decodeContent(encodeContent(text))).toBe(text);
    const wrapped = encodeContent(text).replace(/(.{8})/g, "$1\n");
    expect(readContents({ content: wrapped, sha: "abc", encoding: "base64" })).toBe(text);
    expect(readContents({ content: "x", sha: "abc" })).toBeNull();
    expect(readContents(null)).toBeNull();
  });

  it("reads the shas of a ref, a commit and its tree", () => {
    expect(shaOf({ object: { sha: "head" } })).toBe("head");
    expect(shaOf({ sha: "tree" })).toBe("tree");
    expect(shaOf({})).toBeNull();
    expect(treeOf({ sha: "c", tree: { sha: "t" } })).toBe("t");
    expect(treeOf(null)).toBeNull();
  });

  it("makes one tree of every file written, over the tree they were read at", () => {
    const files = new Map([
      ["src/directions.ts", "a"],
      ["src/asides.ts", "b"],
    ]);
    expect(treeBody("base", files)).toEqual({
      base_tree: "base",
      tree: [
        { path: "src/directions.ts", mode: "100644", type: "blob", content: "a" },
        { path: "src/asides.ts", mode: "100644", type: "blob", content: "b" },
      ],
    });
  });

  it("writes the commit message, naming what changed", () => {
    const edit = (section: EntryEdit["section"], index: number): EntryEdit => ({ section, index, was: { title: "a", text: "b" }, to: { text: "c" } });
    expect(commitMessage("slope", [edit("steps", 1), edit("likes", 0)])).toBe("Edit the copy of slope: step 2, likeness 1\n\nMade with the copy editor on staging.\n");
    expect(commitMessage("angles", [edit("steps", 0), edit("steps", 1), edit("uses", 0), edit("uses", 1)])).toBe(
      "Edit the copy of angles: 4 entries\n\nMade with the copy editor on staging.\n",
    );
    expect(commitLink({ html_url: "https://github.com/owner/repo/commit/1" })).toBe("https://github.com/owner/repo/commit/1");
    expect(commitLink({})).toBeNull();
  });
});
