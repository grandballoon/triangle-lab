// The staging Worker's decisions: routing to the dev tools, Access token
// claims, and the GitHub requests that read and commit a lesson's source.

import { describe, expect, it } from "vitest";
import type { StepEdit } from "../src/dev/steps/wire.ts";
import {
  certsUrl,
  claimsProblem,
  commitBody,
  commitLink,
  commitMessage,
  contentsUrl,
  decideStaging,
  decodeContent,
  encodeContent,
  readContents,
  readJwt,
  type GitHub,
} from "./staging-rules.ts";

const ACCESS = { issuer: "https://team.cloudflareaccess.com", aud: "aud-tag" };
const NOW = 1_700_000_000_000;
const CLAIMS = { iss: ACCESS.issuer, aud: [ACCESS.aud], exp: NOW / 1000 + 600, nbf: NOW / 1000 - 10 };
const GITHUB: GitHub = { api: "https://api.github.com", repo: "owner/repo", branch: "staging", token: "t" };

const ask = (method: string, path: string, over: { claims?: Record<string, unknown> | null; withinLimit?: boolean } = {}) =>
  decideStaging({ method, url: new URL(path, "https://staging.test"), claims: CLAIMS, withinLimit: true, ...over }, ACCESS, NOW);

describe("decideStaging", () => {
  it("routes the step editor and the feedback inbox", () => {
    expect(ask("GET", "/__step-source?page=%2Fangles")).toEqual({ kind: "list-steps", page: "/angles" });
    expect(ask("POST", "/__step-source")).toEqual({ kind: "edit-step" });
    expect(ask("POST", "/__ui-feedback")).toEqual({ kind: "add-feedback" });
    expect(ask("GET", "/__ui-feedback")).toEqual({ kind: "list-feedback" });
    expect(ask("DELETE", "/__ui-feedback?through=7")).toEqual({ kind: "clear-feedback", through: 7 });
  });

  it("refuses without a good token, over the limit, unconfigured, or asked wrongly", () => {
    expect(ask("GET", "/__ui-feedback", { claims: null })).toMatchObject({ kind: "refuse", status: 401 });
    expect(ask("GET", "/__ui-feedback", { claims: { ...CLAIMS, aud: "other" } })).toMatchObject({ status: 401, error: "The Access token is for another application." });
    expect(ask("GET", "/__ui-feedback", { withinLimit: false })).toMatchObject({ status: 429 });
    expect(decideStaging({ method: "GET", url: new URL("https://s.test/__ui-feedback"), claims: CLAIMS, withinLimit: true }, { issuer: "", aud: "" }, NOW)).toMatchObject({ status: 503 });
    expect(ask("PUT", "/__step-source")).toMatchObject({ status: 405 });
    expect(ask("PUT", "/__ui-feedback")).toMatchObject({ status: 405 });
    expect(ask("DELETE", "/__ui-feedback")).toMatchObject({ status: 400 });
    expect(ask("DELETE", "/__ui-feedback?through=-1")).toMatchObject({ status: 400 });
  });
});

describe("Access tokens", () => {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

  it("takes a token apart", () => {
    const header = { alg: "RS256", kid: "k1" };
    const token = `${part(header)}.${part(CLAIMS)}.${Buffer.from([1, 2, 255]).toString("base64url")}`;
    expect(readJwt(token)).toEqual({
      header,
      claims: CLAIMS,
      signed: new TextEncoder().encode(token.slice(0, token.lastIndexOf("."))),
      signature: new Uint8Array([1, 2, 255]),
    });
    for (const bad of [null, "", "a.b", "a.b.c", `${part(header)}.${part([1])}.AA`, `${part(header)}.${part(CLAIMS)}.+/`]) {
      expect(readJwt(bad), String(bad)).toBeNull();
    }
  });

  it("checks the team, application and time", () => {
    expect(claimsProblem(CLAIMS, ACCESS, NOW)).toBeNull();
    expect(claimsProblem({ ...CLAIMS, aud: ACCESS.aud }, ACCESS, NOW)).toBeNull();
    expect(claimsProblem(CLAIMS, { ...ACCESS, issuer: `${ACCESS.issuer}/` }, NOW)).toBeNull();
    expect(claimsProblem({ ...CLAIMS, iss: "https://other.cloudflareaccess.com" }, ACCESS, NOW)).toBe("The Access token is from another team.");
    expect(claimsProblem({ ...CLAIMS, exp: NOW / 1000 - 120 }, ACCESS, NOW)).toBe("The Access token has expired.");
    expect(claimsProblem({ ...CLAIMS, exp: undefined }, ACCESS, NOW)).toBe("The Access token has expired.");
    expect(claimsProblem({ ...CLAIMS, nbf: NOW / 1000 + 120 }, ACCESS, NOW)).toBe("The Access token is not valid yet.");
    expect(certsUrl(ACCESS.issuer)).toBe("https://team.cloudflareaccess.com/cdn-cgi/access/certs");
  });
});

describe("GitHub", () => {
  it("addresses a file on the branch", () => {
    expect(contentsUrl(GITHUB, "src/lab/lessons/slope.ts", true)).toBe("https://api.github.com/repos/owner/repo/contents/src/lab/lessons/slope.ts?ref=staging");
    expect(contentsUrl(GITHUB, "src/directions.ts", false)).toBe("https://api.github.com/repos/owner/repo/contents/src/directions.ts");
  });

  it("reads and writes content as base64 of UTF-8", () => {
    const text = "Drag $A$ — 90° · π\n";
    expect(decodeContent(encodeContent(text))).toBe(text);
    const wrapped = encodeContent(text).replace(/(.{8})/g, "$1\n");
    expect(readContents({ content: wrapped, sha: "abc", encoding: "base64" })).toEqual({ text, sha: "abc" });
    expect(readContents({ content: "x", sha: "abc" })).toBeNull();
    expect(readContents(null)).toBeNull();
  });

  it("writes the commit", () => {
    const edit: StepEdit = { page: "/lab.html?lesson=slope", step: 1, was: { title: "a", text: "b" }, field: "text", to: "c" };
    expect(commitMessage(edit, { file: "src/lab/lessons/slope.ts", key: null })).toBe("Edit the text of step 2 in slope\n\nMade with the step editor on staging.\n");
    expect(commitMessage({ ...edit, field: "title", step: 0 }, { file: "src/directions.ts", key: "angles" })).toBe("Edit the title of step 1 in angles\n\nMade with the step editor on staging.\n");
    expect(commitBody(GITHUB, "new", "sha1", "m")).toEqual({ message: "m", content: encodeContent("new"), sha: "sha1", branch: "staging" });
    expect(commitLink({ commit: { html_url: "https://github.com/owner/repo/commit/1" } })).toBe("https://github.com/owner/repo/commit/1");
    expect(commitLink({})).toBeNull();
  });
});
