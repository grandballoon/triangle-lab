// The lab page around a lesson: it owns the canvas and the panels, turns
// pointer events into handle drags, and runs the frame loop. A lesson
// (scene.ts) only describes a figure; everything about putting it on screen
// and letting someone touch it lives here.
//
// Input is pointer events only. Hands arrive as synthetic pointers from
// src/hands, so this file has no gesture code.

import { capturePointer, releasePointer } from "../pointer.ts";
import { C, Draw, tint, toScreen, toStage, type View } from "./draw.ts";
import { sub, type Vec } from "./geo.ts";
import { richHtml, texHtml } from "./math.ts";
import {
  Scene,
  type Frame,
  type Handle,
  type HandPoints,
  type LessonBuilder,
  type LessonView,
  type Readout,
  type Slider,
} from "./scene.ts";

/** Lessons compose inside this much stage, centred on the origin. */
export const STAGE = { halfWidth: 8, halfHeight: 5 } as const;

// Screen space kept clear of the figure, in CSS pixels. lab.css reads the
// same numbers through custom properties set in the constructor.
const EDGE = 18;
const TOP_BAND = 104;
const STEP_CARD_HEIGHT = 132;
const PANEL_WIDTH = { min: 250, max: 340, share: 0.25 } as const;

const STEP_FADE_SECONDS = 0.7;

// How close a press must land to grab a handle. A pinch is far less precise
// than a mouse, so hands get a wider catch.
const PICK_RADIUS_PX: Record<string, number> = { mouse: 24, pen: 24, touch: 36, hand: 46 };

export interface ShellElements {
  canvas: HTMLCanvasElement;
  eyebrow: HTMLElement;
  title: HTMLElement;
  controls: HTMLElement;
  formulas: HTMLElement;
  readouts: HTMLElement;
  stepCard: HTMLElement;
  stepCount: HTMLElement;
  stepTitle: HTMLElement;
  stepText: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export interface LessonHeader {
  eyebrow: string;
  title: string;
  accent: string;
}

interface Drag {
  handle: Handle | null;
  /** Handle position minus pointer position at grab, so it does not jump. */
  offset: Vec;
  lastScreen: Vec;
}

interface Loaded {
  header: LessonHeader;
  build: LessonBuilder;
  scene: Scene;
  view: LessonView;
  step: number;
  stepShownAt: number;
  loadedAt: number;
}

export class Shell {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly drags = new Map<number, Drag>();
  private current: Loaded | null = null;
  private formulasShown = true;
  private shownReadouts: string[] = [];
  private shownControls = "";

  /**
   * @param hands Hands seen this frame in screen pixels, for lessons that
   *   measure the learner's own hand.
   * @param leftInset Width taken from the left of the window by chrome the
   *   figure must stay clear of (the docked curriculum rail), read each frame.
   */
  constructor(
    private readonly el: ShellElements,
    private readonly hands: () => readonly { side: "left" | "right"; screen: readonly Vec[] }[],
    private readonly leftInset: () => number = () => 0,
  ) {
    this.ctx = el.canvas.getContext("2d")!;
    const root = document.documentElement.style;
    root.setProperty("--edge", `${EDGE}px`);
    root.setProperty("--top-band", `${TOP_BAND}px`);
    root.setProperty("--step-card-height", `${STEP_CARD_HEIGHT}px`);

    el.canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    el.canvas.addEventListener("pointermove", (e) => this.onMove(e));
    el.canvas.addEventListener("pointerup", (e) => this.onUp(e));
    el.canvas.addEventListener("pointercancel", (e) => this.onUp(e));
    el.prev.addEventListener("click", () => this.stepBy(-1));
    el.next.addEventListener("click", () => this.stepBy(1));
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Show a lesson, replacing whatever was there. */
  load(header: LessonHeader, build: LessonBuilder): void {
    const now = performance.now();
    const scene = new Scene(header.accent);
    this.current = {
      header,
      build,
      scene,
      view: build(scene),
      step: 0,
      stepShownAt: now,
      loadedAt: now,
    };
    this.drags.clear();
    this.shownReadouts = [];
    this.el.readouts.replaceChildren();
    this.el.eyebrow.textContent = header.eyebrow;
    this.el.title.textContent = header.title;
    document.documentElement.style.setProperty("--accent", header.accent);
    this.renderControls();
    this.renderStep();
  }

  /** Move through the steps. Returns false when there was nowhere to go. */
  stepBy(delta: -1 | 1): boolean {
    const c = this.current;
    if (!c) return false;
    const to = c.step + delta;
    if (to < 0 || to >= c.view.steps.length) return false;
    c.step = to;
    c.stepShownAt = performance.now();
    this.renderStep();
    return true;
  }

  /** Put the lesson back the way it started. */
  reset(): void {
    if (this.current) this.load(this.current.header, this.current.build);
  }

  toggleFormulas(): void {
    this.formulasShown = !this.formulasShown;
    this.el.formulas.hidden = !this.formulasShown;
  }

  // --- Layout ----------------------------------------------------------------

  private panelWidth(): number {
    const { min, max, share } = PANEL_WIDTH;
    return Math.round(Math.min(max, Math.max(min, window.innerWidth * share)));
  }

  /** Fit the stage into the screen area the panels leave free. */
  private layout(): View {
    const { canvas } = this.el;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const panel = this.panelWidth();
    document.documentElement.style.setProperty("--panel-width", `${panel}px`);
    const left = EDGE + this.leftInset();
    const right = width - EDGE - (this.formulasShown ? panel + EDGE : 0);
    const top = TOP_BAND;
    const bottom = height - EDGE - STEP_CARD_HEIGHT - EDGE;
    const scale = Math.max(
      8,
      Math.min((right - left) / (2 * STAGE.halfWidth), (bottom - top) / (2 * STAGE.halfHeight)),
    );
    return { scale, ox: (left + right) / 2, oy: (top + bottom) / 2, width, height };
  }

  // --- Frame -----------------------------------------------------------------

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const c = this.current;
    const view = this.layout();
    this.viewNow = view;
    this.ctx.clearRect(0, 0, view.width, view.height);
    if (!c) return;

    const fade = Math.min(1, (now - c.stepShownAt) / 1000 / STEP_FADE_SECONDS);
    const eased = 1 - (1 - fade) ** 3;
    const hands: HandPoints[] = this.hands().map((h) => ({
      side: h.side,
      points: h.screen.map((p) => toStage(view, p)),
    }));
    const frame: Frame = {
      step: c.step,
      at: (n) => (n < c.step ? 1 : n === c.step ? eased : 0),
      time: (now - c.loadedAt) / 1000,
      hands,
    };

    const g = new Draw(this.ctx, view, c.header.accent);
    c.view.draw(g, frame);
    // A lesson may change a control itself (a step that picks a case, a
    // button that resets a toggle); keep the chips showing the truth.
    if (this.controlState(c.scene) !== this.shownControls) this.renderControls();
    for (const s of c.scene.sliders) this.drawSlider(g, s);
    for (const h of c.scene.handles) this.drawHandle(g, view, h, c.header.accent);
    this.renderReadouts(c.view.readout?.(frame) ?? []);
  }

  private viewNow: View = { scale: 1, ox: 0, oy: 0, width: 0, height: 0 };

  private drawHandle(g: Draw, view: View, h: Handle, accent: string): void {
    if (h.hidden) return;
    const color = h.color ?? accent;
    if (!h.enabled) {
      g.point(h, { color, label: h.label });
      return;
    }
    const s = toScreen(view, h);
    const { ctx } = this;
    const active = h.grabbed || h.hover;
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, active ? 17 : 13, 0, Math.PI * 2);
    ctx.fillStyle = tint(color, h.grabbed ? 0.45 : active ? 0.32 : 0.2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = h.grabbed ? "#ffffff" : color;
    ctx.fill();
    ctx.restore();
    if (h.label) g.label(h, h.label, { color, dx: 18, dy: 18, bold: true });
  }

  private drawSlider(g: Draw, s: Slider): void {
    const color = g.accent;
    const active = s.knob.grabbed || s.knob.hover;
    g.segment(s.a, s.b, { color: C.faint, width: 6 });
    g.segment(s.a, s.knob, { color, width: 6 });
    g.circle(s.knob, g.px(active ? 13 : 10), { fill: color, stroke: "#ffffff", width: 2 });
    g.label(s.a, s.text, { align: "left", dy: 22, size: 14 });
  }

  // --- Panels ----------------------------------------------------------------

  private renderStep(): void {
    const c = this.current;
    if (!c) return;
    const { steps } = c.view;
    const step = steps[c.step];
    const single = steps.length === 1;
    this.el.stepCount.textContent = single ? "Explore" : `Step ${c.step + 1} of ${steps.length}`;
    this.el.stepTitle.textContent = step.title;
    this.el.stepText.innerHTML = richHtml(step.text);
    this.el.stepText.scrollTop = 0;
    this.el.prev.hidden = this.el.next.hidden = single;
    this.el.prev.disabled = c.step === 0;
    this.el.next.disabled = c.step === steps.length - 1;
  }

  private controlState(scene: Scene): string {
    return scene.controls
      .map((c) => (c.kind === "toggle" ? String(c.on) : c.kind === "choice" ? c.value : ""))
      .join("|");
  }

  private renderControls(): void {
    const scene = this.current?.scene;
    if (!scene) return;
    this.shownControls = this.controlState(scene);
    const chip = (label: string, pressed: boolean | null, run: () => void): HTMLButtonElement => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      if (pressed !== null) b.setAttribute("aria-pressed", String(pressed));
      b.addEventListener("click", () => {
        run();
        this.renderControls();
      });
      return b;
    };

    const nodes: HTMLElement[] = [];
    for (const control of scene.controls) {
      if (control.kind === "toggle") {
        nodes.push(chip(control.label, control.on, () => (control.on = !control.on)));
      } else if (control.kind === "button") {
        nodes.push(chip(control.label, null, control.run));
      } else {
        const group = document.createElement("div");
        group.className = "chip-group";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", control.label);
        const name = document.createElement("span");
        name.className = "chip-group-label";
        name.textContent = control.label;
        group.append(
          name,
          ...control.options.map((option) =>
            chip(option, control.value === option, () => (control.value = option)),
          ),
        );
        nodes.push(group);
      }
    }
    this.el.controls.replaceChildren(...nodes);
  }

  /** Re-typeset only the rows whose content changed since the last frame. */
  private renderReadouts(rows: Readout[]): void {
    const host = this.el.readouts;
    while (host.children.length > rows.length) host.lastElementChild!.remove();
    rows.forEach((row, i) => {
      const key = `${row.tone ?? "plain"}|${row.label ?? ""}|${row.tex}`;
      if (this.shownReadouts[i] === key && host.children[i]) return;
      this.shownReadouts[i] = key;
      let node = host.children[i] as HTMLElement | undefined;
      if (!node) {
        node = document.createElement("div");
        host.append(node);
      }
      node.className = `readout readout-${row.tone ?? "plain"}`;
      node.innerHTML =
        (row.label ? `<span class="readout-label">${richHtml(row.label)}</span>` : "") +
        `<span class="readout-math">${texHtml(row.tex)}</span>`;
    });
    this.shownReadouts.length = rows.length;
  }

  // --- Pointer input -----------------------------------------------------------

  private stagePoint(e: PointerEvent): Vec {
    const r = this.el.canvas.getBoundingClientRect();
    return toStage(this.viewNow, { x: e.clientX - r.left, y: e.clientY - r.top });
  }

  private onDown(e: PointerEvent): void {
    const scene = this.current?.scene;
    if (!scene) return;
    const p = this.stagePoint(e);
    const radius = (PICK_RADIUS_PX[e.pointerType] ?? PICK_RADIUS_PX.touch) / this.viewNow.scale;
    const handle = scene.pick(p, radius);
    // One pointer per handle: a second hand cannot steal a point mid-drag.
    if (handle?.grabbed) return;
    if (!handle && !scene.emptyDrag) return;
    if (handle) handle.grabbed = true;
    this.drags.set(e.pointerId, {
      handle,
      offset: handle ? sub(handle, p) : { x: 0, y: 0 },
      lastScreen: { x: e.clientX, y: e.clientY },
    });
    capturePointer(this.el.canvas, e);
    this.el.canvas.classList.add("grabbing");
  }

  private onMove(e: PointerEvent): void {
    const scene = this.current?.scene;
    if (!scene) return;
    const p = this.stagePoint(e);
    const drag = this.drags.get(e.pointerId);
    if (!drag) {
      const radius = (PICK_RADIUS_PX[e.pointerType] ?? PICK_RADIUS_PX.touch) / this.viewNow.scale;
      const over = scene.pick(p, radius);
      for (const h of scene.handles) h.hover = h === over;
      this.el.canvas.classList.toggle("can-grab", over !== null);
      return;
    }
    if (drag.handle) {
      drag.handle.set({ x: p.x + drag.offset.x, y: p.y + drag.offset.y });
    } else {
      scene.emptyDrag?.(e.clientX - drag.lastScreen.x, e.clientY - drag.lastScreen.y);
    }
    drag.lastScreen = { x: e.clientX, y: e.clientY };
  }

  private onUp(e: PointerEvent): void {
    const drag = this.drags.get(e.pointerId);
    if (!drag) return;
    if (drag.handle) drag.handle.grabbed = false;
    this.drags.delete(e.pointerId);
    releasePointer(this.el.canvas, e);
    if (this.drags.size === 0) this.el.canvas.classList.remove("grabbing");
  }
}
