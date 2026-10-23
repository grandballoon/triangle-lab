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
import { railInset } from "../curriculum.ts";
import { chapters, lessons } from "../lessons.ts";
import { mountPager } from "../pager.ts";
import { toScreen, type View } from "./draw.ts";
import build from "./lessons/triangle-angle-sum.ts";
import { term, type Scene } from "./scene.ts";
import { USES_HEADING } from "./steps.ts";
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
    <aside id="steps"><div id="step-list"></div></aside>
    <section id="formulas"><div id="readouts"></div></section>
    <svg id="leader"></svg>`;
  const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  return {
    canvas: el("stage"),
    eyebrow: el("eyebrow"),
    title: el("title"),
    controls: el("controls"),
    formulas: el("formulas"),
    readouts: el("readouts"),
    steps: el("step-list"),
    leader: document.getElementById("leader") as unknown as SVGSVGElement,
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

/** The step the list shows as current. */
const currentStep = (el: ShellElements): string | undefined =>
  el.steps.querySelector<HTMLElement>("[aria-current='step']")?.dataset.step;

/** jsdom does no layout: place each step section `height` pixels below the last. */
function layOut(el: ShellElements, height: number): void {
  el.steps.querySelectorAll<HTMLElement>(".step").forEach((section, i) => {
    Object.defineProperty(section, "offsetTop", { configurable: true, get: () => 14 + i * height });
  });
}

describe("Shell", () => {
  it("shows the lesson's title, every step at once and live formulas", () => {
    const { el } = loaded();
    expect(el.title.textContent).toBe("Angles of a Triangle");
    const titles = [...el.steps.querySelectorAll(".step-title")].map((t) => t.textContent);
    expect(titles).toHaveLength(4);
    expect(titles[0]).toBe("Three angles, one sum");
    expect(el.steps.querySelector(".step-count")!.textContent).toBe("Step 1");
    expect(el.steps.querySelector(".step-text .katex")).not.toBeNull();
    expect(currentStep(el)).toBe("0");
    expect(el.readouts.children).toHaveLength(4);
    expect(el.readouts.textContent).toContain("180");
  });

  it("walks the steps and stops at either end", () => {
    const { shell, el } = loaded();
    expect(shell.stepBy(-1)).toBe(false);
    expect(shell.stepBy(1)).toBe(true);
    expect(currentStep(el)).toBe("1");
    expect(shell.stepBy(1) && shell.stepBy(1)).toBe(true);
    expect(shell.stepBy(1)).toBe(false);
    expect(currentStep(el)).toBe("3");
  });

  it("makes a pressed step current and scrolls the list to it", () => {
    const { el } = loaded();
    layOut(el, 200);
    // jsdom's scrollTo does nothing; jump straight there, as a browser would in the end.
    el.steps.scrollTo = ((o: ScrollToOptions) => (el.steps.scrollTop = o.top ?? 0)) as never;
    el.steps.querySelectorAll<HTMLButtonElement>(".step-head button")[2].click();
    expect(currentStep(el)).toBe("2");
    expect(el.steps.scrollTop).toBe(400);
    // The scroll it caused does not pick a step of its own.
    el.steps.dispatchEvent(new Event("scroll"));
    expect(currentStep(el)).toBe("2");
  });

  it("follows the reader scrolling through the steps", () => {
    const { el } = loaded();
    layOut(el, 200);
    el.steps.scrollTop = 390;
    el.steps.dispatchEvent(new Event("scroll"));
    expect(currentStep(el)).toBe("2");
    el.steps.scrollTop = 0;
    el.steps.dispatchEvent(new Event("scroll"));
    expect(currentStep(el)).toBe("0");
  });

  it("lists a lesson's real-world uses after its steps", () => {
    const el = page();
    const shell = new Shell(el, () => []);
    shell.load({ eyebrow: "Angles", title: "T", accent: "#f472b6" }, (s) => ({
      ...build(s),
      uses: [{ title: "Surveying", text: "Turns add to $360^\\circ$." }],
    }));
    const uses = el.steps.querySelector(".uses")!;
    expect(uses.querySelector("summary h2")!.textContent).toBe(USES_HEADING);
    expect((uses as HTMLDetailsElement).open).toBe(false);
    expect(uses.querySelector("h3")!.textContent).toBe("Surveying");
    expect(uses.querySelector(".katex")).not.toBeNull();
    expect(el.steps.lastElementChild!.previousElementSibling).toBe(uses);
  });

  it("leads from a hovered formula term to its marks on the figure", () => {
    const el = page();
    const shell = new Shell(el, () => []);
    shell.load({ eyebrow: "Angles", title: "T", accent: "#f472b6" }, () => ({
      steps: [{ title: "One", text: "Look at $A$." }],
      draw: (g) => g.point({ x: 1, y: 1 }, { term: "apex" }),
      readout: () => [{ tex: `${term("apex", "A")} + 1` }],
    }));
    tick();
    const lines = () => [...el.leader.querySelectorAll("line")].filter((l) => l.style.display !== "none");
    expect(lines()).toHaveLength(0);

    const apex = el.readouts.querySelector<HTMLElement>("[data-term='apex']")!;
    apex.dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    tick();
    expect(lines()).toHaveLength(1);
    const end = screenOf(shell, { x: 1, y: 1 });
    expect(Number(lines()[0].getAttribute("x2"))).toBeCloseTo(end.x);
    expect(Number(lines()[0].getAttribute("y2"))).toBeCloseTo(end.y);
    expect(el.readouts.querySelector(".term-focus")).not.toBeNull();

    // The same symbol in the step text stands for the lesson's term.
    el.steps.querySelector("[data-term='pt:A']")!.dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    tick();
    expect(lines()).toHaveLength(1);
    expect(Number(lines()[0].getAttribute("x2"))).toBeCloseTo(end.x);

    el.canvas.dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    tick();
    expect(lines()).toHaveLength(0);
  });

  it("leads from names and numbers in the steps and formulas to the figure, unless it does not show them", () => {
    const el = page();
    const shell = new Shell(el, () => []);
    const A = { x: -2, y: 0 };
    const B = { x: 2, y: 0 };
    shell.load({ eyebrow: "Lines", title: "T", accent: "#f472b6" }, () => ({
      steps: [{ title: "One", text: "Side $AB$ is not $CD$." }],
      draw: (g) => {
        g.segment(A, B);
        g.along(A, B, "4");
        g.point(A, { label: "A" });
        g.point(B, { label: "B" });
      },
      readout: () => [{ tex: "AB = 4,\\ x = 9" }],
    }));
    tick();
    const lines = () => [...el.leader.querySelectorAll("line")].filter((l) => l.style.display !== "none");
    const at = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-term='${id}']`)!;

    at(el.steps, "seg:A.B").dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    tick();
    expect(lines()).toHaveLength(1);
    const middle = screenOf(shell, { x: 0, y: 0 });
    expect(Number(lines()[0].getAttribute("x2"))).toBeCloseTo(middle.x);
    expect(Number(lines()[0].getAttribute("y2"))).toBeCloseTo(middle.y);
    expect(at(el.steps, "seg:A.B").classList.contains("term-focus")).toBe(true);

    at(el.readouts, "num:4").dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    tick();
    expect(lines()).toHaveLength(1);

    // Nothing on the figure is CD or 9: not underlined, not lit, no leader.
    for (const [host, id] of [[el.steps, "seg:C.D"], [el.readouts, "num:9"]] as const) {
      at(host, id).dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
      tick();
      expect(lines()).toHaveLength(0);
      expect(at(host, id).className).toBe("enclosing");
    }
    expect(at(el.steps, "seg:A.B").classList.contains("term-linked")).toBe(true);
  });

  it("holds the formulas' changing numbers, greyed, while a handle is dragged", () => {
    const { shell, el, scene } = loaded();
    const apex = scene.handles[2];
    const visible = () => [...el.readouts.querySelectorAll(".katex-html")].map((m) => m.textContent).join(" ");
    const before = visible();
    el.canvas.dispatchEvent(pointer("pointerdown", screenOf(shell, apex)));
    tick();
    el.canvas.dispatchEvent(pointer("pointermove", screenOf(shell, { x: apex.x - 2, y: apex.y + 0.5 })));
    tick();
    expect(visible()).toBe(before);
    expect(el.readouts.querySelector(".held")).not.toBeNull();

    el.canvas.dispatchEvent(pointer("pointerup", screenOf(shell, apex)));
    tick();
    expect(visible()).not.toBe(before);
    expect(el.readouts.querySelector(".held")).toBeNull();
    expect(el.readouts.querySelector(".settled")).not.toBeNull();
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
    expect(currentStep(el)).toBe("0");
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

  it("lists the whole curriculum beside the pager, marked at the open lesson", () => {
    document.body.innerHTML = "";
    localStorage.clear();
    mountPager("triangle-angle-sum");
    const rail = document.getElementById("curriculum")!;
    const links = [...rail.querySelectorAll<HTMLAnchorElement>(".cur-lesson")];
    expect(links.map((a) => a.dataset.slug)).toEqual(lessons.map((l) => l.slug));
    expect(rail.querySelectorAll(".cur-axioms li")).toHaveLength(
      chapters.reduce((n, c) => n + c.axioms.length, 0),
    );

    const here = rail.querySelectorAll<HTMLAnchorElement>("[aria-current='page']");
    expect([...here].map((a) => a.dataset.slug)).toEqual(["triangle-angle-sum"]);
    expect(here[0].closest("details")!.open).toBe(true);

    // Moving on re-marks the same rail rather than building another.
    mountPager("exterior-angle");
    expect(document.querySelectorAll("#curriculum")).toHaveLength(1);
    expect(rail.querySelector<HTMLAnchorElement>("[aria-current='page']")!.dataset.slug).toBe(
      "exterior-angle",
    );
  });

  it("docks the rail on a wide screen and frees the room when hidden", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {} }));
    localStorage.clear();
    mountPager("triangle-angle-sum");
    const rail = document.getElementById("curriculum")!;
    const toggle = document.querySelector<HTMLButtonElement>("#nav .nav-rail")!;
    const resized = vi.fn();
    window.addEventListener("resize", resized);

    if (rail.hidden) toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(railInset()).toBeGreaterThan(0);
    expect(document.documentElement.style.getPropertyValue("--rail-inset")).toBe(`${railInset()}px`);

    toggle.click();
    expect(rail.hidden).toBe(true);
    expect(railInset()).toBe(0);
    expect(resized).toHaveBeenCalled();
    expect(localStorage.getItem("triangle-lab:curriculum")).toBe("closed");

    window.removeEventListener("resize", resized);
    vi.unstubAllGlobals();
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
