// The answers document on the recall page: each question a heading, with its
// answer written straight under it, and every edit kept as it is typed.
//
// A change from another tab or device is taken in place. The answer being
// typed in is left alone, and the sections are drawn again only when the
// headings themselves have changed, keeping the learner's place.
//
// The document's shape is pure (answers.ts); this draws it and keeps edits.

import { answerDocument, sameOutline, type AnswerPart, type AnswerSection } from "./answers.ts";
import { MAX_RESPONSE, setResponse, type Deck } from "./deck.ts";
import { el } from "./dom.ts";
import { questionHtml } from "./labels.ts";
import type { RecallStore } from "./store.ts";

export interface AnswersView {
  element: HTMLElement;
  /** Take in the deck as it now stands. */
  refresh(deck: Deck): void;
  /** Size each answer to its text, once the document is on the page or its width has changed. */
  layout(): void;
}

export function answersView(store: RecallStore): AnswersView {
  const element = el("article", "rc-document");
  const warning = el("p", "rc-notice rc-error rc-document-warning", "This browser won't keep your latest edits after the page closes.");
  warning.hidden = true;
  const body = el("div");
  element.append(warning, body);

  const fields = new Map<string, HTMLTextAreaElement>();
  let shown: AnswerPart[] = [];

  const answerField = (section: AnswerSection): HTMLTextAreaElement => {
    const field = el("textarea", "rc-document-answer");
    field.rows = 1;
    field.maxLength = MAX_RESPONSE;
    field.value = section.text;
    field.placeholder = "Write your answer…";
    field.setAttribute("aria-label", `Answer to: ${section.question}`);
    field.addEventListener("input", () => {
      warning.hidden = store.update((d) => setResponse(d, section.id, field.value, Date.now()));
      fit(field);
    });
    fields.set(section.id, field);
    return field;
  };

  const draw = (doc: AnswerPart[]): void => {
    fields.clear();
    if (doc.length === 0) {
      body.replaceChildren(el("p", "rc-note", "No questions yet."));
      return;
    }
    body.replaceChildren(
      ...doc.map((part) => {
        const lesson = el("section", "rc-document-lesson");
        lesson.append(
          el("h2", "", part.title),
          ...part.sections.map((section) => {
            const block = el("section", "rc-document-section");
            const heading = el("h3");
            heading.innerHTML = questionHtml(section.question);
            block.append(heading, answerField(section));
            return block;
          }),
        );
        return lesson;
      }),
    );
  };

  const layout = (): void => fields.forEach(fit);

  /** The section being typed in, and where in it, to come back to after a redraw. */
  const place = (): { id: string; from: number; to: number } | null => {
    const active = element.ownerDocument.activeElement;
    for (const [id, field] of fields) {
      if (field === active) return { id, from: field.selectionStart, to: field.selectionEnd };
    }
    return null;
  };

  const refresh = (deck: Deck): void => {
    const next = answerDocument(deck);
    if (!sameOutline(shown, next)) {
      const was = place();
      draw(next);
      layout();
      const field = was && fields.get(was.id);
      if (field && was) {
        field.focus();
        field.setSelectionRange(was.from, was.to);
      }
    } else {
      const active = element.ownerDocument.activeElement;
      for (const section of next.flatMap((part) => part.sections)) {
        const field = fields.get(section.id);
        if (field && field !== active && field.value !== section.text) {
          field.value = section.text;
          fit(field);
        }
      }
    }
    shown = next;
  };

  shown = answerDocument(store.get());
  draw(shown);
  return { element, refresh, layout };
}

function fit(field: HTMLTextAreaElement): void {
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
}
