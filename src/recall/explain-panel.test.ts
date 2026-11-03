// @vitest-environment jsdom
//
// The Explain tab on a lesson page, against a DOM stand-in: an explanation is
// sent with the lesson and step on show, Claude's remarks land on its words,
// keys typed there never reach the lesson, and each lesson keeps its own.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Review } from "./check.ts";
import type { Place } from "./deck.ts";
import { EXPLAIN_STORAGE, mountExplain } from "./explain-panel.ts";
import type { ExplainRequest } from "./explain.ts";

let place: Place | null;
let pane: HTMLElement;
let canCheck: boolean;
let asked: ExplainRequest[];
let answer: (review: Review) => void;

function mount() {
  document.body.innerHTML = "";
  const column = { addPane: (_label: string, p: HTMLElement) => void document.body.append((pane = p)) };
  const sync = {
    canCheck: () => canCheck,
    explain: (request: ExplainRequest) => {
      asked.push(request);
      return new Promise<Review>((done) => (answer = done));
    },
  };
  const explain = mountExplain(column, () => place, sync);
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

  it("keeps keys typed in the pane from the lesson", () => {
    const { field } = mount();
    const heard = vi.fn();
    window.addEventListener("keydown", heard);
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    window.removeEventListener("keydown", heard);
    expect(heard).not.toHaveBeenCalled();
  });

  it("says where to give the sync key when this browser has none", () => {
    canCheck = false;
    mount();
    expect(pane.querySelector<HTMLElement>(".explain-row")!.hidden).toBe(true);
    expect(pane.querySelector<HTMLElement>(".explain-key")!.hidden).toBe(false);
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
    expect(JSON.parse(localStorage.getItem(`${EXPLAIN_STORAGE}medians`)!).text).toBe("Medians meet.");
    expect(mount().field.value).toBe("Medians meet.");
  });
});
