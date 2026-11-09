// The Worker behind /auth/*, /deck, /check, /associate and /explain. /auth/*
// signs learners in by email link (auth.ts). /deck is the signed-in
// learner's deck of recall questions (src/recall), kept on the web so every
// device they use holds the same one; /check has Claude read an answer given
// in a review sitting (check.ts), /associate a free association, everything
// the learner can recall of the course (associate.ts), and /explain a
// learner's explanation of a lesson's idea, written on the lesson page
// (explain.ts). /account says how the learner's calls to Claude are paid
// for, and keeps or forgets their own Claude API key (billing.ts). The rest
// of the site is static assets, served without running this (wrangler.jsonc).
//
// A Durable Object per learner holds their deck (rules.ts `deckFor`), a row
// per question in its SQLite storage, and the free association and each
// lesson's explanation in tables of their own. It merges each deck sent to it
// with the one it holds, using the same rule the pages do (mergeDecks), so a
// device can send its whole deck at any time, in any order with the others,
// and nothing is lost. Requests reach the object one at a time, so two
// devices syncing at once cannot undo each other. Sign-ins are held by
// another (accounts.ts).
//
// The decisions are in auth.ts, rules.ts, billing.ts, check.ts, associate.ts
// and explain.ts; this does the I/O.

import Anthropic from "@anthropic-ai/sdk";
import { DurableObject } from "cloudflare:workers";
import { MAX_ASSOCIATE_BODY, readAssociateRequest } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY, readCheckRequest } from "../src/recall/check.ts";
import { MAX_EXPLAIN_BODY, readExplainRequest } from "../src/recall/explain.ts";
import {
  changedSince,
  EMPTY_DECK,
  loadDeck,
  mergeDecks,
  readKeptExplanation,
  readWriting,
  saveDeck,
  type Card,
  type Deck,
  type SavedDeck,
} from "../src/recall/deck.ts";
import { Accounts, ACCOUNTS_NAME, newToken, tokenHash, type KeptLedger } from "./accounts.ts";
import { associateParams, readingOf } from "./associate.ts";
import {
  afterRedeem,
  AUTH_PATHS,
  decideAuth,
  LINK_PATH,
  LINK_TTL_MS,
  MAX_AUTH_BODY,
  normalEmail,
  SESSION_TTL_MS,
  sessionCookie,
  sessionToken,
  signedInAs,
  signInEmail,
  signInUrl,
  type AuthSettings,
} from "./auth.ts";
import { accountOf, billingSettings, costOf, fund, keyHint, monthOf, readApiKey, type BillingSettings, type Funding, type Ledger } from "./billing.ts";
import { checkParams, claudeFailed, MODEL, usageLine, verdictOf } from "./check.ts";
import { explainParams } from "./explain.ts";
import {
  accountTooLarge,
  associateTooLarge,
  CLAUDE_PATHS,
  checkTooLarge,
  datedAhead,
  decide,
  explainTooLarge,
  MAX_ACCOUNT_BODY,
  MAX_BODY,
  tooLarge,
  type Refusal,
} from "./rules.ts";
import { open, seal, vaultKey } from "./vault.ts";

export { Accounts };

const reply = (status: number, body: unknown, headers: HeadersInit = {}): Response => Response.json(body, { status, headers });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    // Counted by the caller's address, so someone guessing slows only
    // themselves, never the learner's own devices.
    const caller = { key: request.headers.get("CF-Connecting-IP") ?? "unknown" };
    const { success: withinLimit } = await env.LIMITER.limit(caller);
    const accounts = env.ACCOUNTS.getByName(ACCOUNTS_NAME);
    const settings: AuthSettings = { sender: env.SENDER ?? "", invites: env.INVITES ?? "", owner: env.OWNER_EMAIL ?? "" };
    const fromPage = request.headers.get("X-Requested-With") === "XMLHttpRequest";
    const now = Date.now();

    if (AUTH_PATHS.includes(url.pathname)) {
      if (!fromPage) return reply(403, { error: "Requests come from the site's own pages only." });
      const text = request.method === "POST" ? await request.text() : "";
      if (text.length > MAX_AUTH_BODY) return reply(413, { error: "That is too long." });
      const body = parseJson(text);
      // Links are counted again by the address asked for, invited or not, so
      // nobody's inbox is flooded and the count says nothing of who is invited.
      const linkLimited =
        url.pathname === LINK_PATH && !(await env.LINK_LIMITER.limit({ key: normalEmail((body as { email?: unknown } | null)?.email) ?? caller.key })).success;
      const decision = decideAuth({ method: request.method, path: url.pathname, body, withinLimit: withinLimit && !linkLimited }, settings);
      const secure = url.protocol === "https:";
      const token = sessionToken(request.headers.get("Cookie"));
      switch (decision.kind) {
        case "refuse":
          return reply(decision.status, { error: decision.error });
        case "pretend-sent":
          return reply(202, { sent: true });
        case "send-link": {
          const linkToken = newToken();
          await accounts.addLink(await tokenHash(linkToken), decision.email, now + LINK_TTL_MS, now);
          try {
            await env.EMAIL.send(signInEmail(decision.email, settings.sender, signInUrl(url.origin, linkToken)));
          } catch (error) {
            console.error("Sending a sign-in link failed:", error instanceof Error ? error.message : String(error));
            return reply(502, { error: "The sign-in email could not be sent. Try again in a minute." });
          }
          return reply(202, { sent: true });
        }
        case "redeem": {
          const next = afterRedeem(await accounts.redeemLink(await tokenHash(decision.token), now), settings);
          if (next.kind === "refuse") return reply(next.status, { error: next.error });
          const session = newToken();
          await accounts.addSession(await tokenHash(session), next.email, now + SESSION_TTL_MS, now);
          return reply(200, { email: next.email }, { "Set-Cookie": sessionCookie(session, secure) });
        }
        case "who": {
          const email = token ? signedInAs(await accounts.sessionEmail(await tokenHash(token), now), settings) : null;
          return email ? reply(200, { email }) : reply(401, { error: "Signed out." });
        }
        case "sign-out":
          if (token) await accounts.endSession(await tokenHash(token));
          return reply(200, {}, { "Set-Cookie": sessionCookie(null, secure) });
      }
    }

    const length = request.headers.get("Content-Length");
    // Calls to Claude, which cost money, are counted again against a tighter limit of their own.
    const paid = CLAUDE_PATHS.some((c) => c.path === url.pathname);
    const withinCheckLimit = !paid || (await env.CHECK_LIMITER.limit(caller)).success;
    const token = sessionToken(request.headers.get("Cookie"));
    const decision = decide(
      {
        method: request.method,
        path: url.pathname,
        email: token ? signedInAs(await accounts.sessionEmail(await tokenHash(token), now), settings) : null,
        fromPage,
        length: length === null ? null : Number(length),
        withinLimit: withinLimit && withinCheckLimit,
      },
      { claude: !!env.ANTHROPIC_API_KEY, owner: settings.owner },
    );
    switch (decision.kind) {
      case "refuse":
        return reply(decision.status, { error: decision.error });
      case "read":
        return reply(200, await env.DECKS.getByName(decision.deck).read());
      case "merge": {
        // Content-Length was checked in decide(), but a body may come without one.
        const text = await request.text();
        if (text.length > MAX_BODY) return reply(tooLarge.status, { error: tooLarge.error });
        const sent = parse(text);
        if (!sent) return reply(400, { error: "That is not a saved deck." });
        if (datedAhead(sent, Date.now())) {
          return reply(400, { error: "A change on this device is dated in the future. Check its date and time." });
        }
        return reply(200, await env.DECKS.getByName(decision.deck).merge(sent));
      }
      case "check": {
        const text = await request.text();
        if (text.length > MAX_CHECK_BODY) return reply(checkTooLarge.status, { error: checkTooLarge.error });
        const asked = readCheckRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is not an answer to check." });
        const verdict = await askClaude(env, decision.email, now, "check", checkParams(asked), verdictOf);
        return "kind" in verdict ? reply(verdict.status, { error: verdict.error }) : reply(200, verdict);
      }
      case "associate": {
        const text = await request.text();
        if (text.length > MAX_ASSOCIATE_BODY) return reply(associateTooLarge.status, { error: associateTooLarge.error });
        const asked = readAssociateRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is nothing to read." });
        const reading = await askClaude(env, decision.email, now, "associate", associateParams(asked), readingOf);
        return "kind" in reading ? reply(reading.status, { error: reading.error }) : reply(200, reading);
      }
      case "explain": {
        const text = await request.text();
        if (text.length > MAX_EXPLAIN_BODY) return reply(explainTooLarge.status, { error: explainTooLarge.error });
        const asked = readExplainRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is not an explanation to check." });
        const verdict = await askClaude(env, decision.email, now, "explain", explainParams(asked), (m) => verdictOf(m, "explanation"));
        return "kind" in verdict ? reply(verdict.status, { error: verdict.error }) : reply(200, verdict);
      }
      case "account": {
        const billing = await billingOf(env, decision.email, now);
        return "kind" in billing ? reply(billing.status, { error: billing.error }) : reply(200, accountOf(decision.email, billing.ledger, billing.settings));
      }
      case "save-key": {
        const text = await request.text();
        if (text.length > MAX_ACCOUNT_BODY) return reply(accountTooLarge.status, { error: accountTooLarge.error });
        const key = readApiKey(parseJson(text));
        if (!key) return reply(400, { error: "That doesn't look like a Claude API key. Keys start with sk-ant-." });
        const vault = await vaultKey(env.VAULT_KEY);
        if (!vault) return reply(503, { error: "Saving keys is off: the Worker's VAULT_KEY is not set." });
        const turnedDown = await tryKey(env, key);
        if (turnedDown) return reply(turnedDown.status, { error: turnedDown.error });
        await accounts.saveKey(decision.email, await seal(vault, decision.email, key), keyHint(key));
        const billing = await billingOf(env, decision.email, now);
        return "kind" in billing ? reply(billing.status, { error: billing.error }) : reply(200, accountOf(decision.email, billing.ledger, billing.settings));
      }
      case "remove-key": {
        await accounts.removeKey(decision.email);
        const billing = await billingOf(env, decision.email, now);
        return "kind" in billing ? reply(billing.status, { error: billing.error }) : reply(200, accountOf(decision.email, billing.ledger, billing.settings));
      }
    }
  },
} satisfies ExportedHandler<Env>;

/** The billing settings, `email`'s ledger with their own key opened, and the key; or why they cannot be read. */
async function billingOf(
  env: Env,
  email: string,
  now: number,
): Promise<{ settings: BillingSettings; ledger: Ledger; ownKey: string | null } | Refusal> {
  const settings = billingSettings(env);
  if (!settings) return { kind: "refuse", status: 503, error: "Claude is off: the Worker's BETA_CREDIT_USD or MONTHLY_CAP_USD is not an amount in dollars." };
  const kept: KeptLedger = await env.ACCOUNTS.getByName(ACCOUNTS_NAME).ledger(email, monthOf(now));
  // A key that no longer opens, as after VAULT_KEY is replaced, counts as none.
  const vault = kept.sealed ? await vaultKey(env.VAULT_KEY) : null;
  const ownKey = vault && kept.sealed ? await open(vault, email, kept.sealed) : null;
  return { settings, ownKey, ledger: { ownKey: ownKey !== null, hint: ownKey ? kept.hint : null, spent: kept.spent, monthSpent: kept.monthSpent } };
}

/**
 * Call Claude for `email`, paid for as billing.ts `fund` decides, and read
 * its reply with `read`, turning a failed call into a refusal saying why.
 * A call on beta credit is charged what it cost, whatever came of it. Each
 * reply's token usage is logged, for the Worker's logs to say what readings
 * cost (usageLine).
 */
async function askClaude<T>(
  env: Env,
  email: string,
  now: number,
  route: string,
  params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
  read: (message: Anthropic.Beta.Messages.BetaMessage) => T | Refusal,
): Promise<T | Refusal> {
  const billing = await billingOf(env, email, now);
  if ("kind" in billing) return billing;
  const funding: Funding | Refusal = fund(email, billing.ledger, billing.settings);
  if (funding.kind === "refuse") return funding;
  const own = funding.kind === "own-key";
  const client = new Anthropic({ apiKey: own ? billing.ownKey! : env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL });
  try {
    const message = await client.beta.messages.create(params);
    const cost = costOf(message, params.model);
    console.log(JSON.stringify({ ...usageLine(route, params.output_config?.effort ?? null, message), paid_by: funding.kind === "site" && funding.metered ? "credit" : funding.kind, micros: cost }));
    if (funding.kind === "site" && funding.metered) await env.ACCOUNTS.getByName(ACCOUNTS_NAME).charge(email, cost, monthOf(now));
    return read(message);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Calling Claude failed:", error.status, error.message);
      return claudeFailed(error.status, own);
    }
    throw error;
  }
}

/**
 * Whether Claude takes `key`, by asking it about the model the Worker uses,
 * which costs nothing: null when it does, or the refusal saying why not.
 */
async function tryKey(env: Env, key: string): Promise<Refusal | null> {
  try {
    await new Anthropic({ apiKey: key, baseURL: env.ANTHROPIC_BASE_URL, maxRetries: 0 }).models.retrieve(MODEL);
    return null;
  } catch (error) {
    if (!(error instanceof Anthropic.APIError)) throw error;
    if (error.status === 401 || error.status === 403) return { kind: "refuse", status: 400, error: "Claude turned that key down. Check you copied all of it, and that it hasn't been disabled." };
    console.error("Trying a learner's key failed:", error.status, error.message);
    return { kind: "refuse", status: 502, error: "Couldn't check that key with Claude just now. Try again in a minute." };
  }
}

export class RecallDeck extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // A question is a card, or its removal when `card` is null; `at` is
    // when it last changed (Card.updated, Removal.at).
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, at INTEGER NOT NULL, card TEXT)",
    );
    // At most one row: the free association (deck.ts Writing), once written.
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS writing (id INTEGER PRIMARY KEY CHECK (id = 0), body TEXT NOT NULL)");
    // A row per lesson explained: its explanation (deck.ts KeptExplanation).
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS explanations (lesson TEXT PRIMARY KEY, body TEXT NOT NULL)");
  }

  read(): SavedDeck {
    return saveDeck(this.held());
  }

  /** Merge `sent`, already read with loadDeck, into the deck held, and return the result. */
  merge(sent: Deck): SavedDeck {
    return this.ctx.storage.transactionSync(() => {
      const held = this.held();
      const merged = mergeDecks(held, sent);
      const changed = changedSince(held, merged);
      const put = "INSERT OR REPLACE INTO questions (id, at, card) VALUES (?, ?, ?)";
      for (const card of changed.cards) this.ctx.storage.sql.exec(put, card.id, card.updated, JSON.stringify(card));
      for (const { id, at } of changed.removed) this.ctx.storage.sql.exec(put, id, at, null);
      if (changed.writing) {
        this.ctx.storage.sql.exec("INSERT OR REPLACE INTO writing (id, body) VALUES (0, ?)", JSON.stringify(changed.writing));
      }
      for (const kept of changed.explanations ?? []) {
        this.ctx.storage.sql.exec("INSERT OR REPLACE INTO explanations (lesson, body) VALUES (?, ?)", kept.lesson, JSON.stringify(kept));
      }
      return saveDeck(merged);
    });
  }

  private held(): Deck {
    const rows = this.ctx.storage.sql
      .exec<{ id: string; at: number; card: string | null }>("SELECT id, at, card FROM questions")
      .toArray();
    const cards: Card[] = rows.flatMap((r) => (r.card ? [JSON.parse(r.card) as Card] : []));
    const removed = rows.filter((r) => r.card === null).map(({ id, at }) => ({ id, at }));
    const [kept] = this.ctx.storage.sql.exec<{ body: string }>("SELECT body FROM writing").toArray();
    const writing = kept ? readWriting(JSON.parse(kept.body)) : null;
    const explanations = this.ctx.storage.sql
      .exec<{ body: string }>("SELECT body FROM explanations")
      .toArray()
      .flatMap((r) => readKeptExplanation(JSON.parse(r.body)));
    const deck: Deck = { cards, removed, explanations };
    return mergeDecks(EMPTY_DECK, writing ? { ...deck, writing } : deck);
  }
}

function parse(text: string): Deck | null {
  return loadDeck(parseJson(text));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
