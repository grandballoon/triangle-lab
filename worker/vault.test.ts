// Learners' own Claude API keys, encrypted for keeping.

import { describe, expect, it } from "vitest";
import { open, seal, vaultKey } from "./vault.ts";

const SECRET = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const OTHER = btoa(String.fromCharCode(...new Uint8Array(32).fill(8)));
const API_KEY = `sk-ant-api03-${"a".repeat(40)}`;

describe("the vault", () => {
  it("opens a sealed key again for the learner it was sealed for", async () => {
    const key = (await vaultKey(SECRET))!;
    const sealed = await seal(key, "demo@example.com", API_KEY);
    expect(sealed).not.toContain(API_KEY);
    expect(await open(key, "demo@example.com", sealed)).toBe(API_KEY);
  });

  it("seals the same key differently each time", async () => {
    const key = (await vaultKey(SECRET))!;
    expect(await seal(key, "demo@example.com", API_KEY)).not.toBe(await seal(key, "demo@example.com", API_KEY));
  });

  it("will not open a key for another learner, with another VAULT_KEY, or once altered", async () => {
    const key = (await vaultKey(SECRET))!;
    const sealed = await seal(key, "demo@example.com", API_KEY);
    expect(await open(key, "other@example.com", sealed)).toBeNull();
    expect(await open((await vaultKey(OTHER))!, "demo@example.com", sealed)).toBeNull();
    const altered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await open(key, "demo@example.com", altered)).toBeNull();
    expect(await open(key, "demo@example.com", "not base64!")).toBeNull();
  });

  it("takes only 32 bytes of base64 as VAULT_KEY", async () => {
    expect(await vaultKey(undefined)).toBeNull();
    expect(await vaultKey("")).toBeNull();
    expect(await vaultKey(btoa("too short"))).toBeNull();
    expect(await vaultKey(`  ${SECRET}\n`)).not.toBeNull();
  });
});
