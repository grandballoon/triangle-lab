// The deploy guard: which Access vars wrangler.jsonc leaves empty.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { accessUnset } from "./access.ts";

const SET = { ACCESS_ISSUER: "https://team.cloudflareaccess.com", ACCESS_AUD: "aud" };

describe("accessUnset", () => {
  it("names the vars left empty, for production or an environment", () => {
    expect(accessUnset({ vars: SET }, null)).toEqual([]);
    expect(accessUnset({ vars: { ...SET, ACCESS_AUD: " " } }, null)).toEqual(["ACCESS_AUD"]);
    expect(accessUnset({ vars: {} }, null)).toEqual(["ACCESS_ISSUER", "ACCESS_AUD"]);
    expect(accessUnset({ vars: SET, env: { staging: { vars: { ACCESS_ISSUER: SET.ACCESS_ISSUER } } } }, "staging")).toEqual(["ACCESS_AUD"]);
    expect(accessUnset({ vars: SET }, "staging")).toEqual(["ACCESS_ISSUER", "ACCESS_AUD"]);
    expect(accessUnset(null, null)).toEqual(["ACCESS_ISSUER", "ACCESS_AUD"]);
  });

  it("finds staging's Access application set in wrangler.jsonc", () => {
    const path = resolve(import.meta.dirname, "..", "wrangler.jsonc");
    const { config } = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
    expect(accessUnset(config, "staging")).toEqual([]);
  });
});
