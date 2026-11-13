// What the dev-only tabs injected into lesson pages (dev/copy/pane.ts,
// dev/drafts/pane.ts) share: building elements, keeping text in the
// browser's storage, calling their endpoints, and the toast that says how a
// call went. Browser-only; nothing here decides anything.

import "./ui.css";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", className, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/** Path and query of the page, which names its lesson. */
export const page = (): string => location.pathname + location.search;

export function stored(key: string, storage: () => Storage): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

export function store(key: string, value: string | null, storage: () => Storage): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Not kept; what was to be kept then lasts only as long as the page.
  }
}

/** The JSON `url` answers with, or the error it gives as a thrown Error. */
export async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({ error: `${res.status} ${res.statusText}` }))) as T | { error: string };
  if (typeof body === "object" && body !== null && "error" in body) throw new Error(body.error);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return body as T;
}

export const post = <T>(url: string, body: unknown): Promise<T> =>
  call<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const toast = el("div", "dev-toast");
toast.setAttribute("role", "status");
let toastTimer = 0;

/** Say `text` for a moment at the foot of the window; longer, and in red, for an error. */
export function notify(text: string, error = false): void {
  if (!toast.isConnected) document.body.append(toast);
  toast.textContent = text;
  toast.classList.toggle("dev-error", error);
  toast.classList.add("dev-show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("dev-show"), error ? 6000 : 2600);
}

/** Keys typed in `pane` are the author's, not the lesson's shortcuts. */
export function keepKeys(pane: HTMLElement): void {
  for (const type of ["keydown", "keyup", "keypress"] as const) pane.addEventListener(type, (e) => e.stopPropagation());
}
