// The AR page's step card: which stage of the figure is on the sheet, what it
// says, and the lesson's live formulas, with a button for each stage and for
// the one before and after. It folds to a caret, so it leaves the figure clear.
// It only shows; the page owns the current step.

import { richHtml, texHtml } from "../lab/math.ts";
import type { Readout, Step } from "../lab/scene.ts";

export interface CardElements {
  root: HTMLElement;
  toggle: HTMLButtonElement;
  body: HTMLElement;
  count: HTMLElement;
  title: HTMLElement;
  text: HTMLElement;
  stages: HTMLElement;
  readouts: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export class StepCard {
  private steps: readonly Step[] = [];
  private shownStep = -1;
  /** Typeset formulas by their source, since most do not change frame to frame. */
  private readonly typeset = new Map<string, string>();
  private shownRows = "";

  constructor(
    private readonly el: CardElements,
    private readonly go: (step: number) => void,
  ) {
    el.prev.addEventListener("click", () => this.go(this.shownStep - 1));
    el.next.addEventListener("click", () => this.go(this.shownStep + 1));
    el.toggle.addEventListener("click", () => this.setOpen(el.body.hidden));
    this.setOpen(true);
  }

  private setOpen(open: boolean): void {
    this.el.body.hidden = !open;
    this.el.root.classList.toggle("folded", !open);
    this.el.toggle.setAttribute("aria-expanded", String(open));
    this.el.toggle.setAttribute("aria-label", open ? "Hide the stage's text" : "Show the stage's text");
  }

  show(steps: readonly Step[]): void {
    this.steps = steps;
    this.shownStep = -1;
    this.el.stages.replaceChildren(
      ...steps.map((step, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip stage";
        b.textContent = String(i + 1);
        b.title = step.title;
        b.setAttribute("aria-label", `Stage ${i + 1}: ${step.title}`);
        b.addEventListener("click", () => this.go(i));
        return b;
      }),
    );
  }

  mark(step: number): void {
    if (step === this.shownStep) return;
    this.shownStep = step;
    const s = this.steps[step];
    this.el.count.textContent = `Stage ${step + 1} of ${this.steps.length}`;
    this.el.title.textContent = s.title;
    this.el.text.innerHTML = richHtml(s.text);
    this.el.prev.disabled = step === 0;
    this.el.next.disabled = step === this.steps.length - 1;
    [...this.el.stages.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === step)));
  }

  readouts(rows: readonly Readout[]): void {
    const key = rows.map((r) => `${r.label}|${r.tex}|${r.tone}`).join("\n");
    if (key === this.shownRows) return;
    this.shownRows = key;
    this.el.readouts.replaceChildren(
      ...rows.map((r) => {
        const row = document.createElement("div");
        row.className = `readout tone-${r.tone ?? "plain"}`;
        const label = document.createElement("span");
        label.className = "readout-label";
        label.textContent = r.label ?? "";
        const tex = document.createElement("span");
        tex.className = "readout-tex";
        tex.innerHTML = this.tex(r.tex);
        row.append(label, tex);
        return row;
      }),
    );
  }

  private tex(source: string): string {
    let html = this.typeset.get(source);
    if (html === undefined) {
      html = texHtml(source);
      if (this.typeset.size > 500) this.typeset.clear();
      this.typeset.set(source, html);
    }
    return html;
  }
}
