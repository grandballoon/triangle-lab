// Markup helpers shared by the recall page (page.ts) and the review beside a
// lesson (beside.ts).

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

export function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", cls ? `rc-button ${cls}` : "rc-button", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/** A button that asks once more before it acts. */
export function confirmButton(text: string, act: () => void): HTMLButtonElement {
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

export function row(...children: HTMLElement[]): HTMLElement {
  const r = el("div", "rc-row");
  r.append(...children);
  return r;
}

/** Whether a key went to a text box, where it is typing rather than a shortcut. */
export function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * Redraw `root`, keeping the learner's place in its text boxes: a reply from
 * Claude can redraw it mid-sentence. `opened` (a box just opened) takes the
 * focus first; else the box written in before, with its selection, else
 * `fallback`, if any.
 */
export function redraw(
  root: HTMLElement,
  draw: () => void,
  opened: () => HTMLTextAreaElement | null,
  fallback: () => HTMLTextAreaElement | null,
): void {
  const before = document.activeElement;
  const was = before instanceof HTMLTextAreaElement && root.contains(before) ? before : null;
  draw();
  const first = opened();
  const same = first ? null : was && root.querySelector<HTMLTextAreaElement>(`textarea.${was.classList[0]}`);
  const field = first ?? same ?? fallback();
  if (field && document.activeElement !== field) {
    field.focus();
    const end = field.value.length;
    const [from, to] = same && was ? [was.selectionStart, was.selectionEnd] : [end, end];
    field.setSelectionRange(Math.min(from, end), Math.min(to, end));
  }
}
