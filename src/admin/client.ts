// The admin page's requests to the site's Worker, at /material on the site's
// own origin, with the admin key this browser was given. What the replies
// mean is in model.ts; this makes the requests and keeps the key.

import type { Command, Item, MaterialView } from "../recall/material.ts";
import { readItemReply, readViewReply, type Reply } from "./model.ts";

/** Where this browser keeps the admin key it was given. */
export const ADMIN_KEY_STORAGE = "triangle-lab:admin-key";

/** What the client needs from the browser, passed in so a test can stand in for it. */
export interface ClientDeps {
  /** Where the site is served from, with no trailing slash: the material is at `${url}/material`. */
  url: string;
  keys: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  fetch: typeof fetch;
}

export class AdminClient {
  /** A key given while storage was blocked, kept for as long as the page is open. */
  private memoryKey: string | null = null;

  constructor(private readonly deps: ClientDeps) {}

  key(): string | null {
    try {
      return this.deps.keys?.getItem(ADMIN_KEY_STORAGE) || this.memoryKey;
    } catch {
      return this.memoryKey;
    }
  }

  setKey(key: string): void {
    const text = key.trim();
    if (!text) return;
    try {
      this.deps.keys?.setItem(ADMIN_KEY_STORAGE, text);
    } catch {
      // Storage blocked: the key is lost on reload.
    }
    this.memoryKey = text;
  }

  forgetKey(): void {
    try {
      this.deps.keys?.removeItem(ADMIN_KEY_STORAGE);
    } catch {
      // Nothing kept to forget.
    }
    this.memoryKey = null;
  }

  /** The material, and the deck's questions it is written for. */
  async load(): Promise<Reply<MaterialView>> {
    return readViewReply(await this.request("GET"));
  }

  /** Change one piece of the material; answers with the piece as it now is. */
  async send(command: Command): Promise<Reply<Item>> {
    return readItemReply(await this.request("POST", command));
  }

  private async request(method: string, body?: unknown): Promise<{ status: number; body: unknown } | null> {
    const key = this.key();
    if (!key) return { status: 401, body: null };
    try {
      const response = await this.deps.fetch(`${this.deps.url}/material`, {
        method,
        headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    } catch {
      return null;
    }
  }
}

/** The page's client, with the browser's storage and fetch. */
export function openAdmin(): AdminClient {
  let keys: ClientDeps["keys"] = null;
  try {
    keys = typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    keys = null;
  }
  return new AdminClient({
    // The site's root, as built (vite.config.ts `base`).
    url: import.meta.env.BASE_URL.replace(/\/+$/, ""),
    keys,
    fetch: (input, init) => fetch(input, init),
  });
}
