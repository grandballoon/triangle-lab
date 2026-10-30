// Dev-only step editor: on a lesson page, the "Edit steps" button turns on
// edit mode, where clicking a step's title or text opens it as its source
// writes it, `$…$` and all. Saving posts the edit to the dev server
// (tools/step-editor-plugin.ts), which writes it into the lesson's source
// file; Vite then reloads the page, back at the same step. On staging the
// staging Worker (worker/staging.ts) commits it to the staging branch
// instead, which redeploys staging; meanwhile the step shows the new text.
//
// The plugin injects this module into every page under `vite dev` and in the
// staging build only; no page imports it, so it never reaches a production
// build. In edit mode, clicks on step
// text are swallowed before the step column sees them, and keys typed into
// the editor never reach the lesson's shortcuts.

import { draft } from "./draft.ts";
import { pairStep, STEPS_ENDPOINT, type Field, type Listing, type SaveReply, type StepEdit } from "./wire.ts";

const ACCENT = "#38d9a9";
const EDITABLE = "#step-list .step-title, #step-list .step-text";
const STORAGE = "step-editor:on";
/** Vite reloads the page once the source is written; this is the fallback. */
const RELOAD_FALLBACK_MS = 1500;

const css = `
[data-step-editor] { font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif; color: #e9f0f7; }
.se-toggle {
  position: fixed; z-index: 2147483645; left: 12px; bottom: 12px; padding: 6px 12px;
  font: 600 12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif; color: #e9f0f7; cursor: pointer;
  background: rgba(15, 22, 29, 0.9); border: 1px solid #24323d; border-radius: 999px;
}
.se-toggle[aria-pressed="true"] { background: ${ACCENT}; border-color: ${ACCENT}; color: #0b0f14; }
html[data-step-edit] :is(${EDITABLE}) {
  cursor: text; border-radius: 3px; outline: 1px dashed rgba(56, 217, 169, 0.45); outline-offset: 2px;
}
html[data-step-edit] :is(${EDITABLE}):hover { outline: 1px solid ${ACCENT}; background: rgba(56, 217, 169, 0.08); }
.se-editor { margin: 4px 0 6px; cursor: auto; }
.se-editor textarea {
  display: block; width: 100%; resize: none; overflow: hidden; padding: 6px 8px;
  background: #0b0f14; color: #e9f0f7; font: 14px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  border: 1px solid ${ACCENT}; border-radius: 6px; outline: none;
}
.se-editor.title textarea { font: 700 16px/1.35 ui-sans-serif, system-ui, -apple-system, sans-serif; }
.se-preview { margin-top: 6px; font-size: 15px; line-height: 1.45; color: rgba(233, 240, 247, 0.85); }
.se-preview:empty { display: none; }
.se-problem { margin-top: 6px; color: #ff8787; font-size: 12px; }
.se-problem:empty { display: none; }
.se-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.se-hint { flex: 1; color: #7d8d9c; font-size: 11px; }
.se-row button {
  padding: 4px 10px; font: inherit; font-size: 12px; border-radius: 6px; cursor: pointer;
  border: 1px solid #24323d; background: transparent; color: #e9f0f7;
}
.se-row button.se-save { background: ${ACCENT}; border-color: ${ACCENT}; color: #0b0f14; font-weight: 600; }
.se-row button:disabled { opacity: 0.45; cursor: default; }
.se-toast {
  position: fixed; z-index: 2147483647; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: 80vw;
  padding: 8px 14px; border-radius: 8px; background: #0f161d; border: 1px solid #24323d;
  opacity: 0; transition: opacity 160ms; pointer-events: none;
}
.se-toast.show { opacity: 1; }
.se-toast.error { border-color: #ff6b6b; }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: Node): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent?.appendChild(node);
  return node;
}

const root = el("div", "");
root.dataset.stepEditor = "";
el("style", "", root).textContent = css;
const toggle = el("button", "se-toggle", root);
toggle.type = "button";
toggle.textContent = "✎ Edit steps";
toggle.title = "Edit the steps' text in their source files (dev only)";
const toast = el("div", "se-toast", root);

let toastTimer = 0;
function notify(text: string, error = false): void {
  toast.textContent = text;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), error ? 5000 : 2200);
}

function remembered(): boolean {
  try {
    return sessionStorage.getItem(STORAGE) === "1";
  } catch {
    return false;
  }
}

function setEditing(on: boolean): void {
  document.documentElement.toggleAttribute("data-step-edit", on);
  toggle.setAttribute("aria-pressed", String(on));
  try {
    if (on) sessionStorage.setItem(STORAGE, "1");
    else sessionStorage.removeItem(STORAGE);
  } catch {
    // Not remembered across the reload after a save; edit mode just turns off.
  }
  if (!on) close();
}

const editing = () => document.documentElement.hasAttribute("data-step-edit");
const page = () => location.pathname + location.search;

/** The open editor: what it edits, and how to put the step back as it was. */
interface Open {
  box: HTMLElement;
  input: HTMLTextAreaElement;
  shown: HTMLElement;
  saving: boolean;
}
let open: Open | null = null;

function close(): void {
  if (!open) return;
  open.box.remove();
  open.shown.style.display = "";
  open = null;
}

async function listing(): Promise<Listing> {
  const res = await fetch(`${STEPS_ENDPOINT}?page=${encodeURIComponent(page())}`);
  const body = (await res.json()) as Listing | { error: string };
  if ("error" in body) throw new Error(body.error);
  return body;
}

/** Open the editor on a step's title or text (`shown`). */
async function edit(shown: HTMLElement): Promise<void> {
  if (open?.box.isConnected) {
    if (open.shown === shown) return;
    if (open.saving) return;
    close();
  }
  open = null;
  const section = shown.closest<HTMLElement>(".step");
  const titleOf = section?.querySelector(".step-title")?.textContent ?? "";
  const index = Number(section?.dataset.step);
  if (!section || !Number.isInteger(index)) return;
  const field: Field = shown.matches(".step-title") ? "title" : "text";

  let source: Listing;
  try {
    source = await listing();
  } catch (err) {
    notify(`Cannot edit here: ${err instanceof Error ? err.message : err}`, true);
    return;
  }
  const at = pairStep(source.steps, index, titleOf);
  const was = at === null ? null : source.steps[at];
  const raw = was?.[field];
  if (at === null || !was || raw == null) {
    notify(`This step's ${field} is built in code; edit it in ${source.file}.`, true);
    return;
  }

  const box = el("div", `se-editor ${field}`);
  const input = el("textarea", "", box);
  input.value = raw;
  input.rows = 1;
  input.spellcheck = true;
  input.setAttribute("aria-label", `Step ${index + 1} ${field}`);
  const preview = el("div", "se-preview", box);
  const problem = el("div", "se-problem", box);
  const row = el("div", "se-row", box);
  el("span", "se-hint", row).textContent = `${source.file} · ↵ save · esc cancel`;
  const cancel = el("button", "", row);
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const save = el("button", "se-save", row);
  save.type = "button";
  save.textContent = "Save";

  const refresh = (): void => {
    const d = draft(field, input.value);
    preview.innerHTML = d.preview ?? "";
    problem.textContent = d.problem ?? "";
    save.disabled = d.problem !== null || open?.saving === true;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight + 2}px`;
  };

  const submit = async (): Promise<void> => {
    const current = open;
    const d = draft(field, input.value);
    if (!current || current.saving || d.problem) return;
    if (d.value === raw) return close();
    current.saving = true;
    input.readOnly = true;
    save.textContent = "Saving…";
    refresh();
    const body: StepEdit = { page: page(), step: at, was, field, to: d.value };
    try {
      const res = await fetch(STEPS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const reply = (await res.json()) as SaveReply | { error: string };
      if ("error" in reply) throw new Error(reply.error);
      if (!reply.changed) return close();
      if (reply.commit !== null) {
        // Staging: the page keeps running the old build until it redeploys,
        // so the step shows its new text now.
        if (field === "title") shown.textContent = d.value;
        else shown.innerHTML = d.preview ?? "";
        close();
        notify(`Committed to staging (${reply.file}); it redeploys in a minute or two.`);
        return;
      }
      // The reload Vite is about to do comes back to this step.
      history.replaceState(history.state, "", `${page()}#step-${index + 1}`);
      notify(`Saved to ${reply.file}`);
      window.setTimeout(() => location.reload(), RELOAD_FALLBACK_MS);
    } catch (err) {
      current.saving = false;
      input.readOnly = false;
      save.textContent = "Save";
      refresh();
      notify(`Not saved: ${err instanceof Error ? err.message : err}`, true);
    }
  };

  // Keys and clicks in the editor are the author's, not the lesson's.
  for (const type of ["keydown", "keyup", "keypress", "pointerdown", "click"] as const) {
    box.addEventListener(type, (e) => e.stopPropagation());
  }
  input.addEventListener("input", refresh);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      void submit();
    }
  });
  cancel.addEventListener("click", close);
  save.addEventListener("click", () => void submit());

  // A title sits in the step's heading button, so its editor goes after the heading.
  (field === "title" ? (shown.closest(".step-head") ?? shown) : shown).after(box);
  shown.style.display = "none";
  open = { box, input, shown, saving: false };
  refresh();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

/** The step title or text an event landed on, in edit mode. */
function target(e: Event): HTMLElement | null {
  if (!editing() || !(e.target instanceof Element) || root.contains(e.target)) return null;
  if (open?.box.contains(e.target)) return null;
  return e.target.closest<HTMLElement>(EDITABLE);
}

// In edit mode a click on step text belongs to the editor: take every event
// of it before the step column's own listeners, and open on the click.
for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick"] as const) {
  window.addEventListener(
    type,
    (e) => {
      if (!target(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
}
window.addEventListener(
  "click",
  (e) => {
    const shown = target(e);
    if (!shown) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    void edit(shown);
  },
  true,
);

toggle.addEventListener("click", () => setEditing(!editing()));

// Only pages with a step column get the button; it is built as the page loads.
function mount(): void {
  if (!document.getElementById("step-list")) return;
  document.body.appendChild(root);
  setEditing(remembered());
}
if (document.readyState === "complete") mount();
else window.addEventListener("load", mount, { once: true });
