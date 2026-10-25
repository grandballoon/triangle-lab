// The step column: every step of a lesson as one section of a single
// scrolling list, followed by the lesson's real-world uses. The step at the
// top of the list is the current one, so scrolling through the text is how
// the reader moves through the proof; pressing a step, the arrow keys and
// the hand gestures move it too, and the list scrolls to follow.
//
// On a phone the list is paged instead (`setPaged`): one step shows at a
// time, under a row with buttons to the previous and next, and the list's
// height is the tallest step's, so the figure above keeps its size as the
// reader pages through (`pagedHeight`, layout.ts).
//
// The shell owns which step is current (shell.ts); this list only reports
// what the reader picked and shows what the shell decided.

import "./steps.css";
import { linkTex } from "./link.ts";
import { richHtml } from "./math.ts";
import type { Step, Use } from "./scene.ts";

/** A step becomes current once its top is scrolled this close to the list's top. */
const ACTIVE_LINE_PX = 48;
/** Room left above the current step when the list scrolls to it. */
const SCROLL_MARGIN_PX = 14;
/** Give up waiting for a programmatic scroll to settle after this long. */
const SCROLL_SETTLE_MS = 900;
/** Room under the tallest step when paged, plus the column's border. */
const PAGED_BOTTOM_PX = 10;

export const USES_HEADING = "What will we use this for?";

export class StepList {
  private sections: HTMLElement[] = [];
  /** Holds the sections; paged, it stacks them in one cell (steps.css). */
  private readonly track: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly pager: HTMLElement;
  private readonly pagerLabel: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
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
  }

  /** Build the list for a lesson, scrolled to its first step. */
  show(steps: readonly Step[], uses: readonly Use[]): void {
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
    if (uses.length > 0) nodes.push(usesSection(doc, uses));
    this.host.replaceChildren(...nodes, this.spacer);
    this.host.toggleAttribute("data-single", single);
    this.pager.hidden = single;
    this.current = 0;
    this.heading = null;
    this.host.scrollTop = 0;
    this.mark(0, false);
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
   * The column's height that shows the tallest step whole, with the pager
   * row, when paged. 0 until laid out.
   */
  pagedHeight(): number {
    const track = this.track.offsetTop + this.track.offsetHeight;
    return track > 0 ? this.pager.offsetHeight + track + PAGED_BOTTOM_PX : 0;
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
    // Paged, the uses follow the last step.
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

/** The lesson's real-world uses, collapsed at first and opened by their heading. */
function usesSection(doc: Document, uses: readonly Use[]): HTMLElement {
  const section = doc.createElement("details");
  section.className = "uses";
  const summary = doc.createElement("summary");
  const heading = doc.createElement("h2");
  heading.textContent = USES_HEADING;
  summary.append(heading);
  section.append(summary);
  for (const use of uses) {
    const item = doc.createElement("article");
    item.className = "use";
    const title = doc.createElement("h3");
    title.textContent = use.title;
    const text = doc.createElement("p");
    text.innerHTML = richHtml(use.text);
    item.append(title, text);
    section.append(item);
  }
  return section;
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
