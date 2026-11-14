// Whose Claude key pays for a call, and what a call cost: as plain values.
// index.ts reads the learner's record (accounts.ts), follows the decision,
// makes the call, and charges what costOf says.
//
// A learner's calls to Claude are paid for in one of three ways, decided
// afresh on every call (`fund`):
//
//   1. With their own Claude API key, once they have saved one on their
//      account page (signin.html). Nothing is metered: the bill is theirs.
//   2. With the site's key, for the owner (OWNER_EMAIL), unmetered.
//   3. With the site's key, for anyone else, out of their beta credit: the
//      BETA_CREDIT_USD var, or their own amount in the CREDITS secret. What
//      each call cost is counted against it, in dollars, from the tokens the
//      reply says it used (costOf), so a long reading costs more of it than a
//      short check. All beta spending on the site's key together stops at
//      MONTHLY_CAP_USD a calendar month (UTC), so a slip in this metering can
//      never run up an open-ended bill.
//
// Credit runs in whole millionths of a dollar ("micros"), so sums never drift.
//
// A call is let through while any credit is left and charged after, so the
// last call may take a learner a little below nothing; the rate limit on
// calls to Claude (wrangler.jsonc CHECK_LIMITER) bounds how far.

import type Anthropic from "@anthropic-ai/sdk";
import { ACCOUNT_STATUS, dollars, type ClaudeAccount } from "../src/auth/account.ts";
import { normalEmail } from "./auth.ts";
import type { Refusal } from "./rules.ts";

type Message = Anthropic.Beta.Messages.BetaMessage;
type Usage = Anthropic.Beta.Messages.BetaUsage;

/** A millionth of a dollar. */
export const MICROS_PER_USD = 1_000_000;

/** Dollars per million tokens, which is micros per token. */
export interface Price {
  input: number;
  output: number;
  /** Writing to the cache, by how long the entry lasts. */
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

/**
 * What each model the Worker may be served by costs: claude-opus-5-5, which
 * it asks for (check.ts MODEL), and the models a refusal fallback may run
 * on instead (`fallbacks: "default"` in check.ts, associate.ts, explain.ts).
 * Anthropic's list prices, as of 2026-11.
 */
export const PRICES: Readonly<Record<string, Price>> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite5m: 5, cacheWrite1h: 8, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
};

/** A model missing from PRICES is charged at the dearest price there, so it is never undercharged. */
export const UNLISTED_PRICE: Price = PRICES["claude-opus-5"];

/** The tokens one model used in serving a call. */
interface Served {
  model: string;
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

/**
 * What `message` cost, in micros, rounded up; `asked` is the model the call
 * asked for. A reply a fallback served lists each model that ran in
 * `usage.iterations`, priced at that model's rates, where one with no model
 * named is the model asked for; otherwise the whole of `usage` was
 * `message.model`'s.
 */
export function costOf(message: Message, asked: string): number {
  const served = servedBy(message, asked);
  const micros = served.reduce((sum, s) => {
    const p = PRICES[s.model] ?? UNLISTED_PRICE;
    return sum + s.input * p.input + s.output * p.output + s.cacheWrite5m * p.cacheWrite5m + s.cacheWrite1h * p.cacheWrite1h + s.cacheRead * p.cacheRead;
  }, 0);
  return Math.ceil(micros);
}

function servedBy(message: Message, asked: string): Served[] {
  const runs = (message.usage.iterations ?? []).flatMap((it) =>
    it.type === "message" || it.type === "fallback_message" ? [tokens(it.model ?? asked, it)] : [],
  );
  return runs.length > 0 ? runs : [tokens(message.model, message.usage)];
}

function tokens(
  model: string,
  usage: Pick<Usage, "input_tokens" | "output_tokens" | "cache_creation" | "cache_read_input_tokens"> & { cache_creation_input_tokens: number | null },
): Served {
  const written = usage.cache_creation_input_tokens ?? 0;
  const oneHour = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return {
    model,
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheWrite1h: oneHour,
    cacheWrite5m: usage.cache_creation ? usage.cache_creation.ephemeral_5m_input_tokens : written,
    cacheRead: usage.cache_read_input_tokens ?? 0,
  };
}

/** The calendar month a spend falls in, UTC: "2026-11". */
export function monthOf(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

/** Dollars, as a var or the CREDITS secret gives them, in micros; null when `text` is not an amount. */
export function micros(text: string): number | null {
  const trimmed = text.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * MICROS_PER_USD);
}

/**
 * The beta credit `email` was given: their own amount in `credits`, the
 * CREDITS secret, "learner@example.com=10, other@example.com=2.50", or `-`
 * for none; or else `standard`, the BETA_CREDIT_USD var. Entries that do not
 * read are skipped.
 */
export function creditFor(email: string, credits: string, standard: number): number {
  const wanted = normalEmail(email);
  for (const entry of credits.split(/[\s,;]+/)) {
    const at = entry.lastIndexOf("=");
    if (at < 0 || normalEmail(entry.slice(0, at)) !== wanted) continue;
    const amount = micros(entry.slice(at + 1));
    if (amount !== null) return amount;
  }
  return standard;
}

/** The Worker's settings for paying for calls, read from its vars and secrets. */
export interface BillingSettings {
  owner: string;
  /** The CREDITS secret; `-` or empty for none. */
  credits: string;
  /** BETA_CREDIT_USD, in micros. */
  standard: number;
  /** MONTHLY_CAP_USD, in micros. */
  cap: number;
}

/** Read the settings from the Worker's environment; null when a var does not read as dollars. */
export function billingSettings(env: { OWNER_EMAIL?: string; CREDITS?: string; BETA_CREDIT_USD?: string; MONTHLY_CAP_USD?: string }): BillingSettings | null {
  const standard = micros(env.BETA_CREDIT_USD ?? "");
  const cap = micros(env.MONTHLY_CAP_USD ?? "");
  if (standard === null || cap === null) return null;
  return { owner: env.OWNER_EMAIL ?? "", credits: env.CREDITS ?? "", standard, cap };
}

/** What the Worker holds about a learner's paying for Claude (accounts.ts). */
export interface Ledger {
  /** Whether they have saved a Claude API key of their own. */
  ownKey: boolean;
  /** The last four characters of it, to show which it is. */
  hint: string | null;
  /** Micros of beta credit spent so far. */
  spent: number;
  /** Micros of beta credit spent by everyone this month. */
  monthSpent: number;
}

/** Who pays for a call. */
export type Funding =
  /** The learner's own key. */
  | { kind: "own-key" }
  /** The site's key; `metered` when the call comes out of the learner's beta credit. */
  | { kind: "site"; metered: boolean };

export { ACCOUNT_STATUS };

/** Who pays for a call to Claude by `email`, or why no one can. */
export function fund(email: string, ledger: Ledger, settings: BillingSettings): Funding | Refusal {
  if (ledger.ownKey) return { kind: "own-key" };
  if (isOwner(email, settings.owner)) return { kind: "site", metered: false };
  const credit = creditFor(email, settings.credits, settings.standard);
  if (ledger.spent >= credit) {
    return refuse(
      credit > 0
        ? `You've used all ${dollars(credit)} of your beta credit. Add your own Claude API key on your account page to keep going.`
        : "Add your own Claude API key on your account page to have Claude check your work.",
    );
  }
  if (ledger.monthSpent >= settings.cap) {
    return refuse("Beta credit is used up for this month. Add your own Claude API key on your account page to keep going.");
  }
  return { kind: "site", metered: true };
}

/** What the account page shows `email` about paying for Claude. */
export function accountOf(email: string, ledger: Ledger, settings: BillingSettings): ClaudeAccount {
  if (ledger.ownKey) return { kind: "own-key", hint: ledger.hint ?? "" };
  if (isOwner(email, settings.owner)) return { kind: "owner" };
  return { kind: "credit", granted: creditFor(email, settings.credits, settings.standard), spent: ledger.spent };
}

/**
 * A Claude API key as pasted, trimmed, or null when it cannot be one. It is
 * checked with Claude itself before it is kept (index.ts).
 */
export function readApiKey(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const key = (raw as Record<string, unknown>).key;
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return /^sk-ant-[A-Za-z0-9_-]{20,250}$/.test(trimmed) ? trimmed : null;
}

/** The last four characters of `key`, shown so the learner can tell which key is saved. */
export function keyHint(key: string): string {
  return key.slice(-4);
}

function isOwner(email: string, owner: string): boolean {
  const wanted = normalEmail(email);
  return wanted !== null && wanted === normalEmail(owner);
}

function refuse(error: string): Refusal {
  return { kind: "refuse", status: ACCOUNT_STATUS, error };
}
