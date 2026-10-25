// The recall deck's persistence: saved for every page, shared between tabs,
// and still usable for the page when storage refuses.

import { describe, expect, it, vi } from "vitest";
import { addCard, newCard, saveDeck, type Deck } from "./deck.ts";
import { RecallStore } from "./store.ts";

const T0 = 1_800_000_000_000;
const card = (id: string) => newCard(id, `Question ${id}?`, { lesson: "medians", step: 0, stepTitle: "" }, T0)!;

function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

/** A stand-in for `window`, firing `storage` events the way another tab's write does. */
function events() {
  const listeners: ((e: StorageEvent) => void)[] = [];
  return {
    addEventListener: ((type: string, fn: (e: StorageEvent) => void) => {
      if (type === "storage") listeners.push(fn);
    }) as Window["addEventListener"],
    fire: (key: string | null) => listeners.forEach((fn) => fn({ key } as StorageEvent)),
  };
}

const stored = (deck: Deck) => ({ "triangle-lab:recall": JSON.stringify(saveDeck(deck)) });

describe("RecallStore", () => {
  it("starts from the stored deck, or an empty one", () => {
    const deck = { cards: [card("a")] };
    expect(new RecallStore(memory(stored(deck)), null).get()).toEqual(deck);
    expect(new RecallStore(memory(), null).get()).toEqual({ cards: [] });
    expect(new RecallStore(memory({ "triangle-lab:recall": "{not json" }), null).get()).toEqual({ cards: [] });
  });

  it("saves each change and tells its listeners", () => {
    const storage = memory();
    const store = new RecallStore(storage, null);
    const heard = vi.fn();
    store.subscribe(heard);
    expect(store.update((d) => addCard(d, card("a")))).toBe(true);
    expect(new RecallStore(storage, null).get().cards.map((c) => c.id)).toEqual(["a"]);
    expect(heard).toHaveBeenCalledWith(store.get());
  });

  it("applies a change to the deck as stored, not as this page last saw it", () => {
    const storage = memory();
    const mine = new RecallStore(storage, null);
    const theirs = new RecallStore(storage, null);
    theirs.update((d) => addCard(d, card("theirs")));
    mine.update((d) => addCard(d, card("mine")));
    expect(new RecallStore(storage, null).get().cards.map((c) => c.id)).toEqual(["theirs", "mine"]);
  });

  it("picks up a change made in another tab", () => {
    const storage = memory();
    const tab = events();
    const store = new RecallStore(storage, tab);
    const heard = vi.fn();
    store.subscribe(heard);
    Object.assign(storage.data, stored({ cards: [card("elsewhere")] }));
    tab.fire("some-other-key");
    expect(heard).not.toHaveBeenCalled();
    tab.fire("triangle-lab:recall");
    expect(store.get().cards.map((c) => c.id)).toEqual(["elsewhere"]);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("keeps changes for the page when storage refuses them, and says so", () => {
    const refusing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = new RecallStore(refusing, null);
    expect(store.update((d) => addCard(d, card("a")))).toBe(false);
    expect(store.update((d) => addCard(d, card("b")))).toBe(false);
    expect(store.get().cards.map((c) => c.id)).toEqual(["a", "b"]);

    const none = new RecallStore(null, null);
    expect(none.update((d) => addCard(d, card("c")))).toBe(false);
    none.update((d) => addCard(d, card("d")));
    expect(none.get().cards.map((c) => c.id)).toEqual(["c", "d"]);
  });
});
