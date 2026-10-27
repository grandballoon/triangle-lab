// The admin page (admin.html): the answer key, the material Claude grades
// recall answers against (src/recall/material.ts). Three tabs: a reference
// answer for each question in the deck, a key fact for each lesson step, and
// the house style Claude writes both in. Each piece can be written by
// Claude, refined by an instruction, edited by hand, or restored from its
// history; a piece written for an earlier wording of its question, or an
// earlier text of its step, is marked stale.
//
// It takes the Worker's ADMIN_KEY, kept in this browser like the sync key.
// The rules are pure (model.ts, material.ts); this file holds the page's
// state, renders it and does the I/O (client.ts).

import "katex/dist/katex.min.css";
import "../recall/page.css";
import "./page.css";
import type { CourseLesson } from "../course/course.ts";
import { chapters } from "../lessons.ts";
import { answeredLabel, lessonLabel, questionHtml, sourceHref, stepLabel } from "../recall/labels.ts";
import {
  current,
  DEFAULT_STYLE,
  MAX_INSTRUCTION,
  maxText,
  styleText,
  targetKey,
  type Command,
  type Item,
  type MaterialView,
  type Target,
} from "../recall/material.ts";
import { openAdmin } from "./client.ts";
import {
  factRows,
  originLabel,
  referenceRows,
  staleLabel,
  tally,
  tallyLabel,
  wanting,
  type FactRow,
  type LessonFacts,
  type ReferenceRow,
  type Row,
} from "./model.ts";

type Tab = "references" | "facts" | "style";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "references", label: "Reference answers" },
  { tab: "facts", label: "Key facts" },
  { tab: "style", label: "House style" },
];

/** A piece being edited by hand, or an instruction to refine it being written. */
interface Draft {
  mode: "edit" | "refine";
  text: string;
}

const STYLE_KEY = targetKey({ kind: "style" });

const client = openAdmin();
const root = document.getElementById("admin") as HTMLElement;

/** The material, once loaded. */
let view: MaterialView | null = null;
/** Why the material is not on show: loading, no key, a key turned down, a failure. Null once it is. */
let status: { kind: "loading" | "no-key" | "refused" } | { kind: "failed"; error: string } | null = null;
let tab = tabOf(location.hash);
/** Show only the pieces that want writing: missing or stale. */
let wantingOnly = false;
/** Lessons opened on the key facts tab. */
const openLessons = new Set<string>();
/** Open drafts, by piece. */
const drafts = new Map<string, Draft>();
/** Pieces with a change on its way to the Worker. */
const pending = new Set<string>();
/** Why the last change to a piece failed. */
const errors = new Map<string, string>();
/** Pieces whose history is open. */
const historyOpen = new Set<string>();
/** The lesson whose wanting key facts are being written one after another, and how many are left. */
let bulk: { lesson: string; left: number } | null = null;
/** The control to focus after the next render, by its `data-focus`. */
let focusNext: string | null = null;

window.addEventListener("hashchange", () => {
  tab = tabOf(location.hash);
  render();
});

void load();

// --- State changes --------------------------------------------------------------

async function load(): Promise<void> {
  if (!client.key()) {
    status = { kind: "no-key" };
    render();
    return;
  }
  status = { kind: "loading" };
  render();
  const reply = await client.load();
  if (reply.kind === "ok") {
    view = reply.value;
    status = null;
  } else {
    status = reply.kind === "refused" ? { kind: "refused" } : { kind: "failed", error: reply.error };
  }
  render();
}

/** Send a change to a piece; true if it was made. */
async function send(command: Command): Promise<boolean> {
  const key = targetKey(command.target);
  pending.add(key);
  errors.delete(key);
  render();
  const reply = await client.send(command);
  pending.delete(key);
  if (reply.kind === "ok") {
    if (view) view = { ...view, items: { ...view.items, [key]: reply.value } };
    drafts.delete(key);
  } else if (reply.kind === "refused") {
    status = { kind: "refused" };
  } else {
    errors.set(key, reply.error);
  }
  render();
  return reply.kind === "ok";
}

/** Write a lesson's missing and stale key facts, one after another, stopping at the first that fails. */
async function writeWanting(lesson: LessonFacts): Promise<void> {
  const rows = lesson.rows.filter(wanting);
  bulk = { lesson: lesson.lesson.slug, left: rows.length };
  for (const row of rows) {
    if (!(await send({ kind: "write", target: row.target }))) break;
    bulk.left--;
  }
  bulk = null;
  render();
}

function openDraft(key: string, draft: Draft): void {
  drafts.set(key, draft);
  focusNext = `draft:${key}`;
  render();
}

function closeDraft(key: string): void {
  drafts.delete(key);
  render();
}

// --- Rendering --------------------------------------------------------------------

function render(): void {
  const kept = focused();
  root.replaceChildren(...content());
  const id = focusNext ?? kept?.id;
  focusNext = null;
  const control = id ? root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(id)}"]`) : null;
  if (!control) return;
  control.focus();
  if (control instanceof HTMLTextAreaElement) {
    // The selection it had, or the end of the text for a box newly opened.
    const end = control.value.length;
    const same = kept && kept.id === id ? kept : null;
    control.setSelectionRange(same?.start ?? end, same?.end ?? end);
  }
}

/** The control with focus, and its selection, to give back after a render. */
function focused(): { id: string; start: number | null; end: number | null } | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.dataset.focus || !root.contains(active)) return null;
  const box = active instanceof HTMLTextAreaElement ? active : null;
  return { id: active.dataset.focus, start: box?.selectionStart ?? null, end: box?.selectionEnd ?? null };
}

function content(): HTMLElement[] {
  if (status?.kind === "no-key" || status?.kind === "refused") return [keyForm(status.kind === "refused")];
  if (status?.kind === "loading") return [el("p", "rc-note", "Loading the answer key…")];
  if (status?.kind === "failed" || !view) {
    const panel = el("section", "rc-summary");
    panel.append(
      el("p", "rc-lead", "The answer key didn't load."),
      el("p", "rc-note", status?.kind === "failed" ? status.error : ""),
      row(button("Try again", "rc-primary", () => void load())),
    );
    return [panel];
  }
  const body = tab === "references" ? references(view) : tab === "facts" ? facts(view) : style(view);
  return [tabs(view), ...body, footer()];
}

function tabs(material: MaterialView): HTMLElement {
  // Stale pieces only: a missing one is written when it is first needed,
  // but a stale one was written for something that has since changed.
  const stale: Record<Tab, number> = {
    references: tally(referenceRows(material).flatMap((g) => g.rows)).stale,
    facts: tally(factRows(material).flatMap((l) => l.rows)).stale,
    style: 0,
  };
  const nav = el("nav", "ad-tabs");
  nav.setAttribute("aria-label", "The answer key");
  for (const { tab: t, label } of TABS) {
    const link = el("a", "ad-tab", label);
    link.href = `#${t}`;
    if (t === tab) link.setAttribute("aria-current", "page");
    if (stale[t] > 0) {
      const count = el("span", "ad-count", String(stale[t]));
      count.title = `${stale[t]} stale`;
      link.append(count);
    }
    nav.append(link);
  }
  return nav;
}

/** How a tab's pieces stand, and the switch to show only those that want writing. */
function toolbar(rows: readonly Row[]): HTMLElement {
  const { missing, stale, current: done } = tally(rows);
  const bar = el("div", "ad-toolbar");
  const facts = [`${done} written`];
  if (stale > 0) facts.push(`${stale} stale`);
  if (missing > 0) facts.push(`${missing} not written yet`);
  const toggle = button("Only what needs writing", "rc-small", () => {
    wantingOnly = !wantingOnly;
    render();
  });
  toggle.setAttribute("aria-pressed", String(wantingOnly));
  toggle.dataset.focus = "wanting-only";
  bar.append(el("p", "rc-note", facts.join(" · ")), toggle);
  return bar;
}

function references(material: MaterialView): HTMLElement[] {
  const groups = referenceRows(material);
  const intro = el(
    "p",
    "rc-note ad-intro",
    "Claude grades each answer in a review against its question's reference answer. One is written at a question's first check, and again once the question is reworded.",
  );
  if (groups.length === 0) {
    return [intro, el("p", "rc-note", "No questions in the deck yet. Note one in any lesson, and its reference answer will be here.")];
  }
  const all = groups.flatMap((g) => g.rows);
  const shown = groups
    .map(({ lesson, rows }) => ({ lesson, rows: rows.filter((r) => !wantingOnly || wanting(r)) }))
    .filter((g) => g.rows.length > 0);
  const sections = shown.map(({ lesson, rows }) => {
    const section = el("section", "rc-group");
    const list = el("ol", "ad-items");
    for (const r of rows) {
      const li = el("li");
      li.append(referenceItem(r));
      list.append(li);
    }
    section.append(el("h2", "", lessonLabel(lesson)), list);
    return section;
  });
  return [intro, toolbar(all), ...sections, ...(sections.length === 0 ? [el("p", "rc-note", "Every reference answer is written.")] : [])];
}

function referenceItem(r: ReferenceRow): HTMLElement {
  const question = el("div", "ad-question");
  question.innerHTML = typeset(r.card.question);
  const where = el("p", "ad-where");
  const href = sourceHref(r.card);
  if (href) {
    const link = el("a", "", `${stepLabel(r.card)} ↗`);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    where.append(link);
  } else {
    where.textContent = stepLabel(r.card);
  }
  const context: HTMLElement[] = [question, where];
  if (r.fact) {
    const fact = el("p", "ad-aside");
    fact.innerHTML = `<span class="ad-aside-label">Key fact</span> ${typeset(r.fact)}`;
    context.push(fact);
  }
  return item(r, context, "reference answer");
}

function facts(material: MaterialView): HTMLElement[] {
  const lessons = factRows(material);
  const intro = el(
    "p",
    "rc-note ad-intro",
    "The one idea each lesson step teaches. Claude reads a step's key fact when it writes the reference answer to a question asked there, and when it grades answers to it. One is written at the first check of a question from its step.",
  );
  const sections = chapters
    .map((chapter) => {
      const inChapter = lessons.filter((l) => l.lesson.chapter === chapter.title && (!wantingOnly || l.rows.some(wanting)));
      if (inChapter.length === 0) return null;
      const section = el("section", "rc-group");
      const list = el("ol", "ad-lessons");
      list.append(...inChapter.map(lessonFacts));
      section.append(el("h2", "", chapter.title), list);
      return section;
    })
    .filter((s): s is HTMLElement => s !== null);
  return [intro, toolbar(lessons.flatMap((l) => l.rows)), ...sections];
}

/** A lesson on the key facts tab: a heading that opens it, and its steps once open. */
function lessonFacts(lesson: LessonFacts): HTMLLIElement {
  const { slug } = lesson.lesson;
  const open = openLessons.has(slug);
  const entry = el("li", "ad-lesson");
  const head = el("button", "ad-lesson-head");
  head.type = "button";
  head.dataset.focus = `lesson:${slug}`;
  head.setAttribute("aria-expanded", String(open));
  head.append(el("span", "ad-lesson-name", lesson.lesson.name), el("span", "ad-lesson-tally", tallyLabel(lesson.rows)));
  head.addEventListener("click", () => {
    if (open) openLessons.delete(slug);
    else openLessons.add(slug);
    render();
  });
  entry.append(head);
  if (!open) return entry;

  const body = el("div", "ad-lesson-body");
  const wantingRows = lesson.rows.filter(wanting);
  if (wantingRows.length > 0) {
    const running = bulk?.lesson === slug;
    const all = button(
      running ? `Writing… ${bulk!.left} left` : `Write the ${wantingRows.length} not written or stale`,
      "rc-small",
      () => void writeWanting(lesson),
    );
    all.disabled = bulk !== null || wantingRows.some((r) => pending.has(r.key));
    body.append(row(all));
  }
  const list = el("ol", "ad-items");
  for (const r of lesson.rows) {
    if (wantingOnly && !wanting(r)) continue;
    const li = el("li");
    li.append(factItem(r, lesson.lesson));
    list.append(li);
  }
  body.append(list);
  entry.append(body);
  return entry;
}

function factItem(r: FactRow, lesson: CourseLesson): HTMLElement {
  const href = sourceHref({ lesson: lesson.slug, step: r.step, stepTitle: r.taught.title });
  const title = el("p", "ad-where");
  if (href) {
    const link = el("a", "", `${stepLabel({ lesson: lesson.slug, step: r.step, stepTitle: r.taught.title })} ↗`);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    title.append(link);
  }
  const taught = el("p", "ad-aside");
  taught.innerHTML = typeset(r.taught.text);
  return item(r, [title, taught], "key fact");
}

/** A key fact or a reference answer: what it is about, its text, and what can be done with it. */
function item(r: Row, context: HTMLElement[], noun: string): HTMLElement {
  const box = el("article", "ad-item");
  box.dataset.standing = r.standing;
  box.append(...context);

  const text = el("div", "ad-text");
  if (r.item) {
    text.innerHTML = typeset(current(r.item));
  } else {
    text.classList.add("ad-empty");
    text.textContent = `No ${noun} yet.`;
  }
  box.append(text);
  if (r.item) box.append(el("p", "ad-version", versionLine(r.item, r.item.versions.length - 1)));
  if (r.standing === "stale") box.append(el("p", "ad-stale", staleLabel(r)));

  // While a change is on its way, everything stays where it is, disabled,
  // so the piece does not jump about and cannot be sent twice.
  const busy = pending.has(r.key);
  const draft = drafts.get(r.key);
  if (busy) box.append(el("p", "ad-busy", "Claude is writing…"));
  box.append(draft ? draftForm(r.key, r.target, draft, noun, busy) : actions(r, noun, busy));
  const error = errors.get(r.key);
  if (error) box.append(el("p", "rc-notice rc-error", error));
  if (r.item && historyOpen.has(r.key)) box.append(history(r.target, r.item, false));
  return box;
}

function actions(r: Row, noun: string, busy: boolean): HTMLElement {
  const bar = row();
  const write = button(r.item ? "Write again" : "Write", r.standing === "current" ? "rc-small" : "rc-small rc-primary", () =>
    void send({ kind: "write", target: r.target }),
  );
  write.title = r.item ? `Have Claude write the ${noun} afresh, keeping this one in the history` : `Have Claude write the ${noun}`;
  write.disabled = busy || bulk !== null;
  write.dataset.focus = `write:${r.key}`;
  bar.append(write);
  if (r.item) {
    const held = r.item;
    const refine = button("Refine…", "rc-small", () => openDraft(r.key, { mode: "refine", text: "" }));
    const edit = button("Edit", "rc-small", () => openDraft(r.key, { mode: "edit", text: current(held) }));
    for (const b of [refine, edit]) b.disabled = busy || bulk !== null;
    bar.append(refine, edit, historyToggle(r.key, held));
  }
  return bar;
}

function historyToggle(key: string, held: Item): HTMLButtonElement {
  const open = historyOpen.has(key);
  const count = held.versions.length;
  const toggle = button(open ? "Hide history" : `History (${count})`, "rc-small", () => {
    if (open) historyOpen.delete(key);
    else historyOpen.add(key);
    render();
  });
  toggle.setAttribute("aria-expanded", String(open));
  toggle.dataset.focus = `history:${key}`;
  return toggle;
}

/** Editing a piece by hand, with a preview, or writing the instruction Claude refines it by. */
function draftForm(key: string, target: Target, draft: Draft, noun: string, busy: boolean): HTMLElement {
  const form = el("div", "ad-draft");
  const box = el("textarea");
  box.dataset.focus = `draft:${key}`;
  box.value = draft.text;
  box.readOnly = busy;
  const refining = draft.mode === "refine";
  box.rows = refining ? 2 : 4;
  box.maxLength = refining ? MAX_INSTRUCTION : maxText(target);
  box.setAttribute("aria-label", refining ? `How should the ${noun} change?` : `The ${noun}`);
  if (refining) box.placeholder = "What should change? For example: Say why the ratio is 2 : 1, in one more sentence.";
  const preview = el("div", "ad-preview");
  const show = (): void => {
    preview.innerHTML = typeset(box.value);
  };
  const submit = (): void => {
    const text = box.value.trim();
    if (!text || busy) return;
    if (refining) void send({ kind: "refine", target: target as Exclude<Target, { kind: "style" }>, instruction: text });
    else void send({ kind: "edit", target, text });
  };
  box.addEventListener("input", () => {
    draft.text = box.value;
    if (!refining) show();
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !busy) closeDraft(key);
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  });
  form.append(box);
  if (!refining) {
    show();
    form.append(el("p", "ad-preview-label", "Preview"), preview);
  }
  const done = button(refining ? "Refine" : "Save", "rc-small rc-primary", submit);
  const cancel = button("Cancel", "rc-small", () => closeDraft(key));
  done.disabled = cancel.disabled = busy;
  form.append(row(done, cancel, el("span", "rc-hint", "⌘↵ to send · Esc to cancel")));
  return form;
}

/** Every version of a piece, newest first, each but the current one with a button to bring it back. */
function history(target: Target, held: Item, plain: boolean): HTMLElement {
  const list = el("ol", "rc-history ad-history");
  list.setAttribute("aria-label", "Versions");
  const last = held.versions.length - 1;
  for (let i = last; i >= 0; i--) {
    const version = held.versions[i]!;
    const entry = el("li");
    const text = el("p", plain ? "rc-said" : "rc-said rc-feedback");
    if (plain) text.textContent = version.text;
    else text.innerHTML = typeset(version.text);
    entry.append(el("p", "rc-history-when", versionLine(held, i)), text);
    if (i !== last) {
      const restore = button("Restore", "rc-small", () => void send({ kind: "restore", target, at: version.at }));
      restore.disabled = pending.has(targetKey(target)) || bulk !== null;
      entry.append(row(restore));
    }
    list.append(entry);
  }
  return list;
}

function style(material: MaterialView): HTMLElement[] {
  const held = material.items[STYLE_KEY];
  const text = styleText(held);
  const draft = drafts.get(STYLE_KEY)?.text ?? text;
  const intro = el(
    "p",
    "rc-note ad-intro",
    "Claude follows the house style whenever it writes or refines a key fact or a reference answer. A change here does not touch what is already written: write a piece again to bring it into the new style.",
  );
  const box = el("textarea", "ad-style");
  box.dataset.focus = "draft:style";
  box.value = draft;
  box.rows = 14;
  box.maxLength = maxText({ kind: "style" });
  box.setAttribute("aria-label", "The house style");
  const busy = pending.has(STYLE_KEY);
  const save = button("Save", "rc-small rc-primary", () => void send({ kind: "edit", target: { kind: "style" }, text: box.value }));
  const reset = button("Back to the default", "rc-small", () => void send({ kind: "edit", target: { kind: "style" }, text: DEFAULT_STYLE }));
  const sync = (): void => {
    save.disabled = busy || !box.value.trim() || box.value.trim() === text;
  };
  reset.disabled = busy || text === DEFAULT_STYLE;
  sync();
  box.addEventListener("input", () => {
    drafts.set(STYLE_KEY, { mode: "edit", text: box.value });
    sync();
  });
  const bar = row(save, reset);
  if (held) bar.append(historyToggle(STYLE_KEY, held));
  const panel = el("section", "ad-item");
  panel.append(box, el("p", "ad-version", held ? versionLine(held, held.versions.length - 1) : "The default style."), bar);
  const error = errors.get(STYLE_KEY);
  if (error) panel.append(el("p", "rc-notice rc-error", error));
  if (held && historyOpen.has(STYLE_KEY)) panel.append(history({ kind: "style" }, held, true));
  return [intro, panel];
}

function keyForm(refused: boolean): HTMLElement {
  const panel = el("section", "rc-summary");
  const form = el("form", "rc-row rc-key");
  const input = el("input", "rc-key-input");
  input.type = "password";
  input.autocomplete = "off";
  input.placeholder = "Admin key";
  input.setAttribute("aria-label", "Admin key");
  input.dataset.focus = "admin-key";
  const open = el("button", "rc-button rc-primary", "Open");
  open.type = "submit";
  form.append(input, open);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    client.setKey(input.value);
    void load();
  });
  panel.append(
    el("p", "rc-lead", refused ? "That key wasn't taken." : "This page needs the admin key."),
    el("p", "rc-note", "It is the Worker's ADMIN_KEY secret, not the sync key. This browser keeps it once given."),
    form,
  );
  focusNext = "admin-key";
  return panel;
}

function footer(): HTMLElement {
  const section = el("section", "rc-keep");
  section.append(row(confirmButton("Forget the admin key here", () => {
    client.forgetKey();
    view = null;
    void load();
  })));
  return section;
}

// --- Text ---------------------------------------------------------------------------

/** "Version 3 · Refined: “Name the point.” · 26 Oct 2026, 14:05". */
function versionLine(held: Item, i: number): string {
  const version = held.versions[i]!;
  return `Version ${i + 1} · ${originLabel(version, answeredLabel)} · ${answeredLabel(version.at)}`;
}

const typeset = memo(questionHtml);

/** `fn`, remembering each answer: KaTeX is slow, and a render typesets every visible piece. */
function memo(fn: (text: string) => string): (text: string) => string {
  const seen = new Map<string, string>();
  return (text) => {
    let html = seen.get(text);
    if (html === undefined) {
      html = fn(text);
      seen.set(text, html);
    }
    return html;
  };
}

function tabOf(hash: string): Tab {
  const name = hash.replace(/^#/, "");
  return TABS.some((t) => t.tab === name) ? (name as Tab) : "references";
}

// --- Markup helpers -------------------------------------------------------------------

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
