// The Worker's decisions on a request to the recall deck: what it is, and
// whether it may be made.

import { describe, expect, it } from "vitest";
import { newCard, removeCard, type Deck } from "../src/recall/deck.ts";
import { MAX_ASSOCIATE_BODY } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import { CLOCK_SLACK_MS, datedAhead, decide, keyMatches, MAX_BODY, MIN_KEY, type Asked } from "./rules.ts";

const KEY = "k".repeat(MIN_KEY);
const settings = { key: KEY, claude: true };
const asked = (patch: Partial<Asked>): Asked => ({
  method: "GET",
  path: "/deck",
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
    expect(decide(asked({ method: "OPTIONS" }), settings)).toMatchObject({ kind: "refuse", status: 405 });
    expect(decide(asked({ path: "/check", method: "GET" }), settings)).toMatchObject({ status: 405 });
  });
});

describe("decide, for an answer to check", () => {
  const check = (patch: Partial<Asked>) => asked({ path: "/check", method: "POST", ...patch });

  it("checks an answer for a caller with the key", () => {
    expect(decide(check({}), settings)).toEqual({ kind: "check" });
  });

  it("guards checking as it guards the deck", () => {
    expect(decide(check({ authorization: "Bearer guess" }), settings)).toMatchObject({ status: 401 });
    expect(decide(check({ withinLimit: false }), settings)).toMatchObject({ status: 429 });
    expect(decide(check({ length: MAX_CHECK_BODY + 1 }), settings)).toMatchObject({ status: 413 });
    expect(decide(check({}), { ...settings, key: "" })).toMatchObject({ status: 503 });
  });

  it("says checking is off while the Worker has no Claude API key, but only to a caller with the key", () => {
    const off = { ...settings, claude: false };
    expect(decide(check({}), off)).toMatchObject({ status: 503, error: expect.stringContaining("ANTHROPIC_API_KEY") });
    expect(decide(check({ authorization: null }), off)).toMatchObject({ status: 401 });
    expect(decide(asked({}), off)).toEqual({ kind: "read" });
  });
});

describe("decide, for a free association to read", () => {
  const associate = (patch: Partial<Asked>) => asked({ path: "/associate", method: "POST", ...patch });

  it("reads a free association for a caller with the key, by POST only", () => {
    expect(decide(associate({}), settings)).toEqual({ kind: "associate" });
    expect(decide(associate({ method: "GET" }), settings)).toMatchObject({ status: 405 });
  });

  it("guards reading as it guards checking, with a size of its own", () => {
    expect(decide(associate({ authorization: "Bearer guess" }), settings)).toMatchObject({ status: 401 });
    expect(decide(associate({ withinLimit: false }), settings)).toMatchObject({ status: 429 });
    expect(decide(associate({ length: MAX_ASSOCIATE_BODY }), settings)).toEqual({ kind: "associate" });
    expect(decide(associate({ length: MAX_ASSOCIATE_BODY + 1 }), settings)).toMatchObject({ status: 413, error: "That is too long to read." });
  });

  it("says reading is off while the Worker has no Claude API key", () => {
    expect(decide(associate({}), { ...settings, claude: false })).toMatchObject({
      status: 503,
      error: expect.stringMatching(/^Reading free associations is off.*ANTHROPIC_API_KEY/),
    });
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
