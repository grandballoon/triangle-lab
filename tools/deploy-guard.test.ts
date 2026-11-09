// The deploy guard: which vars a deploy needs that wrangler.jsonc leaves empty.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { unsetVars } from "./deploy-guard.ts";

const ACCESS = { ACCESS_ISSUER: "https://team.cloudflareaccess.com", ACCESS_AUD: "aud" };
const SENDER = { SENDER: "signin@example.com" };

describe("unsetVars", () => {
  it("needs only the sender in production", () => {
    expect(unsetVars({ vars: SENDER }, null)).toEqual([]);
    expect(unsetVars({ vars: { SENDER: " " } }, null)).toEqual(["SENDER"]);
    expect(unsetVars({ vars: {} }, null)).toEqual(["SENDER"]);
    expect(unsetVars(null, null)).toEqual(["SENDER"]);
  });

  it("needs the sender and the Access application on staging, from its own vars", () => {
    expect(unsetVars({ env: { staging: { vars: { ...SENDER, ...ACCESS } } } }, "staging")).toEqual([]);
    expect(unsetVars({ env: { staging: { vars: { ...SENDER, ACCESS_ISSUER: ACCESS.ACCESS_ISSUER } } } }, "staging")).toEqual(["ACCESS_AUD"]);
    expect(unsetVars({ vars: { ...SENDER, ...ACCESS } }, "staging")).toEqual(["SENDER", "ACCESS_ISSUER", "ACCESS_AUD"]);
  });

  it("finds staging's Access application set in wrangler.jsonc", () => {
    const path = resolve(import.meta.dirname, "..", "wrangler.jsonc");
    const { config } = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
    expect(unsetVars(config, "staging").filter((name) => name !== "SENDER")).toEqual([]);
  });
});
