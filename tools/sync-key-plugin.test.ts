// The dev sync key plugin: reading the key from .dev.vars, the script that
// keeps it, and every page on a real dev server getting that script.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SYNC_KEY_STORAGE } from "../src/recall/remote.ts";
import { devSyncKey, devVar, keyScript } from "./sync-key-plugin.ts";

describe("devVar", () => {
  it("reads a value as wrangler does, quoted or not, past comments and other names", () => {
    const text = "# the sync key\nOTHER=1\nRECALL_KEY=abc+/=\r\n";
    expect(devVar(text, "RECALL_KEY")).toBe("abc+/=");
    expect(devVar(`RECALL_KEY="a b"`, "RECALL_KEY")).toBe("a b");
    expect(devVar("RECALL_KEY = 'x' ", "RECALL_KEY")).toBe("x");
    expect(devVar("export RECALL_KEY=y", "RECALL_KEY")).toBe("y");
  });

  it("is null for a name the file does not give", () => {
    expect(devVar("RECALL_KEYS=no\n# RECALL_KEY=no", "RECALL_KEY")).toBeNull();
    expect(devVar("", "RECALL_KEY")).toBeNull();
  });
});

describe("keyScript", () => {
  it("keeps the key under the page's own storage name", () => {
    const kept: Record<string, string> = {};
    const localStorage = { setItem: (k: string, v: string) => void (kept[k] = v) };
    new Function("localStorage", keyScript("k</script>ey"))(localStorage);
    expect(kept).toEqual({ [SYNC_KEY_STORAGE]: "k</script>ey" });
    expect(keyScript("k</script>ey")).not.toContain("</script>");
  });

  it("does nothing where storage is blocked", () => {
    const localStorage = {
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => new Function("localStorage", keyScript("key"))(localStorage)).not.toThrow();
  });
});

describe("on the dev server", () => {
  let server: ViteDevServer;
  let dir: string;
  let file: string;
  let base: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "dev-sync-key-"));
    file = join(dir, ".dev.vars");
    server = await createServer({
      configFile: false,
      root: resolve(__dirname, ".."),
      logLevel: "silent",
      plugins: [devSyncKey(file)],
      server: { host: "127.0.0.1", port: 0 },
    });
    await server.listen();
    base = server.resolvedUrls!.local[0].replace(/\/$/, "");
  });

  afterAll(async () => {
    await server?.close();
    await rm(dir, { recursive: true, force: true });
  });

  const page = async (path: string) => (await fetch(`${base}${path}`)).text();

  it("gives every page the key, before its own scripts, as the file has it now", async () => {
    await writeFile(file, "RECALL_KEY=first-key\n");
    const recall = await page("/recall.html");
    expect(recall).toContain(keyScript("first-key"));
    expect(recall.indexOf(keyScript("first-key"))).toBeLessThan(recall.indexOf('type="module"'));
    expect(await page("/")).toContain(keyScript("first-key"));

    await writeFile(file, "RECALL_KEY=second-key\n");
    expect(await page("/recall.html")).toContain(keyScript("second-key"));
  });

  it("leaves pages as they are with no key to give", async () => {
    await rm(file, { force: true });
    expect(await page("/recall.html")).not.toContain(SYNC_KEY_STORAGE);
  });
});
