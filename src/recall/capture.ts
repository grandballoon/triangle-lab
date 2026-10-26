// Noting a question to recall later, from inside a lesson. A pill in the top
// bar (or the Q key) opens a sheet where the learner writes a question; it is
// saved with the lesson and the step they were on, to be answered from memory
// on the recall page (recall.html) once it falls due. The sheet also lists the
// questions already asked in this lesson.
//
// Both kinds of lesson page mount it: page.ts for a standalone lesson, the lab
// page's main.ts for a lab lesson. The page says where the learner is through
// `where`; everything else is here.

import "./capture.css";
import { addCard, dueCards, lessonCards, newCard, removeCard, type Place } from "./deck.ts";
import { submitsOnEnter, touchFirst } from "./keys.ts";
import { questionHtml, stepLabel, lessonName } from "./labels.ts";
import { openRecall } from "./remote.ts";
import type { RecallStore } from "./store.ts";

// A card with a question mark. No text nodes, so the pill's text is its count.
const ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="2" y="2.5" width="12" height="11" rx="2"/>' +
  '<path d="M6.3 6.4a1.75 1.75 0 1 1 2.4 1.6c-.45.2-.7.55-.7 1v.35"/>' +
  '<circle cx="8" cy="11.2" r=".2" fill="currentColor"/></svg>';

const HINT = "↵ save · ⇧↵ new line · esc close";

/** Gap kept between the sheet and the pill, and the window's edges. */
const GAP = 8;

export interface RecallCapture {
  /** Show the lesson and step the learner is on now, as after a lesson swap. */
  refresh(): void;
}

/**
 * Add the pill to the top bar, before the lesson's heading, and the sheet to
 * the page. `where` says which lesson and step are current; null hides the
 * pill.
 */
export function mountRecall(
  topbar: HTMLElement,
  where: () => Place | null,
  store: RecallStore = openRecall().store,
): RecallCapture {
  const doc = topbar.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  const pill = el("button", "nav-pill nav-recall");
  pill.type = "button";
  pill.title = "Note a question to recall later (Q)";
  pill.setAttribute("aria-label", "Note a question to recall later");
  pill.setAttribute("aria-controls", "recall-sheet");
  pill.setAttribute("aria-expanded", "false");
  pill.innerHTML = ICON;
  const count = el("span", "nav-recall-count");
  pill.append(count);
  topbar.insertBefore(pill, topbar.querySelector("#heading"));

  const sheet = el("div", "recall-sheet");
  sheet.id = "recall-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Question to recall later");
  const head = el("div", "recall-head", "Question for later");
  const place = el("div", "recall-place");
  const input = el("textarea", "recall-input");
  input.rows = 3;
  input.placeholder = "What should you be able to answer from memory?";
  input.setAttribute("aria-label", "Question");
  const row = el("div", "recall-row");
  const hint = el("span", "recall-hint", HINT);
  const save = el("button", "recall-save", "Save");
  save.type = "button";
  row.append(hint, save);
  const asked = el("section", "recall-asked");
  const askedHead = el("h3");
  const list = el("ol");
  asked.append(askedHead, list);
  const review = el("a", "recall-review");
  review.href = "recall.html";
  sheet.append(head, place, input, row, asked, review);
  doc.body.append(sheet);

  const isOpen = (): boolean => !sheet.hidden;

  const render = (): void => {
    const here = where();
    pill.hidden = here === null;
    if (!here) return;
    const deck = store.get();
    const mine = lessonCards(deck, here.lesson);
    count.textContent = mine.length > 0 ? String(mine.length) : "";
    place.textContent = `${lessonName(here.lesson)} · ${stepLabel(here)}`;
    asked.hidden = mine.length === 0;
    askedHead.textContent = `Asked in this lesson (${mine.length})`;
    list.replaceChildren(
      ...mine.map((card) => {
        const item = el("li");
        const text = el("div", "recall-q");
        text.innerHTML = questionHtml(card.question);
        const step = el("span", "recall-q-step", `Step ${card.step + 1}`);
        item.append(step, text, removeButton(() => store.update((d) => removeCard(d, card.id, Date.now()))));
        return item;
      }),
    );
    const due = dueCards(deck, Date.now()).length;
    review.textContent = due > 0 ? `Review your questions · ${due} due →` : "Review your questions →";
  };

  const position = (): void => {
    if (!isOpen()) return;
    const anchor = pill.getBoundingClientRect();
    const width = sheet.offsetWidth;
    const left = Math.min(anchor.left, window.innerWidth - width - GAP);
    sheet.style.left = `${Math.max(GAP, left)}px`;
    sheet.style.top = `${anchor.bottom + GAP}px`;
  };

  const open = (): void => {
    if (where() === null) return;
    render();
    sheet.hidden = false;
    pill.setAttribute("aria-expanded", "true");
    hint.textContent = HINT;
    hint.classList.remove("warn");
    position();
    input.focus();
  };

  // A draft left in the box is kept for next time.
  const close = (): void => {
    if (!isOpen()) return;
    sheet.hidden = true;
    pill.setAttribute("aria-expanded", "false");
  };

  const submit = (): void => {
    const here = where();
    const card = here && newCard(newId(), input.value, here, Date.now());
    if (!card) {
      input.focus();
      return;
    }
    const saved = store.update((d) => addCard(d, card));
    input.value = "";
    if (!saved) {
      // Kept for this page only; say so rather than let it vanish quietly.
      hint.textContent = "Saved for now, but this browser won't keep it after the page closes.";
      hint.classList.add("warn");
      return;
    }
    close();
    pill.focus();
    pill.classList.remove("saved");
    void pill.offsetWidth; // restart the confirmation pulse
    pill.classList.add("saved");
  };

  pill.addEventListener("click", () => (isOpen() ? close() : open()));
  save.addEventListener("click", submit);

  // Keys typed in the sheet are the learner's, not the lesson's shortcuts.
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    sheet.addEventListener(type, (e) => e.stopPropagation());
  }
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      pill.focus();
    } else if (e.target === input && submitsOnEnter(e, touchFirst())) {
      e.preventDefault();
      submit();
    }
  });

  doc.defaultView?.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isOpen() || !sheet.isConnected) return;
    if ((e.key === "q" || e.key === "Q") && !editable(e.target)) {
      e.preventDefault();
      open();
    }
  });

  // Pressing anywhere else puts the sheet away.
  doc.addEventListener(
    "pointerdown",
    (e) => {
      const target = e.target as Node | null;
      if (isOpen() && target && !sheet.contains(target) && !pill.contains(target)) close();
    },
    true,
  );

  doc.defaultView?.addEventListener("resize", position);
  store.subscribe(render);
  render();
  return { refresh: render };
}

/** A delete button that asks once more before it deletes. */
function removeButton(remove: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "recall-remove";
  button.textContent = "×";
  button.setAttribute("aria-label", "Delete question");
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (button.dataset.confirm) {
      remove();
      return;
    }
    button.dataset.confirm = "true";
    button.textContent = "Delete?";
  });
  button.addEventListener("blur", () => {
    delete button.dataset.confirm;
    button.textContent = "×";
  });
  return button;
}

function editable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName ?? ""));
}

/** A unique id. randomUUID needs a secure context, which a LAN address lacks. */
export function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
