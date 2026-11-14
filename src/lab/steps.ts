// The step column: every step of a lesson as one section of a single
// scrolling list, followed by its asides: what its idea is like, and what it
// is used for. The step at the
// top of the list is the current one, so scrolling through the text is how
// the reader moves through the proof; pressing a step, the arrow keys and
// the hand gestures move it too, and the list scrolls to follow.
//
// On a phone the list is paged instead (`setPaged`): one step shows at a
// time, under a row with buttons to the previous and next, and the list's
// height is the tallest step's, so the figure above keeps its size as the
// reader pages through (`pagedHeight`, layout.ts).
//
// A page may give the column panes of their own beside the steps
// (`addPane`), such as the explanation Claude checks (recall/explain-panel.ts):
// a row of tabs then heads the column, and a pane, when chosen, takes the
// steps' place. The steps stay current as they were behind it. A tool
// injected into the page rather than imported by it, as the copy editor is
// (dev/copy/pane.ts), finds the column with `whenStepColumn`.
//
// The shell owns which step is current (shell.ts); this list only reports
// what the reader picked and shows what the shell decided.

import "./steps.css";
import { linkTex } from "./link.ts";
import { richHtml } from "./math.ts";
import type { Asides, Likeness, Step, Use } from "./scene.ts";

/** A step becomes current once its top is scrolled this close to the list's top. */
const ACTIVE_LINE_PX = 48;
/** Room left above the current step when the list scrolls to it. */
const SCROLL_MARGIN_PX = 14;
/** Give up waiting for a programmatic scroll to settle after this long. */
const SCROLL_SETTLE_MS = 900;
/** Room under the tallest step when paged, plus the column's border. */
const PAGED_BOTTOM_PX = 10;

export const LIKES_HEADING = "What is this like?";
export const USES_HEADING = "What will we use this for?";

/** Who has asked for the page's step column before it was built. */
const waiting = new Set<(column: StepList) => void>();
let built: StepList | null = null;

/** Call `listener` with the page's step column, now if it is built and otherwise once it is. */
export function whenStepColumn(listener: (column: StepList) => void): void {
  if (built) listener(built);
  else waiting.add(listener);
}

/** A pane beside the steps, and its tab. */
interface Pane {
  tab: HTMLButtonElement;
  pane: HTMLElement;
}

export class StepList {
  private sections: HTMLElement[] = [];
  /** Holds the sections; paged, it stacks them in one cell (steps.css). */
  private readonly track: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly pager: HTMLElement;
  private readonly pagerLabel: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  /** The row of tabs and the panes beside the steps, once a pane is added. */
  private tabs: { row: HTMLElement; steps: HTMLButtonElement; panes: Pane[] } | null = null;
  /** The pane shown in the steps' place, or null while the steps show. */
  private shown: HTMLElement | null = null;
  /** Who hears each time the list is built for a lesson. */
  private readonly shownListeners: (() => void)[] = [];
  private paged = false;
  private current = 0;
  /** While the list scrolls itself to a step, the step it is heading for. */
  private heading: number | null = null;
  private settleTimer = 0;

  /**
   * @param host The scrolling element the sections are built in.
   * @param onPick Called with the step the reader pressed (`scroll` true:
   *   the list should bring it into view) or scrolled to (`scroll` false).
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly onPick: (step: number, scroll: boolean) => void,
  ) {
    const doc = host.ownerDocument;
    this.track = doc.createElement("div");
    this.track.className = "step-track";
    this.spacer = doc.createElement("div");
    this.spacer.className = "step-spacer";

    // The paged row sits above the scrolling list, so it never scrolls away.
    this.pager = doc.createElement("div");
    this.pager.className = "step-pager";
    this.pagerLabel = doc.createElement("span");
    this.pagerLabel.className = "step-pager-label";
    const turn = (glyph: string, label: string, delta: -1 | 1): HTMLButtonElement => {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = glyph;
      b.setAttribute("aria-label", label);
      b.addEventListener("click", () => {
        const to = this.current + delta;
        if (to >= 0 && to < this.sections.length) this.onPick(to, true);
      });
      return b;
    };
    this.prev = turn("‹", "Previous step", -1);
    this.next = turn("›", "Next step", 1);
    this.pager.append(this.prev, this.pagerLabel, this.next);
    host.parentElement?.insertBefore(this.pager, host);

    host.addEventListener("scroll", () => this.onScroll(), { passive: true });
    host.addEventListener("scrollend", () => this.settle());

    built = this;
    for (const listener of waiting) listener(this);
    waiting.clear();
  }

  /** Call `listener` each time the list is built for a lesson, as when the lab swaps lessons in place. */
  onShow(listener: () => void): void {
    this.shownListeners.push(listener);
  }

  /** Build the list for a lesson, scrolled to its first step. */
  show(steps: readonly Step[], asides: Asides): void {
    const doc = this.host.ownerDocument;
    const single = steps.length === 1;
    this.sections = steps.map((step, i) => {
      const section = doc.createElement("article");
      section.className = "step";
      section.dataset.step = String(i);
      const head = doc.createElement("h2");
      head.className = "step-head";
      const button = doc.createElement("button");
      button.type = "button";
      const count = doc.createElement("span");
      count.className = "step-count";
      count.textContent = single ? "Explore" : `Step ${i + 1}`;
      const title = doc.createElement("span");
      title.className = "step-title";
      title.textContent = step.title;
      button.append(count, title);
      head.append(button);
      const text = doc.createElement("p");
      text.className = "step-text";
      text.innerHTML = richHtml(step.text, false, linkTex);
      section.append(head, text);
      section.addEventListener("click", () => this.onPick(i, true));
      return section;
    });

    this.track.replaceChildren(...this.sections);
    const nodes: HTMLElement[] = [this.track];
    if (asides.likes.length > 0) nodes.push(asideSection(doc, LIKES_HEADING, asides.likes));
    if (asides.uses.length > 0) nodes.push(asideSection(doc, USES_HEADING, asides.uses));
    this.host.replaceChildren(...nodes, this.spacer);
    this.host.toggleAttribute("data-single", single);
    this.pager.hidden = single;
    this.current = 0;
    this.heading = null;
    this.host.scrollTop = 0;
    this.mark(0, false);
    for (const listener of this.shownListeners) listener();
  }

  /**
   * Add a pane beside the steps, under a tab named `label`, after any added
   * before it; the first adds a tab back to the steps too. `onShow` hears
   * each time the pane is chosen.
   */
  addPane(label: string, pane: HTMLElement, onShow: () => void = () => {}): void {
    const column = this.host.parentElement;
    if (!column) return;
    const doc = this.host.ownerDocument;
    const tab = (text: string, shows: HTMLElement | null): HTMLButtonElement => {
      const b = doc.createElement("button");
      b.type = "button";
      b.className = "column-tab";
      b.textContent = text;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => {
        this.showPane(shows);
        if (shows) onShow();
      });
      return b;
    };
    if (!this.tabs) {
      const row = doc.createElement("div");
      row.className = "column-tabs";
      row.setAttribute("role", "tablist");
      const steps = tab("Steps", null);
      row.append(steps);
      column.insertBefore(row, column.firstChild);
      this.tabs = { row, steps, panes: [] };
    }
    const other = tab(label, pane);
    this.tabs.row.append(other);
    pane.classList.add("column-pane");
    column.append(pane);
    this.tabs.panes.push({ tab: other, pane });
    this.showPane(this.shown);
  }

  /** Show `pane`, one added beside the steps, in the steps' place; or, for null, the steps. */
  showPane(pane: HTMLElement | null): void {
    if (!this.tabs) return;
    this.shown = this.tabs.panes.some((p) => p.pane === pane) ? pane : null;
    this.tabs.steps.setAttribute("aria-selected", String(this.shown === null));
    for (const p of this.tabs.panes) {
      p.tab.setAttribute("aria-selected", String(p.pane === this.shown));
      p.pane.hidden = p.pane !== this.shown;
    }
    this.host.parentElement?.toggleAttribute("data-pane", this.shown !== null);
  }

  /** Whether `pane` is the one shown in the steps' place. */
  paneShown(pane: HTMLElement): boolean {
    return this.shown === pane;
  }

  /**
   * Show one step at a time (a phone) or the whole list. The stylesheet does
   * the showing, keyed off the page's layout; this switches the behaviour.
   */
  setPaged(paged: boolean): void {
    if (paged === this.paged) return;
    this.paged = paged;
    this.settle();
    this.mark(this.current, true);
  }

  /**
   * The column's height that shows the tallest step whole, with the tabs and
   * the pager row, when paged. 0 until laid out. With the pane shown, as
   * much as the layout gives: the pane is for writing in.
   */
  pagedHeight(): number {
    if (this.shown) return Infinity;
    const track = this.track.offsetTop + this.track.offsetHeight;
    const tabs = this.tabs?.row.offsetHeight ?? 0;
    return track > 0 ? tabs + this.pager.offsetHeight + track + PAGED_BOTTOM_PX : 0;
  }

  /** Show `step` as current, scrolling it into place when `scroll` is set. */
  mark(step: number, scroll: boolean): void {
    this.current = step;
    this.sections.forEach((s, i) => {
      if (i === step) s.setAttribute("aria-current", "step");
      else s.removeAttribute("aria-current");
    });
    const count = this.sections.length;
    this.pagerLabel.textContent = `Step ${step + 1} of ${count}`;
    this.prev.disabled = step <= 0;
    this.next.disabled = step >= count - 1;
    // Paged, the asides follow the last step.
    this.host.toggleAttribute("data-last", step === count - 1);
    if (this.paged) {
      // Each step starts at its top; the others are hidden, not scrolled past.
      this.host.scrollTop = 0;
      return;
    }
    if (!scroll) return;
    const target = this.sections[step];
    if (!target) return;
    const top = Math.max(0, target.offsetTop - SCROLL_MARGIN_PX);
    if (Math.abs(this.host.scrollTop - top) < 1) return;
    this.heading = step;
    clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(), SCROLL_SETTLE_MS);
    if (typeof this.host.scrollTo === "function") {
      this.host.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    } else {
      this.host.scrollTop = top;
    }
  }

  /**
   * Pad the end of the list so the last step can still scroll up to the top,
   * where it becomes current. Call whenever the layout may have changed.
   */
  fit(): void {
    const last = this.sections.at(-1);
    if (!last || this.paged) return;
    const room = this.host.clientHeight - ACTIVE_LINE_PX;
    const after = this.host.scrollHeight - this.spacer.offsetHeight - last.offsetTop;
    const height = Math.max(0, Math.round(room - after));
    if (this.spacer.offsetHeight !== height) this.spacer.style.height = `${height}px`;
  }

  /** The step whose section is at the top of the visible list. */
  private stepAtTop(): number {
    const line = this.host.scrollTop + ACTIVE_LINE_PX;
    let step = 0;
    this.sections.forEach((s, i) => {
      if (s.offsetTop <= line) step = i;
    });
    return step;
  }

  private onScroll(): void {
    // Paged, scrolling only reads a long step.
    if (this.paged) return;
    const step = this.stepAtTop();
    // Steps passed on the way to a picked one are not picks themselves.
    if (this.heading !== null) {
      if (step === this.heading) this.settle();
      return;
    }
    if (step !== this.current) this.onPick(step, false);
  }

  private settle(): void {
    clearTimeout(this.settleTimer);
    this.heading = null;
  }
}

/** One of the lesson's asides, collapsed at first and opened by its heading. */
function asideSection(doc: Document, heading: string, items: readonly (Likeness | Use)[]): HTMLElement {
  const section = doc.createElement("details");
  section.className = "aside";
  const summary = doc.createElement("summary");
  const head = doc.createElement("h2");
  head.textContent = heading;
  summary.append(head);
  section.append(summary);
  for (const entry of items) {
    const item = doc.createElement("article");
    item.className = "aside-item";
    const title = doc.createElement("h3");
    title.textContent = entry.title;
    const text = doc.createElement("p");
    text.innerHTML = richHtml(entry.text);
    item.append(title, text);
    section.append(item);
  }
  return section;
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
