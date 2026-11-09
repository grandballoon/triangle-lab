// Syncing the recall deck with the site's Worker (worker/), at /deck on the
// site's own origin, from every page that holds the deck: the menu, the lessons and the recall page.
//
// A sync sends the whole deck and merges what comes back into the store.
// One runs when the page opens, shortly after each change, when the tab is
// shown again or hidden, when the browser comes back online, and every few
// minutes while the tab is on show. Nothing is lost while syncing cannot
// happen: the deck is still kept in the browser (store.ts), and goes with
// the next sync that works.
//
// Requests carry the learner's session cookie, set by signing in
// (signin.html, worker/auth.ts); without one the Worker answers 401 and
// syncing stands as signed out, the deck kept here until they sign in.
//
// The same sign-in lets the recall page have Claude check an answer, at /check
// (check.ts), and read a free association, at /associate (associate.ts), and
// a lesson page have it check an explanation, at /explain (explain.ts), so
// those requests are made here too.
//
// The rules are in sync.ts; this makes the requests and holds the state.

import { readAssociateReply, type AssociateRequest, type ReadingState } from "./associate.ts";
import { readCheckReply, type CheckRequest, type Review } from "./check.ts";
import type { ExplainRequest } from "./explain.ts";
import { mergeDecks, saveDeck, type Deck } from "./deck.ts";
import { RecallStore } from "./store.ts";
import { afterReply, hasNews, lastSynced, readReply, REDIRECTED, sendWhen, type SyncState } from "./sync.ts";

/** How long after a change to wait for the next before sending them. */
export const SETTLE_MS = 1500;

/**
 * The same for a change to writing alone, the free association or a lesson's
 * explanation, which comes with every key pressed: it is sent once the
 * writing pauses, or the tab is hidden, rather than every second and a half
 * while it goes on.
 */
export const WRITING_SETTLE_MS = 10_000;

/** How often to sync while the tab is on show, to hear other devices' changes. */
export const EVERY_MS = 5 * 60 * 1000;

type Timer = ReturnType<typeof setTimeout>;

/** What syncing needs from the browser, passed in so a test can stand in for it. */
export interface SyncDeps {
  /** Where the site is served from, with no trailing slash: the deck is at `${url}/deck`, checks at `${url}/check`, free associations at `${url}/associate`, explanations at `${url}/explain`. */
  url: string;
  fetch: typeof fetch;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => Timer;
  clearTimeout: (timer: Timer) => void;
  setInterval: (fn: () => void, ms: number) => unknown;
  /** Where the window's events (online, focus) arrive. */
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
  /** Whether the sync waiting to be sent is for questions, which a change to the writing does not put off. */
  private pendingSoon = false;
  private readonly listeners = new Set<(state: SyncState) => void>();

  constructor(
    private readonly store: RecallStore,
    private readonly deps: SyncDeps,
  ) {
    this.state = { kind: "syncing", last: null };
  }

  /** Sync now, and from here on whenever there is cause. */
  start(): void {
    this.store.subscribe((deck) => {
      const when = sendWhen(deck, this.server);
      if (when) this.soon(when);
    });
    const events = this.deps.events;
    events?.addEventListener("online", () => void this.sync());
    events?.addEventListener("focus", () => void this.sync());
    // Hidden as well as shown: a phone may stop a page it has put aside
    // before a change made just before is sent.
    this.deps.doc?.addEventListener("visibilitychange", () => void this.sync());
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

  /**
   * Whether answers can be sent to be checked: the learner is signed in, as
   * far as the last reply said.
   */
  canCheck(): boolean {
    return this.state.kind !== "signed-out";
  }

  /** Have Claude read an answer, through the Worker. */
  async check(request: CheckRequest): Promise<Review> {
    return readCheckReply(await this.post("/check", request));
  }

  /** Have Claude check an explanation of a lesson's idea, through the Worker. */
  async explain(request: ExplainRequest): Promise<Review> {
    return readCheckReply(await this.post("/explain", request));
  }

  /** Have Claude read a free association, through the Worker. */
  async associate(request: AssociateRequest): Promise<ReadingState> {
    return readAssociateReply(await this.post("/associate", request));
  }

  /** Sync now, or straight after the sync under way. */
  sync(): Promise<void> {
    if (this.pending !== null) this.deps.clearTimeout(this.pending);
    this.pending = null;
    this.pendingSoon = false;
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

  /** Sync once changes have settled: questions soon, writing once it pauses. */
  private soon(when: "soon" | "later"): void {
    if (when === "later" && this.pendingSoon) return;
    if (this.pending !== null) this.deps.clearTimeout(this.pending);
    this.pendingSoon = when === "soon";
    this.pending = this.deps.setTimeout(() => {
      this.pending = null;
      this.pendingSoon = false;
      void this.sync();
    }, when === "soon" ? SETTLE_MS : WRITING_SETTLE_MS);
  }

  private async once(): Promise<void> {
    this.set({ kind: "syncing", last: lastSynced(this.state) });
    const reply = readReply(await this.post("/deck", saveDeck(this.store.get())));
    if (reply.kind === "deck") {
      // Noted first, so the change it makes below does not look like news.
      this.server = reply.deck;
      if (hasNews(reply.deck, this.store.get())) this.store.update((d) => mergeDecks(d, reply.deck));
      // Changed here while the reply was on its way.
      if (hasNews(this.store.get(), this.server)) this.again = true;
    }
    this.set(afterReply(reply, lastSynced(this.state), this.deps.now()));
  }

  private async post(path: string, body: unknown): Promise<{ status: number; body: unknown } | null> {
    try {
      const response = await this.deps.fetch(`${this.deps.url}${path}`, {
        method: "POST",
        // `X-Requested-With` tells the Worker the request is the site's own
        // (worker/rules.ts), and asks a Cloudflare Access in front, as on
        // staging, to answer 401 rather than send the page off to sign in;
        // a redirect it sends anyway is not followed, but read as the same
        // (sync.ts signedOut).
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
        redirect: "manual",
        body: JSON.stringify(body),
      });
      if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) return { status: REDIRECTED, body: null };
      return { status: response.status, body: await response.json().catch(() => null) };
    } catch {
      return null;
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
 * The page's deck, syncing with the Worker while the learner is signed in.
 * Every page holding the deck opens it here, once.
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
  return {
    // The site's root, as built (vite.config.ts `base`).
    url: import.meta.env.BASE_URL.replace(/\/+$/, ""),
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
