// The AR page's pose panel: a slider for each way the sheet can be placed
// (dials.ts), what dragging the sheet does, whether the sheet is tinted and
// ruled or the figure floats bare, and buttons to face the sheet square on or
// start over. It folds to its header. It only shows and reports; the page
// owns the pose.

import { dials } from "./dials.ts";
import type { Pose } from "./pose.ts";

/** What a one-finger drag on the sheet does: slide it, or lean it. */
export type DragMode = "move" | "lean";

export interface PanelState {
  pose: Pose;
  mode: DragMode;
  /** Whether the sheet is tinted and ruled behind the figure. */
  backed: boolean;
}

export interface PanelActions {
  pose(next: (pose: Pose) => Pose): void;
  mode(mode: DragMode): void;
  backed(on: boolean): void;
  face(): void;
  reset(): void;
}

const MODES: readonly { mode: DragMode; label: string }[] = [
  { mode: "move", label: "Move" },
  { mode: "lean", label: "Lean" },
];

export class PosePanel {
  private readonly inputs: { input: HTMLInputElement; value: HTMLElement }[] = [];
  private readonly modeChips: HTMLButtonElement[] = [];
  private readonly sheetChip: HTMLButtonElement;
  /** The slider being dragged, which the pose is not written back into. */
  private editing: HTMLInputElement | null = null;

  constructor(
    root: HTMLElement,
    private readonly toggle: HTMLButtonElement,
    private readonly body: HTMLElement,
    actions: PanelActions,
    open: boolean,
  ) {
    toggle.addEventListener("click", () => this.setOpen(body.hidden));
    this.setOpen(open);

    const chip = (label: string, run: () => void): HTMLButtonElement => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      b.addEventListener("click", run);
      return b;
    };

    const drag = document.createElement("div");
    drag.className = "panel-row";
    drag.setAttribute("role", "group");
    drag.setAttribute("aria-label", "Dragging the sheet");
    const dragLabel = document.createElement("span");
    dragLabel.className = "panel-label";
    dragLabel.textContent = "Drag to";
    drag.append(dragLabel);
    for (const m of MODES) {
      const b = chip(m.label, () => actions.mode(m.mode));
      this.modeChips.push(b);
      drag.append(b);
    }

    const sliders = dials.map((dial) => {
      const row = document.createElement("label");
      row.className = "dial";
      const name = document.createElement("span");
      name.className = "panel-label";
      name.textContent = dial.label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(dial.min);
      input.max = String(dial.max);
      input.step = String(dial.step);
      const value = document.createElement("span");
      value.className = "dial-value";
      input.addEventListener("input", () => {
        this.editing = input;
        const v = Number(input.value);
        value.textContent = dial.format(v);
        actions.pose((pose) => dial.write(pose, v));
      });
      input.addEventListener("change", () => (this.editing = null));
      this.inputs.push({ input, value });
      row.append(name, input, value);
      return row;
    });

    this.sheetChip = chip("Sheet", () => actions.backed(this.sheetChip.getAttribute("aria-pressed") !== "true"));
    const buttons = document.createElement("div");
    buttons.className = "panel-row";
    buttons.append(this.sheetChip, chip("Face me", actions.face), chip("Reset", actions.reset));

    body.append(drag, ...sliders, buttons);
    root.hidden = false;
  }

  show(state: PanelState): void {
    dials.forEach((dial, i) => {
      const { input, value } = this.inputs[i];
      if (input === this.editing) return;
      const v = dial.read(state.pose);
      input.value = String(v);
      value.textContent = dial.format(v);
    });
    this.modeChips.forEach((b, i) => b.setAttribute("aria-pressed", String(MODES[i].mode === state.mode)));
    this.sheetChip.setAttribute("aria-pressed", String(state.backed));
  }

  private setOpen(open: boolean): void {
    this.body.hidden = !open;
    this.toggle.setAttribute("aria-expanded", String(open));
  }
}
