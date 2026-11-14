// The Durable Object holding sign-ins (auth.ts): the sign-in links sent and
// not yet used, and the sessions made from them, each by the SHA-256 hash of
// its token, never the token itself. There is one, ACCOUNTS_NAME; requests
// reach it one at a time, so a link is only ever traded for one session.
//
// Who may sign in is not kept here but in the INVITES secret, checked on
// every request (auth.ts), so this holds nothing to manage by hand.
//
// It also keeps what paying for Claude needs (billing.ts): each learner's own
// Claude API key, if they saved one, encrypted (vault.ts), and how much beta
// credit they have spent; and how much beta credit everyone has spent in each
// month, which MONTHLY_CAP_USD caps.

import { DurableObject } from "cloudflare:workers";

/** There is one store of sign-ins. */
export const ACCOUNTS_NAME = "accounts";

/** A token's hash, as the store keys it. */
export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A new token: 32 random bytes, base64url. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** What the store keeps about a learner's paying for Claude: billing.ts `Ledger`, with their key still sealed. */
export interface KeptLedger {
  sealed: string | null;
  hint: string | null;
  spent: number;
  monthSpent: number;
}

export class Accounts extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS links (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)");
    // A row per learner who has saved a key or spent credit; spent in micros.
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS claude (email TEXT PRIMARY KEY, sealed TEXT, hint TEXT, spent INTEGER NOT NULL DEFAULT 0)");
    // Beta credit spent by everyone, by month ("2026-11"), in micros.
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS spending (month TEXT PRIMARY KEY, spent INTEGER NOT NULL)");
  }

  /** Keep a link sent to `email`, working until `expires` (ms). */
  addLink(hash: string, email: string, expires: number, now: number): void {
    this.prune(now);
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO links (hash, email, expires) VALUES (?, ?, ?)", hash, email, expires);
  }

  /** Use a link up: the email it was sent to, or null when it is spent, expired or never was. */
  redeemLink(hash: string, now: number): string | null {
    const [row] = this.ctx.storage.sql.exec<{ email: string; expires: number }>("SELECT email, expires FROM links WHERE hash = ?", hash).toArray();
    this.ctx.storage.sql.exec("DELETE FROM links WHERE hash = ?", hash);
    return row && row.expires > now ? row.email : null;
  }

  /** Keep a session for `email`, lasting until `expires` (ms). */
  addSession(hash: string, email: string, expires: number, now: number): void {
    this.prune(now);
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO sessions (hash, email, expires) VALUES (?, ?, ?)", hash, email, expires);
  }

  /** The email a session names, or null when there is none or it has run out. */
  sessionEmail(hash: string, now: number): string | null {
    const [row] = this.ctx.storage.sql.exec<{ email: string; expires: number }>("SELECT email, expires FROM sessions WHERE hash = ?", hash).toArray();
    return row && row.expires > now ? row.email : null;
  }

  endSession(hash: string): void {
    this.ctx.storage.sql.exec("DELETE FROM sessions WHERE hash = ?", hash);
  }

  /** What `email` has kept for paying for Claude, and what everyone has spent in `month`. */
  ledger(email: string, month: string): KeptLedger {
    const [row] = this.ctx.storage.sql.exec<{ sealed: string | null; hint: string | null; spent: number }>("SELECT sealed, hint, spent FROM claude WHERE email = ?", email).toArray();
    const [total] = this.ctx.storage.sql.exec<{ spent: number }>("SELECT spent FROM spending WHERE month = ?", month).toArray();
    return { sealed: row?.sealed ?? null, hint: row?.hint ?? null, spent: row?.spent ?? 0, monthSpent: total?.spent ?? 0 };
  }

  /** Keep `email`'s own Claude API key, `sealed` (vault.ts), ending in `hint`. */
  saveKey(email: string, sealed: string, hint: string): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO claude (email, sealed, hint) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET sealed = excluded.sealed, hint = excluded.hint",
      email,
      sealed,
      hint,
    );
  }

  /** Forget `email`'s own key; their calls come out of their beta credit again. */
  removeKey(email: string): void {
    this.ctx.storage.sql.exec("UPDATE claude SET sealed = NULL, hint = NULL WHERE email = ?", email);
  }

  /** Count `micros` of beta credit as spent by `email`, in `month`. */
  charge(email: string, micros: number, month: string): void {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("INSERT INTO claude (email, spent) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET spent = spent + excluded.spent", email, micros);
      this.ctx.storage.sql.exec("INSERT INTO spending (month, spent) VALUES (?, ?) ON CONFLICT (month) DO UPDATE SET spent = spent + excluded.spent", month, micros);
    });
  }

  private prune(now: number): void {
    this.ctx.storage.sql.exec("DELETE FROM links WHERE expires <= ?", now);
    this.ctx.storage.sql.exec("DELETE FROM sessions WHERE expires <= ?", now);
  }
}
