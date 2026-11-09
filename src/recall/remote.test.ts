// Syncing from a page, against a stand-in Worker that merges the way the real
// one does (worker/worker.test.ts runs the real one), with timers run by hand.

import { describe, expect, it } from "vitest";
import { addCard, EMPTY_DECK, loadDeck, mergeDecks, newCard, removeCard, saveDeck, setWriting, type Deck } from "./deck.ts";
import { EVERY_MS, RecallSync, SETTLE_MS, WRITING_SETTLE_MS, type SyncDeps } from "./remote.ts";
import { RecallStore } from "./store.ts";

const T0 = 1_800_000_000_000;
const card = (id: string) => newCard(id, `Question ${id}?`, { lesson: "medians", step: 0, stepTitle: "" }, T0)!;
const ids = (deck: Deck) => deck.cards.map((c) => c.id);

function memory(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}

/** The Worker as the page sees it: takes a deck from a signed-in page, merges, answers. */
function worker() {
  const w = {
    deck: EMPTY_DECK,
    sent: 0,
    /** null: as if offline. */
    up: true,
    /** Whether the learner is signed out, or their sign-in has run out. */
    signedOut: false,
    requests: [] as RequestInit[],
    fetch: (async (_url: string, init: RequestInit) => {
      w.sent++;
      w.requests.push(init);
      if (!w.up) throw new TypeError("Failed to fetch");
      if (w.signedOut) return Response.json({ error: "Sign in first." }, { status: 401 });
      w.deck = mergeDecks(w.deck, loadDeck(JSON.parse(init.body as string))!);
      return Response.json(saveDeck(w.deck));
    }) as unknown as typeof fetch,
  };
  return w;
}

/** A page: its own storage and timers, syncing with `server`. */
function page(server: ReturnType<typeof worker>) {
  const storage = memory();
  const timers = new Map<number, () => void>();
  /** How long each timer waiting now was set for. */
  const delays = new Map<number, number>();
  const repeating: (() => void)[] = [];
  const listeners: Record<string, (() => void)[]> = {};
  const on = ((type: string, fn: () => void) => (listeners[type] ??= []).push(fn)) as never;
  let next = 0;
  let visible = true;
  const deps: SyncDeps = {
    url: "https://triangle-lab.example",
    fetch: server.fetch,
    now: () => T0,
    setTimeout: (fn, ms) => {
      expect([SETTLE_MS, WRITING_SETTLE_MS]).toContain(ms);
      timers.set(++next, fn);
      delays.set(next, ms);
      return next as never;
    },
    clearTimeout: (t) => {
      timers.delete(t as never);
      delays.delete(t as never);
    },
    setInterval: (fn, ms) => {
      expect(ms).toBe(EVERY_MS);
      repeating.push(fn);
    },
    events: { addEventListener: on },
    doc: { addEventListener: on },
    visible: () => visible,
  };
  const store = new RecallStore(storage, null);
  const sync = new RecallSync(store, deps);
  return {
    store,
    sync,
    storage,
    /** Let every request under way finish. */
    settle: () => new Promise((r) => setTimeout(r, 0)),
    /** Run the timers a change set. */
    elapse: () => {
      const due = [...timers.values()];
      timers.clear();
      delays.clear();
      due.forEach((fn) => fn());
    },
    /** How long the timers waiting now were set for. */
    waiting: () => [...delays.values()],
    tick: (shown = true) => {
      visible = shown;
      repeating.forEach((fn) => fn());
    },
    fire: (type: string) => listeners[type]?.forEach((fn) => fn()),
  };
}

describe("RecallSync, with the free association", () => {
  const writing = (text: string) => ({ text, read: null, updated: T0 + 1 });

  it("sends a change to the writing alone once it pauses, and does not put off a question's", async () => {
    const server = worker();
    const p = page(server);
    p.sync.start();
    await p.settle();

    p.store.update((d) => setWriting(d, writing("Medians")));
    p.store.update((d) => setWriting(d, writing("Medians meet")));
    expect(p.waiting()).toEqual([WRITING_SETTLE_MS]);
    p.store.update((d) => addCard(d, card("a")));
    expect(p.waiting()).toEqual([SETTLE_MS]);
    p.store.update((d) => setWriting(d, writing("Medians meet at G")));
    expect(p.waiting()).toEqual([SETTLE_MS]);

    p.elapse();
    await p.settle();
    expect(server.deck.writing?.text).toBe("Medians meet at G");
    expect(ids(server.deck)).toEqual(["a"]);
  });
});

describe("RecallSync", () => {
  it("sends what the page holds and takes what other devices sent, with the session cookie, as the site's own", async () => {
    const server = worker();
    server.deck = { cards: [card("theirs")], removed: [] };
    const p = page(server);
    p.store.update((d) => addCard(d, card("mine")));
    p.sync.start();
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "synced", last: T0 });
    expect(ids(server.deck)).toEqual(["mine", "theirs"]);
    expect(ids(p.store.get())).toEqual(["mine", "theirs"]);
    expect(server.requests[0]).toMatchObject({ credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } });
  });

  it("sends a change once changes settle, and only changes", async () => {
    const server = worker();
    const p = page(server);
    p.sync.start();
    await p.settle();
    expect(server.sent).toBe(1);

    p.store.update((d) => addCard(d, card("a")));
    p.store.update((d) => addCard(d, card("b")));
    await p.settle();
    expect(server.sent).toBe(1);
    p.elapse();
    await p.settle();
    expect(server.sent).toBe(2);
    expect(ids(server.deck)).toEqual(["a", "b"]);

    // Taking in the Worker's reply is not itself a change to send.
    p.elapse();
    await p.settle();
    expect(server.sent).toBe(2);
  });

  it("keeps two pages the same, removals too", async () => {
    const server = worker();
    const phone = page(server);
    const laptop = page(server);
    phone.sync.start();
    laptop.sync.start();
    await phone.settle();

    phone.store.update((d) => addCard(addCard(d, card("a")), card("b")));
    phone.elapse();
    await phone.settle();
    laptop.fire("focus");
    await laptop.settle();
    expect(ids(laptop.store.get())).toEqual(["a", "b"]);

    laptop.store.update((d) => removeCard(d, "a", T0 + 1));
    laptop.elapse();
    await laptop.settle();
    phone.fire("visibilitychange");
    await phone.settle();
    expect(ids(phone.store.get())).toEqual(["b"]);
  });

  it("hears other devices every few minutes, but only while on show", async () => {
    const server = worker();
    const p = page(server);
    p.sync.start();
    await p.settle();
    server.deck = { cards: [card("elsewhere")], removed: [] };
    p.tick(false);
    await p.settle();
    expect(ids(p.store.get())).toEqual([]);
    p.tick(true);
    await p.settle();
    expect(ids(p.store.get())).toEqual(["elsewhere"]);
  });

  it("keeps changes while the Worker can't be reached, and sends them once it can", async () => {
    const server = worker();
    server.up = false;
    const p = page(server);
    p.sync.start();
    p.store.update((d) => addCard(d, card("offline")));
    p.elapse();
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "unreachable", last: null });
    expect(ids(p.store.get())).toEqual(["offline"]);

    server.up = true;
    p.fire("online");
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "synced", last: T0 });
    expect(ids(server.deck)).toEqual(["offline"]);
  });

  it("keeps trying while signed out, holding off Claude, and syncs once signed in", async () => {
    const server = worker();
    server.signedOut = true;
    const p = page(server);
    p.sync.start();
    p.store.update((d) => addCard(d, card("a")));
    await p.settle();
    p.tick();
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "signed-out", last: null });
    expect(p.sync.canCheck()).toBe(false);

    // Signed in in another tab; this one gets the focus back.
    server.signedOut = false;
    p.fire("focus");
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "synced", last: T0 });
    expect(p.sync.canCheck()).toBe(true);
    expect(ids(server.deck)).toEqual(["a"]);
  });

  it("reads a redirect to Access's sign-in page, as staging's sends, as signed out", async () => {
    const server = worker();
    server.fetch = (async () => {
      server.sent++;
      return new Response(null, { status: 302, headers: { Location: "https://team.cloudflareaccess.com/cdn-cgi/access/login" } });
    }) as unknown as typeof fetch;
    const p = page(server);
    p.sync.start();
    await p.settle();
    expect(p.sync.get()).toEqual({ kind: "signed-out", last: null });
  });

  it("runs one sync at a time, and another after it when asked during it", async () => {
    const server = worker();
    const p = page(server);
    p.sync.start();
    void p.sync.sync();
    void p.sync.sync();
    await p.settle();
    await p.settle();
    expect(server.sent).toBe(2);
  });
});
