// The recall page (recall.html): every question noted in the lessons, and
// review sittings that ask them back.
//
// Out of a sitting, the page lists the questions by lesson, with when each is
// due, and lets the learner reword, delete or mark them to revisit, or save and restore the
// whole set as a file, and shows how syncing with the learner's other
// devices stands, taking the sync key when it has none. In a sitting it asks
// one due question at a time: the learner answers from memory, then checks
// (their last answer, and a link that opens the lesson at the step the
// question came from, in this tab, with the card beside it: beside.ts) and
// corrects the answer in place until it is right,
// then says how it went: right first time, fixed, or still struggling, which
// schedules the question's next asking. Any question asked can be marked to
// revisit, as one the learner blanks out on: the marked ones are listed
// together at the head of the overview, to practise on their own, until the
// learner takes the mark off. Once the browser has the sync key,
// a written answer is also read by Claude as the learner checks it, and again
// each time they ask as they correct it (check.ts): its remarks are on the
// words they are about, as comments on a document (remarks.ts), and the
// outcome its reading points to is marked, but the learner still picks it.
// On an answer that was not right first time, Claude's reading is kept with
// it: the next time the question is checked it is shown again, and each
// question's history lists every answer with what Claude said.
//
// While checking, the learner can reword the question, which has Claude read
// the answer afresh, and write new questions from the same step, so what
// Claude said can become questions of their own; those wait for the next
// sitting.
//
// Apart from the questions, the learner can free associate: write down all
// they remember of the course, and have Claude read it (associate.ts). Its
// remarks are on the words, as on an answer, each with the lesson that
// teaches the point, and it names the lessons that are the shortest next
// step. The writing and Claude's reading are kept in the browser, to come
// back to and correct.
//
// The rules are pure (deck.ts, session.ts, associate.ts). The sitting is
// held by sitting.ts and its card drawn by card.ts, both shared with the
// review beside a lesson; this file holds the rest of the page's state,
// renders it and does the I/O.

import "katex/dist/katex.min.css";
// Before page.css, which sizes some of its pieces for the page.
import "./sheet.css";
import "./page.css";
import {
  dueCards,
  editCard,
  GRADES,
  loadDeck,
  markRevisit,
  MAX_WRITING,
  mergeDecks,
  nextDue,
  removeCard,
  revisitCards,
  saveDeck,
  setWriting,
  type Card,
  type Deck,
  type Grade,
  type Writing,
} from "./deck.ts";
import { lessons } from "../lessons.ts";
import {
  askReading,
  EMPTY_ASSOCIATION,
  editWriting,
  fromWriting,
  notedLessons,
  readAsWritten,
  settleReading,
  readLocalAssociation,
  toWriting,
  type Association,
  type ReadingState,
} from "./associate.ts";
import { cardParts } from "./card.ts";
import { button, confirmButton, el, redraw, row, typing } from "./dom.ts";
import {
  answeredLabel,
  byLesson,
  gradeHint,
  lessonLabel,
  placeLabel,
  questionHtml,
  sourceHref,
  stepLabel,
  whenLabel,
} from "./labels.ts";
import { progress, suggestedGrade, type Session } from "./session.ts";
import { GRADE_LABEL, lessonLink, saidSheet, writingSheet } from "./sheet.ts";
import { HeldSitting } from "./sitting.ts";
import { submitsOnEnter, submitsOnModEnter, touchFirst } from "./keys.ts";
import { openRecall } from "./remote.ts";
import { syncLabel } from "./sync.ts";

/** What each grade means once an answer has been checked and corrected: the learner's three ways out of a card. */
const OUTCOME: Record<Grade, string> = {
  missed: "Still struggling",
  shaky: "Fixed it",
  recalled: "Got it right",
};

/** When Claude's remarks go beside the answer rather than under it; sheet.css and page.css widen the page to match. */
const SIDE_BY_SIDE = "(min-width: 1000px)";

/** Where an earlier version of the page kept the free association, in this browser alone; moved into the deck on load. */
const LOCAL_ASSOCIATION_KEY = "triangle-lab:recall-association";

/**
 * Where the tab notes that it is on the free association, so a reload comes
 * back to it: "reading" while Claude is reading it, so a reload asks again.
 */
const ASSOCIATING_KEY = "triangle-lab:recall-associating";

const { store, sync } = openRecall();
const root = document.getElementById("recall") as HTMLElement;

/** The sitting under way, if any, kept for the tab; the overview or the free association is on show without one. */
const held = new HeldSitting(store, sync, tabStorage(), () => render());
// Coming back from checking an answer in the lesson: the sitting is here again.
held.inLesson(false);
const tab = held.session ? null : readAssociating();
/** Whether the free association is on show, rather than the overview. */
let associating = tab !== null;
moveLocalAssociation();
/** The free association, as written and read so far. */
let association: Association = fromWriting(store.get().writing);
/** The free association as last kept in the deck from this page, or taken from it. */
let heard: Writing | undefined = store.get().writing;
/** The free association was just opened, and its box takes the focus at the next render. */
let writingOpened = false;
/** The height the learner dragged the free association's box to, kept over redraws; null to fit the writing. */
let writingHeight: number | null = null;
/** The question being reworded on the overview, and its new wording so far. */
let editing: { id: string; text: string } | null = null;
/** Questions whose history of answers is open on the overview. */
const historyOpen = new Set<string>();
/** A line about the last export or import, and whether it went wrong. */
let notice: { text: string; error: boolean } | null = null;
/** Lays the margin of the writing on show out again, as when the window is resized. */
let relayout: (() => void) | null = null;

store.subscribe((deck) => {
  // Another device's free association, newer than this one's, has been
  // merged in, or another tab's.
  if (JSON.stringify(deck.writing ?? null) !== JSON.stringify(heard ?? null)) {
    heard = deck.writing;
    association = fromWriting(deck.writing);
    if (associating) {
      render();
      return;
    }
  }
  // The free association does not show the deck; redrawing it would only
  // disturb the writing. A sitting hears what concerns it itself (sitting.ts).
  if (associating || held.session) return;
  render();
});

// How syncing stands is shown on the overview only, and redrawn alone, so
// a sync never disturbs a question being reworded.
sync.subscribe(() => {
  if (!held.session) root.querySelector(".rc-keep")?.replaceWith(keeping(store.get()));
});

window.addEventListener("resize", () => relayout?.());

window.addEventListener("keydown", (e) => {
  if (held.session?.phase !== "check" || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
  const grade = GRADES[Number(e.key) - 1];
  if (grade) {
    e.preventDefault();
    gradeAnswer(grade);
  }
});

// A page the browser kept while the sitting was taken to the lesson comes
// back with the sitting as it was then; take it up as it is now.
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  held.restore();
  held.inLesson(false);
  render();
});

// Writing being read lost that request with the page (a sitting asks again itself).
if (tab === "reading") readWriting();
render();

// --- State changes ------------------------------------------------------------

function begin(cards: readonly Card[]): void {
  associating = false;
  held.begin(cards);
  editing = null;
  notice = null;
  render();
}

function gradeAnswer(grade: Grade): void {
  held.grade(grade);
  render();
}

/**
 * Mark a card to revisit, or take the mark off. In a sitting the store's
 * change does not redraw it (only a removal does), so this does.
 */
function toggleRevisit(card: Card): void {
  store.update((d) => markRevisit(d, card.id, card.revisit === undefined, Date.now()));
  render();
}

/** Move on from the card on show without answering it; its place in the deck is untouched. */
function skip(): void {
  held.skip();
  render();
}

function end(): void {
  held.end();
  associating = false;
  render();
  window.scrollTo({ top: 0 });
}

/** Open the free association, as it was left. */
function associate(): void {
  associating = true;
  writingOpened = true;
  writingHeight = null;
  editing = null;
  notice = null;
  render();
  window.scrollTo({ top: 0 });
}

/**
 * Have Claude read the free association, as it now stands, unless it has
 * already been, or is being. Nothing is asked without the sync key. The
 * caller renders; the reply renders when it comes.
 */
function readWriting(): void {
  if (!sync.canCheck()) return;
  const asked = askReading(association);
  if (asked === association) return;
  association = asked;
  keepAssociation();
  const sent = asked.text;
  void sync.associate({ text: sent, noted: notedLessons(store.get()) }).then((state: ReadingState) => {
    const next = settleReading(association, sent, state);
    if (next === association) return;
    association = next;
    keepAssociation();
    if (associating) render();
  });
}

/** Start the free association afresh: the writing and Claude's reading of it are forgotten. */
function clearWriting(): void {
  association = EMPTY_ASSOCIATION;
  writingHeight = null;
  writingOpened = true;
  keepAssociation();
  render();
}

// --- Rendering ------------------------------------------------------------------

function render(): void {
  keepAssociating();
  const session = held.session;
  // An editor just opened takes the focus first; else the box written in
  // before, any editor, or the answer while it is asked for. While it is
  // checked, the answer is not focused unasked, so 1, 2 and 3 grade.
  redraw(
    root,
    () => root.replaceChildren(...(session ? sitting(session, store.get()) : associating ? freeAssociation(association) : overview(store.get()))),
    () => {
      const opened = held.editorOpened
        ? root.querySelector<HTMLTextAreaElement>(".rc-editor textarea")
        : writingOpened
          ? root.querySelector<HTMLTextAreaElement>(".rc-answer")
          : null;
      held.editorOpened = false;
      writingOpened = false;
      return opened;
    },
    () =>
      root.querySelector<HTMLTextAreaElement>(".rc-editor textarea") ??
      (session?.phase === "ask" ? root.querySelector<HTMLTextAreaElement>(".rc-answer") : null),
  );
}

function overview(deck: Deck): HTMLElement[] {
  const now = Date.now();
  const due = dueCards(deck, now);
  const total = deck.cards.length;

  const summary = el("section", "rc-summary");
  const freely = button("Free associate", "", associate);
  freely.title = "Write down everything you remember of the course, and have Claude mark what's wrong and pick your next lessons.";
  if (total === 0) {
    summary.append(
      el("p", "rc-lead", "No questions yet."),
      el(
        "p",
        "rc-note",
        "In any lesson, press the question pill in the top bar, or Q, and write down something you want to be able to answer later. It is saved with the step you were on, and asked back here.",
      ),
      row(freely),
    );
  } else {
    const later = nextDue(deck, now);
    const facts = [`${total} in all`];
    if (later !== null) facts.push(`next ${whenLabel(later, now)}`);
    const start = button(due.length > 0 ? "Start review" : "Nothing due", "rc-primary", () => begin(due));
    start.disabled = due.length === 0;
    summary.append(
      el("p", "rc-lead", due.length === 0 ? "You're up to date." : `${due.length} due now`),
      el("p", "rc-note", facts.join(" · ")),
      row(start, button(`Practise all ${total}`, "", () => begin(deck.cards)), freely),
    );
  }

  const all = el("h2", "rc-all", `All your questions · ${total}`);
  all.id = "all-questions";
  const groups = byLesson(deck.cards).map(({ lesson, cards }) => {
    const group = el("section", "rc-group");
    const head = el("h2");
    const href = sourceHref({ lesson, step: 0, stepTitle: "" });
    if (href) {
      const link = el("a", "", lessonLabel(lesson));
      link.href = href.replace(/#.*$/, "");
      head.append(link);
    } else {
      head.textContent = lessonLabel(lesson);
    }
    const list = el("ol", "rc-cards");
    list.append(...cards.map((c) => cardItem(c, now)));
    group.append(head, list);
    return group;
  });

  const marked = revisitCards(deck);
  const lists = total > 0 ? [all, ...groups] : [];
  return [summary, ...(marked.length > 0 ? [revisitList(marked)] : []), ...lists, keeping(deck)];
}

/** The questions marked to revisit, to practise on their own, each with the way back to its lesson. */
function revisitList(cards: readonly Card[]): HTMLElement {
  const section = el("section", "rc-revisit");
  const head = el("div", "rc-revisit-head");
  head.append(
    el("h2", "", `Revisit · ${cards.length}`),
    button(cards.length === 1 ? "Practise it" : `Practise these ${cards.length}`, "rc-small", () => begin(cards)),
  );
  const list = el("ol", "rc-revisit-list");
  list.append(
    ...cards.map((card) => {
      const item = el("li");
      const question = el("div", "rc-question");
      question.innerHTML = questionHtml(card.question);
      const where = el("div", "rc-meta");
      const href = sourceHref(card);
      if (href) {
        const link = el("a", "", `${placeLabel(card)} ↗`);
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener";
        where.append(link);
      } else where.append(el("span", "", placeLabel(card)));
      const done = button("Unmark", "rc-small", () => toggleRevisit(card));
      done.title = "Take this question off the revisit list";
      item.append(question, where, done);
      return item;
    }),
  );
  section.append(head, el("p", "rc-note", "Questions you marked as ones you blank out on."), list);
  return section;
}

function cardItem(card: Card, now: number): HTMLLIElement {
  const item = el("li", "rc-card");
  if (editing?.id === card.id) {
    const box = el("textarea", "rc-edit");
    box.value = editing.text;
    box.rows = 3;
    box.setAttribute("aria-label", "Question");
    box.addEventListener("input", () => editing && (editing.text = box.value));
    const save = (): void => {
      store.update((d) => editCard(d, card.id, box.value, Date.now()));
      editing = null;
      render();
    };
    const cancel = (): void => {
      editing = null;
      render();
    };
    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cancel();
      else if (submitsOnEnter(e, touchFirst())) {
        e.preventDefault();
        save();
      }
    });
    item.append(box, row(button("Save", "rc-primary", save), button("Cancel", "", cancel)));
    queueMicrotask(() => box.focus());
    return item;
  }

  const question = el("div", "rc-question");
  question.innerHTML = questionHtml(card.question);
  const tried = card.attempts.length;
  const meta = el("div", "rc-meta");
  meta.append(
    el("span", "", stepLabel(card)),
    el("span", card.due <= now ? "rc-due" : "", whenLabel(card.due, now)),
    el("span", "", tried === 0 ? "not yet answered" : `answered ${tried} time${tried === 1 ? "" : "s"}`),
  );
  const actions = el("div", "rc-actions");
  if (tried > 0) {
    const open = historyOpen.has(card.id);
    const toggle = button(open ? "Hide history" : "History", "rc-small", () => {
      if (open) historyOpen.delete(card.id);
      else historyOpen.add(card.id);
      render();
    });
    toggle.setAttribute("aria-expanded", String(open));
    actions.append(toggle);
  }
  actions.append(
    revisitButton(card),
    button("Edit", "rc-small", () => {
      editing = { id: card.id, text: card.question };
      render();
    }),
    confirmButton("Delete", () => store.update((d) => removeCard(d, card.id, Date.now()))),
  );
  item.append(question, meta, actions);
  if (tried > 0 && historyOpen.has(card.id)) item.append(history(card));
  return item;
}

/** Marks `card` to revisit, or takes the mark off; pressed while it is marked. */
function revisitButton(card: Card): HTMLButtonElement {
  const on = card.revisit !== undefined;
  const b = button(on ? "Revisiting" : "Revisit", on ? "rc-small rc-revisit-on" : "rc-small", () => toggleRevisit(card));
  b.setAttribute("aria-pressed", String(on));
  b.title = on ? "Marked to revisit. Press to take the mark off." : "Mark this as a question you blank out on, to revisit";
  return b;
}

/** Every answer given to `card`, newest first, with what Claude said where it was kept. */
function history(card: Card): HTMLElement {
  const list = el("ol", "rc-history");
  list.setAttribute("aria-label", "Answers given");
  list.append(
    ...[...card.attempts].reverse().map((attempt) => {
      const entry = el("li");
      entry.append(
        el("p", "rc-history-when", `${answeredLabel(attempt.at)} · ${GRADE_LABEL[attempt.grade]}`),
        saidSheet(attempt.answer, attempt.claude),
      );
      return entry;
    }),
  );
  return list;
}

/**
 * Syncing with the learner's other devices, and saving the questions to a
 * file and reading them back.
 */
function keeping(deck: Deck): HTMLElement {
  const section = el("section", "rc-keep");
  const state = sync.get();
  section.append(el("p", "rc-note rc-sync", syncLabel(state, Date.now())));
  if (state.kind === "no-key" || state.kind === "refused") section.append(keyForm());
  else {
    section.append(
      row(
        button("Sync now", "rc-small", () => void sync.sync()),
        confirmButton("Stop syncing here", () => sync.forgetKey()),
      ),
    );
  }
  const file = el("input");
  file.type = "file";
  file.accept = "application/json,.json";
  file.hidden = true;
  file.addEventListener("change", () => {
    const chosen = file.files?.[0];
    if (chosen) void importFile(chosen);
  });
  const save = button("Save to a file", "", () => exportDeck(deck));
  save.disabled = deck.cards.length === 0;
  section.append(row(save, button("Load from a file", "", () => file.click())), file);
  if (notice) section.append(el("p", notice.error ? "rc-notice rc-error" : "rc-notice", notice.text));
  return section;
}

/** Where the learner gives this browser the sync key. */
function keyForm(): HTMLFormElement {
  const form = el("form", "rc-row rc-key");
  const input = el("input", "rc-key-input");
  input.type = "password";
  input.autocomplete = "off";
  input.placeholder = "Sync key";
  input.setAttribute("aria-label", "Sync key");
  const connect = el("button", "rc-button rc-primary", "Sync");
  connect.type = "submit";
  form.append(input, connect);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void sync.setKey(input.value);
  });
  return form;
}

function sitting(s: Session, deck: Deck): HTMLElement[] {
  const card = held.card();
  const { done, total } = progress(s);
  const top = el("div", "rc-sitting-top");
  top.append(el("span", "rc-progress", card ? `Question ${done + 1} of ${total}` : "Review done"));
  if (card) {
    const pass = button("Skip", "rc-small", skip);
    pass.title = "Skip this question for now. It stays due as it was.";
    top.append(row(revisitButton(card), pass, button("End review", "rc-small", end)));
  } else top.append(button("Back to your questions", "rc-small", end));
  if (!card) return [top, finished(s, deck)];

  const panel = el("section", "rc-ask");
  const outcomes = el("div", "rc-grades");
  const paintOutcomes = (): void => {
    const suggested = held.session && suggestedGrade(held.session);
    outcomes.querySelectorAll<HTMLButtonElement>(".rc-grade").forEach((b, i) => {
      const g = GRADES[i];
      b.classList.toggle("rc-suggested", g === suggested);
      b.title = `${OUTCOME[g]} (${i + 1})${g === suggested ? ", as Claude's reading suggests" : ""}`;
    });
  };
  const { parts, layout } = cardParts(held, card, {
    sideBySide: () => window.matchMedia?.(SIDE_BY_SIDE).matches ?? false,
    gradesByKey: true,
    onEdit: paintOutcomes,
    redraw: render,
  });
  relayout = layout;
  panel.append(...parts);
  if (s.phase === "ask") return [top, panel];

  const href = sourceHref(card);
  if (href) {
    // The lesson opens in this tab, with the question, the answer and Claude's
    // reading beside it, and comes back here to say how it went.
    const link = el("a", "rc-source", "Check in the lesson →");
    link.href = href;
    link.title = "Open the lesson at this step, keeping your answer and Claude's reading beside it";
    // A plain click goes to the lesson with the sitting; one asking for a new tab or window leaves it here.
    link.addEventListener("click", (e) => {
      if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) held.inLesson(true);
    });
    panel.append(link);
  }

  const now = Date.now();
  outcomes.append(
    ...GRADES.map((g) => {
      const b = button("", `rc-grade rc-${g}`, () => gradeAnswer(g));
      b.append(el("span", "rc-grade-name", OUTCOME[g]), el("span", "rc-grade-when", gradeHint(card, g, now)));
      return b;
    }),
  );
  paintOutcomes();
  panel.append(el("p", "rc-hint rc-grade-prompt", "Once it's right, how did it go? (1 · 2 · 3)"), outcomes);
  return [top, panel];
}

/**
 * The free association: everything the learner remembers of the course, in
 * one box kept open to correct, with Claude's remarks on its words, its
 * feedback at the head of the margin, and the lessons it picks as the
 * shortest next steps under the box.
 */
function freeAssociation(a: Association): HTMLElement[] {
  const top = el("div", "rc-sitting-top");
  top.append(el("span", "rc-progress", "Free association"), button("Back to your questions", "rc-small", end));

  const panel = el("section", "rc-ask rc-associate");
  panel.append(
    el("p", "rc-asked", "Everything you remember of the course so far."),
    el(
      "p",
      "rc-note rc-associate-note",
      "Definitions, theorems, proofs, formulas, how they connect: as much detail as you can, from memory. Claude marks what's wrong, line by line, and picks the lessons that are the shortest next step from what you know.",
    ),
  );

  const canRead = sync.canCheck();
  const read = button(a.state ? "Read again" : "Have Claude read it", "rc-primary", () => {
    readWriting();
    render();
  });
  const controls = canRead
    ? row(read, el("span", "rc-hint", "⌘↵ or ctrl↵ to have it read · ↵ new line"))
    : row(el("span", "rc-note rc-associate-key", "Give this browser the sync key, under your questions, to have Claude read it."));
  if (a.text || a.state) controls.append(confirmButton("Start afresh", clearWriting));

  const reading = a.state?.kind === "done" ? a.state.reading : null;
  const writing = writingSheet({
    text: a.text,
    label: "Everything you remember",
    placeholder: "Start anywhere. One idea to a line makes Claude's remarks easier to follow.",
    rows: 12,
    maxLength: MAX_WRITING,
    marking: a.state !== null,
    remarks: reading?.remarks ?? [],
    head: () => (association.state ? readingCard(association.state, !readAsWritten(association)) : null),
    controls,
    onInput: (text) => {
      association = editWriting(association, text);
      keepAssociation();
    },
    onKey: (e, field) => {
      if (e.key === "Escape") field.blur();
      else if (submitsOnModEnter(e) && canRead) {
        e.preventDefault();
        readWriting();
        render();
      }
    },
    // Nothing new to read: empty writing, or writing read as it stands.
    painted: (text) => {
      read.disabled = !text.trim() || (readAsWritten(association) && association.state?.kind !== "failed");
    },
    sideBySide: () => window.matchMedia?.(SIDE_BY_SIDE).matches ?? false,
    height: { get: () => writingHeight, set: (h) => (writingHeight = h) },
  });
  relayout = writing.layout;
  panel.append(writing.sheet);
  if (reading && reading.next.length > 0) panel.append(nextSteps(reading.next));
  return [top, panel];
}

/** Claude's reading of the free association as a whole: under way, its feedback, or why there is none; `stale` once the writing has changed since. */
function readingCard(state: ReadingState, stale: boolean): HTMLElement {
  const box = el("div", "rc-remark rc-overall");
  box.setAttribute("role", "status");
  box.append(el("h3", "", "Claude's reading"));
  if (state.kind === "done") {
    const said = el("p", "rc-said rc-feedback");
    said.innerHTML = questionHtml(state.reading.feedback);
    box.append(said);
    if (state.reading.remarks.length === 0) box.append(el("p", "rc-remark-note rc-quiet", "Nothing marked wrong."));
    if (stale) box.append(el("p", "rc-remark-note rc-quiet", "You've changed it since. Have it read again to see it as it stands."));
  } else {
    box.append(el("p", "rc-said rc-quiet", state.kind === "reading" ? "Reading what you wrote…" : state.error));
  }
  return box;
}

/** The lessons Claude picks as the shortest next steps, nearest first, each opening in a new tab so the writing stays. */
function nextSteps(steps: readonly { lesson: string; why: string }[]): HTMLElement {
  const section = el("div", "rc-yours rc-next");
  const list = el("ol", "rc-next-list");
  list.append(
    ...steps.flatMap(({ lesson: slug, why }) => {
      const lesson = lessons.find((l) => l.slug === slug);
      if (!lesson) return [];
      const item = el("li");
      const reason = el("p", "rc-next-why");
      reason.innerHTML = questionHtml(why);
      item.append(lessonLink(lesson, `${lessonLabel(slug)} ↗`, "rc-source rc-next-lesson"), reason);
      return [item];
    }),
  );
  section.append(el("h3", "", steps.length === 1 ? "Shortest next step" : "Shortest next steps"), list);
  return section;
}

function finished(s: Session, deck: Deck): HTMLElement {
  const panel = el("section", "rc-ask rc-finished");
  const { recalled, shaky, missed } = s.tally;
  const counts = [`${recalled} recalled`, `${shaky} shaky`, `${missed} missed`];
  if (s.skipped > 0) counts.push(`${s.skipped} skipped`);
  const now = Date.now();
  const later = nextDue(deck, now);
  const due = dueCards(deck, now).length;
  panel.append(
    el("p", "rc-lead", "That's all for now."),
    el("p", "rc-note", counts.join(" · ")),
    el(
      "p",
      "rc-note",
      due > 0
        ? `${due} still due.`
        : later !== null
          ? `The next question comes back ${whenLabel(later, now)}.`
          : "",
    ),
  );
  return panel;
}

// --- I/O ---------------------------------------------------------------------------

function exportDeck(deck: Deck): void {
  const blob = new Blob([JSON.stringify(saveDeck(deck), null, 2)], { type: "application/json" });
  const link = el("a");
  link.href = URL.createObjectURL(blob);
  link.download = `triangle-lab-questions-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  notice = { text: `Saved ${deck.cards.length} question${deck.cards.length === 1 ? "" : "s"}.`, error: false };
  render();
}

async function importFile(file: File): Promise<void> {
  let imported: Deck | null = null;
  try {
    imported = loadDeck(JSON.parse(await file.text()));
  } catch {
    imported = null;
  }
  if (!imported) {
    notice = { text: `${file.name} isn't a saved set of questions.`, error: true };
    render();
    return;
  }
  const before = new Set(store.get().cards.map((c) => c.id));
  const fresh = imported.cards.filter((c) => !before.has(c.id)).length;
  const saved = store.update((d) => mergeDecks(d, imported));
  notice = saved
    ? { text: `Loaded ${imported.cards.length} questions, ${fresh} of them new.`, error: false }
    : { text: "Loaded, but this browser won't keep them after the page closes.", error: true };
  render();
}

/** Move the free association an earlier version of the page kept in this browser alone into the deck, unless the deck has one. */
function moveLocalAssociation(): void {
  try {
    const text = localStorage.getItem(LOCAL_ASSOCIATION_KEY);
    if (text === null) return;
    const writing = readLocalAssociation(JSON.parse(text), Date.now());
    if (writing) store.update((d) => (d.writing ? d : setWriting(d, writing)));
    localStorage.removeItem(LOCAL_ASSOCIATION_KEY);
  } catch {
    // Storage blocked or the text unreadable: nothing to move.
  }
}

/** Keep the free association in the deck, which syncs it, unless nothing kept has changed. */
function keepAssociation(): void {
  store.update((d) => {
    const next = setWriting(d, toWriting(association, d.writing, Date.now()));
    heard = next.writing;
    return next;
  });
}

/** What this tab was on when it was last loaded: the free association ("on"), being read ("reading"), or not (null). */
function readAssociating(): "on" | "reading" | null {
  try {
    const kept = sessionStorage.getItem(ASSOCIATING_KEY);
    return kept === "reading" || kept === "on" ? kept : null;
  } catch {
    return null;
  }
}

/** Keep whether the tab is on the free association (the sitting keeps itself, sitting.ts). */
function keepAssociating(): void {
  try {
    if (associating) sessionStorage.setItem(ASSOCIATING_KEY, association.state?.kind === "reading" ? "reading" : "on");
    else sessionStorage.removeItem(ASSOCIATING_KEY);
  } catch {
    // Storage blocked: a reload starts from the overview, as before.
  }
}

/** The tab's storage, where the sitting and the free association's place are kept, or null where it is blocked. */
function tabStorage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}
