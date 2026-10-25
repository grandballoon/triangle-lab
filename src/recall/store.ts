// The recall deck, persisted in the browser and shared by every page. A
// question noted in a lesson tab shows up on an open recall page at once,
// and the other way round: each change is read-modify-write against storage,
// and a change made in another tab arrives through the `storage` event.
//
// The rules live in deck.ts; this holds the current deck and does the I/O.

import { EMPTY_DECK, loadDeck, saveDeck, type Deck } from "./deck.ts";

const STORAGE_KEY = "triangle-lab:recall";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type EventSource = Pick<Window, "addEventListener">;

export class RecallStore {
  private value: Deck;
  /**
   * False once a write has failed: storage then no longer holds what this
   * page has, so the page stops reading it and keeps its own deck.
   */
  private inSync: boolean;
  private readonly listeners = new Set<(deck: Deck) => void>();

  constructor(
    private readonly storage: StorageLike | null = defaultStorage(),
    events: EventSource | null = typeof window === "undefined" ? null : window,
  ) {
    this.inSync = storage !== null;
    this.value = this.read();
    events?.addEventListener("storage", (e) => {
      if ((e.key !== STORAGE_KEY && e.key !== null) || !this.inSync) return;
      this.value = this.read();
      this.notify();
    });
  }

  get(): Deck {
    return this.value;
  }

  /**
   * Apply `change` to the deck as stored now, and save the result. Returns
   * false if it could not be saved (storage blocked or full); the change then
   * lasts only while the page is open.
   */
  update(change: (deck: Deck) => Deck): boolean {
    this.value = change(this.read());
    try {
      if (this.inSync) this.storage?.setItem(STORAGE_KEY, JSON.stringify(saveDeck(this.value)));
    } catch {
      this.inSync = false;
    }
    this.notify();
    return this.inSync;
  }

  subscribe(fn: (deck: Deck) => void): void {
    this.listeners.add(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.value);
  }

  /** The stored deck, or what this page holds once storage has failed it. */
  private read(): Deck {
    if (!this.storage || !this.inSync) return this.value ?? EMPTY_DECK;
    try {
      const text = this.storage.getItem(STORAGE_KEY);
      return text ? (loadDeck(JSON.parse(text)) ?? EMPTY_DECK) : EMPTY_DECK;
    } catch {
      return this.value ?? EMPTY_DECK;
    }
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
