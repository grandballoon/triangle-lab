// The review beside a lesson. "Check in the lesson", in a review sitting,
// opens the lesson in the same tab and takes the sitting along (session.ts
// `inLesson`, kept for the tab by sitting.ts). Every lesson page then shows
// the card being checked in a sheet floating over the lesson: the question,
// the answer being corrected, Claude's reading on its words, and rewording the
// question or writing new ones, all as on the recall page (card.ts). The
// sheet moves, folds and sizes like the question sheet (float.ts). "Back to
// review" goes back to the recall page, which takes the sitting up where it
// was; the ways out of the card are there.
//
// Both kinds of lesson page mount it: page.ts for a standalone lesson, the
// lab page's main.ts for a lab lesson. Neither says anything else to it.

import "katex/dist/katex.min.css";
import "./capture.css";
// Before beside.css, which sizes some of its pieces for the sheet.
import "./sheet.css";
import "./beside.css";
import { cardParts } from "./card.ts";
import { el, redraw } from "./dom.ts";
import { floatSheet } from "./float.ts";
import { GAP } from "./frame.ts";
import { openRecall, type RecallSync } from "./remote.ts";
import { cardInLesson, progress } from "./session.ts";
import { HeldSitting } from "./sitting.ts";
import type { RecallStore } from "./store.ts";

/** Where the learner last put the review sheet (a frame.ts Box). */
const BOX_KEY = "triangle-lab:recall-beside";

const FOLD_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>';

/**
 * Add the review sheet to the page, shown while the tab's sitting has been
 * taken to the lesson. `storage` is the tab's, where the sitting is kept.
 */
export function mountBeside(
  doc: Document = document,
  recall: { store: RecallStore; sync: RecallSync } = openRecall(),
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = tabStorage(),
): void {
  const win = doc.defaultView!;
  const sheet = el("section", "recall-sheet rc-beside");
  sheet.id = "recall-beside";
  sheet.hidden = true;
  sheet.setAttribute("aria-label", "Your review");
  const bar = el("div", "recall-bar");
  bar.title = "Drag to move";
  const head = el("div", "recall-head");
  const back = el("a", "rc-beside-back", "Back to review");
  back.href = "recall.html";
  back.title = "Go back to the review, to say how it went";
  const fold = el("button", "recall-icon recall-fold");
  fold.type = "button";
  fold.innerHTML = FOLD_ICON;
  fold.setAttribute("aria-controls", "recall-beside-body");
  bar.append(head, back, fold);
  const body = el("div", "recall-body rc-beside-body");
  body.id = "recall-beside-body";
  const grip = el("div", "recall-grip");
  grip.title = "Drag to resize";
  grip.setAttribute("aria-hidden", "true");
  sheet.append(bar, body, grip);
  doc.body.append(sheet);

  let relayout: (() => void) | null = null;
  /** Whether the sheet has been drawn yet; until it has, nothing in it takes the focus from the lesson. */
  let drawn = false;
  const held = new HeldSitting(recall.store, recall.sync, storage, () => render());

  // Until moved, it sits at the top left, clear of the top bar and the docked rail.
  const place = (): { left: number; top: number } => {
    const top = doc.getElementById("topbar")?.getBoundingClientRect().bottom ?? 0;
    const rail = parseFloat(win.getComputedStyle(doc.documentElement).getPropertyValue("--rail-inset")) || 0;
    return { left: rail + GAP, top: top + GAP };
  };
  const floating = floatSheet({ sheet, bar, body, fold, grip }, BOX_KEY, place, () =>
    body.querySelector<HTMLTextAreaElement>(".rc-answer")?.focus(),
  );

  function render(): void {
    const card = cardInLesson(held.sitting, recall.store.get());
    sheet.hidden = card === null;
    if (!card) return;
    const { done, total } = progress(held.session!);
    head.textContent = `Review · ${done + 1} of ${total}`;
    redraw(
      body,
      () => {
        const { parts, layout } = cardParts(held, card, {
          sideBySide: () => false,
          gradesByKey: false,
          onEdit: () => {},
          redraw: render,
        });
        body.replaceChildren(...parts);
        relayout = layout;
      },
      () => {
        const opened = held.editorOpened ? body.querySelector<HTMLTextAreaElement>(".rc-editor textarea") : null;
        held.editorOpened = false;
        return opened;
      },
      () => (drawn ? body.querySelector<HTMLTextAreaElement>(".rc-editor textarea") : null),
    );
    drawn = true;
    floating.layout();
  }

  // Back on the recall page, the sitting is there, not here.
  back.addEventListener("click", () => held.inLesson(false));

  // Keys typed in the sheet are the learner's, not the lesson's shortcuts.
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    sheet.addEventListener(type, (e) => e.stopPropagation());
  }

  win.addEventListener("resize", () => relayout?.());
  // A page the browser kept while the recall page had the sitting comes back
  // with the sitting as it was then; take it up as it is now.
  win.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    held.restore();
    render();
  });
  render();
}

function tabStorage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}
