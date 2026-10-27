// New ids for cards. Kept apart from deck.ts, which takes ids as arguments
// so that its rules stay pure.

/** A unique id. randomUUID needs a secure context, which a LAN address lacks. */
export function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
