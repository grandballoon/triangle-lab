// The card a sitting is on, as the learner works it: where it was asked, the
// question, and their answer in one box kept open to correct; once checked,
// Claude's reading on its words (sheet.ts), rewording the question or writing
// new ones from it, and the last answer given. The recall page (page.ts)
// shows it with the ways out of the card around it, and a lesson page shows
// it beside the lesson while the answer is checked there (beside.ts); both
// hold the sitting in a HeldSitting (sitting.ts).

import type { Review } from "./check.ts";
import type { Attempt, Card } from "./deck.ts";
import { button, el, row } from "./dom.ts";
import { submitsOnEnter, touchFirst } from "./keys.ts";
import { placeLabel, questionHtml, stepLabel } from "./labels.ts";
import { readAsItStands, type Editor } from "./session.ts";
import { GRADE_LABEL, saidSheet, writingSheet } from "./sheet.ts";
import type { HeldSitting } from "./sitting.ts";

/** Where the card is shown, and what it hears. */
export interface CardSpec {
  /** Whether the answer's margin is beside it (sheet.ts `sideBySide`). */
  sideBySide: () => boolean;
  /** Whether the page grades with 1, 2 and 3 once out of the answer, as its hint says. */
  gradesByKey: boolean;
  /** Each change to the answer made while checking, as it is typed. */
  onEdit: () => void;
  /** Draw the page again, after a change made here. */
  redraw: () => void;
}

/** The card's parts, in order, and how to lay the answer's margin out again. */
export function cardParts(held: HeldSitting, card: Card, spec: CardSpec): { parts: HTMLElement[]; layout: () => void } {
  const sitting = held.sitting!;
  const { session, editor } = sitting;
  const checking = session.phase === "check";
  const act = (fn: () => void) => () => {
    fn();
    spec.redraw();
  };

  const parts: HTMLElement[] = [el("p", "rc-from", placeLabel(card))];
  if (checking && editor?.kind === "question") parts.push(editorForm(held, editor, "Question", act, "rc-asked-edit"));
  else {
    const question = el("div", "rc-asked");
    question.innerHTML = questionHtml(card.question);
    parts.push(question);
  }

  if (checking && !editor) {
    const actions = row(
      button("Edit question", "rc-small", act(() => held.openEditor("question"))),
      button("New question", "rc-small", act(() => held.openEditor("new"))),
    );
    actions.classList.add("rc-question-actions");
    parts.push(actions);
  }

  const answer = answerSheet(held, spec, act);
  parts.push(answer.sheet);
  if (!checking) return { parts, layout: answer.layout };

  if (editor?.kind === "new") parts.push(newQuestion(held, editor, card, act));
  else if (sitting.written.length > 0) parts.push(writtenList(held));

  const last: Attempt | undefined = card.attempts.at(-1);
  if (last) {
    const before = el("details", "rc-last");
    before.append(el("summary", "", `Last time · ${GRADE_LABEL[last.grade].toLowerCase()}`), saidSheet(last.answer, last.claude));
    parts.push(before);
  }
  return { parts, layout: answer.layout };
}

/**
 * The answer, in one box that stays open to correct. While it is checked, the
 * words Claude remarked on are highlighted in it, and its remarks are in the
 * margin (`writingSheet`).
 */
function answerSheet(
  held: HeldSitting,
  spec: CardSpec,
  act: (fn: () => void) => () => void,
): { sheet: HTMLElement; layout: () => void } {
  const s = held.session!;
  const checking = s.phase === "check";
  const canCheck = checking && held.canCheck();
  const grading = spec.gradesByKey ? " · esc, then 1 · 2 · 3" : "";
  const again = button(s.review ? "Check again" : "Check", "rc-primary", act(() => held.checkAgain()));
  const controls = checking
    ? canCheck
      ? row(again, el("span", "rc-hint", `↵ check again · ⇧↵ new line${grading}`))
      : row(el("span", "rc-hint", spec.gradesByKey ? "esc, then 1 · 2 · 3" : "esc to leave the answer"))
    : row(button("Check", "rc-primary", act(() => held.check())), el("span", "rc-hint", "↵ check · ⇧↵ new line"));
  return writingSheet({
    text: checking ? s.answer : held.sitting!.draft,
    label: "Your answer",
    placeholder: checking
      ? "Answered in your head. Write it here to check it."
      : "Your answer, from memory. Writing it down is optional, but it makes the check honest.",
    rows: 4,
    marking: checking,
    remarks: s.review?.kind === "done" ? (s.review.verdict.remarks ?? []) : [],
    head: () => {
      const now = held.session;
      return checking && now?.review ? overall(now.review, !readAsItStands(now)) : null;
    },
    controls,
    onInput: (text) => {
      held.type(text);
      if (checking) spec.onEdit();
    },
    onKey: (e, field) => {
      if (checking && e.key === "Escape") field.blur();
      else if (submitsOnEnter(e, touchFirst()) && (!checking || canCheck)) {
        e.preventDefault();
        if (checking) held.checkAgain();
        else held.check();
        spec.redraw();
      }
    },
    // Nothing new to read: an empty answer, or one read as it stands.
    painted: (text) => {
      const now = held.session;
      if (now) again.disabled = !text.trim() || (readAsItStands(now) && now.review?.kind !== "failed");
    },
    sideBySide: spec.sideBySide,
    height: { get: () => held.answerHeight, set: (h) => (held.answerHeight = h) },
  });
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

/** A text box for what the editor holds, with Save and Cancel; Enter saves and Escape cancels. */
function editorForm(
  held: HeldSitting,
  e: Editor,
  label: string,
  act: (fn: () => void) => () => void,
  cls = "",
): HTMLElement {
  const form = el("div", cls ? `rc-editor ${cls}` : "rc-editor");
  const box = el("textarea", "rc-edit");
  box.rows = 3;
  box.value = e.text;
  box.setAttribute("aria-label", label);
  if (e.kind === "new") box.placeholder = "Another question to answer from memory later";
  box.addEventListener("input", () => held.typeEditor(box.value));
  const save = act(() => held.saveEditor());
  const close = act(() => held.closeEditor());
  box.addEventListener("keydown", (k) => {
    if (k.key === "Escape") close();
    else if (submitsOnEnter(k, touchFirst())) {
      k.preventDefault();
      save();
    }
  });
  form.append(box, row(button("Save", "rc-primary", save), button(e.kind === "new" ? "Done" : "Cancel", "", close)));
  return form;
}

/** Writing a new question from the one being checked, saved at the same lesson step. */
function newQuestion(held: HeldSitting, e: Editor, card: Card, act: (fn: () => void) => () => void): HTMLElement {
  const section = el("div", "rc-yours rc-new");
  section.append(el("h3", "", `New question · ${stepLabel(card)}`), editorForm(held, e, "New question", act));
  if (held.sitting!.written.length > 0) section.append(writtenList(held));
  return section;
}

/** The questions written while checking this answer, which wait for the next sitting. */
function writtenList(held: HeldSitting): HTMLElement {
  const { written } = held.sitting!;
  const box = el("div", "rc-written");
  const list = el("ol");
  list.setAttribute("aria-label", "Questions written");
  list.append(
    ...written.map((q) => {
      const item = el("li");
      item.innerHTML = questionHtml(q);
      return item;
    }),
  );
  const count = written.length;
  box.append(el("p", "rc-note", `${count} new question${count === 1 ? "" : "s"}, asked from your next review:`), list);
  if (!held.writtenKept) box.append(el("p", "rc-notice rc-error", "This browser won't keep them after the page closes."));
  return box;
}
