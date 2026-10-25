// Writes a ChromeLayout (layout.ts) onto the page: the mode as attributes on
// <html> for the stylesheets, the margin as --edge, and each piece of chrome
// at its box. Both kinds of page call it whenever the layout may have
// changed; it touches the DOM only when the layout did.

import type { Box, ChromeLayout } from "./layout.ts";

export interface Arranged {
  steps: HTMLElement;
  formulas?: HTMLElement | null;
  controls?: HTMLElement | null;
}

export class Arranger {
  private shown = "";

  constructor(private readonly el: Arranged) {}

  /** Apply `layout`; true when anything moved. */
  apply(layout: ChromeLayout): boolean {
    const key = JSON.stringify(layout);
    if (key === this.shown) return false;
    this.shown = key;

    const root = document.documentElement;
    root.dataset.layout = layout.mode;
    root.toggleAttribute("data-compact", layout.compact);
    root.style.setProperty("--edge", `${layout.edge}px`);
    if (layout.railBottom === null) root.style.removeProperty("--curriculum-bottom");
    else root.style.setProperty("--curriculum-bottom", `${layout.railBottom}px`);

    place(this.el.steps, layout.steps);
    if (this.el.formulas && layout.formulas) place(this.el.formulas, layout.formulas);
    const controls = this.el.controls;
    if (controls) {
      controls.style.left = `${layout.controls.x}px`;
      controls.style.top = `${layout.controls.y}px`;
      controls.style.width = `${layout.controls.width}px`;
    }
    return true;
  }
}

function place(el: HTMLElement, box: Box): void {
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
}
