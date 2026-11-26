// The answers document on the recall page: each question a heading with a
// button to have Claude check its answer, the answer written straight under
// it, Claude's remarks on its words, and a bar that unfolds the question's
// history. Highlighting a stretch of an answer offers to check that passage.
//
// Every edit is kept as it is typed. A change from another tab or device is
// taken in place: the answer being typed in is left alone, and the sections
// are drawn again only when their headings or histories have changed, keeping
// the learner's place.
//
// The document's shape and rules are pure (answers.ts); this draws it, keeps
// edits and makes the calls.

import {
  answerDocument,
  checkedPassage,
  checkIsStale,
  checkRequestFor,
  passageOf,
  sameOutline,
  settleCheck,
  type AnswerPart,
  type AnswerSection,
} from "./answers.ts";
import type { CheckRequest, Failed, Review } from "./check.ts";
import { MAX_RESPONSE, setResponse, setResponseCheck, type Deck } from "./deck.ts";
import { button, el } from "./dom.ts";
import { questionHtml } from "./labels.ts";
import { placeRemarks, runsOf } from "./remarks.ts";
import { answerHistory, GRADE_LABEL, remarkCard } from "./sheet.ts";
import { mendLink } from "./signin.ts";
import type { RecallStore } from "./store.ts";

export interface AnswersView {
  element: HTMLElement;
  /** Take in the deck as it now stands. */
  refresh(deck: Deck): void;
  /** Size each answer to its text, once the document is on the page or its width has changed. */
  layout(): void;
}

/** Where Claude is asked. */
export interface Checker {
  check(request: CheckRequest): Promise<Review>;
}

/** A check under way, or one that failed; one that came back is kept in the deck. */
interface Asking {
  request: CheckRequest;
  state: { kind: "checking" } | Failed;
}

/** A section as drawn. */
interface Drawn {
  section: AnswerSection;
  paper: HTMLElement;
  marks: HTMLElement;
  field: HTMLTextAreaElement;
  checkButton: HTMLButtonElement;
  result: HTMLElement;
}

export function answersView(store: RecallStore, checker: Checker): AnswersView {
  const element = el("article", "rc-document");
  const warning = el("p", "rc-notice rc-error rc-document-warning", "This browser won't keep your latest edits after the page closes.");
  warning.hidden = true;
  const body = el("div");
  element.append(warning, body);
  const doc = element.ownerDocument;

  const drawn = new Map<string, Drawn>();
  const asking = new Map<string, Asking>();
  const historyOpen = new Set<string>();
  let shown: AnswerPart[] = [];
  /** The highlighted stretch the popup is offering to check. */
  let selected: { id: string; from: number; to: number } | null = null;
  /** The highlight last acted on or waved away, which is not offered again until it changes. */
  let spent: { id: string; from: number; to: number } | null = null;
  /** A selection is being dragged out, so the popup waits for it to end. */
  let dragging = false;

  const popup = button("Check with Claude", "rc-small rc-primary rc-document-popup", () => {
    if (!selected) return;
    const { id, from, to } = selected;
    dismissPopup();
    ask(id, { from, to });
  });
  popup.hidden = true;
  // Pressing it must not take the highlight off the answer.
  popup.addEventListener("mousedown", (e) => e.preventDefault());
  popup.addEventListener("blur", hidePopup);
  popup.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const field = selected && drawn.get(selected.id)?.field;
    dismissPopup();
    field?.focus();
  });

  function hidePopup(): void {
    selected = null;
    popup.hidden = true;
  }

  /** Hide the popup, and do not offer this highlight again. */
  function dismissPopup(): void {
    spent = selected;
    hidePopup();
  }

  /** Offer to check what is highlighted in `d`'s answer, if anything. */
  function offer(d: Drawn): void {
    if (dragging) return;
    const { field, section } = d;
    const [from, to] = [field.selectionStart, field.selectionEnd];
    if (doc.activeElement !== field || !passageOf(field.value, from, to)) {
      if (selected?.id === section.id) hidePopup();
      if (spent?.id === section.id) spent = null;
      return;
    }
    if (spent?.id === section.id && spent.from === from && spent.to === to) return;
    spent = null;
    selected = { id: section.id, from, to };
    d.paper.append(popup);
    popup.hidden = false;
    placePopup(popup, d, from, to);
  }

  /** Have Claude check section `id`'s answer as it stands, or the stretch of it given. */
  function ask(id: string, selection: { from: number; to: number } | null): void {
    const d = drawn.get(id);
    const request = d && checkRequestFor(d.section, d.field.value, selection);
    if (!d || !request) return;
    const mine: Asking = { request, state: { kind: "checking" } };
    asking.set(id, mine);
    paint(d);
    void checker.check(request).then((review) => {
      // A newer check of this section has taken over.
      if (asking.get(id) !== mine) return;
      if (review.kind === "done") {
        asking.delete(id);
        store.update((deck) => settleCheck(deck, id, request, review.verdict, Date.now()));
      } else if (review.kind === "failed") {
        mine.state = review;
      }
      const now = drawn.get(id);
      if (now) paint(now);
    });
  }

  /** Draw what depends on the answer as it stands and on Claude's check of it. */
  function paint(d: Drawn): void {
    const { field, section, marks, result, checkButton } = d;
    const check = asking.has(section.id) ? null : section.checked;
    const remarks = check?.verdict.remarks ?? [];
    const places = placeRemarks(field.value, remarks);
    marks.replaceChildren(
      ...runsOf(field.value, places).map(({ text, remark }) => (remark === null ? doc.createTextNode(text) : el("mark", "", text))),
    );
    const busy = asking.get(section.id)?.state.kind === "checking";
    checkButton.disabled = busy || !field.value.trim();
    checkButton.textContent = busy ? "Checking…" : "Check";

    const under = asking.get(section.id);
    if (under) {
      result.replaceChildren(askingCard(under));
    } else if (check) {
      const passage = checkedPassage(check);
      const box = resultCard(`Claude's check · ${GRADE_LABEL[check.verdict.grade].toLowerCase()}`, passage, () => {
        store.update((deck) => setResponseCheck(deck, section.id, null, Date.now()));
      });
      const said = el("p", "rc-said rc-feedback");
      said.innerHTML = questionHtml(check.verdict.feedback);
      box.append(said);
      if (checkIsStale(check, field.value)) {
        box.append(el("p", "rc-remark-note rc-quiet", "You've changed this answer since. Check it again to have it read as it stands."));
      }
      result.replaceChildren(
        box,
        ...remarks.map((remark, i) =>
          remarkCard(remark, i, places[i] === null, () => {
            const place = places[i];
            if (!place) return;
            field.focus();
            field.setSelectionRange(place.start, place.end);
          }),
        ),
      );
    } else {
      result.replaceChildren();
    }
  }

  /** A check under way, or why it failed, with the way to mend it. */
  function askingCard({ request, state }: Asking): HTMLElement {
    const passage = checkedPassage({ text: request.answer, span: request.span });
    const box = resultCard("Claude's check", passage, null);
    if (state.kind === "checking") {
      box.setAttribute("role", "status");
      box.append(el("p", "rc-said rc-quiet", passage ? "Reading this passage…" : "Reading your answer…"));
    } else {
      box.append(el("p", "rc-said rc-quiet", state.error));
      if (state.mend) box.append(mendLink(doc, state.mend, "rc-source"));
    }
    return box;
  }

  function sectionNode(section: AnswerSection): HTMLElement {
    const block = el("section", "rc-document-section");
    const heading = el("h3");
    heading.innerHTML = questionHtml(section.question);
    const checkButton = button("Check", "rc-small", () => ask(section.id, null));
    checkButton.title = "Have Claude check this answer";
    checkButton.setAttribute("aria-label", `Check answer to: ${section.question}`);
    const head = el("div", "rc-document-head");
    head.append(heading, checkButton);

    const paper = el("div", "rc-document-paper");
    const marks = el("div", "rc-document-marks");
    marks.setAttribute("aria-hidden", "true");
    const field = el("textarea", "rc-document-answer");
    field.rows = 1;
    field.maxLength = MAX_RESPONSE;
    field.value = section.text;
    field.placeholder = "Write your answer…";
    field.setAttribute("aria-label", `Answer to: ${section.question}`);
    paper.append(marks, field);

    const result = el("div", "rc-document-check");
    const d: Drawn = { section, paper, marks, field, checkButton, result };
    field.addEventListener("input", () => {
      warning.hidden = store.update((deck) => setResponse(deck, d.section.id, field.value, Date.now()));
      hidePopup();
      fit(field);
      paint(d);
    });
    field.addEventListener("pointerdown", () => {
      dragging = true;
      hidePopup();
      const done = (): void => {
        dragging = false;
        window.removeEventListener("pointerup", done);
        window.removeEventListener("pointercancel", done);
        // The selection settles once the press has ended.
        setTimeout(() => offer(d));
      };
      window.addEventListener("pointerup", done);
      window.addEventListener("pointercancel", done);
    });
    for (const type of ["select", "selectionchange", "keyup"]) field.addEventListener(type, () => offer(d));
    field.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && selected) dismissPopup();
    });
    field.addEventListener("blur", (e) => {
      if (e.relatedTarget !== popup) hidePopup();
    });

    drawn.set(section.id, d);
    block.append(head, paper, result, historyBar(section));
    paint(d);
    return block;
  }

  /** The bar at the foot of a section that unfolds its history, staying open over redraws. */
  function historyBar(section: AnswerSection): HTMLElement {
    const bar = el("details", "rc-document-history");
    bar.open = historyOpen.has(section.id);
    bar.addEventListener("toggle", () => {
      if (bar.open) historyOpen.add(section.id);
      else historyOpen.delete(section.id);
    });
    const count = section.attempts.length;
    bar.append(
      el("summary", "", `History · ${count} ${count === 1 ? "answer" : "answers"}`),
      count > 0 ? answerHistory(section.attempts) : el("p", "rc-note", "Not answered in a review yet."),
    );
    return bar;
  }

  function draw(next: AnswerPart[]): void {
    hidePopup();
    drawn.clear();
    if (next.length === 0) {
      body.replaceChildren(el("p", "rc-note", "No questions yet."));
      return;
    }
    body.replaceChildren(
      ...next.map((part) => {
        const lesson = el("section", "rc-document-lesson");
        lesson.append(el("h2", "", part.title), ...part.sections.map(sectionNode));
        return lesson;
      }),
    );
  }

  const layout = (): void => {
    hidePopup();
    drawn.forEach((d) => fit(d.field));
  };

  /** The section being typed in, and where in it, to come back to after a redraw. */
  const place = (): { id: string; from: number; to: number } | null => {
    for (const [id, { field }] of drawn) {
      if (field === doc.activeElement) return { id, from: field.selectionStart, to: field.selectionEnd };
    }
    return null;
  };

  const refresh = (deck: Deck): void => {
    const next = answerDocument(deck);
    if (!sameOutline(shown, next)) {
      const was = place();
      draw(next);
      layout();
      const field = was && drawn.get(was.id)?.field;
      if (field && was) {
        field.focus();
        field.setSelectionRange(was.from, was.to);
      }
    } else {
      for (const section of next.flatMap((part) => part.sections)) {
        const d = drawn.get(section.id);
        if (d) takeIn(d, section);
      }
    }
    shown = next;
  };

  /** Take in a section's answer and check as they now stand, leaving the answer being typed in alone. */
  function takeIn(d: Drawn, section: AnswerSection): void {
    const checkChanged = JSON.stringify(d.section.checked) !== JSON.stringify(section.checked);
    d.section = section;
    const textChanged = d.field !== doc.activeElement && d.field.value !== section.text;
    if (textChanged) {
      d.field.value = section.text;
      fit(d.field);
    }
    if (textChanged || checkChanged) paint(d);
  }

  shown = answerDocument(store.get());
  draw(shown);
  return { element, refresh, layout };
}

/** A card for Claude's check, naming the passage it is of, with a way to clear it if given. */
function resultCard(title: string, passage: string | null, clear: (() => void) | null): HTMLElement {
  const box = el("div", "rc-remark rc-overall");
  const head = el("div", "rc-document-check-head");
  head.append(el("h3", "", title));
  if (clear) {
    const dismiss = button("Clear", "rc-small", clear);
    dismiss.title = "Clear Claude's check and its highlights";
    head.append(dismiss);
  }
  box.append(head);
  if (passage) box.append(el("p", "rc-remark-quote", passage));
  return box;
}

/** Put the popup over the first line highlighted, or under the last on a touch screen, whose own menu goes above. */
function placePopup(popup: HTMLElement, d: Drawn, from: number, to: number): void {
  const rects = selectionRects(d.marks, from, to);
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const anchor = touch ? rects.at(-1) : rects[0];
  const paper = d.paper.getBoundingClientRect();
  if (!anchor) {
    popup.style.left = "0px";
    popup.style.top = "0px";
    return;
  }
  const centred = anchor.left - paper.left + anchor.width / 2 - popup.offsetWidth / 2;
  popup.style.left = `${Math.max(0, Math.min(centred, paper.width - popup.offsetWidth))}px`;
  popup.style.top = `${touch ? anchor.bottom - paper.top + 8 : anchor.top - paper.top - popup.offsetHeight - 6}px`;
}

/** Where the words `from`..`to` are on screen, from the layer that lays the answer out the same way. */
function selectionRects(marks: HTMLElement, from: number, to: number): DOMRect[] {
  const range = marks.ownerDocument.createRange();
  const walker = marks.ownerDocument.createTreeWalker(marks, NodeFilter.SHOW_TEXT);
  let at = 0;
  let started = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const end = at + node.length;
    if (!started && from <= end) {
      range.setStart(node, from - at);
      started = true;
    }
    if (started && to <= end) {
      range.setEnd(node, to - at);
      return typeof range.getClientRects === "function" ? [...range.getClientRects()] : [];
    }
    at = end;
  }
  return [];
}

function fit(field: HTMLTextAreaElement): void {
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
}
