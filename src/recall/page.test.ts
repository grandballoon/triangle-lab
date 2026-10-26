// @vitest-environment jsdom
//
// The recall page as a learner uses it, against a DOM stand-in and the
// browser's storage: the overview of noted questions, a review sitting from
// first question to last, and rewording and deleting a question.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_MS, loadDeck, mergeDecks, newCard, saveDeck, type Card, type Deck } from "./deck.ts";

const KEY = "triangle-lab:recall";
const now = Date.now();

const card = (id: string, question: string, patch: Partial<Card> = {}): Card => ({
  ...newCard(id, question, { lesson: "medians", step: 1, stepTitle: "Find the centroid" }, now - DAY_MS)!,
  ...patch,
});

async function open(cards: Card[]): Promise<HTMLElement> {
  localStorage.clear();
  sessionStorage.clear();
  if (cards.length > 0) localStorage.setItem(KEY, JSON.stringify(saveDeck({ cards, removed: [] })));
  return reload();
}

/** Load the page again, as a browser does to a tab it set aside, storage and all. */
async function reload(): Promise<HTMLElement> {
  document.body.innerHTML = `<main id="recall"></main>`;
  vi.resetModules();
  await import("./page.ts");
  return document.getElementById("recall")!;
}

const stored = (): Card[] => JSON.parse(localStorage.getItem(KEY) ?? '{"cards":[]}').cards;

const buttonNamed = (root: HTMLElement, text: string): HTMLButtonElement =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.startsWith(text))!;

const press = (target: EventTarget, key: string): void =>
  void target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

/** Report a finger, not a mouse, as the main pointer. */
function touchScreen(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: coarse)", addEventListener() {} }));
}

beforeEach(() => {
  window.scrollTo = () => undefined;
  vi.unstubAllGlobals();
});

describe("the recall page", () => {
  it("explains how to note a question when there are none", async () => {
    const root = await open([]);
    expect(root.querySelector(".rc-lead")!.textContent).toBe("No questions yet.");
    expect(buttonNamed(root, "Save to a file").disabled).toBe(true);
  });

  it("lists the questions by lesson, saying which are due", async () => {
    const root = await open([
      card("due", "Where do the medians meet?"),
      card("later", "Why two to one?", { box: 2, due: now + 3 * DAY_MS }),
    ]);
    expect(root.querySelector(".rc-lead")!.textContent).toBe("1 due now");
    expect(root.querySelector(".rc-group h2")!.textContent).toBe("Triangles · Medians");
    expect(root.querySelector<HTMLAnchorElement>(".rc-group h2 a")!.getAttribute("href")).toBe("medians.html");
    const metas = [...root.querySelectorAll(".rc-meta")].map((m) => m.textContent);
    expect(metas[0]).toContain("due now");
    expect(metas[1]).toContain("in 3 days");
  });

  it("asks the due questions back: answer, check against the lesson, grade", async () => {
    const root = await open([card("a", "Where do the medians meet?"), card("b", "What is a median?")]);
    buttonNamed(root, "Start review").click();
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 1 of 2");
    expect(root.querySelector(".rc-asked")!.textContent).toBe("Where do the medians meet?");
    expect(root.querySelector(".rc-from")!.textContent).toBe("Triangles · Medians · Step 2: Find the centroid");

    const answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    expect(document.activeElement).toBe(answer);
    answer.value = "At the centroid";
    answer.dispatchEvent(new Event("input"));
    press(answer, "Enter");

    expect(root.querySelector(".rc-said")!.textContent).toBe("At the centroid");
    const source = root.querySelector<HTMLAnchorElement>(".rc-source")!;
    expect(source.getAttribute("href")).toBe("medians.html#step-2");
    expect(source.target).toBe("_blank");
    const hints = [...root.querySelectorAll(".rc-grade-when")].map((h) => h.textContent);
    expect(hints).toEqual(["again now", "in 18 hours", "in 18 hours"]);

    press(document.body, "3");
    expect(stored()[0]).toMatchObject({ box: 1, attempts: [{ answer: "At the centroid", grade: "recalled" }] });
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 2 of 2");

    // Answered in the head, and missed: asked once more at the end.
    buttonNamed(root, "Check").click();
    expect(root.querySelector(".rc-said.rc-quiet")).not.toBeNull();
    buttonNamed(root, "Missed it").click();
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 3 of 3");
    expect(root.querySelector(".rc-asked")!.textContent).toBe("What is a median?");
    buttonNamed(root, "Check").click();
    expect([...root.querySelectorAll(".rc-yours h3")].map((h) => h.textContent)).toEqual([
      "Your answer",
      "Last time · missed it",
    ]);
    buttonNamed(root, "Shaky").click();

    expect(root.querySelector(".rc-progress")!.textContent).toBe("Review done");
    expect(root.querySelector(".rc-finished")!.textContent).toContain("1 recalled · 1 shaky · 1 missed");
    expect(stored()[1].attempts.map((a: { grade: string }) => a.grade)).toEqual(["missed", "shaky"]);

    buttonNamed(root, "Back to your questions").click();
    expect(root.querySelector(".rc-lead")!.textContent).toBe("You're up to date.");
  });

  it("rewords a question, and deletes one on a second press", async () => {
    const root = await open([card("a", "First wording?"), card("b", "Doomed?")]);
    buttonNamed(root, "Edit").click();
    const box = root.querySelector<HTMLTextAreaElement>(".rc-edit")!;
    box.value = "Second wording?";
    box.dispatchEvent(new Event("input"));
    press(box, "Enter");
    expect(stored().map((c) => c.question)).toEqual(["Second wording?", "Doomed?"]);

    const remove = (): HTMLButtonElement =>
      [...root.querySelectorAll<HTMLButtonElement>(".rc-card button")].filter((b) => b.textContent?.startsWith("Delete"))[1];
    remove().click();
    expect(stored()).toHaveLength(2);
    expect(remove().textContent).toBe("Delete?");
    remove().click();
    expect(stored().map((c) => c.id)).toEqual(["a"]);
  });

  it("carries on a sitting after the tab is reloaded, with what was being written", async () => {
    let root = await open([card("a", "First?"), card("b", "Second?")]);
    buttonNamed(root, "Start review").click();
    buttonNamed(root, "Check").click();
    buttonNamed(root, "Recalled it").click();
    const answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    answer.value = "half an answer";
    answer.dispatchEvent(new Event("input"));

    root = await reload();
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 2 of 2");
    expect(root.querySelector<HTMLTextAreaElement>(".rc-answer")!.value).toBe("half an answer");

    buttonNamed(root, "Check").click();
    buttonNamed(root, "Shaky").click();
    buttonNamed(root, "Back to your questions").click();
    root = await reload();
    expect(root.querySelector(".rc-summary")).not.toBeNull();
  });

  it("starts a new line on Enter on a touch screen, and checks only from the button", async () => {
    touchScreen();
    const root = await open([card("a", "First?")]);
    buttonNamed(root, "Start review").click();
    const answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    answer.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    expect(root.querySelector(".rc-answer")).toBe(answer);
    buttonNamed(root, "Check").click();
    expect(root.querySelector(".rc-answer")).toBeNull();
  });
});

describe("syncing from the recall page", () => {
  /** The site's Worker, holding `held` and taking only `key`. Returns the requests made of it. */
  function worker(held: Card[], key = "right"): string[] {
    let deck: Deck = { cards: held, removed: [] };
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      asked.push(url);
      expect(url).toBe("/deck");
      if ((init.headers as Record<string, string>).Authorization !== `Bearer ${key}`) {
        return Response.json({ error: "No." }, { status: 401 });
      }
      deck = mergeDecks(deck, loadDeck(JSON.parse(init.body as string))!);
      return Response.json(saveDeck(deck));
    });
    return asked;
  }

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  };

  const keyBox = (root: HTMLElement) => root.querySelector<HTMLInputElement>(".rc-key-input");

  function enterKey(root: HTMLElement, key: string): void {
    keyBox(root)!.value = key;
    root.querySelector<HTMLFormElement>(".rc-key")!.requestSubmit();
  }

  it("keeps the questions in this browser, sending nothing, until given the key", async () => {
    const asked = worker([]);
    const root = await open([card("a", "Mine?")]);
    await settle();
    expect(root.querySelector(".rc-sync")!.textContent).toContain("kept in this browser only");
    expect(keyBox(root)).not.toBeNull();
    expect(asked).toEqual([]);
  });

  it("takes the sync key, then shows the questions noted on other devices", async () => {
    worker([card("phone", "Noted on the phone?")]);
    const root = await open([card("here", "Noted here?")]);
    await settle();
    expect(root.querySelector(".rc-sync")!.textContent).toContain("Enter your sync key");

    enterKey(root, "right");
    await settle();
    expect(root.querySelector(".rc-sync")!.textContent).toBe("Synced with your other devices just now.");
    expect(keyBox(root)).toBeNull();
    expect([...root.querySelectorAll(".rc-question")].map((q) => q.textContent).sort()).toEqual([
      "Noted here?",
      "Noted on the phone?",
    ]);
    expect(localStorage.getItem("triangle-lab:recall-sync-key")).toBe("right");

    // The key is kept: a reload syncs straight away.
    const again = await reload();
    await settle();
    expect(again.querySelector(".rc-sync")!.textContent).toBe("Synced with your other devices just now.");
  });

  it("says so when the key is wrong, and takes another", async () => {
    worker([]);
    const root = await open([]);
    await settle();
    enterKey(root, "wrong");
    await settle();
    expect(root.querySelector(".rc-sync")!.textContent).toContain("doesn't take that key");
    enterKey(root, "right");
    await settle();
    expect(root.querySelector(".rc-sync")!.textContent).toBe("Synced with your other devices just now.");
  });

  it("stops syncing from this browser on a second press, keeping the questions", async () => {
    worker([card("a", "Kept?")]);
    localStorage.clear();
    localStorage.setItem("triangle-lab:recall-sync-key", "right");
    const root = await reload();
    await settle();
    buttonNamed(root, "Stop syncing here").click();
    buttonNamed(root, "Stop syncing here").click();
    expect(keyBox(root)).not.toBeNull();
    expect(root.querySelector(".rc-question")!.textContent).toBe("Kept?");
  });
});

describe("Claude checking an answer", () => {
  type Answer = { grade: string; feedback: string } | "busy" | "never";

  /**
   * The site's Worker: the deck kept as sent, and checks answered with
   * `answers` in turn: a verdict, Claude being busy, or no answer ever, as
   * for a page closed while waiting. Returns the checks asked for.
   */
  function worker(answers: Answer[]): unknown[] {
    const checks: unknown[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url === "/deck") return new Response(init.body, { status: 200 });
      expect(url).toBe("/check");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer right");
      checks.push(JSON.parse(init.body as string));
      const answer = answers.shift();
      if (answer === "never") return new Promise<Response>(() => undefined);
      if (answer === "busy") return Response.json({ error: "Claude is busy. Try again in a minute." }, { status: 502 });
      return Response.json(answer);
    });
    return checks;
  }

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  };

  async function openSynced(cards: Card[]): Promise<HTMLElement> {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(KEY, JSON.stringify(saveDeck({ cards, removed: [] })));
    localStorage.setItem("triangle-lab:recall-sync-key", "right");
    return reload();
  }

  function answerWith(root: HTMLElement, text: string): void {
    buttonNamed(root, "Start review").click();
    const answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    answer.value = text;
    answer.dispatchEvent(new Event("input"));
    buttonNamed(root, "Check").click();
  }

  const review = (root: HTMLElement) => root.querySelector(".rc-review");
  const suggested = (root: HTMLElement) => [...root.querySelectorAll(".rc-suggested .rc-grade-name")].map((b) => b.textContent);

  it("reads a written answer, says what it makes of it and marks the grade it suggests", async () => {
    const checks = worker([{ grade: "shaky", feedback: "Right point, but say why: the medians meet at $G$." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "In the middle");
    expect(review(root)!.textContent).toBe("Claude's checkReading your answer…");
    expect(suggested(root)).toEqual([]);

    await settle();
    expect(checks).toEqual([
      { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2: Find the centroid", answer: "In the middle" },
    ]);
    expect(review(root)!.querySelector("h3")!.textContent).toBe("Claude's check · shaky");
    expect(review(root)!.querySelector(".katex")).not.toBeNull();
    expect(suggested(root)).toEqual(["Shaky"]);

    // The learner still grades, and may disagree.
    buttonNamed(root, "Recalled it").click();
    expect(stored()[0].attempts).toMatchObject([{ answer: "In the middle", grade: "recalled" }]);
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Review done");
  });

  it("asks nothing for an answer given in the head, or without the sync key", async () => {
    const checks = worker([{ grade: "recalled", feedback: "Yes." }]);
    let root = await openSynced([card("a", "First?")]);
    answerWith(root, "");
    await settle();
    expect(review(root)).toBeNull();

    root = await open([card("a", "First?")]);
    answerWith(root, "Written down");
    await settle();
    expect(review(root)).toBeNull();
    expect(checks).toEqual([]);
  });

  it("says why a check failed, and tries again when asked", async () => {
    const checks = worker(["busy", { grade: "missed", feedback: "No: they meet at the centroid." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the incentre");
    await settle();
    expect(review(root)!.textContent).toContain("Claude is busy. Try again in a minute.");
    expect(suggested(root)).toEqual([]);

    buttonNamed(root, "Try again").click();
    await settle();
    expect(review(root)!.textContent).toContain("they meet at the centroid");
    expect(suggested(root)).toEqual(["Missed it"]);
    expect(checks).toHaveLength(2);
  });

  it("keeps what Claude said across a reload, without asking again", async () => {
    const checks = worker([{ grade: "recalled", feedback: "Exactly." }]);
    let root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();

    root = await reload();
    await settle();
    expect(review(root)!.textContent).toContain("Exactly.");
    expect(suggested(root)).toEqual(["Recalled it"]);
    expect(checks).toHaveLength(1);
  });

  it("asks again after a reload that came while Claude was reading", async () => {
    const checks = worker(["never", { grade: "recalled", feedback: "Exactly." }]);
    let root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    root = await reload();
    await settle();
    expect(review(root)!.textContent).toContain("Exactly.");
    expect(checks).toHaveLength(2);
  });
});
