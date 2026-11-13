// The draft tab: a Draft tab in the step column of every lesson page, under
// `vite dev` and on staging, where the author writes the lesson's text anew
// by hand, as the text that will one day replace its steps. What they have
// written in the lesson's Explain tab sits above it, to write from.
//
// Saving posts the draft to DRAFTS_ENDPOINT with every explanation the
// author's deck holds, so the Explain tab's text is kept in the repository
// beside the drafts. The dev server (tools/drafts-plugin.ts) writes the
// files; the staging Worker (worker/staging.ts) commits them to the staging
// branch in one commit. The text is kept in localStorage until saved, so a
// reload loses none.
//
// Every decision is edit.ts's, over plain values; this holds the state,
// renders it and does the I/O. The plugin injects this module into pages
// under `vite dev` and in the staging build only; no page imports it, so it
// never reaches a production build.

import "./drafts.css";
import { whenStepColumn, type StepList } from "../../lab/steps.ts";
import { richHtml } from "../../lab/math.ts";
import { explanationOf, type Deck } from "../../recall/deck.ts";
import { openRecall } from "../../recall/remote.ts";
import { lessonOf } from "../lesson.ts";
import { button, call, el, keepKeys, message, notify, page, post, store, stored } from "../ui.ts";
import { afterSave, blocksOf, canSave, editDraft, explanationsIn, keptOf, openDraft, saveOf, unsaved, type DraftState } from "./edit.ts";
import { DRAFTS_ENDPOINT, type DraftListing, type DraftReply } from "./wire.ts";

/** Where the unsaved text of lesson `slug` is kept in this browser. */
const KEPT_KEY = (slug: string) => `lesson-draft:${slug}`;
/** Set while the Draft tab is open, so a reload comes back to it. */
const OPEN_KEY = "lesson-draft:open";

/** Mathematics between dollar signs typeset, leniently, as it is being written. */
const prose = (text: string): string => richHtml(text, false);

// --- The pane ---------------------------------------------------------------

const pane = el("div", "draft");
const head = el("div", "draft-head");
const where = el("div", "draft-where");
head.append(el("div", "draft-name", "Draft"), where);

const reference = el("details", "draft-reference");
const referenceTitle = el("summary", "draft-reference-title", "Your explanation");
const referenceText = el("div", "draft-reference-text");
reference.append(referenceTitle, referenceText);
reference.open = true;

const body = el("div", "draft-body");
const input = el("textarea", "draft-input");
input.spellcheck = true;
input.placeholder = "Write the lesson as you would tell it. # starts a heading; a blank line, a new paragraph; $…$, mathematics.";
input.setAttribute("aria-label", "The lesson's draft");
const preview = el("div", "draft-preview");
body.append(input, preview);

const footer = el("div", "draft-footer");
const state = el("span", "draft-state");
const keeps = el("span", "draft-keeps");
const discard = button("draft-button", "Discard", () => {
  if (current && confirm("Discard what you have written since the draft was last saved?")) update(editDraft(current.state, current.state.listing.text ?? ""));
});
const saveButton = button("draft-button draft-primary", "Save", () => void save());
const words = el("span", "draft-words");
words.append(state, keeps);
footer.append(words, discard, saveButton);
pane.append(head, reference, body, footer);
keepKeys(pane);

/** The draft open in the pane, for the lesson it is of. */
let current: { slug: string; state: DraftState; saving: boolean } | null = null;
/** The lesson whose draft is being fetched, so a fetch for one since left is dropped. */
let loading: string | null = null;

const deck = (): Deck => openRecall().store.get();

input.addEventListener("input", () => {
  if (current) update(editDraft(current.state, input.value));
});
input.addEventListener("keydown", (e) => {
  if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    void save();
  }
});

/** The textarea grows with its text, so the pane scrolls as one page. */
function fit(): void {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight + 2}px`;
}
window.addEventListener("resize", fit);

let previewFrame = 0;
function paintPreview(text: string): void {
  cancelAnimationFrame(previewFrame);
  previewFrame = requestAnimationFrame(() => {
    preview.replaceChildren(
      ...blocksOf(text).map((block) => {
        const node = block.kind === "heading" ? el(`h${block.level + 1}` as "h2" | "h3" | "h4", "draft-heading") : el("p", "draft-paragraph");
        node.innerHTML = prose(block.text);
        return node;
      }),
    );
  });
}

function paintReference(): void {
  const slug = current?.slug ?? lessonOf(page())?.slug;
  const kept = slug ? explanationOf(deck(), slug) : undefined;
  if (kept && kept.text.trim() !== "") {
    referenceText.classList.remove("draft-quiet");
    referenceText.innerHTML = kept.text
      .split(/\n\s*\n/)
      .map((p) => `<p>${prose(p.trim())}</p>`)
      .join("");
  } else {
    referenceText.classList.add("draft-quiet");
    referenceText.textContent = "Nothing written in this lesson's Explain tab yet. What you write there shows here, to draft from.";
  }
  const n = explanationsIn(deck()).length;
  keeps.textContent = n ? ` · Saving a change also keeps your Explain tab text (${n} lesson${n === 1 ? "" : "s"}).` : "";
}

function paint(): void {
  if (!current) return;
  const { state: s, saving } = current;
  if (input.value !== s.text) input.value = s.text;
  fit();
  paintPreview(s.text);
  const changed = unsaved(s);
  state.textContent = changed ? "Unsaved" : s.listing.text === null ? "No draft yet" : "Saved";
  state.classList.toggle("draft-unsaved", changed);
  discard.disabled = saving || !changed;
  saveButton.disabled = saving || !canSave(s);
  saveButton.textContent = saving ? "Saving…" : "Save";
}

/** Take `next` as the pane's, keep its unsaved text, and show it. */
function update(next: DraftState): void {
  if (!current) return;
  if (next !== current.state) {
    current.state = next;
    const kept = keptOf(next);
    store(KEPT_KEY(current.slug), kept ? JSON.stringify(kept) : null, () => localStorage);
  }
  paint();
}

function status(text: string): void {
  current = null;
  where.textContent = "";
  input.value = "";
  input.disabled = true;
  preview.replaceChildren(el("div", "draft-quiet", text));
  state.textContent = "";
  discard.disabled = saveButton.disabled = true;
}

/** Open the pane on this lesson's draft as kept. */
async function load(): Promise<void> {
  const at = page();
  const slug = lessonOf(at)?.slug;
  if (!slug) return status("This page shows no lesson.");
  if (loading === slug || current?.slug === slug) return paintReference();
  loading = slug;
  status("Reading the draft…");
  paintReference();
  try {
    const listing = await call<DraftListing>(`${DRAFTS_ENDPOINT}?page=${encodeURIComponent(at)}`);
    if (lessonOf(page())?.slug !== slug) return;
    const kept = stored(KEPT_KEY(slug), () => localStorage);
    let parsed: unknown = null;
    try {
      parsed = kept ? JSON.parse(kept) : null;
    } catch {
      // Kept text that cannot be read is left out.
    }
    const opened = openDraft(listing, parsed);
    current = { slug, state: opened.state, saving: false };
    where.textContent = listing.file;
    input.disabled = false;
    paint();
    paintReference();
    if (opened.replaces) notify("This text was kept in this browser over an older draft; saving it replaces the draft saved since.", true);
  } catch (err) {
    if (lessonOf(page())?.slug === slug) status(`This lesson's draft cannot be opened here: ${message(err)}`);
  } finally {
    if (loading === slug) loading = null;
  }
}

async function save(): Promise<void> {
  if (!current || current.saving) return;
  const open = current;
  if (!canSave(open.state)) return;
  const sent = saveOf(open.state, page(), deck());
  open.saving = true;
  paint();
  try {
    const reply = await post<DraftReply>(DRAFTS_ENDPOINT, sent);
    open.saving = false;
    if (current === open) update(afterSave(open.state, sent));
    const where = reply.commit === null ? "Saved" : "Committed to staging";
    notify(reply.files.length ? `${where}: ${reply.files.join(", ")}` : "Nothing new to save.");
  } catch (err) {
    open.saving = false;
    paint();
    notify(`Not saved: ${message(err)}`, true);
  }
}

function mount(column: StepList): void {
  column.addPane("Draft", pane, () => {
    store(OPEN_KEY, "1", () => sessionStorage);
    void load();
  });
  // The lab swaps lessons in place; the pane follows.
  column.onShow(() => {
    if (column.paneShown(pane)) void load();
  });
  // Choosing another tab, once its own click has shown it, closes the draft for the next reload too.
  pane.parentElement?.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".column-tab") && !column.paneShown(pane)) store(OPEN_KEY, null, () => sessionStorage);
  });
  // What is written in the Explain tab, here or synced from elsewhere, shows as it changes.
  openRecall().store.subscribe(() => {
    paintReference();
    paint();
  });
  if (stored(OPEN_KEY, () => sessionStorage) === "1") {
    column.showPane(pane);
    void load();
  }
}

whenStepColumn(mount);
