// The account page's section on paying for Claude, and what each reply from
// the Worker's /account makes of it.

import { describe, expect, it } from "vitest";
import { accountText, afterAccount, afterKeyChange, creditLine, dollars, readAccount, type AccountView } from "./account.ts";

const credit = { kind: "credit", granted: 5_000_000, spent: 1_600_000 } as const;
const shown: AccountView = { kind: "shown", account: credit, busy: true, error: null };

describe("readAccount", () => {
  it("reads each way calls are paid for, and nothing else", () => {
    expect(readAccount({ kind: "owner" })).toEqual({ kind: "owner" });
    expect(readAccount({ kind: "own-key", hint: "wxyz", key: "never sent" })).toEqual({ kind: "own-key", hint: "wxyz" });
    expect(readAccount(credit)).toEqual(credit);
    for (const bad of [null, "owner", { kind: "own-key" }, { kind: "credit", granted: -1, spent: 0 }, { kind: "credit", granted: 1, spent: Infinity }]) {
      expect(readAccount(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("after a reply", () => {
  it("shows the account read, or why it could not be", () => {
    expect(afterAccount({ status: 200, body: credit })).toEqual({ kind: "shown", account: credit, busy: false, error: null });
    expect(afterAccount({ status: 200, body: {} })).toMatchObject({ kind: "failed" });
    expect(afterAccount(null)).toMatchObject({ kind: "failed", error: expect.stringContaining("Can't reach") });
  });

  it("shows the account a key change left, or keeps the one before with the Worker's reason", () => {
    expect(afterKeyChange({ status: 200, body: { kind: "own-key", hint: "wxyz" } }, shown)).toEqual({
      kind: "shown",
      account: { kind: "own-key", hint: "wxyz" },
      busy: false,
      error: null,
    });
    const error = "That doesn't look like a Claude API key. Keys start with sk-ant-.";
    expect(afterKeyChange({ status: 400, body: { error } }, shown)).toEqual({ ...shown, busy: false, error });
    expect(afterKeyChange({ status: 400, body: { error } }, { kind: "loading" })).toEqual({ kind: "failed", error });
  });
});

describe("dollars", () => {
  it("shows micros as dollars and cents, rounded down, never below nothing", () => {
    expect(dollars(5_000_000)).toBe("$5.00");
    expect(dollars(3_409_999)).toBe("$3.40");
    expect(dollars(12_345_678_900)).toBe("$12345.67");
    expect(dollars(-14_000)).toBe("$0.00");
  });
});

describe("accountText", () => {
  it("says how much beta credit is left, and what a key of their own is for", () => {
    expect(creditLine(credit)).toBe("$3.40 of $5.00 beta credit left.");
    expect(accountText(credit)).toMatchObject({ lead: "$3.40 of $5.00 beta credit left.", note: expect.stringContaining("a few cents each") });
    expect(accountText({ ...credit, spent: 5_014_000 })).toMatchObject({ lead: "$0.00 of $5.00 beta credit left.", note: expect.stringContaining("keep checking") });
    expect(accountText({ kind: "credit", granted: 0, spent: 0 }).lead).toBe("Add your Claude API key to have Claude check your work.");
  });

  it("names the key in use by its last four characters, and the owner's by the site's", () => {
    expect(accountText({ kind: "own-key", hint: "wxyz" }).lead).toBe("Claude is paid for with your own API key, ending in wxyz.");
    expect(accountText({ kind: "owner" }).lead).toBe("Your calls to Claude go on the site's own key.");
  });
});
