// The Worker behind /deck, /check and /material. /deck is the deck of recall
// questions (src/recall), kept on the web so every device the learner uses
// holds the same one; /check has Claude read an answer given in a review
// sitting (check.ts); /material is the admin page's (src/admin): the key
// facts and reference answers answers are graded against (material.ts). The
// rest of the site is static assets, served without running this
// (wrangler.jsonc).
//
// One Durable Object holds the deck, a row per question in its SQLite
// storage. It merges each deck sent to it with the one it holds, using the
// same rule the pages do (mergeDecks), so a device can send its whole deck at
// any time, in any order with the others, and nothing is lost. Requests reach
// the object one at a time, so two devices syncing at once cannot undo each
// other. A second holds the material, a row per piece.
//
// The decisions are in rules.ts, check.ts, material.ts and
// src/recall/material.ts; this does the I/O.

import Anthropic from "@anthropic-ai/sdk";
import { DurableObject } from "cloudflare:workers";
import { courseLesson, type CourseLesson } from "../src/course/course.ts";
import { MAX_CHECK_BODY, readCheckRequest, type CheckRequest } from "../src/recall/check.ts";
import {
  changedSince,
  EMPTY_DECK,
  loadDeck,
  mergeDecks,
  saveDeck,
  type Card,
  type Deck,
  type SavedDeck,
} from "../src/recall/deck.ts";
import {
  byClaude,
  current,
  factBasis,
  readCommand,
  referenceBasis,
  settle,
  standing,
  STYLE_BASIS,
  styleText,
  targetKey,
  versionFor,
  withVersion,
  type Command,
  type Item,
  type MaterialView,
  type Version,
} from "../src/recall/material.ts";
import { checkParams, claudeFailed, verdictOf, type Grounds } from "./check.ts";
import { refineParams, whereOf, writeParams, writtenOf, type Context } from "./material.ts";
import {
  checkTooLarge,
  claudeOff,
  commandTooLarge,
  datedAhead,
  decide,
  limitOf,
  MAX_BODY,
  MAX_COMMAND_BODY,
  tooLarge,
  type Refusal,
} from "./rules.ts";

/** There is one learner, so one deck, and one set of material for it. */
const DECK_NAME = "deck";
const MATERIAL_NAME = "material";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const reply = (status: number, body: unknown): Response => Response.json(body, { status });
    const refused = (r: Refusal): Response => reply(r.status, { error: r.error });

    const length = request.headers.get("Content-Length");
    // Counted by the caller's address, so someone guessing a key slows only
    // themselves, never the learner's own devices. Checks and commands,
    // which may cost money, are counted again against tighter limits.
    const caller = { key: request.headers.get("CF-Connecting-IP") ?? "unknown" };
    const { success: withinLimit } = await env.LIMITER.limit(caller);
    const limit = limitOf(request.method, url.pathname);
    const tighter = limit && { check: env.CHECK_LIMITER, write: env.WRITE_LIMITER }[limit];
    const withinTighter = !tighter || (await tighter.limit(caller)).success;
    const decision = decide(
      {
        method: request.method,
        path: url.pathname,
        authorization: request.headers.get("Authorization"),
        length: length === null ? null : Number(length),
        withinLimit: withinLimit && withinTighter,
      },
      { key: env.RECALL_KEY ?? "", admin: env.ADMIN_KEY ?? "", claude: !!env.ANTHROPIC_API_KEY },
    );
    const deck = env.DECKS.getByName(DECK_NAME);
    const material = env.MATERIAL.getByName(MATERIAL_NAME);
    switch (decision.kind) {
      case "refuse":
        return refused(decision);
      case "read":
        return reply(200, await deck.read());
      case "merge": {
        // Content-Length was checked in decide(), but a body may come without one.
        const text = await request.text();
        if (text.length > MAX_BODY) return refused(tooLarge);
        const sent = loadDeck(parseJson(text));
        if (!sent) return reply(400, { error: "That is not a saved deck." });
        if (datedAhead(sent, Date.now())) {
          return reply(400, { error: "A change on this device is dated in the future. Check its date and time." });
        }
        return reply(200, await deck.merge(sent));
      }
      case "check": {
        const text = await request.text();
        if (text.length > MAX_CHECK_BODY) return refused(checkTooLarge);
        const asked = readCheckRequest(parseJson(text));
        if (!asked) return reply(400, { error: "That is not an answer to check." });
        const verdict = await askClaude(env, checkParams(asked, await groundsFor(env, material, asked)), verdictOf);
        return isRefusal(verdict) ? refused(verdict) : reply(200, verdict);
      }
      case "material": {
        const [items, saved] = await Promise.all([material.read(), deck.read()]);
        const cards = saved.cards.map(({ id, question, lesson, step, stepTitle }) => ({ id, question, lesson, step, stepTitle }));
        return reply(200, { items, cards } satisfies MaterialView);
      }
      case "command": {
        const text = await request.text();
        if (text.length > MAX_COMMAND_BODY) return refused(commandTooLarge);
        const command = readCommand(parseJson(text));
        if (!command) return reply(400, { error: "That is not a change to the material." });
        if (byClaude(command) && !env.ANTHROPIC_API_KEY) return refused(claudeOff);
        const item = await run(env, material, command, await deck.read());
        return isRefusal(item) ? refused(item) : reply(200, item);
      }
    }
  },
} satisfies ExportedHandler<Env>;

type MaterialStub = DurableObjectStub<Material>;

/**
 * What to grade an answer against: its card's reference answer and its
 * step's key fact. Either one missing, or stale, is written first, the two
 * at once; one Claude cannot write is left out, or used as it was.
 */
async function groundsFor(env: Env, material: MaterialStub, asked: CheckRequest): Promise<Grounds> {
  if (!asked.card) return { fact: null, reference: null };
  const { id, step } = asked.card;
  const lesson = courseLesson(asked.card.lesson);
  const taught = lesson?.steps[step];
  const factKey = targetKey({ kind: "fact", lesson: asked.card.lesson, step });
  const referenceKey = targetKey({ kind: "reference", card: id });
  const held = await material.items([factKey, referenceKey, "style"]);
  const style = styleText(held.style);

  const ensure = async (key: string, basis: string, context: Context): Promise<string | null> => {
    const item = held[key];
    if (standing(item, basis) === "current") return current(item!);
    const text = await askClaude(env, writeParams(context, style), writtenOf);
    if (isRefusal(text)) {
      console.error(`Writing ${key} for a check failed:`, text.error);
      return item ? current(item) : null;
    }
    return current(await material.settle(key, basis, { text, at: Date.now(), origin: "written" }));
  };

  const heldFact = held[factKey] ? current(held[factKey]) : null;
  const [fact, reference] = await Promise.all([
    lesson && taught ? ensure(factKey, factBasis(taught), { kind: "fact", lesson, step }) : null,
    ensure(referenceKey, referenceBasis(asked.question), {
      kind: "reference",
      question: asked.question,
      where: asked.where,
      lesson,
      step,
      fact: heldFact,
    }),
  ]);
  return { fact, reference };
}

/** Carry out a command from the admin page, and answer with the item it changed. */
async function run(env: Env, material: MaterialStub, command: Command, saved: SavedDeck): Promise<Item | Refusal> {
  const key = targetKey(command.target);
  const place = placeOf(command, saved.cards);
  if (isRefusal(place)) return place;
  const held = await material.items([key, "style", ...(place.factKey ? [place.factKey] : [])]);
  const item = held[key];

  let written = "";
  if (byClaude(command)) {
    if (!place.context) return refuse(404, "There is nothing to write that for.");
    const context: Context =
      place.context.kind === "reference" && place.factKey && held[place.factKey]
        ? { ...place.context, fact: current(held[place.factKey]) }
        : place.context;
    const style = styleText(held.style);
    if (command.kind === "refine" && !item) return refuse(404, "There is nothing to refine yet. Write it first.");
    const text = await askClaude(
      env,
      command.kind === "write" ? writeParams(context, style) : refineParams(context, style, current(item!), command.instruction),
      writtenOf,
    );
    if (isRefusal(text)) return text;
    written = text;
  }
  const version = versionFor(command, item, Date.now(), written);
  if (!version) return refuse(404, "That version is no longer kept.");
  return material.append(key, place.basis, version);
}

/**
 * What a command's target is written for and from, found in the course and
 * the deck: its basis, what Claude is given to write it, and, for a
 * reference answer, where its step's key fact is kept.
 */
function placeOf(
  command: Command,
  cards: Card[],
): { basis: string; context: Context | null; factKey: string | null } | Refusal {
  const { target } = command;
  switch (target.kind) {
    case "style":
      return { basis: STYLE_BASIS, context: null, factKey: null };
    case "fact": {
      const lesson = courseLesson(target.lesson);
      const step = lesson?.steps[target.step];
      if (!lesson || !step) return refuse(404, "That step is not in the course.");
      return { basis: factBasis(step), context: { kind: "fact", lesson, step: target.step }, factKey: null };
    }
    case "reference": {
      const card = cards.find((c) => c.id === target.card);
      if (!card) return refuse(404, "That question is not in the deck.");
      const lesson: CourseLesson | null = courseLesson(card.lesson);
      return {
        basis: referenceBasis(card.question),
        context: {
          kind: "reference",
          question: card.question,
          where: whereOf(card, lesson),
          lesson,
          step: card.step,
          fact: null,
        },
        factKey: targetKey({ kind: "fact", lesson: card.lesson, step: card.step }),
      };
    }
  }
}

/** Ask Claude, and read its reply with `read`, or say why there is none. */
async function askClaude<T>(
  env: Env,
  params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
  read: (message: Anthropic.Beta.Messages.BetaMessage) => T | Refusal,
): Promise<T | Refusal> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL });
  try {
    return read(await client.beta.messages.create(params));
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("A call to Claude failed:", error.status, error.message);
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

/**
 * The recall material: a row per piece, keyed by `targetKey`. A reference
 * answer whose question has left the deck stays, unread, in case the
 * question comes back in a merge.
 */
export class Material extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, item TEXT NOT NULL)");
  }

  /** Every piece held, by key. */
  read(): Record<string, Item> {
    return this.rows("SELECT key, item FROM items");
  }

  /** The pieces held under `keys`; those not held are left out. */
  items(keys: string[]): Record<string, Item> {
    return this.rows(`SELECT key, item FROM items WHERE key IN (${keys.map(() => "?").join(", ")})`, ...keys);
  }

  /** Make `version` current for `key`, written for `basis`, and return the item. */
  append(key: string, basis: string, version: Version): Item {
    return this.change(key, (held) => withVersion(held, basis, version));
  }

  /** The same, unless the item became current for `basis` while `version` was written. */
  settle(key: string, basis: string, version: Version): Item {
    return this.change(key, (held) => settle(held, basis, version));
  }

  private change(key: string, fn: (held: Item | undefined) => Item): Item {
    return this.ctx.storage.transactionSync(() => {
      const held = this.items([key])[key];
      const next = fn(held);
      if (next !== held) this.ctx.storage.sql.exec("INSERT OR REPLACE INTO items (key, item) VALUES (?, ?)", key, JSON.stringify(next));
      return next;
    });
  }

  private rows(query: string, ...bindings: string[]): Record<string, Item> {
    const rows = this.ctx.storage.sql.exec<{ key: string; item: string }>(query, ...bindings).toArray();
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.item) as Item]));
  }
}

const isRefusal = (value: unknown): value is Refusal =>
  typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "refuse";

const refuse = (status: number, error: string): Refusal => ({ kind: "refuse", status, error });

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
