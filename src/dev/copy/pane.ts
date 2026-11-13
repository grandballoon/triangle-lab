// The copy editor: a Copy tab in the step column of every lesson page, under
// `vite dev` and on staging, where the author edits the lesson's copy (its
// steps, what its idea is like, and what it is used for) as the source writes
// it, `$…$` and all, and has Claude fact-check it as drafted, much as the
// Explain tab has Claude check a learner's explanation.
//
// Saving posts every change at once to COPY_ENDPOINT. The dev server
// (tools/copy-editor-plugin.ts) writes them into the source files and Vite
// reloads the page; the staging Worker (worker/staging.ts) commits them to
// the staging branch in one commit, which redeploys staging, and the editor
// reopens on the copy as committed. Drafts are kept in localStorage until
// saved, so a reload loses none.
//
// Every decision is edit.ts's, over plain values; this holds the state,
// renders it and does the I/O. The plugin injects this module into pages
// under `vite dev` and in the staging build only; no page imports it, so it
// never reaches a production build.

import "./copy.css";
import { LIKES_HEADING, USES_HEADING, whenStepColumn, type StepList } from "../../lab/steps.ts";
import { richHtml } from "../../lab/math.ts";
import { runsOf } from "../../recall/remarks.ts";
import { submitsOnModEnter } from "../../recall/keys.ts";
import type { CopyCheck } from "./check.ts";
import {
  applyFix,
  askCheck,
  changed,
  checkedAsItStands,
  discardAll,
  editField,
  fieldsOf,
  openCopy,
  problems,
  remarksOf,
  reopen,
  saveOf,
  settleCheck,
  typedOf,
  valueOf,
  type CopyState,
  type FieldInfo,
  type Placed,
} from "./edit.ts";
import { CHECK_ENDPOINT, COPY_ENDPOINT, SECTIONS, type CopyListing, type SaveReply, type Section } from "./wire.ts";

/** Vite reloads the page once the source is written; this is the fallback. */
const RELOAD_FALLBACK_MS = 1500;
const DRAFTS_KEY = (page: string) => `copy-editor:${page}`;
/** Set while the Copy tab is open, so the reload after a save comes back to it. */
const OPEN_KEY = "copy-editor:open";

const HEADINGS: Record<Section, string> = { steps: "Steps", likes: LIKES_HEADING, uses: USES_HEADING };
const ENTRY: Record<Section, string> = { steps: "Step", likes: "Like", uses: "Use" };

const page = (): string => location.pathname + location.search;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", className, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/** Mathematics between dollar signs typeset, leniently: Claude's notes and fixes. */
const prose = (text: string): string => richHtml(text, false);

function stored(key: string, storage: () => Storage): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null, storage: () => Storage): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Not kept; drafts then last only as long as the page.
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({ error: `${res.status} ${res.statusText}` }))) as T | { error: string };
  if (typeof body === "object" && body !== null && "error" in body) throw new Error(body.error);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return body as T;
}

const post = <T>(url: string, body: unknown): Promise<T> =>
  call<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// --- The toast --------------------------------------------------------------

const toast = el("div", "copy-toast");
toast.setAttribute("role", "status");
let toastTimer = 0;
function notify(text: string, error = false): void {
  if (!toast.isConnected) document.body.append(toast);
  toast.textContent = text;
  toast.classList.toggle("copy-error", error);
  toast.classList.add("copy-show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("copy-show"), error ? 6000 : 2600);
}

// --- One field --------------------------------------------------------------

/** A field's box, with what is drawn around it. */
interface FieldView {
  info: FieldInfo;
  input: HTMLTextAreaElement;
  marks: HTMLElement;
  preview: HTMLElement;
  problem: HTMLElement;
  remarks: HTMLElement;
  /** What it was last painted from, so a keystroke repaints only its own field. */
  painted: string;
}

function fieldView(info: FieldInfo, file: string, on: { input: (v: FieldView) => void; key: (e: KeyboardEvent) => void }): HTMLElement {
  const box = el("div", `copy-field copy-${info.field}`);
  if (info.source === null) {
    box.append(el("div", "copy-label", info.field), el("div", "copy-built", `Built in code; edit it in ${file}.`));
    return box;
  }
  const label = el("label", "copy-label", info.field);
  const paper = el("div", "copy-paper");
  const marks = el("div", "copy-marks");
  marks.setAttribute("aria-hidden", "true");
  const input = el("textarea", "copy-input");
  input.rows = 1;
  input.spellcheck = true;
  input.id = `copy-${info.id.replaceAll(".", "-")}`;
  label.htmlFor = input.id;
  paper.append(marks, input);
  const view: FieldView = { info, input, marks, preview: el("div", "copy-preview"), problem: el("div", "copy-problem"), remarks: el("div", "copy-remarks"), painted: "" };
  input.addEventListener("input", () => on.input(view));
  input.addEventListener("keydown", (e) => {
    // A field is one line in the source; Enter would only be folded into a space.
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) e.preventDefault();
    if (e.key === "Escape") input.blur();
    on.key(e);
  });
  input.addEventListener("focus", () => box.classList.add("copy-focus"));
  input.addEventListener("blur", () => box.classList.remove("copy-focus"));
  box.append(label, paper, view.problem, view.preview, view.remarks);
  views.set(info.id, view);
  return box;
}

/** The box grows with its text, so it never scrolls and the marks behind it stay under their words. */
function fit(input: HTMLTextAreaElement): void {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight + 2}px`;
}

function paintField(view: FieldView, state: CopyState, placed: readonly Placed[]): void {
  const { info, input } = view;
  const text = valueOf(state, info.id);
  const edited = info.id in state.drafts;
  const from = JSON.stringify([text, edited, placed.map((p) => [p.index, p.place, p.remark])]);
  if (from === view.painted) return;
  view.painted = from;
  if (input.value !== text) input.value = text;
  const typed = typedOf(state, info);
  view.input.closest(".copy-field")?.classList.toggle("copy-edited", edited);
  view.problem.textContent = edited ? (typed.problem ?? "") : "";
  view.preview.innerHTML = info.field === "text" ? (typed.preview ?? "") : "";
  view.marks.replaceChildren(
    ...runsOf(
      input.value,
      placed.map((p) => p.place),
    ).map(({ text: run, remark }) => (remark === null ? document.createTextNode(run) : el("mark", "", run))),
  );
  view.remarks.replaceChildren(...placed.map((p) => remarkCard(view, p)));
  fit(input);
}

function remarkCard(view: FieldView, { remark, index, place }: Placed): HTMLElement {
  const card = el("div", `copy-remark${place ? "" : " copy-gone"}`);
  card.append(el("div", "copy-quote", remark.quote));
  const note = el("div", "copy-note");
  note.innerHTML = prose(remark.note);
  card.append(note);
  if (!place) card.append(el("div", "copy-done", "Dealt with"));
  else if (remark.fix) {
    const row = el("div", "copy-fix");
    const fix = el("span", "copy-fix-text");
    fix.textContent = remark.fix;
    row.append(el("span", "copy-fix-label", "Fix"), fix, button("copy-apply", "Apply", () => update(applyFix(current!.state, index))));
    card.append(row);
  }
  card.addEventListener("click", (e) => {
    if (!place || (e.target as Element).closest("button")) return;
    view.input.focus();
    view.input.setSelectionRange(place.start, place.end);
  });
  return card;
}

// --- The pane ---------------------------------------------------------------

const pane = el("div", "copy");
const head = el("div", "copy-head");
const title = el("div", "copy-name", "Copy");
const where = el("div", "copy-where");
head.append(title, where);
const overall = el("div", "copy-overall-slot");
const body = el("div", "copy-body");
const footer = el("div", "copy-footer");
const count = el("span", "copy-count");
const discard = button("copy-button", "Discard", () => {
  if (current && confirm("Discard every change to this copy?")) update(discardAll(current.state));
});
const checkButton = button("copy-button", "Check with Claude", () => void check());
const saveButton = button("copy-button copy-primary", "Save", () => void save());
footer.append(count, discard, checkButton, saveButton);
pane.append(head, overall, body, footer);

// Keys typed in the pane are the author's, not the lesson's shortcuts.
for (const type of ["keydown", "keyup", "keypress"] as const) pane.addEventListener(type, (e) => e.stopPropagation());

/** The copy open in the pane, for the page it is of. */
let current: { page: string; state: CopyState; saving: boolean } | null = null;
const views = new Map<string, FieldView>();
/** The page whose copy is being fetched, so a fetch for one since left is dropped. */
let loading: string | null = null;

function onKey(e: KeyboardEvent): void {
  if (submitsOnModEnter(e)) {
    e.preventDefault();
    void check();
  } else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    void save();
  }
}

function build(listing: CopyListing): void {
  views.clear();
  const sections = SECTIONS.filter((s) => listing[s].entries.length > 0).map((section) => {
    const block = el("section", "copy-section");
    block.append(el("h3", "copy-heading", HEADINGS[section]));
    const fields = fieldsOf(listing).filter((f) => f.section === section);
    listing[section].entries.forEach((_, index) => {
      const entry = el("div", "copy-entry");
      entry.append(el("div", "copy-entry-name", `${ENTRY[section]} ${index + 1}`));
      for (const info of fields.filter((f) => f.index === index)) {
        entry.append(fieldView(info, listing[section].file, { input: (v) => update(editField(current!.state, v.info.id, v.input.value)), key: onKey }));
      }
      block.append(entry);
    });
    return block;
  });
  body.replaceChildren(...sections);
  const files = [...new Set(SECTIONS.map((s) => listing[s].file))];
  where.textContent = files.join(" · ");
}

function overallCard(state: CopyState, at: string): HTMLElement | null {
  const c = state.check;
  if (c.kind === "none") return null;
  const card = el("div", "copy-remark copy-overall");
  card.dataset.kind = c.kind === "done" ? (c.result.remarks.length ? "remarks" : "clear") : c.kind;
  card.append(el("h3", "", c.kind === "checking" ? "Claude is checking" : c.kind === "failed" ? "No check" : "Claude's check"));
  const said = el("div", "copy-said");
  if (c.kind === "checking") said.textContent = "Reading the copy, and searching the web for what it claims. This can take a minute or two.";
  else if (c.kind === "failed") said.textContent = c.error;
  else said.innerHTML = prose(c.result.summary);
  card.append(said);
  if (c.kind === "done" && !checkedAsItStands(state, at)) card.append(el("div", "copy-quiet", "The copy has changed since; check again to have Claude read it as it stands."));
  return card;
}

function paint(): void {
  if (!current) return;
  const { state, page: at, saving } = current;
  const remarks = remarksOf(state);
  for (const view of views.values()) paintField(view, state, remarks.get(view.info.id) ?? []);
  const card = overallCard(state, at);
  overall.replaceChildren(...(card ? [card] : []));

  const n = changed(state).length;
  const wrong = problems(state).length;
  count.textContent = wrong ? `${wrong} to fix before saving` : n ? `${n} change${n === 1 ? "" : "s"}` : "No changes";
  count.classList.toggle("copy-error", wrong > 0);
  discard.disabled = saving || Object.keys(state.drafts).length === 0;
  saveButton.disabled = saving || saveOf(state, at) === null;
  saveButton.textContent = saving ? "Saving…" : "Save";
  checkButton.disabled = saving || askCheck(state, at) === null;
  checkButton.textContent = state.check.kind === "checking" ? "Checking…" : state.check.kind === "none" ? "Check with Claude" : "Check again";
}

/** Take `state` as the pane's, keep its drafts, and show it. */
function update(state: CopyState): void {
  if (!current) return;
  if (state !== current.state) {
    current.state = state;
    const drafts = Object.keys(state.drafts).length ? JSON.stringify(state.drafts) : null;
    store(DRAFTS_KEY(current.page), drafts, () => localStorage);
  }
  paint();
}

function status(text: string): void {
  current = null;
  views.clear();
  where.textContent = "";
  overall.replaceChildren();
  body.replaceChildren(el("div", "copy-quiet copy-status", text));
  count.textContent = "";
  for (const b of [discard, checkButton, saveButton]) b.disabled = true;
}

/** Open the pane on this page's copy as the source has it. */
async function load(): Promise<void> {
  const at = page();
  if (loading === at || current?.page === at) return;
  loading = at;
  status("Reading the copy…");
  try {
    const listing = await call<CopyListing>(`${COPY_ENDPOINT}?page=${encodeURIComponent(at)}`);
    if (page() !== at) return;
    const kept = stored(DRAFTS_KEY(at), () => localStorage);
    const opened = openCopy(listing, kept ? JSON.parse(kept) : null);
    current = { page: at, state: opened.state, saving: false };
    build(listing);
    update(opened.state);
    if (opened.dropped) notify(`${opened.dropped} kept draft${opened.dropped === 1 ? " was" : "s were"} dropped: the copy changed under ${opened.dropped === 1 ? "it" : "them"}.`, true);
  } catch (err) {
    if (page() === at) status(`This page's copy cannot be edited here: ${message(err)}`);
  } finally {
    if (loading === at) loading = null;
  }
}

async function check(): Promise<void> {
  if (!current || current.saving) return;
  const open = current;
  const asked = askCheck(open.state, open.page);
  if (!asked) return;
  update(asked.state);
  let outcome: { check: CopyCheck } | { error: string };
  try {
    outcome = { check: await post<CopyCheck>(CHECK_ENDPOINT, asked.request) };
  } catch (err) {
    outcome = { error: message(err) };
  }
  // The page may have moved to another lesson meanwhile; the check is then dropped with its copy.
  if (current !== open) return;
  update(settleCheck(open.state, asked.request, outcome));
}

async function save(): Promise<void> {
  if (!current || current.saving) return;
  const open = current;
  const edit = saveOf(open.state, open.page);
  if (!edit) return;
  open.saving = true;
  paint();
  try {
    const reply = await post<SaveReply>(COPY_ENDPOINT, edit);
    if (reply.commit === null) {
      // The dev server wrote the files, and Vite reloads the page with them;
      // the drafts kept then read as the source does, and go.
      notify(reply.files.length ? `Saved to ${reply.files.join(", ")}` : "Nothing to save.");
      if (reply.files.length) window.setTimeout(() => location.reload(), RELOAD_FALLBACK_MS);
      else open.saving = false;
      paint();
      return;
    }
    // Staging: the page runs the old build until it redeploys, so the editor
    // reopens on the copy as committed.
    const listing = await call<CopyListing>(`${COPY_ENDPOINT}?page=${encodeURIComponent(open.page)}`);
    open.saving = false;
    if (current !== open) return;
    const reopened = reopen(open.state, listing);
    build(listing);
    update(reopened.state);
    notify(`Committed to staging (${reply.files.join(", ")}); it redeploys in a minute or two.`);
  } catch (err) {
    open.saving = false;
    paint();
    notify(`Not saved: ${message(err)}`, true);
  }
}

/** Fit every box to its text again, as wrapping changes with the pane's width. */
function refit(): void {
  for (const view of views.values()) fit(view.input);
}
window.addEventListener("resize", refit);

function mount(column: StepList): void {
  column.addPane("Copy", pane, () => {
    store(OPEN_KEY, "1", () => sessionStorage);
    refit();
    void load();
  });
  // The lab swaps lessons in place; the pane follows.
  column.onShow(() => {
    if (column.paneShown(pane)) void load();
  });
  // Choosing another tab, once its own click has shown it, closes the editor
  // for the reload after a save too.
  pane.parentElement?.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".column-tab") && !column.paneShown(pane)) store(OPEN_KEY, null, () => sessionStorage);
  });
  if (stored(OPEN_KEY, () => sessionStorage) === "1") {
    column.showPane(pane);
    void load();
  }
}

whenStepColumn(mount);
