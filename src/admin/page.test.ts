// @vitest-environment jsdom
//
// The admin page as the course's author uses it, against a DOM stand-in and
// a stand-in Worker: giving the admin key, and writing, refining, editing
// and restoring reference answers, key facts and the house style.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { courseLesson } from "../course/course.ts";
import {
  DEFAULT_STYLE,
  factBasis,
  readCommand,
  referenceBasis,
  targetKey,
  versionFor,
  withVersion,
  type Command,
  type Item,
  type MaterialView,
} from "../recall/material.ts";
import { ADMIN_KEY_STORAGE } from "./client.ts";

const KEY = "an-admin-key-long-enough-to-be-served";
const medians = courseLesson("medians")!;

/**
 * The site's Worker: the material it holds, the deck's questions, and the
 * commands it was sent. Claude's writing is `written`; a change waits for
 * `release` while `hold` is set, so the page can be seen while it waits.
 */
interface Stand {
  view: MaterialView;
  commands: Command[];
  authorizations: string[];
  written: (command: Command) => string;
  status: number;
  hold: boolean;
  release: () => void;
}

let stand: Stand;

function worker(view: Partial<MaterialView> = {}): Stand {
  stand = {
    view: { items: {}, cards: [], ...view },
    commands: [],
    authorizations: [],
    written: (c) => (c.kind === "refine" ? `Refined: ${c.instruction}` : "The medians meet at the centroid, $G$."),
    status: 200,
    hold: false,
    release: () => undefined,
  };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    expect(url).toBe("/material");
    stand.authorizations.push((init.headers as Record<string, string>).Authorization);
    if ((init.headers as Record<string, string>).Authorization !== `Bearer ${KEY}`) return reply(401, { error: "That key is not the admin key." });
    if (init.method === "GET") return reply(200, stand.view);
    const command = readCommand(JSON.parse(init.body as string))!;
    stand.commands.push(command);
    if (stand.hold) await new Promise<void>((done) => (stand.release = done));
    if (stand.status !== 200) return reply(stand.status, { error: "Claude declined to write this." });
    const key = targetKey(command.target);
    const held = stand.view.items[key];
    const basis =
      command.target.kind === "fact"
        ? factBasis(courseLesson(command.target.lesson)!.steps[command.target.step]!)
        : command.target.kind === "reference"
          ? referenceBasis(stand.view.cards.find((c) => c.id === (command.target as { card: string }).card)!.question)
          : "";
    const version = versionFor(command, held, Date.now(), stand.written(command))!;
    const item = withVersion(held, basis, version);
    stand.view = { ...stand.view, items: { ...stand.view.items, [key]: item } };
    return reply(200, item);
  });
  return stand;
}

const reply = (status: number, body: unknown) => ({ status, json: async () => body }) as Response;

async function open(hash = "", key: string | null = KEY): Promise<HTMLElement> {
  localStorage.clear();
  if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  history.replaceState(null, "", `/admin${hash}`);
  document.body.innerHTML = `<main id="admin"></main>`;
  vi.resetModules();
  await import("./page.ts");
  await settle();
  return document.getElementById("admin")!;
}

/** Let the stand-in Worker's replies arrive and the page render them. */
const settle = () => new Promise((done) => setTimeout(done, 0));

const buttonNamed = (root: HTMLElement, text: string, within: ParentNode = root): HTMLButtonElement =>
  [...within.querySelectorAll("button")].find((b) => b.textContent?.startsWith(text))!;

const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".ad-item")];

function type(box: HTMLTextAreaElement, text: string): void {
  box.value = text;
  box.dispatchEvent(new Event("input"));
}

const card = (id: string, question: string, step = 1) => ({ id, question, lesson: "medians", step, stepTitle: medians.steps[step]!.title });

const item = (text: string, basis: string, at = 1): Item => ({ basis, versions: [{ text, at, origin: "written" }] });

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("the admin page", () => {
  it("asks for the admin key, keeps it, and opens the answer key with it", async () => {
    worker();
    const root = await open("", null);
    expect(root.querySelector(".rc-lead")!.textContent).toBe("This page needs the admin key.");
    expect(stand.authorizations).toEqual([]);

    const input = root.querySelector<HTMLInputElement>(".rc-key-input")!;
    input.value = "wrong";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await settle();
    expect(root.querySelector(".rc-lead")!.textContent).toBe("That key wasn't taken.");

    root.querySelector<HTMLInputElement>(".rc-key-input")!.value = KEY;
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await settle();
    expect(localStorage.getItem(ADMIN_KEY_STORAGE)).toBe(KEY);
    expect(root.querySelector(".ad-tab[aria-current]")!.textContent).toBe("Reference answers");
  });

  it("says why the answer key didn't load, and tries again", async () => {
    worker();
    vi.stubGlobal("fetch", async () => reply(503, { error: "The Worker's ADMIN_KEY is missing." }));
    const root = await open();
    expect(root.querySelector(".rc-note")!.textContent).toBe("The Worker's ADMIN_KEY is missing.");
    worker();
    buttonNamed(root, "Try again").click();
    await settle();
    expect(root.querySelector(".ad-tabs")).not.toBeNull();
  });
});

describe("reference answers", () => {
  it("lists each question with its reference answer, or none yet, marking a stale one", async () => {
    worker({
      cards: [card("a", "Where do the medians meet?"), card("b", "Why two to one?", 2)],
      items: { "reference:b": item("Because $AG = 2GM$.", "Why 2:1?") },
    });
    const root = await open();
    expect(root.querySelector(".ad-tab[href='#references'] .ad-count")!.textContent).toBe("1");
    expect(root.querySelector(".rc-group h2")!.textContent).toBe("Triangles · " + medians.name);
    const [a, b] = items(root);
    expect(a.querySelector(".ad-question")!.textContent).toBe("Where do the medians meet?");
    expect(a.querySelector(".ad-where a")!.getAttribute("href")).toBe("medians.html#step-2");
    expect(a.querySelector(".ad-text")!.textContent).toBe("No reference answer yet.");
    expect(a.dataset.standing).toBe("missing");
    expect(b.dataset.standing).toBe("stale");
    expect(b.querySelector(".ad-stale")!.textContent).toBe("Written for an earlier wording of the question.");
    expect(b.querySelector(".ad-text .katex")).not.toBeNull();
    expect(b.querySelector(".ad-version")!.textContent).toMatch(/^Version 1 · Written by Claude · /);
  });

  it("has Claude write one, saying so while it does", async () => {
    worker({ cards: [card("a", "Where do the medians meet?")] });
    stand.hold = true;
    const root = await open();
    buttonNamed(root, "Write").click();
    await settle();
    expect(stand.commands).toEqual([{ kind: "write", target: { kind: "reference", card: "a" } }]);
    expect(items(root)[0].querySelector(".ad-busy")!.textContent).toBe("Claude is writing…");
    expect(buttonNamed(items(root)[0], "Write").disabled).toBe(true);

    stand.release();
    await settle();
    const [a] = items(root);
    expect(a.dataset.standing).toBe("current");
    expect(a.querySelector(".ad-text")!.textContent).toContain("The medians meet at the centroid");
    expect(buttonNamed(a, "Write again")).toBeDefined();
  });

  it("refines one by an instruction", async () => {
    worker({ cards: [card("a", "Where?")], items: { "reference:a": item("At $G$.", "Where?") } });
    const root = await open();
    buttonNamed(root, "Refine…").click();
    const box = items(root)[0].querySelector<HTMLTextAreaElement>(".ad-draft textarea")!;
    expect(document.activeElement).toBe(box);
    type(box, "Name the point.");
    buttonNamed(items(root)[0], "Refine").click();
    await settle();
    expect(stand.commands).toEqual([{ kind: "refine", target: { kind: "reference", card: "a" }, instruction: "Name the point." }]);
    const [a] = items(root);
    expect(a.querySelector(".ad-text")!.textContent).toBe("Refined: Name the point.");
    expect(a.querySelector(".ad-version")!.textContent).toMatch(/^Version 2 · Refined: “Name the point.” · /);
    expect(a.querySelector(".ad-draft")).toBeNull();
  });

  it("takes an edit by hand, previewing it typeset, and keeps what is typed across a render", async () => {
    worker({ cards: [card("a", "Where?"), card("b", "Why?")], items: { "reference:a": item("At $G$.", "Where?") } });
    stand.hold = true;
    const root = await open();
    buttonNamed(root, "Edit").click();
    const box = items(root)[0].querySelector<HTMLTextAreaElement>(".ad-draft textarea")!;
    expect(box.value).toBe("At $G$.");
    type(box, "At the centroid, $G$.");
    expect(items(root)[0].querySelector(".ad-preview .katex")).not.toBeNull();

    // Another piece's change renders the page while this one is being typed.
    buttonNamed(items(root)[1], "Write").click();
    await settle();
    const kept = items(root)[0].querySelector<HTMLTextAreaElement>(".ad-draft textarea")!;
    expect(kept.value).toBe("At the centroid, $G$.");
    expect(document.activeElement).toBe(kept);
    stand.release();
    await settle();

    stand.hold = false;
    buttonNamed(items(root)[0], "Save").click();
    await settle();
    expect(stand.commands.at(-1)).toEqual({ kind: "edit", target: { kind: "reference", card: "a" }, text: "At the centroid, $G$." });
    expect(items(root)[0].querySelector(".ad-version")!.textContent).toMatch(/^Version 2 · Edited by you · /);
  });

  it("shows every version, and restores an old one", async () => {
    const held: Item = {
      basis: "Where?",
      versions: [
        { text: "First.", at: 1_700_000_000_000, origin: "written" },
        { text: "Second.", at: 1_700_000_100_000, origin: "edited" },
      ],
    };
    worker({ cards: [card("a", "Where?")], items: { "reference:a": held } });
    const root = await open();
    buttonNamed(root, "History (2)").click();
    const entries = [...root.querySelectorAll(".ad-history li")];
    expect(entries.map((e) => e.querySelector(".rc-said")!.textContent)).toEqual(["Second.", "First."]);
    expect(entries[0].querySelector("button")).toBeNull();
    entries[1].querySelector("button")!.click();
    await settle();
    expect(stand.commands).toEqual([{ kind: "restore", target: { kind: "reference", card: "a" }, at: 1_700_000_000_000 }]);
    expect(items(root)[0].querySelector(".ad-text")!.textContent).toBe("First.");
    expect(root.querySelectorAll(".ad-history li")).toHaveLength(3);
  });

  it("says why Claude could not write one", async () => {
    worker({ cards: [card("a", "Where?")] });
    stand.status = 502;
    const root = await open();
    buttonNamed(root, "Write").click();
    await settle();
    expect(items(root)[0].querySelector(".rc-error")!.textContent).toBe("Claude declined to write this.");
    expect(items(root)[0].dataset.standing).toBe("missing");
  });

  it("shows only what needs writing, when asked", async () => {
    worker({ cards: [card("a", "Where?"), card("b", "Why?")], items: { "reference:a": item("At $G$.", "Where?") } });
    const root = await open();
    expect(root.querySelector(".ad-toolbar .rc-note")!.textContent).toBe("1 written · 1 not written yet");
    buttonNamed(root, "Only what needs writing").click();
    expect(items(root).map((i) => i.querySelector(".ad-question")!.textContent)).toEqual(["Why?"]);
  });
});

describe("key facts", () => {
  it("lists every lesson closed, opens one at its steps, and writes all it wants, one after another", async () => {
    worker({ items: { "fact:medians/0": item("A median joins a vertex to the midpoint of the opposite side.", factBasis(medians.steps[0]!)) } });
    const root = await open("#facts");
    expect(root.querySelector(".ad-tab[aria-current]")!.textContent).toMatch(/^Key facts/);
    expect(items(root)).toEqual([]);
    const head = [...root.querySelectorAll<HTMLButtonElement>(".ad-lesson-head")].find((h) => h.textContent?.startsWith(medians.name))!;
    expect(head.querySelector(".ad-lesson-tally")!.textContent).toBe(`1 of ${medians.steps.length} written`);
    head.click();

    const steps = items(root);
    expect(steps).toHaveLength(medians.steps.length);
    expect(steps[0].querySelector(".ad-where")!.textContent).toBe(`Step 1: ${medians.steps[0]!.title} ↗`);
    expect(steps[1].querySelector(".ad-text")!.textContent).toBe("No key fact yet.");

    buttonNamed(root, `Write the ${medians.steps.length - 1} not written or stale`).click();
    for (let i = 0; i < medians.steps.length; i++) await settle();
    expect(stand.commands.map((c) => c.target)).toEqual(
      medians.steps.slice(1).map((_, i) => ({ kind: "fact", lesson: "medians", step: i + 1 })),
    );
    expect(items(root).every((i) => i.dataset.standing === "current")).toBe(true);
  });
});

describe("the house style", () => {
  it("shows the default, saves an edit, and goes back to the default", async () => {
    worker();
    const root = await open("#style");
    const box = root.querySelector<HTMLTextAreaElement>(".ad-style")!;
    expect(box.value).toBe(DEFAULT_STYLE);
    expect(root.querySelector(".ad-version")!.textContent).toBe("The default style.");
    expect(buttonNamed(root, "Save").disabled).toBe(true);
    expect(buttonNamed(root, "Back to the default").disabled).toBe(true);

    type(box, "Answer in one sentence.");
    expect(buttonNamed(root, "Save").disabled).toBe(false);
    buttonNamed(root, "Save").click();
    await settle();
    expect(stand.commands).toEqual([{ kind: "edit", target: { kind: "style" }, text: "Answer in one sentence." }]);
    expect(root.querySelector(".ad-version")!.textContent).toMatch(/^Version 1 · Edited by you · /);

    buttonNamed(root, "Back to the default").click();
    await settle();
    expect(root.querySelector<HTMLTextAreaElement>(".ad-style")!.value).toBe(DEFAULT_STYLE);
  });
});
