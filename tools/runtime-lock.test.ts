import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { holdRuntime, parseHolder, turnFor } from "./runtime-lock.ts";

const OTHER = { pid: 4242, cwd: "/elsewhere" };

describe("whose turn it is", () => {
  it("waits for a live holder", () => {
    expect(turnFor(OTHER, 1, true)).toEqual({ kind: "wait", holder: OTHER });
  });

  it("clears the lock of a holder that has died", () => {
    expect(turnFor(OTHER, 1, false)).toEqual({ kind: "clear" });
  });

  it("clears a lock left under its own process id", () => {
    expect(turnFor(OTHER, OTHER.pid, true)).toEqual({ kind: "clear" });
  });

  it("tries again when the lock could not be read", () => {
    expect(turnFor(null, 1, false)).toEqual({ kind: "retry" });
  });
});

describe("reading the lock", () => {
  it("reads a holder", () => {
    expect(parseHolder(JSON.stringify(OTHER))).toEqual(OTHER);
  });

  it("reads nothing from a missing, garbled or partial lock", () => {
    expect(parseHolder(null)).toBeNull();
    expect(parseHolder("{")).toBeNull();
    expect(parseHolder(JSON.stringify({ pid: "4242", cwd: "/" }))).toBeNull();
    expect(parseHolder(JSON.stringify({ pid: 4242 }))).toBeNull();
  });
});

describe("holding the runtime", () => {
  let dir: string;
  let path: string;
  const quiet = () => {};

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "runtime-lock-"));
    path = join(dir, "lock");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("takes a free lock, records itself, and gives it back", async () => {
    const release = await holdRuntime({ path, log: quiet });
    expect(parseHolder(await readFile(path, "utf8"))).toEqual({ pid: process.pid, cwd: process.cwd() });
    await release();
    await expect(readFile(path)).rejects.toThrow();
  });

  it("waits for a live holder to let go", async () => {
    // A live process other than this one, holding the lock.
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"]);
    try {
      await writeFile(path, JSON.stringify({ pid: child.pid, cwd: "/elsewhere" }));
      const said: string[] = [];
      let taken = false;
      const holding = holdRuntime({ path, pollMs: 10, log: (line) => said.push(line) }).then((release) => {
        taken = true;
        return release;
      });
      await new Promise((done) => setTimeout(done, 100));
      expect(taken).toBe(false);
      expect(said).toEqual([`Waiting for the local Workers runtime, in use by process ${child.pid} in /elsewhere`]);
      child.kill();
      await (await holding)();
      expect(taken).toBe(true);
    } finally {
      child.kill();
    }
  });

  it("takes over the lock of a holder that has died", async () => {
    const child = spawn(process.execPath, ["-e", ""]);
    await new Promise((done) => child.on("exit", done));
    await writeFile(path, JSON.stringify({ pid: child.pid, cwd: "/elsewhere" }));
    const release = await holdRuntime({ path, pollMs: 10, log: quiet });
    expect(parseHolder(await readFile(path, "utf8"))?.pid).toBe(process.pid);
    await release();
  });

  it("does not give back a lock someone else has taken since", async () => {
    const release = await holdRuntime({ path, log: quiet });
    await writeFile(path, JSON.stringify(OTHER));
    await release();
    expect(parseHolder(await readFile(path, "utf8"))).toEqual(OTHER);
  });
});
