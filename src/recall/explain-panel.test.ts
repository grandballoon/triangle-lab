// @vitest-environment jsdom
//
// The Explain tab on a lesson page, against a DOM stand-in: an explanation is
// sent with the lesson and step on show, Claude's remarks land on its words,
// keys typed there never reach the lesson, and each lesson keeps its own in
// the recall deck, which syncs it.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNED_OUT, type Review } from "./check.ts";
import { explanationOf, setExplanation, type Place } from "./deck.ts";
import { LOCAL_EXPLAIN_KEY, mountExplain } from "./explain-panel.ts";
import type { ExplainRequest } from "./explain.ts";
import { RecallStore } from "./store.ts";

let place: Place | null;
let pane: HTMLElement;
let canCheck: boolean;
let asked: ExplainRequest[];
let answer: (review: Review) => void;
let store: RecallStore;

function mount() {
  document.body.innerHTML = "";
  const column = { addPane: (_label: string, p: HTMLElement) => void document.body.append((pane = p)) };
  const sync = {
    canCheck: () => canCheck,
    subscribe: () => {},
    explain: (request: ExplainRequest) => {
      asked.push(request);
      return new Promise<Review>((done) => (answer = done));
    },
  };
  store = new RecallStore();
  const explain = mountExplain(column, () => place, { store, sync });
  const field = pane.querySelector("textarea")!;
  const check = pane.querySelector<HTMLButtonElement>(".explain-check")!;
  const type = (text: string): void => {
    field.value = text;
    field.dispatchEvent(new Event("input"));
  };
  return { explain, field, check, type };
}

beforeEach(() => {
  localStorage.clear();
  place = { lesson: "medians", step: 1, stepTitle: "Find the centroid" };
  canCheck = true;
  asked = [];
});

describe("the Explain tab", () => {
  it("asks for an explanation of the lesson on show", () => {
    mount();
    expect(pane.querySelector(".explain-ask")!.textContent).toBe("Explain Medians in your own words.");
  });

  it("sends the explanation with the lesson and step, and marks Claude's remarks on its words", async () => {
    const { check, type, field } = mount();
    expect(check.disabled).toBe(true);
    type("The medians meet at the incentre.");
    expect(check.disabled).toBe(false);
    check.click();
    expect(asked).toEqual([{ lesson: "medians", step: "Step 2: Find the centroid", text: "The medians meet at the incentre." }]);
    expect(pane.querySelector(".explain-overall")!.textContent).toContain("Reading your explanation…");
    expect(check.disabled).toBe(true);

    answer({ kind: "done", verdict: { grade: "shaky", feedback: "Nearly.", remarks: [{ quote: "incentre", note: "The centroid." }] } });
    await Promise.resolve();
    await Promise.resolve();
    expect(pane.querySelector(".explain-overall h3")!.textContent).toBe("Claude · Partly there");
    expect(pane.querySelector(".explain-marks mark")!.textContent).toBe("incentre");
    expect(check.textContent).toBe("Check again");

    // Correcting the words deals with the remark.
    type(field.value.replace("incentre", "centroid"));
    expect(pane.querySelector(".explain-marks mark")).toBeNull();
    expect(pane.querySelector(".explain-gone")).not.toBeNull();
    expect(check.disabled).toBe(false);
  });

  it("offers to sign in again once the site's sign-in has run out", async () => {
    const { check, type } = mount();
    type("Medians meet.");
    check.click();
    answer({ kind: "failed", error: SIGNED_OUT, signIn: true });
    await Promise.resolve();
    await Promise.resolve();
    const link = pane.querySelector<HTMLAnchorElement>(".explain-sign-in")!;
    expect(link.getAttribute("href")).toBe("signin.html");
    expect(link.target).toBe("_blank");
    expect(check.disabled).toBe(false);
  });

  it("keeps keys typed in the pane from the lesson", () => {
    const { field } = mount();
    const heard = vi.fn();
    window.addEventListener("keydown", heard);
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    window.removeEventListener("keydown", heard);
    expect(heard).not.toHaveBeenCalled();
  });

  it("offers to sign in while signed out", () => {
    canCheck = false;
    mount();
    expect(pane.querySelector<HTMLElement>(".explain-row")!.hidden).toBe(true);
    expect(pane.querySelector<HTMLElement>(".explain-signin")!.hidden).toBe(false);
  });

  it("keeps each lesson's explanation, across a lesson swap and a reload", () => {
    const { explain, field, type } = mount();
    type("Medians meet.");
    place = { lesson: "altitudes", step: 0, stepTitle: "" };
    explain.refresh();
    expect(field.value).toBe("");
    place = { lesson: "medians", step: 0, stepTitle: "" };
    explain.refresh();
    expect(field.value).toBe("Medians meet.");
    expect(explanationOf(new RecallStore().get(), "medians")?.text).toBe("Medians meet.");
    expect(mount().field.value).toBe("Medians meet.");
  });

  it("keeps Claude's check in the deck, and shows it again after a reload", async () => {
    const { check, type } = mount();
    type("The medians meet at the incentre.");
    check.click();
    answer({ kind: "done", verdict: { grade: "shaky", feedback: "Nearly.", remarks: [{ quote: "incentre", note: "The centroid." }] } });
    await Promise.resolve();
    await Promise.resolve();
    expect(explanationOf(store.get(), "medians")?.checked?.text).toBe("The medians meet at the incentre.");
    mount();
    expect(pane.querySelector(".explain-overall h3")!.textContent).toBe("Claude · Partly there");
    expect(pane.querySelector(".explain-marks mark")!.textContent).toBe("incentre");
  });

  it("shows an explanation changed in another tab or on another device as it arrives", () => {
    const { field, type } = mount();
    type("Medians meet.");
    store.update((d) => setExplanation(d, { lesson: "medians", text: "Written on the phone.", checked: null, updated: Date.now() + 1 }));
    expect(field.value).toBe("Written on the phone.");
  });

  it("moves an explanation an earlier version kept in this browser alone into the deck", () => {
    localStorage.setItem(`${LOCAL_EXPLAIN_KEY}medians`, JSON.stringify({ text: "Kept the old way.", review: null, sent: null }));
    const { field } = mount();
    expect(field.value).toBe("Kept the old way.");
    expect(explanationOf(store.get(), "medians")?.text).toBe("Kept the old way.");
    expect(localStorage.getItem(`${LOCAL_EXPLAIN_KEY}medians`)).toBeNull();
  });
});
