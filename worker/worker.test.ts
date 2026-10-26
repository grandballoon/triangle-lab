// The site's Worker running for real, in the local Workers runtime, from
// wrangler.jsonc: pages served from its assets, the recall deck's HTTP
// contract, the deck surviving the object being evicted, two devices
// syncing through it from the pages' own sync code, and answers checked by a
// stand-in for the Claude API.

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { createTestHarness, type TestHarness } from "wrangler";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addCard, editCard, EMPTY_DECK, newCard, removeCard, saveDeck, type Deck } from "../src/recall/deck.ts";
import { RecallSync, SYNC_KEY_STORAGE } from "../src/recall/remote.ts";
import { RecallStore } from "../src/recall/store.ts";
import { MAX_BODY } from "./rules.ts";

const KEY = "a-test-key-long-enough-to-be-served";
const CLAUDE_KEY = "a-test-claude-key";
const ROOT = resolve(__dirname, "..");
const T0 = 1_700_000_000_000;
const card = (id: string, at = T0) => newCard(id, `Question ${id}?`, { lesson: "medians", step: 0, stepTitle: "" }, at)!;
const ids = (deck: { cards: { id: string }[] }) => deck.cards.map((c) => c.id);

let harness: TestHarness;
let base: string;
/**
 * Where the harness runs: away from the project, so the developer's own
 * .dev.vars key is not read, with an assets folder standing in for dist/,
 * which a test run may come before.
 */
let dir: string;

/** What the stand-in Claude API was asked, with its headers, and how it answers next. */
const claude = {
  asked: [] as { headers: Record<string, string | string[] | undefined>; body: Record<string, unknown> }[],
  status: 200,
  reply: { grade: "recalled", feedback: "Yes: the centroid." } as unknown,
  stop: "end_turn",
};
let claudeServer: Server;

beforeAll(async () => {
  claudeServer = createServer((req, res) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      claude.asked.push({ headers: req.headers, body: JSON.parse(text) });
      res.writeHead(claude.status, { "Content-Type": "application/json" });
      if (claude.status !== 200) {
        res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid API key" } }));
        return;
      }
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify(claude.reply) }],
          stop_reason: claude.stop,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((done) => claudeServer.listen(0, "127.0.0.1", done));
  const claudeUrl = `http://127.0.0.1:${(claudeServer.address() as AddressInfo).port}`;

  dir = await mkdtemp(join(tmpdir(), "triangle-lab-worker-"));
  const assets = join(dir, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "index.html"), "<title>Lessons</title>");
  await writeFile(join(assets, "recall.html"), "<title>Recall</title>");
  // The secrets wrangler.jsonc requires, as the developer's own .dev.vars gives them.
  await writeFile(join(dir, ".dev.vars"), `RECALL_KEY=${KEY}\nANTHROPIC_API_KEY=${CLAUDE_KEY}\n`);
  // The real configuration, with only the assets and where Claude is swapped in.
  const path = join(ROOT, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(path, await readFile(path, "utf8"));
  if (error) throw new Error(String(error.messageText));
  harness = createTestHarness({
    root: dir,
    workers: [
      {
        config: {
          ...config,
          main: join(ROOT, config.main),
          assets: { ...config.assets, directory: assets },
          vars: { ANTHROPIC_BASE_URL: claudeUrl },
        },
      },
    ],
  });
  await harness.listen();
}, 60_000);

beforeEach(async () => {
  Object.assign(claude, { asked: [], status: 200, reply: { grade: "recalled", feedback: "Yes: the centroid." }, stop: "end_turn" });
  await harness.reset();
  base = (await harness.listen()).url.href.replace(/\/$/, "");
});

afterAll(async () => {
  await harness?.close();
  await new Promise((done) => claudeServer?.close(done));
  await rm(dir, { recursive: true, force: true });
});

const call = (method: string, body?: unknown, headers: Record<string, string> = {}, path = "/deck") =>
  fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

describe("the site", () => {
  it("serves the pages from its assets, and the deck beside them", async () => {
    expect(await (await fetch(`${base}/`)).text()).toBe("<title>Lessons</title>");
    expect(await (await fetch(`${base}/recall`)).text()).toBe("<title>Recall</title>");
    expect((await fetch(`${base}/nowhere.html`)).status).toBe(404);
    expect((await call("GET")).status).toBe(200);
  });
});

describe("the recall deck", () => {
  it("merges each deck sent into the one it holds, and answers with the result", async () => {
    expect(await (await call("GET")).json()).toEqual(saveDeck(EMPTY_DECK));
    const stale: Deck = { cards: [card("a"), card("b", T0 + 1)], removed: [] };
    const first = await call("POST", saveDeck(stale));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(saveDeck(stale));

    // A device changes the deck; another, which has not heard, sends its older copy.
    const later = removeCard(editCard(stale, "a", "Reworded?", T0 + 5), "b", T0 + 6);
    await call("POST", saveDeck(later));
    const held = await (await call("POST", saveDeck(stale))).json();
    expect(held).toEqual(saveDeck(later));
    expect(later.removed).toEqual([{ id: "b", at: T0 + 6 }]);
  });

  it("keeps the deck when the object is evicted", async () => {
    await call("POST", saveDeck({ cards: [card("kept")], removed: [] }));
    await harness.getWorker().evictDurableObject("RecallDeck", { name: "deck" });
    expect(ids(await (await call("GET")).json())).toEqual(["kept"]);
  });

  it("refuses a caller without the key", async () => {
    for (const authorization of [`Bearer wrong`, ""]) {
      const response = await call("POST", saveDeck({ cards: [card("x")], removed: [] }), {
        Authorization: authorization,
      });
      expect(response.status).toBe(401);
    }
    expect(ids(await (await call("GET")).json())).toEqual([]);
  });

  it("refuses what is not a deck", async () => {
    expect((await call("POST", "{not json")).status).toBe(400);
    expect((await call("POST", { cards: [] })).status).toBe(400);
  });

  it("refuses a change dated well ahead of its clock, which would win every merge", async () => {
    const ahead = await call("POST", saveDeck({ cards: [card("future", Date.now() + 365 * 86_400_000)], removed: [] }));
    expect(ahead.status).toBe(400);
    expect((await ahead.json()).error).toContain("dated in the future");
    expect(ids(await (await call("GET")).json())).toEqual([]);
    expect((await call("POST", saveDeck({ cards: [card("now", Date.now())], removed: [] }))).status).toBe(200);
  });

  it("refuses a deck too large to take", async () => {
    const response = await call("POST", "x".repeat(MAX_BODY + 1));
    expect(response.status).toBe(413);
  });

  it("slows a caller making too many requests, before looking at the key", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 70; i++) {
      statuses.push((await call("GET", undefined, { Authorization: "Bearer guess" })).status);
    }
    expect(statuses.slice(0, 60).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

});

describe("checking an answer", () => {
  const request = { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2", answer: "At the centroid" };
  const check = (body: unknown = request, headers: Record<string, string> = {}) => call("POST", body, headers, "/check");

  it("asks Claude with the Worker's key, and answers with its verdict", async () => {
    const response = await check();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ grade: "recalled", feedback: "Yes: the centroid." });
    expect(claude.asked).toHaveLength(1);
    const [{ headers, body }] = claude.asked;
    expect(headers.authorization).toBe(`Bearer ${CLAUDE_KEY}`);
    expect(headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(body).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default" });
    expect(JSON.stringify(body.messages)).toContain("At the centroid");
  });

  it("refuses a caller without the key, and what is not an answer, without asking Claude", async () => {
    expect((await check(request, { Authorization: "Bearer wrong" })).status).toBe(401);
    expect((await check({ ...request, answer: "" })).status).toBe(400);
    expect((await check("{not json")).status).toBe(400);
    expect(claude.asked).toEqual([]);
  });

  it("says why there is no verdict when Claude declines or turns the Worker's key down", async () => {
    claude.stop = "refusal";
    claude.reply = "";
    const declined = await check();
    expect(declined.status).toBe(502);
    expect((await declined.json()).error).toContain("declined");

    claude.status = 401;
    const turnedDown = await check();
    expect(turnedDown.status).toBe(502);
    expect((await turnedDown.json()).error).toContain("ANTHROPIC_API_KEY");
  });

  it("checks at most 10 answers a minute from one caller", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await check()).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    expect(claude.asked.length).toBeLessThanOrEqual(11);
  });
});

describe("two devices syncing through the Worker", () => {
  /** A device: its own browser storage, syncing as a page does. */
  function device() {
    const data: Record<string, string> = { [SYNC_KEY_STORAGE]: KEY };
    const storage = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
      removeItem: (k: string) => void delete data[k],
    };
    const store = new RecallStore(storage, null);
    const sync = new RecallSync(store, {
      url: base,
      keys: storage,
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (t) => clearTimeout(t),
      setInterval: () => undefined,
      events: null,
      doc: null,
      visible: () => true,
    });
    return { store, sync };
  }

  it("ends with the same deck on both, questions noted, answered and removed on either", async () => {
    const phone = device();
    const laptop = device();
    phone.store.update((d) => addCard(addCard(d, card("a")), card("b", T0 + 1)));
    await phone.sync.sync();
    laptop.store.update((d) => addCard(d, card("c", T0 + 2)));
    await laptop.sync.sync();
    expect(ids(laptop.store.get())).toEqual(["a", "b", "c"]);

    laptop.store.update((d) => removeCard(d, "a", T0 + 3));
    phone.store.update((d) => editCard(d, "b", "Asked on the phone?", T0 + 4));
    await laptop.sync.sync();
    await phone.sync.sync();
    await laptop.sync.sync();

    expect(phone.store.get()).toEqual(laptop.store.get());
    expect(ids(phone.store.get())).toEqual(["b", "c"]);
    expect(phone.store.get().cards[0].question).toBe("Asked on the phone?");
    expect(laptop.sync.get()).toMatchObject({ kind: "synced" });
  });
});
