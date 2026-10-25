// The formula band along the bottom of a lesson page: one typeset row per
// live readout. The lab shell shows a lab lesson's readouts in it, and
// page.ts shows a standalone lesson's (chrome.ts), so it is built and styled
// here rather than by either page.

import "./formulas.css";
import { richHtml, texHtml } from "./math.ts";
import type { Readout } from "./scene.ts";

/** A readout row as HTML. `prepare` rewrites its LaTeX before typesetting (link.ts `linkTex`). */
export function readoutHtml(row: Readout, prepare: (tex: string) => string = (tex) => tex): string {
  const label = row.label ? `<span class="readout-label">${richHtml(row.label, false, prepare)}</span>` : "";
  return `${label}<span class="readout-math">${texHtml(prepare(row.tex))}</span>`;
}

export class FormulaBand {
  private shown: string[] = [];

  /**
   * @param host The element the rows are built in.
   * @param prepare Applied to each row's LaTeX before it is typeset.
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly prepare?: (tex: string) => string,
  ) {}

  clear(): void {
    this.shown = [];
    this.host.replaceChildren();
  }

  /** Show `rows`, re-typesetting only the ones whose content changed since the last call. */
  show(rows: readonly Readout[]): void {
    const host = this.host;
    while (host.children.length > rows.length) host.lastElementChild!.remove();
    rows.forEach((row, i) => {
      const key = `${row.tone ?? "plain"}|${row.label ?? ""}|${row.tex}`;
      if (this.shown[i] === key && host.children[i]) return;
      this.shown[i] = key;
      let node = host.children[i] as HTMLElement | undefined;
      if (!node) {
        node = host.ownerDocument.createElement("div");
        host.append(node);
      }
      node.className = `readout readout-${row.tone ?? "plain"}`;
      node.innerHTML = readoutHtml(row, this.prepare);
    });
    this.shown.length = rows.length;
  }
}
