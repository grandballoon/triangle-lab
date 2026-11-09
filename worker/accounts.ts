// The Durable Object holding sign-ins (auth.ts): the sign-in links sent and
// not yet used, and the sessions made from them, each by the SHA-256 hash of
// its token, never the token itself. There is one, ACCOUNTS_NAME; requests
// reach it one at a time, so a link is only ever traded for one session.
//
// Who may sign in is not kept here but in the INVITES secret, checked on
// every request (auth.ts), so this holds nothing to manage by hand.

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

export class Accounts extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS links (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)");
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

  private prune(now: number): void {
    this.ctx.storage.sql.exec("DELETE FROM links WHERE expires <= ?", now);
    this.ctx.storage.sql.exec("DELETE FROM sessions WHERE expires <= ?", now);
  }
}
