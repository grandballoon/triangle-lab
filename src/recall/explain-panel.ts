// The Explain tab of a lesson page's step column: the learner explains the
// lesson's idea in their own words, and Claude checks what it shows they have
// understood (explain.ts). Claude's remarks are highlighted on the words they
// are about, from a layer behind the text box that lays the same text out the
// same way, and listed under it; correcting the explanation places them
// afresh (remarks.ts), so a remark on words since changed shows as dealt
// with. Pressing a remark picks out its words.
//
// Both kinds of lesson page mount it, as they do the recall pill: page.ts for
// a standalone lesson, the lab page's main.ts for a lab lesson, each saying
// where the learner is through `where`. Each lesson's explanation and Claude's
// last check of it are kept in the recall deck, which syncs them, so they are
// there to come back to on any device; a change made in another tab or on
// another device shows here as it arrives.
//
// The rules are pure (explain.ts, remarks.ts); this holds the state, renders
// it and does the I/O.

import "./explain.css";
import type { Review } from "./check.ts";
import { MAX_ANSWER, type Note, type Place } from "./deck.ts";
import {
  afterDeckChange,
  askCheck,
  checkedAsItStands,
  editExplanation,
  EMPTY_EXPLANATION,
  explanationIn,
  keepExplanation,
  moveLocalExplanation,
  settleCheck,
  UNDERSTANDING,
  type Explanation,
} from "./explain.ts";
import { submitsOnModEnter, touchFirst } from "./keys.ts";
import { lessonName, questionHtml, stepLabel } from "./labels.ts";
import { placeRemarks, remarkAt, runsOf } from "./remarks.ts";
import { openRecall, type RecallSync } from "./remote.ts";
import { mendLink, signInLink } from "./signin.ts";
import type { RecallStore } from "./store.ts";

/** Where an earlier version kept each lesson's explanation in this browser alone, after the lesson's slug; moved into the deck on mounting. */
export const LOCAL_EXPLAIN_KEY = "triangle-lab:explain:";

/** The page's deck and its sync, as openRecall gives them. */
interface Recall {
  store: Pick<RecallStore, "get" | "update" | "subscribe">;
  sync: Pick<RecallSync, "canCheck" | "explain" | "subscribe">;
}

/** The step column, which takes the pane under a tab of its own (lab/steps.ts). */
interface Column {
  addPane(label: string, pane: HTMLElement, onShow: () => void): void;
}

export interface ExplainPane {
  /** Show the lesson on show now, as after a lesson swap. */
  refresh(): void;
}

/** Add the Explain tab to `column`. `where` says which lesson and step are current; null leaves the pane empty. */
export function mountExplain(
  column: Column,
  where: () => Place | null,
  { store, sync }: Recall = openRecall(),
): ExplainPane {
  moveLocalExplanations(store);
  const doc = document;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  const pane = el("section", "explain");
  pane.setAttribute("role", "tabpanel");
  pane.setAttribute("aria-label", "Explain the idea");
  const ask = el("p", "explain-ask");
  const note = el(
    "p",
    "explain-note",
    "The whole lesson or one idea from it: what it says, and why it holds. Claude checks what you've understood and marks what to fix.",
  );
  const paper = el("div", "explain-paper");
  const marks = el("div", "explain-marks");
  marks.setAttribute("aria-hidden", "true");
  const field = el("textarea", "explain-text");
  field.rows = 5;
  field.maxLength = MAX_ANSWER;
  field.setAttribute("aria-label", "Your explanation");
  field.placeholder = "In your own words…";
  paper.append(marks, field);
  const check = el("button", "explain-check");
  check.type = "button";
  const hint = el("span", "explain-hint", touchFirst() ? "" : "⌘↵ or ctrl↵ to check");
  const row = el("div", "explain-row");
  row.append(hint, check);
  const signedOut = el("p", "explain-note explain-signin");
  signedOut.append(signInLink(document, ""), " to have Claude check it.");
  const said = el("div", "explain-said");
  said.setAttribute("aria-live", "polite");
  pane.append(ask, note, paper, row, signedOut, said);

  /** Each lesson's explanation this page has shown, by slug, read from the deck on first showing. */
  const states = new Map<string, Explanation>();
  let slug: string | null = null;
  let places = placeRemarks("", []);

  const stateOf = (lesson: string): Explanation => {
    let state = states.get(lesson);
    if (!state) {
      state = explanationIn(store.get(), lesson);
      states.set(lesson, state);
    }
    return state;
  };

  // Storage blocked: the store keeps it for as long as the page is open.
  const set = (lesson: string, state: Explanation): void => {
    states.set(lesson, state);
    store.update((deck) => keepExplanation(deck, lesson, state, Date.now()));
  };

  const current = (): Explanation => (slug ? stateOf(slug) : EMPTY_EXPLANATION);

  const showActive = (): void => {
    const active = doc.activeElement === field ? remarkAt(places, field.selectionStart) : null;
    for (const node of pane.querySelectorAll<HTMLElement>("[data-remark]")) {
      node.classList.toggle("explain-active", Number(node.dataset.remark) === active);
    }
  };

  // The box grows with the explanation; the pane scrolls past that.
  const fit = (): void => {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight + 2}px`;
  };

  const paint = (): void => {
    const state = current();
    const review = state.review;
    const remarks: readonly Note[] = review?.kind === "done" ? (review.verdict.remarks ?? []) : [];
    places = placeRemarks(field.value, remarks);
    marks.replaceChildren(
      ...runsOf(field.value, places).map(({ text, remark }) => {
        if (remark === null) return doc.createTextNode(text);
        const mark = el("mark", "", text);
        mark.dataset.remark = String(remark);
        return mark;
      }),
    );
    const order = places
      .map((place, i) => ({ place, i }))
      .sort((a, b) => (a.place?.start ?? Infinity) - (b.place?.start ?? Infinity));
    said.replaceChildren(
      ...(review ? [overall(review, !checkedAsItStands(state))] : []),
      ...order.map(({ place, i }) =>
        remarkCard(remarks[i], i, place === null, () => {
          if (!place) return;
          field.focus();
          field.setSelectionRange(place.start, place.end);
          showActive();
        }),
      ),
    );
    const canCheck = sync.canCheck();
    row.hidden = !canCheck;
    signedOut.hidden = canCheck;
    check.textContent = review ? "Check again" : "Check with Claude";
    check.disabled = !field.value.trim() || (checkedAsItStands(state) && review?.kind !== "failed");
    fit();
    showActive();
  };

  const refresh = (): void => {
    const here = where();
    const lesson = here?.lesson ?? null;
    ask.replaceChildren();
    if (here) {
      ask.append("Explain ", el("strong", "", lessonName(here.lesson)), " in your own words.");
    }
    if (lesson !== slug) {
      slug = lesson;
      field.value = current().text;
    }
    field.disabled = lesson === null;
    paint();
  };

  const submit = async (): Promise<void> => {
    const here = where();
    if (!here || !slug || !sync.canCheck()) return;
    const lesson = slug;
    const asked = askCheck(stateOf(lesson));
    if (asked === stateOf(lesson)) return;
    set(lesson, asked);
    paint();
    const sent = asked.sent ?? "";
    const review = await sync.explain({ lesson, step: stepLabel(here), text: sent });
    // The lesson may have been swapped while Claude read it; the check is kept with its own.
    set(lesson, settleCheck(stateOf(lesson), sent, review));
    if (lesson === slug) paint();
  };

  field.addEventListener("input", () => {
    if (!slug) return;
    set(slug, editExplanation(stateOf(slug), field.value));
    paint();
  });
  field.addEventListener("keydown", (e) => {
    if (e.key === "Escape") field.blur();
    else if (submitsOnModEnter(e)) {
      e.preventDefault();
      void submit();
    }
  });
  for (const type of ["select", "click", "keyup", "focus", "blur"]) field.addEventListener(type, showActive);
  check.addEventListener("click", () => void submit());

  // Keys typed in the pane are the learner's, not the lesson's shortcuts.
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    pane.addEventListener(type, (e) => e.stopPropagation());
  }

  // Another tab or device changed an explanation this page has shown.
  store.subscribe((deck) => {
    for (const [lesson, state] of states) {
      const next = afterDeckChange(deck, lesson, state);
      if (next === state) continue;
      states.set(lesson, next);
      if (lesson === slug) {
        field.value = next.text;
        paint();
      }
    }
  });

  // Signing in or out, here or in another tab, shows or hides the check.
  sync.subscribe(() => paint());

  column.addPane("Explain", pane, () => {
    refresh();
    if (!touchFirst()) field.focus();
  });
  refresh();
  return { refresh };
}

/** Claude's check as a whole: under way, its feedback, or why there is none; `stale` once the explanation has changed since. */
function overall(review: Review, stale: boolean): HTMLElement {
  const box = document.createElement("div");
  box.className = "explain-remark explain-overall";
  box.setAttribute("role", "status");
  const head = document.createElement("h3");
  const text = document.createElement("p");
  text.className = "explain-feedback";
  box.append(head, text);
  if (review.kind === "done") {
    box.dataset.grade = review.verdict.grade;
    head.textContent = `Claude · ${UNDERSTANDING[review.verdict.grade]}`;
    text.innerHTML = questionHtml(review.verdict.feedback);
    if (stale) box.append(quiet("You've changed it since. Check it again to have it read as it stands."));
  } else {
    head.textContent = "Claude";
    text.classList.add("explain-quiet");
    text.textContent = review.kind === "checking" ? "Reading your explanation…" : review.error;
    if (review.kind === "failed" && review.mend) box.append(mendLink(document, review.mend, "explain-sign-in"));
  }
  return box;
}

/** One remark, quoting its words; `gone` once they have been changed. */
function remarkCard(remark: Note, index: number, gone: boolean, show: () => void): HTMLElement {
  const box = document.createElement("div");
  box.className = gone ? "explain-remark explain-gone" : "explain-remark";
  box.dataset.remark = String(index);
  const quote = document.createElement("p");
  quote.className = "explain-quote";
  quote.textContent = remark.quote;
  const note = document.createElement("p");
  note.className = "explain-remark-note";
  note.innerHTML = questionHtml(remark.note);
  box.append(quote, note);
  if (gone) {
    const done = document.createElement("p");
    done.className = "explain-done";
    done.textContent = "Changed";
    box.append(done);
  } else box.addEventListener("click", show);
  return box;
}

function quiet(text: string): HTMLElement {
  const p = document.createElement("p");
  p.className = "explain-remark-note explain-quiet";
  p.textContent = text;
  return p;
}

/** Move the explanations an earlier version kept in this browser alone into the deck, which syncs them. */
function moveLocalExplanations(store: Recall["store"]): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? "");
    for (const key of keys.filter((k) => k.startsWith(LOCAL_EXPLAIN_KEY))) {
      const lesson = key.slice(LOCAL_EXPLAIN_KEY.length);
      const raw = readJson(localStorage.getItem(key));
      if (store.update((deck) => moveLocalExplanation(deck, lesson, raw))) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing kept to move.
  }
}

function readJson(text: string | null): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
