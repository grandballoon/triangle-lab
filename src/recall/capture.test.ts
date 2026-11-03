// @vitest-environment jsdom
//
// Noting a question from inside a lesson, against a DOM stand-in: the pill and
// the Q key open the sheet, keys typed there never reach the lesson, and a
// saved question carries the lesson and step that were on show.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountRecall } from "./capture.ts";
import type { Place } from "./deck.ts";
import { RecallStore } from "./store.ts";

let place: Place | null;
let store: RecallStore;

/** Storage that keeps what it is given, as localStorage would. */
function memory(): Pick<Storage, "getItem" | "setItem"> {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function mount(storage: Pick<Storage, "getItem" | "setItem"> | null = memory()) {
  document.body.innerHTML = `<header id="topbar"><nav id="nav"></nav><div id="heading"></div></header>`;
  store = new RecallStore(storage, null);
  const capture = mountRecall(document.getElementById("topbar")!, () => place, store);
  const pill = document.querySelector<HTMLButtonElement>(".nav-recall")!;
  const sheet = document.getElementById("recall-sheet")!;
  const input = sheet.querySelector("textarea")!;
  return { capture, pill, sheet, input };
}

const key = (target: EventTarget, k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  localStorage.clear();
  place = { lesson: "medians", step: 1, stepTitle: "Find the centroid" };
});

describe("the recall pill", () => {
  it("sits in the top bar before the lesson's heading", () => {
    const { pill } = mount();
    expect(pill.nextElementSibling?.id).toBe("heading");
    expect(pill.hidden).toBe(false);
  });

  it("is hidden on a page that is not a lesson", () => {
    place = null;
    const { pill } = mount();
    expect(pill.hidden).toBe(true);
  });

  it("opens the sheet, naming the lesson and step, and focuses the box", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    expect(sheet.hidden).toBe(false);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    expect(sheet.querySelector(".recall-place")!.textContent).toBe("Medians · Step 2: Find the centroid");
    expect(document.activeElement).toBe(input);
  });

  it("opens on Q, but not while typing elsewhere or with a modifier", () => {
    const { sheet } = mount();
    const field = document.body.appendChild(document.createElement("input"));
    expect(key(field, "q").defaultPrevented).toBe(false);
    key(document.body, "q", { metaKey: true });
    expect(sheet.hidden).toBe(true);
    expect(key(document.body, "q").defaultPrevented).toBe(true);
    expect(sheet.hidden).toBe(false);
  });
});

describe("the sheet", () => {
  it("keeps the keys typed into it from the lesson's shortcuts", () => {
    const { pill, input } = mount();
    const lesson = vi.fn();
    window.addEventListener("keydown", lesson);
    pill.click();
    key(input, "r");
    key(input, "ArrowRight");
    window.removeEventListener("keydown", lesson);
    expect(lesson).not.toHaveBeenCalled();
  });

  it("saves the question on Enter, with where it was asked, and closes", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    place = { lesson: "medians", step: 2, stepTitle: "Two to one" };
    input.value = "  Why does the centroid split each median 2:1?  ";
    expect(key(input, "Enter").defaultPrevented).toBe(true);
    expect(store.get().cards).toMatchObject([
      { question: "Why does the centroid split each median 2:1?", lesson: "medians", step: 2, stepTitle: "Two to one" },
    ]);
    expect(sheet.hidden).toBe(true);
    expect(input.value).toBe("");
    expect(pill.textContent).toBe("1");
  });

  it("leaves Shift+Enter for a new line, and saves nothing blank", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    expect(key(input, "Enter", { shiftKey: true }).defaultPrevented).toBe(false);
    input.value = "   ";
    key(input, "Enter");
    expect(store.get().cards).toEqual([]);
    expect(sheet.hidden).toBe(false);
  });

  it("starts a new line on Enter on a touch screen, and saves from the button", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: coarse)" }));
    const { pill, sheet, input } = mount();
    pill.click();
    input.value = "Two lines";
    expect(key(input, "Enter").defaultPrevented).toBe(false);
    expect(store.get().cards).toEqual([]);
    sheet.querySelector<HTMLButtonElement>(".recall-save")!.click();
    expect(store.get().cards).toHaveLength(1);
  });

  it("says so when the question can only be kept for this page", () => {
    // Storage blocked, as in some private windows.
    const { pill, sheet, input } = mount(null);
    pill.click();
    input.value = "Kept?";
    key(input, "Enter");
    expect(store.get().cards).toHaveLength(1);
    expect(sheet.hidden).toBe(false);
    expect(sheet.querySelector(".recall-hint")!.classList.contains("warn")).toBe(true);
  });

  it("lists this lesson's questions, and deletes one on a second press", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    for (const q of ["First?", "Second?"]) {
      input.value = q;
      sheet.querySelector<HTMLButtonElement>(".recall-save")!.click();
    }
    place = { lesson: "altitudes", step: 0, stepTitle: "" };
    input.value = "Elsewhere?";
    sheet.querySelector<HTMLButtonElement>(".recall-save")!.click();
    place = { lesson: "medians", step: 0, stepTitle: "" };
    pill.click();
    const items = () => [...sheet.querySelectorAll(".recall-asked li .recall-q")].map((q) => q.textContent);
    expect(items()).toEqual(["First?", "Second?"]);

    const remove = sheet.querySelector<HTMLButtonElement>(".recall-remove")!;
    remove.click();
    expect(items()).toHaveLength(2);
    remove.click();
    expect(items()).toEqual(["Second?"]);
  });

  it("closes on Escape or its close button, keeping the draft", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    input.value = "half a thought";
    key(input, "Escape");
    expect(sheet.hidden).toBe(true);
    pill.click();
    expect(input.value).toBe("half a thought");
    sheet.querySelector<HTMLButtonElement>(".recall-close")!.click();
    expect(sheet.hidden).toBe(true);
    expect(document.activeElement).toBe(pill);
  });

  it("stays open while the lesson is used, so the figure can be watched", () => {
    const { pill, sheet } = mount();
    pill.click();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(sheet.hidden).toBe(false);
  });

  it("follows the step on show while it is open", () => {
    const { capture, pill, sheet } = mount();
    pill.click();
    place = { lesson: "medians", step: 2, stepTitle: "Two to one" };
    capture.refresh();
    expect(sheet.querySelector(".recall-place")!.textContent).toBe("Medians · Step 3: Two to one");
  });

  it("follows the lesson when the page swaps it in place", () => {
    const { capture, pill } = mount();
    store.update((d) => ({
      ...d,
      cards: [
        ...d.cards,
        { id: "x", question: "Q?", lesson: "altitudes", step: 0, stepTitle: "", created: 0, updated: 0, box: 0, due: 0, attempts: [] },
      ],
    }));
    expect(pill.textContent).toBe("");
    place = { lesson: "altitudes", step: 0, stepTitle: "" };
    capture.refresh();
    expect(pill.textContent).toBe("1");
  });
});

describe("moving the sheet out of the way", () => {
  const BOX_KEY = "triangle-lab:recall-sheet";
  const pointer = (target: EventTarget, type: string, x: number, y: number): void => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: x, clientY: y }));
  };
  const style = (sheet: HTMLElement) => {
    const { left, top, width, height } = sheet.style;
    return { left, top, width, height };
  };

  it("folds down to its header and back, focusing the box again", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    const fold = sheet.querySelector<HTMLButtonElement>(".recall-fold")!;
    fold.click();
    expect(sheet.classList.contains("folded")).toBe(true);
    expect(sheet.querySelector<HTMLElement>(".recall-body")!.hidden).toBe(true);
    expect(fold.getAttribute("aria-expanded")).toBe("false");
    fold.click();
    expect(sheet.querySelector<HTMLElement>(".recall-body")!.hidden).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("opens unfolded, whichever way it was closed", () => {
    const { pill, sheet, input } = mount();
    pill.click();
    sheet.querySelector<HTMLButtonElement>(".recall-fold")!.click();
    key(sheet, "Escape");
    pill.click();
    expect(sheet.classList.contains("folded")).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("opens where it was last put, kept to the window", () => {
    localStorage.setItem(BOX_KEY, JSON.stringify({ left: 300, top: 5000, width: 420, height: 320 }));
    const { pill, sheet } = mount();
    pill.click();
    expect(sheet.classList.contains("boxed")).toBe(true);
    expect(style(sheet)).toEqual({ left: "300px", top: `${innerHeight - 320 - 8}px`, width: "420px", height: "320px" });
  });

  it("is dragged by its header and sized by its corner, and remembers both", () => {
    localStorage.setItem(BOX_KEY, JSON.stringify({ left: 100, top: 100, width: 400, height: 300 }));
    const { pill, sheet } = mount();
    pill.click();
    // jsdom draws nothing, so the drawn box is the one set as style.
    sheet.getBoundingClientRect = () => {
      const [left, top, width, height] = ["left", "top", "width", "height"].map((p) => parseFloat(sheet.style.getPropertyValue(p)));
      return { left, top, width, height } as DOMRect;
    };

    const bar = sheet.querySelector<HTMLElement>(".recall-bar")!;
    pointer(bar, "pointerdown", 10, 10);
    pointer(bar, "pointermove", 60, 30);
    pointer(bar, "pointerup", 60, 30);
    expect(style(sheet)).toEqual({ left: "150px", top: "120px", width: "400px", height: "300px" });

    const grip = sheet.querySelector<HTMLElement>(".recall-grip")!;
    pointer(grip, "pointerdown", 0, 0);
    pointer(grip, "pointermove", 40, 80);
    pointer(grip, "pointerup", 40, 80);
    expect(style(sheet)).toEqual({ left: "150px", top: "120px", width: "440px", height: "380px" });
    expect(JSON.parse(localStorage.getItem(BOX_KEY)!)).toEqual({ left: 150, top: 120, width: 440, height: 380 });
  });

  it("is not dragged by a press on its header's buttons", () => {
    const { pill, sheet } = mount();
    pill.click();
    pointer(sheet.querySelector(".recall-close")!, "pointerdown", 0, 0);
    expect(sheet.classList.contains("dragging")).toBe(false);
  });
});
