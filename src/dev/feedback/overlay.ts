// Dev-only UI feedback: hold Alt to outline the element under the cursor,
// Alt-click it to write a comment, and the comment is posted to the dev
// server (tools/feedback-plugin.ts), which appends it to ui-feedback.md.
//
// The plugin injects this module into every page under `vite dev` only; no
// page imports it, so it never reaches a build. Alt-clicks are swallowed
// before a lesson sees them, and keys typed into the comment box never reach
// the lesson's shortcuts.

import { capture } from "./capture.ts";
import { FEEDBACK_ENDPOINT } from "./entry.ts";

const ACCENT = "#38d9a9";

const css = `
[data-ui-feedback] { font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif; color: #e9f0f7; }
.uif-outline {
  position: fixed; z-index: 2147483646; pointer-events: none; display: none;
  border: 2px solid ${ACCENT}; background: rgba(56, 217, 169, 0.08); border-radius: 3px;
}
.uif-tag {
  position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; padding: 2px 6px; white-space: nowrap;
  background: ${ACCENT}; color: #0b0f14; border-radius: 3px; font: 600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.uif-outline.below .uif-tag { bottom: auto; top: 100%; margin: 4px 0 0; }
.uif-box {
  position: fixed; z-index: 2147483647; width: 320px; padding: 12px; display: none;
  background: #0f161d; border: 1px solid #24323d; border-radius: 10px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
.uif-box textarea {
  display: block; width: 100%; min-height: 84px; resize: vertical; padding: 8px 10px;
  background: #0b0f14; color: inherit; font: inherit; border: 1px solid #24323d; border-radius: 6px; outline: none;
}
.uif-box textarea:focus { border-color: ${ACCENT}; }
.uif-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.uif-hint { flex: 1; color: #7d8d9c; font-size: 11px; }
.uif-box button {
  padding: 5px 12px; font: inherit; border-radius: 6px; cursor: pointer;
  border: 1px solid #24323d; background: transparent; color: inherit;
}
.uif-box button.uif-save { background: ${ACCENT}; border-color: ${ACCENT}; color: #0b0f14; font-weight: 600; }
.uif-toast {
  position: fixed; z-index: 2147483647; left: 50%; bottom: 24px; transform: translateX(-50%);
  padding: 8px 14px; border-radius: 8px; background: #0f161d; border: 1px solid #24323d;
  opacity: 0; transition: opacity 160ms; pointer-events: none;
}
.uif-toast.show { opacity: 1; }
.uif-toast.error { border-color: #ff6b6b; }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent: Node): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}

const root = document.createElement("div");
root.dataset.uiFeedback = "";
const style = el("style", "", root);
style.textContent = css;
const outline = el("div", "uif-outline", root);
const tag = el("span", "uif-tag", outline);
const box = el("div", "uif-box", root);
const input = el("textarea", "", box);
input.placeholder = "What should change here?";
const row = el("div", "uif-row", box);
el("span", "uif-hint", row).textContent = "↵ save · ⇧↵ new line · esc cancel";
const cancel = el("button", "", row);
cancel.type = "button";
cancel.textContent = "Cancel";
const save = el("button", "uif-save", row);
save.type = "button";
save.textContent = "Save";
const toast = el("div", "uif-toast", root);
document.body.appendChild(root);

/** The element being commented on and where it was clicked, while the box is open. */
let pending: { target: Element; x: number; y: number } | null = null;

const ours = (t: EventTarget | null) => t instanceof Node && root.contains(t);

function show(target: Element): void {
  const r = target.getBoundingClientRect();
  Object.assign(outline.style, {
    display: "block",
    left: `${r.left - 2}px`,
    top: `${r.top - 2}px`,
    width: `${r.width + 4}px`,
    height: `${r.height + 4}px`,
  });
  outline.classList.toggle("below", r.top < 28);
  tag.textContent = target.tagName.toLowerCase() + (target.id ? `#${target.id}` : "");
}

function hide(): void {
  outline.style.display = "none";
}

function open(target: Element, x: number, y: number): void {
  pending = { target, x, y };
  show(target);
  box.style.display = "block";
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  box.style.left = `${Math.max(8, Math.min(x + 12, innerWidth - w - 8))}px`;
  box.style.top = `${Math.max(8, Math.min(y + 12, innerHeight - h - 8))}px`;
  input.value = "";
  input.focus();
}

function close(): void {
  pending = null;
  box.style.display = "none";
  hide();
}

let toastTimer = 0;
function notify(text: string, error = false): void {
  toast.textContent = text;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), error ? 4000 : 1800);
}

async function submit(): Promise<void> {
  if (!pending) return;
  const comment = input.value.trim();
  if (!comment) return;
  const entry = capture(pending.target, pending.x, pending.y, comment);
  close();
  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    notify("Saved to ui-feedback.md");
  } catch (err) {
    notify(`Comment not saved: ${err instanceof Error ? err.message : err}`, true);
  }
}

// Alt-clicks belong to the overlay: take every event of the click before the
// page's own listeners, and open the box on the first of them.
const swallow = (e: MouseEvent) => {
  if (!e.altKey || ours(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
};
for (const type of ["pointerup", "mousedown", "mouseup", "click", "dblclick", "auxclick"] as const) {
  window.addEventListener(type, swallow, true);
}
window.addEventListener(
  "pointerdown",
  (e) => {
    if (!e.altKey || ours(e.target) || !(e.target instanceof Element)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(e.target, e.clientX, e.clientY);
  },
  true,
);

window.addEventListener(
  "pointermove",
  (e) => {
    if (pending) return;
    if (e.altKey && e.target instanceof Element && !ours(e.target)) show(e.target);
    else hide();
  },
  true,
);
window.addEventListener("keyup", (e) => {
  if (e.key === "Alt" && !pending) hide();
});
window.addEventListener("blur", () => {
  if (!pending) hide();
});

// Keys typed into the box are the reviewer's, not the lesson's.
for (const type of ["keydown", "keyup", "keypress"] as const) {
  box.addEventListener(type, (e) => e.stopPropagation());
}
box.addEventListener("pointerdown", (e) => e.stopPropagation());
input.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
  else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    void submit();
  }
});
cancel.addEventListener("click", close);
save.addEventListener("click", () => void submit());
