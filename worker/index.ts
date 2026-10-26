// The recall Worker: the deck of recall questions (src/recall), kept on the
// web so every device the learner uses holds the same one.
//
// One Durable Object holds the deck, a row per question in its SQLite
// storage. It merges each deck sent to it with the one it holds, using the
// same rule the pages do (mergeDecks), so a device can send its whole deck at
// any time, in any order with the others, and nothing is lost. Requests reach
// the object one at a time, so two devices syncing at once cannot undo each
// other.
//
// The decisions are in rules.ts; this does the I/O.

import { DurableObject } from "cloudflare:workers";
import { changedSince, EMPTY_DECK, loadDeck, mergeDecks, saveDeck, type Card, type Deck, type SavedDeck } from "../src/recall/deck.ts";
import { corsHeaders, datedAhead, decide, MAX_BODY, tooLarge } from "./rules.ts";

/** There is one learner, so one deck. */
const DECK_NAME = "deck";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);
    const reply = (status: number, body: unknown): Response => Response.json(body, { status, headers: cors });

    const length = request.headers.get("Content-Length");
    // Counted by the caller's address, so someone guessing the key slows
    // only themselves, never the learner's own devices.
    const withinLimit =
      request.method === "OPTIONS" ||
      (await env.LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" })).success;
    const decision = decide(
      {
        method: request.method,
        path: url.pathname,
        origin,
        authorization: request.headers.get("Authorization"),
        length: length === null ? null : Number(length),
        withinLimit,
      },
      { key: env.RECALL_KEY ?? "", origins: env.ALLOWED_ORIGINS },
    );
    const deck = env.DECKS.getByName(DECK_NAME);
    switch (decision.kind) {
      case "preflight":
        return new Response(null, { status: 204, headers: cors });
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
    }
  },
} satisfies ExportedHandler<Env>;

export class RecallDeck extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // A question is a card, or its removal when `card` is null; `at` is
    // when it last changed (Card.updated, Removal.at).
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, at INTEGER NOT NULL, card TEXT)",
    );
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
      return saveDeck(merged);
    });
  }

  private held(): Deck {
    const rows = this.ctx.storage.sql
      .exec<{ id: string; at: number; card: string | null }>("SELECT id, at, card FROM questions")
      .toArray();
    const cards: Card[] = rows.flatMap((r) => (r.card ? [JSON.parse(r.card) as Card] : []));
    const removed = rows.filter((r) => r.card === null).map(({ id, at }) => ({ id, at }));
    return mergeDecks(EMPTY_DECK, { cards, removed });
  }
}

function parse(text: string): Deck | null {
  try {
    return loadDeck(JSON.parse(text));
  } catch {
    return null;
  }
}
