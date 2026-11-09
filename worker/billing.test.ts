// Paying for calls to Claude: what a call cost, whose key pays for it, and
// what the account page is told.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_STATUS,
  accountOf,
  billingSettings,
  costOf,
  creditFor,
  fund,
  keyHint,
  micros,
  monthOf,
  PRICES,
  readApiKey,
  UNLISTED_PRICE,
  type BillingSettings,
  type Ledger,
} from "./billing.ts";

type Message = Anthropic.Beta.Messages.BetaMessage;

const OWNER = "owner@example.com";
const DEMO = "demo@example.com";
const ASKED = "claude-opus-5-5";
const settings: BillingSettings = { owner: OWNER, credits: "", standard: 5_000_000, cap: 50_000_000 };
const ledger = (patch: Partial<Ledger> = {}): Ledger => ({ ownKey: false, hint: null, spent: 0, monthSpent: 0, ...patch });

/** A reply from Claude with `usage` (the rest of its usage empty), served by `model`. */
function reply(usage: Partial<Message["usage"]>, model = "claude-opus-5-5"): Message {
  return {
    model,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      iterations: null,
      ...usage,
    },
  } as Message;
}

describe("costOf", () => {
  it("prices each kind of token at the model's rate, in micros, rounded up", () => {
    // $4 a million in, $20 a million out: 1,000 in and 500 out is $0.014.
    expect(costOf(reply({ input_tokens: 1_000, output_tokens: 500 }), ASKED)).toBe(14_000);
    expect(costOf(reply({ cache_read_input_tokens: 10_000 }), ASKED)).toBe(2_000);
    expect(costOf(reply({ input_tokens: 1 }), ASKED)).toBe(4);
    expect(costOf(reply({ cache_read_input_tokens: 1 }), ASKED)).toBe(1);
  });

  it("charges cache writes at the rate for how long they last", () => {
    expect(costOf(reply({ cache_creation_input_tokens: 1_000 }), ASKED)).toBe(5_000);
    const split = { ephemeral_5m_input_tokens: 1_000, ephemeral_1h_input_tokens: 1_000 };
    expect(costOf(reply({ cache_creation_input_tokens: 2_000, cache_creation: split }), ASKED)).toBe(13_000);
  });

  it("charges each model a fallback ran on at its own rate", () => {
    const iterations = [
      { type: "message", model: null, input_tokens: 1_000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: null },
      { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 1_000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: null },
    ] as Message["usage"]["iterations"];
    // The first run names no model, so is the model asked for, claude-opus-5-5 ($4); the second, claude-opus-4-8 ($5).
    expect(costOf(reply({ input_tokens: 2_000, iterations }, "claude-opus-4-8"), ASKED)).toBe(4_000 + 5_000);
  });

  it("charges a model it has no price for at the dearest price it has", () => {
    expect(costOf(reply({ input_tokens: 1_000 }, "claude-somewhere-new"), ASKED)).toBe(1_000 * UNLISTED_PRICE.input);
    for (const price of Object.values(PRICES)) expect(UNLISTED_PRICE.input).toBeGreaterThanOrEqual(price.input);
  });
});

describe("settings", () => {
  it("reads dollars as micros", () => {
    expect(micros("5")).toBe(5_000_000);
    expect(micros(" $2.50 ")).toBe(2_500_000);
    expect(micros("0")).toBe(0);
    for (const bad of ["", "five", "-1", "1e3"]) expect(micros(bad), bad).toBeNull();
  });

  it("reads the Worker's vars, and refuses ones that are not amounts", () => {
    expect(billingSettings({ OWNER_EMAIL: OWNER, BETA_CREDIT_USD: "5", MONTHLY_CAP_USD: "50" })).toEqual(settings);
    expect(billingSettings({ OWNER_EMAIL: OWNER, BETA_CREDIT_USD: "", MONTHLY_CAP_USD: "50" })).toBeNull();
  });

  it("gives a learner the credit CREDITS names for them, or else the standard amount", () => {
    const credits = "Demo@Example.com=10, friend@example.com=$2.50; broken@example.com=lots";
    expect(creditFor(DEMO, credits, 5_000_000)).toBe(10_000_000);
    expect(creditFor("friend@example.com", credits, 5_000_000)).toBe(2_500_000);
    expect(creditFor("broken@example.com", credits, 5_000_000)).toBe(5_000_000);
    expect(creditFor("other@example.com", credits, 5_000_000)).toBe(5_000_000);
    expect(creditFor(DEMO, "-", 5_000_000)).toBe(5_000_000);
  });

  it("counts spending by calendar month, UTC", () => {
    expect(monthOf(Date.UTC(2026, 10, 30, 23, 59))).toBe("2026-11");
    expect(monthOf(Date.UTC(2026, 11, 1))).toBe("2026-12");
  });
});

describe("fund", () => {
  it("uses a learner's own key whenever they have saved one, whatever their credit", () => {
    expect(fund(DEMO, ledger({ ownKey: true, spent: 99_000_000, monthSpent: 99_000_000 }), settings)).toEqual({ kind: "own-key" });
    expect(fund(OWNER, ledger({ ownKey: true }), settings)).toEqual({ kind: "own-key" });
  });

  it("puts the owner's calls on the site's key, unmetered and uncapped", () => {
    expect(fund("Owner@Example.com", ledger({ monthSpent: 99_000_000 }), settings)).toEqual({ kind: "site", metered: false });
  });

  it("meters everyone else's calls out of their credit while any is left", () => {
    expect(fund(DEMO, ledger({ spent: 4_999_999 }), settings)).toEqual({ kind: "site", metered: true });
    const spent = fund(DEMO, ledger({ spent: 5_000_000 }), settings);
    expect(spent).toMatchObject({ kind: "refuse", status: ACCOUNT_STATUS });
    expect(spent).toHaveProperty("error", "You've used all $5.00 of your beta credit. Add your own Claude API key on your account page to keep going.");
  });

  it("asks a learner given no credit for a key of their own", () => {
    const none = fund(DEMO, ledger(), { ...settings, credits: `${DEMO}=0` });
    expect(none).toMatchObject({ kind: "refuse", status: ACCOUNT_STATUS });
    expect(none).toHaveProperty("error", expect.stringContaining("Add your own Claude API key"));
  });

  it("stops all beta credit once a month's spending reaches the cap", () => {
    expect(fund(DEMO, ledger({ monthSpent: 49_999_999 }), settings)).toEqual({ kind: "site", metered: true });
    expect(fund(DEMO, ledger({ monthSpent: 50_000_000 }), settings)).toMatchObject({ kind: "refuse", status: ACCOUNT_STATUS, error: expect.stringContaining("this month") });
  });
});

describe("accountOf", () => {
  it("tells the account page how the learner's calls are paid for", () => {
    expect(accountOf(OWNER, ledger(), settings)).toEqual({ kind: "owner" });
    expect(accountOf(DEMO, ledger({ spent: 1_250_000 }), settings)).toEqual({ kind: "credit", granted: 5_000_000, spent: 1_250_000 });
    expect(accountOf(DEMO, ledger({ ownKey: true, hint: "wxyz" }), settings)).toEqual({ kind: "own-key", hint: "wxyz" });
  });
});

describe("keys", () => {
  const key = `sk-ant-api03-${"a".repeat(40)}wxyz`;

  it("reads a pasted Claude API key, trimmed, and nothing else", () => {
    expect(readApiKey({ key: `  ${key}\n` })).toBe(key);
    for (const bad of [{}, { key: 42 }, { key: "sk-ant-short" }, { key: "sk-proj-" + "a".repeat(40) }, { key: `${key} extra` }, null, [key]]) {
      expect(readApiKey(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("shows only a key's last four characters", () => {
    expect(keyHint(key)).toBe("wxyz");
  });
});
