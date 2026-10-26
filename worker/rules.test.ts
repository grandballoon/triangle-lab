// The recall Worker's decisions: what each request is, who may make it, and
// which pages may read the answer.

import { describe, expect, it } from "vitest";
import { newCard, removeCard, type Deck } from "../src/recall/deck.ts";
import { CLOCK_SLACK_MS, corsHeaders, datedAhead, decide, keyMatches, MAX_BODY, MIN_KEY, type Asked } from "./rules.ts";

const KEY = "k".repeat(MIN_KEY);
const settings = { key: KEY, origins: "https://example.github.io http://localhost:5173" };
const asked = (patch: Partial<Asked>): Asked => ({
  method: "GET",
  path: "/deck",
  origin: null,
  authorization: `Bearer ${KEY}`,
  length: null,
  withinLimit: true,
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

  it("refuses a wrong key or a missing one", () => {
    expect(decide(asked({ authorization: "Bearer guess" }), settings)).toMatchObject({ kind: "refuse", status: 401 });
    expect(decide(asked({ authorization: null }), settings)).toMatchObject({ kind: "refuse", status: 401 });
  });

  it("serves no one while its own key is unset or short enough to guess", () => {
    expect(decide(asked({ authorization: "Bearer " }), { ...settings, key: "" })).toMatchObject({ status: 503 });
    const short = "k".repeat(MIN_KEY - 1);
    expect(decide(asked({ authorization: `Bearer ${short}` }), { ...settings, key: short })).toMatchObject({
      status: 503,
    });
  });

  it("refuses a caller over the rate limit before looking at its key", () => {
    expect(decide(asked({ withinLimit: false }), settings)).toMatchObject({ kind: "refuse", status: 429 });
    expect(decide(asked({ withinLimit: false, authorization: "Bearer guess" }), settings)).toMatchObject({
      status: 429,
    });
  });

  it("refuses a deck declared too large before it is read", () => {
    expect(decide(asked({ method: "POST", length: MAX_BODY + 1 }), settings)).toMatchObject({ status: 413 });
    expect(decide(asked({ method: "POST", length: MAX_BODY }), settings)).toEqual({ kind: "merge" });
  });

  it("refuses other paths and methods", () => {
    expect(decide(asked({ path: "/" }), settings)).toMatchObject({ kind: "refuse", status: 404 });
    expect(decide(asked({ method: "DELETE" }), settings)).toMatchObject({ kind: "refuse", status: 405 });
  });
});

describe("keyMatches", () => {
  it("takes only the exact key, as a bearer token", () => {
    expect(keyMatches(`Bearer ${KEY}`, KEY)).toBe(true);
    const nearly = [KEY.slice(1), `${KEY}!`, `K${KEY.slice(1)}`];
    for (const header of [KEY, ...nearly.map((k) => `Bearer ${k}`), `Basic ${KEY}`, "", null]) {
      expect(keyMatches(header, KEY)).toBe(false);
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

describe("datedAhead", () => {
  const T0 = 1_800_000_000_000;
  const card = (id: string, at: number) => newCard(id, "Q?", { lesson: "medians", step: 0, stepTitle: "" }, at)!;
  const deck = (...cards: ReturnType<typeof card>[]): Deck => ({ cards, removed: [] });

  it("allows a device's clock to be a little ahead, and no more", () => {
    expect(datedAhead(deck(card("a", T0), card("b", T0 + CLOCK_SLACK_MS)), T0)).toBe(false);
    expect(datedAhead(deck(card("a", T0), card("b", T0 + CLOCK_SLACK_MS + 1)), T0)).toBe(true);
    expect(datedAhead(removeCard(deck(card("a", T0)), "a", T0 + 365 * 24 * CLOCK_SLACK_MS), T0)).toBe(true);
  });

  it("ignores when a card is next due, which is ahead by design", () => {
    expect(datedAhead(deck({ ...card("a", T0), due: T0 + 35 * 24 * CLOCK_SLACK_MS }), T0)).toBe(false);
  });
});
