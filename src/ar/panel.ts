// The AR page's pose panel: a slider for each way the sheet can be placed
// (dials.ts), what dragging the sheet does, how strongly the tinted, ruled
// sheet shows behind the figure, down to not at all, and buttons to face the
// sheet square on or start over. It folds to its header. It only shows and
// reports; the page owns the pose.

import { dials } from "./dials.ts";
import type { Pose } from "./pose.ts";

/** What a one-finger drag on the sheet does: slide it, or lean it. */
export type DragMode = "move" | "lean";

export interface PanelState {
  pose: Pose;
  mode: DragMode;
  /** How strongly the tinted, ruled sheet shows behind the figure: 0, not at all; 1, fully. */
  backing: number;
}

export interface PanelActions {
  pose(next: (pose: Pose) => Pose): void;
  mode(mode: DragMode): void;
  backing(amount: number): void;
  face(): void;
  reset(): void;
}

/** A slider of the panel: what it shows of the state, and what moving it does. */
interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  read(state: PanelState): number;
  write(value: number): void;
  format(value: number): string;
}

interface Slider {
  input: HTMLInputElement;
  value: HTMLElement;
  read(state: PanelState): number;
  format(value: number): string;
}

const MODES: readonly { mode: DragMode; label: string }[] = [
  { mode: "move", label: "Move" },
  { mode: "lean", label: "Lean" },
];

export class PosePanel {
  private readonly sliders: Slider[] = [];
  private readonly modeChips: HTMLButtonElement[] = [];
  /** The slider being dragged, which the state is not written back into. */
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

    const slider = (spec: SliderSpec): HTMLElement => {
      const row = document.createElement("label");
      row.className = "dial";
      const name = document.createElement("span");
      name.className = "panel-label";
      name.textContent = spec.label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      const value = document.createElement("span");
      value.className = "dial-value";
      input.addEventListener("input", () => {
        this.editing = input;
        const v = Number(input.value);
        value.textContent = spec.format(v);
        spec.write(v);
      });
      input.addEventListener("change", () => (this.editing = null));
      this.sliders.push({ input, value, read: spec.read, format: spec.format });
      row.append(name, input, value);
      return row;
    };

    const poses = dials.map((dial) =>
      slider({ ...dial, read: (state) => dial.read(state.pose), write: (v) => actions.pose((pose) => dial.write(pose, v)) }),
    );
    const backing = slider({
      label: "Sheet",
      min: 0,
      max: 100,
      step: 1,
      read: (state) => state.backing * 100,
      write: (v) => actions.backing(v / 100),
      format: (v) => `${Math.round(v)}%`,
    });

    const buttons = document.createElement("div");
    buttons.className = "panel-row";
    buttons.append(chip("Face me", actions.face), chip("Reset", actions.reset));

    body.append(drag, ...poses, backing, buttons);
    root.hidden = false;
  }

  show(state: PanelState): void {
    for (const { input, value, read, format } of this.sliders) {
      if (input === this.editing) continue;
      const v = read(state);
      input.value = String(v);
      value.textContent = format(v);
    }
    this.modeChips.forEach((b, i) => b.setAttribute("aria-pressed", String(MODES[i].mode === state.mode)));
  }

  private setOpen(open: boolean): void {
    this.body.hidden = !open;
    this.toggle.setAttribute("aria-expanded", String(open));
  }
}
