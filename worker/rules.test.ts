// The recall Worker's decisions: what each request is, who may make it, and
// which pages may read the answer.

import { describe, expect, it } from "vitest";
import { corsHeaders, decide, keyMatches, type Asked } from "./rules.ts";

const settings = { key: "s3cret", origins: "https://example.github.io http://localhost:5173" };
const asked = (patch: Partial<Asked>): Asked => ({
  method: "GET",
  path: "/deck",
  origin: null,
  authorization: "Bearer s3cret",
  ...patch,
});

describe("decide", () => {
  it("reads or merges the deck for a caller with the key", () => {
    expect(decide(asked({}), settings)).toEqual({ kind: "read" });
    expect(decide(asked({ method: "POST" }), settings)).toEqual({ kind: "merge" });
  });

  it("answers a preflight without a key, since browsers send none", () => {
    expect(decide(asked({ method: "OPTIONS", authorization: null }), settings)).toEqual({ kind: "preflight" });
  });

  it("refuses a wrong key, a missing one, or any key when none was set", () => {
    expect(decide(asked({ authorization: "Bearer guess" }), settings)).toMatchObject({ kind: "refuse", status: 401 });
    expect(decide(asked({ authorization: null }), settings)).toMatchObject({ kind: "refuse", status: 401 });
    expect(decide(asked({ authorization: "Bearer " }), { ...settings, key: "" })).toMatchObject({ status: 503 });
  });

  it("refuses other paths and methods", () => {
    expect(decide(asked({ path: "/" }), settings)).toMatchObject({ kind: "refuse", status: 404 });
    expect(decide(asked({ method: "DELETE" }), settings)).toMatchObject({ kind: "refuse", status: 405 });
  });
});

describe("keyMatches", () => {
  it("takes only the exact key, as a bearer token", () => {
    expect(keyMatches("Bearer s3cret", "s3cret")).toBe(true);
    for (const header of ["s3cret", "Bearer s3cre", "Bearer s3cret!", "Bearer S3cret", "Basic s3cret", "", null]) {
      expect(keyMatches(header, "s3cret")).toBe(false);
    }
    expect(keyMatches("Bearer ", "")).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("lets the listed pages read the answer, and no others", () => {
    expect(corsHeaders("http://localhost:5173", settings.origins)).toMatchObject({
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    });
    expect(corsHeaders("https://elsewhere.example", settings.origins)).toEqual({ Vary: "Origin" });
    expect(corsHeaders("https://example.github", settings.origins)).toEqual({ Vary: "Origin" });
    expect(corsHeaders(null, settings.origins)).toEqual({ Vary: "Origin" });
  });
});
