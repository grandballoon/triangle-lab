// The Worker's decisions on a request to the recall deck or to Claude: what
// it is, whether it may be made, and whose deck it is for.

import { describe, expect, it } from "vitest";
import { newCard, removeCard, type Deck } from "../src/recall/deck.ts";
import { MAX_ASSOCIATE_BODY } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY } from "../src/recall/check.ts";
import { MAX_EXPLAIN_BODY } from "../src/recall/explain.ts";
import { accountTooLarge, CLOCK_SLACK_MS, datedAhead, decide, deckFor, LEGACY_DECK, MAX_ACCOUNT_BODY, MAX_BODY, type Asked, type Settings } from "./rules.ts";

const OWNER = "owner@example.com";
const settings: Settings = { claude: true, owner: OWNER };
const asked = (patch: Partial<Asked>): Asked => ({
  method: "GET",
  path: "/deck",
  email: OWNER,
  fromPage: true,
  length: null,
  withinLimit: true,
  ...patch,
});

describe("decide", () => {
  it("reads or merges the deck of whoever is signed in", () => {
    expect(decide(asked({}), settings)).toEqual({ kind: "read", deck: LEGACY_DECK });
    expect(decide(asked({ method: "POST" }), settings)).toEqual({ kind: "merge", deck: LEGACY_DECK });
    expect(decide(asked({ email: "demo@example.com" }), settings)).toEqual({ kind: "read", deck: "learner:demo@example.com" });
  });

  it("asks to sign in when no one is, on every path", () => {
    for (const path of ["/deck", "/check", "/associate", "/explain", "/account"]) {
      const method = path === "/deck" || path === "/account" ? "GET" : "POST";
      expect(decide(asked({ path, method, email: null }), settings)).toEqual({ kind: "refuse", status: 401, error: "Sign in first." });
    }
  });

  it("refuses a request not made by the site's own pages, so no other site can change a deck", () => {
    expect(decide(asked({ fromPage: false }), settings)).toMatchObject({ status: 403 });
    expect(decide(asked({ fromPage: false, method: "POST" }), settings)).toMatchObject({ status: 403 });
  });

  it("refuses a caller over the rate limit first", () => {
    expect(decide(asked({ withinLimit: false, email: null }), settings)).toMatchObject({ kind: "refuse", status: 429 });
  });

  it("refuses a deck declared too large before it is read", () => {
    expect(decide(asked({ method: "POST", length: MAX_BODY + 1 }), settings)).toMatchObject({ status: 413 });
    expect(decide(asked({ method: "POST", length: MAX_BODY }), settings)).toEqual({ kind: "merge", deck: LEGACY_DECK });
  });

  it("refuses other paths and methods", () => {
    expect(decide(asked({ path: "/" }), settings)).toMatchObject({ kind: "refuse", status: 404 });
    expect(decide(asked({ method: "DELETE" }), settings)).toMatchObject({ kind: "refuse", status: 405 });
    expect(decide(asked({ method: "OPTIONS" }), settings)).toMatchObject({ kind: "refuse", status: 405 });
    expect(decide(asked({ path: "/check", method: "GET" }), settings)).toMatchObject({ status: 405 });
  });

  it("serves no deck while the owner is not set, but the calls to Claude, which hold none, still work", () => {
    expect(decide(asked({}), { ...settings, owner: "" })).toMatchObject({ status: 503, error: expect.stringContaining("OWNER_EMAIL") });
    expect(decide(asked({ path: "/check", method: "POST" }), { ...settings, owner: "" })).toEqual({ kind: "check", email: OWNER });
  });
});

describe("decide, for a learner's account", () => {
  const account = (patch: Partial<Asked>) => asked({ path: "/account", ...patch });

  it("shows, saves a key to, and removes the key from the account of whoever is signed in", () => {
    expect(decide(account({}), settings)).toEqual({ kind: "account", email: OWNER });
    expect(decide(account({ method: "PUT", email: "demo@example.com" }), settings)).toEqual({ kind: "save-key", email: "demo@example.com" });
    expect(decide(account({ method: "DELETE" }), settings)).toEqual({ kind: "remove-key", email: OWNER });
    expect(decide(account({ method: "POST" }), settings)).toMatchObject({ status: 405 });
  });

  it("guards the account as the deck is, and takes no more than a key's worth of body", () => {
    expect(decide(account({ email: null }), settings)).toMatchObject({ status: 401 });
    expect(decide(account({ fromPage: false, method: "PUT" }), settings)).toMatchObject({ status: 403 });
    expect(decide(account({ withinLimit: false }), settings)).toMatchObject({ status: 429 });
    expect(decide(account({ method: "PUT", length: MAX_ACCOUNT_BODY }), settings)).toMatchObject({ kind: "save-key" });
    expect(decide(account({ method: "PUT", length: MAX_ACCOUNT_BODY + 1 }), settings)).toEqual(accountTooLarge);
  });

  it("shows the account while the Worker has no Claude API key, since a learner's own key needs none", () => {
    expect(decide(account({}), { ...settings, claude: false })).toEqual({ kind: "account", email: OWNER });
  });
});

describe("deckFor", () => {
  it("gives the owner the deck the site held while it had one learner, whatever the case of their email", () => {
    expect(deckFor(OWNER, OWNER)).toBe(LEGACY_DECK);
    expect(deckFor(" Owner@Example.COM ", OWNER)).toBe(LEGACY_DECK);
    expect(deckFor(OWNER, " OWNER@example.com")).toBe(LEGACY_DECK);
  });

  it("gives everyone else a deck of their own, by their email", () => {
    expect(deckFor("demo@example.com", OWNER)).toBe("learner:demo@example.com");
    expect(deckFor("Demo@Example.com", OWNER)).toBe("learner:demo@example.com");
    expect(deckFor("someone@example.com", OWNER)).not.toBe(deckFor("demo@example.com", OWNER));
  });

  it("has no deck for anyone while the owner is not set, so the owner's is never handed to someone else", () => {
    for (const owner of ["", " "]) expect(deckFor(OWNER, owner)).toMatchObject({ status: 503 });
  });
});

describe("decide, for an answer to check", () => {
  const check = (patch: Partial<Asked>) => asked({ path: "/check", method: "POST", ...patch });

  it("checks an answer for someone signed in, guarded as the deck is", () => {
    expect(decide(check({}), settings)).toEqual({ kind: "check", email: OWNER });
    expect(decide(check({ email: null }), settings)).toMatchObject({ status: 401 });
    expect(decide(check({ withinLimit: false }), settings)).toMatchObject({ status: 429 });
    expect(decide(check({ fromPage: false }), settings)).toMatchObject({ status: 403 });
    expect(decide(check({ length: MAX_CHECK_BODY + 1 }), settings)).toMatchObject({ status: 413 });
  });

  it("says checking is off while the Worker has no Claude API key, but only to someone signed in", () => {
    const off = { ...settings, claude: false };
    expect(decide(check({}), off)).toMatchObject({ status: 503, error: expect.stringContaining("ANTHROPIC_API_KEY") });
    expect(decide(check({ email: null }), off)).toMatchObject({ status: 401 });
    expect(decide(asked({}), off)).toEqual({ kind: "read", deck: LEGACY_DECK });
  });
});

describe("decide, for a free association to read", () => {
  const associate = (patch: Partial<Asked>) => asked({ path: "/associate", method: "POST", ...patch });

  it("reads a free association for someone signed in, by POST only, with a size of its own", () => {
    expect(decide(associate({}), settings)).toEqual({ kind: "associate", email: OWNER });
    expect(decide(associate({ method: "GET" }), settings)).toMatchObject({ status: 405 });
    expect(decide(associate({ email: null }), settings)).toMatchObject({ status: 401 });
    expect(decide(associate({ length: MAX_ASSOCIATE_BODY }), settings)).toEqual({ kind: "associate", email: OWNER });
    expect(decide(associate({ length: MAX_ASSOCIATE_BODY + 1 }), settings)).toMatchObject({ status: 413, error: "That is too long to read." });
  });

  it("says reading is off while the Worker has no Claude API key", () => {
    expect(decide(associate({}), { ...settings, claude: false })).toMatchObject({
      status: 503,
      error: expect.stringMatching(/^Reading free associations is off.*ANTHROPIC_API_KEY/),
    });
  });
});

describe("decide, for an explanation to check", () => {
  const explain = (patch: Partial<Asked>) => asked({ path: "/explain", method: "POST", ...patch });

  it("checks an explanation for someone signed in, by POST only, guarded as checking is", () => {
    expect(decide(explain({}), settings)).toEqual({ kind: "explain", email: OWNER });
    expect(decide(explain({ method: "GET" }), settings)).toMatchObject({ status: 405 });
    expect(decide(explain({ email: null }), settings)).toMatchObject({ status: 401 });
    expect(decide(explain({ length: MAX_EXPLAIN_BODY + 1 }), settings)).toMatchObject({ status: 413 });
  });

  it("says checking explanations is off while the Worker has no Claude API key", () => {
    expect(decide(explain({}), { ...settings, claude: false })).toMatchObject({
      status: 503,
      error: expect.stringMatching(/^Checking explanations is off.*ANTHROPIC_API_KEY/),
    });
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

  it("checks when the free association last changed too", () => {
    const now = 1_000_000;
    const deck = (updated: number): Deck => ({ cards: [], removed: [], writing: { text: "Hi", read: null, updated } });
    expect(datedAhead(deck(now + CLOCK_SLACK_MS), now)).toBe(false);
    expect(datedAhead(deck(now + CLOCK_SLACK_MS + 1), now)).toBe(true);
  });

  it("checks when each explanation last changed too", () => {
    const now = 1_000_000;
    const deck = (updated: number): Deck => ({ cards: [], removed: [], explanations: [{ lesson: "medians", text: "Hi", checked: null, updated }] });
    expect(datedAhead(deck(now + CLOCK_SLACK_MS), now)).toBe(false);
    expect(datedAhead(deck(now + CLOCK_SLACK_MS + 1), now)).toBe(true);
  });

  it("ignores when a card is next due, which is ahead by design", () => {
    expect(datedAhead(deck({ ...card("a", T0), due: T0 + 35 * 24 * CLOCK_SLACK_MS }), T0)).toBe(false);
  });
});
