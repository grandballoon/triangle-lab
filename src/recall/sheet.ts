// The learner's writing marked up by Claude, as comments on a document: the
// box they write in, with the words Claude remarked on highlighted in it and
// its remarks in a margin, and an answer as it was given, with what Claude
// said of it. Shared by the recall page (page.ts) and the review beside a
// lesson (beside.ts); styled by sheet.css.

import "./sheet.css";
import { hrefOf, lessons, type Lesson } from "../lessons.ts";
import type { Grade, Note, Verdict } from "./deck.ts";
import { el } from "./dom.ts";
import { lessonLabel, questionHtml } from "./labels.ts";
import { placeRemarks, remarkAt, runsOf, stack } from "./remarks.ts";

export const GRADE_LABEL: Record<Grade, string> = {
  missed: "Missed it",
  shaky: "Shaky",
  recalled: "Recalled it",
};

/** A link opening `lesson` in a new tab. */
export function lessonLink(lesson: Lesson, text: string, cls: string): HTMLAnchorElement {
  const link = el("a", cls, text);
  link.href = hrefOf(lesson);
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

/** What a box of the learner's writing, marked up by Claude, holds and does. */
export interface SheetSpec {
  text: string;
  label: string;
  placeholder: string;
  rows: number;
  maxLength?: number;
  /** Whether Claude's remarks are on the words, and the margin is shown. */
  marking: boolean;
  remarks: readonly Note[];
  /** The card at the head of the margin, for the writing as it now stands. */
  head: () => HTMLElement | null;
  /** Under the box. */
  controls: HTMLElement;
  /** Each change to the writing, before the remarks are placed afresh against it. */
  onInput: (text: string) => void;
  onKey: (e: KeyboardEvent, field: HTMLTextAreaElement) => void;
  /** After each change, and after the remarks are placed against the writing as it now stands. */
  painted: (text: string) => void;
  /** Whether the margin is beside the box, each remark by its words, rather than under it; the stylesheet draws it to match. */
  sideBySide: () => boolean;
  /** The height the learner dragged the box to, kept over redraws; null to fit the writing. */
  height: { get(): number | null; set(height: number): void };
}

/**
 * The learner's writing, in one box that stays open to correct. While it is
 * marked, the words Claude remarked on are highlighted in it, as comments
 * are in a document, and the remarks are beside it (`sideBySide`), or
 * under it on a narrower screen, each as near its words as it fits. Editing
 * the writing places them afresh against it, so a remark on words since
 * changed shows as dealt with.
 */
/** The sheet, and how to lay its margin out again, as when the window is resized. */
export function writingSheet(spec: SheetSpec): { sheet: HTMLElement; layout: () => void } {
  const { marking, remarks } = spec;
  const sheet = el("div", marking ? "rc-sheet rc-checking" : "rc-sheet");
  const paper = el("div", "rc-paper");
  const marks = el("div", "rc-marks");
  marks.setAttribute("aria-hidden", "true");
  const field = el("textarea", "rc-answer");
  field.rows = spec.rows;
  if (spec.maxLength) field.maxLength = spec.maxLength;
  field.setAttribute("aria-label", spec.label);
  field.value = spec.text;
  field.placeholder = spec.placeholder;
  paper.append(marks, field);
  const margin = el("aside", "rc-margin");
  margin.setAttribute("aria-label", "Claude's check");
  const left = el("div", "rc-sheet-main");
  left.append(paper, spec.controls);
  sheet.append(left, margin);

  let places = placeRemarks(field.value, remarks);

  const showActive = (): void => {
    const active = document.activeElement === field ? remarkAt(places, field.selectionStart) : null;
    for (const node of sheet.querySelectorAll<HTMLElement>("[data-remark]")) {
      node.classList.toggle("rc-active", Number(node.dataset.remark) === active);
    }
  };

  const layout = (): void => {
    const cards = [...margin.children] as HTMLElement[];
    if (!spec.sideBySide()) {
      for (const c of cards) c.style.top = "";
      margin.style.height = "";
      return;
    }
    // By the words as they are scrolled to, kept within the box.
    const wanted = cards.map((c) => {
      const words = c.dataset.remark === undefined ? null : marks.querySelector<HTMLElement>(`mark[data-remark="${c.dataset.remark}"]`);
      return words ? Math.min(Math.max(words.offsetTop - marks.scrollTop, 0), paper.offsetHeight) : 0;
    });
    const tops = stack(wanted, cards.map((c) => c.offsetHeight), 10);
    cards.forEach((c, i) => (c.style.top = `${tops[i]}px`));
    margin.style.height = cards.length > 0 ? `${tops.at(-1)! + cards.at(-1)!.offsetHeight}px` : "";
  };

  const paint = (): void => {
    const text = field.value;
    places = placeRemarks(text, remarks);
    marks.replaceChildren(
      ...runsOf(text, places).map(({ text: words, remark }) => {
        if (remark === null) return document.createTextNode(words);
        const mark = el("mark", "", words);
        mark.dataset.remark = String(remark);
        return mark;
      }),
    );
    const order = places
      .map((place, i) => ({ place, i }))
      .sort((a, b) => (a.place?.start ?? Infinity) - (b.place?.start ?? Infinity));
    const head = marking ? spec.head() : null;
    margin.replaceChildren(
      ...(head ? [head] : []),
      ...order.map(({ place, i }) => remarkCard(remarks[i], i, place === null, () => {
        if (!place) return;
        field.focus();
        field.setSelectionRange(place.start, place.end);
        showActive();
      })),
    );
    spec.painted(text);
    showActive();
    fit();
    requestAnimationFrame(() => {
      fit();
      layout();
    });
  };

  // The box fits the writing up to most of the window, and scrolls past that;
  // the learner can drag it to any height, which it keeps. The highlights
  // behind it scroll with it, and leave room for its scroll bar, so its lines
  // break where the box's do.
  let fitted = 0;
  const fit = (): void => {
    if (!field.isConnected) return;
    const dragged = spec.height.get();
    if (dragged !== null) field.style.height = `${dragged}px`;
    else {
      field.style.height = "auto";
      const most = Math.max(window.innerHeight * 0.6, 110);
      field.style.height = `${Math.min(field.scrollHeight + 2, most)}px`;
    }
    fitted = field.offsetHeight;
    follow();
  };
  const follow = (): void => {
    marks.style.paddingRight = `${13 + Math.max(field.offsetWidth - field.clientWidth - 2, 0)}px`;
    marks.scrollTop = field.scrollTop;
  };
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (!field.isConnected) return;
      // Not the height fit() set: the learner dragged the box.
      if (Math.abs(field.offsetHeight - fitted) > 1) spec.height.set((fitted = field.offsetHeight));
      follow();
      layout();
    }).observe(field);
  }
  field.addEventListener("scroll", () => {
    follow();
    layout();
  });

  field.addEventListener("input", () => {
    spec.onInput(field.value);
    if (marking) paint();
    else spec.painted(field.value);
  });
  field.addEventListener("keydown", (e) => spec.onKey(e, field));
  for (const type of ["select", "click", "keyup", "focus", "blur"]) field.addEventListener(type, showActive);

  paint();
  return { sheet, layout };
}

/** One remark, by its words, with a link to the lesson that teaches the point if it names one; `gone` once its words have been changed. */
export function remarkCard(remark: Note, index: number, gone: boolean, show: () => void): HTMLElement {
  const box = el("div", gone ? "rc-remark rc-gone" : "rc-remark");
  box.dataset.remark = String(index);
  const quote = el("p", "rc-remark-quote", remark.quote);
  const note = el("p", "rc-remark-note");
  note.innerHTML = questionHtml(remark.note);
  box.append(quote, note);
  const lesson = remark.lesson && lessons.find((l) => l.slug === remark.lesson);
  if (lesson && !gone) {
    const link = lessonLink(lesson, `${lessonLabel(lesson.slug)} ↗`, "rc-remark-lesson");
    // Opening the lesson is not picking out the remark's words.
    link.addEventListener("click", (e) => e.stopPropagation());
    box.append(link);
  }
  if (gone) box.append(el("p", "rc-remark-done", "Changed"));
  else box.addEventListener("click", show);
  return box;
}

/**
 * An answer as it was given, with what Claude said of it if kept: the words
 * it remarked on marked, and the remarks under it, then its feedback.
 */
export function saidSheet(answer: string, verdict: Verdict | undefined): HTMLElement {
  const box = el("div", "rc-said-sheet");
  const remarks = verdict?.remarks ?? [];
  const places = placeRemarks(answer, remarks);
  const said = saidAnswer(answer);
  if (answer.trim() && remarks.length > 0) {
    said.replaceChildren(
      ...runsOf(answer, places).map(({ text, remark }) => (remark === null ? document.createTextNode(text) : el("mark", "", text))),
    );
  }
  box.append(said);
  if (remarks.length > 0) {
    const list = el("ul", "rc-said-remarks");
    list.append(
      ...remarks.map((r) => {
        const item = el("li");
        const note = el("span", "rc-remark-note");
        note.innerHTML = questionHtml(r.note);
        item.append(el("span", "rc-remark-quote", r.quote), note);
        return item;
      }),
    );
    box.append(list);
  }
  if (verdict) box.append(claudeSaid(verdict.grade, verdict.feedback, "Claude"));
  return box;
}

/** An answer as the learner gave it, or a note that it was given in the head. */
export function saidAnswer(answer: string): HTMLParagraphElement {
  return answer.trim() ? el("p", "rc-said", answer) : el("p", "rc-said rc-quiet", "Answered in your head.");
}

/** Claude's feedback, typeset, under a heading naming the grade it gave. */
export function claudeSaid(grade: Grade, feedback: string, heading: string): HTMLElement {
  const box = el("div", "rc-yours");
  const said = el("p", "rc-said rc-feedback");
  said.innerHTML = questionHtml(feedback);
  box.append(el("h3", "", `${heading} · ${GRADE_LABEL[grade].toLowerCase()}`), said);
  return box;
}
