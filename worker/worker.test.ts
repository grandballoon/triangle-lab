// The site's Worker running for real, in the local Workers runtime, from
// wrangler.jsonc: pages served from its assets, signing in by email link, the
// recall deck's HTTP contract, a deck for each learner, the deck surviving the
// object being evicted, two devices syncing through it from the pages' own
// sync code, and answers checked and free associations read by a stand-in for
// the Claude API. Sign-in links are read from the mail the local runtime's
// email binding writes to disk, as a learner would open it.

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { createTestHarness, type TestHarness } from "wrangler";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addCard, editCard, EMPTY_DECK, newCard, removeCard, saveDeck, setExplanation, setWriting, type Deck } from "../src/recall/deck.ts";
import { RecallSync } from "../src/recall/remote.ts";
import { RecallStore } from "../src/recall/store.ts";
import { MAX_BODY } from "./rules.ts";

const OWNER = "owner@example.com";
const DEMO = "demo@example.com";
const SENDER = "signin@example.com";
const CLAUDE_KEY = "a-test-claude-key";
const ROOT = resolve(__dirname, "..");
const T0 = 1_700_000_000_000;
const card = (id: string, at = T0) => newCard(id, `Question ${id}?`, { lesson: "medians", step: 0, stepTitle: "" }, at)!;
const ids = (deck: { cards: { id: string }[] }) => deck.cards.map((c) => c.id);
const FROM_PAGE = { "X-Requested-With": "XMLHttpRequest" };

let harness: TestHarness;
let base: string;
/**
 * Where the harness runs: away from the project, so the developer's own
 * .dev.vars is not read, with an assets folder standing in for dist/,
 * which a test run may come before.
 */
let dir: string;
/** The owner's session cookie, signed in afresh for each test. */
let owner: string;

/** What the stand-in Claude API was asked, with its headers, and how it answers next. */
const claude = {
  asked: [] as { headers: Record<string, string | string[] | undefined>; body: Record<string, unknown> }[],
  status: 200,
  reply: { grade: "recalled", feedback: "Yes: the centroid." } as unknown,
  stop: "end_turn",
};
let claudeServer: Server;

/** The text of every sign-in email sent so far, by file. */
async function mailbox(): Promise<Map<string, string>> {
  const root = join(dir, ".wrangler", "tmp", "email");
  const files = (await readdir(root, { recursive: true }).catch(() => [] as string[])).filter((f) => f.includes("email-text") && f.endsWith(".txt"));
  return new Map(await Promise.all(files.map(async (f) => [f, await readFile(join(root, f), "utf8")] as const)));
}

/** Ask for a sign-in link for `email`, and the link in the email that comes, or null when none does. */
async function linkFor(email: string): Promise<string | null> {
  const before = await mailbox();
  const asked = await fetch(`${base}/auth/link`, { method: "POST", headers: FROM_PAGE, body: JSON.stringify({ email }) });
  expect(asked.status).toBe(202);
  // The binding writes the mail out just after answering.
  for (let i = 0; i < 40; i++) {
    const fresh = [...(await mailbox())].filter(([f]) => !before.has(f));
    if (fresh.length) return /https?:\/\/\S+/.exec(fresh[0][1])?.[0] ?? null;
    await new Promise((done) => setTimeout(done, 25));
  }
  return null;
}

/** Trade a sign-in link for a session, as signin.html does: the reply. */
function redeem(link: string): Promise<Response> {
  const token = new URL(link).searchParams.get("token");
  return fetch(`${base}/auth/session`, { method: "POST", headers: FROM_PAGE, body: JSON.stringify({ token }) });
}

/** Sign `email` in by email link: the session cookie, as the browser would send it. */
async function signIn(email: string): Promise<string> {
  const link = await linkFor(email);
  expect(link).not.toBeNull();
  const session = await redeem(link!);
  expect(session.status).toBe(200);
  return session.headers.get("Set-Cookie")!.split(";")[0];
}

beforeAll(async () => {
  claudeServer = createServer((req, res) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      claude.asked.push({ headers: req.headers, body: JSON.parse(text) });
      res.writeHead(claude.status, { "Content-Type": "application/json" });
      if (claude.status !== 200) {
        res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid API key" } }));
        return;
      }
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify(claude.reply) }],
          stop_reason: claude.stop,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((done) => claudeServer.listen(0, "127.0.0.1", done));
  const claudeUrl = `http://127.0.0.1:${(claudeServer.address() as AddressInfo).port}`;

  dir = await mkdtemp(join(tmpdir(), "triangle-lab-worker-"));
  const assets = join(dir, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "index.html"), "<title>Lessons</title>");
  await writeFile(join(assets, "recall.html"), "<title>Recall</title>");
  // The secrets wrangler.jsonc requires, as the developer's own .dev.vars gives them.
  await writeFile(join(dir, ".dev.vars"), `ANTHROPIC_API_KEY=${CLAUDE_KEY}\nOWNER_EMAIL=${OWNER}\nINVITES=${DEMO}, friend@example.com\n`);
  // The real configuration, with only the assets, where Claude is, and the sender swapped in.
  const path = join(ROOT, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(path, await readFile(path, "utf8"));
  if (error) throw new Error(String(error.messageText));
  harness = createTestHarness({
    root: dir,
    workers: [
      {
        config: {
          ...config,
          main: join(ROOT, config.main),
          assets: { ...config.assets, directory: assets },
          vars: { ...config.vars, ANTHROPIC_BASE_URL: claudeUrl, SENDER },
        },
      },
    ],
  });
  await harness.listen();
}, 60_000);

beforeEach(async () => {
  Object.assign(claude, { asked: [], status: 200, reply: { grade: "recalled", feedback: "Yes: the centroid." }, stop: "end_turn" });
  await harness.reset();
  base = (await harness.listen()).url.href.replace(/\/$/, "");
  owner = await signIn(OWNER);
});

afterAll(async () => {
  await harness?.close();
  await new Promise((done) => claudeServer?.close(done));
  await rm(dir, { recursive: true, force: true });
});

const call = (method: string, body?: unknown, headers: Record<string, string> = {}, path = "/deck") =>
  fetch(`${base}${path}`, {
    method,
    headers: { ...FROM_PAGE, Cookie: owner, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

describe("the site", () => {
  it("serves the pages from its assets, and the deck beside them", async () => {
    expect(await (await fetch(`${base}/`)).text()).toBe("<title>Lessons</title>");
    expect(await (await fetch(`${base}/recall`)).text()).toBe("<title>Recall</title>");
    expect((await fetch(`${base}/nowhere.html`)).status).toBe(404);
    expect((await call("GET")).status).toBe(200);
  });
});

describe("signing in", () => {
  it("emails an invited address a link to the sign-in page, which trades it for a session once", async () => {
    const link = await linkFor(DEMO);
    expect(link).toMatch(new RegExp(`^${base}/signin\\.html\\?token=[A-Za-z0-9_-]{43}$`));
    const first = await redeem(link!);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ email: DEMO });
    expect(first.headers.get("Set-Cookie")).toMatch(/^session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
    const again = await redeem(link!);
    expect(again.status).toBe(400);
    expect((await again.json()).error).toContain("expired or has been used");
  });

  it("sends nothing to an address not invited, and answers just the same", async () => {
    expect(await linkFor("stranger@example.com")).toBeNull();
  });

  it("says who is signed in, and signs out, after which the session opens nothing", async () => {
    const who = await fetch(`${base}/auth/session`, { headers: { ...FROM_PAGE, Cookie: owner } });
    expect(await who.json()).toEqual({ email: OWNER });
    const out = await fetch(`${base}/auth/session`, { method: "DELETE", headers: { ...FROM_PAGE, Cookie: owner } });
    expect(out.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await fetch(`${base}/auth/session`, { headers: { ...FROM_PAGE, Cookie: owner } })).status).toBe(401);
    expect((await call("GET")).status).toBe(401);
  });

  it("lets nothing reach the deck or Claude without a session", async () => {
    for (const cookie of ["", "session=" + "x".repeat(43), "session=forged"]) {
      expect((await call("GET", undefined, { Cookie: cookie })).status, cookie).toBe(401);
      for (const path of ["/check", "/associate", "/explain"]) {
        expect((await call("POST", {}, { Cookie: cookie }, path)).status, path).toBe(401);
      }
    }
    expect(claude.asked).toEqual([]);
  });

  it("refuses requests no page of the site made, so another site cannot use a learner's session", async () => {
    expect((await fetch(`${base}/deck`, { headers: { Cookie: owner } })).status).toBe(403);
    expect((await fetch(`${base}/auth/link`, { method: "POST", body: JSON.stringify({ email: DEMO }) })).status).toBe(403);
  });

  it("sends at most 3 links a minute to one address", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await fetch(`${base}/auth/link`, { method: "POST", headers: FROM_PAGE, body: JSON.stringify({ email: "friend@example.com" }) })).status);
    }
    expect(statuses).toEqual([202, 202, 202, 429]);
  });
});

describe("the recall deck", () => {
  it("merges each deck sent into the one it holds, and answers with the result", async () => {
    expect(await (await call("GET")).json()).toEqual(saveDeck(EMPTY_DECK));
    const stale: Deck = { cards: [card("a"), card("b", T0 + 1)], removed: [] };
    const first = await call("POST", saveDeck(stale));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(saveDeck(stale));

    // A device changes the deck; another, which has not heard, sends its older copy.
    const later = removeCard(editCard(stale, "a", "Reworded?", T0 + 5), "b", T0 + 6);
    await call("POST", saveDeck(later));
    const held = await (await call("POST", saveDeck(stale))).json();
    expect(held).toEqual(saveDeck(later));
    expect(later.removed).toEqual([{ id: "b", at: T0 + 6 }]);
  });

  it("keeps the deck when the object is evicted", async () => {
    await call("POST", saveDeck({ cards: [card("kept")], removed: [] }));
    await harness.getWorker().evictDurableObject("RecallDeck", { name: "deck" });
    expect(ids(await (await call("GET")).json())).toEqual(["kept"]);
  });

  it("refuses a caller who is not signed in", async () => {
    const response = await call("POST", saveDeck({ cards: [card("x")], removed: [] }), { Cookie: "" });
    expect(response.status).toBe(401);
    expect(ids(await (await call("GET")).json())).toEqual([]);
  });

  it("refuses what is not a deck", async () => {
    expect((await call("POST", "{not json")).status).toBe(400);
    expect((await call("POST", { cards: [] })).status).toBe(400);
  });

  it("refuses a change dated well ahead of its clock, which would win every merge", async () => {
    const ahead = await call("POST", saveDeck({ cards: [card("future", Date.now() + 365 * 86_400_000)], removed: [] }));
    expect(ahead.status).toBe(400);
    expect((await ahead.json()).error).toContain("dated in the future");
    expect(ids(await (await call("GET")).json())).toEqual([]);
    expect((await call("POST", saveDeck({ cards: [card("now", Date.now())], removed: [] }))).status).toBe(200);
  });

  it("refuses a deck too large to take", async () => {
    const response = await call("POST", "x".repeat(MAX_BODY + 1));
    expect(response.status).toBe(413);
  });

  it("slows a caller making too many requests, signed in or not", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 70; i++) {
      statuses.push((await call("GET", undefined, { Cookie: "" })).status);
    }
    expect(statuses.slice(0, 55).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

});

describe("checking an answer", () => {
  const request = { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2", answer: "At the centroid" };
  const check = (body: unknown = request, headers: Record<string, string> = {}) => call("POST", body, headers, "/check");

  it("asks Claude with the Worker's key, and answers with its verdict", async () => {
    const response = await check();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ grade: "recalled", feedback: "Yes: the centroid." });
    expect(claude.asked).toHaveLength(1);
    const [{ headers, body }] = claude.asked;
    expect(headers.authorization).toBe(`Bearer ${CLAUDE_KEY}`);
    expect(headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(body).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default" });
    expect(JSON.stringify(body.messages)).toContain("At the centroid");
  });

  it("refuses a caller not signed in, and what is not an answer, without asking Claude", async () => {
    expect((await check(request, { Cookie: "" })).status).toBe(401);
    expect((await check({ ...request, answer: "" })).status).toBe(400);
    expect((await check("{not json")).status).toBe(400);
    expect(claude.asked).toEqual([]);
  });

  it("says why there is no verdict when Claude declines or turns the Worker's key down", async () => {
    claude.stop = "refusal";
    claude.reply = "";
    const declined = await check();
    expect(declined.status).toBe(502);
    expect((await declined.json()).error).toContain("declined");

    claude.status = 401;
    const turnedDown = await check();
    expect(turnedDown.status).toBe(502);
    expect((await turnedDown.json()).error).toContain("ANTHROPIC_API_KEY");
  });

  it("checks at most 10 answers a minute from one caller", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await check()).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    expect(claude.asked.length).toBeLessThanOrEqual(11);
  });
});

describe("reading a free association", () => {
  const request = { text: "Medians meet at the incentre.", noted: ["medians"] };
  const associate = (body: unknown = request, headers: Record<string, string> = {}) => call("POST", body, headers, "/associate");
  const reading = {
    remarks: [{ quote: "the incentre", note: "The centroid.", lesson: "medians" }],
    feedback: "You know where the centres are, mostly.",
    next: [{ lesson: "bisectors", why: "It builds on the medians." }],
  };

  it("asks Claude with the Worker's key and the course, and answers with its reading", async () => {
    claude.reply = reading;
    const response = await associate();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reading);
    expect(claude.asked).toHaveLength(1);
    const [{ headers, body }] = claude.asked;
    expect(headers.authorization).toBe(`Bearer ${CLAUDE_KEY}`);
    expect(body).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default" });
    expect(JSON.stringify(body.system)).toContain("- medians: Medians (");
    expect(JSON.stringify(body.messages)).toContain("Medians meet at the incentre.");
  });

  it("refuses a caller not signed in, and nothing to read, without asking Claude", async () => {
    expect((await associate(request, { Cookie: "" })).status).toBe(401);
    expect((await associate({ ...request, text: " " })).status).toBe(400);
    expect((await associate("{not json")).status).toBe(400);
    expect(claude.asked).toEqual([]);
  });

  it("says why there is no reading when Claude declines", async () => {
    claude.stop = "refusal";
    claude.reply = "";
    const declined = await associate();
    expect(declined.status).toBe(502);
    expect((await declined.json()).error).toContain("declined");
  });
});

describe("checking an explanation", () => {
  const request = { lesson: "medians", step: "Step 2: Find the centroid", text: "The medians meet at the incentre." };
  const explain = (body: unknown = request, headers: Record<string, string> = {}) => call("POST", body, headers, "/explain");

  it("asks Claude with the lesson and the explanation, and answers with its verdict", async () => {
    claude.reply = { grade: "shaky", feedback: "Nearly.", remarks: [{ quote: "incentre", note: "The centroid." }] };
    const response = await explain();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(claude.reply);
    expect(claude.asked).toHaveLength(1);
    const content = JSON.stringify(claude.asked[0].body.messages);
    expect(content).toContain("Medians (");
    expect(content).toContain("Step 2: Find the centroid");
    expect(content).toContain("The medians meet at the incentre.");
  });

  it("refuses a caller not signed in, and nothing to check, without asking Claude", async () => {
    expect((await explain(request, { Cookie: "" })).status).toBe(401);
    expect((await explain({ ...request, text: " " })).status).toBe(400);
    expect((await explain({ ...request, lesson: "nowhere" })).status).toBe(400);
    expect(claude.asked).toEqual([]);
  });

  it("says why there is no check when Claude declines", async () => {
    claude.stop = "refusal";
    claude.reply = "";
    const declined = await explain();
    expect(declined.status).toBe(502);
    expect((await declined.json()).error).toBe("Claude declined to check this explanation.");
  });
});

describe("a deck for each learner", () => {
  it("gives an invited demo account an empty deck of its own, leaving the owner's alone", async () => {
    await call("POST", saveDeck(addCard(EMPTY_DECK, card("mine"))));
    const demo = await signIn(DEMO);

    expect(ids(await (await call("GET", undefined, { Cookie: demo })).json())).toEqual([]);
    expect(ids(await (await call("POST", saveDeck(addCard(EMPTY_DECK, card("theirs"))), { Cookie: demo })).json())).toEqual(["theirs"]);
    expect(ids(await (await call("GET")).json())).toEqual(["mine"]);
    await harness.getWorker().evictDurableObject("RecallDeck", { name: `learner:${DEMO}` });
    expect(ids(await (await call("GET", undefined, { Cookie: demo })).json())).toEqual(["theirs"]);
  });
});

describe("two devices syncing through the Worker", () => {
  /** A device: its own browser storage, syncing as a page does. */
  function device() {
    const data: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
      removeItem: (k: string) => void delete data[k],
    };
    const store = new RecallStore(storage, null);
    const sync = new RecallSync(store, {
      url: base,
      // The browser sends the signed-in learner's session cookie with every request.
      fetch: (input, init) => fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: owner } }),
      now: () => Date.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (t) => clearTimeout(t),
      setInterval: () => undefined,
      events: null,
      doc: null,
      visible: () => true,
    });
    return { store, sync };
  }

  it("ends with the same deck on both, questions noted, answered and removed on either", async () => {
    const phone = device();
    const laptop = device();
    phone.store.update((d) => addCard(addCard(d, card("a")), card("b", T0 + 1)));
    await phone.sync.sync();
    laptop.store.update((d) => addCard(d, card("c", T0 + 2)));
    await laptop.sync.sync();
    expect(ids(laptop.store.get())).toEqual(["a", "b", "c"]);

    laptop.store.update((d) => removeCard(d, "a", T0 + 3));
    phone.store.update((d) => editCard(d, "b", "Asked on the phone?", T0 + 4));
    await laptop.sync.sync();
    await phone.sync.sync();
    await laptop.sync.sync();

    expect(phone.store.get()).toEqual(laptop.store.get());
    expect(ids(phone.store.get())).toEqual(["b", "c"]);
    expect(phone.store.get().cards[0].question).toBe("Asked on the phone?");
    expect(laptop.sync.get()).toMatchObject({ kind: "synced" });
  });

  it("ends with the free association last changed on either, kept when the object is evicted", async () => {
    const phone = device();
    const laptop = device();
    const reading = { feedback: "Good.", remarks: [], next: [{ lesson: "bisectors", why: "Next." }] };
    phone.store.update((d) => setWriting(d, { text: "Medians", read: { text: "Medians", reading }, updated: T0 + 1 }));
    await phone.sync.sync();
    await laptop.sync.sync();
    expect(laptop.store.get().writing).toEqual(phone.store.get().writing);

    laptop.store.update((d) => setWriting(d, { text: "Medians meet at G", read: null, updated: T0 + 2 }));
    phone.store.update((d) => addCard(d, card("p", T0 + 3)));
    await laptop.sync.sync();
    await harness.getWorker().evictDurableObject("RecallDeck", { name: "deck" });
    await phone.sync.sync();

    expect(phone.store.get().writing).toEqual({ text: "Medians meet at G", read: null, updated: T0 + 2 });
    expect(ids(phone.store.get())).toEqual(["p"]);
  });

  it("ends with each lesson's explanation last changed on either, kept when the object is evicted", async () => {
    const phone = device();
    const laptop = device();
    const verdict = { grade: "shaky" as const, feedback: "Nearly." };
    phone.store.update((d) => setExplanation(d, { lesson: "medians", text: "Medians", checked: { text: "Medians", verdict }, updated: T0 + 1 }));
    phone.store.update((d) => setExplanation(d, { lesson: "altitudes", text: "Altitudes", checked: null, updated: T0 + 1 }));
    await phone.sync.sync();
    await laptop.sync.sync();
    expect(laptop.store.get().explanations).toEqual(phone.store.get().explanations);

    laptop.store.update((d) => setExplanation(d, { lesson: "medians", text: "Medians meet at G", checked: null, updated: T0 + 2 }));
    await laptop.sync.sync();
    await harness.getWorker().evictDurableObject("RecallDeck", { name: "deck" });
    await phone.sync.sync();

    expect(phone.store.get().explanations).toEqual([
      { lesson: "altitudes", text: "Altitudes", checked: null, updated: T0 + 1 },
      { lesson: "medians", text: "Medians meet at G", checked: null, updated: T0 + 2 },
    ]);
  });
});
