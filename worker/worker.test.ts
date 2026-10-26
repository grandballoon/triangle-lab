// The recall Worker running for real, in the local Workers runtime: its
// HTTP contract, the deck surviving the object being evicted, and two
// devices syncing through it from the pages' own sync code.

import { createTestHarness, type TestHarness } from "wrangler";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addCard, editCard, EMPTY_DECK, newCard, removeCard, saveDeck, type Deck } from "../src/recall/deck.ts";
import { RecallSync, SYNC_KEY_STORAGE } from "../src/recall/remote.ts";
import { RecallStore } from "../src/recall/store.ts";

const KEY = "test-key";
const PAGE = "http://localhost:5173";
const T0 = 1_800_000_000_000;
const card = (id: string, at = T0) => newCard(id, `Question ${id}?`, { lesson: "medians", step: 0, stepTitle: "" }, at)!;
const ids = (deck: { cards: { id: string }[] }) => deck.cards.map((c) => c.id);

let harness: TestHarness;
let base: string;

beforeAll(async () => {
  harness = createTestHarness({
    root: `${__dirname}/..`,
    workers: [{ configPath: "./wrangler.jsonc", secrets: { RECALL_KEY: KEY } }],
  });
  await harness.listen();
}, 60_000);

beforeEach(async () => {
  await harness.reset();
  base = (await harness.listen()).url.href.replace(/\/$/, "");
});

afterAll(async () => {
  await harness?.close();
});

const call = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/deck`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, Origin: PAGE, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

describe("the recall Worker", () => {
  it("merges each deck sent into the one it holds, and answers with the result", async () => {
    expect(await (await call("GET")).json()).toEqual(saveDeck(EMPTY_DECK));
    const stale: Deck = { cards: [card("a"), card("b", T0 + 1)], removed: [] };
    const first = await call("POST", saveDeck(stale));
    expect(first.status).toBe(200);
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe(PAGE);
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

  it("answers a page's preflight, and only lets the listed pages read its answers", async () => {
    const preflight = await call("OPTIONS", undefined, { Authorization: "", "Access-Control-Request-Method": "POST" });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
    const elsewhere = await call("GET", undefined, { Origin: "https://elsewhere.example" });
    expect(elsewhere.headers.get("Access-Control-Allow-Origin")).toBeNull();
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
