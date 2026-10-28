// The Worker behind /deck, /check and /associate. /deck is the deck of recall
// questions (src/recall), kept on the web so every device the learner uses
// holds the same one; /check has Claude read an answer given in a review
// sitting (check.ts), and /associate a free association, everything the
// learner can recall of the course (associate.ts). The rest of the site is static assets, served without running
// this (wrangler.jsonc).
//
// One Durable Object holds the deck, a row per question in its SQLite
// storage, and the free association in a table of its own. It merges each deck sent to it with the one it holds, using the
// same rule the pages do (mergeDecks), so a device can send its whole deck at
// any time, in any order with the others, and nothing is lost. Requests reach
// the object one at a time, so two devices syncing at once cannot undo each
// other.
//
// The decisions are in rules.ts, check.ts and associate.ts; this does the I/O.

import Anthropic from "@anthropic-ai/sdk";
import { DurableObject } from "cloudflare:workers";
import { MAX_ASSOCIATE_BODY, readAssociateRequest } from "../src/recall/associate.ts";
import { MAX_CHECK_BODY, readCheckRequest } from "../src/recall/check.ts";
import {
  changedSince,
  EMPTY_DECK,
  loadDeck,
  mergeDecks,
  readWriting,
  saveDeck,
  type Card,
  type Deck,
  type SavedDeck,
} from "../src/recall/deck.ts";
import { associateParams, readingOf } from "./associate.ts";
import { checkParams, claudeFailed, usageLine, verdictOf } from "./check.ts";
import { associateTooLarge, CLAUDE_PATHS, checkTooLarge, datedAhead, decide, MAX_BODY, tooLarge, type Refusal } from "./rules.ts";

/** There is one learner, so one deck. */
const DECK_NAME = "deck";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const reply = (status: number, body: unknown): Response => Response.json(body, { status });

    const length = request.headers.get("Content-Length");
    // Counted by the caller's address, so someone guessing the key slows
    // only themselves, never the learner's own devices. Calls to Claude,
    // which cost money, are counted again against a tighter limit of their own.
    const caller = { key: request.headers.get("CF-Connecting-IP") ?? "unknown" };
    const { success: withinLimit } = await env.LIMITER.limit(caller);
    const paid = CLAUDE_PATHS.some((c) => c.path === url.pathname);
    const withinCheckLimit = !paid || (await env.CHECK_LIMITER.limit(caller)).success;
    const decision = decide(
      {
        method: request.method,
        path: url.pathname,
        authorization: request.headers.get("Authorization"),
        length: length === null ? null : Number(length),
        withinLimit: withinLimit && withinCheckLimit,
      },
      { key: env.RECALL_KEY ?? "", claude: !!env.ANTHROPIC_API_KEY },
    );
    const deck = env.DECKS.getByName(DECK_NAME);
    switch (decision.kind) {
      case "refuse":
        return reply(decision.status, { error: decision.error });
      case "read":
        return reply(200, await deck.read());
      case "merge": {
        // Content-Length was checked in decide(), but a body may come without one.
        const text = await request.text();
        if (text.length > MAX_BODY) return reply(tooLarge.status, { error: tooLarge.error });
        const sent = parse(text);
        if (!sent) return reply(400, { error: "That is not a saved deck." });
        if (datedAhead(sent, Date.now())) {
          return reply(400, { error: "A change on this device is dated in the future. Check its date and time." });
        }
        return reply(200, await deck.merge(sent));
      }
      case "check": {
        const text = await request.text();
        if (text.length > MAX_CHECK_BODY) return reply(checkTooLarge.status, { error: checkTooLarge.error });
        const asked = readCheckRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is not an answer to check." });
        const verdict = await askClaude(env, "check", checkParams(asked), verdictOf);
        return "kind" in verdict ? reply(verdict.status, { error: verdict.error }) : reply(200, verdict);
      }
      case "associate": {
        const text = await request.text();
        if (text.length > MAX_ASSOCIATE_BODY) return reply(associateTooLarge.status, { error: associateTooLarge.error });
        const asked = readAssociateRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is nothing to read." });
        const reading = await askClaude(env, "associate", associateParams(asked), readingOf);
        return "kind" in reading ? reply(reading.status, { error: reading.error }) : reply(200, reading);
      }
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Call Claude with the Worker's key and read its reply with `read`, turning
 * a failed call into a refusal saying why. Each reply's token usage is
 * logged, for the Worker's logs to say what readings cost (usageLine).
 */
async function askClaude<T>(
  env: Env,
  route: string,
  params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
  read: (message: Anthropic.Beta.Messages.BetaMessage) => T | Refusal,
): Promise<T | Refusal> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL });
  try {
    const message = await client.beta.messages.create(params);
    console.log(JSON.stringify(usageLine(route, params.output_config?.effort ?? null, message)));
    return read(message);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Calling Claude failed:", error.status, error.message);
      return claudeFailed(error.status);
    }
    throw error;
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
    return mergeDecks(EMPTY_DECK, writing ? { cards, removed, writing } : { cards, removed });
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
