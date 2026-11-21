// The learner's answers read as one document: a part for each lesson, and in
// it a section for each question, with the question as its heading, the
// standing answer (deck.ts `responseText`) as its text, Claude's last check of
// it, and the answers given at reviews as its history.
//
// The headings are the questions themselves, so they are never parsed back out
// of what the learner types: each section's text belongs to one card by id,
// and an answer can hold anything, even a line that looks like a heading.
//
// Pure: answers-view.ts draws it, keeps the edits and makes the calls.

import type { CheckRequest } from "./check.ts";
import { responseText, setResponseCheck, type Attempt, type Deck, type KeptCheck, type Span, type Verdict } from "./deck.ts";
import { byLesson, lessonLabel, placeLabel } from "./labels.ts";

export interface AnswerSection {
  /** The id of the card this section answers. */
  id: string;
  question: string;
  /** Where the question was asked, as Claude is told it. */
  where: string;
  text: string;
  /** Claude's last check of this answer, if it is still kept. */
  checked: KeptCheck | null;
  /** The answers given at reviews, oldest first. */
  attempts: Attempt[];
}

export interface AnswerPart {
  /** The lesson's slug. */
  lesson: string;
  /** The lesson's heading. */
  title: string;
  sections: AnswerSection[];
}

/** The deck's answers as a document, in the order of the course. */
export function answerDocument(deck: Deck): AnswerPart[] {
  return byLesson(deck.cards).map(({ lesson, cards }) => ({
    lesson,
    title: lessonLabel(lesson),
    sections: cards.map((card) => ({
      id: card.id,
      question: card.question,
      where: placeLabel(card),
      text: responseText(deck, card),
      checked: deck.responses?.find((r) => r.card === card.id)?.checked ?? null,
      attempts: card.attempts,
    })),
  }));
}

/**
 * Whether two documents have the same headings and histories in the same
 * order, so only their answers and checks can differ, which are taken in place.
 */
export function sameOutline(a: readonly AnswerPart[], b: readonly AnswerPart[]): boolean {
  const outline = (doc: readonly AnswerPart[]): string =>
    JSON.stringify(doc.map((part) => [part.lesson, part.title, part.sections.map((s) => [s.id, s.question, s.attempts.length])]));
  return outline(a) === outline(b);
}

/**
 * The selection `from`..`to` of `text` as a passage of the answer as it is
 * sent, which is trimmed, with the spaces at its own ends left off. Null for a
 * selection holding no words.
 */
export function passageOf(text: string, from: number, to: number): Span | null {
  const answer = text.trim();
  const lead = text.length - text.trimStart().length;
  const clamp = (at: number): number => Math.min(Math.max(at - lead, 0), answer.length);
  const start = clamp(from);
  const picked = answer.slice(start, clamp(to));
  if (!picked.trim()) return null;
  const inset = picked.length - picked.trimStart().length;
  return { start: start + inset, end: start + inset + picked.trim().length };
}

/**
 * What to send to have `text`, the section's answer as it now stands, checked:
 * all of it, or the passage selected. Null when there are no words to check.
 */
export function checkRequestFor(
  section: Pick<AnswerSection, "question" | "where">,
  text: string,
  selection: { from: number; to: number } | null = null,
): CheckRequest | null {
  const answer = text.trim();
  if (!answer) return null;
  const request = { question: section.question, where: section.where, answer };
  if (!selection) return request;
  const span = passageOf(text, selection.from, selection.to);
  return span ? { ...request, span } : null;
}

/** The words a check was of: its passage, or null for the whole answer. */
export function checkedPassage(check: Pick<KeptCheck, "text" | "span">): string | null {
  return check.span ? check.text.slice(check.span.start, check.span.end) : null;
}

/** Whether the answer has changed since it was sent to be checked. */
export function checkIsStale(check: Pick<KeptCheck, "text">, text: string): boolean {
  return check.text !== text.trim();
}

/**
 * Keep Claude's check of card `id`. A reply is dropped if the card has gone
 * or its question has been reworded since it was asked.
 */
export function settleCheck(deck: Deck, id: string, request: CheckRequest, verdict: Verdict, now: number): Deck {
  const card = deck.cards.find((c) => c.id === id);
  if (card?.question !== request.question) return deck;
  const base: KeptCheck = { text: request.answer, verdict };
  return setResponseCheck(deck, id, request.span ? { ...base, span: request.span } : base, now);
}
