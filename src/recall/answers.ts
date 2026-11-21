// The learner's answers read as one document: a part for each lesson, and in
// it a section for each question, with the question as its heading and the
// standing answer (deck.ts `responseText`) as its text.
//
// The headings are the questions themselves, so they are never parsed back out
// of what the learner types: each section's text belongs to one card by id,
// and an answer can hold anything, even a line that looks like a heading.
//
// Pure: answers-view.ts draws it and keeps the edits.

import { responseText, type Deck } from "./deck.ts";
import { byLesson, lessonLabel } from "./labels.ts";

export interface AnswerSection {
  /** The id of the card this section answers. */
  id: string;
  question: string;
  text: string;
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
    sections: cards.map((card) => ({ id: card.id, question: card.question, text: responseText(deck, card) })),
  }));
}

/** Whether two documents have the same headings in the same order, so only their answers can differ. */
export function sameOutline(a: readonly AnswerPart[], b: readonly AnswerPart[]): boolean {
  const outline = (doc: readonly AnswerPart[]): string =>
    JSON.stringify(doc.map((part) => [part.lesson, part.title, part.sections.map((s) => [s.id, s.question])]));
  return outline(a) === outline(b);
}
