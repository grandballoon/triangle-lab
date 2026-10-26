// Syncing the recall deck with the recall Worker (worker/), from every page
// that holds the deck: the menu, the lessons and the recall page.
//
// A sync sends the whole deck and merges what comes back into the store.
// One runs when the page opens, shortly after each change, when the tab is
// shown again or hidden, when the browser comes back online, and every few
// minutes while the tab is on show. Nothing is lost while syncing cannot
// happen: the deck is still kept in the browser (store.ts), and goes with
// the next sync that works.
//
// The rules are in sync.ts; this makes the requests and holds the state.

import { mergeDecks, saveDeck, type Deck } from "./deck.ts";
import { RecallStore } from "./store.ts";
import { afterReply, hasNews, lastSynced, readReply, type SyncState } from "./sync.ts";

/** Where this browser keeps the sync key it was given. */
export const SYNC_KEY_STORAGE = "triangle-lab:recall-sync-key";

/** How long after a change to wait for the next before sending them. */
export const SETTLE_MS = 1500;

/** How often to sync while the tab is on show, to hear other devices' changes. */
export const EVERY_MS = 5 * 60 * 1000;

type Timer = ReturnType<typeof setTimeout>;

/** What syncing needs from the browser, passed in so a test can stand in for it. */
export interface SyncDeps {
  /** The Worker's address, or empty when this build has none. */
  url: string;
  keys: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  fetch: typeof fetch;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  setInterval: (fn: () => void, ms: number) => unknown;
  /** Where the window's events (online, focus, storage) arrive. */
  events: Pick<Window, "addEventListener"> | null;
  /** Where the document's visibilitychange arrives. */
  doc: Pick<Document, "addEventListener"> | null;
  visible: () => boolean;
}

export class RecallSync {
  private state: SyncState;
  /** The Worker's deck, as of the last sync that worked. */
  private server: Deck | null = null;
  private running: Promise<void> | null = null;
  /** A sync was asked for while one was running, so another follows it. */
  private again = false;
  private pending: Timer | null = null;
  /** A key given while storage was blocked, kept for as long as the page is open. */
  private memoryKey: string | null = null;
  /** A key the Worker turned down, not tried again until it is given again. */
  private refused: string | null = null;
  private readonly listeners = new Set<(state: SyncState) => void>();

  constructor(
    private readonly store: RecallStore,
    private readonly deps: SyncDeps,
  ) {
    this.state = !deps.url ? { kind: "off" } : this.key() ? { kind: "syncing", last: null } : { kind: "no-key" };
  }

  /** Sync now, and from here on whenever there is cause. */
  start(): void {
    if (!this.deps.url) return;
    this.store.subscribe((deck) => {
      if (hasNews(deck, this.server)) this.soon();
    });
    const events = this.deps.events;
    events?.addEventListener("online", () => void this.sync());
    events?.addEventListener("focus", () => void this.sync());
    // Hidden as well as shown: a phone may stop a page it has put aside
    // before a change made just before is sent.
    this.deps.doc?.addEventListener("visibilitychange", () => void this.sync());
    events?.addEventListener("storage", (e) => {
      if (e.key === SYNC_KEY_STORAGE || e.key === null) void this.sync();
    });
    this.deps.setInterval(() => {
      if (this.deps.visible()) void this.sync();
    }, EVERY_MS);
    void this.sync();
  }

  get(): SyncState {
    return this.state;
  }

  subscribe(fn: (state: SyncState) => void): void {
    this.listeners.add(fn);
  }

  /** Keep `key` for this browser and sync with it. */
  setKey(key: string): Promise<void> {
    const text = key.trim();
    if (!text) return Promise.resolve();
    try {
      this.deps.keys?.setItem(SYNC_KEY_STORAGE, text);
    } catch {
      // Storage blocked: the key is lost on reload, like the deck itself.
    }
    this.memoryKey = text;
    this.refused = null;
    this.server = null;
    return this.sync();
  }

  /** Stop syncing from this browser. The deck stays here as it is. */
  forgetKey(): void {
    try {
      this.deps.keys?.removeItem(SYNC_KEY_STORAGE);
    } catch {
      // Nothing kept to forget.
    }
    this.memoryKey = null;
    this.server = null;
    this.set({ kind: "no-key" });
  }

  /** Sync now, or straight after the sync under way. */
  sync(): Promise<void> {
    if (this.pending !== null) this.deps.clearTimeout(this.pending);
    this.pending = null;
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.once().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.sync();
      }
    });
    return this.running;
  }

  /** Sync once changes have settled. */
  private soon(): void {
    if (this.pending !== null) this.deps.clearTimeout(this.pending);
    this.pending = this.deps.setTimeout(() => {
      this.pending = null;
      void this.sync();
    }, SETTLE_MS);
  }

  private async once(): Promise<void> {
    const key = this.key();
    if (!this.deps.url) return;
    if (!key) return this.set({ kind: "no-key" });
    if (key === this.refused) return this.set({ kind: "refused" });
    this.set({ kind: "syncing", last: lastSynced(this.state) });

    const reply = readReply(await this.send(key, this.store.get()));
    // The key was changed while this was under way; the sync for the new
    // one follows.
    if (key !== this.key()) return;
    if (reply.kind === "refused") this.refused = key;
    if (reply.kind === "deck") {
      // Noted first, so the change it makes below does not look like news.
      this.server = reply.deck;
      if (hasNews(reply.deck, this.store.get())) this.store.update((d) => mergeDecks(d, reply.deck));
      // Changed here while the reply was on its way.
      if (hasNews(this.store.get(), this.server)) this.again = true;
    }
    this.set(afterReply(reply, lastSynced(this.state), this.deps.now()));
  }

  private async send(key: string, deck: Deck): Promise<{ status: number; body: unknown } | null> {
    try {
      const response = await this.deps.fetch(`${this.deps.url}/deck`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(saveDeck(deck)),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    } catch {
      return null;
    }
  }

  private key(): string | null {
    try {
      return this.deps.keys?.getItem(SYNC_KEY_STORAGE) || this.memoryKey;
    } catch {
      return this.memoryKey;
    }
  }

  private set(state: SyncState): void {
    if (JSON.stringify(state) === JSON.stringify(this.state)) return;
    this.state = state;
    for (const fn of this.listeners) fn(state);
  }
}

let opened: { store: RecallStore; sync: RecallSync } | null = null;

/**
 * The page's deck, syncing with the Worker this build names, if any. Every
 * page holding the deck opens it here, once.
 */
export function openRecall(): { store: RecallStore; sync: RecallSync } {
  if (!opened) {
    const store = new RecallStore();
    const sync = new RecallSync(store, browserDeps());
    sync.start();
    opened = { store, sync };
  }
  return opened;
}

function browserDeps(): SyncDeps {
  let keys: SyncDeps["keys"] = null;
  try {
    keys = typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    keys = null;
  }
  return {
    url: (import.meta.env.VITE_RECALL_SYNC_URL ?? "").trim().replace(/\/+$/, ""),
    keys,
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (timer) => clearTimeout(timer),
    setInterval: (fn, ms) => setInterval(fn, ms),
    events: typeof window === "undefined" ? null : window,
    doc: typeof document === "undefined" ? null : document,
    visible: () => typeof document === "undefined" || document.visibilityState === "visible",
  };
}
