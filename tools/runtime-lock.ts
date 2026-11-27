// One local Workers runtime at a time on this machine. Each test file that
// runs the Worker for real (worker/*.test.ts) starts workerd and esbuild
// through wrangler's test harness, close to half a gigabyte, and every agent
// worktree runs the whole suite: a handful of sessions testing at once used to
// swap an 8 GB laptop to a crawl. The lock is a file in the system's temporary
// directory, so it is shared by every checkout and worktree of the project;
// a test file takes it before starting the runtime and gives it back once the
// runtime is closed, and the others wait their turn.
//
// The lock only bounds memory. Each runtime has its own directory and ports,
// so if two ever ran at once (a race while clearing a dead holder's lock) the
// tests would still pass, only slower.
//
// The decision is pure (turnFor); holdRuntime is the shell around it that
// touches the file system, polls and logs.

import { link, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Who holds the lock, as its file records it. */
export interface Holder {
  pid: number;
  /** The checkout the holder runs in, to say who is being waited on. */
  cwd: string;
}

/** What to do about a lock someone already has. */
export type Turn = { kind: "wait"; holder: Holder } | { kind: "clear" } | { kind: "retry" };

/**
 * The next step for process `self`, given the lock's current holder (null if
 * its file could not be read: released or still being cleared since the
 * attempt to take it) and whether the holder's process is alive.
 *
 * A lock held under our own process id is a leftover: test files in one
 * process run one after another, so none of ours can still be using it.
 */
export function turnFor(holder: Holder | null, self: number, alive: boolean): Turn {
  if (holder === null) return { kind: "retry" };
  if (holder.pid === self || !alive) return { kind: "clear" };
  return { kind: "wait", holder };
}

/** The lock's contents, or null if they are missing or not a holder. */
export function parseHolder(text: string | null): Holder | null {
  if (text === null) return null;
  try {
    const value = JSON.parse(text) as Partial<Holder>;
    return Number.isInteger(value.pid) && typeof value.cwd === "string" ? { pid: value.pid!, cwd: value.cwd } : null;
  } catch {
    return null;
  }
}

export const RUNTIME_LOCK = join(tmpdir(), "triangle-lab-worker-runtime.lock");

/** How long a test file may wait for the runtime: several sessions' turns. */
export const RUNTIME_WAIT = 20 * 60_000;

export interface HoldOptions {
  path?: string;
  pollMs?: number;
  log?: (line: string) => void;
}

/**
 * Wait for the lock, take it, and return the function that gives it back.
 * Taking it is one atomic step: the holder is written to a file of our own,
 * which is then hard-linked to the lock's path, failing if the lock exists.
 */
export async function holdRuntime({ path = RUNTIME_LOCK, pollMs = 1000, log = say }: HoldOptions = {}): Promise<() => Promise<void>> {
  const self: Holder = { pid: process.pid, cwd: process.cwd() };
  const mine = `${path}.${self.pid}`;
  await writeFile(mine, JSON.stringify(self));
  let waitingOn: number | null = null;
  try {
    for (;;) {
      try {
        await link(mine, path);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      const holder = parseHolder(await readFile(path, "utf8").catch(() => null));
      const turn = turnFor(holder, self.pid, holder !== null && isAlive(holder.pid));
      if (turn.kind === "clear") {
        await unlink(path).catch(() => {});
      } else if (turn.kind === "wait") {
        if (waitingOn !== turn.holder.pid) {
          waitingOn = turn.holder.pid;
          log(`Waiting for the local Workers runtime, in use by process ${turn.holder.pid} in ${turn.holder.cwd}`);
        }
        await new Promise((done) => setTimeout(done, pollMs));
      }
    }
  } finally {
    await unlink(mine).catch(() => {});
  }
  return async () => {
    const holder = parseHolder(await readFile(path, "utf8").catch(() => null));
    if (holder?.pid === self.pid) await unlink(path).catch(() => {});
  };
}

/** Straight to stderr: Vitest keeps a passing test's console output to itself. */
function say(line: string): void {
  process.stderr.write(`${line}\n`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: alive, but another user's.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
