// What a lab lesson is made of. A lesson is a function that receives a Scene,
// asks it for the things the learner can touch — draggable points, sliders,
// toggles — and returns how to draw the figure and what to say about it.
//
// Everything here is DOM-free: the shell (shell.ts) owns the canvas, the
// panels and the input, and a test can build and exercise any lesson without
// a browser.

import { clamp, dist, lerp, type Constraint, type Vec } from "./geo.ts";
import type { Draw } from "./draw.ts";
import type { Orbit } from "./solid.ts";

// --- Lesson contract -------------------------------------------------------

/** One beat of a proof or exploration. Text may hold `$…$` LaTeX. */
export interface Step {
  title: string;
  text: string;
}

/** A line of the formula panel: a LaTeX expression, usually with live values. */
export interface Readout {
  label?: string;
  tex: string;
  /** "good" marks an identity currently holding, "warn" one that fails. */
  tone?: "plain" | "good" | "warn" | "dim";
}

/** A tracked hand, with its 21 landmarks in stage coordinates. */
export interface HandPoints {
  side: "left" | "right";
  points: Vec[];
}

export interface Frame {
  /** Index of the step being shown. */
  step: number;
  /**
   * How much of step `n`'s construction to show: 0 before it, 1 after it, and
   * easing 0→1 while it is the current step. Use it as an alpha or a lerp
   * parameter so each step draws itself in.
   */
  at(n: number): number;
  /** Seconds since the lesson was loaded, for idle motion. */
  time: number;
  hands: readonly HandPoints[];
}

export interface LessonView {
  /** At least one step: what to do, then (for a proof) why it is true. */
  steps: Step[];
  draw(g: Draw, f: Frame): void;
  readout?(f: Frame): Readout[];
}

export type LessonBuilder = (s: Scene) => LessonView;

/** Identity helper that types a lesson module's default export. */
export const lesson = (build: LessonBuilder): LessonBuilder => build;

// --- Things the learner can touch -------------------------------------------

export interface PointOptions {
  label?: string;
  color?: string;
  /** Where the point is allowed to be. */
  constrain?: Constraint;
  /** Draw nothing for it (the lesson draws its own grip). */
  hidden?: boolean;
}

/** A draggable point. It is a Vec, so it can be passed straight to Draw. */
export class Handle implements Vec {
  x: number;
  y: number;
  label?: string;
  color?: string;
  constrain?: Constraint;
  hidden: boolean;
  /** Set false to freeze the point (e.g. once a proof step has fixed it). */
  enabled = true;
  grabbed = false;
  hover = false;

  constructor(x: number, y: number, o: PointOptions = {}) {
    this.x = x;
    this.y = y;
    this.label = o.label;
    this.color = o.color;
    this.constrain = o.constrain;
    this.hidden = o.hidden ?? false;
    this.set({ x, y });
  }

  /** Move toward `p`, landing wherever the constraint allows. */
  set(p: Vec): void {
    const q = this.constrain ? this.constrain(p) : p;
    if (Number.isFinite(q.x) && Number.isFinite(q.y)) {
      this.x = q.x;
      this.y = q.y;
    }
  }
}

export interface SliderOptions {
  label: string;
  /** Left end of the track, in stage coordinates. */
  at: Vec;
  /** Track length in stage units. */
  width?: number;
  min: number;
  max: number;
  value: number;
  /** Snap the value to multiples of this. */
  step?: number;
  /** How to print the value next to the label. */
  format?: (v: number) => string;
}

/** A value picked by dragging a knob along a track drawn on the stage. */
export class Slider {
  readonly knob: Handle;
  readonly a: Vec;
  readonly b: Vec;

  constructor(readonly o: SliderOptions) {
    this.a = o.at;
    this.b = { x: o.at.x + (o.width ?? 4), y: o.at.y };
    const t = (clamp(o.value, o.min, o.max) - o.min) / (o.max - o.min);
    const start = lerp(this.a, this.b, t);
    this.knob = new Handle(start.x, start.y, {
      hidden: true,
      constrain: (p) => this.pointFor(this.valueAt(p.x)),
    });
  }

  get value(): number {
    return this.valueAt(this.knob.x);
  }

  set value(v: number) {
    this.knob.set(this.pointFor(v));
  }

  get text(): string {
    const v = this.value;
    return `${this.o.label} ${this.o.format ? this.o.format(v) : String(Math.round(v * 100) / 100)}`;
  }

  private valueAt(x: number): number {
    const { min, max, step } = this.o;
    const t = clamp((x - this.a.x) / (this.b.x - this.a.x), 0, 1);
    const raw = min + t * (max - min);
    return step ? clamp(Math.round(raw / step) * step, min, max) : raw;
  }

  private pointFor(v: number): Vec {
    const { min, max } = this.o;
    return lerp(this.a, this.b, (clamp(v, min, max) - min) / (max - min));
  }
}

/** An on/off chip in the lesson toolbar. */
export interface Toggle {
  kind: "toggle";
  label: string;
  on: boolean;
}

/** A pick-one row of chips in the lesson toolbar. */
export interface Choice<T extends string = string> {
  kind: "choice";
  label: string;
  options: readonly T[];
  value: T;
}

/** A chip that runs something once when pressed. */
export interface Button {
  kind: "button";
  label: string;
  run: () => void;
}

export type Control = Toggle | Choice | Button;

// --- The scene ---------------------------------------------------------------

export class Scene {
  readonly handles: Handle[] = [];
  readonly sliders: Slider[] = [];
  readonly controls: Control[] = [];
  /** Called with the screen-pixel delta when empty stage is dragged. */
  emptyDrag: ((dx: number, dy: number) => void) | null = null;

  /** @param accent The lesson's colour, for its headline shapes. */
  constructor(readonly accent: string) {}

  /** A draggable point. */
  point(x: number, y: number, options: PointOptions = {}): Handle {
    const h = new Handle(x, y, options);
    this.handles.push(h);
    return h;
  }

  /** A slider drawn on the stage; read `.value` each frame. */
  slider(options: SliderOptions): Slider {
    const s = new Slider(options);
    this.sliders.push(s);
    this.handles.push(s.knob);
    return s;
  }

  /** An on/off chip; read `.on` each frame. */
  toggle(label: string, on = false): Toggle {
    const t: Toggle = { kind: "toggle", label, on };
    this.controls.push(t);
    return t;
  }

  /** A pick-one group of chips; read `.value` each frame. */
  choice<T extends string>(label: string, options: readonly T[], value: T = options[0]): Choice<T> {
    const c: Choice<T> = { kind: "choice", label, options, value };
    this.controls.push(c as unknown as Choice);
    return c;
  }

  /** A chip that calls `run` when pressed. */
  button(label: string, run: () => void): Button {
    const b: Button = { kind: "button", label, run };
    this.controls.push(b);
    return b;
  }

  /**
   * Let the learner turn a 3D figure by dragging empty stage. Returns the
   * camera to project through (solid.ts).
   */
  orbit(camera: Orbit): Orbit {
    this.emptyDrag = (dx, dy) => camera.turn(dx, dy);
    return camera;
  }

  /** The enabled handle nearest to `p` within `radius`, favouring later ones. */
  pick(p: Vec, radius: number): Handle | null {
    let best: Handle | null = null;
    let bestD = radius;
    for (const h of this.handles) {
      if (!h.enabled) continue;
      const d = dist(p, h);
      if (d <= bestD) {
        best = h;
        bestD = d;
      }
    }
    return best;
  }
}
