// The recall page (recall.html): every question noted in the lessons, and
// review sittings that ask them back.
//
// Out of a sitting, the page lists the questions by lesson, with when each is
// due, and lets the learner reword or delete them, or save and restore the
// whole set as a file, and shows how syncing with the learner's other
// devices stands, taking the sync key when it has none. In a sitting it asks
// one due question at a time: the learner answers from memory, then checks
// (their last answer, and a link that opens the lesson at the step the
// question came from) and corrects the answer in place until it is right,
// then says how it went: right first time, fixed, or still struggling, which
// schedules the question's next asking. Once the browser has the sync key,
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
// The rules are pure (deck.ts, session.ts); this file holds the page's state,
// renders it and does the I/O.

import "katex/dist/katex.min.css";
import "./page.css";
import {
  addCard,
  cleanQuestion,
  dueCards,
  editCard,
  GRADES,
  loadDeck,
  mergeDecks,
  newCard,
  nextDue,
  removeCard,
  saveDeck,
  type Attempt,
  type Card,
  type Deck,
  type Grade,
  type Remark,
  type Verdict,
} from "./deck.ts";
import type { Review } from "./check.ts";
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
import {
  askReview,
  currentCard,
  dropReview,
  editAnswer,
  gradeCurrent,
  loadSitting,
  progress,
  prune,
  readAsItStands,
  reveal,
  settleReview,
  skipCurrent,
  startSession,
  suggestedGrade,
  wantsReview,
  type Editor,
  type Session,
  type Sitting,
} from "./session.ts";
import { newId } from "./id.ts";
import { placeRemarks, remarkAt, runsOf, stack } from "./remarks.ts";
import { submitsOnEnter, touchFirst } from "./keys.ts";
import { openRecall } from "./remote.ts";
import { syncLabel } from "./sync.ts";

const GRADE_LABEL: Record<Grade, string> = {
  missed: "Missed it",
  shaky: "Shaky",
  recalled: "Recalled it",
};

/** What each grade means once an answer has been checked and corrected: the learner's three ways out of a card. */
const OUTCOME: Record<Grade, string> = {
  missed: "Still struggling",
  shaky: "Fixed it",
  recalled: "Got it right",
};

/** When Claude's remarks go beside the answer rather than under it; page.css widens the page to match. */
const SIDE_BY_SIDE = "(min-width: 1000px)";

/** Where the sitting under way is kept for the tab (session.ts `Sitting`). */
const SITTING_KEY = "triangle-lab:recall-sitting";

const { store, sync } = openRecall();
const root = document.getElementById("recall") as HTMLElement;
const kept = readSitting();

/** The sitting under way, or null on the overview. */
let session: Session | null = kept ? prune(kept.session, store.get()) : null;
/** What the learner has written for the question being asked. */
let draft = kept?.draft ?? "";
/** What is being written while the answer is checked: a rewording, or a new question. */
let editor: Editor | null = session?.phase === "check" ? (kept?.editor ?? null) : null;
/** Questions written while checking the answer on show, and whether the browser kept them all. */
let written: { questions: string[]; kept: boolean } = { questions: [], kept: true };
/** The question being reworded on the overview, and its new wording so far. */
let editing: { id: string; text: string } | null = null;
/** Questions whose history of answers is open on the overview. */
const historyOpen = new Set<string>();
/** A line about the last export or import, and whether it went wrong. */
let notice: { text: string; error: boolean } | null = null;
/** Lays the margin of the answer on show out again, as when the window is resized. */
let relayout: (() => void) | null = null;
/** The height the learner dragged the answer box to for this card, kept over redraws; null to fit the answer. */
let answerHeight: number | null = null;
/** An editor was opened, or opened afresh, and takes the focus at the next render. */
let editorOpened = false;

store.subscribe((deck) => {
  if (session) {
    // Changes from other tabs reach a sitting only when they remove the card
    // being asked; anything else would wipe what is being written.
    const next = prune(session, deck);
    if (next === session) return;
    session = next;
    if (session.phase !== "check") leaveCard();
  }
  render();
});

// How syncing stands is shown on the overview only, and redrawn alone, so
// a sync never disturbs a question being reworded.
sync.subscribe(() => {
  if (!session) root.querySelector(".rc-keep")?.replaceWith(keeping(store.get()));
});

window.addEventListener("resize", () => relayout?.());

window.addEventListener("keydown", (e) => {
  if (!session || session.phase !== "check" || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
  const grade = GRADES[Number(e.key) - 1];
  if (grade) {
    e.preventDefault();
    gradeAnswer(grade);
  }
});

// A sitting kept while its answer was being read lost that request with the page.
if (session && wantsReview(session)) reviewAnswer();
render();

// --- State changes ------------------------------------------------------------

function begin(cards: readonly Card[]): void {
  session = startSession(cards);
  draft = "";
  editing = null;
  leaveCard();
  notice = null;
  render();
}

/** Check: the answer, as written, is shown to be corrected, and read by Claude. */
function check(): void {
  if (!session) return;
  session = reveal(session, draft);
  if (wantsReview(session)) reviewAnswer();
  render();
}

/**
 * Have Claude read the answer being checked, as it now stands, unless it has
 * already been, or is being. Nothing is asked without the sync key. The
 * caller renders; the reply renders when it comes.
 */
function reviewAnswer(): void {
  if (!session || !sync.canCheck()) return;
  const card = currentCard(session, store.get());
  const asked = askReview(session);
  if (!card || asked === session) return;
  session = asked;
  const answer = asked.answer;
  const { id, question } = card;
  void sync.check({ question, where: placeLabel(card), answer }).then((review) => {
    if (!session) return;
    const next = settleReview(session, store.get(), { id, question, answer }, review);
    if (next === session) return;
    session = next;
    render();
  });
}

/** Have the answer read again as corrected. */
function checkAgain(): void {
  reviewAnswer();
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
  leaveCard();
  render();
}

/** Move on from the card on show without answering it; its place in the deck is untouched. */
function skip(): void {
  if (!session) return;
  session = skipCurrent(session);
  draft = "";
  leaveCard();
  render();
}

/** Forget what was being written for the card checked, as the sitting moves off it. */
function leaveCard(): void {
  editor = null;
  answerHeight = null;
  written = { questions: [], kept: true };
}

/** Start rewording the question being checked, or writing a new question. */
function openEditor(kind: Editor["kind"], card: Card): void {
  if (!session) return;
  editor = { kind, text: kind === "question" ? card.question : "" };
  editorOpened = true;
  render();
}

function closeEditor(): void {
  editor = null;
  render();
}

/**
 * Save what the editor holds. A reworded question has Claude read the answer
 * afresh; a new question is added at the same lesson step, and the editor
 * stays open for another. A blank question is not saved.
 */
function saveEditor(): void {
  const card = session && currentCard(session, store.get());
  if (!session || !editor || !card) return;
  const { kind, text } = editor;
  if (!cleanQuestion(text)) return;
  if (kind === "question") {
    store.update((d) => editCard(d, card.id, text, Date.now()));
    if (currentCard(session, store.get())?.question !== card.question) session = dropReview(session);
    editor = null;
  } else {
    const fresh = newCard(newId(), text, card, Date.now())!;
    const saved = store.update((d) => addCard(d, fresh));
    written = { questions: [...written.questions, fresh.question], kept: written.kept && saved };
    editor = { kind: "new", text: "" };
    editorOpened = true;
  }
  if (wantsReview(session)) reviewAnswer();
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
  // A reply from Claude can redraw the sitting mid-sentence: the box being
  // written in keeps the focus, and the selection goes back where it was.
  const before = document.activeElement;
  const was = before instanceof HTMLTextAreaElement && root.contains(before) ? before : null;
  root.replaceChildren(...(session ? sitting(session, deck) : overview(deck)));
  // An editor just opened takes it first; else the box written in before,
  // any editor, or the answer while it is asked for. While it is checked, the
  // answer is not focused unasked, so 1, 2 and 3 grade.
  const editorBox = root.querySelector<HTMLTextAreaElement>(".rc-editor textarea");
  const opened = editorOpened ? editorBox : null;
  editorOpened = false;
  const same = opened ? null : was && root.querySelector<HTMLTextAreaElement>(`textarea.${was.classList[0]}`);
  const field =
    opened ?? same ?? editorBox ?? (session?.phase === "ask" ? root.querySelector<HTMLTextAreaElement>(".rc-answer") : null);
  if (field && document.activeElement !== field) {
    field.focus();
    const end = field.value.length;
    const [from, to] = same && was ? [was.selectionStart, was.selectionEnd] : [end, end];
    field.setSelectionRange(Math.min(from, end), Math.min(to, end));
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
  const card = currentCard(s, deck);
  const { done, total } = progress(s);
  const top = el("div", "rc-sitting-top");
  top.append(el("span", "rc-progress", card ? `Question ${done + 1} of ${total}` : "Review done"));
  if (card) {
    const pass = button("Skip", "rc-small", skip);
    pass.title = "Skip this question for now. It stays due as it was.";
    top.append(row(pass, button("End review", "rc-small", end)));
  } else top.append(button("Back to your questions", "rc-small", end));
  if (!card) return [top, finished(s, deck)];

  const panel = el("section", "rc-ask");
  panel.append(el("p", "rc-from", placeLabel(card)));
  if (s.phase === "check" && editor?.kind === "question") {
    panel.append(editorForm(editor, "Question", "rc-asked-edit"));
  } else {
    const question = el("div", "rc-asked");
    question.innerHTML = questionHtml(card.question);
    panel.append(question);
  }

  if (s.phase === "check" && !editor) {
    const actions = row(
      button("Edit question", "rc-small", () => openEditor("question", card)),
      button("New question", "rc-small", () => openEditor("new", card)),
    );
    actions.classList.add("rc-question-actions");
    panel.append(actions);
  }

  const outcomes = el("div", "rc-grades");
  const paintOutcomes = (): void => {
    const suggested = session && suggestedGrade(session);
    outcomes.querySelectorAll<HTMLButtonElement>(".rc-grade").forEach((b, i) => {
      const g = GRADES[i];
      b.classList.toggle("rc-suggested", g === suggested);
      b.title = `${OUTCOME[g]} (${i + 1})${g === suggested ? ", as Claude's reading suggests" : ""}`;
    });
  };
  panel.append(answerSheet(s, paintOutcomes));
  if (s.phase === "ask") return [top, panel];

  if (editor?.kind === "new") panel.append(newQuestion(editor, card));
  else if (written.questions.length > 0) panel.append(writtenList());

  const last: Attempt | undefined = card.attempts.at(-1);
  if (last) {
    const before = el("details", "rc-last");
    before.append(el("summary", "", `Last time · ${GRADE_LABEL[last.grade].toLowerCase()}`), saidSheet(last.answer, last.claude));
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
 * The answer, in one box that stays open to correct. While it is checked, the
 * words Claude remarked on are highlighted in it, as comments are in a
 * document, and the remarks are beside it (`SIDE_BY_SIDE`), or under it on a
 * narrower screen, each as near its words as it fits. Editing the answer
 * places them afresh against it, so a remark on words since changed shows as
 * dealt with. `onEdit` hears each change made while checking.
 */
function answerSheet(s: Session, onEdit: () => void): HTMLElement {
  const checking = s.phase === "check";
  const sheet = el("div", checking ? "rc-sheet rc-checking" : "rc-sheet");
  const paper = el("div", "rc-paper");
  const marks = el("div", "rc-marks");
  marks.setAttribute("aria-hidden", "true");
  const field = el("textarea", "rc-answer");
  field.rows = 4;
  field.setAttribute("aria-label", "Your answer");
  field.value = checking ? s.answer : draft;
  field.placeholder = checking
    ? "Answered in your head. Write it here to check it."
    : "Your answer, from memory. Writing it down is optional, but it makes the check honest.";
  paper.append(marks, field);
  const margin = el("aside", "rc-margin");
  margin.setAttribute("aria-label", "Claude's check");
  const canCheck = checking && sync.canCheck();
  const again = button(s.review ? "Check again" : "Check", "rc-primary", checkAgain);
  const controls = checking
    ? canCheck
      ? row(again, el("span", "rc-hint", "↵ check again · ⇧↵ new line · esc, then 1 · 2 · 3"))
      : row(el("span", "rc-hint", "esc, then 1 · 2 · 3"))
    : row(button("Check", "rc-primary", check), el("span", "rc-hint", "↵ check · ⇧↵ new line"));
  const left = el("div", "rc-sheet-main");
  left.append(paper, controls);
  sheet.append(left, margin);

  const remarks = s.review?.kind === "done" ? (s.review.verdict.remarks ?? []) : [];
  let places = placeRemarks(field.value, remarks);

  const showActive = (): void => {
    const active = document.activeElement === field ? remarkAt(places, field.selectionStart) : null;
    for (const node of sheet.querySelectorAll<HTMLElement>("[data-remark]")) {
      node.classList.toggle("rc-active", Number(node.dataset.remark) === active);
    }
  };

  const layout = (): void => {
    const cards = [...margin.children] as HTMLElement[];
    if (!window.matchMedia?.(SIDE_BY_SIDE).matches) {
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
    margin.replaceChildren(
      ...(checking && s.review ? [overall(s.review, session ? !readAsItStands(session) : false)] : []),
      ...order.map(({ place, i }) => remarkCard(remarks[i], i, place === null, () => {
        if (!place) return;
        field.focus();
        field.setSelectionRange(place.start, place.end);
        showActive();
      })),
    );
    // Nothing new to read: an empty answer, or one read as it stands.
    if (session) again.disabled = !text.trim() || (readAsItStands(session) && session.review?.kind !== "failed");
    showActive();
    fit();
    requestAnimationFrame(() => {
      fit();
      layout();
    });
  };

  // The box fits the answer up to most of the window, and scrolls past that;
  // the learner can drag it to any height, which it keeps. The highlights
  // behind it scroll with it, and leave room for its scroll bar, so its lines
  // break where the box's do.
  let fitted = 0;
  const fit = (): void => {
    if (!field.isConnected) return;
    if (answerHeight !== null) field.style.height = `${answerHeight}px`;
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
      if (Math.abs(field.offsetHeight - fitted) > 1) answerHeight = fitted = field.offsetHeight;
      follow();
      layout();
    }).observe(field);
  }
  field.addEventListener("scroll", () => {
    follow();
    layout();
  });

  field.addEventListener("input", () => {
    if (!session) return;
    if (session.phase === "ask") draft = field.value;
    else {
      session = editAnswer(session, field.value);
      paint();
      onEdit();
    }
    keepSitting();
  });
  field.addEventListener("keydown", (e) => {
    if (checking && e.key === "Escape") field.blur();
    else if (submitsOnEnter(e, touchFirst()) && (!checking || canCheck)) {
      e.preventDefault();
      if (checking) checkAgain();
      else check();
    }
  });
  for (const type of ["select", "click", "keyup", "focus", "blur"]) field.addEventListener(type, showActive);

  relayout = layout;
  paint();
  return sheet;
}

/** Claude's reading as a whole: under way, its feedback, or why there is none; `stale` once the answer has changed since. */
function overall(review: Review, stale: boolean): HTMLElement {
  const box = el("div", "rc-remark rc-overall");
  box.setAttribute("role", "status");
  if (review.kind === "done") {
    const said = el("p", "rc-said rc-feedback");
    said.innerHTML = questionHtml(review.verdict.feedback);
    box.append(el("h3", "", `Claude's check · ${GRADE_LABEL[review.verdict.grade].toLowerCase()}`), said);
    if (stale) box.append(el("p", "rc-remark-note rc-quiet", "You've changed your answer since. Check it again to have it read as it stands."));
  } else {
    box.append(el("h3", "", "Claude's check"));
    box.append(el("p", "rc-said rc-quiet", review.kind === "checking" ? "Reading your answer…" : review.error));
  }
  return box;
}

/** One remark, by its words; `gone` once they have been changed. */
function remarkCard(remark: Remark, index: number, gone: boolean, show: () => void): HTMLElement {
  const box = el("div", gone ? "rc-remark rc-gone" : "rc-remark");
  box.dataset.remark = String(index);
  const quote = el("p", "rc-remark-quote", remark.quote);
  const note = el("p", "rc-remark-note");
  note.innerHTML = questionHtml(remark.note);
  box.append(quote, note);
  if (gone) box.append(el("p", "rc-remark-done", "Changed"));
  else box.addEventListener("click", show);
  return box;
}

/** A text box for what the editor holds, with Save and Cancel; Enter saves and Escape cancels. */
function editorForm(e: Editor, label: string, cls = ""): HTMLElement {
  const form = el("div", cls ? `rc-editor ${cls}` : "rc-editor");
  const box = el("textarea", "rc-edit");
  box.rows = 3;
  box.value = e.text;
  box.setAttribute("aria-label", label);
  if (e.kind === "new") box.placeholder = "Another question to answer from memory later";
  box.addEventListener("input", () => {
    e.text = box.value;
    keepSitting();
  });
  box.addEventListener("keydown", (k) => {
    if (k.key === "Escape") closeEditor();
    else if (submitsOnEnter(k, touchFirst())) {
      k.preventDefault();
      saveEditor();
    }
  });
  form.append(box, row(button("Save", "rc-primary", saveEditor), button(e.kind === "new" ? "Done" : "Cancel", "", closeEditor)));
  return form;
}

/** Writing a new question from the one being checked, saved at the same lesson step. */
function newQuestion(e: Editor, card: Card): HTMLElement {
  const section = el("div", "rc-yours rc-new");
  section.append(el("h3", "", `New question · ${stepLabel(card)}`), editorForm(e, "New question"));
  if (written.questions.length > 0) section.append(writtenList());
  return section;
}

/** The questions written while checking this answer, which wait for the next sitting. */
function writtenList(): HTMLElement {
  const box = el("div", "rc-written");
  const list = el("ol");
  list.setAttribute("aria-label", "Questions written");
  list.append(
    ...written.questions.map((q) => {
      const item = el("li");
      item.innerHTML = questionHtml(q);
      return item;
    }),
  );
  const count = written.questions.length;
  box.append(
    el("p", "rc-note", `${count} new question${count === 1 ? "" : "s"}, asked from your next review:`),
    list,
  );
  if (!written.kept) box.append(el("p", "rc-notice rc-error", "This browser won't keep them after the page closes."));
  return box;
}

/**
 * An answer as it was given, with what Claude said of it if kept: the words
 * it remarked on marked, and the remarks under it, then its feedback.
 */
function saidSheet(answer: string, verdict: Verdict | undefined): HTMLElement {
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
function saidAnswer(answer: string): HTMLParagraphElement {
  return answer.trim() ? el("p", "rc-said", answer) : el("p", "rc-said rc-quiet", "Answered in your head.");
}

/** Claude's feedback, typeset, under a heading naming the grade it gave. */
function claudeSaid(grade: Grade, feedback: string, heading: string): HTMLElement {
  const box = el("div", "rc-yours");
  const said = el("p", "rc-said rc-feedback");
  said.innerHTML = questionHtml(feedback);
  box.append(el("h3", "", `${heading} · ${GRADE_LABEL[grade].toLowerCase()}`), said);
  return box;
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
    if (session) sessionStorage.setItem(SITTING_KEY, JSON.stringify({ session, draft, editor } satisfies Sitting));
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

/** Whether a key went to a text box, where it is typing rather than a shortcut. */
function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

function row(...children: HTMLElement[]): HTMLElement {
  const r = el("div", "rc-row");
  r.append(...children);
  return r;
}
