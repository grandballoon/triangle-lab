// The gesture settings panel: a status pill that opens a sheet of choices.
// Every control is a plain button — segmented choices and −/+ steppers — so
// the panel can be worked with a pinch as easily as with a mouse (native
// sliders and selects ignore synthetic pointers).

import "./hands.css";
import { ACTION_LABEL } from "./overlay.ts";
import {
  ACTIONS,
  bind,
  DEFAULT_SETTINGS,
  HOLD_MS_RANGE,
  POSES,
  setGrab,
  type GestureSettings,
  type Pose,
  type SettingsStore,
} from "./settings.ts";

export type HandsStatus = "off" | "camera" | "loading" | "ready" | "failed";

const STATUS_TEXT: Record<HandsStatus, string> = {
  off: "Hands off",
  camera: "Waiting for camera",
  loading: "Loading hand tracking",
  ready: "Hands ready",
  failed: "Hand tracking unavailable",
};

const POSE_LABEL: Record<Pose, string> = {
  thumbsUp: "👍 Thumbs up",
  victory: "✌️ Two fingers",
  open: "🖐 Open palm",
  point: "☝️ Point",
  fist: "✊ Fist",
};

const STEP = 0.1;

export class HandsPanel {
  private readonly root = document.createElement("div");
  private readonly pill = document.createElement("button");
  private readonly sheet = document.createElement("div");
  private status: HandsStatus = "off";

  constructor(private readonly store: SettingsStore) {
    this.root.id = "hands-ui";
    this.pill.type = "button";
    this.pill.className = "hands-pill";
    this.pill.setAttribute("aria-expanded", "false");
    this.pill.addEventListener("click", () => this.toggle());
    this.sheet.className = "hands-sheet";
    this.sheet.hidden = true;
    this.root.append(this.pill, this.sheet);
    document.body.append(this.root);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.sheet.hidden) this.toggle();
    });
    store.subscribe(() => this.renderSheet());
    this.setStatus(this.status);
    this.renderSheet();
  }

  setStatus(status: HandsStatus): void {
    this.status = status;
    this.pill.dataset.status = status;
    this.pill.textContent = STATUS_TEXT[status];
    this.pill.title = "Gesture settings";
  }

  private toggle(): void {
    this.sheet.hidden = !this.sheet.hidden;
    this.pill.setAttribute("aria-expanded", String(!this.sheet.hidden));
  }

  private renderSheet(): void {
    const s = this.store.get();
    const set = (patch: Partial<GestureSettings>): void => this.store.set({ ...s, ...patch });

    const rows: HTMLElement[] = [
      heading("Hand tracking"),
      row("Tracking", choice([["On", true], ["Off", false]], s.enabled, (v) => set({ enabled: v }))),
      row(
        "Use",
        choice(
          [["Both hands", "both"], ["Left", "left"], ["Right", "right"]],
          s.hands,
          (v) => set({ hands: v as GestureSettings["hands"] }),
        ),
      ),
      row("Skeleton", choice([["Show", true], ["Hide", false]], s.showSkeleton, (v) => set({ showSkeleton: v }))),

      heading("Grabbing"),
      row(
        "Grab with",
        choice(
          [["🤏 Pinch", "pinch"], ["✊ Fist", "fist"]],
          s.grab,
          (v) => this.store.set(setGrab(s, v as GestureSettings["grab"])),
        ),
      ),
      row(
        "Pinch reach",
        stepper(percent(s.pinchSensitivity), (dir) =>
          set({ pinchSensitivity: round1(s.pinchSensitivity + dir * STEP) }),
        ),
      ),
      row(
        "Steadiness",
        stepper(percent(s.smoothing), (dir) => set({ smoothing: round1(s.smoothing + dir * STEP) })),
      ),

      heading("Hold a pose to…"),
      ...ACTIONS.map((action) =>
        row(
          ACTION_LABEL[action],
          choice<Pose | null>(
            [["None", null], ...POSES.map((p): [string, Pose] => [POSE_LABEL[p], p])],
            s.bindings[action],
            (pose) => this.store.set(bind(s, action, pose)),
          ),
        ),
      ),
      row(
        "Hold for",
        stepper(`${(s.holdMs / 1000).toFixed(1)} s`, (dir) =>
          set({ holdMs: s.holdMs + dir * HOLD_MS_RANGE.step }),
        ),
      ),
    ];

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "hands-reset";
    reset.textContent = "Restore defaults";
    reset.addEventListener("click", () => this.store.set(DEFAULT_SETTINGS));

    this.sheet.replaceChildren(...rows, reset);
  }
}

const percent = (v: number): string => `${Math.round(v * 100)}%`;
const round1 = (v: number): number => Math.round(v * 10) / 10;

function heading(text: string): HTMLElement {
  const h = document.createElement("div");
  h.className = "hands-heading";
  h.textContent = text;
  return h;
}

function row(label: string, control: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "hands-row";
  const name = document.createElement("span");
  name.className = "hands-label";
  name.textContent = label;
  el.append(name, control);
  return el;
}

function choice<T>(
  options: readonly (readonly [string, T])[],
  current: T,
  pick: (value: T) => void,
): HTMLElement {
  const group = document.createElement("div");
  group.className = "hands-choice";
  group.setAttribute("role", "group");
  for (const [label, value] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", String(value === current));
    b.addEventListener("click", () => pick(value));
    group.append(b);
  }
  return group;
}

function stepper(value: string, nudge: (dir: -1 | 1) => void): HTMLElement {
  const group = document.createElement("div");
  group.className = "hands-stepper";
  const button = (text: string, label: string, dir: -1 | 1): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", () => nudge(dir));
    return b;
  };
  const out = document.createElement("output");
  out.textContent = value;
  group.append(button("−", "Decrease", -1), out, button("+", "Increase", 1));
  return group;
}
