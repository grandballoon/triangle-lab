// The grip along the top edge of the step column on a phone (steps.css),
// which the reader drags, taps or keys to size the column. The imperative
// half of sheet.ts: it holds the height the reader chose, keeps it for their
// next visit, and asks the page to lay itself out again. The page reads
// `chosen` into layout.ts and hands each layout back with `show`.

import type { ChromeLayout } from "./layout.ts";
import { dragged, fromShare, keyed, parseShare, tapped, TAP_PX, toShare, type Range } from "./sheet.ts";

const STORAGE_KEY = "triangle-lab:steps-height";

export class SheetGrip {
  readonly el: HTMLElement;
  /** The height the reader chose, as a share of the window; null for the steps' own. */
  private share: number | null = readStored();
  private range: Range | null = null;
  /** The steps' height as last laid out. */
  private shown = 0;
  private press: { id: number; startY: number; start: number; moved: boolean } | null = null;

  /**
   * @param column The step column, which the grip heads.
   * @param relayout Called whenever the chosen height changes.
   */
  constructor(column: HTMLElement, private readonly relayout: () => void) {
    const el = column.ownerDocument.createElement("div");
    el.className = "sheet-grip";
    el.tabIndex = 0;
    el.setAttribute("role", "separator");
    el.setAttribute("aria-orientation", "horizontal");
    el.setAttribute("aria-label", "Resize the steps");
    el.title = "Drag to resize, tap to open or close";
    column.insertBefore(el, column.firstChild);
    this.el = el;

    el.addEventListener("pointerdown", (e) => {
      if (!this.range || this.press) return;
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.press = { id: e.pointerId, startY: e.clientY, start: this.shown, moved: false };
      el.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      const press = this.press;
      if (!press || e.pointerId !== press.id || !this.range) return;
      if (!press.moved && Math.abs(e.clientY - press.startY) < TAP_PX) return;
      press.moved = true;
      this.choose(dragged(press.start, press.startY, e.clientY, this.range));
    });
    const release = (e: PointerEvent, cancelled: boolean): void => {
      const press = this.press;
      if (!press || e.pointerId !== press.id) return;
      this.press = null;
      el.classList.remove("dragging");
      if (!press.moved && !cancelled && this.range) this.choose(tapped(this.chosen(window.innerHeight), this.range));
      writeStored(this.share);
    };
    el.addEventListener("pointerup", (e) => release(e, false));
    el.addEventListener("pointercancel", (e) => release(e, true));
    el.addEventListener("keydown", (e) => {
      if (!this.range) return;
      const height = keyed(this.shown, this.chosen(window.innerHeight), e.key, this.range);
      if (height === undefined) return;
      e.preventDefault();
      this.choose(height);
      writeStored(this.share);
    });
  }

  /** The height the reader chose for a window `windowHeight` tall, or null for the steps' own. */
  chosen(windowHeight: number): number | null {
    return fromShare(this.share, windowHeight);
  }

  /** Follow the layout the page applied: the grip shows only while the steps are stacked. */
  show(layout: ChromeLayout): void {
    this.range = layout.stepsRange;
    this.shown = layout.steps.height;
    this.el.hidden = this.range === null;
    if (!this.range) return;
    this.el.setAttribute("aria-valuemin", String(this.range.min));
    this.el.setAttribute("aria-valuemax", String(this.range.max));
    this.el.setAttribute("aria-valuenow", String(this.shown));
  }

  private choose(height: number | null): void {
    this.share = toShare(height, window.innerHeight);
    this.relayout();
  }
}

function readStored(): number | null {
  try {
    return parseShare(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStored(share: number | null): void {
  try {
    if (share === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(share));
  } catch {
    // Storage blocked: the height lasts for this page only.
  }
}
