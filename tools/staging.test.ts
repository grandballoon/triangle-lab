// Staging from this side: which builds carry the dev tools, finding staging
// in .dev.vars, and comments pulled from it written as the dev server writes
// them.

import { describe, expect, it } from "vitest";
import { formatEntry, type FeedbackEntry } from "../src/dev/feedback/entry.ts";
import { accessHeaders, pulledText, stagingOf } from "./staging.ts";
import { devTools } from "./staging-mode.ts";

describe("devTools", () => {
  it("is on the dev server and in the staging build, never in production", () => {
    expect(devTools({}, { command: "serve", mode: "development" })).toBe(true);
    expect(devTools({}, { command: "build", mode: "staging" })).toBe(true);
    expect(devTools({}, { command: "build", mode: "production" })).toBe(false);
  });
});

describe("stagingOf", () => {
  it("reads staging's address and service token", () => {
    const vars = `RECALL_KEY=x\nSTAGING_URL=https://staging.example.com\nSTAGING_ACCESS_CLIENT_ID="id.access"\nSTAGING_ACCESS_CLIENT_SECRET=secret\n`;
    const staging = { url: "https://staging.example.com", clientId: "id.access", clientSecret: "secret" };
    expect(stagingOf(vars)).toEqual(staging);
    expect(accessHeaders(staging)).toEqual({ "CF-Access-Client-Id": "id.access", "CF-Access-Client-Secret": "secret" });
  });

  it("names what is missing", () => {
    expect(stagingOf("STAGING_URL=https://s.example.com\n")).toEqual({ missing: ["STAGING_ACCESS_CLIENT_ID", "STAGING_ACCESS_CLIENT_SECRET"] });
  });
});

describe("pulledText", () => {
  it("writes each comment as the dev server would have, stamped with when it was left", () => {
    const entry: FeedbackEntry = {
      comment: "Too tight.",
      page: "/lab?lesson=slope",
      selector: "#steps",
      element: "<aside#steps>",
      point: { x: 1, y: 2 },
      size: { width: 300, height: 600 },
      viewport: { width: 1280, height: 800 },
    };
    const at = new Date(2026, 9, 30, 9, 15).getTime();
    expect(pulledText([{ id: 1, at, entry }, { id: 2, at: at + 60_000, entry: { ...entry, comment: "Second." } }])).toBe(
      formatEntry(entry, new Date(at)) + formatEntry({ ...entry, comment: "Second." }, new Date(at + 60_000)),
    );
    expect(pulledText([])).toBe("");
  });
});
