// The step column: every step of a lesson as one section of a single
// scrolling list, followed by the lesson's real-world uses. The step at the
// top of the list is the current one, so scrolling through the text is how
// the reader moves through the proof; pressing a step, the arrow keys and
// the hand gestures move it too, and the list scrolls to follow.
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

export const USES_HEADING = "What will we use this for?";

const PANEL_WIDTH = { min: 250, max: 340, share: 0.25 } as const;

/** How wide the step column is in a window this many CSS pixels wide. */
export function panelWidth(windowWidth: number): number {
  const { min, max, share } = PANEL_WIDTH;
  return Math.round(Math.min(max, Math.max(min, windowWidth * share)));
}

export class StepList {
  private sections: HTMLElement[] = [];
  private readonly spacer: HTMLElement;
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
    this.spacer = host.ownerDocument.createElement("div");
    this.spacer.className = "step-spacer";
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

    const nodes: HTMLElement[] = [...this.sections];
    if (uses.length > 0) nodes.push(usesSection(doc, uses));
    this.host.replaceChildren(...nodes, this.spacer);
    this.current = 0;
    this.heading = null;
    this.host.scrollTop = 0;
    this.mark(0, false);
  }

  /** Show `step` as current, scrolling it into place when `scroll` is set. */
  mark(step: number, scroll: boolean): void {
    this.current = step;
    this.sections.forEach((s, i) => {
      if (i === step) s.setAttribute("aria-current", "step");
      else s.removeAttribute("aria-current");
    });
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
    if (!last) return;
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
