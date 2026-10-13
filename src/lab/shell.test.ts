// @vitest-environment jsdom
//
// The page around a lesson, driven through a DOM stand-in: the shell loads a
// lesson and fills its panels, a pointer drag moves a handle, and a hand —
// which reaches the page only as synthetic pointer events — can do the same
// and can press buttons.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { HandsPanel } from "../hands/panel.ts";
import { PointerBridge } from "../hands/pointerBridge.ts";
import { SettingsStore } from "../hands/settings.ts";
import { lessons } from "../lessons.ts";
import { mountPager } from "../pager.ts";
import { toScreen, type View } from "./draw.ts";
import build from "./lessons/triangle-angle-sum.ts";
import type { Scene } from "./scene.ts";
import { Shell, type ShellElements } from "./shell.ts";

let frames: FrameRequestCallback[] = [];
let clock = 0;

/** Run the animation frames queued so far, `ms` later. */
function tick(ms = 16): void {
  clock += ms;
  const due = frames;
  frames = [];
  for (const f of due) f(clock);
}

function page(): ShellElements {
  document.body.innerHTML = `
    <canvas id="stage"></canvas>
    <span id="eyebrow"></span><h1 id="title"></h1><div id="controls"></div>
    <aside id="formulas"><div id="readouts"></div></aside>
    <section id="steps">
      <button id="prev"></button>
      <div id="count"></div><h2 id="step-title"></h2><p id="text"></p>
      <button id="next"></button>
    </section>`;
  const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  return {
    canvas: el("stage"),
    eyebrow: el("eyebrow"),
    title: el("title"),
    controls: el("controls"),
    formulas: el("formulas"),
    readouts: el("readouts"),
    stepCard: el("steps"),
    stepCount: el("count"),
    stepTitle: el("step-title"),
    stepText: el("text"),
    prev: el("prev"),
    next: el("next"),
  };
}

beforeEach(() => {
  frames = [];
  clock = 0;
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => frames.push(f));
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  // jsdom has no canvas; any object that swallows calls will do.
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

function loaded(): { shell: Shell; el: ShellElements; scene: Scene } {
  const el = page();
  const shell = new Shell(el, () => []);
  let scene!: Scene;
  shell.load({ eyebrow: "Angles", title: "Angles of a Triangle", accent: "#f472b6" }, (s) => {
    scene = s;
    return build(s);
  });
  tick();
  return { shell, el, scene };
}

/** Where the shell puts a stage point, mirroring its layout for this window. */
function screenOf(shell: Shell, p: { x: number; y: number }): { x: number; y: number } {
  return toScreen((shell as unknown as { viewNow: View }).viewNow, p);
}

const pointer = (type: string, at: { x: number; y: number }, pointerType = "mouse"): PointerEvent =>
  new PointerEvent(type, { bubbles: true, clientX: at.x, clientY: at.y, pointerId: 7, pointerType });

describe("Shell", () => {
  it("shows the lesson's title, first step and live formulas", () => {
    const { el } = loaded();
    expect(el.title.textContent).toBe("Angles of a Triangle");
    expect(el.stepCount.textContent).toBe("Step 1 of 4");
    expect(el.stepTitle.textContent).toBe("Three angles, one sum");
    expect(el.stepText.querySelector(".katex")).not.toBeNull();
    expect(el.readouts.children).toHaveLength(4);
    expect(el.readouts.textContent).toContain("180");
    expect(el.prev.disabled).toBe(true);
  });

  it("walks the steps and stops at either end", () => {
    const { shell, el } = loaded();
    expect(shell.stepBy(-1)).toBe(false);
    el.next.click();
    expect(el.stepCount.textContent).toBe("Step 2 of 4");
    expect(shell.stepBy(1) && shell.stepBy(1)).toBe(true);
    expect(shell.stepBy(1)).toBe(false);
    expect(el.next.disabled).toBe(true);
  });

  it("drags a handle with the pointer, within its constraint", () => {
    const { shell, el, scene } = loaded();
    const apex = scene.handles[2];
    const start = { x: apex.x, y: apex.y };
    el.canvas.dispatchEvent(pointer("pointerdown", screenOf(shell, start)));
    expect(apex.grabbed).toBe(true);
    el.canvas.dispatchEvent(pointer("pointermove", screenOf(shell, { x: start.x - 2, y: start.y + 1 })));
    expect(apex.x).toBeCloseTo(start.x - 2);
    expect(apex.y).toBeCloseTo(start.y + 1);
    // The apex may not drop to the base line.
    el.canvas.dispatchEvent(pointer("pointermove", screenOf(shell, { x: 0, y: -4 })));
    expect(apex.y).toBeGreaterThan(1);
    el.canvas.dispatchEvent(pointer("pointerup", screenOf(shell, { x: 0, y: -4 })));
    expect(apex.grabbed).toBe(false);
  });

  it("starts over on reset", () => {
    const { shell, el, scene } = loaded();
    scene.handles[2].set({ x: -5, y: 4 });
    shell.stepBy(1);
    shell.reset();
    tick();
    expect(el.stepCount.textContent).toBe("Step 1 of 4");
    expect(el.readouts.children).toHaveLength(4);
  });
});

describe("PointerBridge", () => {
  const still = { started: false, ended: false, active: false };
  const down = { started: true, ended: false, active: true };
  const held = { started: false, ended: false, active: true };
  const up = { started: false, ended: true, active: false };

  /** jsdom does no layout, so say what is under the cursor. */
  const under = (el: Element | null): void => {
    document.elementFromPoint = () => el;
  };

  it("lets a hand drag a handle through the shell", () => {
    const { shell, el, scene } = loaded();
    under(el.canvas);
    const bridge = new PointerBridge(true);
    const apex = scene.handles[2];
    const from = screenOf(shell, apex);
    const to = screenOf(shell, { x: apex.x + 1.5, y: apex.y });
    const expectedX = apex.x + 1.5;
    bridge.update("right", from, still);
    expect(apex.hover).toBe(true);
    bridge.update("right", from, down);
    bridge.update("right", to, held);
    bridge.update("right", to, up);
    expect(apex.x).toBeCloseTo(expectedX);
    expect(apex.grabbed).toBe(false);
  });

  it("clicks a button when a grab starts and ends on it", () => {
    document.body.innerHTML = `<button id="b">Go</button><button id="other">No</button>`;
    const button = document.getElementById("b")!;
    const other = document.getElementById("other")!;
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    const bridge = new PointerBridge(false);
    const at = { x: 10, y: 10 };

    under(button);
    bridge.update("left", at, still);
    expect(button.classList.contains("hand-hover")).toBe(true);
    bridge.update("left", at, down);
    bridge.update("left", at, up);
    expect(clicks).toBe(1);

    // Sliding off before letting go is not a click.
    bridge.update("left", at, down);
    under(other);
    bridge.update("left", at, up);
    expect(clicks).toBe(1);
  });

  it("lets only one hand press at a time in single-pointer mode", () => {
    document.body.innerHTML = `<div id="pad"></div>`;
    const pad = document.getElementById("pad")!;
    under(pad);
    const downs: number[] = [];
    pad.addEventListener("pointerdown", (e) => downs.push(e.pointerId));
    const bridge = new PointerBridge(false);
    bridge.update("left", { x: 1, y: 1 }, down);
    bridge.update("right", { x: 2, y: 2 }, down);
    expect(downs).toHaveLength(1);
    bridge.drop("left", { x: 1, y: 1 });
    bridge.update("right", { x: 2, y: 2 }, down);
    expect(downs).toHaveLength(2);
  });
});

describe("page chrome", () => {
  it("builds a pager whose links follow the reading order", () => {
    document.body.innerHTML = "";
    const at = lessons.findIndex((l) => l.slug === "triangle-angle-sum");
    const { prev, next } = mountPager("triangle-angle-sum");
    expect(prev).toBe(lessons[at - 1]);
    expect(next).toBe(lessons[at + 1]);
    expect(document.querySelector(".nav-step")!.textContent).toBe(`${at + 1} / ${lessons.length}`);
    expect(document.querySelectorAll("#nav a")).toHaveLength(1 + (prev ? 1 : 0) + (next ? 1 : 0));
    expect(mountPager("no-such-lesson")).toEqual({ prev: undefined, next: undefined });
    expect(document.getElementById("nav")).toBeNull();
  });

  it("changes gesture settings from the panel's buttons", () => {
    document.body.innerHTML = "";
    const store = new SettingsStore(null);
    new HandsPanel(store);
    const press = (label: string): void => {
      const b = [...document.querySelectorAll<HTMLButtonElement>(".hands-sheet button")].find(
        (x) => x.textContent === label,
      );
      expect(b, label).toBeDefined();
      b!.click();
    };
    press("✊ Fist");
    expect(store.get().grab).toBe("fist");
    press("Left");
    expect(store.get().hands).toBe("left");
    press("Restore defaults");
    expect(store.get().grab).toBe("pinch");
    expect(document.querySelector(".hands-pill")!.textContent).toBe("Hands off");
  });
});
