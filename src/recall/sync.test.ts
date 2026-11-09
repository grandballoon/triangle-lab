// Syncing's rules: what the Worker's replies mean, when there is something
// to send, and how each state reads.

import { describe, expect, it } from "vitest";
import { editCard, newCard, removeCard, saveDeck, setExplanation, setWriting, type Deck } from "./deck.ts";
import { afterReply, hasNews, readReply, REDIRECTED, sendWhen, signedOut, syncLabel } from "./sync.ts";

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const deck: Deck = {
  cards: [newCard("a", "Where do medians meet?", { lesson: "medians", step: 0, stepTitle: "" }, T0)!],
  removed: [],
};

describe("readReply", () => {
  it("takes the deck from a success", () => {
    expect(readReply({ status: 200, body: saveDeck(deck) })).toEqual({ kind: "deck", deck });
    expect(readReply({ status: 200, body: { cards: [] } })).toMatchObject({ kind: "failed" });
  });

  it("tells being signed out, no answer at all, and other failures apart", () => {
    expect(readReply({ status: 401, body: { error: "Sign in first." } })).toEqual({ kind: "signed-out" });
    expect(readReply({ status: 401, body: null })).toEqual({ kind: "signed-out" });
    expect(readReply({ status: REDIRECTED, body: null })).toEqual({ kind: "signed-out" });
    expect(readReply(null)).toEqual({ kind: "unreachable" });
    expect(readReply({ status: 413, body: { error: "That deck is too large." } })).toEqual({
      kind: "failed",
      error: "That deck is too large.",
    });
    expect(readReply({ status: 502, body: null })).toEqual({ kind: "failed", error: "The sync server answered 502." });
  });
});

describe("signedOut", () => {
  it("is any 401, the Worker's or an Access in front of it, or a redirect to sign in", () => {
    expect(signedOut({ status: 401 })).toBe(true);
    expect(signedOut({ status: REDIRECTED })).toBe(true);
    expect(signedOut({ status: 200 })).toBe(false);
    expect(signedOut({ status: 403 })).toBe(false);
  });
});

describe("afterReply", () => {
  it("moves the last success only when the sync worked", () => {
    expect(afterReply({ kind: "deck", deck }, T0, T0 + MIN)).toEqual({ kind: "synced", last: T0 + MIN });
    expect(afterReply({ kind: "unreachable" }, T0, T0 + MIN)).toEqual({ kind: "unreachable", last: T0 });
    expect(afterReply({ kind: "failed", error: "x" }, null, T0)).toEqual({ kind: "failed", last: null, error: "x" });
    expect(afterReply({ kind: "signed-out" }, T0, T0 + MIN)).toEqual({ kind: "signed-out", last: T0 });
  });
});

describe("hasNews", () => {
  it("is whether the deck holds a question, change or removal the Worker's copy lacks", () => {
    expect(hasNews(deck, null)).toBe(true);
    expect(hasNews(deck, deck)).toBe(false);
    expect(hasNews(editCard(deck, "a", "Why?", T0 + 1), deck)).toBe(true);
    expect(hasNews(removeCard(deck, "a", T0 + 1), deck)).toBe(true);
    // An older copy than the Worker's is nothing new.
    expect(hasNews(deck, editCard(deck, "a", "Why?", T0 + 1))).toBe(false);
  });
});

describe("sendWhen", () => {
  it("sends questions soon, the free association alone once it pauses, and nothing that is not news", () => {
    const writing = { text: "Hi", read: null, updated: T0 + 1 };
    expect(sendWhen(deck, deck)).toBeNull();
    expect(sendWhen(editCard(deck, "a", "Why?", T0 + 1), deck)).toBe("soon");
    expect(sendWhen(setWriting(deck, writing), deck)).toBe("later");
    expect(sendWhen(setWriting(editCard(deck, "a", "Why?", T0 + 1), writing), deck)).toBe("soon");
    expect(sendWhen(setWriting(deck, writing), null)).toBe("soon");
  });

  it("sends an explanation alone once the writing pauses, as it does the free association", () => {
    const explained = setExplanation(deck, { lesson: "medians", text: "Hi", checked: null, updated: T0 + 1 });
    expect(sendWhen(explained, deck)).toBe("later");
    expect(sendWhen(editCard(explained, "a", "Why?", T0 + 1), deck)).toBe("soon");
  });
});

describe("syncLabel", () => {
  it("says when the last sync was", () => {
    expect(syncLabel({ kind: "synced", last: T0 }, T0 + 20_000)).toBe("Synced with your other devices just now.");
    expect(syncLabel({ kind: "synced", last: T0 }, T0 + 5 * MIN)).toBe("Synced with your other devices 5 min ago.");
    expect(syncLabel({ kind: "synced", last: T0 }, T0 + 60 * MIN)).toBe("Synced with your other devices 1 hour ago.");
    expect(syncLabel({ kind: "synced", last: T0 }, T0 + 50 * 60 * MIN)).toBe("Synced with your other devices 2 days ago.");
  });

  it("reads a sync under way as the last success, once there has been one", () => {
    expect(syncLabel({ kind: "syncing", last: null }, T0)).toBe("Syncing…");
    expect(syncLabel({ kind: "syncing", last: T0 }, T0)).toBe(syncLabel({ kind: "synced", last: T0 }, T0));
  });

  it("says that nothing is lost when syncing fails", () => {
    expect(syncLabel({ kind: "unreachable", last: T0 }, T0 + 2 * MIN)).toBe(
      "Can't reach the sync server. Changes are kept here and sent once it's back. Last synced 2 min ago.",
    );
    expect(syncLabel({ kind: "failed", last: null, error: "That deck is too large." }, T0)).toBe(
      "Syncing went wrong: That deck is too large. Changes are kept here.",
    );
    expect(syncLabel({ kind: "signed-out", last: T0 }, T0 + 2 * MIN)).toBe(
      "You're signed out. Changes are kept here and sent once you sign in again. Last synced 2 min ago.",
    );
    expect(syncLabel({ kind: "signed-out", last: null }, T0)).toBe(
      "Your questions are kept in this browser only. Sign in to keep them the same on every device you use.",
    );
  });
});
