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

/**
 * What the page last loaded listens to on the window and the document. A
 * reload takes it off, as closing the tab would, so a page from an earlier
 * load cannot hear keys or storage events meant for this one.
 */
const listening: (() => void)[] = [];

/** Load the page again, as a browser does to a tab it set aside, storage and all. */
async function reload(): Promise<HTMLElement> {
  for (const off of listening.splice(0)) off();
  document.body.innerHTML = `<main id="recall"></main>`;
  vi.resetModules();
  const targets = [window, document] as EventTarget[];
  const adds = targets.map((target) => target.addEventListener);
  targets.forEach((target, i) => {
    target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      listening.push(() => target.removeEventListener(type, fn, options));
      adds[i].call(target, type, fn, options);
    };
  });
  try {
    await import("./page.ts");
  } finally {
    targets.forEach((target, i) => (target.addEventListener = adds[i]));
  }
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

  it("asks the due questions back: answer, check against the lesson, say how it went", async () => {
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

    // The same box, kept open to correct.
    expect(root.querySelector<HTMLTextAreaElement>(".rc-answer")!.value).toBe("At the centroid");
    expect(root.querySelector(".rc-grades")).not.toBeNull();
    expect([...root.querySelectorAll(".rc-grade-name")].map((b) => b.textContent)).toEqual([
      "Still struggling",
      "Fixed it",
      "Got it right",
    ]);
    const source = root.querySelector<HTMLAnchorElement>(".rc-source")!;
    expect(source.getAttribute("href")).toBe("medians.html#step-2");
    expect(source.target).toBe("_blank");
    const hints = [...root.querySelectorAll(".rc-grade-when")].map((h) => h.textContent);
    expect(hints).toEqual(["again now", "in 18 hours", "in 18 hours"]);

    press(document.body, "3");
    expect(stored()[0]).toMatchObject({ box: 1, attempts: [{ answer: "At the centroid", grade: "recalled" }] });
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 2 of 2");

    // Answered in the head, and still a struggle: left for the next review, not asked again in this one.
    buttonNamed(root, "Check").click();
    expect(root.querySelector<HTMLTextAreaElement>(".rc-answer")!.placeholder).toContain("Answered in your head");
    buttonNamed(root, "Still struggling").click();

    expect(root.querySelector(".rc-progress")!.textContent).toBe("Review done");
    expect(root.querySelector(".rc-finished")!.textContent).toContain("1 recalled · 0 shaky · 1 missed");
    expect(stored()[1].attempts.map((a: { grade: string }) => a.grade)).toEqual(["missed"]);

    buttonNamed(root, "Back to your questions").click();
    expect(root.querySelector(".rc-lead")!.textContent).toBe("1 due now");
  });

  it("shows the last answer folded away while checking", async () => {
    const root = await open([
      card("a", "Where do the medians meet?", { attempts: [{ at: now - DAY_MS, answer: "At the incentre", grade: "missed" }] }),
    ]);
    buttonNamed(root, "Start review").click();
    expect(root.querySelector(".rc-last")).toBeNull();
    buttonNamed(root, "Check").click();
    const last = root.querySelector<HTMLDetailsElement>(".rc-last")!;
    expect(last.open).toBe(false);
    expect(last.querySelector("summary")!.textContent).toBe("Last time · missed it");
    expect(last.querySelector(".rc-said")!.textContent).toBe("At the incentre");
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
    buttonNamed(root, "Got it right").click();
    let answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    answer.value = "half an answer";
    answer.dispatchEvent(new Event("input"));

    root = await reload();
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Question 2 of 2");
    expect(root.querySelector<HTMLTextAreaElement>(".rc-answer")!.value).toBe("half an answer");

    // Corrected while checking, and kept so across a reload.
    buttonNamed(root, "Check").click();
    answer = root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
    answer.value = "a whole answer";
    answer.dispatchEvent(new Event("input"));
    root = await reload();
    expect(root.querySelector<HTMLTextAreaElement>(".rc-answer")!.value).toBe("a whole answer");
    expect(root.querySelector(".rc-grades")).not.toBeNull();
    buttonNamed(root, "Fixed it").click();
    expect(stored()[1].attempts).toMatchObject([{ answer: "a whole answer", grade: "shaky" }]);
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
    expect(root.querySelector(".rc-grades")).toBeNull();
    buttonNamed(root, "Check").click();
    expect(root.querySelector(".rc-grades")).not.toBeNull();
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

  const review = (root: HTMLElement) => root.querySelector(".rc-overall");
  const suggested = (root: HTMLElement) => [...root.querySelectorAll(".rc-suggested .rc-grade-name")].map((b) => b.textContent);
  const field = (root: HTMLElement) => root.querySelector<HTMLTextAreaElement>(".rc-answer")!;
  /** The words highlighted in the answer. */
  const marked = (root: HTMLElement) => [...root.querySelectorAll(".rc-marks mark")].map((m) => m.textContent);
  /** The remarks in the margin, in order, and whether each is on words since changed. */
  const remarks = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLElement>(".rc-margin .rc-remark:not(.rc-overall)")].map((r) => ({
      quote: r.querySelector(".rc-remark-quote")!.textContent,
      gone: r.classList.contains("rc-gone"),
    }));

  /** Correct the answer being checked to `text`, as typing does. */
  function correct(root: HTMLElement, text: string): void {
    field(root).value = text;
    field(root).dispatchEvent(new Event("input"));
  }

  const wrong = {
    grade: "missed",
    feedback: "No: they meet at the centroid, $G$.",
    remarks: [
      { quote: "the incentre", note: "The centroid, $G$: the incentre is where the angle bisectors meet." },
      { quote: "halfway", note: "Two thirds of the way from each vertex." },
    ],
  };

  it("reads a written answer, highlighting the words each remark is on", async () => {
    const checks = worker([wrong]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the incentre, halfway down each median");
    expect(review(root)!.textContent).toBe("Claude's checkReading your answer…");

    await settle();
    expect(checks).toEqual([
      {
        question: "Where do the medians meet?",
        where: "Triangles · Medians · Step 2: Find the centroid",
        answer: "At the incentre, halfway down each median",
      },
    ]);
    expect(review(root)!.querySelector("h3")!.textContent).toBe("Claude's check · missed it");
    expect(review(root)!.querySelector(".katex")).not.toBeNull();
    expect(marked(root)).toEqual(["the incentre", "halfway"]);
    expect(remarks(root)).toEqual([
      { quote: "the incentre", gone: false },
      { quote: "halfway", gone: false },
    ]);
    // Wrong, so nothing is suggested: the learner corrects it, or says they are struggling.
    expect(suggested(root)).toEqual([]);
  });

  it("corrects the answer in place until Claude reads it as right, then marks it fixed, kept as one answer", async () => {
    const checks = worker([wrong, { grade: "recalled", feedback: "Yes: the centroid, two thirds along." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the incentre, halfway down each median");
    await settle();
    const again = () => buttonNamed(root, "Check again");
    expect(again().disabled).toBe(true);

    // Each remark follows its words, and is dealt with once they are changed.
    correct(root, "At the centroid, halfway down each median");
    expect(marked(root)).toEqual(["halfway"]);
    expect(remarks(root)).toEqual([
      { quote: "halfway", gone: false },
      { quote: "the incentre", gone: true },
    ]);
    expect(review(root)!.textContent).toContain("You've changed your answer since.");
    correct(root, "At the centroid, two thirds of the way down each median");
    expect(marked(root)).toEqual([]);
    expect(again().disabled).toBe(false);
    expect(checks).toHaveLength(1);

    press(field(root), "Enter");
    expect(review(root)!.textContent).toBe("Claude's checkReading your answer…");
    await settle();
    expect(checks.map((c) => (c as { answer: string }).answer)).toEqual([
      "At the incentre, halfway down each median",
      "At the centroid, two thirds of the way down each median",
    ]);
    expect(remarks(root)).toEqual([]);
    expect(suggested(root)).toEqual(["Fixed it"]);
    expect(again().disabled).toBe(true);

    buttonNamed(root, "Fixed it").click();
    expect(stored()[0].attempts).toMatchObject([
      { answer: "At the centroid, two thirds of the way down each median", grade: "shaky", claude: { grade: "recalled" } },
    ]);
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Review done");
  });

  it("marks an answer Claude reads as right first time, though the learner may disagree", async () => {
    worker([{ grade: "recalled", feedback: "Exactly." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();
    expect(suggested(root)).toEqual(["Got it right"]);
    buttonNamed(root, "Still struggling").click();
    expect(stored()[0].attempts).toMatchObject([{ answer: "At the centroid", grade: "missed", claude: { grade: "recalled" } }]);
  });

  it("selects a remark's words in the answer when the remark is pressed", async () => {
    worker([wrong]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the incentre, halfway down each median");
    await settle();
    root.querySelectorAll<HTMLElement>(".rc-margin .rc-remark")[2].click();
    expect(document.activeElement).toBe(field(root));
    expect([field(root).selectionStart, field(root).selectionEnd]).toEqual([17, 24]);
    expect(root.querySelector(".rc-marks mark.rc-active")!.textContent).toBe("halfway");
    expect(root.querySelector(".rc-margin .rc-remark.rc-active .rc-remark-quote")!.textContent).toBe("halfway");
  });

  it("shows what Claude said of the last answer, its words marked, folded away while checking and in the history", async () => {
    worker([{ grade: "recalled", feedback: "Yes." }]);
    const root = await openSynced([
      card("a", "Where do the medians meet?", {
        attempts: [{ at: now - DAY_MS, answer: "At the incentre, halfway down", grade: "missed", claude: wrong as never }],
      }),
    ]);
    buttonNamed(root, "History").click();
    const entry = root.querySelector(".rc-history > li")!;
    expect([...entry.querySelectorAll(".rc-said mark")].map((m) => m.textContent)).toEqual(["the incentre", "halfway"]);
    expect(entry.querySelectorAll(".rc-said-remarks li")).toHaveLength(2);
    expect(entry.querySelector(".rc-yours h3")!.textContent).toBe("Claude · missed it");
    expect(entry.querySelector(".katex")).not.toBeNull();
    buttonNamed(root, "Hide history").click();

    answerWith(root, "At the centroid");
    const last = root.querySelector(".rc-last")!;
    expect(last.querySelector("summary")!.textContent).toBe("Last time · missed it");
    expect([...last.querySelectorAll(".rc-said mark")].map((m) => m.textContent)).toEqual(["the incentre", "halfway"]);
  });

  it("asks nothing for an answer given in the head until it is written, or without the sync key", async () => {
    const checks = worker([{ grade: "recalled", feedback: "Yes." }]);
    let root = await openSynced([card("a", "First?")]);
    answerWith(root, "");
    await settle();
    expect(review(root)).toBeNull();
    expect(buttonNamed(root, "Check").disabled).toBe(true);
    correct(root, "Written after all");
    buttonNamed(root, "Check").click();
    await settle();
    expect(checks).toHaveLength(1);

    root = await open([card("a", "First?")]);
    answerWith(root, "Written down");
    await settle();
    expect(review(root)).toBeNull();
    expect(buttonNamed(root, "Check")).toBeUndefined();
    expect(checks).toHaveLength(1);
  });

  it("says why a check failed, and tries again when asked", async () => {
    const checks = worker(["busy", { grade: "recalled", feedback: "Yes: they meet at the centroid." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();
    expect(review(root)!.textContent).toContain("Claude is busy. Try again in a minute.");
    expect(suggested(root)).toEqual([]);

    buttonNamed(root, "Check again").click();
    await settle();
    expect(review(root)!.textContent).toContain("they meet at the centroid");
    // The failed reading was no reading: this one is the first.
    expect(suggested(root)).toEqual(["Got it right"]);
    expect(checks).toHaveLength(2);
  });

  it("keeps what Claude said, and the answer as corrected since, across a reload, without asking again", async () => {
    const checks = worker([wrong]);
    let root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the incentre, halfway down each median");
    await settle();
    correct(root, "At the centroid, halfway down each median");

    root = await reload();
    await settle();
    expect(field(root).value).toBe("At the centroid, halfway down each median");
    expect(review(root)!.textContent).toContain("they meet at the centroid");
    expect(marked(root)).toEqual(["halfway"]);
    expect(buttonNamed(root, "Check again").disabled).toBe(false);
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

  it("takes number keys typed in the answer as writing, and grades with them once out of it", async () => {
    worker([{ grade: "recalled", feedback: "Exactly." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();
    expect(document.activeElement).toBe(field(root));
    press(field(root), "2");
    expect(stored()[0].attempts).toEqual([]);
    press(field(root), "Escape");
    expect(document.activeElement).not.toBe(field(root));
    press(document.body, "3");
    expect(stored()[0].attempts).toMatchObject([{ grade: "recalled" }]);
  });

  /** Type `text` into the open editor and save it with Enter. */
  function write(root: HTMLElement, text: string): void {
    const box = root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")!;
    expect(document.activeElement).toBe(box);
    box.value = text;
    box.dispatchEvent(new Event("input"));
    press(box, "Enter");
  }

  it("rewords the question once checked, and has Claude read the answer against the new wording", async () => {
    const checks = worker(["never", { grade: "recalled", feedback: "Yes." }]);
    const root = await openSynced([card("a", "Where?")]);
    answerWith(root, "At the centroid");

    buttonNamed(root, "Edit question").click();
    write(root, "Where do the medians meet?");
    expect(root.querySelector(".rc-asked")!.textContent).toBe("Where do the medians meet?");
    expect(stored()[0].question).toBe("Where do the medians meet?");

    await settle();
    expect(checks.map((c) => (c as { question: string }).question)).toEqual(["Where?", "Where do the medians meet?"]);
    expect(review(root)!.textContent).toContain("Yes.");

    // A blank wording is not saved, and Escape leaves the question as it was.
    buttonNamed(root, "Edit question").click();
    write(root, "  ");
    expect(root.querySelector(".rc-editor")).not.toBeNull();
    press(root.querySelector(".rc-editor textarea")!, "Escape");
    expect(root.querySelector(".rc-asked")!.textContent).toBe("Where do the medians meet?");
    expect(checks).toHaveLength(2);
  });

  it("writes new questions from Claude's feedback, at the same step, for the next review", async () => {
    worker([{ grade: "shaky", feedback: "Why two to one?" }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();

    buttonNamed(root, "New question").click();
    expect(root.querySelector(".rc-new h3")!.textContent).toBe("New question · Step 2: Find the centroid");
    // Claude's feedback stays in view while writing.
    expect(review(root)!.textContent).toContain("Why two to one?");
    write(root, "Why does the centroid cut each median two to one?");
    write(root, "What is the centroid's distance from a side?");
    expect([...root.querySelectorAll(".rc-written li")].map((li) => li.textContent)).toEqual([
      "Why does the centroid cut each median two to one?",
      "What is the centroid's distance from a side?",
    ]);
    buttonNamed(root, "Done").click();
    expect(root.querySelector(".rc-written")!.textContent).toContain("2 new questions");

    const fresh = stored().filter((c) => c.id !== "a");
    expect(fresh).toMatchObject([
      { question: "Why does the centroid cut each median two to one?", lesson: "medians", step: 1, stepTitle: "Find the centroid", box: 0 },
      { question: "What is the centroid's distance from a side?", lesson: "medians", step: 1 },
    ]);

    // They wait for the next sitting rather than joining this one.
    buttonNamed(root, "Fixed it").click();
    expect(root.querySelector(".rc-progress")!.textContent).toBe("Review done");
    buttonNamed(root, "Back to your questions").click();
    expect(root.querySelector(".rc-lead")!.textContent).toBe("2 due now");
  });

  it("keeps a question being written across a reload", async () => {
    worker([{ grade: "shaky", feedback: "Nearly." }]);
    let root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    await settle();
    buttonNamed(root, "New question").click();
    const box = root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")!;
    box.value = "Half a thou";
    box.dispatchEvent(new Event("input"));

    root = await reload();
    await settle();
    expect(root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")!.value).toBe("Half a thou");
    expect(review(root)!.textContent).toContain("Nearly.");
  });

  it("keeps the caret where it was when Claude's reply redraws the page", async () => {
    worker([{ grade: "shaky", feedback: "Nearly." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    buttonNamed(root, "New question").click();
    const box = root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")!;
    box.value = "Why two to one?";
    box.dispatchEvent(new Event("input"));
    box.setSelectionRange(3, 3);

    await settle();
    const redrawn = root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")!;
    expect(redrawn).not.toBe(box);
    expect(document.activeElement).toBe(redrawn);
    expect([redrawn.value, redrawn.selectionStart]).toEqual(["Why two to one?", 3]);
  });

  it("keeps the answer being corrected in focus, and its selection, when Claude's reply redraws the page", async () => {
    worker(["never", { grade: "shaky", feedback: "Nearly." }]);
    const root = await openSynced([card("a", "Where do the medians meet?")]);
    answerWith(root, "At the centroid");
    correct(root, "At the centroid, G");
    buttonNamed(root, "Check again").click();
    field(root).focus();
    field(root).setSelectionRange(3, 6);
    await settle();
    expect(review(root)!.textContent).toContain("Nearly.");
    expect(document.activeElement).toBe(field(root));
    expect([field(root).selectionStart, field(root).selectionEnd]).toEqual([3, 6]);
  });
});
