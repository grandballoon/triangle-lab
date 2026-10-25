// The recall page (recall.html): every question noted in the lessons, and
// review sittings that ask them back.
//
// Out of a sitting, the page lists the questions by lesson, with when each is
// due, and lets the learner reword or delete them, or save and restore the
// whole set as a file. In a sitting it asks one due question at a time: the
// learner answers from memory, then checks (earlier answers, and a link that
// opens the lesson at the step the question came from) and grades
// themselves, which schedules the question's next asking.
//
// The rules are pure (deck.ts, session.ts); this file holds the page's state,
// renders it and does the I/O.

import "katex/dist/katex.min.css";
import "./page.css";
import {
  dueCards,
  editCard,
  GRADES,
  loadDeck,
  mergeDecks,
  nextDue,
  removeCard,
  saveDeck,
  type Card,
  type Deck,
  type Grade,
} from "./deck.ts";
import { byLesson, gradeHint, lessonLabel, questionHtml, sourceHref, stepLabel, whenLabel } from "./labels.ts";
import {
  currentCard,
  gradeCurrent,
  loadSitting,
  progress,
  prune,
  reveal,
  startSession,
  type Session,
  type Sitting,
} from "./session.ts";
import { submitsOnEnter, touchFirst } from "./keys.ts";
import { RecallStore } from "./store.ts";

const GRADE_LABEL: Record<Grade, string> = {
  missed: "Missed it",
  shaky: "Shaky",
  recalled: "Recalled it",
};

/** Where the sitting under way is kept for the tab (session.ts `Sitting`). */
const SITTING_KEY = "triangle-lab:recall-sitting";

const store = new RecallStore();
const root = document.getElementById("recall") as HTMLElement;
const kept = readSitting();

/** The sitting under way, or null on the overview. */
let session: Session | null = kept ? prune(kept.session, store.get()) : null;
/** What the learner has written for the question being asked. */
let draft = kept?.draft ?? "";
/** The question being reworded on the overview, and its new wording so far. */
let editing: { id: string; text: string } | null = null;
/** A line about the last export or import, and whether it went wrong. */
let notice: { text: string; error: boolean } | null = null;

store.subscribe((deck) => {
  if (session) {
    // Changes from other tabs reach a sitting only when they remove the card
    // being asked; anything else would wipe what is being written.
    const next = prune(session, deck);
    if (next === session) return;
    session = next;
  }
  render();
});

window.addEventListener("keydown", (e) => {
  if (!session || session.phase !== "check" || e.altKey || e.ctrlKey || e.metaKey) return;
  const grade = GRADES[Number(e.key) - 1];
  if (grade) {
    e.preventDefault();
    gradeAnswer(grade);
  }
});

render();

// --- State changes ------------------------------------------------------------

function begin(cards: readonly Card[]): void {
  session = startSession(cards);
  draft = "";
  editing = null;
  notice = null;
  render();
}

function check(): void {
  if (!session) return;
  session = reveal(session, draft);
  render();
}

function gradeAnswer(grade: Grade): void {
  if (!session) return;
  let next = session;
  store.update((deck) => {
    const result = gradeCurrent(next, deck, grade, Date.now());
    next = result.session;
    return result.deck;
  });
  session = next;
  draft = "";
  render();
}

function end(): void {
  session = null;
  render();
  window.scrollTo({ top: 0 });
}

// --- Rendering ------------------------------------------------------------------

function render(): void {
  keepSitting();
  const deck = store.get();
  root.replaceChildren(...(session ? sitting(session, deck) : overview(deck)));
  const answer = root.querySelector<HTMLTextAreaElement>(".rc-answer");
  if (answer && document.activeElement !== answer) {
    answer.focus();
    answer.setSelectionRange(answer.value.length, answer.value.length);
  }
}

function overview(deck: Deck): HTMLElement[] {
  const now = Date.now();
  const due = dueCards(deck, now);
  const total = deck.cards.length;

  const summary = el("section", "rc-summary");
  if (total === 0) {
    summary.append(
      el("p", "rc-lead", "No questions yet."),
      el(
        "p",
        "rc-note",
        "In any lesson, press the question pill in the top bar, or Q, and write down something you want to be able to answer later. It is saved with the step you were on, and asked back here.",
      ),
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
      row(start, button(`Practise all ${total}`, "", () => begin(deck.cards))),
    );
  }

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

  return [summary, ...groups, keeping(deck)];
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
  actions.append(
    button("Edit", "rc-small", () => {
      editing = { id: card.id, text: card.question };
      render();
    }),
    confirmButton("Delete", () => store.update((d) => removeCard(d, card.id))),
  );
  item.append(question, meta, actions);
  return item;
}

/** Saving the questions to a file and reading them back. */
function keeping(deck: Deck): HTMLElement {
  const section = el("section", "rc-keep");
  section.append(
    el(
      "p",
      "rc-note",
      "Your questions are kept in this browser only. Save them to a file to move them to another browser, or to keep a copy.",
    ),
  );
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

function sitting(s: Session, deck: Deck): HTMLElement[] {
  const card = currentCard(s, deck);
  const { done, total } = progress(s);
  const top = el("div", "rc-sitting-top");
  top.append(
    el("span", "rc-progress", card ? `Question ${done + 1} of ${total}` : "Review done"),
    button(card ? "End review" : "Back to your questions", "rc-small", end),
  );
  if (!card) return [top, finished(s, deck)];

  const panel = el("section", "rc-ask");
  const question = el("div", "rc-asked");
  question.innerHTML = questionHtml(card.question);
  panel.append(el("p", "rc-from", `${lessonLabel(card.lesson)} · ${stepLabel(card)}`), question);

  if (s.phase === "ask") {
    const answer = el("textarea", "rc-answer");
    answer.rows = 4;
    answer.placeholder = "Your answer, from memory. Writing it down is optional, but it makes the check honest.";
    answer.setAttribute("aria-label", "Your answer");
    answer.value = draft;
    answer.addEventListener("input", () => {
      draft = answer.value;
      keepSitting();
    });
    answer.addEventListener("keydown", (e) => {
      if (submitsOnEnter(e, touchFirst())) {
        e.preventDefault();
        check();
      }
    });
    panel.append(answer, row(button("Check", "rc-primary", check), el("span", "rc-hint", "↵ check · ⇧↵ new line")));
    return [top, panel];
  }

  const yours = el("div", "rc-yours");
  yours.append(el("h3", "", "Your answer"));
  yours.append(s.answer.trim() ? el("p", "rc-said", s.answer) : el("p", "rc-said rc-quiet", "Answered in your head."));
  panel.append(yours);

  const last = card.attempts.at(-1);
  if (last) {
    const before = el("div", "rc-yours");
    before.append(el("h3", "", `Last time · ${GRADE_LABEL[last.grade].toLowerCase()}`));
    before.append(last.answer ? el("p", "rc-said", last.answer) : el("p", "rc-said rc-quiet", "Answered in your head."));
    panel.append(before);
  }

  const href = sourceHref(card);
  if (href) {
    const link = el("a", "rc-source", "Check in the lesson ↗");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    panel.append(link);
  }

  const now = Date.now();
  const grades = el("div", "rc-grades");
  grades.append(
    ...GRADES.map((g, i) => {
      const b = button("", `rc-grade rc-${g}`, () => gradeAnswer(g));
      b.append(el("span", "rc-grade-name", GRADE_LABEL[g]), el("span", "rc-grade-when", gradeHint(card, g, now)));
      b.title = `${GRADE_LABEL[g]} (${i + 1})`;
      return b;
    }),
  );
  panel.append(el("p", "rc-hint rc-grade-prompt", "How did it go? (1 · 2 · 3)"), grades);
  return [top, panel];
}

function finished(s: Session, deck: Deck): HTMLElement {
  const panel = el("section", "rc-ask rc-finished");
  const { recalled, shaky, missed } = s.tally;
  const counts = [`${recalled} recalled`, `${shaky} shaky`, `${missed} missed`];
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

/** The sitting kept for this tab by an earlier load of the page, if any. */
function readSitting(): Sitting | null {
  try {
    const text = sessionStorage.getItem(SITTING_KEY);
    return text ? loadSitting(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

/** Keep the sitting under way for the tab, or forget it once it has ended. */
function keepSitting(): void {
  try {
    if (session) sessionStorage.setItem(SITTING_KEY, JSON.stringify({ session, draft } satisfies Sitting));
    else sessionStorage.removeItem(SITTING_KEY);
  } catch {
    // Storage blocked: a reload starts from the overview, as before.
  }
}

// --- Markup helpers ------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", cls ? `rc-button ${cls}` : "rc-button", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/** A button that asks once more before it acts. */
function confirmButton(text: string, act: () => void): HTMLButtonElement {
  const b = button(text, "rc-small", () => {
    if (b.dataset.confirm) act();
    else {
      b.dataset.confirm = "true";
      b.textContent = `${text}?`;
    }
  });
  b.addEventListener("blur", () => {
    delete b.dataset.confirm;
    b.textContent = text;
  });
  return b;
}

function row(...children: HTMLElement[]): HTMLElement {
  const r = el("div", "rc-row");
  r.append(...children);
  return r;
}
